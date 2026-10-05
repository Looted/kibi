import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  type CanonicalSkill,
  buildCoreSkillCatalog,
  buildSkillCatalog,
} from "./catalog";
import { parsePublicTaskManifest } from "./fixtures/contracts";
import { materializePredicateCorpus } from "./fixtures/predicate-corpus";
import {
  type CorpusRoots,
  type PublicTaskDescriptor,
  RootsSchema,
  canonicalHash,
} from "./real-workflow-types";

/**
 * "core" limits descriptors to the four core families (the legacy optimize
 * trainer's contract); "all" adds the skill's supplemental family.
 */
// implements REQ-skillopt-codex-optimization
export type FamilyScope = "all" | "core";

function scopedCatalog(skill: CanonicalSkill, scope: FamilyScope) {
  return scope === "core"
    ? buildCoreSkillCatalog(skill)
    : buildSkillCatalog(skill);
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function publicSkillDescriptors(
  split: "train" | "development",
  skill: CanonicalSkill = "kibi-usage",
  scope: FamilyScope = "all",
): readonly PublicTaskDescriptor[] {
  return scopedCatalog(skill, scope)
    .filter((entry) => entry.split === split)
    .map((entry) => ({
      id: entry.id,
      family: entry.family,
      split,
      publicClaim: {
        taskId: entry.id,
        text: entry.prompt,
        publicManifestHash: canonicalHash(entry),
        workspaceHash: entry.fixtureSeed,
      },
    }));
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function taskScopedPublicSkillDescriptors(
  split: "train" | "development",
  fixtureRunRoot: string,
  skill: CanonicalSkill = "kibi-usage",
  scope: FamilyScope = "all",
): Promise<readonly PublicTaskDescriptor[]> {
  return Promise.all(
    scopedCatalog(skill, scope)
      .filter((entry) => entry.split === split)
      .map(async (entry) => {
        const taskPath = join(
          fixtureRunRoot,
          "public",
          split,
          "tasks",
          entry.id,
          "task.json",
        );
        const text = await readFile(taskPath, "utf8");
        const manifest = parsePublicTaskManifest(text);
        return {
          id: entry.id,
          family: entry.family,
          split,
          publicClaim: {
            taskId: entry.id,
            text: manifest.task.prompt,
            publicManifestHash: createHash("sha256")
              .update(text, "utf8")
              .digest("hex"),
            workspaceHash: manifest.workspaceHash,
          },
        };
      }),
  );
}

export async function predicateRoots(
  artifactRoot: string,
): Promise<CorpusRoots> {
  const corpusRoot = join(artifactRoot, "predicate-corpus");
  const manifestPath = join(corpusRoot, "candidate-root-manifest.json");
  if (!existsSync(manifestPath))
    return materializePredicateCorpus({ artifactRoot: corpusRoot }).roots;
  const persisted = RootsSchema.parse(
    JSON.parse(await readFile(manifestPath, "utf8")).roots,
  );
  const currentRoot = `${corpusRoot}.current`;
  try {
    const current = materializePredicateCorpus({
      artifactRoot: currentRoot,
    }).roots;
    if (canonicalHash(persisted) !== canonicalHash(current))
      throw new Error("predicate_root_drift");
    return current;
  } finally {
    await rm(currentRoot, { recursive: true, force: true });
  }
}
