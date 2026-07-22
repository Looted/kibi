import {
  modelRequirementSpec,
  type OperationContext,
} from "kibi-cli/operations";
import {
  estimateNormativeSignalConfidence,
  extractRequirementClaim,
  getWorkspaceMigrationWarning,
  strictWriteSetToApplyPlan,
  writeSetPrimaryEntityId,
} from "kibi-cli/operations/modeling/model-requirement";
import type {
  ModelRequirementArgs,
  ModelRequirementResult,
} from "kibi-cli/operations/modeling/model-requirement";
import type { PrologProcess } from "kibi-cli/prolog";
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
