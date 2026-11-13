/**
 * Rescore stored campaign cells with the current scorer, without new model
 * runs. Each cell's stored transcript, broker trace, diagnostic receipt, final
 * state and workspace sources are scored again against the evaluator manifest
 * that the current fixtures build for its task. A scorer or case change is
 * checked this way before it spends paid cells.
 *
 * Usage: bun scripts/skillopt-eval/rescore-stored.ts <evaluation.json>...
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildPublicCatalog } from "./catalog";
import { buildPrivateManifest } from "./fixtures/evaluator";
import { parsePrivateEvaluatorManifest } from "./fixtures/private";
import { sealDefaultCellEvidence } from "./runtime/codex-cell-defaults";
import { deniedReadScore } from "./runtime/codex-episode";
import { normalizeCodexJsonl } from "./runtime/codex-events";
import { taskFinalStateRequests } from "./runtime/final-state-requests";
import { scoreCell } from "./scoring/cell";

type StoredCell = Readonly<{
  taskId: string;
  family: string;
  variant: string;
  localRep: number;
  score: number;
  criticalFailures: readonly string[];
  artifactDirectory: string;
}>;

export type RescoredCell = Readonly<{
  taskId: string;
  family: string;
  variant: string;
  localRep: number;
  oldScore: number;
  newScore: number;
  oldFailures: readonly string[];
  newFailures: readonly string[];
}>;

/** Failures that end a cell before its behavior can be scored again. */
const UNSCORABLE = new Set([
  "timeout",
  "missing_turn_completed",
  "empty_jsonl",
  "nonzero_exit",
  "provider_budget_exhausted",
  "missing_mcp_evidence",
  "missing_diagnostic_receipt",
  "missing_final_state",
]);

async function readOptional(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

export async function rescoreCell(cell: StoredCell): Promise<RescoredCell> {
  const base = {
    taskId: cell.taskId,
    family: cell.family,
    variant: cell.variant,
    localRep: cell.localRep,
    oldScore: cell.score,
    oldFailures: cell.criticalFailures,
  };
  if (cell.criticalFailures.some((failure) => UNSCORABLE.has(failure))) {
    return {
      ...base,
      newScore: cell.score,
      newFailures: cell.criticalFailures,
    };
  }
  const task = buildPublicCatalog().find(({ id }) => id === cell.taskId);
  if (task === undefined) throw new Error(`unknown task ${cell.taskId}`);
  const dir = cell.artifactDirectory;
  const finalState = await readOptional(join(dir, "final-state.json"));
  // The stored final state is bound to the workspace the cell ran in.
  const roots = (
    finalState === ""
      ? {}
      : (JSON.parse(finalState) as { binding?: { roots?: object } }).binding
          ?.roots
  ) as { publicManifestHash?: string; workspaceHash?: string } | undefined;
  const manifest = parsePrivateEvaluatorManifest(
    JSON.stringify(
      buildPrivateManifest({
        task: task as never,
        publicManifestHash: roots?.publicManifestHash ?? "0".repeat(64),
        workspaceHash: roots?.workspaceHash ?? "0".repeat(64),
      }),
    ),
  );
  const transcript = await readOptional(join(dir, "raw-host.jsonl"));
  const workspaceText = await readOptional(
    join(dir, "final-workspace-src.json"),
  );
  const sealed = sealDefaultCellEvidence(
    {
      evaluatorManifest: manifest,
      finalStateRequests: taskFinalStateRequests(
        cell.taskId,
        manifest.protocolContract?.exactMigrationApply !== undefined,
      ),
    },
    {
      finalState,
      brokerTrace: await readOptional(join(dir, "broker-trace.jsonl")),
      diagnosticReceipt: await readOptional(
        join(dir, "diagnostic-receipt.jsonl"),
      ),
      transcript,
      workspaceFiles:
        workspaceText === "" ? undefined : JSON.parse(workspaceText),
    },
  );
  const score = scoreCell(manifest, {
    ...sealed,
    finalState: {
      ...sealed.finalState,
      snapshot: finalState === "" ? undefined : finalState,
    },
  });
  const normalized = normalizeCodexJsonl(transcript, {
    hiddenMarkers: [],
    forbiddenRoots: [],
  });
  const newScore =
    normalized.violations.length > 0
      ? 0
      : deniedReadScore(score.score, score, normalized.deniedKbReads);
  return {
    ...base,
    newScore,
    newFailures: [...normalized.violations, ...score.criticalFailures],
  };
}

export async function rescoreEvaluation(
  path: string,
): Promise<readonly RescoredCell[]> {
  const evaluation = JSON.parse(await readFile(path, "utf8")) as {
    cells: StoredCell[];
  };
  const rescored: RescoredCell[] = [];
  for (const cell of evaluation.cells) rescored.push(await rescoreCell(cell));
  return rescored;
}

function mean(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

if (import.meta.main) {
  const cells: RescoredCell[] = [];
  for (const path of process.argv.slice(2)) {
    cells.push(...(await rescoreEvaluation(path)));
  }
  const groups = new Map<string, RescoredCell[]>();
  for (const cell of cells) {
    const key = `${cell.variant}\t${cell.family}`;
    groups.set(key, [...(groups.get(key) ?? []), cell]);
  }
  for (const [key, group] of [...groups].sort()) {
    const old = mean(group.map(({ oldScore }) => oldScore)).toFixed(2);
    const now = mean(group.map(({ newScore }) => newScore)).toFixed(2);
    console.log(`${key}\t${group.length} cells\told ${old}\tnew ${now}`);
  }
  for (const cell of cells) {
    if (cell.newScore !== cell.oldScore || cell.newScore < 100) {
      console.log(
        `${cell.newScore === cell.oldScore ? "below" : "changed"}\t${cell.taskId}\t${cell.variant}\t${cell.localRep}\t${cell.oldScore} -> ${cell.newScore}\t${cell.newFailures.join(",")}`,
      );
    }
  }
}
