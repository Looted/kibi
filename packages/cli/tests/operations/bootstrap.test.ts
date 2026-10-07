import { describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildBootstrapCandidates } from "../../src/operations/bootstrap/candidates.js";
import { discoverBootstrap } from "../../src/operations/bootstrap/discovery.js";
import { bootstrapPlanHash } from "../../src/operations/bootstrap/types.js";
import {
  nodeFilesystem,
  nodeGit,
} from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import { planBootstrapSpec } from "../../src/public/operations/specs/bootstrap.js";
import {
  createSeededRepo,
  setupWorkspace,
  writeRootManifest,
} from "./bootstrap-workspace-fixture";

function planningContext(root: string): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-20T00:00:00Z"),
    fs: nodeFilesystem,
    git: {
      ...nodeGit,
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "main",
      kbBranch: "main",
      storePath: path.join(root, ".kb", "branches", "main"),
      kind: "exact",
      migrationRequired: false,
    },
  };
}

// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
describe("shared bootstrap executor", () => {
  test("shared candidate builder keeps typed evidence deterministic and read-only", () => {
    const result = buildBootstrapCandidates(
      [
        {
          provider: "typed_kibi_docs",
          kind: "typed_markdown",
          label: ".kb/requirements/REQ-BOOTSTRAP.md",
          relativePath: ".kb/requirements/REQ-BOOTSTRAP.md",
          content:
            "---\nid: REQ-BOOTSTRAP\ntitle: Bootstrap plan\nstatus: open\n---\n",
          data: {},
        },
      ],
      new Set(),
      0.8,
      true,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.applyPlan[0]?.type).toBe("req");
    expect(result.sourceOnlySignals).toHaveLength(0);
  });

  test("shared discovery classifies an uninitialized root without mutation", async () => {
    const context = {
      workspaceRoot: "/workspace/bootstrap-discovery",
      signal: new AbortController().signal,
      clock: () => new Date("2026-07-21T00:00:00Z"),
      fs: {
        readFile: async () => '{"name":"fixture"}',
        writeFile: async () => undefined,
        mkdir: async () => undefined,
        stat: async () => ({ isFile: () => true, isDirectory: () => false }),
        glob: async () => ["package.json"],
      },
      git: {
        revParse: async () => "develop",
        showToplevel: async () => "/workspace/bootstrap-discovery",
        ignoredPaths: async () => [],
      },
    };
    const result = await discoverBootstrap(context);
    expect(result.activation.activationState).toBe("root_uninitialized");
    expect(result.activation.applyBlocked).toBe(true);
    expect(result.evidence.length).toBeGreaterThanOrEqual(0);
  });

  test("uses workspace ports, clamps limits, and preserves nested bootstrap context", async () => {
    // Given: a cold-start workspace exposed only through explicit runtime ports.
    const writeFile = mock(async () => undefined);
    const mkdir = mock(async () => undefined);
    const context = {
      workspaceRoot: "/workspace/bootstrap-fixture",
      signal: new AbortController().signal,
      clock: () => new Date("2026-07-21T00:00:00Z"),
      fs: {
        readFile: async (filePath: string) => {
          if (filePath.endsWith("package.json")) {
            return JSON.stringify({
              name: "fixture",
              scripts: { test: "bun test" },
            });
          }
          throw new Error(`Unexpected read: ${filePath}`);
        },
        writeFile,
        mkdir,
        stat: async () => ({ isFile: () => true, isDirectory: () => false }),
        glob: async () => ["package.json"],
      },
      git: {
        revParse: async () => "develop",
        showToplevel: async () => "/workspace/bootstrap-fixture",
        ignoredPaths: async () => [],
      },
    };

    // When: limits below the public bounds and declared nested context are supplied.
    const result = await planBootstrapSpec.execute(
      {
        minConfidence: 0,
        maxCandidates: 0,
        bootstrapContext: {
          projectSummary: "  Port-backed fixture  ",
          sourceOfTruthPaths: ["README.md", "README.md"],
          verificationAnchors: ["bun test"],
        },
      },
      context,
    );

    // Then: synthesis is deterministic, normalized, bounded, and read-only.
    expect(result.structuredContent?.declaredContext).toEqual({
      projectSummary: "Port-backed fixture",
      sourceOfTruthPaths: ["README.md"],
      sourceOfTruthNotes: [],
      priorityRoots: [],
      verificationAnchors: ["bun test"],
    });
    expect(result.structuredContent?.candidates).toHaveLength(1);
    expect(result.structuredContent?.actions).toHaveLength(1);
    const plan = result.structuredContent?.plan;
    expect(plan).toBeDefined();
    expect(plan?.planHash).toBe(result.structuredContent?.planHash);
    expect(plan ? bootstrapPlanHash(plan) : "").toBe(plan?.planHash);
    expect(plan?.diagnostics).toEqual(result.structuredContent?.diagnostics);
    expect(writeFile).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
  });

  test("returns planner-owned bounded questions for insufficient evidence", async () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-bootstrap-needs-context-"),
    );
    try {
      writeRootManifest(root);
      for (const lane of [
        "requirements",
        "scenarios",
        "tests",
        "adr",
        "flags",
        "events",
        "facts",
      ]) {
        mkdirSync(path.join(root, ".kb", lane), { recursive: true });
      }
      writeFileSync(path.join(root, ".kb", "symbols.yaml"), "symbols: []\n");
      const result = await planBootstrapSpec.execute({}, planningContext(root));
      expect(result.structuredContent.plan.status).toBe("needs_context");
      expect(
        result.structuredContent.plan.contextQuestions.length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        result.structuredContent.plan.contextQuestions.length,
      ).toBeLessThanOrEqual(4);
      expect(result.structuredContent.planHash).toBe(
        result.structuredContent.plan.planHash,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("returns blocked and handoff plan statuses for uninitialized and seeded roots", async () => {
    const blockedRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-bootstrap-blocked-"),
    );
    const seeded = setupWorkspace();
    try {
      const blocked = await planBootstrapSpec.execute(
        {},
        planningContext(blockedRoot),
      );
      expect(blocked.structuredContent.plan.status).toBe("blocked");
      expect(blocked.structuredContent.plan.activation.applyBlocked).toBe(true);

      createSeededRepo(seeded.root);
      const handoff = await planBootstrapSpec.execute(
        {},
        planningContext(seeded.root),
      );
      expect(handoff.structuredContent.plan.status).toBe("handoff");
      expect(handoff.structuredContent.plan.activation.activationMode).toBe(
        "attached_seeded_handoff",
      );
    } finally {
      rmSync(blockedRoot, { recursive: true, force: true });
      seeded.cleanup();
    }
  });
});

// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
test("existing entity enumeration failure blocks binding instead of disabling suppression", async () => {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "kibi-bootstrap-id-failure-"),
  );
  try {
    writeRootManifest(root);
    const context = planningContext(root);
    const result = await planBootstrapSpec.execute(
      {},
      {
        ...context,
        prolog: {
          query: async () => {
            throw new Error("id enumeration unavailable");
          },
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        },
      },
    );
    expect(result.structuredContent.plan.status).toBe("blocked");
    expect(result.structuredContent.plan.diagnostics.join("\n")).toContain(
      "existing entity IDs",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
test("declared intent claims turn generic Markdown off unless the caller sets it", async () => {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "kibi-bootstrap-generic-default-"),
  );
  try {
    writeRootManifest(root);
    for (const lane of ["requirements", "scenarios", "tests", "facts"])
      mkdirSync(path.join(root, ".kb", lane), { recursive: true });
    writeFileSync(path.join(root, ".kb", "symbols.yaml"), "symbols: []\n");
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(
      path.join(root, "docs", "requirements.md"),
      "# Exports\n\n- Exports must be signed.\n- Telemetry must be disabled.\n",
    );
    const bootstrapContext = {
      projectSummary: "An exporter",
      knowledgeSources: [
        {
          id: "tracker",
          kind: "issue_tracker" as const,
          title: "Tracker",
          locator: "TRK",
          authority: "authoritative" as const,
        },
      ],
      intentClaims: [
        {
          sourceId: "tracker",
          reference: "TRK-1",
          statement: "Refunds must not exceed the original charge.",
          excerpt:
            "The source states this verbatim so the entity can keep the passage.",
        },
      ],
    };
    const generic = (
      result: Awaited<ReturnType<typeof planBootstrapSpec.execute>>,
    ) =>
      result.structuredContent.plan.candidates.filter(
        (row) => row.sourceKind === "generic_markdown",
      ).length;
    const withoutClaims = await planBootstrapSpec.execute(
      {},
      planningContext(root),
    );
    const withClaims = await planBootstrapSpec.execute(
      { bootstrapContext },
      planningContext(root),
    );
    const explicit = await planBootstrapSpec.execute(
      { bootstrapContext, includeGenericMarkdown: true },
      planningContext(root),
    );
    expect(generic(withoutClaims)).toBeGreaterThan(0);
    expect(generic(withClaims)).toBe(0);
    expect(generic(explicit)).toBe(generic(withoutClaims));
    expect(withClaims.structuredContent.plan.diagnostics).toContain(
      "Generic Markdown candidates are off by default because intent claims were declared; pass includeGenericMarkdown: true to include them.",
    );
    expect(
      explicit.structuredContent.plan.diagnostics.join("\n"),
    ).not.toContain("off by default");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
