import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { parsePublicTaskManifest } from "./fixtures/contracts";
import { PREDICATE_CASES } from "./fixtures/predicate-cases";
import { materializePredicateCorpus } from "./fixtures/predicate-corpus";
import {
  type CorpusRoots,
  type PredicateDescriptor,
  RootsSchema,
  canonicalHash,
} from "./real-workflow-types";

export function predicateDescriptors(
  split: "train" | "development",
): readonly PredicateDescriptor[] {
  return PREDICATE_CASES.filter((entry) => entry.split === split).map(
    (entry) => ({
      id: entry.caseId,
      family: entry.semanticClass,
      split,
      publicClaim: entry.publicClaim,
    }),
  );
}

export async function taskScopedDescriptors(
  split: "train" | "development",
  fixtureRunRoot: string,
): Promise<readonly PredicateDescriptor[]> {
  return Promise.all(
    PREDICATE_CASES.filter((entry) => entry.split === split).map(
      async (entry) => {
        const taskPath = join(
          fixtureRunRoot,
          "public",
          split,
          "tasks",
          entry.caseId,
          "task.json",
        );
        const text = await readFile(taskPath, "utf8");
        const manifest = parsePublicTaskManifest(text);
        return {
          id: entry.caseId,
          family: entry.semanticClass,
          split,
          publicClaim: {
            taskId: entry.caseId,
            text: manifest.task.prompt,
            publicManifestHash: createHash("sha256")
              .update(text, "utf8")
              .digest("hex"),
            workspaceHash: manifest.workspaceHash,
          },
        };
      },
    ),
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
