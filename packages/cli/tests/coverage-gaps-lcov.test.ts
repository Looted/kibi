import { afterEach, describe, expect, test } from "bun:test";
import { Command } from "commander";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { registerFoundationCommands } from "../src/cli-register-foundation.js";
import { registerJsonOnlyCommands } from "../src/cli-register-json.js";
import { registerMaintenanceCommands } from "../src/cli-register-maintenance.js";
import { registerProofCommand } from "../src/cli-register-proof.js";
import { registerReportingCommands } from "../src/cli-register-reporting.js";
import { registerSkillsCommands } from "../src/cli-register-skills.js";
import { renderDiscoveryTable } from "../src/commands/discovery-table.js";
import {
  buildSummary,
  formatViolationText,
} from "../src/public/operations/check-format-shared.js";
import {
  KIBI_PROTOCOL_VERSION,
  operationData,
  resultVersion,
  toKibiResult,
} from "../src/public/operations/result-envelope.js";
import {
  defaultKbManifest,
  readKbManifest,
  readKbManifestOrDefault,
  readKbManifestStatus,
  writeKbManifest,
} from "../src/utils/kb-manifest.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-lcov-gaps-"));
  tempDirs.push(dir);
  return dir;
}

describe("coverage gaps: kb-manifest", () => {
  test("reads missing, invalid, future, and valid manifests", () => {
    const root = tempDir();
    expect(readKbManifestStatus(root).state).toBe("missing");
    expect(readKbManifest(root)).toBeNull();
    expect(readKbManifestOrDefault(root)).toEqual(defaultKbManifest());

    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "manifest.json"), "{not-json");
    expect(readKbManifestStatus(root).state).toBe("invalid");

    writeFileSync(
      path.join(root, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: 99,
        schemaVersion: 1,
        semanticAdvisorBackfill: "pending",
      }),
    );
    expect(readKbManifestStatus(root).state).toBe("future");

    writeFileSync(
      path.join(root, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 0,
        semanticAdvisorBackfill: "pending",
      }),
    );
    expect(readKbManifestStatus(root).state).toBe("invalid");

    writeFileSync(
      path.join(root, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: "1",
        schemaVersion: 1,
        semanticAdvisorBackfill: "pending",
      }),
    );
    expect(readKbManifestStatus(root).state).toBe("invalid");

    writeFileSync(
      path.join(root, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 1,
        semanticAdvisorBackfill: "unknown",
      }),
    );
    expect(readKbManifestStatus(root).state).toBe("invalid");

    writeFileSync(path.join(root, ".kb", "manifest.json"), "[]");
    expect(readKbManifestStatus(root).state).toBe("invalid");

    rmSync(path.join(root, ".kb", "manifest.json"), { force: true });
    mkdirSync(path.join(root, ".kb", "manifest.json"));
    expect(readKbManifestStatus(root).state).toBe("invalid");
    expect(
      (readKbManifestStatus(root) as unknown as { warning?: string }).warning,
    ).toContain("unreadable");

    rmSync(path.join(root, ".kb", "manifest.json"), { recursive: true, force: true });
    const written = writeKbManifest(root, defaultKbManifest());
    expect(written.endsWith(".kb/manifest.json")).toBe(true);
    expect(readKbManifestStatus(root).state).toBe("ok");
    expect(readKbManifest(root)?.semanticAdvisorBackfill).toBe("not_applicable");
  });
});

describe("coverage gaps: result envelope", () => {
  test("maps diagnostics, next actions, and effect failures", () => {
    expect(KIBI_PROTOCOL_VERSION).toBe(1);
    expect(resultVersion({ name: "kb_query" })).toBe("kibi.kb_query.v1");
    expect(resultVersion({ name: "kb_query", resultVersion: "custom.v1" })).toBe(
      "custom.v1",
    );
    expect(operationData({ structuredContent: { ok: true } })).toEqual({
      ok: true,
    });
    expect(operationData("plain")).toBe("plain");

    const result = toKibiResult(
      { name: "kb_upsert", effects: ["kb-write"] },
      {
        status: "committed_with_repairs",
        diagnostics: ["warn-string", { message: "typed" }, 12],
        nextActions: [
          { operation: "kb_check", reason: "revalidate" },
          { operation: "kb_check" },
        ],
        effectFailures: [
          { kind: "kb-write", detail: "partial", errorCode: "E1" },
          { kind: "workspace-write", detail: "extra" },
        ],
      },
    );
    expect(result.status).toBe("committed_with_repairs");
    expect(result.effects.some((effect) => effect.status === "failed")).toBe(
      true,
    );
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.nextActions).toEqual([
      { operation: "kb_check", reason: "revalidate", required: false },
    ]);
  });
});

