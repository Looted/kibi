// implements REQ-014
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as yaml from "js-yaml";

import {
  buildUsageMetricsReport,
  parseUsageLog,
  usageMetricsCommand,
} from "../src/commands/usage-metrics.js";
import {
  insertKibiBadge,
  loadGitHubWorkflowTemplate,
  parseGitHubRemote,
} from "../src/commands/github-init.js";
import {
  getBranchOverride,
  getKbPlPathOverride,
  isCliDebugEnabled,
  isCliTraceEnabled,
  isCliTraceOrDebugEnabled,
  isPrologDebugEnabled,
} from "../src/env.js";
import {
  coarseCoordinateSpan,
  mergeCoordinatesWithManifest,
  parseCoordinateArtifact,
} from "../src/extractors/symbol-coordinates.js";
import { classifyActivation } from "../src/operations/bootstrap/activation.js";
import { claimFor } from "../src/operations/bootstrap/requirement-claims.js";
import { bootstrapEmptyKbSnapshotId } from "../src/operations/bootstrap/types.js";
import {
  loadExistingPredicateSchemas,
  schemaForCandidate,
} from "../src/operations/modeling/predicate-loader.js";
import { rankSchema, scoreSchema } from "../src/operations/modeling/predicate-ranker.js";
import type { PredicateSchemaCandidate } from "../src/operations/modeling/predicate-types.js";
import { classifyBinding } from "../src/operations/modeling/predicate-bindings.js";
import { extractRequirementClaim } from "../src/operations/modeling/requirement-modeler.js";
import { saveMutation } from "../src/operations/mutation/save.js";
import { scenarioCoverageWarnings } from "../src/operations/mutation/warnings.js";
import { commaList, detectPredicateRules } from "../src/operations/semantic-advisor/predicate-rule.js";
import {
  appendCliDiagnosticUsage,
  deriveDiagnosticUsageFields,
} from "../src/public/diagnostic-usage.js";
import { collectLinkedEntities, formatExtractedSymbols, buildNextActions } from "../src/public/impact/summaries.js";
import { collectSourceChanges } from "../src/public/impact/source-changes.js";
import { getSpec } from "../src/public/operations/catalog.js";
import { buildRepairPlan } from "../src/public/operations/repair-plan.js";
import { executeSemanticAdvisor, semanticAdvisorSpec } from "../src/public/operations/specs/semantic.js";
import { skillsLoadSpec } from "../src/public/operations/specs/skills.js";
import {
  SYMBOL_REPAIR_PLAN_VERSION,
  buildSymbolRepairPlan,
} from "../src/public/operations/symbol-repair-plan.js";
import { readWorkspaceSnapshot } from "../src/public/operations/workspace-snapshot.js";
import { resolveSkillFilePath } from "../src/public/skill-system/paths.js";
import { inspectBranchStore } from "../src/utils/branch-store.js";
import {
  captureIo,
  createTempDir,
  isolateKibiEnv,
  restoreWorkspaceCwd,
  withCwd,
} from "./helpers/in-process-workspace.js";

const tempDirs: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  mock.restore();
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(prefix = "kibi-small-gaps-"): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function operationContext(workspaceRoot: string, prolog?: {
  query: (goal: string) => Promise<{ success: boolean; bindings: Record<string, unknown>; error?: string }>;
}) {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    ...(prolog
      ? {
          prolog: {
            query: prolog.query,
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          },
        }
      : {}),
  };
}

function schema(
  overrides: Partial<PredicateSchemaCandidate> = {},
): PredicateSchemaCandidate {
  return {
    id: "FACT-SCHEMA-TEST",
    predicate_name: "ownership_rule",
    title: "Ownership",
    description: "Names the owner of a capability",
    argument_names: ["subject", "owner"],
    argument_types: ["atom", "atom"],
    keywords: ["owned", "owner"],
    examples: ["The checkout flow is owned by payments."],
    tags: ["ownership"],
    ...overrides,
  };
}

