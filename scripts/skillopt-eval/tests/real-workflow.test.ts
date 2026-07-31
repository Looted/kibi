import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../cli";
import {
  type RealOptimizationDependencies,
  runRealOptimization,
} from "../real-workflow";
import { requireRuntime } from "../real-workflow-types";
import { freezeCandidateVariant } from "../variants";

const RUN_ID = "00000000-0000-4000-8000-000000000201";

describe("real SkillOpt workflow", () => {
  test("rejects a singular evaluator runtime in favor of a materialized fixture run", () => {
    const legacyRuntime = JSON.parse(
      '{"fixtureRoot":"/tmp/fixture","evaluatorManifestPath":"/tmp/evaluator.json"}',
    );
    expect(() => requireRuntime(legacyRuntime)).toThrow(
      "codex_cell_runtime_invalid",
    );
  });

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

  test("Given a non-kibi-usage skill When real optimization starts Then it rejects before any evaluation", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-scope-"));

    try {
      // When
      const attempt = runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: root,
          sourceWorktree: process.cwd(),
          skills: ["kibi-freshness"],
          maxSteps: 1,
        },
        { sourceClean: async () => true },
      );

      // Then
      await attempt.then(
        () => {
          throw new Error("non-kibi-usage optimization unexpectedly completed");
        },
        (error: unknown) => {
          if (error instanceof Error)
            expect(error.message).toContain("kibi-usage");
          else throw error;
        },
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("Given terminal held-out ineligibility When optimization completes Then it writes a blocked review", async () => {
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

  test("Given persisted predicate roots drift When a workflow resumes Then training is rejected before any candidate evaluation", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-root-drift-"));
    let trainCalls = 0;
    const dependencies: Partial<RealOptimizationDependencies> = {
      sourceClean: async () => true,
      train: async () => {
        trainCalls += 1;
        return {
          status: "frozen",
          candidateBody: "Use the Kibi MCP workflow.\n",
          trainerCheckpointHash: "a".repeat(64),
          trajectoryHashes: ["b".repeat(64)],
        };
      },
      oneShot: async (input) =>
        freezeCandidateVariant({
          skill: input.skill,
          variant: "one-shot",
          body: "Use the Kibi MCP workflow.\n",
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
    };
    try {
      await runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: root,
          sourceWorktree: process.cwd(),
          skills: ["kibi-usage"],
          maxSteps: 1,
        },
        dependencies,
      );
      const manifestPath = join(
        root,
        "predicate-corpus",
        "candidate-root-manifest.json",
      );
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
        roots: { corpus: string };
      };
      manifest.roots.corpus = "f".repeat(64);
      await Bun.write(manifestPath, `${JSON.stringify(manifest)}\n`);

      let rejected = false;
      try {
        await runRealOptimization(
          {
            runId: RUN_ID,
            artifactRoot: root,
            sourceWorktree: process.cwd(),
            skills: ["kibi-usage"],
            maxSteps: 1,
          },
          dependencies,
        );
      } catch (error) {
        if (error instanceof Error) {
          rejected = true;
          expect(error.message).toMatch(/root.*drift/i);
        } else {
          throw error;
        }
      }
      expect(rejected).toBe(true);
      expect(trainCalls).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("Given eligible held-out evidence When real optimization completes Then it requires an external production verdict without modifying source", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-auto-"));
    try {
      const trainerInputs: unknown[] = [];
      const developmentCandidates: string[] = [];
      const heldOutVariants: string[][] = [];
      const steps: string[] = [];
      const dependencies: Partial<RealOptimizationDependencies> = {
        sourceClean: async () => true,
        train: async (input) => {
          steps.push("train");
          trainerInputs.push(input);
          return {
            status: "frozen" as const,
            candidateBody:
              "# Frozen candidate\n\nnpx --no-install kibi\nbunx --no-install kibi\nDo not read or edit files inside `.kb` directly\n",
            trainerCheckpointHash: "c".repeat(64),
            trajectoryHashes: ["d".repeat(64)],
          };
        },
        oneShot: async (input) =>
          (() => {
            steps.push("one-shot");
            return freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: "# Frozen one-shot\n\nnpx --no-install kibi\nbunx --no-install kibi\nDo not read or edit files inside `.kb` directly\n",
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            });
          })(),
        evaluateDevelopment: async (input) => {
          steps.push("development");
          developmentCandidates.push(input.candidate.body);
          return { mean: 1, hardPasses: 1, worstFamilyMean: 1 };
        },
        evaluateHeldOut: async (input) => {
          steps.push("held-out");
          heldOutVariants.push(input.variants.map((variant) => variant.body));
          return {
            eligibility: "eligible" as const,
            cellCount: 96 as const,
            productionAdoption: "external-verdict-required" as const,
          };
        },
      };

      // When
      const result = await runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: root,
          sourceWorktree: process.cwd(),
          skills: ["kibi-usage"],
          maxSteps: 1,
        },
        dependencies,
      );

      // Then
      expect(result.status).toBe("evaluated");
      expect(trainerInputs).toHaveLength(1);
      expect(JSON.stringify(trainerInputs)).not.toContain("held-out");
      expect(developmentCandidates).toHaveLength(1);
      expect(heldOutVariants).toHaveLength(1);
      expect(heldOutVariants[0]).toHaveLength(3);
      expect(result.heldOutEligibility).toBe("eligible");
      expect(steps).toEqual(["train", "development", "one-shot", "held-out"]);
      const review = JSON.parse(
        await readFile(join(root, "optimization-review.json"), "utf8"),
      ) as {
        readonly sourceModified?: boolean;
        readonly candidates?: readonly {
          readonly productionAdoption?: string;
        }[];
      };
      expect(review.sourceModified).toBe(false);
      expect(review.candidates?.[0]?.productionAdoption).toBe(
        "external-verdict-required",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
