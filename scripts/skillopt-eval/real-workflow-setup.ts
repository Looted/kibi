import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { buildSkillCatalog } from "./catalog";
import { parsePublicTaskManifest } from "./fixtures/contracts";
import { materializePredicateCorpus } from "./fixtures/predicate-corpus";
import {
  type CorpusRoots,
  type PublicTaskDescriptor,
  RootsSchema,
  canonicalHash,
} from "./real-workflow-types";

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function publicSkillDescriptors(
  split: "train" | "development",
): readonly PublicTaskDescriptor[] {
  return buildSkillCatalog("kibi-usage")
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
): Promise<readonly PublicTaskDescriptor[]> {
  return Promise.all(
    buildSkillCatalog("kibi-usage")
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
