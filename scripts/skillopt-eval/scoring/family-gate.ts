/**
 * Per-family no-regression gate on pooled pass rates.
 *
 * A family is judged only when each arm holds at least
 * {@link MIN_FAMILY_CELLS} cells, pooled across runs. It regresses when the
 * candidate's pass rate falls below the baseline's by more than the family's
 * noise floor: the pass-rate gap seen between two baseline arms with the same
 * skill text. A family with fewer cells is underpowered: it is reported and
 * not judged, because a single cell's swing there is noise.
 */
import { z } from "zod";

export const MIN_FAMILY_CELLS = 16;

export type FamilyCounts = Readonly<{ hardPasses: number; cells: number }>;

export type FamilyVerdict = "held" | "regressed" | "underpowered";

export type FamilyJudgement = Readonly<{
  family: string;
  verdict: FamilyVerdict;
  baselineRate: number;
  candidateRate: number;
  noiseFloor: number;
}>;

export const NoiseFloorSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-noise-floor"),
    skill: z.string().min(1),
    baselineBodyHash: z.string().regex(/^[a-f0-9]{64}$/),
    families: z.record(
      z.string().min(1),
      z
        .object({
          noiseFloor: z.number().min(0).max(1),
          cellsPerArm: z.number().int().min(MIN_FAMILY_CELLS),
        })
        .strict(),
    ),
  })
  .strict();

export type NoiseFloor = z.infer<typeof NoiseFloorSchema>;

export function passRate(counts: FamilyCounts): number {
  return counts.cells === 0 ? 0 : counts.hardPasses / counts.cells;
}

/**
 * Judges one family. The floor defaults to 0 when no baseline-against-
 * baseline run measured it, so any drop in pass rate regresses.
 */
export function judgeFamily(
  family: string,
  baseline: FamilyCounts | undefined,
  candidate: FamilyCounts | undefined,
  noiseFloor = 0,
): FamilyJudgement {
  const baselineRate = baseline === undefined ? 0 : passRate(baseline);
  const candidateRate = candidate === undefined ? 0 : passRate(candidate);
  const powered =
    baseline !== undefined &&
    candidate !== undefined &&
    baseline.cells >= MIN_FAMILY_CELLS &&
    candidate.cells >= MIN_FAMILY_CELLS;
  const verdict: FamilyVerdict = !powered
    ? "underpowered"
    : baselineRate - candidateRate > noiseFloor
      ? "regressed"
      : "held";
  return { family, verdict, baselineRate, candidateRate, noiseFloor };
}

type GateCell = Readonly<{
  family: string;
  hardPass: boolean;
  runId: string;
  taskId: string;
  localRep: number;
}>;

function countByFamily(
  cells: readonly GateCell[],
): Map<string, { hardPasses: number; cells: number }> {
  const counts = new Map<string, { hardPasses: number; cells: number }>();
  for (const cell of cells) {
    const current = counts.get(cell.family) ?? { hardPasses: 0, cells: 0 };
    current.cells += 1;
    if (cell.hardPass) current.hardPasses += 1;
    counts.set(cell.family, current);
  }
  return counts;
}

/** Drops cells repeated across pooled evaluations (a confirm carries its prior runs). */
export function uniqueCells<T extends GateCell>(cells: readonly T[]): T[] {
  const seen = new Set<string>();
  return cells.filter((cell) => {
    const key = `${cell.runId}\0${cell.taskId}\0${cell.localRep}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Measures the noise floor from baseline cells alone: the runs are split
 * into two arms by alternating run id, and each family's floor is the gap
 * between the two arms' pass rates. Families with fewer than
 * {@link MIN_FAMILY_CELLS} cells in either arm are left out.
 */
export function measureNoiseFloor(
  input: Readonly<{
    skill: string;
    baselineBodyHash: string;
    baselineCells: readonly GateCell[];
  }>,
): Readonly<{ floor: NoiseFloor; underpowered: readonly string[] }> {
  const cells = uniqueCells(input.baselineCells);
  const runs = [...new Set(cells.map((cell) => cell.runId))].sort();
  const armOf = new Map(runs.map((run, index) => [run, index % 2]));
  const left = countByFamily(
    cells.filter((cell) => armOf.get(cell.runId) === 0),
  );
  const right = countByFamily(
    cells.filter((cell) => armOf.get(cell.runId) === 1),
  );
  const families: NoiseFloor["families"] = {};
  const underpowered: string[] = [];
  for (const family of [...new Set(cells.map((cell) => cell.family))].sort()) {
    const a = left.get(family);
    const b = right.get(family);
    if (
      a === undefined ||
      b === undefined ||
      a.cells < MIN_FAMILY_CELLS ||
      b.cells < MIN_FAMILY_CELLS
    ) {
      underpowered.push(family);
      continue;
    }
    families[family] = {
      noiseFloor: Math.abs(passRate(a) - passRate(b)),
      cellsPerArm: Math.min(a.cells, b.cells),
    };
  }
  return {
    floor: NoiseFloorSchema.parse({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-noise-floor",
      skill: input.skill,
      baselineBodyHash: input.baselineBodyHash,
      families,
    }),
    underpowered,
  };
}
