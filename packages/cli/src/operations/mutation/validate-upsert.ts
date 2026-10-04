// implements REQ-kibi-operation-interface-parity
import { escapeAtom } from "../../prolog/codec.js";
import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
import type { OperationResult } from "../../public/operations/types.js";
import { entityIdStyleWarnings } from "../../utils/entity-id-style.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import { assertSemanticInventoryBoundary } from "../semantic-advisor/ingestion-boundary.js";
import { validateRelationshipSources } from "./relationships.js";
import { validateSymbolGranularity } from "./symbol-granularity.js";
import type { UpsertInput, ValidateUpsertPayload } from "./types.js";
import {
  validateAppendOnlyProofReceipts,
  validateUpsertForCommit,
} from "./upsert.js";
import { validateUpsertInput } from "./validation.js";

// implements REQ-kibi-entity-id-style
async function entityExists(prolog: PrologPort, id: string): Promise<boolean> {
  const result = await prolog.query(
    `once(kb_entity('${escapeAtom(id)}', _Type, _Props))`,
  );
  return result.success;
}

/**
 * The validation chain for a runtime without a store: everything that does
 * not need to read the KB.
 */
async function validateWithoutStore(
  input: UpsertInput,
  context: OperationContext,
): Promise<{
  entity: Readonly<Record<string, unknown>>;
  semantic: ReturnType<typeof analyzeSemanticAdvisorInput>;
}> {
  const validated = validateUpsertInput(input, context.clock());
  await validateAppendOnlyProofReceipts(validated.entity, context);
  validateRelationshipSources(input.id, validated.relationships);
  await validateSymbolGranularity(
    validated.entity,
    validated.relationships,
    context,
  );
  const relationships = validated.relationships;
  const semantic = analyzeSemanticAdvisorInput({
    payload: { ...input, relationships },
  });
  assertSemanticInventoryBoundary(
    { ...input, relationships },
    relationships,
    semantic.receipt,
  );
  return { entity: validated.entity, semantic };
}

// implements REQ-kibi-operation-interface-parity, REQ-kibi-truthful-consistency
/**
 * kb_upsert dryRun:true (and the former kb_validate_upsert preflight). With a
 * store it runs validateUpsertForCommit, the exact validation a real
 * kb_upsert runs before its first write, so a dry run accepts only what the
 * write would accept; without a store it runs the store-independent checks.
 */
export async function executeValidateUpsert(
  input: UpsertInput,
  context: OperationContext,
): Promise<OperationResult<ValidateUpsertPayload>> {
  try {
    const { entity, semantic } =
      context.prolog !== undefined
        ? await validateUpsertForCommit(input, context).then((result) => ({
            entity: result.validated.entity,
            semantic: result.semantic,
          }))
        : await validateWithoutStore(input, context);
    // Style warnings apply only to entities this upsert would create, so the
    // existence read happens only when the ID actually has a style issue.
    const candidateIdStyleWarnings = entityIdStyleWarnings({
      id: input.id,
      sourcePath: typeof entity.source === "string" ? entity.source : undefined,
    });
    const idStyleWarnings =
      candidateIdStyleWarnings.length > 0 &&
      context.prolog &&
      !(await entityExists(context.prolog, input.id))
        ? candidateIdStyleWarnings
        : [];
    const payload: ValidateUpsertPayload = {
      valid: true,
      errors: [],
      warnings: [...semantic.warnings, ...idStyleWarnings],
      semanticAdvisor: semantic.receipt,
      normalizedPreview: entity,
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
