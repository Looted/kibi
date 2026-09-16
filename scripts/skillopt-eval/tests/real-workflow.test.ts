import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSkillCatalog } from "../catalog";
import { main } from "../cli";
import { materializeFixtureRun } from "../fixtures/private";
import {
  type RealOptimizationDependencies,
  passesDevelopmentGate,
  runRealOptimization,
} from "../real-workflow";
import { requireRuntime } from "../real-workflow-types";
import { CodexOptimizerError } from "../runtime/codex-optimizer";
import { initializeTargetEpisodeBudget } from "../target-episode-budget";
import { freezeCandidateVariant } from "../variants";
import { CANONICAL_SKILL_ROOT } from "./fixture-test-helpers";

const RUN_ID = "00000000-0000-4000-8000-000000000201";
const COMPLETE_SAFE_SEED_BODY = `# Kibi Usage

npx --no-install kibi
bunx --no-install kibi
Do not read or edit files inside \`.kb\` directly
kb_search kb_query kb_upsert kb_check kb_semantic_advisor kb_suggest_predicates kb_model_requirement
fact_kind: predicate predicate_name predicate_args canonical_key polarity predicate_schema requires_predicate
logic_claims semantic_inventory claim_key claim_text propositions interpretations projectLocalSchemas nonlogical
review:ambiguity review:ontology-gap polarity: deny kibi.logic.v1
fact_kind: rule_schema fact_kind: rule requires_rule rule-safety rule-verifiability semantic-completeness logic-coverage
taskOutcome kbState verificationState proofState limitationDisposition quality diagnostic fixed accepted deferred
contract hash freshness window temporary

${"Operational guidance. ".repeat(60)}`;

function completeBody(prefix: string): string {
  return `${COMPLETE_SAFE_SEED_BODY}\n\n${prefix}\n`;
}

