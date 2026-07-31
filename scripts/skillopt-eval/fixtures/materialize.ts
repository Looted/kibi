import {
  existsSync,
  mkdirSync,
  realpathSync,
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
type FixtureRunOptions = Readonly<{
  runRoot: string;
  canonicalSkillRoot: string;
  publicTasks?: readonly unknown[];
  heldOutTasks?: readonly unknown[];
  onHeldOutTaskMaterialized?: (taskId: string) => void;
}>;
type ProspectiveRoot = Readonly<{
  canonicalRoot: string;
  cleanupRoot: string;
}>;

const RESERVED_SUBTREES = new Set(["public", "held-out", "evaluator"]);

class FixtureMaterializationError extends Error {
  readonly name = "FixtureMaterializationError";
}

function prospectiveRoot(requestedRoot: string): ProspectiveRoot {
  const missing: string[] = [];
  let existingAncestor = path.resolve(requestedRoot);
  while (!existsSync(existingAncestor)) {
    missing.unshift(path.basename(existingAncestor));
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) break;
    existingAncestor = parent;
  }
  const canonicalAncestor = realpathSync(existingAncestor);
  const canonicalRoot = path.join(canonicalAncestor, ...missing);
  const segments = path
    .relative(path.parse(canonicalRoot).root, canonicalRoot)
    .split(path.sep);
  if (segments.some((segment) => RESERVED_SUBTREES.has(segment))) {
    throw new FixtureMaterializationError(
      "run root must not be inside a reserved fixture subtree",
    );
  }
  if (existsSync(canonicalRoot)) {
    throw new FixtureMaterializationError("run root must not already exist");
  }
  const firstMissing = missing[0];
  return {
    canonicalRoot,
    cleanupRoot:
      firstMissing === undefined
        ? canonicalRoot
        : path.join(canonicalAncestor, firstMissing),
  };
}

function writeEvaluator(
  evaluatorRoot: string,
  task: FixtureTaskSpec,
  targetEntry: CorpusEntry,
): CorpusEntry {
  const descriptorText = serialize(task);
  writeFileSync(
    path.join(evaluatorRoot, "descriptors", `${task.id}.json`),
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
    path.join(evaluatorRoot, "manifests", `${task.id}.json`),
    privateText,
  );
  return {
    taskId: task.id,
    manifestHash: sha256(privateText),
    workspaceHash: targetEntry.workspaceHash,
  };
}

// implements REQ-skillopt-codex-optimization
export function materializeFixtureRun(options: FixtureRunOptions) {
  const { canonicalRoot, cleanupRoot } = prospectiveRoot(options.runRoot);
  const publicTasks = (options.publicTasks ?? buildPublicCatalog()).map(
    parsePublicTaskSpec,
  );
  const heldOutTasks = (options.heldOutTasks ?? buildHeldOutCatalog()).map(
    parseHeldOutTaskSpec,
  );
  const stageRoot = `${canonicalRoot}.staging`;
  const publicRoot = path.join(stageRoot, "public");
  const heldOutRoot = path.join(stageRoot, "held-out");
  const evaluatorRoot = path.join(stageRoot, "evaluator");
  rmSync(stageRoot, { recursive: true, force: true });
  mkdirSync(publicRoot, { recursive: true });
  mkdirSync(heldOutRoot, { recursive: true });
  mkdirSync(path.join(evaluatorRoot, "descriptors"), { recursive: true });
  mkdirSync(path.join(evaluatorRoot, "manifests"), { recursive: true });

  try {
    const privateEntries: CorpusEntry[] = [];
    const publicEntries = publicTasks.map((task) => {
      const targetEntry = writeTargetTask({
        root: path.join(publicRoot, task.split),
        task,
        canonicalSkillRoot: options.canonicalSkillRoot,
        visibility: "public",
      });
      privateEntries.push(writeEvaluator(evaluatorRoot, task, targetEntry));
      return targetEntry;
    });
    const heldOutEntries: CorpusEntry[] = [];
    for (const task of heldOutTasks) {
      const targetEntry = writeTargetTask({
        root: heldOutRoot,
        task,
        canonicalSkillRoot: options.canonicalSkillRoot,
        visibility: "held-out",
      });
      heldOutEntries.push(targetEntry);
      privateEntries.push(writeEvaluator(evaluatorRoot, task, targetEntry));
      options.onHeldOutTaskMaterialized?.(task.id);
    }
    const publicIndex = buildIndex(publicEntries);
    const heldOutIndex = buildIndex(heldOutEntries);
    const privateIndex = buildIndex(privateEntries);
    writeFileSync(
      path.join(publicRoot, "corpus-manifest.json"),
      serialize(publicIndex),
    );
    writeFileSync(
      path.join(heldOutRoot, "corpus-manifest.json"),
      serialize(heldOutIndex),
    );
    writeFileSync(
      path.join(evaluatorRoot, "evaluator-manifest.json"),
      serialize(privateIndex),
    );
    renameSync(stageRoot, canonicalRoot);
    return {
      roots: {
        runRoot: canonicalRoot,
        publicRoot: path.join(canonicalRoot, "public"),
        heldOutRoot: path.join(canonicalRoot, "held-out"),
        evaluatorRoot: path.join(canonicalRoot, "evaluator"),
      },
      publicIndex,
      heldOutIndex,
      privateIndex,
    };
  } catch (error) {
    rmSync(stageRoot, { recursive: true, force: true });
    rmSync(canonicalRoot, { recursive: true, force: true });
    if (cleanupRoot !== canonicalRoot) {
      rmSync(cleanupRoot, { recursive: true, force: true });
    }
    throw error;
  }
}
