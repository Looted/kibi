import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  loadBundledSkill,
  readBundledSkillResource,
} from "../../packages/cli/src/public/skills";
import {
  CANONICAL_SKILLS,
  type CanonicalSkill,
  buildSkillCatalog,
} from "./catalog";
import { JsonValueSchema, contractHash } from "./contracts/common";
import { type OptimizationResult, optimizeSkillOptVariant } from "./optimize";
import { RunStore } from "./orchestration-store";
import { sourceWorktreeIsClean } from "./preflight";
import { runCodexSkillOptStep } from "./runtime/codex-optimizer";
import {
  adoptSkillOptCandidate,
  type AdoptionReceipt,
  type AutoAdoptionInput,
} from "./adoption";
import { createBaselineVariant } from "./variants";

const ReviewSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-optimization-review"),
    runId: z.string().min(1),
    status: z.enum(["auto-adopted", "no-change", "blocked"]),
    artifactRoot: z.string().min(1),
    skills: z.array(z.enum(CANONICAL_SKILLS)).min(1),
    candidates: z
      .array(
        z
          .object({
            skill: z.enum(CANONICAL_SKILLS),
            baselineBodyHash: z.string().regex(/^[a-f0-9]{64}$/),
            candidateBodyHash: z.string().regex(/^[a-f0-9]{64}$/),
            candidatePath: z.string().min(1),
            evaluation: z.enum(["safety-passed", "blocked"]),
            approvalRequired: z.literal(false),
            adoption: z.enum(["auto-adopted", "unchanged", "blocked"]),
          })
          .strict(),
      )
      .min(1),
    sourceModified: z.boolean(),
    adoption: z.enum(["auto-adopted", "no-change", "blocked"]),
    generatedAt: z.iso.datetime(),
  })
  .strict();

export type RealOptimizationOptions = Readonly<{
  runId: string;
  artifactRoot: string;
  sourceWorktree: string;
  skills: readonly CanonicalSkill[];
  maxSteps: number;
  env?: NodeJS.ProcessEnv;
}>;

export type RealOptimizationResult = Readonly<{
  status: "auto-adopted" | "no-change" | "blocked";
  runId: string;
  skills: readonly CanonicalSkill[];
  candidates: readonly Readonly<{
    skill: CanonicalSkill;
    candidateBodyHash: string;
  }>[];
  paidModelCalls: number;
}>;

export type OptimizeInput = Readonly<{
  skill: CanonicalSkill;
  baselineBody: string;
  frontmatterHash: string;
  resourcesHash: string;
  trainTrajectories: readonly Readonly<{
    taskId: string;
    family: string;
    reflection: string;
  }>[];
  maxSteps: number;
  artifactRoot: string;
  sourceWorktree: string;
  runId: string;
  env?: NodeJS.ProcessEnv;
}>;

