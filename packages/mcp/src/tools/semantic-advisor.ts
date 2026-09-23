import { executeSemanticAdvisor } from "kibi-runtime";
import type {
  OperationContext,
  SemanticAdvisorArgs,
  SemanticAdvisorOperationResult,
} from "kibi-runtime";

export type { SemanticAdvisorArgs } from "kibi-runtime";
export type SemanticAdvisorResult = SemanticAdvisorOperationResult;

export async function handleKbSemanticAdvisor(
  args: SemanticAdvisorArgs,
  context?: OperationContext,
): Promise<SemanticAdvisorResult> {
  return executeSemanticAdvisor(args, context);
}
