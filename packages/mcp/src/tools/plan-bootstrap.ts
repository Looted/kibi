import {
  type PlanBootstrapArgs,
  type PlanBootstrapResult,
  executePlanBootstrap,
} from "kibi-runtime";
import { nodeFilesystem, nodeGit } from "kibi-runtime";
import type { OperationContext } from "kibi-runtime";

import { resolveWorkspaceRoot } from "../workspace.js";

export type {
  BootstrapContext,
  PlanBootstrapArgs,
  PlanBootstrapResult,
} from "kibi-runtime";

function isOperationContext(value: unknown): value is OperationContext {
  return (
    value !== null &&
    typeof value === "object" &&
    "workspaceRoot" in value &&
    "signal" in value
  );
}

// implements REQ-mcp-kibi-bootstrap-bootstrap-v1, REQ-kibi-operation-interface-parity
// implements REQ-KIBI-BOOTSTRAP-PLAN
export async function handleKbPlanBootstrap(
  input: PlanBootstrapArgs,
  context: OperationContext,
): Promise<PlanBootstrapResult> {
  if (!isOperationContext(context))
    throw new TypeError("Invalid bootstrap adapter invocation");
  return executePlanBootstrap(input, {
    ...context,
    workspaceRoot: context.workspaceRoot || resolveWorkspaceRoot(),
    fs: context.fs ?? nodeFilesystem,
    git: context.git ?? nodeGit,
  });
}
