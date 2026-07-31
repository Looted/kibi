import path from "node:path";
import { contractHash } from "../contracts/common";
import { EpisodeRequestSchema } from "../contracts/episode";
import { PREDICATE_HELD_OUT_CASE_IDS } from "../fixtures/predicate-cases";
import {
  materializePredicateCorpus,
  reservePredicateMatrix,
} from "../fixtures/predicate-corpus";
import { CodexEpisodeReceiptSchema } from "../runtime/codex-episode";
import { temporaryRoot } from "./fixture-test-helpers";

export const RUN_ID = "00000000-0000-4000-8000-000000000001";
export const VARIANTS = ["baseline", "one-shot", "skillopt"] as const;

export function request(input: {
  readonly episode: number;
  readonly taskId: string;
  readonly variant: (typeof VARIANTS)[number];
  readonly hashes: Readonly<Record<(typeof VARIANTS)[number], string>>;
  readonly replicate?: 1 | 2 | 3;
}) {
  return EpisodeRequestSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "episode-request",
    episodeId: `00000000-0000-4000-8000-${String(input.episode).padStart(12, "0")}`,
    runId: RUN_ID,
    runLockHash: input.hashes[input.variant],
    variant: input.variant,
    skill: "kibi-usage",
    taskId: input.taskId,
    attempt: 1,
    ...(input.replicate === undefined ? {} : { replicate: input.replicate }),
    prompt: "Use only sealed evidence.",
    workspaceFixtureHash: "d".repeat(64),
  });
}

export function receipt(input: ReturnType<typeof request>, passing: boolean) {
  const evidenceIndex = {
    schemaVersion: "1.0.0",
    artifactType: "evidence-index",
    runId: input.runId,
    episodeId: input.episodeId,
    runLockHash: input.runLockHash,
    events: [],
    brokerTraceHash: "e".repeat(64),
    diagnosticReceiptHash: "f".repeat(64),
    finalStateHash: "1".repeat(64),
    truncated: false,
  };
  const artifact = (name: string) => ({ path: name, sha256: "2".repeat(64) });
  return CodexEpisodeReceiptSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "codex-episode-receipt",
    variantLabel: `variant-${"3".repeat(16)}`,
    result: {
      schemaVersion: "1.0.0",
      artifactType: "episode-result",
      episodeId: input.episodeId,
      runId: input.runId,
      runLockHash: input.runLockHash,
      status: passing ? "completed" : "behavioral-failure",
      startedAt: "2026-07-21T12:00:00Z",
      finishedAt: "2026-07-21T12:00:01Z",
      exitCode: 0,
      score: passing ? 95 : 80,
      hardPass: passing,
      criticalFailures: [],
      evidenceIndexHash: contractHash(evidenceIndex),
      reconciliation: {
        brokerTrace: true,
        diagnosticReceipt: true,
        finalStateQuery: true,
      },
      usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 },
      priceEquivalentEstimate: {
        currency: "USD",
        amount: 0,
        pricingHash: "4".repeat(64),
        kind: "price-equivalent-estimate-not-invoice",
      },
    },
    evidenceIndex,
    artifacts: {
      rawTranscript: artifact("raw-host.jsonl"),
      rawStderr: artifact("raw-stderr.log"),
      normalizedEvents: artifact("normalized-events.jsonl"),
      brokerTrace: artifact("broker-trace.jsonl"),
      diagnosticReceipt: artifact("diagnostic-receipt.jsonl"),
      finalState: artifact("final-state.json"),
      evidenceIndex: artifact("evidence-index.json"),
    },
    violations: [],
    malformedLines: [],
  });
}

export function evaluation() {
  const root = temporaryRoot();
  const corpus = materializePredicateCorpus({
    artifactRoot: path.join(root, "predicate-corpus"),
  });
  const hashes = {
    baseline: corpus.frozenCandidateHashes.baseline,
    "one-shot": corpus.frozenCandidateHashes.oneShot,
    skillopt: corpus.frozenCandidateHashes.skillopt,
  } as const;
  const reservation = reservePredicateMatrix({
    corpus,
    candidateHashes: corpus.frozenCandidateHashes,
    runId: "00000000-0000-4000-8000-000000000096",
    fixtureClaimRoot: corpus.roots.corpus,
  });
  let episode = 1;
  const next = (
    taskId: string,
    variant: (typeof VARIANTS)[number],
    replicate?: 1 | 2 | 3,
  ) => {
    const value = request({
      episode,
      taskId,
      variant,
      hashes,
      ...(replicate === undefined ? {} : { replicate }),
    });
    episode += 1;
    return value;
  };
  const predicateCells = PREDICATE_HELD_OUT_CASE_IDS.flatMap((taskId) =>
    VARIANTS.flatMap((variant) =>
      ([1, 2, 3] as const).map((replicate) => {
        const episodeRequest = next(taskId, variant, replicate);
        return {
          kind: "predicate" as const,
          taskId,
          family: "fact-predicate-modeling",
          request: episodeRequest,
          receipt: receipt(episodeRequest, true),
          predicateEvidence: { outcome: "pass" as const, caseId: taskId },
        };
      }),
    ),
  );
  const skillCells = Array.from({ length: 12 }, (_, index) =>
    VARIANTS.map((variant) => {
      const taskId = `skill-held-out-${String(index + 1).padStart(2, "0")}`;
      const episodeRequest = next(taskId, variant);
      return {
        kind: "skill" as const,
        taskId,
        family: "other-held-out-family",
        request: episodeRequest,
        receipt: receipt(episodeRequest, variant === "skillopt"),
      };
    }),
  ).flat();
  const bundleCells = Array.from({ length: 8 }, (_, index) =>
    VARIANTS.map((variant) => {
      const taskId = `bundle-held-out-${String(index + 1).padStart(2, "0")}`;
      const episodeRequest = next(taskId, variant);
      return {
        kind: "bundle" as const,
        taskId,
        family: "bundle-workflow",
        request: episodeRequest,
        receipt: receipt(episodeRequest, variant === "skillopt"),
      };
    }),
  ).flat();
  return {
    root,
    reservation,
    physicalCells: [...predicateCells, ...skillCells, ...bundleCells],
  };
}
