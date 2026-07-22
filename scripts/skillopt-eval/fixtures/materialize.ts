import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { buildHeldOutCatalog, buildPublicCatalog } from "../catalog";
import {
  parseHeldOutTaskSpec,
  parsePublicTaskSpec,
  type parseTaskSpec,
} from "./contracts";
import { buildPrivateManifest } from "./evaluator";
import { parsePrivateEvaluatorManifestValue } from "./evaluator-contracts";
import {
  type CorpusEntry,
  buildIndex,
  serialize,
  sha256,
  writeTargetTask,
} from "./materialize-common";

type FixtureTaskSpec = ReturnType<typeof parseTaskSpec>;
type PublicOptions = Readonly<{
  publicRoot: string;
  canonicalSkillRoot: string;
  tasks?: readonly unknown[];
}>;
type HeldOutOptions = Readonly<{
  heldOutRoot: string;
  evaluatorRoot: string;
  canonicalSkillRoot: string;
  tasks?: readonly unknown[];
  onTaskMaterialized?: (taskId: string) => void;
}>;

class FixtureMaterializationError extends Error {
  readonly name = "FixtureMaterializationError";
}

function assertNewRoot(root: string): void {
  if (existsSync(root)) {
    throw new FixtureMaterializationError(
      "materialization roots must not already exist",
    );
  }
}

function assertDisjointRoots(left: string, right: string): void {
  const relation = path.relative(path.resolve(left), path.resolve(right));
  const reverse = path.relative(path.resolve(right), path.resolve(left));
  if (
    relation === "" ||
    (!relation.startsWith("..") && !path.isAbsolute(relation)) ||
    (!reverse.startsWith("..") && !path.isAbsolute(reverse))
  ) {
    throw new FixtureMaterializationError(
      "held-out and evaluator roots must be disjoint",
    );
  }
}

function stageRoot(root: string): string {
  const stage = `${root}.staging`;
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  return stage;
}

function publishStage(stage: string, root: string): void {
  mkdirSync(path.dirname(root), { recursive: true });
  renameSync(stage, root);
}

function writeHeldOutEvaluator(
  evaluatorStage: string,
  task: FixtureTaskSpec,
  targetEntry: CorpusEntry,
): CorpusEntry {
  const descriptorText = serialize(task);
  writeFileSync(
    path.join(evaluatorStage, "descriptors", `${task.id}.json`),
    descriptorText,
  );
  const privateManifest = parsePrivateEvaluatorManifestValue(
    buildPrivateManifest({
      task,
      publicManifestHash: targetEntry.manifestHash,
      workspaceHash: targetEntry.workspaceHash,
    }),
  );
  const privateText = serialize(privateManifest);
  writeFileSync(
    path.join(evaluatorStage, "manifests", `${task.id}.json`),
    privateText,
  );
  return {
    taskId: task.id,
    manifestHash: sha256(privateText),
    workspaceHash: targetEntry.workspaceHash,
  };
}

// implements REQ-skillopt-codex-optimization
export function materializePublicCorpus(options: PublicOptions) {
  assertNewRoot(options.publicRoot);
  const tasks = (options.tasks ?? buildPublicCatalog()).map(
    parsePublicTaskSpec,
  );
  const stage = stageRoot(options.publicRoot);
  try {
    const entries = tasks.map((task) =>
      writeTargetTask({
        root: path.join(stage, task.split),
        task,
        canonicalSkillRoot: options.canonicalSkillRoot,
        visibility: "public",
      }),
    );
    const publicIndex = buildIndex(entries);
    writeFileSync(
      path.join(stage, "corpus-manifest.json"),
      serialize(publicIndex),
    );
    publishStage(stage, options.publicRoot);
    return { publicIndex };
  } catch (error) {
    rmSync(stage, { recursive: true, force: true });
    throw error;
  }
}

// implements REQ-skillopt-codex-optimization
export function materializeHeldOutCorpus(options: HeldOutOptions) {
  assertDisjointRoots(options.heldOutRoot, options.evaluatorRoot);
  assertNewRoot(options.heldOutRoot);
  assertNewRoot(options.evaluatorRoot);
  const tasks = (options.tasks ?? buildHeldOutCatalog()).map(
    parseHeldOutTaskSpec,
  );
  const targetStage = stageRoot(options.heldOutRoot);
  const evaluatorStage = stageRoot(options.evaluatorRoot);
  mkdirSync(path.join(evaluatorStage, "descriptors"), { recursive: true });
  mkdirSync(path.join(evaluatorStage, "manifests"), { recursive: true });
  try {
    const targetEntries: CorpusEntry[] = [];
    const privateEntries: CorpusEntry[] = [];
    for (const task of tasks) {
      const targetEntry = writeTargetTask({
        root: targetStage,
        task,
        canonicalSkillRoot: options.canonicalSkillRoot,
        visibility: "held-out",
      });
      targetEntries.push(targetEntry);
      privateEntries.push(
        writeHeldOutEvaluator(evaluatorStage, task, targetEntry),
      );
      options.onTaskMaterialized?.(task.id);
    }
    const heldOutIndex = buildIndex(targetEntries);
    const privateIndex = buildIndex(privateEntries);
    writeFileSync(
      path.join(targetStage, "corpus-manifest.json"),
      serialize(heldOutIndex),
    );
    writeFileSync(
      path.join(evaluatorStage, "evaluator-manifest.json"),
      serialize(privateIndex),
    );
    publishStage(evaluatorStage, options.evaluatorRoot);
    try {
      publishStage(targetStage, options.heldOutRoot);
    } catch (error) {
      rmSync(options.evaluatorRoot, { recursive: true, force: true });
      throw error;
    }
    return { heldOutIndex, privateIndex };
  } catch (error) {
    rmSync(targetStage, { recursive: true, force: true });
    rmSync(evaluatorStage, { recursive: true, force: true });
    throw error;
  }
}
