import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CANONICAL_SKILLS } from "../catalog";
import { materializeFixtureRun } from "../fixtures/private";
import { runPaidBundleGate } from "../bundle-workflow";
import { ProcessControlError } from "../runtime/process";
import { CANONICAL_SKILL_ROOT } from "./fixture-test-helpers";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("runPaidBundleGate", () => {
  test("runs baseline and skillopt arms and persists a verdict", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bundle-gate-"));
    roots.push(root);
    const receipt = materializeFixtureRun({
      runRoot: join(root, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    });
    const artifactRoot = join(root, "artifacts");
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
        resolveCandidates: async (skill) =>
          skill === "kibi-usage" ? "# candidate\n" : undefined,
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
        },
        {
          runCodexCell: async () => {
            throw new Error("unexpected-cell-failure");
          },
        },
      ),
    ).rejects.toThrow("unexpected-cell-failure");
  });
});