export type RealOptimizationDependencies = Readonly<{
  sourceClean: (
    sourceWorktree: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<boolean>;
  optimize: (input: OptimizeInput) => Promise<OptimizationResult>;
  adopt: (
    input: AutoAdoptionInput,
  ) => Promise<AdoptionReceipt>;
}>;

function canonicalHash(value: unknown): string {
  return contractHash(JsonValueSchema.parse(value));
}

async function surface(skill: CanonicalSkill) {
  const bundle = loadBundledSkill(skill);
  const resources = Object.fromEntries(
    await Promise.all(
      [...(bundle.manifest.resources ?? [])]
        .sort()
        .map(async (resource) => [
          resource,
          readBundledSkillResource(skill, resource),
        ]),
    ),
  );
  return {
    body: bundle.body,
    frontmatterHash: canonicalHash(bundle.manifest),
    resourcesHash: canonicalHash(resources),
  } as const;
}

async function defaultOptimize(
  input: OptimizeInput,
): Promise<OptimizationResult> {
  return optimizeSkillOptVariant(
    {
      skill: input.skill,
      baselineBody: input.baselineBody,
      frontmatterHash: input.frontmatterHash,
      resourcesHash: input.resourcesHash,
      baselineDevelopment: { mean: 0, hardPasses: 0, worstFamilyMean: 0 },
      trainTrajectories: input.trainTrajectories,
      maxSteps: input.maxSteps,
      artifactRoot: join(input.artifactRoot, "skillopt"),
    },
    {
      runStep: (request) =>
        runCodexSkillOptStep({
          sourceWorktree: input.sourceWorktree,
          artifactRoot: input.artifactRoot,
          runId: input.runId,
          request,
          env: input.env,
        }),
    },
  );
}

// implements REQ-skillopt-automatic-adoption
export async function runRealOptimization(
  options: RealOptimizationOptions,
  dependencies: Partial<RealOptimizationDependencies> = {},
): Promise<RealOptimizationResult> {
  const root = resolve(options.artifactRoot);
  const env = options.env ?? process.env;
  const sourceClean =
    dependencies.sourceClean ??
    ((source, currentEnv) => sourceWorktreeIsClean(source, currentEnv));
  if (!(await sourceClean(resolve(options.sourceWorktree), env))) {
    throw new Error("source_not_clean");
  }
  const optimize = dependencies.optimize ?? defaultOptimize;
  const adopt = dependencies.adopt ?? adoptSkillOptCandidate;
  const store = new RunStore(root, options.runId);
  await store.acquire();
  try {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const candidates: Array<{
      skill: CanonicalSkill;
      baselineBodyHash: string;
      candidateBodyHash: string;
      candidatePath: string;
      evaluation: "safety-passed" | "blocked";
      adoption: "auto-adopted" | "unchanged" | "blocked";
    }> = [];
    let paidModelCalls = 0;
    for (const skill of options.skills) {
      const loaded = await surface(skill);
      const baseline = createBaselineVariant({
        skill,
        body: loaded.body,
        frontmatterHash: loaded.frontmatterHash,
        resourcesHash: loaded.resourcesHash,
      });
      const trainTrajectories = buildSkillCatalog(skill)
        .filter((task) => task.split === "train")
        .map((task) => ({
          taskId: task.id,
          family: task.family,
          reflection: task.prompt,
        }));
      const skillRoot = join(root, "skills", skill);
      const result = await optimize({
        skill,
        baselineBody: baseline.body,
        frontmatterHash: baseline.frontmatterHash,
        resourcesHash: baseline.resourcesHash,
        trainTrajectories,
        maxSteps: options.maxSteps,
        artifactRoot: skillRoot,
        sourceWorktree: resolve(options.sourceWorktree),
        runId: options.runId,
        env,
      });
      if (result.status !== "frozen") {
        throw new Error(`skillopt_candidate_invalid:${skill}`);
      }
      const candidate = result.steps.at(-1)?.candidate ?? result.bestSkill;
      const candidatePath = join(skillRoot, "candidate_skill.md");
      await mkdir(skillRoot, { recursive: true, mode: 0o700 });
      await Promise.all([
        writeFile(
          join(skillRoot, "baseline_variant.json"),
          `${JSON.stringify(baseline)}\n`,
          { mode: 0o600 },
        ),
        writeFile(
          join(skillRoot, "candidate_variant.json"),
          `${JSON.stringify(candidate)}\n`,
          { mode: 0o600 },
        ),
        writeFile(candidatePath, candidate.body, {
          encoding: "utf8",
          mode: 0o600,
        }),
      ]);
      const generatedCandidate = result.steps.length > 0 && candidate.variant === "skillopt";
      const adoptionStatus = generatedCandidate
        ? (await adopt({
            repoRoot: resolve(options.sourceWorktree),
            candidate,
            frontmatterHash: baseline.frontmatterHash,
            resourcesHash: baseline.resourcesHash,
          })).status === "adopted"
          ? "auto-adopted"
          : "unchanged"
        : "blocked";
      paidModelCalls += result.steps.length;
      candidates.push({
        skill,
        baselineBodyHash: baseline.bodyHash,
        candidateBodyHash: candidate.bodyHash,
        candidatePath,
        evaluation: generatedCandidate ? "safety-passed" : "blocked",
        adoption: adoptionStatus,
      });
    }
    const blocked = candidates.some(({ adoption }) => adoption === "blocked");
    const adopted = candidates.some(({ adoption }) => adoption === "auto-adopted");
    const status = blocked ? "blocked" : adopted ? "auto-adopted" : "no-change";
    const review = ReviewSchema.parse({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-optimization-review",
      runId: options.runId,
      status,
      artifactRoot: root,
      skills: [...options.skills],
      candidates: candidates.map((candidate) => ({
        ...candidate,
        evaluation: candidate.evaluation,
        approvalRequired: false,
        adoption: candidate.adoption,
      })),
      sourceModified: adopted,
      adoption: status,
      generatedAt: new Date().toISOString(),
    });
    await writeFile(
      join(root, "optimization-review.json"),
      `${JSON.stringify(review, null, 2)}\n`,
      {
        encoding: "utf8",
        mode: 0o600,
      },
    );
    return {
      status,
      runId: options.runId,
      skills: [...options.skills],
      candidates: candidates.map(({ skill, candidateBodyHash }) => ({
        skill,
        candidateBodyHash,
      })),
      paidModelCalls,
    };
  } finally {
    await store.release();
  }
}
