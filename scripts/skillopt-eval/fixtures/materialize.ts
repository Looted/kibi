import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  CANONICAL_SKILLS,
  type TaskSpec,
  buildBundleCatalog,
  buildSkillCatalog,
} from "../catalog";
import {
  parseCorpusIndexValue,
  parsePrivateEvaluatorManifestValue,
  parsePublicTaskManifestValue,
  parseTaskSpec,
} from "./contracts";
import { buildPrivateManifest } from "./evaluator";
import { writePublicWorkspace } from "./workspace";

type MaterializeOptions = Readonly<{
  targetMount: string;
  evaluatorRoot: string;
  tasks?: readonly unknown[];
  onTaskMaterialized?: (taskId: string) => void;
}>;

class FixtureMaterializationError extends Error {
  readonly name = "FixtureMaterializationError";
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertIsolatedRoots(targetMount: string, evaluatorRoot: string): void {
  const publicRoot = path.resolve(targetMount);
  const privateRoot = path.resolve(evaluatorRoot);
  const relation = path.relative(publicRoot, privateRoot);
  const reverse = path.relative(privateRoot, publicRoot);
  if (
    relation === "" ||
    (!relation.startsWith("..") && !path.isAbsolute(relation)) ||
    (!reverse.startsWith("..") && !path.isAbsolute(reverse))
  ) {
    throw new FixtureMaterializationError(
      "evaluator root and target mount must be disjoint",
    );
  }
}

function defaultTasks(): readonly TaskSpec[] {
  return [
    ...CANONICAL_SKILLS.flatMap((skill) => buildSkillCatalog(skill)),
    ...buildBundleCatalog(),
  ];
}

type CorpusEntry = Readonly<{
  taskId: string;
  manifestHash: string;
  workspaceHash: string;
}>;

function buildIndex(entries: readonly CorpusEntry[], corpusHash: string) {
  return parseCorpusIndexValue({
    schemaVersion: "1.0.0",
    corpusHash,
    tasks: entries,
  });
}

// implements REQ-skillopt-codex-optimization
export function materializeCorpus(options: MaterializeOptions) {
  assertIsolatedRoots(options.targetMount, options.evaluatorRoot);
  if (existsSync(options.targetMount) || existsSync(options.evaluatorRoot)) {
    throw new FixtureMaterializationError(
      "materialization roots must not already exist",
    );
  }
  const tasks = (options.tasks ?? defaultTasks()).map(parseTaskSpec);
  const publicStage = `${options.targetMount}.staging`;
  const privateStage = `${options.evaluatorRoot}.staging`;
  rmSync(publicStage, { recursive: true, force: true });
  rmSync(privateStage, { recursive: true, force: true });
  mkdirSync(path.join(publicStage, "tasks"), { recursive: true });
  mkdirSync(path.join(privateStage, "manifests"), { recursive: true });

  const publicEntries: CorpusEntry[] = [];
  const privateEntries: CorpusEntry[] = [];
  try {
    for (const task of tasks) {
      const taskRoot = path.join(publicStage, "tasks", task.id);
      const workspaceRoot = path.join(taskRoot, "workspace");
      mkdirSync(workspaceRoot, { recursive: true });
      const workspaceHash = writePublicWorkspace(workspaceRoot, task);
      const publicManifest = parsePublicTaskManifestValue({
        schemaVersion: "1.0.0",
        task: {
          id: task.id,
          skill: task.skill,
          family: task.family,
          split: task.split,
          prompt: task.prompt,
          host: "codex",
        },
        workspaceHash,
        blindVariantSlots: ["variant-a", "variant-b", "variant-c"],
      });
      const publicText = serialize(publicManifest);
      const publicManifestHash = sha256(publicText);
      writeFileSync(path.join(taskRoot, "task.json"), publicText);

      const privateManifest = parsePrivateEvaluatorManifestValue(
        buildPrivateManifest({ task, publicManifestHash, workspaceHash }),
      );
      const privateText = serialize(privateManifest);
      const privateManifestHash = sha256(privateText);
      writeFileSync(
        path.join(privateStage, "manifests", `${task.id}.json`),
        privateText,
      );
      publicEntries.push({
        taskId: task.id,
        manifestHash: publicManifestHash,
        workspaceHash,
      });
      privateEntries.push({
        taskId: task.id,
        manifestHash: privateManifestHash,
        workspaceHash,
      });
      options.onTaskMaterialized?.(task.id);
    }

    const publicIndex = buildIndex(
      publicEntries,
      sha256(serialize(publicEntries)),
    );
    const privateIndex = buildIndex(
      privateEntries,
      sha256(serialize(privateEntries)),
    );
    writeFileSync(
      path.join(publicStage, "corpus-manifest.json"),
      serialize(publicIndex),
    );
    writeFileSync(
      path.join(privateStage, "evaluator-manifest.json"),
      serialize(privateIndex),
    );
    mkdirSync(path.dirname(options.evaluatorRoot), { recursive: true });
    mkdirSync(path.dirname(options.targetMount), { recursive: true });
    renameSync(privateStage, options.evaluatorRoot);
    try {
      renameSync(publicStage, options.targetMount);
    } catch (error) {
      rmSync(options.evaluatorRoot, { recursive: true, force: true });
      throw error;
    }
    return { publicIndex, privateIndex };
  } catch (error) {
    rmSync(publicStage, { recursive: true, force: true });
    rmSync(privateStage, { recursive: true, force: true });
    throw error;
  }
}
