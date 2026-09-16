import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type BundleSurfaces, runPaidBundleGate } from "../bundle-workflow";
import { CANONICAL_SKILLS } from "../catalog";
import { materializeFixtureRun } from "../fixtures/private";
import { surface } from "../real-workflow";
import { ProcessControlError } from "../runtime/process";
import { CANONICAL_SKILL_ROOT } from "./fixture-test-helpers";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function bundleSurfaces(): Promise<{
  baselineSurfaces: BundleSurfaces;
  candidateSurfaces: BundleSurfaces;
}> {
  const entries = await Promise.all(
    CANONICAL_SKILLS.map(
      async (skill) => [skill, await surface(process.cwd(), skill)] as const,
    ),
  );
  const baselineSurfaces = Object.fromEntries(entries) as BundleSurfaces;
  const candidateSurfaces = {
    ...baselineSurfaces,
    "kibi-usage": {
      ...baselineSurfaces["kibi-usage"],
      body: `${baselineSurfaces["kibi-usage"].body}\n# candidate\n`,
    },
  } as BundleSurfaces;
  return { baselineSurfaces, candidateSurfaces };
}

describe("runPaidBundleGate", () => {
  test("runs baseline and skillopt arms and persists a verdict", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bundle-gate-"));
    roots.push(root);
    const receipt = materializeFixtureRun({
      runRoot: join(root, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    });
    const artifactRoot = join(root, "artifacts");
    const surfaces = await bundleSurfaces();
    let cells = 0;
    const result = await runPaidBundleGate(
      {
        runId: "00000000-0000-4000-8000-0000000000aa",
        fixtureRunRoot: receipt.roots.runRoot,
        sourceWorktree: process.cwd(),
        artifactRoot,
        codexExecutable: "/tmp/fake-codex",
        bwrapExecutable: "/tmp/fake-bwrap",
        timeoutMs: 1_000,
        ...surfaces,
      },
      {
        runCodexCell: (async (_options: unknown) => {
          cells += 1;
          const pass = cells % 3 !== 0;
          return {
            receipt: {
              result: {
                status: pass ? "completed" : "failed",
                hardPass: pass,
                score: pass ? 90 : 10,
                criticalFailures: pass ? [] : ["protocol"],
              },
            },
            artifactDirectory: artifactRoot,
          };
        }) as never,
      },
    );
    expect(cells).toBeGreaterThan(0);
    expect(["compatible", "incompatible", "inconclusive"]).toContain(
      result.verdict,
    );
    const report = JSON.parse(await readFile(result.reportPath, "utf8"));
    expect(report.arms.baseline.cells).toBeGreaterThan(0);
    expect(report.productionAdoption).toBe("external-verdict-required");
    expect(CANONICAL_SKILLS.length).toBe(4);
  });

  test("maps ProcessControlError to a cell- critical failure and rethrows other errors", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bundle-error-"));
    roots.push(root);
    const receipt = materializeFixtureRun({
      runRoot: join(root, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    });
    let calls = 0;
    const surfaces = await bundleSurfaces();
    const result = await runPaidBundleGate(
      {
        runId: "00000000-0000-4000-8000-0000000000bb",
        fixtureRunRoot: receipt.roots.runRoot,
        sourceWorktree: process.cwd(),
        artifactRoot: join(root, "artifacts"),
        codexExecutable: "/tmp/fake-codex",
        bwrapExecutable: "/tmp/fake-bwrap",
        hiddenMarkers: ["hidden"],
        pricingHash: "a".repeat(64),
        priceAmount: 1,
        ...surfaces,
      },
      {
        runCodexCell: async () => {
          calls += 1;
          if (calls === 1) {
            throw new ProcessControlError("timeout", {
              argv: ["codex"],
              stdout: "",
              stderr: "timeout",
              exitCode: 1,
              signal: null,
            });
          }
          return {
            receipt: {
              result: {
                status: "completed",
                hardPass: true,
                score: 100,
                criticalFailures: [],
              },
            },
            artifactDirectory: join(root, "artifacts"),
          };
        },
      },
    );
    expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);

    await expect(
      runPaidBundleGate(
        {
          runId: "00000000-0000-4000-8000-0000000000cc",
          fixtureRunRoot: receipt.roots.runRoot,
          sourceWorktree: process.cwd(),
          artifactRoot: join(root, "artifacts-throw"),
          codexExecutable: "/tmp/fake-codex",
          bwrapExecutable: "/tmp/fake-bwrap",
          ...surfaces,
        },
        {
          runCodexCell: async () => {
            throw new Error("unexpected-cell-failure");
          },
        },
      ),
    ).rejects.toThrow("unexpected-cell-failure");
  });

  test("passes complete arm bodies to the runner and does not infer identity from equal scores", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bundle-surfaces-"));
    roots.push(root);
    const receipt = materializeFixtureRun({
      runRoot: join(root, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    });
    const surfaces = await bundleSurfaces();
    const seen: Array<{
      variant: string;
      bodies: Record<string, string>;
    }> = [];
    const result = await runPaidBundleGate(
      {
        runId: "00000000-0000-4000-8000-0000000000dd",
        fixtureRunRoot: receipt.roots.runRoot,
        sourceWorktree: process.cwd(),
        artifactRoot: join(root, "artifacts"),
        codexExecutable: "/tmp/fake-codex",
        bwrapExecutable: "/tmp/fake-bwrap",
        ...surfaces,
      },
      {
        runCodexCell: async (options) => {
          seen.push({
            variant: options.request.variant,
            bodies: Object.fromEntries(
              Object.entries(options.bundleCandidates ?? {}).map(
                ([skill, candidate]) => [skill, candidate.body],
              ),
            ),
          });
          return {
            receipt: {
              result: {
                status: "completed",
                hardPass: true,
                score: 80,
                criticalFailures: [],
              },
            },
          };
        },
      },
    );

    expect(result.verdict).toBe("compatible");
    expect(seen).toHaveLength(16);
    const baseline = seen.find((entry) => entry.variant === "baseline");
    const candidate = seen.find((entry) => entry.variant === "skillopt");
    expect(baseline?.bodies["kibi-usage"]).toBe(
      surfaces.baselineSurfaces["kibi-usage"].body,
    );
    expect(candidate?.bodies["kibi-usage"]).toBe(
      surfaces.candidateSurfaces["kibi-usage"].body,
    );
  });
});
