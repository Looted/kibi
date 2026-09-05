// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPinnedSkillOptRunner,
  optimizeSkillOptVariant,
} from "../optimize";
import * as variants from "../variants";
import { CandidateValidationError } from "../variants";

const BASELINE = "Use Kibi through MCP.\n";
const spies: Array<{ mockRestore: () => void }> = [];
const roots: string[] = [];

afterEach(async () => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function validInput(
  overrides: Partial<Parameters<typeof optimizeSkillOptVariant>[0]> = {},
): Parameters<typeof optimizeSkillOptVariant>[0] {
  return {
    skill: "kibi-usage",
    baselineBody: BASELINE,
    frontmatterHash: "a".repeat(64),
    resourcesHash: "b".repeat(64),
    baselineDevelopment: { mean: 70, hardPasses: 2, worstFamilyMean: 60 },
    trainTrajectories: [
      { taskId: "train-1", family: "discovery", reflection: "public" },
    ],
    maxSteps: 1,
    ...overrides,
  };
}

describe("optimizeSkillOptVariant remaining rejection branches", () => {
  test("rejects missing commands, failed pinned steps, empty trajectories, and invalid gates", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-opt-rem-"));
    roots.push(artifactRoot);
    const runner = createPinnedSkillOptRunner({
      command: [] as unknown as [string, ...string[]],
      cwd: process.cwd(),
      artifactRoot,
      sourceLockHash: "c".repeat(64),
      runProcess: async () => {
        throw new Error("must not launch");
      },
    });
    await expect(
      runner.runStep({
        skill: "kibi-usage",
        step: 1,
        maxSteps: 1,
        currentBody: BASELINE,
        trainTrajectories: [
          { taskId: "train-1", family: "discovery", reflection: "public" },
        ],
        previousDevelopment: { mean: 70, hardPasses: 2, worstFamilyMean: 60 },
      }),
    ).rejects.toThrow("skillopt_command_missing");

    const failing = createPinnedSkillOptRunner({
      command: ["uv"],
      cwd: process.cwd(),
      artifactRoot,
      sourceLockHash: "c".repeat(64),
      runProcess: async (options) => ({
        argv: options.argv,
        stdout: "",
        stderr: "failed",
        exitCode: 7,
        signal: null,
      }),
    });
    await expect(
      failing.runStep({
        skill: "kibi-usage",
        step: 1,
        maxSteps: 1,
        currentBody: BASELINE,
        trainTrajectories: [
          { taskId: "train-1", family: "discovery", reflection: "public" },
        ],
        previousDevelopment: { mean: 70, hardPasses: 2, worstFamilyMean: 60 },
      }),
    ).rejects.toThrow("skillopt_step_exit:7");

    await expect(
      optimizeSkillOptVariant(validInput({ trainTrajectories: [] }), {
        runStep: async () => {
          throw new Error("must not run");
        },
      }),
    ).rejects.toThrow("optimization_requires_train_trajectories");

    await expect(
      optimizeSkillOptVariant(
        validInput({
          baselineDevelopment: {
            mean: 101,
            hardPasses: 2,
            worstFamilyMean: 60,
          },
        }),
        {
          runStep: async () => {
            throw new Error("must not run");
          },
        },
      ),
    ).rejects.toThrow("invalid_development_gate");

    await expect(
      optimizeSkillOptVariant(validInput({ maxSteps: 0 }), {
        runStep: async () => {
          throw new Error("must not run");
        },
      }),
    ).rejects.toThrow("maxSteps must be between 1 and 4");
    await expect(
      optimizeSkillOptVariant(validInput({ maxSteps: 5 }), {
        runStep: async () => {
          throw new Error("must not run");
        },
      }),
    ).rejects.toThrow("maxSteps must be between 1 and 4");
  });

  test("returns invalid_variant when candidate validation fails twice or throws a non-validation error", async () => {
    const twice = await optimizeSkillOptVariant(validInput(), {
      runStep: async () => ({
        body: "OpenCode candidate\n",
        development: { mean: 71, hardPasses: 2, worstFamilyMean: 61 },
      }),
    });
    expect(twice).toMatchObject({
      status: "invalid",
      failureCategory: "invalid_variant",
    });
    if (twice.status !== "invalid") throw new Error("expected invalid");
    expect(twice.error).toContain("candidate_");

    const freeze = spyOn(variants, "freezeCandidateVariant").mockImplementation(
      () => {
        throw "not-an-error";
      },
    );
    spies.push(freeze);
    const nonValidation = await optimizeSkillOptVariant(validInput(), {
      runStep: async () => ({
        body: "Valid candidate\n",
        development: { mean: 71, hardPasses: 2, worstFamilyMean: 61 },
      }),
    });
    expect(nonValidation).toMatchObject({
      status: "invalid",
      error: "not-an-error",
    });
    freeze.mockRestore();

    const exhausted = spyOn(
      variants,
      "freezeCandidateVariant",
    ).mockImplementation(() => {
      throw new CandidateValidationError("empty");
    });
    spies.push(exhausted);
    const retry = await optimizeSkillOptVariant(validInput(), {
      runStep: async () => ({
        body: "Valid candidate\n",
        development: { mean: 71, hardPasses: 2, worstFamilyMean: 61 },
      }),
    });
    expect(retry.status).toBe("invalid");
    if (retry.status !== "invalid") throw new Error("expected invalid");
    expect(retry.error).toContain("candidate_empty");
  });
});
