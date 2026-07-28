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

  test("reports a blocked held-out aggregate without adopting a candidate", async () => {
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
          train: async () => ({
            status: "frozen",
            candidateBody:
              "Use the Kibi MCP workflow and preserve approval boundaries.\n",
            trainerCheckpointHash: "a".repeat(64),
            trajectoryHashes: ["b".repeat(64)],
          }),
          oneShot: async (input) =>
            freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: "Use the Kibi MCP workflow and preserve approval boundaries.\n",
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            }),
          evaluateDevelopment: async () => ({
            mean: 0,
            hardPasses: 0,
            worstFamilyMean: 0,
          }),
          evaluateHeldOut: async () => ({
            eligibility: "HELD_OUT_MATRIX_INELIGIBLE",
            cellCount: 36,
          }),
        },
      );

      expect(result.status).toBe("blocked");
      expect(result.skills).toEqual(["kibi-usage"]);
      const review = JSON.parse(
        await readFile(join(root, "optimization-review.json"), "utf8"),
      ) as { status?: string; candidates?: Array<{ skill?: string }> };
      expect(review.status).toBe("blocked");
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

  test("trains only on public descriptors and never adopts evaluated candidates", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-auto-"));
    try {
      const trainerInputs: unknown[] = [];
      const developmentCandidates: string[] = [];
      const heldOutVariants: string[][] = [];

      // When
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
          train: async (input) => {
            trainerInputs.push(input);
            return {
              status: "frozen",
              candidateBody:
                "# Frozen candidate\n\nnpx --no-install kibi\nbunx --no-install kibi\nDo not read or edit files inside `.kb` directly\n",
              trainerCheckpointHash: "c".repeat(64),
              trajectoryHashes: ["d".repeat(64)],
            };
          },
          oneShot: async (input) =>
            freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: "# Frozen one-shot\n\nnpx --no-install kibi\nbunx --no-install kibi\nDo not read or edit files inside `.kb` directly\n",
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            }),
          evaluateDevelopment: async (input) => {
            developmentCandidates.push(input.candidate.body);
            return { mean: 1, hardPasses: 1, worstFamilyMean: 1 };
          },
          evaluateHeldOut: async (input) => {
            heldOutVariants.push(input.variants.map((variant) => variant.body));
            return { eligibility: "eligible", cellCount: 36 };
          },
        },
      );

      // Then
      expect(result.status).toBe("evaluated");
      expect(trainerInputs).toHaveLength(1);
      expect(JSON.stringify(trainerInputs)).not.toContain("held-out");
      expect(developmentCandidates).toHaveLength(1);
      expect(heldOutVariants).toHaveLength(1);
      expect(heldOutVariants[0]).toHaveLength(3);
      expect(result.heldOutEligibility).toBe("eligible");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
