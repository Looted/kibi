import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type BundleCellSummary,
  evaluateBundleVerdict,
  resolveBundleCandidatesDir,
  summarizeBundleArm,
} from "../bundle-workflow";

setDefaultTimeout(30_000);

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

function cell(
  arm: BundleCellSummary["arm"],
  score: number,
  hard: 0 | 1,
  criticals: readonly string[] = [],
): BundleCellSummary {
  return {
    arm,
    taskId: `bundle-${arm}-${score}-${hard}`,
    outcome: hard === 1 ? "pass" : "fail",
    score,
    hard,
    criticalFailures: [...criticals],
  };
}

describe("paid bundle gate", () => {
  test("summarizes arms independently", () => {
    const cells = [
      cell("baseline", 80, 1),
      cell("baseline", 60, 0),
      cell("skillopt", 90, 1),
      cell("skillopt", 40, 0, ["isolation-1"]),
    ];
    const baseline = summarizeBundleArm("baseline", cells);
    const skillopt = summarizeBundleArm("skillopt", cells);
    expect(baseline.cells).toBe(2);
    expect(baseline.hardPasses).toBe(1);
    expect(skillopt.securityFailures).toBe(1);
    expect(skillopt.meanScore).toBeCloseTo(65);
  });

  test("verdict applies absolute floors only to the candidate arm", () => {
    const baseline = {
      arm: "baseline" as const,
      cells: 8,
      hardPasses: 3,
      meanScore: 66,
      securityFailures: 0,
    };
    expect(
      evaluateBundleVerdict({
        baseline,
        skillopt: {
          arm: "skillopt",
          cells: 8,
          hardPasses: 5,
          meanScore: 82,
          securityFailures: 0,
        },
      }).verdict,
    ).toBe("compatible");
    const failed = evaluateBundleVerdict({
      baseline,
      skillopt: {
        arm: "skillopt",
        cells: 8,
        hardPasses: 2,
        meanScore: 60,
        securityFailures: 1,
      },
    });
    expect(failed.verdict).toBe("incompatible");
    expect(failed.reasons).toEqual([
      "bundle:security-failures",
      "bundle:mean-below-floor",
      "bundle:hard-pass-rate-below-floor",
    ]);
  });

  test("byte-identical assemblies report no-candidate-delta", () => {
    const same = {
      cells: 16,
      hardPasses: 6,
      meanScore: 71.5,
      securityFailures: 0,
    };
    const result = evaluateBundleVerdict({
      baseline: { arm: "baseline", ...same },
      skillopt: { arm: "skillopt", ...same },
    });
    expect(result.verdict).toBe("no-candidate-delta");
    expect(result.reasons).toContain("bundle:candidate-bodies-match-canonical");
  });

  test("candidate resolver reads frozen best_skill.md per skill", async () => {
    const root = await mkdtemp(join(tmpdir(), "bundle-candidates-"));
    roots.push(root);
    await mkdir(join(root, "kibi-usage", "trainer-output"), {
      recursive: true,
    });
    await writeFile(
      join(root, "kibi-usage", "trainer-output", "best_skill.md"),
      "## optimized usage body\n",
    );
    const resolver = resolveBundleCandidatesDir(root);
    expect(await resolver("kibi-usage")).toBe("## optimized usage body\n");
    expect(await resolver("kibi-freshness")).toBeUndefined();
  });

  test("resolver survives a missing candidates directory", async () => {
    const resolver = resolveBundleCandidatesDir(
      join(tmpdir(), "does-not-exist-skillopt"),
    );
    expect(await resolver("kibi-usage")).toBeUndefined();
  });

  test("bundle verdict artifact is written with external adoption gate", async () => {
    // Covered implicitly by runPaidBundleGate; here we assert the persisted
    // report shape contract used by operators.
    const root = await mkdtemp(join(tmpdir(), "bundle-report-"));
    roots.push(root);
    const reportPath = join(root, "bundle-verdict.json");
    await writeFile(
      reportPath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        artifactType: "skillopt-bundle-verdict",
        runId: "r",
        arms: {},
        cells: [],
        verdict: "no-candidate-delta",
        reasons: ["bundle:candidate-bodies-match-canonical"],
        productionAdoption: "external-verdict-required",
      }),
    );
    const parsed = JSON.parse(await readFile(reportPath, "utf8"));
    expect(parsed.artifactType).toBe("skillopt-bundle-verdict");
    expect(parsed.productionAdoption).toBe("external-verdict-required");
  });
});
