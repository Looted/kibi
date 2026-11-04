import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  bootstrapEmptyKbSnapshotId,
  bootstrapPlanHash,
} from "../../../src/operations/bootstrap/types.js";
import { preflightApplyPlan } from "../../../src/operations/planning/apply-plan.js";
import { compilePlanHash } from "../../../src/operations/planning/compile-intent.js";
import * as discoveryExecutors from "../../../src/public/operations/discovery-executors.js";
import { buildMigrationPlan } from "../../../src/public/operations/migration-plan.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import { fakeProlog, scratch } from "../helpers.js";

const spies: { mockRestore: () => void }[] = [];
const workspace = scratch({ ".kb/.keep": "" });
afterAll(() => workspace.cleanup());
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const WORKSPACE = "a".repeat(64);
const context = (extra: Partial<OperationContext> = {}) =>
  ({
    workspaceRoot: workspace.root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    fs: nodeFilesystem,
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2" as const,
        hash: WORKSPACE,
        dirty: false,
        fileCount: 1,
      }),
    },
    ...extra,
  }) as OperationContext;

function bootstrapPlan() {
  const body = {
    version: "kibi.bootstrap-plan.v1" as const,
    status: "ready" as const,
    expected: {
      branch: "develop",
      kbSnapshotId: bootstrapEmptyKbSnapshotId({
        branch: "develop",
        workspaceSnapshot: WORKSPACE,
        sourceHashes: {},
      }),
      workspaceSnapshot: WORKSPACE,
      sourceHashes: {},
    },
    activation: {
      activationState: "root_active_thin" as const,
      activationMode: "attached_thin_bootstrap" as const,
      applyBlocked: false,
      reason: "thin",
    },
    declaredContext: {
      sourceOfTruthPaths: [],
      sourceOfTruthNotes: [],
      priorityRoots: [],
      verificationAnchors: [],
    },
    contextQuestions: [],
    confidence: { score: 0.9, level: "high", policy: "full_actions" },
    discoverySummary: {},
    candidates: [],
    actions: [
      {
        id: "bootstrap-upsert-0001",
        kind: "upsert" as const,
        dependsOn: [],
        payload: {
          type: "req",
          id: "REQ-preflight",
          properties: { title: "Preflight", status: "open" },
          relationships: [],
        },
      },
    ],
    sourceWrites: [],
    suppressedCandidates: [],
    payoffSummary: {},
    diagnostics: [],
  };
  return { ...body, planHash: bootstrapPlanHash(body) };
}

const preflight = (args: unknown, ctx: OperationContext = context()) =>
  preflightApplyPlan(args as never, ctx);

describe("preflightApplyPlan", () => {
  test("checks nothing for a recovery call", async () => {
    expect(await preflight({ recoveryJournalId: "j" })).toBeUndefined();
  });

  test("rejects a malformed plan or approval hash", async () => {
    await expect(preflight({ plan: "x" })).rejects.toThrow(
      "Apply plan failed: plan must be an object",
    );
    await expect(preflight({ plan: {}, approvedPlanHash: 7 })).rejects.toThrow(
      "Apply plan failed: approvedPlanHash must be the SHA-256 planHash returned with the plan",
    );
    await expect(
      preflight({ plan: {}, approvedPlanHash: "abc" }),
    ).rejects.toThrow("approvedPlanHash must be the SHA-256 planHash");
  });

  test("checks a bootstrap plan against the live snapshots", async () => {
    const plan = bootstrapPlan();
    await expect(
      preflight({ plan, approvedPlanHash: plan.planHash }),
    ).rejects.toThrow("Bootstrap apply requires a Prolog runtime");
    spies.push(
      spyOn(discoveryExecutors, "executeStatus").mockResolvedValue({
        content: [],
        structuredContent: {
          branch: "develop",
          snapshotId: "missing",
          syncedAt: null,
          dirty: false,
          syncState: "unknown",
        },
      } as never),
    );
    expect(
      await preflight(
        { plan, approvedPlanHash: plan.planHash },
        context({ prolog: fakeProlog([]) as never }),
      ),
    ).toBeUndefined();
  });

  test("checks a migration and an entity deletion plan's shape", async () => {
    const migration = buildMigrationPlan({ actions: [] });
    await expect(
      preflight({ plan: migration, approvedPlanHash: migration.planHash }),
    ).rejects.toThrow(
      "Migration apply failed: approvedActionIds must contain at least one action",
    );
    const body = {
      version: "kibi.entity-deletion-plan.v1" as const,
      entityIds: ["FACT-x"],
      sourceHashes: {},
      sourceWrites: [],
      supersessionRequired: false,
    };
    const planHash = createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex");
    expect(
      await preflight({
        plan: { ...body, planHash },
        approvedPlanHash: planHash,
      }),
    ).toBeUndefined();
  });

  test("names the generic remedy for a compile plan of another status", async () => {
    const body = {
      version: "kibi.compile-plan.v1",
      status: "stale",
      steps: [],
    };
    const planHash = compilePlanHash(body as never);
    await expect(
      preflight({ plan: { ...body, planHash }, approvedPlanHash: planHash }),
    ).rejects.toThrow(
      "Apply plan failed: only ready plans may be applied; this plan's status is 'stale'. Compile or plan again and apply the plan it returns once its status is 'ready'.",
    );
  });
});
