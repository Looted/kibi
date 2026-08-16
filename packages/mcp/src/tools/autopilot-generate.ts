import {
  type AutopilotGenerateArgs,
  type AutopilotGenerateResult,
  executeAutopilotGenerate,
} from "kibi-runtime";
import { nodeFilesystem, nodeGit } from "kibi-runtime";
import type { OperationContext, PrologPort } from "kibi-runtime";
import { PrologProcess } from "kibi-runtime";

import { resolveWorkspaceRoot } from "../workspace.js";
import {
  type LegacyDependencies,
  executeTestDependencies,
  resetTestDependencies,
  setTestDependencies,
} from "./autopilot-test-compat.js";

export type {
  AutopilotBootstrapContext,
  AutopilotGenerateArgs,
  AutopilotGenerateResult,
} from "kibi-runtime";

export function _setAutopilotGenerateDepsForTests(
  dependencies: LegacyDependencies,
): void {
  setTestDependencies(dependencies);
}

export function _resetAutopilotGenerateDepsForTests(): void {
  resetTestDependencies();
}

function isOperationContext(value: unknown): value is OperationContext {
  return (
    value !== null &&
    typeof value === "object" &&
    "workspaceRoot" in value &&
    "signal" in value
  );
}

function isPrologProcess(value: unknown): value is PrologProcess {
  return (
    value instanceof PrologProcess ||
    (value !== null &&
      typeof value === "object" &&
      typeof (value as { query?: unknown }).query === "function")
  );
}

function adaptProlog(prolog: PrologProcess): PrologPort {
  return {
    query: (goal) => prolog.query(goal),
    nextSolution: async () => null,
    save: () => prolog.query("kb_save"),
  };
}

export async function handleKbAutopilotGenerate(
  input: AutopilotGenerateArgs,
  context: OperationContext,
): Promise<AutopilotGenerateResult>;
export async function handleKbAutopilotGenerate(
  prolog: PrologProcess,
  input: AutopilotGenerateArgs,
): Promise<AutopilotGenerateResult>;
// implements REQ-mcp-init-kibi-autopilot-v1, REQ-kibi-operation-interface-parity
export async function handleKbAutopilotGenerate(
  first: AutopilotGenerateArgs | PrologProcess,
  second: AutopilotGenerateArgs | OperationContext,
): Promise<AutopilotGenerateResult> {
  if (isOperationContext(second) && !isPrologProcess(first))
    return executeAutopilotGenerate(first, {
      ...second,
      fs: second.fs ?? nodeFilesystem,
      git: second.git ?? nodeGit,
    });
  if (!isPrologProcess(first) || isOperationContext(second))
    throw new TypeError("Invalid autopilot adapter invocation");
  const testResult = await executeTestDependencies(first, second);
  if (testResult) return testResult;
  const context: OperationContext = {
    workspaceRoot: resolveWorkspaceRoot(),
    signal: new AbortController().signal,
    clock: () => new Date(),
    fs: nodeFilesystem,
    git: nodeGit,
    prolog: adaptProlog(first),
  };
  return executeAutopilotGenerate(second, context);
}