describe("coverage gaps: env helpers", () => {
  test("reads exact branch and debug flags from process.env", () => {
    const restore = isolateKibiEnv();
    restores.push(restore);
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    Reflect.deleteProperty(process.env, "KIBI_DEBUG");
    Reflect.deleteProperty(process.env, "KIBI_TRACE");
    Reflect.deleteProperty(process.env, "KIBI_PROLOG_DEBUG");

    expect(getBranchOverride()).toBeUndefined();
    expect(getKbPlPathOverride()).toBeUndefined();
    expect(isCliDebugEnabled()).toBe(false);
    expect(isCliTraceEnabled()).toBe(false);
    expect(isCliTraceOrDebugEnabled()).toBe(false);
    expect(isPrologDebugEnabled()).toBe(false);

    process.env.KIBI_BRANCH = "feature/exact";
    process.env.KIBI_KB_PL_PATH = "/tmp/kb.pl";
    process.env.KIBI_DEBUG = "1";
    expect(getBranchOverride()).toBe("feature/exact");
    expect(getKbPlPathOverride()).toBe("/tmp/kb.pl");
    expect(isCliDebugEnabled()).toBe(true);
    expect(isCliTraceOrDebugEnabled()).toBe(true);

    process.env.KIBI_DEBUG = "";
    process.env.KIBI_TRACE = "yes";
    process.env.KIBI_PROLOG_DEBUG = "yes";
    expect(isCliTraceEnabled()).toBe(true);
    expect(isCliTraceOrDebugEnabled()).toBe(true);
    expect(isPrologDebugEnabled()).toBe(true);
  });
});

describe("coverage gaps: usage-metrics", () => {
  test("sorts violation trends, infers zero-results, and categorizes colon errors", () => {
    const rows = parseUsageLog(
      [
        JSON.stringify({
          timestamp: "2026-05-01T10:05:00.000Z",
          tool: "kb_check",
          status: "success",
          violation_count: 2,
        }),
        JSON.stringify({
          timestamp: "2026-05-01T10:01:00.000Z",
          tool: "kb_check",
          status: "success",
          violation_count: 5,
        }),
        JSON.stringify({
          tool: "kb_query",
          result_count: 0,
        }),
        JSON.stringify({
          tool: "kb_search",
          args: { sourceFile: "src/from-args.ts" },
          result_summary: "0 results",
        }),
        JSON.stringify({
          tool: "kb_query",
          business_args: { sourceFile: "src/from-business.ts" },
          result_count: 0,
        }),
        JSON.stringify({
          tool: "kb_upsert",
          status: "error",
          error: "ColonCategory: leftover detail",
        }),
      ].join("\n"),
    );
    const report = buildUsageMetricsReport(rows, 5);
    expect(report.kbCheck.violationTrend.map((entry) => entry.timestamp)).toEqual(
      ["2026-05-01T10:01:00.000Z", "2026-05-01T10:05:00.000Z"],
    );
    expect(report.zeroResults.count).toBeGreaterThan(0);
    expect(report.zeroResults.topSourceFiles.map((entry) => entry.sourceFile)).toEqual(
      expect.arrayContaining(["src/from-args.ts", "src/from-business.ts"]),
    );
    expect(report.errors.categories.ColonCategory).toBe(1);
  });

  test("renders empty zero-result and violation tables for a quiet log", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createTempDir("kibi-usage-empty-");
    tempDirs.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "usage.log"),
      `${JSON.stringify({
        timestamp: "2026-05-01T10:00:00.000Z",
        tool: "kb_status",
        status: "success",
        telemetry_status: "provided",
        telemetry: { is_autonomous: true },
      })}\n`,
    );
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () => usageMetricsCommand({}));
    expect(io.logText()).toContain("Zero Results");
    expect(io.logText()).toContain("Violations");
  });
});

