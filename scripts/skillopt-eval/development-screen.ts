import {
  type PublicTaskDescriptor,
  canonicalHash,
} from "./real-workflow-types";
import type { FrozenVariant } from "./variants";

export type ScreenSample = Readonly<{
  score: number;
  hardPass: boolean;
  criticalFailures: readonly string[];
  securityFailures?: readonly string[];
  receiptPath: string;
  usage: unknown;
}>;
export type ScreenCell = ScreenSample &
  Readonly<{
    bodyHash: string;
    taskId: string;
    family: string;
    replicate: number;
  }>;

// implements REQ-skillopt-codex-optimization
export function summarizeScreen(
  cells: readonly ScreenCell[],
  variants: readonly FrozenVariant[],
) {
  const summaries = variants.map((variant) => {
    const samples = cells.filter((cell) => cell.bodyHash === variant.bodyHash);
    const families = Object.fromEntries(
      [...new Set(samples.map((cell) => cell.family))].sort().map((family) => {
        const scoped = samples.filter((cell) => cell.family === family);
        return [
          family,
          {
            mean:
              scoped.reduce((sum, cell) => sum + cell.score, 0) / scoped.length,
            hardPasses: scoped.filter((cell) => cell.hardPass).length,
          },
        ];
      }),
    );
    return {
      bodyHash: variant.bodyHash,
      cells: samples.length,
      mean: samples.length
        ? samples.reduce((sum, cell) => sum + cell.score, 0) / samples.length
        : null,
      hardPasses: samples.filter((cell) => cell.hardPass).length,
      criticalFailures: samples.flatMap((cell) => cell.criticalFailures),
      securityFailures: samples.flatMap(
        (cell) => cell.securityFailures ?? cell.criticalFailures,
      ),
      families,
    };
  });
  const baseline = summaries[0];
  return summaries.map((summary, index) => ({
    ...summary,
    meanDelta:
      summary.mean === null || baseline?.mean == null
        ? null
        : summary.mean - baseline.mean,
    promising:
      index > 0 &&
      baseline !== undefined &&
      baseline.mean !== null &&
      summary.mean !== null &&
      summary.cells === baseline.cells &&
      summary.mean > baseline.mean &&
      summary.hardPasses >= baseline.hardPasses &&
      summary.securityFailures.length === 0 &&
      Object.entries(baseline.families).every(([family, base]) => {
        const candidate = summary.families[family];
        return (
          candidate !== undefined &&
          candidate.mean >= base.mean &&
          candidate.hardPasses >= base.hardPasses
        );
      }),
  }));
}

// implements REQ-skillopt-codex-optimization
export function validateScreenPlan(options: {
  variants: readonly FrozenVariant[];
  tasks: readonly PublicTaskDescriptor[];
  repeats: number;
  maxCells: number;
}) {
  const { variants, tasks, repeats, maxCells } = options;
  if (
    variants.length < 2 ||
    variants.length > 4 ||
    variants[0]?.variant !== "baseline" ||
    variants.slice(1).some((v) => v.variant !== "skillopt")
  )
    throw new Error("screen_variant_set_invalid");
  if (new Set(variants.map((v) => v.bodyHash)).size !== variants.length)
    throw new Error("screen_duplicate_body");
  if (
    variants.some(
      (v) =>
        v.skill !== variants[0]?.skill ||
        v.frontmatterHash !== variants[0]?.frontmatterHash ||
        v.resourcesHash !== variants[0]?.resourcesHash,
    )
  )
    throw new Error("screen_surface_mismatch");
  if (
    tasks.length !== 4 ||
    tasks.some((task) => task.split !== "development") ||
    new Set(tasks.map((task) => task.id)).size !== tasks.length
  )
    throw new Error("screen_requires_four_public_development_tasks");
  if (
    !Number.isInteger(repeats) ||
    repeats < 1 ||
    repeats > 3 ||
    !Number.isInteger(maxCells) ||
    maxCells < repeats * tasks.length * variants.length
  )
    throw new Error("screen_budget_invalid");
}

// implements REQ-skillopt-codex-optimization
export async function runDevelopmentScreen(
  options: Parameters<typeof validateScreenPlan>[0] & {
    evaluate: (
      variant: FrozenVariant,
      task: PublicTaskDescriptor,
      replicate: 1 | 2 | 3,
    ) => Promise<ScreenSample>;
    checkpoint: (state: {
      attemptedCells: number;
      cells: readonly ScreenCell[];
      status: "running" | "completed" | "failed";
      error?: string;
    }) => Promise<void>;
  },
) {
  validateScreenPlan(options);
  const { variants, tasks, repeats, maxCells } = options;
  const cells: ScreenCell[] = [];
  let attemptedCells = 0;
  try {
    for (let repeat = 1; repeat <= repeats; repeat += 1) {
      for (const [taskIndex, task] of tasks.entries()) {
        const shift = (repeat - 1 + taskIndex) % variants.length;
        const ordered = [...variants.slice(shift), ...variants.slice(0, shift)];
        for (const variant of ordered) {
          if (attemptedCells >= maxCells)
            throw new Error("screen_budget_exhausted");
          attemptedCells += 1;
          await options.checkpoint({
            attemptedCells,
            cells,
            status: "running",
          });
          const sample = await options.evaluate(
            variant,
            task,
            repeat as 1 | 2 | 3,
          );
          if (
            !Number.isFinite(sample.score) ||
            sample.score < 0 ||
            sample.score > 100 ||
            (sample.hardPass &&
              (sample.score < 85 || sample.criticalFailures.length > 0)) ||
            !sample.receiptPath
          )
            throw new Error("screen_sample_invalid");
          cells.push({
            ...sample,
            bodyHash: variant.bodyHash,
            taskId: task.id,
            family: task.family,
            replicate: repeat,
          });
          await options.checkpoint({
            attemptedCells,
            cells,
            status: "running",
          });
        }
      }
    }
    await options.checkpoint({ attemptedCells, cells, status: "completed" });
    return {
      cells,
      attemptedCells,
      summaries: summarizeScreen(cells, variants),
      evidenceHash: canonicalHash(cells),
    };
  } catch (error) {
    await options.checkpoint({
      attemptedCells,
      cells,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
