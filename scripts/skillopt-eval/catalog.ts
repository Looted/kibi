import { createHash } from "node:crypto";
import {
  type FamilyPayload,
  buildBundlePayload,
  buildFamilyPayload,
} from "./fixtures/task-builders";

export const CANONICAL_SKILLS = [
  "kibi-usage",
  "kibi-freshness",
  "kibi-traceability",
  "kibi-bootstrap",
] as const;

export type CanonicalSkill = (typeof CANONICAL_SKILLS)[number];
export type CatalogSkill = CanonicalSkill | "bundle";
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
  skill: CatalogSkill;
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
};

const SPLIT_COUNTS: Readonly<Record<TaskSplit, number>> = {
  train: 2,
  development: 1,
  "held-out": 4,
};

const BUNDLE_WORKFLOWS = [
  "bootstrap-to-discovery-01",
  "bootstrap-to-discovery-02",
  "mutation-to-validation-01",
  "mutation-to-validation-02",
  "source-to-freshness-01",
  "source-to-freshness-02",
  "semantic-to-test-01",
  "semantic-to-test-02",
] as const;

function taskSpec(input: {
  readonly id: string;
  readonly skill: CatalogSkill;
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

export function buildSkillCatalog(skill: CanonicalSkill): readonly TaskSpec[] {
  const tasks: TaskSpec[] = [];
  for (const family of FAMILY_BY_SKILL[skill]) {
    for (const split of ["train", "development", "held-out"] as const) {
      for (let index = 0; index < SPLIT_COUNTS[split]; index += 1) {
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

export function buildBundleCatalog(): readonly TaskSpec[] {
  return BUNDLE_WORKFLOWS.map((workflow) =>
    taskSpec({
      id: `bundle-${workflow}`,
      skill: "bundle",
      family: workflow.split("-").slice(0, -1).join("-"),
      split: "held-out",
      payload: buildBundlePayload(workflow),
    }),
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
  return [
    ...CANONICAL_SKILLS.flatMap((skill) =>
      buildSkillCatalog(skill).filter((task) => task.split === "held-out"),
    ),
    ...buildBundleCatalog(),
  ];
}

export function validateSkillCatalog(
  tasks: readonly TaskSpec[],
  expectedSkill: CanonicalSkill,
): void {
  if (tasks.length !== 28) {
    throw new CatalogError(`expected 28 tasks, received ${tasks.length}`);
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
  for (const family of FAMILY_BY_SKILL[expectedSkill]) {
    const familyTasks = tasks.filter((task) => task.family === family);
    if (familyTasks.length !== 7) {
      throw new CatalogError(`family ${family} must contain 7 tasks`);
    }
    for (const split of ["train", "development", "held-out"] as const) {
      const splitCount = familyTasks.filter(
        (task) => task.split === split,
      ).length;
      if (splitCount !== SPLIT_COUNTS[split]) {
        throw new CatalogError(
          `${family}/${split} must contain ${SPLIT_COUNTS[split]} tasks`,
        );
      }
    }
  }
}

export function catalogHash(tasks: readonly TaskSpec[]): string {
  return createHash("sha256").update(JSON.stringify(tasks)).digest("hex");
}
