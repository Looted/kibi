import { createHash } from "node:crypto";
import { z } from "zod";
import {
  CONTRACT_SCHEMA_VERSION,
  JsonValueSchema,
  Sha256Schema,
  contractHash,
} from "../contracts/common";
import {
  type EpisodeRequest,
  EpisodeRequestSchema,
  type EpisodeResult,
  EpisodeResultSchema,
} from "../contracts/episode";
import { type EvidenceIndex, EvidenceIndexSchema } from "../contracts/evidence";
import type { CellReceipt } from "../scoring/cell";
import {
  CODEX_VIOLATIONS,
  deterministicVariantLabel,
  normalizeCodexJsonl,
} from "./codex-events";

const ArtifactRefSchema = z
  .object({ path: z.string().min(1), sha256: Sha256Schema })
  .strict();

// implements REQ-skillopt-codex-optimization
export const CodexEpisodeReceiptSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    artifactType: z.literal("codex-episode-receipt"),
    variantLabel: z.string().regex(/^variant-[a-f0-9]{16}$/),
    result: EpisodeResultSchema,
    evidenceIndex: EvidenceIndexSchema,
    artifacts: z
      .object({
        rawTranscript: ArtifactRefSchema,
        rawStderr: ArtifactRefSchema,
        normalizedEvents: ArtifactRefSchema,
        brokerTrace: ArtifactRefSchema,
        diagnosticReceipt: ArtifactRefSchema,
        finalState: ArtifactRefSchema,
        evidenceIndex: ArtifactRefSchema,
      })
      .strict(),
    violations: z.array(z.enum(CODEX_VIOLATIONS)),
    malformedLines: z.array(z.number().int().positive()),
  })
  .strict();

export type CodexEpisodeReceipt = Readonly<
  z.infer<typeof CodexEpisodeReceiptSchema>
>;

export type EpisodeReplayInput = Readonly<{
  request: EpisodeRequest;
  transcript: string;
  stderr: string;
  exitCode: number | null;
  termination: "exit" | "timeout" | "interrupted";
  startedAt: string;
  finishedAt: string;
  evidence: Readonly<{
    brokerTrace: string;
    diagnosticReceipt: string;
    finalState: string;
  }>;
  score: CellReceipt;
  hiddenMarkers: readonly string[];
  forbiddenRoots: readonly string[];
  pricingHash: string;
  priceAmount: number;
  infrastructureFailure?: string;
}>;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function artifactRef(path: string, content: string) {
  return { path, sha256: sha256(content) } as const;
}

function evidencePresent(value: string): boolean {
  return value.trim().length > 0;
}

function scoreStatus(score: CellReceipt): EpisodeResult["status"] {
  switch (score.terminalCategory) {
    case null:
      return score.hard === 1 ? "completed" : "behavioral-failure";
    case "behavioral_failure":
    case "critical_security_failure":
      return "behavioral-failure";
    case "pre_action_infrastructure_failure":
    case "incomplete_evidence":
      return "infrastructure-failure";
    case "budget_stop":
      return "budget-exhausted";
    case "evidence_conflict":
      return "evidence-conflict";
    default:
      return score.terminalCategory satisfies never;
  }
}

function terminalState(
  input: EpisodeReplayInput,
  normalized: ReturnType<typeof normalizeCodexJsonl>,
): Readonly<{
  status: EpisodeResult["status"];
  failures: readonly string[];
}> {
  const failures = new Set<string>(normalized.violations);
  if (!evidencePresent(input.evidence.brokerTrace)) {
    failures.add("missing_mcp_evidence");
  }
  if (!evidencePresent(input.evidence.diagnosticReceipt)) {
    failures.add("missing_diagnostic_receipt");
  }
  if (!evidencePresent(input.evidence.finalState)) {
    failures.add("missing_final_state");
  }
  if (normalized.empty) failures.add("empty_jsonl");
  if (!normalized.events.some(({ type }) => type === "turn.completed")) {
    failures.add("missing_turn_completed");
  }
  if (input.termination === "timeout") failures.add("timeout");
  if (input.exitCode !== 0 && input.termination === "exit") {
    failures.add("nonzero_exit");
  }
  for (const failure of input.score.criticalFailures) failures.add(failure);
  if (input.infrastructureFailure !== undefined) {
    failures.add(input.infrastructureFailure);
  }

  if (input.termination === "interrupted") {
    return { status: "interrupted", failures: [...failures] };
  }
  if (
    !evidencePresent(input.evidence.brokerTrace) ||
    !evidencePresent(input.evidence.diagnosticReceipt) ||
    !evidencePresent(input.evidence.finalState)
  ) {
    return { status: "infrastructure-failure", failures: [...failures] };
  }
  if (input.infrastructureFailure !== undefined) {
    return { status: "infrastructure-failure", failures: [...failures] };
  }
  if (
    input.termination === "timeout" ||
    input.exitCode !== 0 ||
    normalized.empty ||
    !normalized.events.some(({ type }) => type === "turn.completed") ||
    normalized.violations.length > 0
  ) {
    return { status: "behavioral-failure", failures: [...failures] };
  }
  return { status: scoreStatus(input.score), failures: [...failures] };
}

