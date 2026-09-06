// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import * as discovery from "../../src/operations/bootstrap/discovery.js";
import {
  executePlanBootstrap,
  selectBootstrapCandidates,
} from "../../src/operations/bootstrap/generate.js";
import type {
  BootstrapPlanV1,
  Candidate,
} from "../../src/operations/bootstrap/types.js";
import * as executors from "../../src/public/operations/discovery-executors.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    candidateId: "cand-a",
    entityType: "req",
    title: "Retention",
    sourceKind: "typed_markdown",
    sourcePath: "docs/a.md",
    confidence: 0.9,
    confidenceBand: "high",
    evidence: [],
    relationships: [],
    applyPlan: [{ id: "REQ-A", properties: { id: "REQ-A" } }],
    ...overrides,
  };
}

function context(workspaceRoot: string, extras: Partial<OperationContext> = {}): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    fs: nodeFilesystem,
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: path.join(workspaceRoot, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
    ...extras,
  };
}

describe("selectBootstrapCandidates", () => {
  test("filters types, suppresses existing, shadowed, and duplicate titles", () => {
    const typed = candidate();
    const generic = candidate({
      candidateId: "cand-generic",
      sourceKind: "generic_markdown",
      sourcePath: "docs/generic.md",
      applyPlan: [{ id: "REQ-GENERIC" }],
    });
    const existing = candidate({
      candidateId: "cand-exist",
      title: "Other",
      sourcePath: "docs/exist.md",
      applyPlan: [{ properties: { id: "REQ-EXIST" } }],
    });
    const duplicateHigher = candidate({
      candidateId: "cand-dup",
      sourcePath: "docs/b.md",
      confidence: 0.95,
      applyPlan: [{ id: "REQ-B" }],
    });
    const noId = candidate({
      candidateId: "cand-empty",
      title: "Empty",
      applyPlan: [{ properties: { title: "no-id" } }],
    });
    const selected = selectBootstrapCandidates(
      [typed, generic, existing, duplicateHigher, noId],
      new Set(["REQ-EXIST"]),
      ["req"],
      10,
    );
    expect(selected.candidates.map((row) => row.candidateId)).toEqual([
      "cand-dup",
      "cand-empty",
    ]);
    expect(selected.suppressed.map((row) => row.reason)).toEqual(
      expect.arrayContaining([
        "entity_exists",
        "shadowed_by_typed_source",
        "duplicate_title",
      ]),
    );

    const untyped = selectBootstrapCandidates(
      [candidate({ entityType: "adr", candidateId: "adr-1", applyPlan: [{ id: "ADR-1" }] })],
      new Set(),
      ["req"],
      1,
    );
    expect(untyped.candidates).toEqual([]);
  });

  test("keeps the earlier path when duplicate confidence ties", () => {
    const first = candidate({
      candidateId: "first",
      sourcePath: "docs/a.md",
      confidence: 0.8,
      applyPlan: [{ id: "REQ-1" }],
    });
    const second = candidate({
      candidateId: "second",
      sourcePath: "docs/z.md",
      confidence: 0.8,
      applyPlan: [{ id: "REQ-2" }],
    });
    const selected = selectBootstrapCandidates([second, first], new Set(), undefined, 10);
    expect(selected.candidates[0]?.candidateId).toBe("first");
    expect(selected.suppressed[0]?.reason).toBe("duplicate_title");
  });
});