describe("coverage gaps: semantic advisor spec", () => {
  test("rejects empty text and filters mixed interpretation values", async () => {
    const context = operationContext(tempDir());
    await expect(executeSemanticAdvisor({ text: "   " })).rejects.toThrow(
      /text must be a non-empty string/,
    );
    await expect(
      semanticAdvisorSpec.execute({ text: "" }, context),
    ).rejects.toThrow(/text must be a non-empty string/);

    const result = await semanticAdvisorSpec.execute(
      {
        text: "The checkout flow must be retained for 30 days.",
        clauses: ["keep", 12, "also"],
        interpretations: [
          {
            claim_key: "CLAIM-1",
            claim_text: "retain checkout",
            ir: { kind: "atom" },
          },
          "skip",
          null,
        ],
        type: "req",
        id: "REQ-SEM",
        title: "Retain",
        source: "test://semantic",
        status: "open",
      },
      context,
    );
    expect(result.structuredContent?.receipt.summary).toBeString();
  });
});

describe("coverage gaps: symbol coordinates", () => {
  test("falls back when the title is empty and rejects invalid artifacts", () => {
    expect(coarseCoordinateSpan("src/a.ts", "", "one\ntwo\n").sourceEndLine).toBe(3);
    expect(parseCoordinateArtifact("[]")).toMatchObject({
      status: "invalid",
    });
    const yamlSpy = spyOn(yaml, "load").mockImplementation(() => {
      throw "not-an-error";
    });
    expect(parseCoordinateArtifact("broken: [")).toMatchObject({
      status: "invalid",
      reason: "not-an-error",
    });
    yamlSpy.mockRestore();
  });

  test("merges null, invalid, missing, and invalid-span coordinate artifacts", () => {
    const records = [
      { id: "SYM-1", title: "alpha", sourceFile: "src/a.ts" },
      { title: "no-id", sourceFile: "src/a.ts" },
    ];
    expect(
      mergeCoordinatesWithManifest(records, null).map((record) => record.id),
    ).toEqual(["SYM-1", undefined]);
    expect(() =>
      mergeCoordinatesWithManifest(records, {
        status: "invalid",
        reason: "bad artifact",
      }),
    ).toThrow("bad artifact");
    expect(
      mergeCoordinatesWithManifest(records, { coordinates: {} })[0]?.sourceLine,
    ).toBeUndefined();
    expect(
      mergeCoordinatesWithManifest(records, {
        status: "legacy",
        coordinates: {
          "SYM-1": {
            sourceFile: "src/a.ts",
            sourceLine: -1,
            sourceColumn: 0,
            sourceEndLine: 1,
            sourceEndColumn: 1,
          },
        },
      })[0]?.sourceLine,
    ).toBeUndefined();
  });
});

describe("coverage gaps: predicate ranker", () => {
  test("scores exact matches, plugin-launcher penalties, and lexical fallbacks", () => {
    const exact = rankSchema(
      schema({ predicate_name: "ownership_rule" }),
      "The checkout flow is owned by payments.",
    );
    expect(exact.components.exact_pattern).toBeGreaterThan(0);
    expect(scoreSchema(schema({ predicate_name: "ownership_rule" }), "The checkout flow is owned by payments.")).toBe(
      exact.score,
    );

    const launcher = rankSchema(
      schema({
        predicate_name: "plugin_launcher_contract",
        keywords: ["change", "required", "the"],
        aliases: ["system state value"],
        paraphrase_templates: ["the system must change"],
        usage_hints: {
          use_when: ["the launcher contract is explicit"],
          do_not_use_when: ["unrelated UI copy"],
        },
      }),
      "The required plugin launcher contract must change the published system state value.",
    );
    expect(launcher.schema.predicate_name).toBe("plugin_launcher_contract");
    expect(launcher.score).toBeGreaterThanOrEqual(0);

    const miss = rankSchema(
      schema({
        predicate_name: "unrelated_rule",
        keywords: ["zzzz"],
        examples: ["no overlap here"],
      }),
      "Completely different prose about widgets.",
    );
    expect(miss.score).toBe(0);
  });
});

describe("coverage gaps: requirement claims", () => {
  test("extracts enabled and disabled boolean state claims", () => {
    expect(claimFor("Dark mode must be enabled.", "src.md", 0.9, "test")).toMatchObject({
      propertyKey: "enabled",
      operator: "bool",
      value: true,
    });
    expect(claimFor("The feature shall be disabled.", "src.md", 0.8, "test")).toMatchObject({
      propertyKey: "enabled",
      operator: "bool",
      value: false,
    });
    expect(claimFor("1) Audit logs should be enabled.", "src.md", 0.7, "test")?.value).toBe(true);
  });
});

