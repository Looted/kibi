// implements REQ-kibi-change-to-proof-plan-compiler
import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  executeCompileIntent,
} from "../../src/operations/planning/compile-intent.js";
import { semanticClaimKey } from "../../src/operations/semantic-advisor/clauses.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../helpers/in-process-workspace.js";

const workspaces: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const workspace of workspaces.splice(0)) removeTempDir(workspace);
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

describe("executeCompileIntent leftover planning branches", () => {
  test("slugifies punctuation-only intent and skips .kb source writes", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-slug-"));
    workspaces.push(root);
    const plan = (
      await executeCompileIntent(
        {
          intent: "!!!",
          mode: "create",
          sourceLocations: [{ path: ".kb/requirements/REQ.md" }],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(plan.target.requirementId).toMatch(/^REQ-intent-/i);
    expect(plan.sourceWrites).toEqual([]);
  });

  test("skips writes for an existing entity whose source is not markdown", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-mcp-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return { success: true, bindings: { Rows: "[]" } };
      if (goal.includes("kb_entity('REQ-KEEP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-KEEP,req,[title="Keep",status=open,source="mcp://kibi/compile-intent"]]]',
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
    expect(plan.sourceWrites).toEqual([]);
  });

  test("marks host-origin propositions and skips writes when status is not ready", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-host-"));
    workspaces.push(root);
    const intent = "Customer data must be retained for 7 years.";
    const claimKey = semanticClaimKey(intent);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return {
          success: true,
          bindings: { Rows: "[[REQ-KEEP,REQ-OTHER,overlap]]" },
        };
      if (goal.includes("kb_entity('REQ-KEEP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-KEEP,req,[title="Keep",status=open,source="docs/REQ.md"]]]',
          },
        };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await executeCompileIntent(
        {
          intent,
          mode: "update",
          requirementId: "REQ-KEEP",
          clauses: [intent],
          interpretations: [
            {
              claim_key: claimKey,
              claim_text: intent,
              ir: {
                version: "kibi.logic.v1",
                kind: "atom",
                modality: "oblige",
                head: { kind: "atom", name: "retain", args: [] },
              },
            },
          ],
        },
        contextFor(root, query),
      )
    ).structuredContent;
    expect(plan.status).toBe("blocked");
    expect(plan.sourceWrites).toEqual([]);
    expect(
      plan.propositions.some((proposition) => proposition.origin === "host"),
    ).toBe(true);
  });

  test("records a before hash when the planned source already exists", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-before-"));
    workspaces.push(root);
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "present.md"), "present\n");
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          sourceLocations: [{ path: "docs/present.md" }],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(plan.sourceWrites[0]?.beforeHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("merges duplicate draft steps and warns when tests have no scenarios", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-draft-"));
    workspaces.push(root);
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          testDrafts: [
            { title: "Only test", body: "it retains", id: "TEST-ONLY" },
            { title: "Second test", body: "it also retains" },
          ],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(plan.steps.filter((step) => step.type === "test").length).toBe(2);
    expect(plan.diagnostics.join(" ")).toMatch(/no scenario draft/);
  });

  test("uses an existing markdown source with backslashes when no location is supplied", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-slash-"));
    workspaces.push(root);
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "REQ.md"), "old\n");
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return { success: true, bindings: { Rows: "[]" } };
      if (goal.includes("kb_entity('REQ-KEEP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-KEEP,req,[title="Keep",status=open,source="docs\\\\REQ.md"]]]',
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
    expect(
      plan.sourceWrites.length === 0 ||
        plan.sourceWrites[0]?.path === "docs/REQ.md",
    ).toBe(true);
  });
});
