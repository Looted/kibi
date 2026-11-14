import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { noiseFloorFromEvaluations } from "../noise-floor";
import {
  MIN_FAMILY_CELLS,
  judgeFamily,
  measureNoiseFloor,
  uniqueCells,
} from "../scoring/family-gate";

const HASH = "a".repeat(64);

function cells(
  family: string,
  runId: string,
  passes: number,
  total: number,
  variant = "baseline",
) {
  return Array.from({ length: total }, (_, index) => ({
    runId,
    taskId: `${family}-task`,
    localRep: index + 1,
    family,
    variant,
    hardPass: index < passes,
  }));
}

describe("pooled family gate", () => {
  test("a family with fewer than 16 cells in either arm is not judged", () => {
    expect(
      judgeFamily(
        "intent-consult",
        { hardPasses: 2, cells: 2 },
        { hardPasses: 0, cells: 2 },
      ).verdict,
    ).toBe("underpowered");
    expect(
      judgeFamily(
        "intent-consult",
        { hardPasses: 16, cells: 16 },
        { hardPasses: 0, cells: MIN_FAMILY_CELLS - 1 },
      ).verdict,
    ).toBe("underpowered");
  });

  test("a powered family regresses only when the drop exceeds its noise floor", () => {
    const baseline = { hardPasses: 14, cells: 16 };
    const twoFewer = { hardPasses: 12, cells: 16 };
    expect(judgeFamily("split", baseline, twoFewer, 0.125).verdict).toBe(
      "held",
    );
    expect(judgeFamily("split", baseline, twoFewer, 0.1).verdict).toBe(
      "regressed",
    );
    // Without a measured floor any drop regresses.
    expect(
      judgeFamily("split", baseline, { hardPasses: 13, cells: 16 }).verdict,
    ).toBe("regressed");
    expect(
      judgeFamily("split", baseline, { hardPasses: 16, cells: 16 }).verdict,
    ).toBe("held");
  });

  test("pooled cells repeated by a confirm count once", () => {
    const run = cells("split", "run-1", 1, 2);
    expect(uniqueCells([...run, ...run])).toHaveLength(2);
  });

  test("the noise floor is the pass-rate gap between two baseline arms", () => {
    const baselineCells = [
      ...cells("split", "run-1", 7, 8),
      ...cells("split", "run-2", 6, 8),
      ...cells("split", "run-3", 7, 8),
      ...cells("split", "run-4", 6, 8),
      ...cells("small", "run-1", 1, 2),
    ];
    const { floor, underpowered } = measureNoiseFloor({
      skill: "kibi-usage",
      baselineBodyHash: HASH,
      baselineCells,
    });
    // Runs 1 and 3 pass 14 of 16; runs 2 and 4 pass 12 of 16.
    expect(floor.families.split).toEqual({
      noiseFloor: 0.125,
      cellsPerArm: 16,
    });
    expect(underpowered).toEqual(["small"]);
  });

  test("stored evaluations give a floor that a candidate is then judged against", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-floor-"));
    try {
      const paths: string[] = [];
      for (const [index, passes] of [7, 6, 7, 6].entries()) {
        const path = join(root, `evaluation-${index}.json`);
        await writeFile(
          path,
          JSON.stringify({
            skill: "kibi-usage",
            context: { baselineBodyHash: HASH },
            cells: [
              ...cells("split", `run-${index}`, passes, 8),
              ...cells("split", `run-${index}`, 2, 8, "candidate-1"),
            ],
          }),
        );
        paths.push(path);
      }
      const { floor } = await noiseFloorFromEvaluations(paths);
      const noiseFloor = floor.families.split?.noiseFloor;
      expect(noiseFloor).toBe(0.125);
      expect(
        judgeFamily(
          "split",
          { hardPasses: 26, cells: 32 },
          { hardPasses: 23, cells: 32 },
          noiseFloor,
        ).verdict,
      ).toBe("held");
      expect(
        judgeFamily(
          "split",
          { hardPasses: 26, cells: 32 },
          { hardPasses: 8, cells: 32 },
          noiseFloor,
        ).verdict,
      ).toBe("regressed");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("evaluations of different skills or baselines are not pooled", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-floor-"));
    try {
      const write = async (name: string, skill: string, hash: string) => {
        const path = join(root, name);
        await writeFile(
          path,
          JSON.stringify({
            skill,
            context: { baselineBodyHash: hash },
            cells: [],
          }),
        );
        return path;
      };
      const a = await write("a.json", "kibi-usage", HASH);
      await expect(
        noiseFloorFromEvaluations([
          a,
          await write("b.json", "kibi-bootstrap", HASH),
        ]),
      ).rejects.toThrow("mix skills");
      await expect(
        noiseFloorFromEvaluations([
          a,
          await write("c.json", "kibi-usage", "b".repeat(64)),
        ]),
      ).rejects.toThrow("mix baseline bodies");
      await expect(noiseFloorFromEvaluations([])).rejects.toThrow(
        "no evaluations",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