describe("executePlanBootstrap", () => {
  test("binds evidence hashes, empty-source snapshot, ignored sources, and entity filters", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-generate-"));
    tempDirs.push(root);
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(path.join(root, "docs", "a.md"), "typed\n");
    const spy = spyOn(discovery, "discoverBootstrap").mockResolvedValue({
      activation: {
        activationState: "root_active_thin",
        activationMode: "attached_thin_bootstrap",
        applyBlocked: false,
        allowCandidateGeneration: true,
        reason: "thin",
      },
      evidence: [
        {
          provider: "typed_kibi_docs",
          kind: "typed_markdown",
          label: "a.md",
          relativePath: "docs/a.md",
          data: {},
        },
        {
          provider: "generic_repo_docs",
          kind: "generic_markdown",
          label: "missing.md",
          relativePath: "docs/missing.md",
          data: {},
        },
        {
          provider: "repo_layout",
          kind: "repo_layout",
          label: "src",
          relativePath: "src",
          data: {},
        },
      ],
      ignoredSources: ["vendor/x.md"],
      summary: {
        activationState: "root_active_thin",
        activationMode: "attached_thin_bootstrap",
        applyBlocked: false,
        reason: "thin",
        providersRun: ["typed_kibi_docs"],
        providerCounts: { typed_kibi_docs: 1 },
        detectedLanguages: [],
        detectedTestFrameworks: [],
        excludedRoots: [],
        truncated: false,
        scanWarnings: [],
      },
      migrationWarning: null,
    });
    try {
      const result = await executePlanBootstrap(
        {
          includeGenericMarkdown: false,
          minConfidence: 0.5,
          maxCandidates: 5,
          entityTypes: ["req"],
          bootstrapContext: { projectSummary: "demo" },
        },
        context(root, {
          prolog: {
            query: async () => {
              throw new Error("entity load failed");
            },
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          },
        }),
      );
      const expected = result.structuredContent.expected as BootstrapPlanV1["expected"];
      expect(expected.sourceHashes["docs/a.md"]).toMatch(/^[a-f0-9]{64}$/);
      expect(expected.sourceHashes["docs/missing.md"]).toBeNull();
      expect(result.structuredContent.suppressedCandidates.some((row) => row.reason === "ignored_source")).toBe(
        true,
      );
    } finally {
      spy.mockRestore();
    }
  });

  test("records binding diagnostics without a filesystem and when discovery is blocked", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-generate-nofs-"));
    tempDirs.push(root);
    const spy = spyOn(discovery, "discoverBootstrap").mockResolvedValue({
      activation: {
        activationState: "root_uninitialized",
        activationMode: "cold_start_bootstrap",
        applyBlocked: true,
        allowCandidateGeneration: false,
        reason: "blocked",
      },
      evidence: [],
      ignoredSources: [],
      summary: {
        activationState: "root_uninitialized",
        activationMode: "cold_start_bootstrap",
        applyBlocked: true,
        reason: "blocked",
        providersRun: [],
        providerCounts: {},
        detectedLanguages: [],
        detectedTestFrameworks: [],
        excludedRoots: [],
        truncated: false,
        scanWarnings: [],
      },
      migrationWarning: "legacy",
    });
    try {
      const { fs: _fs, ...noFs } = context(root);
      const result = await executePlanBootstrap({}, noFs);
      expect(result.structuredContent.diagnostics.join(" ")).toMatch(
        /filesystem-capable|branch|snapshot|KB snapshot|repository state/,
      );
    } finally {
      spy.mockRestore();
    }
  });

  test("falls back when status/workspace binding throws", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-generate-throw-"));
    tempDirs.push(root);
    const spy = spyOn(discovery, "discoverBootstrap").mockResolvedValue({
      activation: {
        activationState: "root_active_thin",
        activationMode: "attached_thin_bootstrap",
        applyBlocked: false,
        allowCandidateGeneration: true,
        reason: "thin",
      },
      evidence: [],
      ignoredSources: [],
      summary: {
        activationState: "root_active_thin",
        activationMode: "attached_thin_bootstrap",
        applyBlocked: false,
        reason: "thin",
        providersRun: [],
        providerCounts: {},
        detectedLanguages: [],
        detectedTestFrameworks: [],
        excludedRoots: [],
        truncated: false,
        scanWarnings: [],
      },
      migrationWarning: null,
    });
    try {
      const result = await executePlanBootstrap(
        {},
        context(root, {
          git: {
            workspaceSnapshot: async () => {
              throw new Error("git down");
            },
          },
        }),
      );
      expect(
        (result.structuredContent.expected as BootstrapPlanV1["expected"])
          .kbSnapshotId,
      ).toMatch(/unavailable|empty-source-state|missing/);
    } finally {
      spy.mockRestore();
    }
  });

  test("records unknown-branch and missing-snapshot binding diagnostics", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-generate-status-"));
    tempDirs.push(root);
    const discoverySpy = spyOn(discovery, "discoverBootstrap").mockResolvedValue({
      activation: {
        activationState: "root_active_thin",
        activationMode: "attached_thin_bootstrap",
        applyBlocked: false,
        allowCandidateGeneration: false,
        reason: "thin",
      },
      evidence: [{ provider: "typed_kibi_docs", kind: "typed_markdown", label: "dir", relativePath: "docs", data: {} }],
      ignoredSources: [],
      summary: {
        activationState: "root_active_thin",
        activationMode: "attached_thin_bootstrap",
        applyBlocked: false,
        reason: "thin",
        providersRun: [],
        providerCounts: {},
        detectedLanguages: [],
        detectedTestFrameworks: [],
        excludedRoots: [],
        truncated: false,
        scanWarnings: [],
      },
      migrationWarning: null,
    });
    const statusSpy = spyOn(executors, "executeStatus").mockResolvedValue({
      content: [{ type: "text", text: "status" }],
      structuredContent: { branch: "unknown", snapshotId: "missing" },
    } as never);
    try {
      const result = await executePlanBootstrap(
        {},
        context(root, {
          branchAttachment: {
            gitBranch: "unknown",
            kbBranch: "unknown",
            storePath: path.join(root, ".kb"),
            kind: "exact",
            migrationRequired: false,
          },
          git: {
            workspaceSnapshot: async () => ({
              version: "kibi.workspace-snapshot.v2",
              hash: "not-a-hash",
              dirty: false,
              fileCount: 0,
            }),
          },
        }),
      );
      expect(result.structuredContent.diagnostics.join(" ")).toMatch(
        /Git branch|workspace snapshot|KB snapshot/,
      );
    } finally {
      statusSpy.mockRestore();
      discoverySpy.mockRestore();
    }
  });
});
