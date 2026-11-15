/**
 * Measure the per-family noise floor from stored campaign evaluations of one
 * skill. Only the baseline arm is read: its runs are split into two arms and
 * each family's floor is the pass-rate gap between them. Pass the written
 * file to `campaign.ts evaluate|confirm --noise-floor FILE`.
 *
 * Usage: bun scripts/skillopt-eval/noise-floor.ts --out FILE <evaluation.json>...
 */
import { readFile, writeFile } from "node:fs/promises";
import { measureNoiseFloor } from "./scoring/family-gate";

type StoredEvaluation = Readonly<{
  skill: string;
  context: { baselineBodyHash: string };
  cells: readonly {
    runId: string;
    taskId: string;
    localRep: number;
    family: string;
    variant: string;
    hardPass: boolean;
  }[];
}>;

export async function noiseFloorFromEvaluations(paths: readonly string[]) {
  const evaluations: StoredEvaluation[] = [];
  for (const path of paths)
    evaluations.push(JSON.parse(await readFile(path, "utf8")));
  const first = evaluations[0];
  if (first === undefined) throw new Error("no evaluations given");
  for (const evaluation of evaluations) {
    if (evaluation.skill !== first.skill)
      throw new Error("evaluations mix skills");
    if (evaluation.context.baselineBodyHash !== first.context.baselineBodyHash)
      throw new Error("evaluations mix baseline bodies");
  }
  return measureNoiseFloor({
    skill: first.skill,
    baselineBodyHash: first.context.baselineBodyHash,
    baselineCells: evaluations.flatMap((evaluation) =>
      evaluation.cells.filter((cell) => cell.variant === "baseline"),
    ),
  });
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const out = outIndex === -1 ? undefined : args[outIndex + 1];
  const paths = args.filter(
    (_, index) => index !== outIndex && index !== outIndex + 1,
  );
  if (out === undefined || paths.length === 0) {
    process.stderr.write(
      "Usage: noise-floor.ts --out FILE <evaluation.json>...\n",
    );
    process.exit(2);
  }
  const { floor, underpowered } = await noiseFloorFromEvaluations(paths);
  await writeFile(out, `${JSON.stringify(floor, null, 2)}\n`, "utf8");
  for (const [family, entry] of Object.entries(floor.families))
    console.log(
      `${family}\tfloor ${(entry.noiseFloor * 100).toFixed(1)} points\t${entry.cellsPerArm} cells per arm`,
    );
  for (const family of underpowered)
    console.log(`${family}\tunderpowered: fewer than 16 cells per arm`);
}
