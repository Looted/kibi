import { afterEach } from "bun:test";
import { createHash } from "node:crypto";
import path from "node:path";
import { executeApplyPlan } from "../../../src/operations/planning/apply-plan.js";
import {
  type CompilePlanV1,
  compilePlanHash,
} from "../../../src/operations/planning/compile-intent.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import { isWhatIfGoal, whatIfResult } from "../../helpers/what-if.js";
import { scratch } from "../helpers.js";

export const sha = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
/** Restore every spy and remove every workspace after each test. */
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

export function compilePlan(
  overrides: Partial<CompilePlanV1> = {},
): CompilePlanV1 {
  const body = {
    version: "kibi.compile-plan.v1",
    status: "ready",
    expected: {
      branch: "develop",
      kbSnapshotId: "missing",
      workspaceSnapshot: "a".repeat(64),
      sourceHashes: {},
    },
    target: {
      mode: "create",
      requirementId: "REQ-apply",
      selectionReason: "test",
    },
    discovery: { candidates: [], abstained: true },
    propositions: [],
    contradictionAnalysis: { outcome: "no_conflict", witnesses: [] },
    proposals: [],
    steps: [
      {
        type: "req",
        id: "REQ-apply",
        properties: { title: "Apply", status: "open" },
        relationships: [],
      },
    ],
    sourceWrites: [],
    diagnostics: [],
    ...overrides,
  } as Omit<CompilePlanV1, "planHash">;
  return { ...body, planHash: compilePlanHash(body) } as CompilePlanV1;
}

export function ctx(
  options: {
    fs?: OperationContext["fs"] | null;
    answer?: (goal: string) => PrologQueryResult | undefined;
  } = {},
): OperationContext {
  const workspace = scratch({ ".kb/.keep": "" });
  cleanups.push(workspace.cleanup);
  const commits: string[] = [];
  return {
    workspaceRoot: workspace.root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    prolog: {
      commits,
      query: async (goal: string): Promise<PrologQueryResult> => {
        const answered = options.answer?.(goal);
        if (answered !== undefined) return answered;
        if (isWhatIfGoal(goal)) return whatIfResult();
        if (goal.includes("kb_commit_upsert")) {
          commits.push(goal);
          return { success: true, bindings: { ChangeKind: "created" } };
        }
        return { success: true, bindings: { Results: "[]" } };
      },
      queryStatusJson: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    ...(options.fs === null ? {} : { fs: options.fs ?? nodeFilesystem }),
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
      storePath: path.join(workspace.root, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
  } as unknown as OperationContext;
}

export const apply = (plan: CompilePlanV1, context: OperationContext) =>
  executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, context);
