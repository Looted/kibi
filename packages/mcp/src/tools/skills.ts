import {
  type OperationContext,
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
} from "kibi-runtime";
import { loadBundledSkill } from "kibi-runtime";

export type SkillsListArgs = Record<string, never>;
export type SkillsListResult = Awaited<
  ReturnType<typeof skillsListSpec.execute>
>;

export type SkillsLoadArgs = Readonly<Record<string, unknown>> & {
  readonly id: string;
};

export type SkillsLoadResult = Awaited<
  ReturnType<typeof skillsLoadSpec.execute>
>;

export type SkillsReadArgs = Readonly<Record<string, unknown>> & {
  readonly id: string;
  readonly resource: string;
};

export type SkillsReadResult = Awaited<
  ReturnType<typeof skillsReadSpec.execute>
>;

function runtimeContext(): OperationContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: (): Date => new Date(),
  };
}

// implements REQ-001
export async function handleKbSkillsList(
  _args: SkillsListArgs,
): Promise<SkillsListResult> {
  try {
    return await skillsListSpec.execute({}, runtimeContext());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Skills list failed: ${message}`);
  }
}

// implements REQ-001
export async function handleKbSkillsLoad(
  args: SkillsLoadArgs,
): Promise<SkillsLoadResult> {
  try {
    return await skillsLoadSpec.execute(args, runtimeContext());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Skills load failed: ${message}`);
  }
}

// implements REQ-001
export async function handleKbSkillsRead(
  args: SkillsReadArgs,
): Promise<SkillsReadResult> {
  try {
    return await skillsReadSpec.execute(args, runtimeContext());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Skills read failed: ${message}${resourceListHint(args.id)}`,
    );
  }
}

function resourceListHint(id: string): string {
  if (typeof id !== "string" || id.trim() === "") {
    return "";
  }
  try {
    const bundle = loadBundledSkill(id);
    const resources = bundle.manifest.resources ?? [];
    const resourceList = resources.length === 0 ? "none" : resources.join(", ");
    return `. Declared resources: ${resourceList}`;
  } catch {
    return "";
  }
}