// implements REQ-skillopt-codex-optimization
export function replayCodexEpisode(
  rawInput: EpisodeReplayInput,
): CodexEpisodeReceipt {
  const input = {
    ...rawInput,
    request: EpisodeRequestSchema.parse(rawInput.request),
  };
  const normalized = normalizeCodexJsonl(input.transcript, {
    hiddenMarkers: input.hiddenMarkers,
    forbiddenRoots: input.forbiddenRoots,
  });
  const brokerTraceHash = sha256(input.evidence.brokerTrace);
  const diagnosticReceiptHash = sha256(input.evidence.diagnosticReceipt);
  const finalStateHash = sha256(input.evidence.finalState);
  const evidenceIndex: EvidenceIndex = EvidenceIndexSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    artifactType: "evidence-index",
    runId: input.request.runId,
    episodeId: input.request.episodeId,
    runLockHash: input.request.runLockHash,
    events: normalized.events.map((event) => ({
      sequence: event.sequence,
      receivedAt: input.startedAt,
      event: JsonValueSchema.parse({
        type: event.type,
        payload: event.payload,
      }),
    })),
    brokerTraceHash,
    diagnosticReceiptHash,
    finalStateHash,
    truncated: false,
  });
  const evidenceIndexJson = `${JSON.stringify(evidenceIndex)}\n`;
  const normalizedJsonl = normalized.events
    .map((event) => JSON.stringify(event))
    .join("\n");
  const terminal = terminalState(input, normalized);
  const completed = terminal.status === "completed";
  const behavioralScore =
    terminal.status === "behavioral-failure" &&
    input.score.terminalCategory === "behavioral_failure" &&
    input.termination === "exit" &&
    input.exitCode === 0 &&
    normalized.violations.length === 0
      ? input.score.score
      : 0;
  const result = EpisodeResultSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    artifactType: "episode-result",
    episodeId: input.request.episodeId,
    runId: input.request.runId,
    runLockHash: input.request.runLockHash,
    status: terminal.status,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    exitCode: input.exitCode,
    // Behavioral misses retain the evaluator's 60/25/15 partial score so the
    // optimizer receives a useful gradient. Transport, evidence, timeout, and
    // security failures remain zero because they are not behavioral evidence.
    score: completed ? input.score.score : behavioralScore,
    hardPass: completed && input.score.hard === 1,
    criticalFailures: terminal.failures,
    evidenceIndexHash: contractHash(JsonValueSchema.parse(evidenceIndex)),
    reconciliation: {
      brokerTrace: evidencePresent(input.evidence.brokerTrace),
      diagnosticReceipt: evidencePresent(input.evidence.diagnosticReceipt),
      finalStateQuery: evidencePresent(input.evidence.finalState),
    },
    usage: normalized.usage,
    priceEquivalentEstimate: {
      currency: "USD",
      amount: input.priceAmount,
      pricingHash: Sha256Schema.parse(input.pricingHash),
      kind: "price-equivalent-estimate-not-invoice",
    },
  });
  return CodexEpisodeReceiptSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    artifactType: "codex-episode-receipt",
    variantLabel: deterministicVariantLabel(
      input.request.runLockHash,
      input.request.episodeId,
      input.request.variant,
    ),
    result,
    evidenceIndex,
    artifacts: {
      rawTranscript: artifactRef("raw-host.jsonl", input.transcript),
      rawStderr: artifactRef("raw-stderr.log", input.stderr),
      normalizedEvents: artifactRef("normalized-events.jsonl", normalizedJsonl),
      brokerTrace: artifactRef(
        "broker-trace.jsonl",
        input.evidence.brokerTrace,
      ),
      diagnosticReceipt: artifactRef(
        "diagnostic-receipt.jsonl",
        input.evidence.diagnosticReceipt,
      ),
      finalState: artifactRef("final-state.json", input.evidence.finalState),
      evidenceIndex: artifactRef("evidence-index.json", evidenceIndexJson),
    },
    violations: normalized.violations,
    malformedLines: normalized.malformedLines,
  });
}
