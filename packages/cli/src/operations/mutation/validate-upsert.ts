import { escapeAtom } from "../../prolog/codec.js";
import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
// implements REQ-kibi-operation-interface-parity
import type { OperationResult } from "../../public/operations/types.js";
import { entityIdStyleWarnings } from "../../utils/entity-id-style.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import {
  assertLogicalGroundingClaimKeys,
  assertSemanticInventoryBoundary,
  validateSemanticInventoryBoundary,
} from "../semantic-advisor/ingestion-boundary.js";
import {
  validateLiveRelationshipTargets,
  validateRelationshipSources,
} from "./relationships.js";
import { validateSymbolGranularity } from "./symbol-granularity.js";
import type { UpsertInput, ValidateUpsertPayload } from "./types.js";
import {
  effectiveRelationships,
  validateAppendOnlyProofReceipts,
} from "./upsert.js";
import { validateUpsertInput } from "./validation.js";

// implements REQ-kibi-entity-id-style
async function entityExists(prolog: PrologPort, id: string): Promise<boolean> {
  const result = await prolog.query(
    `once(kb_entity('${escapeAtom(id)}', _Type, _Props))`,
  );
  return result.success;
}

export async function executeValidateUpsert(
  input: UpsertInput,
  context: OperationContext,
): Promise<OperationResult<ValidateUpsertPayload>> {
  try {
    const validated = validateUpsertInput(input, context.clock());
    await validateAppendOnlyProofReceipts(validated.entity, context);
    validateRelationshipSources(input.id, validated.relationships);
    await validateSymbolGranularity(
      validated.entity,
      validated.relationships,
      context,
    );
    const previewSemantic = analyzeSemanticAdvisorInput({
      payload: { ...input, relationships: validated.relationships },
    });
    const previewBoundary = validateSemanticInventoryBoundary(
      { ...input, relationships: validated.relationships },
      validated.relationships,
      previewSemantic.receipt,
    );
    const relationships =
      context.prolog === undefined || !previewBoundary.applicable
        ? validated.relationships
        : await effectiveRelationships(
            input,
            validated.entity,
            validated.relationships,
            context,
          );
    if (context.prolog !== undefined) {
      await validateLiveRelationshipTargets(
        context.prolog,
        validated.entity,
        relationships,
      );
    }
    const semantic = analyzeSemanticAdvisorInput({
      payload: { ...input, relationships },
    });
    assertSemanticInventoryBoundary(
      { ...input, relationships },
      relationships,
      semantic.receipt,
    );
    if (context.prolog !== undefined) {
      await assertLogicalGroundingClaimKeys(
        context.prolog,
        { ...input, relationships },
        relationships,
      );
    }
    const idStyleWarnings =
      context.prolog !== undefined &&
      !(await entityExists(context.prolog, input.id))
        ? entityIdStyleWarnings({
            id: input.id,
            sourcePath:
              typeof validated.entity.source === "string"
                ? validated.entity.source
                : undefined,
          })
        : [];
    const payload: ValidateUpsertPayload = {
      valid: true,
      errors: [],
      warnings: [...semantic.warnings, ...idStyleWarnings],
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