describe("coverage gaps: repair plan", () => {
  test("uses fallback actions, unknown gaps, and same-phase priority sort", () => {
    const plan = buildRepairPlan(
      {
        summary: { proofMissing: "skip", proofUnresolved: "skip" } as unknown as {
          proofMissing: number;
          proofUnresolved: number;
        },
        rows: [
          {
            id: "REQ-GAP",
            proofGaps: ["mystery_gap", "also_mystery", "missing_scenario"],
            proofRepairs: [
              "skip",
              { gap: 12 },
              { gap: "missing_scenario" },
              { gap: "mystery_gap", action: "Later", priority: 9 },
              { gap: "also_mystery", action: "Earlier", priority: 1 },
            ],
            proofStages: { scenarios: "not-a-record" },
          },
        ],
      },
      { by: "req" },
      "e".repeat(64),
    );
    expect(plan?.status).toBe("ready");
    const review = plan?.batches.find((batch) => batch.phase === "manual_review");
    expect(review?.repairs.map((repair) => repair.action)).toEqual(["Earlier", "Later"]);
    expect(plan?.batches.find((batch) => batch.phase === "scenario_endpoints")?.repairs[0]?.action).toContain(
      "Create",
    );
  });
});

describe("coverage gaps: github-init", () => {
  test("rejects empty parsed remotes and missing templates", () => {
    expect(parseGitHubRemote("https://github.com/owner/.git")).toBeUndefined();
    const existsSpy = spyOn(fs, "existsSync").mockReturnValue(false);
    expect(() => loadGitHubWorkflowTemplate("badge")).toThrow(/template missing/);
    existsSpy.mockRestore();
  });

  test("walks blank lines between badge clusters", () => {
    const withPeer = insertKibiBadge(
      ["# Title", "", "[![peer](https://example.com/a.svg)](https://example.com)", "", "[![next](https://example.com/b.svg)](https://example.com)", "", "Body"].join("\n"),
      "[![Kibi](https://example.com/kibi.svg)](https://example.com)",
    );
    expect(withPeer).toContain("[![Kibi]");
    const stops = insertKibiBadge(
      ["# Title", "", "[![peer](https://example.com/a.svg)](https://example.com)", "", "Not a badge"].join("\n"),
      "[![Kibi](https://example.com/kibi.svg)](https://example.com)",
    );
    expect(stops).toContain("Not a badge");
  });
});

describe("coverage gaps: diagnostic usage", () => {
  test("unwraps protocol envelopes and coverage receipt gaps", () => {
    const unwrapped = deriveDiagnosticUsageFields("kb_query", {}, null, {
      kibiProtocol: 1,
      data: { count: 2 },
    });
    expect(unwrapped.result_count).toBe(2);

    const envelope = deriveDiagnosticUsageFields("kb_search", {}, null, {
      kibiProtocol: 1,
      resultVersion: "kibi.search.v1",
      status: "ok",
      count: 0,
    });
    expect(envelope.protocol_version).toBe(1);
    expect(envelope.zero_results).toBe(true);

    const coverage = deriveDiagnosticUsageFields(
      "kb_coverage",
      { by: "req" },
      null,
      {
        rows: [
          {
            id: "REQ-1",
            proofGaps: ["missing_proof_receipt", "stale_proof_receipt"],
            proofStages: {
              passingE2e: { missingReceiptTests: ["TEST-1"], staleReceiptTests: ["TEST-2"] },
            },
          },
          { proofGaps: ["other"] },
        ],
        summary: { total: 2, proofProven: 0, proofMissing: 1 },
        repairPlan: { scope: { complete: false } },
      },
    );
    expect(coverage.coverage_receipt_gap_count).toBe(2);
    expect(coverage.coverage_scope_complete).toBe(false);
  });

  test("appends a CLI usage line for a protocol result", () => {
    const root = tempDir();
    const logPath = path.join(root, "usage.log");
    appendCliDiagnosticUsage({
      workspaceRoot: root,
      tool: "kb_query",
      businessArgs: {},
      telemetry: null,
      startedAt: new Date("2026-09-05T00:00:00.000Z"),
      status: "success",
      result: { kibiProtocol: 1, data: { count: 0 } },
      logPath,
    });
    expect(fs.readFileSync(logPath, "utf8")).toContain("kb_query");
  });
});

