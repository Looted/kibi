import type { ArtifactPath } from "./artifact-path";

import { randomUUID } from "node:crypto";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import { type RunState, RunStateSchema } from "./contracts/workflow";
import { RunStore } from "./orchestration-store";

export { RunStore } from "./orchestration-store";

export const BUDGET_LIMITS = {
  smoke: 2,
  development: 8,
  optimization: 48,
  "held-out": 30,
  bundle: 10,
  contingency: 2,
} as const;

const MODEL_PRICING = {
  "gpt-5.4-mini": {
    inputPerMillionTokens: 0.4,
    cachedInputPerMillionTokens: 0.1,
    outputPerMillionTokens: 1.6,
  },
  "gpt-5.6-sol": {
    inputPerMillionTokens: 5,
    cachedInputPerMillionTokens: 0.5,
    outputPerMillionTokens: 30,
  },
} as const;

// implements REQ-skillopt-codex-optimization
export function estimatePriceEquivalent(
  model: keyof typeof MODEL_PRICING,
  usage: Readonly<{
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  }>,
): number {
  if (
    !Number.isInteger(usage.inputTokens) ||
    !Number.isInteger(usage.cachedInputTokens) ||
    !Number.isInteger(usage.outputTokens) ||
    usage.inputTokens < 0 ||
    usage.cachedInputTokens < 0 ||
    usage.outputTokens < 0 ||
    usage.cachedInputTokens > usage.inputTokens ||
    usage.inputTokens > 1_000_000 ||
    usage.outputTokens > 100_000
  ) {
    throw new Error("request_tokens_exceed_cap");
  }
  const pricing = MODEL_PRICING[model];
  const uncachedInput = usage.inputTokens - usage.cachedInputTokens;
  return (
    (uncachedInput * pricing.inputPerMillionTokens +
      usage.cachedInputTokens * pricing.cachedInputPerMillionTokens +
      usage.outputTokens * pricing.outputPerMillionTokens) /
    1_000_000
  );
}

type BudgetBucket = keyof typeof BUDGET_LIMITS;
type BucketSnapshot = { limit: number; reserved: number; spent: number };

// implements REQ-skillopt-codex-optimization
export class BudgetLedger {
  private readonly buckets: Record<BudgetBucket, BucketSnapshot>;
  private readonly reservations = new Map<
    string,
    { bucket: BudgetBucket; amount: number }
  >();

  constructor(overrides: Partial<Record<BudgetBucket, number>> = {}) {
    this.buckets = Object.fromEntries(
      Object.entries(BUDGET_LIMITS).map(([bucket, limit]) => [
        bucket,
        {
          limit: overrides[bucket as BudgetBucket] ?? limit,
          reserved: 0,
          spent: 0,
        },
      ]),
    ) as Record<BudgetBucket, BucketSnapshot>;
  }

  reserve(
    bucket: BudgetBucket,
    amount: number,
  ): { id: string; status: "reserved" } {
    if (!Number.isFinite(amount) || amount <= 0)
      throw new Error("invalid_reservation");
    const snapshot = this.buckets[bucket];
    if (snapshot.reserved + snapshot.spent + amount > snapshot.limit) {
      throw new Error("budget_exhausted");
    }
    const id = randomUUID();
    snapshot.reserved += amount;
    this.reservations.set(id, { bucket, amount });
    return { id, status: "reserved" };
  }

  finalize(
    id: string,
    actualAmount: number | undefined,
  ): { id: string; status: "finalized" | "retained" } {
    const reservation = this.reservations.get(id);
    if (reservation === undefined) throw new Error("reservation_missing");
    if (actualAmount === undefined) return { id, status: "retained" };
    if (
      !Number.isFinite(actualAmount) ||
      actualAmount < 0 ||
      actualAmount > reservation.amount
    ) {
      throw new Error("invalid_final_debit");
    }
    const snapshot = this.buckets[reservation.bucket];
    snapshot.reserved -= reservation.amount;
    snapshot.spent += actualAmount;
    this.reservations.delete(id);
    return { id, status: "finalized" };
  }

