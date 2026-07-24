import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../cli";
import { runRealOptimization } from "../real-workflow";
import { freezeCandidateVariant } from "../variants";

const RUN_ID = "00000000-0000-4000-8000-000000000201";

describe("real SkillOpt workflow", () => {
  test("requires explicit paid-run acknowledgment before optimizing", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-guard-"));
    try {
      expect(
        await main([
          "optimize",
          "--skill",
          "kibi-usage",
          "--run-id",
          RUN_ID,
          "--artifact-root",
          root,
        ]),
      ).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("writes an approval-pending candidate without changing canonical source", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-review-"));
    try {
      const result = await runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: root,
          sourceWorktree: process.cwd(),
          skills: ["kibi-usage"],
          maxSteps: 1,
        },
        {
          sourceClean: async () => true,
          optimize: async (input) => {
            const candidate = freezeCandidateVariant({
              skill: input.skill,
              variant: "skillopt",
              body: "Use the Kibi MCP workflow and preserve approval boundaries.\n",
              frontmatterHash: input.frontmatterHash,
              resourcesHash: input.resourcesHash,
              provenance: "skillopt",
            });
            return {
              status: "frozen",
              bestSkill: candidate,
              steps: [],
              checkpoint: {
                completedSteps: 0,
                previousWorstFamilyMean: 0,
                bestBody: candidate.body,
                bestMean: 0,
              },
              runtimeState: { schemaVersion: "1.0.0" },
            };
          },
        },
      );

      expect(result.status).toBe("awaiting-approval");
      expect(result.skills).toEqual(["kibi-usage"]);
      const review = JSON.parse(
        await readFile(join(root, "optimization-review.json"), "utf8"),
      ) as { status?: string; candidates?: Array<{ skill?: string }> };
      expect(review.status).toBe("awaiting-approval");
      expect(review.candidates?.[0]?.skill).toBe("kibi-usage");
      expect(
        await readFile(
          join(root, "skills", "kibi-usage", "candidate_skill.md"),
          "utf8",
        ),
      ).toContain("approval boundaries");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
