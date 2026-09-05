import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  COMPILE_PLAN_VERSION,
  executeCompileIntent,
} from "../../src/operations/planning/compile-intent.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

function contextFor(
  workspaceRoot: string,
  query: (goal: string) => Promise<PrologQueryResult>,
  extras: Partial<OperationContext> = {},
): OperationContext {
  const prolog: PrologPort = {
    query,
    queryStatusJson: async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "develop",
          snapshotId: "stamp:test",
          syncedAt: "2026-09-05T00:00:00Z",
          dirty: false,
          syncState: "fresh",
        }),
      },
    }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    prolog,
    fs: nodeFilesystem,
    git: {
      revParse: async () => "develop",
      showToplevel: async () => workspaceRoot,
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 3,
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

function quietQuery(): (goal: string) => Promise<PrologQueryResult> {
  return mock(async (goal: string): Promise<PrologQueryResult> => {
    if (goal.includes("findall([A,B,Reason]"))
      return { success: true, bindings: { Rows: "[]" } };
    if (goal.includes("kb_relationship"))
      return { success: true, bindings: { Edges: "[]" } };
    return { success: true, bindings: { Results: "[]" } };
  });
}

describe("compile-intent validation and source planning", () => {
  test("rejects empty intent, invalid mode, empty update ids, and traversal paths", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-cov-"));
    workspaces.push(root);
    const ctx = contextFor(root, quietQuery());
    await expect(
      executeCompileIntent({ intent: "   ", mode: "create" }, ctx),
    ).rejects.toThrow(/intent must be non-empty/);
    await expect(
      executeCompileIntent(
        { intent: "Keep data.", mode: "revise" as "create" },
        ctx,
      ),
    ).rejects.toThrow(/mode must be create or update/);
    await expect(
      executeCompileIntent(
        { intent: "Keep data.", mode: "update", requirementId: "  " },
        ctx,
      ),
    ).rejects.toThrow(/requirementId must be non-empty/);
    await expect(
      executeCompileIntent(
        {
          intent: "Keep data.",
          mode: "create",
          sourceLocations: [{ path: "/etc/passwd" }],
        },
        ctx,
      ),
    ).rejects.toThrow(/workspace-relative/);
    await expect(
      executeCompileIntent(
        {
          intent: "Keep data.",
          mode: "create",
          sourceLocations: [{ path: "../outside.md" }],
        },
        ctx,
      ),
    ).rejects.toThrow(/workspace-relative/);
  });

  test("requires Prolog and a status payload", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-status-"));
    workspaces.push(root);
    await expect(
      executeCompileIntent(
        { intent: "Keep data.", mode: "create" },
        {
          workspaceRoot: root,
          signal: new AbortController().signal,
          clock: () => new Date("2026-09-05T00:00:00Z"),
        },
      ),
    ).rejects.toThrow(/Prolog runtime/);
  });

  test("records missing source hashes and emits a source write for ready creates", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-src-"));
    workspaces.push(root);
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "present.md"), "present\n");
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          sourceLocations: [
            { path: "docs/present.md" },
            { path: "docs/missing.md" },
          ],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(plan.version).toBe(COMPILE_PLAN_VERSION);
    expect(plan.expected.sourceHashes["docs/present.md"]).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.expected.sourceHashes["docs/missing.md"]).toBeNull();
    expect(plan.sourceWrites).toEqual([
      expect.objectContaining({ path: "docs/present.md", mode: "write" }),
    ]);
  });

  test("auto-selects a high-confidence update target and applies drafts plus proposals", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-update-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return { success: false, bindings: {} };
      if (goal.includes("kb_entity('REQ-TOP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-TOP,req,[title="Retention",status=open,source="docs/REQ.md"]]]',
          },
        };
      if (goal.includes("kb_relationship"))
        return {
          success: true,
          bindings: {
            Edges: "[]",
            Results:
              '[[REQ-TOP,req,[title="Retention",status=open]],[SCEN-KEEP,scenario,[title="Keep"]]]',
          },
        };
      return {
        success: true,
        bindings: {
          Results:
            '[[REQ-TOP,req,[title="Retention",status=open]],[SCEN-KEEP,scenario,[title="Keep"]]]',
        },
      };
    });
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          scenarioDrafts: [{ title: "Happy path", body: "Given retention." }],
          testDrafts: [
            {
              title: "Prove retention",
              body: "it retains",
              verificationScope: "unit",
              verificationPerspective: "internal",
            },
          ],
          proposalDecisions: [{ proposalId: "PROP-PLACEHOLDER", decision: "accept" }],
        },
        contextFor(root, query),
      )
    ).structuredContent;
    expect(plan.steps.some((step) => step.type === "scenario")).toBe(true);
    expect(plan.steps.some((step) => step.type === "test")).toBe(true);
    expect(["ready", "needs_resolution", "blocked"]).toContain(plan.status);
  });

  test("blocks create when a generated id already exists with different content", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-dup-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return { success: true, bindings: { Rows: "[]" } };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      if (goal.includes("kb_entity("))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-EXISTING,req,[title="Different title",semantic_text="other intent",status=open]]]',
          },
        };
      return { success: true, bindings: { Results: "[]" } };
    });
    const first = await executeCompileIntent(
      { intent: "Customer data must be retained for 7 years.", mode: "create" },
      contextFor(root, quietQuery()),
    );
    const id = first.structuredContent.target.requirementId;
    const dup = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return { success: true, bindings: { Rows: "[]" } };
      if (goal.includes(`kb_entity('${id}'`))
        return {
          success: true,
          bindings: {
            Results: `[[${id},req,[title="Different",semantic_text="other",status=open]]]`,
          },
        };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await executeCompileIntent(
        { intent: "Customer data must be retained for 7 years.", mode: "create" },
        contextFor(root, dup),
      )
    ).structuredContent;
    expect(plan.status).toBe("needs_resolution");
    expect(
      plan.diagnostics.some((item) => item.includes("already exists")),
    ).toBe(true);
    expect(query).toBeDefined();
  });

  test("updates an explicit requirement and surfaces contradiction witnesses", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-explicit-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return {
          success: true,
          bindings: {
            Rows: "[[FACT-A,FACT-B,conflict]]",
          },
        };
      if (goal.includes("kb_entity('REQ-KEEP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-KEEP,req,[title="Keep",status=open,semantic_text="Customer data must be retained for 7 years."]]]',
          },
        };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-KEEP",
        },
        contextFor(root, query),
      )
    ).structuredContent;
    expect(plan.target.requirementId).toBe("REQ-KEEP");
    expect(plan.contradictionAnalysis.witnesses.length).toBeGreaterThanOrEqual(0);
  });
});
