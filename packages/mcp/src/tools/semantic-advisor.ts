import { executeSemanticAdvisor } from "kibi-cli/operations";
import type {
  SemanticAdvisorArgs,
  SemanticAdvisorOperationResult,
} from "kibi-cli/operations/semantic-advisor/types";

export type { SemanticAdvisorArgs } from "kibi-cli/operations/semantic-advisor/types";
export type SemanticAdvisorResult = SemanticAdvisorOperationResult;

export async function handleKbSemanticAdvisor(
  args: SemanticAdvisorArgs,
): Promise<SemanticAdvisorResult> {
  return executeSemanticAdvisor(args);
}