describe("coverage gaps: discovery tables", () => {
  test("renders search, status, graph, coverage, and gaps tables", () => {
    expect(renderDiscoveryTable(null)).toBeNull();
    expect(
      renderDiscoveryTable({
        count: 1,
        results: [
          {
            score: 1,
            reasons: ["title"],
            snippet: "One",
            entity: { id: "REQ-1", title: "One", type: "req" },
          },
        ],
      }),
    )?.toContain("REQ-1");
    expect(
      renderDiscoveryTable({
        branch: "develop",
        syncState: "fresh",
        dirty: false,
      }),
    )?.toContain("develop");
    expect(
      renderDiscoveryTable({
        nodes: [{ id: "REQ-1" }],
        edges: [{ from: "REQ-1", type: "specified_by", to: "SCEN-1" }],
      }),
    )?.toContain("REQ-1");
    expect(
      renderDiscoveryTable({
        rows: [{ id: "REQ-1", proofStatus: "missing" }],
        summary: { proofProven: 0 },
      }),
    )?.toContain("REQ-1");
    expect(
      renderDiscoveryTable({
        count: 1,
        rows: [
          {
            id: "REQ-1",
            type: "req",
            status: "open",
            missingRelationships: ["specified_by"],
            presentRelationships: [],
            source: ".kb/requirements/REQ-1.md",
          },
        ],
      }),
    )?.toContain("REQ-1");
  });

  test("renders requirement coverage plus repair and legacy migration plans", () => {
    const rendered = renderDiscoveryTable({
      summary: {
        total: 1,
        fullyCovered: 0,
      },
      rows: [
        {
          id: "REQ-1",
          status: "open",
          priority: "must",
          coverageStatus: "partial",
          coverageDepth: "scenario_only",
          proofStatus: "missing",
          scenarioCount: 1,
          testCount: 0,
          transitiveSymbolCount: 2,
          gaps: ["missing_test"],
          proofGaps: ["no_receipt"],
        },
        "not-an-object",
      ],
      repairPlan: {
        version: "kibi.repair-plan.v1",
        planId: "repair-1",
        status: "ready",
        scope: { complete: false },
        summary: { requirementCount: 2, repairCount: 3, batchCount: 26 },
        batches: Array.from({ length: 26 }, (_, index) => ({
          order: index + 1,
          requirementId: `REQ-${index + 1}`,
          phase: "scenario",
          state: "ready",
          dependsOn: index === 0 ? [] : [`REQ-${index}`],
          repairs: [{ gap: "missing_test" }, "skip"],
        })),
      },
      legacyMigrationPlan: {
        version: "kibi.legacy-migration.v1",
        planId: "legacy-1",
        status: "preview",
        scope: {
          repairPlanComplete: false,
          candidateRequirements: 4,
          selectedRequirements: 1,
          nextOffset: 1,
        },
        summary: { propositionCount: 2, unresolvedPropositionCount: 1 },
        batches: [
          {
            requirementId: "REQ-1",
            state: "ready",
            sourceBinding: { status: "bound" },
            propositions: [
              { predicateCandidates: [{ name: "owns" }, { name: "stores" }] },
              { predicateCandidates: "not-array" },
            ],
            diagnostics: ["needs review"],
          },
          "skip-batch",
        ],
      },
    });
    expect(rendered).toContain("REQ-1");
    expect(rendered).toContain("repair-1");
    expect(rendered).toContain("legacy-1");
    expect(rendered).toContain("Showing 25 of 26 repair batches");
    expect(rendered).toContain("needs review");
  });

  test("renders non-requirement coverage details and empty helper cells", () => {
    const rendered = renderDiscoveryTable({
      summary: { total: 1 },
      rows: [
        {
          id: "SYM-1",
          type: "symbol",
          coverageStatus: "uncovered",
          directRequirementCount: 0,
          testCount: 0,
          executableTestCount: 0,
          count: 1,
          gaps: [],
        },
      ],
      repairPlan: { status: "empty" },
      legacyMigrationPlan: { status: "empty" },
    });
    expect(rendered).toContain("SYM-1");
    expect(rendered).toContain("req=0");
  });
});

describe("coverage gaps: CLI command registration", () => {
  test("registers foundation, json, maintenance, proof, reporting, and skills commands", () => {
    const program = new Command();
    registerFoundationCommands(program);
    registerJsonOnlyCommands(program);
    registerMaintenanceCommands(program);
    registerProofCommand(program);
    registerReportingCommands(program);
    registerSkillsCommands(program);
    const names = program.commands.map((command) => command.name());
    expect(names).toEqual(expect.arrayContaining(["find-gaps", "prove"]));
  });
});

describe("coverage gaps: check-format-shared", () => {
  test("formats empty violations and a summary", () => {
    expect(formatViolationText([])).toContain("No violations");
    expect(
      buildSummary({
        violations: [],
        qualityDiagnostics: [],
        impactResult: undefined,
      }),
    ).toContain("No violations found");
  });
});
