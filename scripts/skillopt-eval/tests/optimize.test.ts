import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPinnedSkillOptRunner,
  optimizeSkillOptVariant,
} from "../optimize";

const BASELINE = "Use Kibi through MCP.\n";

function stepResult(body: string, score: number, worstFamilyMean: number) {
  return {
    body,
    development: {
      mean: score,
      hardPasses: 3,
      worstFamilyMean,
    },
  };
}

describe("SkillOpt candidate optimization", () => {
  test("launches checkpointed steps and stops after two sub-point improvements", async () => {
    const steps: number[] = [];
    const result = await optimizeSkillOptVariant(
      {
        skill: "kibi-usage",
        baselineBody: BASELINE,
        frontmatterHash: "a".repeat(64),
        resourcesHash: "b".repeat(64),
        baselineDevelopment: { mean: 70, hardPasses: 2, worstFamilyMean: 60 },
        trainTrajectories: [
          {
            taskId: "train-1",
            family: "discovery",
            reflection: "use exact lookup",
          },
        ],
        maxSteps: 4,
      },
      {
        runStep: async ({ step }) => {
          steps.push(step);
          return stepResult(
            `Candidate ${step}\n`,
            71 + step,
            60.4 + step * 0.1,
          );
        },
      },
    );

    expect(steps).toEqual([1, 2]);
    expect(result.status).toBe("frozen");
    if (result.status !== "frozen")
      throw new Error("expected frozen optimization");
    expect(result.steps).toHaveLength(2);
    expect(result.bestSkill.body).toBe("Candidate 2\n");
  });

  test("rejects held-out inputs before launching SkillOpt", async () => {
    let launched = false;
    let failure: unknown;
    try {
      await optimizeSkillOptVariant(
        {
          skill: "kibi-usage",
          baselineBody: BASELINE,
          frontmatterHash: "a".repeat(64),
          resourcesHash: "b".repeat(64),
          baselineDevelopment: { mean: 70, hardPasses: 2, worstFamilyMean: 60 },
          trainTrajectories: [
            {
              taskId: "held-out-secret",
              family: "private",
              reflection: "hidden",
            },
          ],
          maxSteps: 4,
        },
        {
          runStep: async () => {
            launched = true;
            return stepResult("never\n", 100, 100);
          },
        },
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe(
      "held-out task ids are not optimization inputs",
    );
    expect(launched).toBe(false);
  });

  test("retries once when a candidate fails safety validation", async () => {
    // Given
    let calls = 0;

    // When
    const result = await optimizeSkillOptVariant(
      {
        skill: "kibi-usage",
        baselineBody: BASELINE,
        frontmatterHash: "a".repeat(64),
        resourcesHash: "b".repeat(64),
        baselineDevelopment: { mean: 70, hardPasses: 2, worstFamilyMean: 60 },
        trainTrajectories: [
          { taskId: "train-1", family: "discovery", reflection: "public" },
        ],
        maxSteps: 1,
      },
      {
        runStep: async () => {
          calls += 1;
          return stepResult(
            calls === 1 ? "OpenCode candidate\n" : "Valid candidate\n",
            71,
            61,
          );
        },
      },
    );

    // Then
    expect(calls).toBe(2);
    expect(result.status).toBe("frozen");
    if (result.status !== "frozen")
      throw new Error("expected frozen optimization");
    expect(result.bestSkill.body).toBe("Valid candidate\n");
  });

  test("resumes from the next checkpoint without repeating terminal steps", async () => {
    const steps: number[] = [];
    const result = await optimizeSkillOptVariant(
      {
        skill: "kibi-usage",
        baselineBody: BASELINE,
        frontmatterHash: "a".repeat(64),
        resourcesHash: "b".repeat(64),
        baselineDevelopment: { mean: 70, hardPasses: 2, worstFamilyMean: 60 },
        trainTrajectories: [
          {
            taskId: "train-1",
            family: "discovery",
            reflection: "use exact lookup",
          },
        ],
        maxSteps: 2,
        checkpoint: {
          completedSteps: 1,
          previousWorstFamilyMean: 60,
          bestBody: "Candidate 1\n",
          bestMean: 71,
        },
      },
      {
        runStep: async ({ step }) => {
          steps.push(step);
          return stepResult(`Candidate ${step}\n`, 72, 61);
        },
      },
    );

    expect(steps).toEqual([2]);
    if (result.status !== "frozen")
      throw new Error("expected frozen optimization");
    expect(result.bestSkill.body).toBe("Candidate 2\n");
  });

  test("persists native SkillOpt checkpoint artifacts without hidden inputs", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-variant-"));
    try {
      await optimizeSkillOptVariant(
        {
          skill: "kibi-usage",
          baselineBody: BASELINE,
          frontmatterHash: "a".repeat(64),
          resourcesHash: "b".repeat(64),
          baselineDevelopment: { mean: 70, hardPasses: 2, worstFamilyMean: 60 },
          trainTrajectories: [
            {
              taskId: "train-1",
              family: "discovery",
              reflection: "use exact lookup",
            },
          ],
          maxSteps: 1,
          artifactRoot,
        },
        {
          runStep: async () => stepResult("Candidate 1\n", 72, 61),
        },
      );

      expect(
        await readFile(join(artifactRoot, "skills", "skill_v0000.md"), "utf8"),
      ).toBe(BASELINE);
      expect(
        await readFile(
          join(artifactRoot, "steps", "step-1", "candidate_skill.md"),
          "utf8",
        ),
      ).toBe("Candidate 1\n");
      expect(await readFile(join(artifactRoot, "best_skill.md"), "utf8")).toBe(
        "Candidate 1\n",
      );
    } finally {
      await rm(artifactRoot, { recursive: true, force: true });
    }
  });

  test("invokes one pinned SkillOpt process per requested checkpoint", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-process-"));
    const requests: string[] = [];
    try {
      const runner = createPinnedSkillOptRunner({
        command: ["uv", "run", "--project", "tools/skillopt"],
        cwd: process.cwd(),
        artifactRoot,
        sourceLockHash: "c".repeat(64),
        runProcess: async (options) => {
          const requestPath = options.argv.at(-1);
          if (requestPath === undefined)
            throw new Error("missing step request");
          requests.push(await readFile(requestPath, "utf8"));
          return {
            argv: options.argv,
            stdout: JSON.stringify({
              body: "Candidate from pinned SkillOpt\n",
              development: { mean: 88, hardPasses: 4, worstFamilyMean: 84 },
            }),
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        },
      });

      const result = await runner.runStep({
        skill: "kibi-usage",
        step: 1,
        maxSteps: 4,
        currentBody: BASELINE,
        trainTrajectories: [
          { taskId: "train-1", family: "discovery", reflection: "public" },
        ],
        previousDevelopment: { mean: 70, hardPasses: 2, worstFamilyMean: 60 },
      });

      expect(requests).toHaveLength(1);
      expect(requests[0]).not.toContain("held-out");
      expect(result.body).toContain("pinned SkillOpt");
      expect(result.development.mean).toBe(88);
    } finally {
      await rm(artifactRoot, { recursive: true, force: true });
    }
  });
});
