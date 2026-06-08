import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import type { SemanticAdvisorReceipt } from "../semantic-advisor/types.js";
import type { UpsertArgs } from "./upsert.js";
import { validateKbUpsertArgs } from "./upsert.js";

export interface ValidateUpsertResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    semanticAdvisor: SemanticAdvisorReceipt | null;
    normalizedPreview: Record<string, unknown> | null;
  };
}

export async function handleKbValidateUpsert(
  args: UpsertArgs,
): Promise<ValidateUpsertResult> {
  try {
    const { entity } = validateKbUpsertArgs(args);
    const semanticAdvisor = analyzeSemanticAdvisorInput({
      payload: { ...args },
    });
    return {
      content: [
        {
          type: "text",
          text: "kb_validate_upsert: payload is valid for kb_upsert preflight checks. No mutation was performed.",
        },
      ],
      structuredContent: {
        valid: true,
        errors: [],
        warnings: semanticAdvisor.warnings,
        semanticAdvisor: semanticAdvisor.receipt,
        normalizedPreview: entity,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `kb_validate_upsert: payload is invalid. ${message}`,
        },
      ],
      structuredContent: {
        valid: false,
        errors: [message],
        warnings: [],
        semanticAdvisor: null,
        normalizedPreview: null,
      },
    };
  }
}
