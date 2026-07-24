import { describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../cli";
import { adoptSkillOptCandidate } from "../adoption";
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

  test("blocks adoption when no optimizer step produced a candidate", async () => {
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

  test("automatically adopts a structurally passing candidate", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-auto-"));
    const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-real-repo-"));
    try {
      const canonicalRoot = join(
        repoRoot,
        "packages/cli/src/public/skills",
      );
      await mkdir(canonicalRoot, { recursive: true });
      await cp(
        join(process.cwd(), "packages/cli/src/public/skills"),
        canonicalRoot,
        { recursive: true },
      );
      for (const target of ["cursor", "codex"] as const) {
        await mkdir(join(repoRoot, `packages/${target}`), { recursive: true });
        await cp(
          join(process.cwd(), `packages/${target}/skills`),
          join(repoRoot, `packages/${target}/skills`),
          { recursive: true },
        );
      }

      // When
      const result = await runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: root,
          sourceWorktree: repoRoot,
          skills: ["kibi-usage"],
          maxSteps: 1,
        },
        {
          sourceClean: async () => true,
          optimize: async (input) => {
            const candidate = freezeCandidateVariant({
              skill: input.skill,
              variant: "skillopt",
              body: "# Automatically improved guidance\n",
              frontmatterHash: input.frontmatterHash,
              resourcesHash: input.resourcesHash,
              provenance: "skillopt",
            });
            return {
              status: "frozen",
              bestSkill: candidate,
              steps: [
                {
                  step: 1,
                  candidate,
                  development: { mean: 1, hardPasses: 1, worstFamilyMean: 1 },
                },
              ],
              checkpoint: {
                completedSteps: 1,
                previousWorstFamilyMean: 1,
                bestBody: candidate.body,
                bestMean: 1,
              },
              runtimeState: { schemaVersion: "1.0.0" },
            };
          },
          adopt: (input) =>
            adoptSkillOptCandidate(input, {
              runMirrorSync: async (mirrorRoot) => {
                for (const target of ["cursor", "codex"] as const) {
                  const mirror = join(mirrorRoot, `packages/${target}/skills`);
                  await rm(mirror, { recursive: true, force: true });
                  await cp(
                    join(mirrorRoot, "packages/cli/src/public/skills"),
                    mirror,
                    { recursive: true },
                  );
                }
              },
            }),
        },
      );

      // Then
      expect(result.status).toBe("auto-adopted");
      expect(
        await readFile(
          join(
            repoRoot,
            "packages/cli/src/public/skills/kibi-usage/SKILL.md",
          ),
          "utf8",
        ),
      ).toContain("Automatically improved guidance");
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});