function bodyHash(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

describe("real SkillOpt workflow", () => {
  test("admits a below-floor baseline-relative gain without hard or family loss", () => {
    const comparators = {
      baseline: { mean: 0.5, hardPasses: 2, worstFamilyMean: 0.4 },
      oneShot: { mean: 0.6, hardPasses: 2, worstFamilyMean: 0.5 },
    } as const;

    expect(
      passesDevelopmentGate({
        ...comparators,
        candidate: { mean: 0.85, hardPasses: 3, worstFamilyMean: 0.75 },
      }),
    ).toBe(true);
    expect(
      passesDevelopmentGate({
        ...comparators,
        candidate: { mean: 0.84, hardPasses: 2, worstFamilyMean: 0.4 },
      }),
    ).toBe(true);
    expect(
      passesDevelopmentGate({
        ...comparators,
        candidate: {
          mean: 0.9,
          hardPasses: 4,
          worstFamilyMean: 0.8,
          securityFailures: 1,
        },
      }),
    ).toBe(false);
    expect(
      passesDevelopmentGate({
        baseline: { mean: 0.9, hardPasses: 3, worstFamilyMean: 0.75 },
        oneShot: comparators.oneShot,
        candidate: { mean: 0.9, hardPasses: 4, worstFamilyMean: 0.8 },
      }),
    ).toBe(false);
    expect(
      passesDevelopmentGate({
        baseline: comparators.baseline,
        oneShot: { mean: 0.95, hardPasses: 4, worstFamilyMean: 0.95 },
        candidate: { mean: 0.55, hardPasses: 2, worstFamilyMean: 0.4 },
      }),
    ).toBe(true);
    expect(
      passesDevelopmentGate({
        ...comparators,
        candidate: { mean: 0.9, hardPasses: 1, worstFamilyMean: 0.4 },
      }),
    ).toBe(false);
    expect(
      passesDevelopmentGate({
        ...comparators,
        candidate: { mean: 0.9, hardPasses: 2, worstFamilyMean: 0.39 },
      }),
    ).toBe(false);
  });

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

  test("Given more than one skill When real optimization starts Then it rejects before any evaluation", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-scope-"));

    try {
      // When
      const attempt = runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: root,
          sourceWorktree: process.cwd(),
          skills: ["kibi-freshness", "kibi-traceability"],
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
            expect(error.message).toContain("exactly one canonical skill");
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
            candidateBody: completeBody(
              "Use the Kibi MCP workflow and preserve approval boundaries.",
            ),
            trainerCheckpointHash: "a".repeat(64),
            trajectoryHashes: ["b".repeat(64)],
            development: { mean: 0.8, hardPasses: 3, worstFamilyMean: 0.6 },
          }),
          oneShot: async (input) =>
            freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: completeBody(
                "Use the Kibi MCP workflow and preserve approval boundaries.",
              ),
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            }),
          evaluateDevelopment: async ({ candidate }) =>
            candidate.variant === "baseline"
              ? { mean: 0.4, hardPasses: 1, worstFamilyMean: 0.25 }
              : { mean: 0.5, hardPasses: 2, worstFamilyMean: 0.4 },
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

  test("Given a failed one-shot rewrite When optimization continues Then it records the failure and trains from baseline", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-one-shot-fail-"));
    try {
      const developmentVariants: string[] = [];
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
          oneShot: async () => {
            throw new CodexOptimizerError("optimizer_output_incomplete_body");
          },
          evaluateDevelopment: async ({ candidate }) => {
            developmentVariants.push(candidate.variant);
            return { mean: 0.4, hardPasses: 1, worstFamilyMean: 0.25 };
          },
          train: async (input) => {
            expect(input.initialVariant?.variant).toBe("baseline");
            expect(input.initialVariant?.provenance).toBe("canonical");
            return {
              status: "frozen",
              candidateBody: completeBody(
                "Use the Kibi MCP workflow and preserve approval boundaries.",
              ),
              trainerCheckpointHash: "a".repeat(64),
              trajectoryHashes: ["b".repeat(64)],
              development: { mean: 0.4, hardPasses: 1, worstFamilyMean: 0.25 },
            };
          },
          evaluateHeldOut: async () => ({
            eligibility: "HELD_OUT_MATRIX_INELIGIBLE",
            cellCount: 36,
          }),
        },
      );

      expect(result.status).toBe("blocked");
      expect(developmentVariants).toEqual(["baseline", "skillopt"]);
      const failure = JSON.parse(
        await readFile(
          join(root, "skills", "kibi-usage", "one-shot-failure.json"),
          "utf8",
        ),
      ) as { error?: string; artifactType?: string };
      expect(failure.artifactType).toBe("skillopt-one-shot-failure");
      expect(failure.error).toBe("optimizer_output_incomplete_body");
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
          candidateBody: completeBody("Use the Kibi MCP workflow."),
          trainerCheckpointHash: "a".repeat(64),
          trajectoryHashes: ["b".repeat(64)],
        };
      },
      oneShot: async (input) =>
        freezeCandidateVariant({
          skill: input.skill,
          variant: "one-shot",
          body: completeBody("Use the Kibi MCP workflow."),
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
            candidateBody: completeBody("# Frozen candidate"),
            trainerCheckpointHash: "c".repeat(64),
            trajectoryHashes: ["d".repeat(64)],
            // Deliberately disagree with the independent evaluator: this is
            // selection-loop metadata and must not authorize held-out cells.
            development: { mean: 0.1, hardPasses: 0, worstFamilyMean: 0.1 },
          };
        },
        oneShot: async (input) =>
          (() => {
            steps.push("one-shot");
            return freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: completeBody("# Frozen one-shot"),
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            });
          })(),
        evaluateDevelopment: async (input) => {
          steps.push("development");
          developmentCandidates.push(input.candidate.body);
          if (input.candidate.variant === "baseline")
            return { mean: 0.5, hardPasses: 2, worstFamilyMean: 0.4 };
          if (input.candidate.variant === "one-shot")
            return { mean: 0.6, hardPasses: 2, worstFamilyMean: 0.5 };
          return { mean: 0.9, hardPasses: 4, worstFamilyMean: 0.85 };
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
      expect(developmentCandidates).toHaveLength(3);
      expect(heldOutVariants).toHaveLength(1);
      expect(heldOutVariants[0]).toHaveLength(3);
      expect(result.heldOutEligibility).toBe("eligible");
      expect(steps).toEqual([
        "one-shot",
        "development",
        "development",
        "train",
        "development",
        "held-out",
      ]);
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

  test("Given a candidate that misses the baseline-relative gate Then held-out cells are not launched", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-dev-gate-"));
    let heldOutCalls = 0;
    try {
      const result = await runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: root,
          sourceWorktree: process.cwd(),
          skills: ["kibi-usage"],
          maxSteps: 4,
        },
        {
          sourceClean: async () => true,
          oneShot: async (input) =>
            freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: completeBody("Use Kibi through MCP."),
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            }),
          evaluateDevelopment: async ({ candidate }) =>
            candidate.variant === "baseline"
              ? { mean: 0.5, hardPasses: 2, worstFamilyMean: 0.4 }
              : { mean: 0.5, hardPasses: 3, worstFamilyMean: 0.5 },
          train: async (input) => {
            expect(input.initialVariant?.variant).toBe("one-shot");
            return {
              status: "frozen",
              candidateBody: completeBody(
                "Use Kibi through MCP with exact recovery.",
              ),
              trainerCheckpointHash: "a".repeat(64),
              trajectoryHashes: ["b".repeat(64)],
              development: {
                mean: 0.7,
                hardPasses: 2,
                worstFamilyMean: 0.6,
              },
            };
          },
          evaluateHeldOut: async () => {
            heldOutCalls += 1;
            return {
              eligibility: "eligible",
              cellCount: 36,
              productionAdoption: "external-verdict-required",
            };
          },
        },
      );

      expect(heldOutCalls).toBe(0);
      expect(result).toMatchObject({
        status: "blocked",
        heldOutEligibility: "not-run",
        reason: "development_gate_ineligible",
      });
      const review = JSON.parse(
        await readFile(join(root, "optimization-review.json"), "utf8"),
      ) as {
        candidates?: Array<{
          developmentEligible?: boolean;
          heldOutEligibility?: string;
          heldOutCellCount?: number;
        }>;
      };
      expect(review.candidates?.[0]).toMatchObject({
        developmentEligible: false,
        heldOutEligibility: "not-run",
        heldOutCellCount: 0,
      });
      expect(review).toMatchObject({
        stage: "development",
        heldOutSkipReason: "development-gate-ineligible",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("development-only completes without held-out evaluation and keeps one-shot diagnostics", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "skillopt-real-development-only-"),
    );
    let heldOutCalls = 0;
    let initialVariant: string | undefined;
    try {
      const budgetEnv = await initializeTargetEpisodeBudget(root, 64);
      const result = await runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: root,
          sourceWorktree: process.cwd(),
          skills: ["kibi-usage"],
          maxSteps: 1,
          developmentOnly: true,
          env: { ...process.env, ...budgetEnv },
        },
        {
          sourceClean: async () => true,
          oneShot: async (input) =>
            freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: completeBody("Winning one-shot body"),
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            }),
          evaluateDevelopment: async ({ candidate }) => {
            if (candidate.variant === "baseline")
              return { mean: 0.5, hardPasses: 2, worstFamilyMean: 0.4 };
            if (candidate.variant === "one-shot")
              return { mean: 0.9, hardPasses: 4, worstFamilyMean: 0.9 };
            return { mean: 0.6, hardPasses: 2, worstFamilyMean: 0.4 };
          },
          train: async (input) => {
            initialVariant = input.initialVariant?.variant;
            return {
              status: "frozen",
              candidateBody: completeBody("Trained complete improvement"),
              trainerCheckpointHash: "a".repeat(64),
              trajectoryHashes: ["b".repeat(64)],
            };
          },
          evaluateHeldOut: async () => {
            heldOutCalls += 1;
            return {
              eligibility: "eligible",
              cellCount: 96,
              productionAdoption: "external-verdict-required",
            };
          },
        },
      );

      expect(initialVariant).toBe("one-shot");
      expect(heldOutCalls).toBe(0);
      expect(result).toMatchObject({
        status: "evaluated",
        heldOutEligibility: "not-run",
        stage: "development",
        reason: "development_only",
        paidModelCalls: "unknown",
        targetEpisodeBudget: {
          limit: 64,
          reservedCount: 0,
          remainingCount: 64,
        },
      });
      const review = JSON.parse(
        await readFile(join(root, "optimization-review.json"), "utf8"),
      ) as {
        status?: string;
        stage?: string;
        heldOutSkipReason?: string;
        candidates?: Array<{
          candidateBodyHash?: string;
          developmentEligible?: boolean;
          development?: { mean?: number; securityFailures?: number };
          developmentComparators?: { oneShot?: { mean?: number } };
        }>;
      };
      expect(review).toMatchObject({
        status: "evaluated",
        stage: "development",
        heldOutSkipReason: "development-only",
      });
      expect(review.candidates?.[0]).toMatchObject({
        developmentEligible: true,
        candidateBodyHash: bodyHash(completeBody("Winning one-shot body")),
        development: { mean: 0.9, securityFailures: 0 },
        developmentComparators: { oneShot: { mean: 0.9 } },
      });
      expect(
        await readFile(
          join(root, "skills", "kibi-usage", "candidate_skill.md"),
          "utf8",
        ),
      ).toBe(completeBody("Winning one-shot body"));
      expect(
        await readFile(
          join(root, "skills", "kibi-usage", "rejected-candidate_skill.md"),
          "utf8",
        ),
      ).toBe(completeBody("Trained complete improvement"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects an incomplete trained body without replacing a complete one-shot winner", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "skillopt-real-invalid-trained-"),
    );
    try {
      const winnerBody = completeBody("Complete one-shot winner");
      const rejectedBody = "incomplete trained output\n";
      await runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: root,
          sourceWorktree: process.cwd(),
          skills: ["kibi-usage"],
          maxSteps: 1,
          developmentOnly: true,
        },
        {
          sourceClean: async () => true,
          oneShot: async (input) =>
            freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: winnerBody,
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            }),
          evaluateDevelopment: async ({ candidate }) =>
            candidate.variant === "baseline"
              ? { mean: 0.5, hardPasses: 2, worstFamilyMean: 0.4 }
              : { mean: 0.9, hardPasses: 4, worstFamilyMean: 0.9 },
          train: async () => ({
            status: "frozen" as const,
            candidateBody: rejectedBody,
            trainerCheckpointHash: "a".repeat(64),
            trajectoryHashes: ["b".repeat(64)],
          }),
        },
      );

      expect(
        await readFile(
          join(root, "skills", "kibi-usage", "candidate_skill.md"),
          "utf8",
        ),
      ).toBe(winnerBody);
      expect(
        await readFile(
          join(root, "skills", "kibi-usage", "rejected-candidate_skill.md"),
          "utf8",
        ),
      ).toBe(rejectedBody);
      const review = JSON.parse(
        await readFile(join(root, "optimization-review.json"), "utf8"),
      ) as {
        candidates?: Array<{
          candidateBodyHash?: string;
          development?: { mean?: number };
        }>;
      };
      expect(review.candidates?.[0]).toMatchObject({
        candidateBodyHash: bodyHash(winnerBody),
        development: { mean: 0.9 },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("Given a preserved candidate seed Then training starts from its exact body", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-seed-"));
    const seedPath = join(root, "preserved-candidate.md");
    const seedBody = COMPLETE_SAFE_SEED_BODY;
    await writeFile(seedPath, seedBody, "utf8");
    try {
      const result = await runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: join(root, "artifacts"),
          sourceWorktree: process.cwd(),
          skills: ["kibi-usage"],
          maxSteps: 1,
          seedCandidatePath: seedPath,
        },
        {
          sourceClean: async () => true,
          oneShot: async (input) =>
            freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: completeBody("Use Kibi through MCP."),
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            }),
          evaluateDevelopment: async ({ candidate }) =>
            candidate.variant === "baseline"
              ? { mean: 0.5, hardPasses: 2, worstFamilyMean: 0.4 }
              : { mean: 0.5, hardPasses: 3, worstFamilyMean: 0.5 },
          train: async (input) => {
            expect(input.initialVariant?.variant).toBe("skillopt");
            expect(input.initialVariant?.body).toBe(seedBody);
            return {
              status: "frozen",
              candidateBody: `${seedBody}Refined.\n`,
              trainerCheckpointHash: "a".repeat(64),
              trajectoryHashes: ["b".repeat(64)],
              development: {
                mean: 0.7,
                hardPasses: 2,
                worstFamilyMean: 0.6,
              },
            };
          },
        },
      );

      expect(result.heldOutEligibility).toBe("not-run");
      const receipt = JSON.parse(
        await readFile(
          join(
            root,
            "artifacts",
            "skills",
            "kibi-usage",
            "seed-candidate.json",
          ),
          "utf8",
        ),
      ) as { artifactType?: string; bodyBytes?: number };
      expect(receipt).toEqual(
        expect.objectContaining({
          artifactType: "skillopt-resume-seed",
          bodyBytes: Buffer.byteLength(seedBody, "utf8"),
        }),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("Given an incomplete candidate seed Then training is not called", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "skillopt-real-incomplete-seed-"),
    );
    const seedPath = join(root, "incomplete-candidate.md");
    await writeFile(seedPath, "Use Kibi through MCP.\n", "utf8");
    let trainCalls = 0;
    try {
      await expect(
        runRealOptimization(
          {
            runId: RUN_ID,
            artifactRoot: join(root, "artifacts"),
            sourceWorktree: process.cwd(),
            skills: ["kibi-usage"],
            maxSteps: 1,
            seedCandidatePath: seedPath,
          },
          {
            sourceClean: async () => true,
            oneShot: async (input) =>
              freezeCandidateVariant({
                skill: input.skill,
                variant: "one-shot",
                body: completeBody("Use Kibi through MCP."),
                frontmatterHash: input.baseline.frontmatterHash,
                resourcesHash: input.baseline.resourcesHash,
                provenance: "codex-one-shot",
              }),
            evaluateDevelopment: async () => ({
              mean: 0.5,
              hardPasses: 2,
              worstFamilyMean: 0.4,
            }),
            train: async () => {
              trainCalls += 1;
              throw new Error("training should not be called");
            },
          },
        ),
      ).rejects.toThrow("optimizer_output_incomplete_body");
      expect(trainCalls).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects a dirty source worktree before any evaluation starts", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-dirty-"));
    try {
      await expect(
        runRealOptimization(
          {
            runId: RUN_ID,
            artifactRoot: root,
            sourceWorktree: process.cwd(),
            skills: ["kibi-usage"],
            maxSteps: 1,
          },
          { sourceClean: async () => false },
        ),
      ).rejects.toThrow("source_not_clean");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects an empty skill list and writes a blocked review through artifactPath", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-empty-"));
    try {
      await expect(
        runRealOptimization(
          {
            runId: RUN_ID,
            artifactRoot: root,
            sourceWorktree: process.cwd(),
            skills: [],
            maxSteps: 1,
          },
          { sourceClean: async () => true },
        ),
      ).rejects.toThrow("exactly one canonical skill");

      let written = "";
      const result = await runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: root,
          sourceWorktree: process.cwd(),
          skills: ["kibi-usage"],
          maxSteps: 1,
          artifactPath: {
            writeText: async (_name: string, text: string) => {
              written = text;
            },
          } as never,
        },
        {
          sourceClean: async () => true,
          oneShot: async (input) =>
            freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: completeBody("Use Kibi through MCP."),
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            }),
          evaluateDevelopment: async ({ candidate }) =>
            candidate.variant === "skillopt"
              ? { mean: 0.9, hardPasses: 4, worstFamilyMean: 0.85 }
              : { mean: 0.5, hardPasses: 2, worstFamilyMean: 0.4 },
          train: async (input) => {
            expect(input.initialVariant?.variant).toBe("baseline");
            return {
              status: "frozen",
              candidateBody: completeBody("Use Kibi through MCP."),
              trainerCheckpointHash: "a".repeat(64),
              trajectoryHashes: ["b".repeat(64)],
            };
          },
          evaluateHeldOut: async () => ({
            eligibility: "HELD_OUT_MATRIX_INELIGIBLE",
            cellCount: 36,
          }),
        },
      );
      expect(result.status).toBe("blocked");
      expect(result.heldOutEligibility).toBe("HELD_OUT_MATRIX_INELIGIBLE");
      expect(written).toContain('"status": "blocked"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("Given a materialized fixture run When cellRuntime is set Then descriptors stay task-scoped", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-real-runtime-"));
    const previousExit = process.exitCode;
    try {
      const publicTasks = buildSkillCatalog("kibi-usage").filter(
        (task) => task.split !== "held-out",
      );
      const fixtureRun = materializeFixtureRun({
        runRoot: join(root, "fixture-run"),
        canonicalSkillRoot: CANONICAL_SKILL_ROOT,
        publicTasks,
        heldOutTasks: [],
      });
      const trainIds: string[] = [];
      const result = await runRealOptimization(
        {
          runId: RUN_ID,
          artifactRoot: join(root, "artifacts"),
          sourceWorktree: process.cwd(),
          skills: ["kibi-usage"],
          maxSteps: 1,
          cellRuntime: {
            fixtureRunRoot: fixtureRun.roots.runRoot,
            codexExecutable: "/staged/codex",
            bwrapExecutable: "/staged/bwrap",
          },
        },
        {
          sourceClean: async () => true,
          oneShot: async (input) => {
            trainIds.push(...input.trainDescriptors.map((item) => item.id));
            return freezeCandidateVariant({
              skill: input.skill,
              variant: "one-shot",
              body: completeBody("Use Kibi through MCP."),
              frontmatterHash: input.baseline.frontmatterHash,
              resourcesHash: input.baseline.resourcesHash,
              provenance: "codex-one-shot",
            });
          },
          evaluateDevelopment: async ({ candidate }) =>
            candidate.variant === "skillopt"
              ? { mean: 0.9, hardPasses: 4, worstFamilyMean: 0.85 }
              : { mean: 0.5, hardPasses: 2, worstFamilyMean: 0.4 },
          train: async (input) => ({
            status: "frozen",
            candidateBody: completeBody("Use Kibi through MCP."),
            trainerCheckpointHash: "a".repeat(64),
            trajectoryHashes: ["b".repeat(64)],
          }),
          evaluateHeldOut: async () => ({
            eligibility: "HELD_OUT_MATRIX_INELIGIBLE",
            cellCount: 36,
          }),
        },
      );
      expect(result.status).toBe("blocked");
      expect(trainIds.length).toBeGreaterThan(0);
      expect(trainIds.every((id) => id.includes("kibi-usage"))).toBe(true);
    } finally {
      process.exitCode = previousExit;
      await rm(root, { recursive: true, force: true });
    }
  });
});
