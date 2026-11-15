/**
 * Scores one cell's sealed evidence the way a paid cell is scored: the
 * evaluator manifest the current fixtures build for the task, bound to the
 * workspace the final state was read from, then the transcript's isolation
 * violations and refused `.kb/` reads.
 */
import type { TaskSpec } from "../catalog";
import { buildPrivateManifest } from "../fixtures/evaluator";
import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import { scoreCell } from "../scoring/cell";
import { sealDefaultCellEvidence } from "./codex-cell-defaults";
import { deniedReadScore } from "./codex-episode";
import { normalizeCodexJsonl } from "./codex-events";
import { taskFinalStateRequests } from "./final-state-requests";

export type CellEvidenceText = Readonly<{
  finalState: string;
  brokerTrace: string;
  diagnosticReceipt: string;
  transcript: string;
  workspaceFiles?: Readonly<Record<string, string>>;
}>;

export type EvidenceScore = Readonly<{
  score: number;
  criticalFailures: readonly string[];
  /** Why the scorer stopped before scoring: an evidence conflict or gap. */
  terminal?: string;
}>;

export function evaluatorManifestFor(task: TaskSpec, finalState: string) {
  // The final state is bound to the workspace it was read from.
  const roots = (
    finalState === ""
      ? {}
      : (JSON.parse(finalState) as { binding?: { roots?: object } }).binding
          ?.roots
  ) as { publicManifestHash?: string; workspaceHash?: string } | undefined;
  return parsePrivateEvaluatorManifest(
    JSON.stringify(
      buildPrivateManifest({
        task: task as never,
        publicManifestHash: roots?.publicManifestHash ?? "0".repeat(64),
        workspaceHash: roots?.workspaceHash ?? "0".repeat(64),
      }),
    ),
  );
}

export function finalStateRequestsFor(
  task: TaskSpec,
  manifest = evaluatorManifestFor(task, ""),
) {
  return taskFinalStateRequests(
    task.id,
    manifest.protocolContract?.exactMigrationApply !== undefined,
  );
}

export function scoreCellEvidence(
  task: TaskSpec,
  evidence: CellEvidenceText,
): EvidenceScore {
  const manifest = evaluatorManifestFor(task, evidence.finalState);
  const sealed = sealDefaultCellEvidence(
    {
      evaluatorManifest: manifest,
      finalStateRequests: finalStateRequestsFor(task, manifest),
    },
    evidence,
  );
  const score = scoreCell(manifest, {
    ...sealed,
    finalState: {
      ...sealed.finalState,
      snapshot: evidence.finalState === "" ? undefined : evidence.finalState,
    },
  });
  const normalized = normalizeCodexJsonl(evidence.transcript, {
    hiddenMarkers: [],
    forbiddenRoots: [],
  });
  const incomplete = (
    [
      ["finalState", sealed.finalState],
      ["broker", sealed.broker],
      ["diagnostic", sealed.diagnostic],
      ["codex", sealed.codex],
    ] as const
  )
    .filter(([, source]) => !source.integrityValid || !source.complete)
    .map(([name]) => name);
  const terminal =
    score.terminalCategory === null || score.terminalCategory === undefined
      ? undefined
      : [score.terminalCategory, ...incomplete, ...score.conflictKeys].join(
          ":",
        );
  return {
    ...(terminal === undefined ? {} : { terminal }),
    score:
      normalized.violations.length > 0
        ? 0
        : deniedReadScore(score.score, score, normalized.deniedKbReads),
    criticalFailures: [...normalized.violations, ...score.criticalFailures],
  };
}
