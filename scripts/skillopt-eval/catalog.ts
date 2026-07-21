import { createHash } from "node:crypto";

export const CANONICAL_SKILLS = [
  "kibi-usage",
  "kibi-freshness",
  "kibi-traceability",
  "init-kibi",
] as const;

export type CanonicalSkill = (typeof CANONICAL_SKILLS)[number];
export type CatalogSkill = CanonicalSkill | "bundle";
export type TaskSplit = "train" | "development" | "held-out";

export type TaskSpec = Readonly<{
  id: string;
  skill: CatalogSkill;
  family: string;
  split: TaskSplit;
  fixtureSeed: string;
  prompt: string;
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
  "init-kibi": [
    "bootstrap-analysis",
    "bounded-context-questions",
    "approval-sequential-writes",
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

function taskPrompt(
  skill: CanonicalSkill,
  family: string,
  split: TaskSplit,
  index: number,
): string {
  return `Exercise ${skill} ${family} behavior for the ${split} split case ${index + 1}. Use only the public Kibi MCP workflow and leave the disposable fixture in the expected state.`;
}

export function buildSkillCatalog(skill: CanonicalSkill): readonly TaskSpec[] {
  const tasks: TaskSpec[] = [];
  for (const family of FAMILY_BY_SKILL[skill]) {
    for (const split of ["train", "development", "held-out"] as const) {
      for (let index = 0; index < SPLIT_COUNTS[split]; index += 1) {
        const id = `${skill}-${family}-${split}-${index + 1}`;
        tasks.push({
          id,
          skill,
          family,
          split,
          fixtureSeed: createHash("sha256").update(id).digest("hex"),
          prompt: taskPrompt(skill, family, split, index),
        });
      }
    }
  }
  return tasks;
}

export function buildBundleCatalog(): readonly TaskSpec[] {
  return BUNDLE_WORKFLOWS.map((workflow) => ({
    id: `bundle-${workflow}`,
    skill: "bundle",
    family: workflow.split("-").slice(0, -1).join("-"),
    split: "held-out",
    fixtureSeed: createHash("sha256").update(workflow).digest("hex"),
    prompt: `Exercise the cross-skill workflow ${workflow} using the public Kibi MCP surface.`,
  }));
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
