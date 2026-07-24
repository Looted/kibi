import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { parseTaskSpec } from "./contracts";
import {
  parseCorpusIndexValue,
  parseHeldOutTaskManifestValue,
  parsePublicTaskManifestValue,
} from "./contracts";
import { writePublicWorkspace } from "./workspace";

type FixtureTaskSpec = ReturnType<typeof parseTaskSpec>;
export type CorpusEntry = Readonly<{
  taskId: string;
  manifestHash: string;
  workspaceHash: string;
}>;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function buildIndex(entries: readonly CorpusEntry[]) {
  return parseCorpusIndexValue({
    schemaVersion: "1.1.0",
    corpusHash: sha256(serialize(entries)),
    tasks: entries,
  });
}

function publicTask(task: FixtureTaskSpec) {
  return {
    id: task.id,
    skill: task.skill,
    family: task.family,
    split: task.split,
    prompt: task.prompt,
    activationMode: task.activationMode,
    initialState: task.initialState,
    allowedPublicFiles: task.allowedPublicFiles,
    taskData: task.taskData,
    host: "codex" as const,
  };
}

// implements REQ-skillopt-codex-optimization
export function writeTargetTask(input: {
  readonly root: string;
  readonly task: FixtureTaskSpec;
  readonly canonicalSkillRoot: string;
  readonly visibility: "public" | "held-out";
}): CorpusEntry {
  const taskRoot = path.join(input.root, "tasks", input.task.id);
  const workspaceRoot = path.join(taskRoot, "workspace");
  mkdirSync(workspaceRoot, { recursive: true });
  const workspaceHash = writePublicWorkspace({
    root: workspaceRoot,
    task: input.task,
    canonicalSkillRoot: input.canonicalSkillRoot,
  });
  const candidate = {
    schemaVersion: "1.1.0",
    task: publicTask(input.task),
    workspaceHash,
    blindVariantSlots: ["variant-a", "variant-b", "variant-c"],
  };
  const manifest =
    input.visibility === "public"
      ? parsePublicTaskManifestValue(candidate)
      : parseHeldOutTaskManifestValue(candidate);
  const text = serialize(manifest);
  const manifestHash = sha256(text);
  writeFileSync(path.join(taskRoot, "task.json"), text);
  return { taskId: input.task.id, manifestHash, workspaceHash };
}