describe("coverage gaps: source-changes", () => {
  test("returns empty working-tree diffs outside git and filters unsupported files", () => {
    const root = tempDir();
    writeFileSync(path.join(root, "notes.txt"), "ignore\n");
    expect(
      collectSourceChanges({
        workspaceRoot: root,
        includeWorkingTreeDiff: true,
      }),
    ).toEqual([]);
    expect(
      collectSourceChanges({
        workspaceRoot: root,
        includeWorkingTreeDiff: true,
        sourceFiles: ["src/missing.ts", "notes.txt"],
      }),
    ).toEqual([]);
    expect(
      collectSourceChanges({
        workspaceRoot: root,
        sourceFiles: ["notes.txt"],
      }),
    ).toEqual([]);
  });
});

describe("coverage gaps: symbol repair plan", () => {
  test("matches extracted names by kind and swallows extraction failures", async () => {
    const root = tempDir();
    const src = path.join(root, "src");
    mkdirSync(src);
    writeFileSync(path.join(src, "live.ts"), "export function handleClick() { return 1; }\n");
    mkdirSync(path.join(src, "broken.ts"));
    const results = `[${[
      `[SYM-KIND,symbol,[title="otherName",sourceFile="src/live.ts",symbol_kind=function,symbol_origin=extracted]]`,
      `[SYM-PEER,symbol,[title="handleClick",sourceFile="src/live.ts",symbol_kind=function,symbol_origin=extracted]]`,
      `[SYM-BROKEN,symbol,[title="broken",sourceFile="src/broken.ts",symbol_kind=function,symbol_origin=extracted]]`,
    ].join(",")}]`;
    const plan = await buildSymbolRepairPlan(
      [
        { type: "symbol", id: "SYM-KIND" },
        { type: "symbol", id: "SYM-BROKEN" },
      ],
      operationContext(root, {
        query: async () => ({ success: true, bindings: { Results: results } }),
      }),
    );
    expect(plan?.version).toBe(SYMBOL_REPAIR_PLAN_VERSION);
    const byId = Object.fromEntries(
      (plan?.repairs ?? []).map((repair) => [String(repair.symbolId), repair]),
    );
    expect(
      (byId["SYM-KIND"]?.candidates as Array<{ symbolId: string }>).map(
        (candidate) => candidate.symbolId,
      ),
    ).toContain("SYM-PEER");
    expect(byId["SYM-BROKEN"]?.action).toBe("delete_obsolete_symbol");
  });
});

