import { executeSemanticAdvisor } from "kibi-runtime";
import type {
  SemanticAdvisorArgs,
  SemanticAdvisorOperationResult,
} from "kibi-runtime";

export type { SemanticAdvisorArgs } from "kibi-runtime";
export type SemanticAdvisorResult = SemanticAdvisorOperationResult;

export async function handleKbSemanticAdvisor(
  args: SemanticAdvisorArgs,
): Promise<SemanticAdvisorResult> {
  return executeSemanticAdvisor(args);
}
