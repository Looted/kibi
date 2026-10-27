import { createHash } from "node:crypto";
import {
  PREDICATE_FAMILY_ALLOCATION,
  isPredicateFamily,
} from "./fixtures/predicate-cases";
import {
  type FamilyPayload,
  buildFamilyPayload,
} from "./fixtures/task-builders";

export const CANONICAL_SKILLS = [
  "kibi-usage",
  "kibi-freshness",
  "kibi-traceability",
  "kibi-bootstrap",
  "kibi-decisions",
  "kibi-commit-review",
] as const;

export type CanonicalSkill = (typeof CANONICAL_SKILLS)[number];
export type TaskSplit = "train" | "development" | "held-out";
export type ActivationMode =
  | "cold_start_bootstrap"
  | "repair_bootstrap"
  | "attached_thin_bootstrap"
  | "attached_seeded_handoff";
export type RepositoryState = "cold-start" | "partial" | "thin" | "seeded";
export type KnowledgeState = "absent" | "partial" | "fresh" | "stale";
export type WorktreeState = "clean" | "dirty";
export type ApprovalPhase = "not-applicable" | "pre-approval" | "post-approval";
export type AdversarialCase =
  | "malformed-input"
  | "prompt-injection"
  | "dirty-state"
  | "stale-state"
  | "misleading-success"
  | "interruption-cleanup"
  | "approval-boundary";

export type TaskSpec = Readonly<{
  id: string;
  skill: CanonicalSkill;
  family: string;
  split: TaskSplit;
  fixtureSeed: string;
  prompt: string;
  activationMode: ActivationMode;
  initialState: Readonly<{
    repository: RepositoryState;
    kb: KnowledgeState;
    worktree: WorktreeState;
    setupBoundary: "external-kibi-adapter";
  }>;
  allowedPublicFiles: readonly string[];
  scorerReference: string;
  taskData: Readonly<{
    objectiveCode: string;
    sourceFile: string;
    mutation: "read-only" | "write";
    approvalPhase: ApprovalPhase;
    adversarialCases: readonly AdversarialCase[];
  }>;
}>;

class CatalogError extends Error {
  readonly name = "CatalogError";
}

const FAMILY_BY_SKILL: Readonly<Record<CanonicalSkill, readonly string[]>> = {
  "kibi-usage": [
    "discovery-exact-lookup",
    "safe-mutation-direction",
    "fact-predicate-modeling",
    "validation-recovery",
  ],
  "kibi-freshness": [
    "branch-status-classification",
    "stale-state-recovery",
    "source-linked-impact",
    "completion-outcome",
  ],
  "kibi-traceability": [
    "requirement-discovery",
    "symbol-impact-granularity",
    "relationship-chain",
    "executable-coverage",
  ],
  "kibi-bootstrap": [
    "bootstrap-analysis",
    "bounded-context-questions",
    "approval-plan-apply",
    "repair-escalation",
  ],
  "kibi-decisions": [
    "stated-rule-capture",
    "firm-rule-conflict",
    "supersede-with-reason",
    "compile-intent-review",
  ],
  "kibi-commit-review": [
    "staged-impact-missing",
    "coordinate-cache-staged",
    "impact-review-preparation",
    "staged-rule-conflict",
  ],
};

/**
 * Supplemental families per skill, after the four core families. They join
 * the public development/train cohort (campaign evaluate, development screen)
 * and the materialized held-out corpus, but not the legacy optimize trainer
 * or the 16-task held-out gate matrix, whose contracts stay on the four core
 * families (see buildCoreSkillCatalog).
 */
const SUPPLEMENTAL_FAMILIES_BY_SKILL: Readonly<
  Partial<Record<CanonicalSkill, readonly string[]>>
> = {
  "kibi-usage": ["intent-consult", "rule-lane-modeling"],
  "kibi-freshness": ["consistency-report"],
  "kibi-traceability": ["scenario-feasibility"],
  "kibi-bootstrap": ["onboarding-review"],
  "kibi-decisions": ["unrecorded-change-closeout"],
  "kibi-commit-review": ["merge-commit-scope"],
};

const CORE_FAMILIES_PER_SKILL = 4;
const MAX_FAMILIES_PER_SKILL = 6;

/** Core families followed by the skill's supplemental families, if any. */
// implements REQ-skillopt-codex-optimization
export function skillFamilies(skill: CanonicalSkill): readonly string[] {
  return [
    ...FAMILY_BY_SKILL[skill],
    ...(SUPPLEMENTAL_FAMILIES_BY_SKILL[skill] ?? []),
  ];
}

// implements REQ-skillopt-codex-optimization
export function isSupplementalFamily(
  skill: CanonicalSkill,
  family: string,
): boolean {
  return SUPPLEMENTAL_FAMILIES_BY_SKILL[skill]?.includes(family) === true;
}

const SPLIT_COUNTS: Readonly<Record<TaskSplit, number>> = {
  train: 2,
  development: 1,
  "held-out": 4,
};

/**
 * Supplemental families with a second development task, so a later case is
 * screened next to the family's first development case.
 */