describe("coverage gaps: remaining small CLI modules", () => {
  test("loads skills, snapshots, catalog, claims, and bootstrap helpers", async () => {
    const context = operationContext(tempDir());
    const loaded = await skillsLoadSpec.execute({ id: "kibi-usage" }, context);
    expect(loaded.structuredContent?.metadata.id).toBe("kibi-usage");

    expect(await readWorkspaceSnapshot(context)).toMatchObject({
      available: false,
    });
    await expect(
      readWorkspaceSnapshot({
        ...context,
        git: {
          workspaceSnapshot: async () => {
            throw "snapshot-failed";
          },
        },
      }),
    ).resolves.toMatchObject({ available: false, error: "snapshot-failed" });

    expect(() => getSpec("kb_not_a_real_op" as never)).toThrow(/Unknown Kibi operation/);
    expect(() =>
      extractRequirementClaim({ text: "Hello", sourceFiles: [] }),
    ).toThrow(/source or at least one sourceFiles/);
    expect(
      extractRequirementClaim({
        text: "Fallback prose",
        source: "src.md",
      }).statement,
    ).toContain("Fallback");

    expect(
      bootstrapEmptyKbSnapshotId({
        branch: "main",
        workspaceSnapshot: "abc",
        sourceHashes: { "README.md": null },
      }),
    ).toStartWith("empty-source-state-");

    expect(commaList("alpha, and beta")).toContain("alpha");
    expect(
      detectPredicateRules(
        { type: "req", id: "REQ-1", properties: { title: "T", status: "open", source: "s" } },
        "ignored",
        [
          {
            pattern: /nope/,
            name: "skip",
            args: () => [],
            rationale: "none",
            accepts: () => false,
          },
        ],
      ),
    ).toBeNull();

    const candidate = schema({
      argument_descriptions: ["subject"],
      aliases: ["owns"],
      usage_hints: undefined,
    });
    expect(schemaForCandidate(candidate).usage_hints.use_when.length).toBeGreaterThan(0);
    const warnings: string[] = [];
    expect(await loadExistingPredicateSchemas(null, true, warnings)).toEqual([]);
    expect(
      await loadExistingPredicateSchemas(
        {
          query: async () => ({ success: false, bindings: {}, error: "nope" }),
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        },
        true,
        warnings,
      ),
    ).toEqual([]);
    expect(warnings[0]).toContain("could not be loaded");

    expect(
      classifyBinding(
        "stdio|stdin",
        "the process inherits stdio and stdin pipes",
        false,
      ),
    ).toBe("extracted");
    expect(classifyBinding("missing_dependency", "a missing runtime dependency", false)).toBe(
      "extracted",
    );

    expect(buildNextActions([])).toEqual([]);
    expect(
      formatExtractedSymbols(
        new Map([
          [
            "src/a.ts",
            [
              {
                id: "SYM-1",
                name: "alpha",
                kind: "function",
                role: "implementation",
                location: { file: "src/a.ts", startLine: 1, endLine: 1 },
                hunkRanges: [],
                reqLinks: [],
                relationships: [{ type: "implements", to: "REQ-1" }, { type: "mentions", to: "X" }],
              },
            ],
          ],
        ]),
      )[0]?.linkedEntityIds,
    ).toEqual(["REQ-1"]);
    expect(
      collectLinkedEntities(
        new Map(),
        [
          {
            sourceFile: "src/a.ts",
            entity: { id: "SYM-1", title: "alpha" },
            relationships: [{ type: "implements", to: "REQ-1" }],
          } as never,
        ],
        new Set(["src/a.ts"]),
      ),
    ).toHaveLength(1);

    const skillDir = tempDir();
    writeFileSync(path.join(skillDir, "SKILL.md"), "# skill\n");
    expect(resolveSkillFilePath(skillDir)).toEndWith("SKILL.md");

    await expect(
      saveMutation({
        query: async () => ({ success: true, bindings: {} }),
        nextSolution: async () => null,
        save: async () => ({ success: false, bindings: {}, error: "disk full" }),
      }),
    ).rejects.toThrow(/Failed to save KB after upsert/);

    expect(
      await scenarioCoverageWarnings(
        {
          query: async () => ({ success: true, bindings: {} }),
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        },
        [{ type: "verified_by", from: "REQ-1", to: "TEST-1" }],
        "req",
        "REQ-1",
      ),
    ).toHaveLength(1);

    const storeRoot = tempDir();
    const existsSpy = spyOn(fs, "existsSync").mockReturnValue(true);
    const storeSpy = spyOn(fs, "statSync").mockImplementation(() => {
      throw "stat-failed";
    });
    expect(inspectBranchStore(storeRoot, "main").detail).toBe("stat-failed");
    storeSpy.mockRestore();
    existsSpy.mockRestore();

    const activationRoot = tempDir();
    const policy = await classifyActivation(
      operationContext(activationRoot),
      "not-an-array" as unknown as string[],
    );
    expect(policy.activationState).toBe("root_uninitialized");
    expect(
      (
        await classifyActivation(
          {
            ...operationContext(activationRoot),
            fs: {
              stat: async () => {
                throw new Error("missing");
              },
            } as never,
          },
          [path.join(activationRoot, "kibi", "README.md")],
        )
      ).activationState,
    ).toBe("vendored_only");
  });
});
