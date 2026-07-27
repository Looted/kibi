// implements REQ-kibi-operation-interface-parity
import type { OperationContext } from "../../public/operations/runtime-types.js";
import type { OperationResult } from "../../public/operations/types.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import {
  validateLiveRelationshipTargets,
  validateRelationshipSources,
} from "./relationships.js";
import { validateSymbolGranularity } from "./symbol-granularity.js";
import type { UpsertInput, ValidateUpsertPayload } from "./types.js";
import { validateUpsertInput } from "./validation.js";

export async function executeValidateUpsert(
  input: UpsertInput,
  context: OperationContext,
): Promise<OperationResult<ValidateUpsertPayload>> {
  try {
    const validated = validateUpsertInput(input, context.clock());
    validateRelationshipSources(input.id, validated.relationships);
    await validateSymbolGranularity(
      validated.entity,
      validated.relationships,
      context,
    );
    if (context.prolog !== undefined) {
      await validateLiveRelationshipTargets(
        context.prolog,
        validated.entity,
        validated.relationships,
      );
    }
    const semantic = analyzeSemanticAdvisorInput({ payload: { ...input } });
    const payload: ValidateUpsertPayload = {
      valid: true,
      errors: [],
      warnings: semantic.warnings,
      semanticAdvisor: semantic.receipt,
      normalizedPreview: validated.entity,
    };
    return {
      content: [
        {
          type: "text",
          text: "kb_validate_upsert: payload is valid for kb_upsert preflight checks. No mutation was performed.",
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const payload: ValidateUpsertPayload = {
      valid: false,
      errors: [message],
      warnings: [],
      semanticAdvisor: null,
      normalizedPreview: null,
    };
    return {
      content: [
        {
          type: "text",
          text: `kb_validate_upsert: payload is invalid. ${message}`,
        },
      ],
      structuredContent: payload,
    };
  }
}