const SPLIT_COUNT_OVERRIDES: Readonly<
  Record<string, Readonly<Record<TaskSplit, number>>>
> = {
  "consistency-report": { train: 3, development: 4, "held-out": 6 },
};

/**
 * Tasks per split for one family: 2/1/4 (seven tasks) unless overridden.
 * Predicate families follow the predicate case registry's allocation.
 */
// implements REQ-skillopt-codex-optimization
export function familySplitCounts(
  family: string,
): Readonly<Record<TaskSplit, number>> {
  return isPredicateFamily(family)
    ? PREDICATE_FAMILY_ALLOCATION[family]
    : (SPLIT_COUNT_OVERRIDES[family] ?? SPLIT_COUNTS);
}

function familyTaskCount(family: string): number {
  const counts = familySplitCounts(family);
  return counts.train + counts.development + counts["held-out"];
}

function taskSpec(input: {
  readonly id: string;
  readonly skill: CanonicalSkill;
  readonly family: string;
  readonly split: TaskSplit;
  readonly payload: FamilyPayload;
}): TaskSpec {
  return {
    id: input.id,
    skill: input.skill,
    family: input.family,
    split: input.split,
    fixtureSeed: createHash("sha256").update(input.id).digest("hex"),
    scorerReference: `scorer-ref-${createHash("sha256").update(`${input.id}:scorer`).digest("hex").slice(0, 16)}`,
    ...input.payload,
  };
}

/** Every family of one skill, supplemental family included. */
// implements REQ-skillopt-codex-optimization
export function buildSkillCatalog(skill: CanonicalSkill): readonly TaskSpec[] {
  const tasks: TaskSpec[] = [];
  for (const family of skillFamilies(skill)) {
    for (const split of ["train", "development", "held-out"] as const) {
      for (
        let index = 0;
        index < familySplitCounts(family)[split];
        index += 1
      ) {
        const id = `${skill}-${family}-${split}-${index + 1}`;
        tasks.push(
          taskSpec({
            id,
            skill,
            split,
            family,
            payload: buildFamilyPayload({ skill, family, split, index }),
          }),
        );
      }
    }
  }
  return tasks;
}

/**
 * The four core families only: the cohort the legacy optimize trainer and the
 * 16-task held-out gate matrix are contracted to.
 */
// implements REQ-skillopt-codex-optimization
export function buildCoreSkillCatalog(
  skill: CanonicalSkill,
): readonly TaskSpec[] {
  return buildSkillCatalog(skill).filter(
    (task) => !isSupplementalFamily(skill, task.family),
  );
}

// implements REQ-skillopt-codex-optimization
export function buildPublicCatalog(): readonly TaskSpec[] {
  return CANONICAL_SKILLS.flatMap((skill) =>
    buildSkillCatalog(skill).filter((task) => task.split !== "held-out"),
  );
}

// implements REQ-skillopt-codex-optimization
export function buildHeldOutCatalog(): readonly TaskSpec[] {
  return CANONICAL_SKILLS.flatMap((skill) =>
    buildSkillCatalog(skill).filter((task) => task.split === "held-out"),
  );
}

// implements REQ-skillopt-codex-optimization
export function validateSkillCatalog(
  tasks: readonly TaskSpec[],
  expectedSkill: CanonicalSkill,
): void {
  const families = skillFamilies(expectedSkill);
  if (
    families.length < CORE_FAMILIES_PER_SKILL ||
    families.length > MAX_FAMILIES_PER_SKILL
  ) {
    throw new CatalogError(
      `expected ${CORE_FAMILIES_PER_SKILL}..${MAX_FAMILIES_PER_SKILL} families, received ${families.length}`,
    );
  }
  const expectedTasks = families.reduce(
    (total, family) => total + familyTaskCount(family),
    0,
  );
  if (tasks.length !== expectedTasks) {
    throw new CatalogError(
      `expected ${expectedTasks} tasks, received ${tasks.length}`,
    );
  }
  const ids = new Set<string>();
  for (const task of tasks) {
    if (ids.has(task.id)) {
      throw new CatalogError(`duplicate task ID: ${task.id}`);
    }
    ids.add(task.id);
    if (task.skill !== expectedSkill) {
      throw new CatalogError(`unexpected skill: ${task.skill}`);
    }
  }
  for (const family of families) {
    const familyTasks = tasks.filter((task) => task.family === family);
    if (familyTasks.length !== familyTaskCount(family)) {
      throw new CatalogError(
        `family ${family} must contain ${familyTaskCount(family)} tasks`,
      );
    }
    const counts = familySplitCounts(family);
    for (const split of ["train", "development", "held-out"] as const) {
      const splitCount = familyTasks.filter(
        (task) => task.split === split,
      ).length;
      if (splitCount !== counts[split]) {
        throw new CatalogError(
          `${family}/${split} must contain ${counts[split]} tasks`,
        );
      }
    }
  }
}

export function catalogHash(tasks: readonly TaskSpec[]): string {
  return createHash("sha256").update(JSON.stringify(tasks)).digest("hex");
}
