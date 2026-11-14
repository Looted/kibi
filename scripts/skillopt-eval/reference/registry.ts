/**
 * The reference answer for each SkillOpt case: a script keyed by the case's
 * objective, or else the recorded trajectory of a case with that objective.
 * Cases that share an objective share fixture data, so one reference serves
 * all of them.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  type CanonicalSkill,
  type TaskSpec,
  buildHeldOutCatalog,
  buildPublicCatalog,
} from "../catalog";
import { KIBI_USAGE_SCRIPTS } from "./kibi-usage";
import { readRecordedReference, replayScript } from "./replay";
import type { ReferenceScript } from "./runner";

const RECORDED_ROOT = join(import.meta.dir, "recorded");

const SCRIPTS: Readonly<
  Partial<Record<CanonicalSkill, Readonly<Record<string, ReferenceScript>>>>
> = {
  "kibi-usage": KIBI_USAGE_SCRIPTS,
};

export function skillCases(skill: CanonicalSkill): readonly TaskSpec[] {
  return [...buildPublicCatalog(), ...buildHeldOutCatalog()].filter(
    (task) => task.skill === skill,
  );
}

/** Recorded reference files of `skill`, by the objective of their case. */
function recordedByObjective(
  skill: CanonicalSkill,
  cases: readonly TaskSpec[],
): ReadonlyMap<string, string> {
  const directory = join(RECORDED_ROOT, skill);
  let files: string[];
  try {
    files = readdirSync(directory).filter((file) => file.endsWith(".json"));
  } catch {
    return new Map();
  }
  const byObjective = new Map<string, string>();
  for (const file of files) {
    const task = cases.find(({ id }) => `${id}.json` === file);
    if (task === undefined)
      throw new Error(`recorded reference ${file} names no ${skill} case`);
    byObjective.set(task.taskData.objectiveCode, join(directory, file));
  }
  return byObjective;
}

/** Each case of `skill` with its reference, or `undefined` when it has none. */
export function skillReferences(
  skill: CanonicalSkill,
): readonly Readonly<{ task: TaskSpec; reference?: ReferenceScript }>[] {
  const cases = skillCases(skill);
  const scripts = SCRIPTS[skill] ?? {};
  const recorded = recordedByObjective(skill, cases);
  return cases.map((task) => {
    const objective = task.taskData.objectiveCode;
    const script = scripts[objective];
    if (script !== undefined) return { task, reference: script };
    const path = recorded.get(objective);
    if (path === undefined) return { task };
    return {
      task,
      reference: async (agent, spec) =>
        replayScript(await readRecordedReference(path))(agent, spec),
    };
  });
}