  snapshot(): Record<BudgetBucket, BucketSnapshot> {
    return structuredClone(this.buckets);
  }
}

const SKILL_EPISODES: Record<CanonicalSkill, string> = {
  "kibi-usage": "00000000-0000-4000-8000-000000000101",
  "kibi-freshness": "00000000-0000-4000-8000-000000000102",
  "kibi-traceability": "00000000-0000-4000-8000-000000000103",
  "init-kibi": "00000000-0000-4000-8000-000000000104",
};
const BUNDLE_EPISODE = "00000000-0000-4000-8000-000000000105";

export type OfflineWorkflowResult = Readonly<{
  phase: RunState["phase"];
  completedSkills: readonly CanonicalSkill[];
  bundle: boolean;
}>;

// implements REQ-skillopt-codex-optimization
export async function runOfflineWorkflow(
  input: Readonly<{
    root: string;
    runId: string;
    runLockHash: string;
    failSkill?: CanonicalSkill;
    artifactPath?: ArtifactPath;
  }>,
): Promise<OfflineWorkflowResult> {
  const store = new RunStore(input.root, input.runId, input.artifactPath);
  await store.acquire();
  try {
    const existing = await store.readState();
    if (existing !== undefined && existing.runLockHash !== input.runLockHash) {
      throw new Error("run_lock_mismatch");
    }
    if (existing?.phase === "no-go" || existing?.phase === "complete") {
      return summarize(existing);
    }
    let state =
      existing ??
      RunStateSchema.parse({
        schemaVersion: "1.0.0",
        artifactType: "run-state",
        runId: input.runId,
        runLockHash: input.runLockHash,
        phase: "preflight",
        completedEpisodeIds: [],
        ledgerHeadHash: null,
        updatedAt: new Date().toISOString(),
        interrupted: false,
      });
    const budget = new BudgetLedger();
    for (const skill of CANONICAL_SKILLS) {
      const episodeId = SKILL_EPISODES[skill];
      if (state.completedEpisodeIds.includes(episodeId)) continue;
      const reservation = budget.reserve("development", 2);
      const ledgerHeadHash = await store.appendLedger({
        category: "development",
        episodeId,
        amount: 2,
      });
      if (input.failSkill === skill) {
        budget.finalize(reservation.id, 2);
        state = RunStateSchema.parse({
          ...state,
          phase: "no-go",
          ledgerHeadHash,
          updatedAt: new Date().toISOString(),
        });
        await store.writeState(state);
        return summarize(state);
      }
      budget.finalize(reservation.id, 0);
      state = RunStateSchema.parse({
        ...state,
        phase: "development",
        completedEpisodeIds: [...state.completedEpisodeIds, episodeId],
        ledgerHeadHash,
        updatedAt: new Date().toISOString(),
      });
      await store.writeState(state);
    }
    if (!state.completedEpisodeIds.includes(BUNDLE_EPISODE)) {
      const reservation = budget.reserve("bundle", 2);
      const ledgerHeadHash = await store.appendLedger({
        category: "bundle",
        episodeId: BUNDLE_EPISODE,
        amount: 2,
      });
      budget.finalize(reservation.id, 0);
      state = RunStateSchema.parse({
        ...state,
        phase: "complete",
        completedEpisodeIds: [...state.completedEpisodeIds, BUNDLE_EPISODE],
        ledgerHeadHash,
        updatedAt: new Date().toISOString(),
      });
      await store.writeState(state);
    }
    return summarize(state);
  } finally {
    await store.release();
  }
}

function summarize(state: RunState): OfflineWorkflowResult {
  return {
    phase: state.phase,
    completedSkills: CANONICAL_SKILLS.filter((skill) =>
      state.completedEpisodeIds.includes(SKILL_EPISODES[skill]),
    ),
    bundle: state.completedEpisodeIds.includes(BUNDLE_EPISODE),
  };
}
