import { afterEach, spyOn } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  type BootstrapPlanV1,
  bootstrapPlanHash,
} from "../../../../src/operations/bootstrap/types.js";
import type { EntityDeletionPlan } from "../../../../src/operations/planning/apply-plan.js";
import {
  type CompilePlanV1,
  compilePlanHash,
} from "../../../../src/operations/planning/compile-intent.js";
import * as discoveryExecutors from "../../../../src/public/operations/discovery-executors.js";
import {
  type MigrationAction,
  type MigrationPlan,
  migrationAction,
  migrationPlanHash,
} from "../../../../src/public/operations/migration-plan.js";
import { nodeFilesystem } from "../../../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../../../src/public/operations/runtime-types.js";
import { isWhatIfGoal, whatIfResult } from "../../../helpers/what-if.js";
import { removeTempWorkspaces, tempWorkspace } from "../../workspace.js";

export const sha = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
export const HASH = "a".repeat(64);
export const NOW = new Date("2026-09-05T00:00:00Z");

const restores: (() => void)[] = [];

/** Track a spy so the shared `afterEach` restores it. */
export function track<T extends { mockRestore: () => void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

/** Register the per-test cleanup: restore spies, remove workspaces. */
export function cleanUpAfterEach(): void {
  afterEach(() => {
    for (const restore of restores.splice(0).reverse()) restore();
    removeTempWorkspaces();
  });
}

export type Harness = {
  readonly context: OperationContext;
  readonly root: string;
  /** Every Prolog goal the runtime saw, in order. */
  readonly goals: string[];
  /** Workspace files (relative, forward slashes) below `dir`. */
  files(dir?: string): string[];
  read(relative: string): string;
  exists(relative: string): boolean;
};

export type HarnessOptions = {
  files?: Record<string, string>;
  /** Answer a goal; `undefined` falls back to the default answers. */
  answer?: (goal: string) => PrologQueryResult | undefined;
  fs?: OperationContext["fs"] | null;
  prolog?: null;
  git?: OperationContext["git"] | null;
  workspaceHash?: string;
  branch?: string;
  extra?: Record<string, unknown>;
};

export function harness(options: HarnessOptions = {}): Harness {
  const root = tempWorkspace({ ".kb/.keep": "", ...options.files });
  const goals: string[] = [];
  const prolog = {
    query: async (goal: string): Promise<PrologQueryResult> => {
      goals.push(goal);
      const answered = options.answer?.(goal);
      if (answered !== undefined) return answered;
      if (isWhatIfGoal(goal)) return whatIfResult();
      if (goal.includes("kb_commit_upsert"))
        return { success: true, bindings: { ChangeKind: "created" } };
      return { success: true, bindings: { Results: "[]" } };
    },
    queryStatusJson: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  const branch = options.branch ?? "develop";
  const context = {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => NOW,
    ...(options.prolog === null ? {} : { prolog }),
    ...(options.fs === null ? {} : { fs: options.fs ?? nodeFilesystem }),
    ...(options.git === null
      ? {}
      : {
          git: options.git ?? {
            workspaceSnapshot: async () => ({
              version: "kibi.workspace-snapshot.v2",
              hash: options.workspaceHash ?? HASH,
              dirty: false,
              fileCount: 1,
            }),
          },
        }),
    branchAttachment: {
      gitBranch: branch,
      kbBranch: branch,
      storePath: path.join(root, ".kb", "branches", branch),
      kind: "exact",
      migrationRequired: false,
    },
    ...options.extra,
  } as unknown as OperationContext;
  const walk = (dir: string): string[] => {
    const absolute = path.join(root, dir);
    if (!existsSync(absolute)) return [];
    return readdirSync(absolute, { withFileTypes: true, recursive: true })
      .filter((entry) => entry.isFile())
      .map((entry) =>
        path
          .relative(root, path.join(entry.parentPath, entry.name))
          .split(path.sep)
          .join("/"),
      )
      .sort();
  };
  return {
    context,
    root,
    goals,
    files: (dir = ".") => walk(dir),
    read: (relative) => readFileSync(path.join(root, relative), "utf8"),
    exists: (relative) => existsSync(path.join(root, relative)),
  };
}

/** Stub `executeStatus` with a payload (or no payload when `null`). */
export function stubStatus(
  status: Record<string, unknown> | null = {},
): ReturnType<typeof spyOn> {
  return track(
    spyOn(discoveryExecutors, "executeStatus").mockImplementation(
      async () =>
        ({
          content: [],
          structuredContent:
            status === null
              ? undefined
              : { branch: "develop", snapshotId: HASH, ...status },
        }) as never,
    ),
  );
}

export function compilePlan(
  overrides: Partial<Omit<CompilePlanV1, "planHash">> = {},
): CompilePlanV1 {
  const body = {
    version: "kibi.compile-plan.v1",
    status: "ready",
    expected: {
      branch: "develop",
      kbSnapshotId: "missing",
      workspaceSnapshot: HASH,
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
  } as unknown as Omit<CompilePlanV1, "planHash">;
  return { ...body, planHash: compilePlanHash(body) } as CompilePlanV1;
}

export function migrationPlan(
  actions: Array<Partial<MigrationAction> & Pick<MigrationAction, "id">>,
  overrides: Partial<Omit<MigrationPlan, "planHash">> = {},
): MigrationPlan {
  const plan = {
    version: "kibi.migration-plan.v2",
    expected: {
      branch: "develop",
      kbBranch: "develop",
      kbSnapshotId: HASH,
      workspaceSnapshot: HASH,
      configHash: HASH,
    },
    scope: {},
    summary: {},
    actions: actions.map((action) =>
      migrationAction({
        code: "migration_action",
        safety: "automatic",
        autoApplicable: true,
        ...action,
      }),
    ),
    diagnostics: [],
    ...overrides,
  } as unknown as Omit<MigrationPlan, "planHash">;
  return {
    ...plan,
    planHash: migrationPlanHash({
      version: plan.version,
      expected: plan.expected,
      scope: plan.scope,
      actions: plan.actions,
      diagnostics: plan.diagnostics,
    }),
  } as MigrationPlan;
}

export function deletionPlan(
  overrides: Partial<Omit<EntityDeletionPlan, "planHash">> = {},
): EntityDeletionPlan {
  const body = {
    version: "kibi.entity-deletion-plan.v1",
    entityIds: ["REQ-gone"],
    sourceHashes: {},
    supersessionRequired: false,
    ...overrides,
  };
  return { ...body, planHash: sha(JSON.stringify(body)) } as EntityDeletionPlan;
}

export function bootstrapPlan(
  overrides: Record<string, unknown> = {},
): BootstrapPlanV1 {
  const body = {
    version: "kibi.bootstrap-plan.v1",
    status: "ready",
    expected: {
      branch: "develop",
      kbSnapshotId: HASH,
      workspaceSnapshot: HASH,
      sourceHashes: {},
    },
    activation: {
      activationState: "active",
      activationMode: "full",
      applyBlocked: false,
      reason: "test",
    },
    declaredContext: {},
    contextQuestions: [],
    confidence: {},
    discoverySummary: {},
    candidates: [],
    actions: [
      {
        id: "a1",
        kind: "upsert",
        dependsOn: [],
        payload: {
          type: "req",
          id: "REQ-boot",
          properties: { title: "Boot", status: "open" },
        },
      },
    ],
    sourceWrites: [],
    suppressedCandidates: [],
    payoffSummary: {},
    diagnostics: [],
    ...overrides,
  };
  return {
    ...body,
    planHash: bootstrapPlanHash(body),
  } as unknown as BootstrapPlanV1;
}

/** A plan whose hash fields are recomputed after `mutate` edits its body. */
export function rehash<T extends { planHash: string }>(
  plan: T,
  hash: (body: Record<string, unknown>) => string,
): T {
  return { ...plan, planHash: hash(plan as Record<string, unknown>) };
}
