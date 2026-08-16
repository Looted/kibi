import { type OperationContext, modelRequirementSpec } from "kibi-runtime";
import {
  estimateNormativeSignalConfidence,
  extractRequirementClaim,
  getWorkspaceMigrationWarning,
  strictWriteSetToApplyPlan,
  writeSetPrimaryEntityId,
} from "kibi-runtime";
import type {
  ModelRequirementArgs,
  ModelRequirementResult,
} from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";
import { resolveWorkspaceRoot } from "../workspace.js";

export type { ModelRequirementArgs, ModelRequirementResult };
export {
  estimateNormativeSignalConfidence,
  extractRequirementClaim,
  getWorkspaceMigrationWarning,
  strictWriteSetToApplyPlan,
  writeSetPrimaryEntityId,
};

export async function handleKbModelRequirement(
  _prolog: PrologProcess,
  args: ModelRequirementArgs,
): Promise<ModelRequirementResult> {
  const context: OperationContext = {
    workspaceRoot: resolveWorkspaceRoot(),
    signal: new AbortController().signal,
    clock: () => new Date(),
  };
  return modelRequirementSpec.execute(args, context);
}
