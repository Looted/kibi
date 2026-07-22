import type { GateCell } from "./gates";

export const BOOTSTRAP_RESAMPLES = 10_000;
export const BOOTSTRAP_SEED = 5417;

export type CellSummary = Readonly<{
  count: number;
  mean: number;
  hardPasses: number;
  criticalFailures: number;
}>;

function sortedPairedDeltas(
  candidate: readonly GateCell[],
  comparator: readonly GateCell[],
): readonly number[] | null {
  const comparatorByTask = new Map(
    comparator.map((cell) => [cell.taskId, cell]),
  );
  if (
    candidate.length !== comparator.length ||
    new Set(candidate.map((cell) => cell.taskId)).size !== candidate.length ||
    comparatorByTask.size !== comparator.length
  ) {
    return null;
  }
  const deltas: number[] = [];
  for (const cell of [...candidate].sort((left, right) =>
    left.taskId.localeCompare(right.taskId),
  )) {
    const paired = comparatorByTask.get(cell.taskId);
    if (paired === undefined || paired.family !== cell.family) return null;
    deltas.push(cell.score - paired.score);
  }
  return deltas;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function summarizeCells(cells: readonly GateCell[]): CellSummary {
  const scoreTotal = cells.reduce((total, cell) => total + cell.score, 0);
  return {
    count: cells.length,
    mean: cells.length === 0 ? 0 : scoreTotal / cells.length,
    hardPasses: cells.reduce((total, cell) => total + cell.hard, 0),
    criticalFailures: cells.reduce(
      (total, cell) => total + cell.criticalFailureCount,
      0,
    ),
  };
}

export function pairedBootstrapLowerBound(
  candidate: readonly GateCell[],
  comparator: readonly GateCell[],
): number | null {
  const deltas = sortedPairedDeltas(candidate, comparator);
  if (deltas === null || deltas.length === 0) return null;
  const random = seededRandom(BOOTSTRAP_SEED);
  const means: number[] = [];
  for (let sample = 0; sample < BOOTSTRAP_RESAMPLES; sample += 1) {
    let total = 0;
    for (let draw = 0; draw < deltas.length; draw += 1) {
      const index = Math.floor(random() * deltas.length);
      total += deltas[index] ?? 0;
    }
    means.push(total / deltas.length);
  }
  means.sort((left, right) => left - right);
  return means[Math.floor(BOOTSTRAP_RESAMPLES * 0.05)] ?? null;
}
