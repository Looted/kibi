import { escapeAtom } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
// implements REQ-kibi-operation-interface-parity
import type { OperationContext } from "../../public/operations/runtime-types.js";
import type { OperationResult } from "../../public/operations/types.js";
import { appendOnlyVerificationReceiptHistoryErrors } from "../../public/verification-receipt.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import {
  assertLogicalGroundingClaimKeys,
  assertSemanticInventoryBoundary,
} from "../semantic-advisor/ingestion-boundary.js";
import { recordEntityAudit, recordRelationshipAudits } from "./audit.js";
import { buildUpsertTransaction, formatUpsertError } from "./contradictions.js";
import {
  existingRelationships,
  validateLiveRelationshipTargets,
  validateRelationshipSources,
  validateStrictLanePairing,
} from "./relationships.js";
import { saveMutation } from "./save.js";
import { validateSymbolGranularity } from "./symbol-granularity.js";
import { refreshSymbolCoordinates } from "./symbol-refresh.js";
import type { RelationshipInput, UpsertInput, UpsertPayload } from "./types.js";
import { validateUpsertInput } from "./validation.js";
import { scenarioCoverageWarnings } from "./warnings.js";

function requireProlog(context: OperationContext) {
  if (context.prolog === undefined) {
    throw new Error("Upsert operation requires a Prolog runtime");
  }
  return context.prolog;
}

function receiptRecords(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.filter(
    (receipt): receipt is Readonly<Record<string, unknown>> =>
      receipt !== null &&
      typeof receipt === "object" &&
      !Array.isArray(receipt),
  );
}

export async function validateAppendOnlyVerificationReceipts(
  entity: Readonly<Record<string, unknown>>,
  context: OperationContext,
): Promise<void> {
  if (entity.type !== "test") return;
  const existing = await loadEntities(requireProlog(context), {
    id: String(entity.id),
    type: "test",
  });
  const previous = receiptRecords(existing[0]?.verification_receipts);
  if (!previous || previous.length === 0) return;
  const next = receiptRecords(entity.verification_receipts);
  const errors = appendOnlyVerificationReceiptHistoryErrors(previous, next);
  if (errors.length > 0) {
    throw new Error(`Entity validation failed: ${errors.join("; ")}`);
  }
}

export async function effectiveRelationships(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
  context: OperationContext,
): Promise<readonly RelationshipInput[]> {
  if (input.relationships !== undefined && input.relationships.length > 0) {
    return relationships;
  }
  const prolog = requireProlog(context);
  const exists = await prolog.query(
    `once(kb_entity('${escapeAtom(input.id)}', _, _))`,
  );
  if (!exists.success) return relationships;
  try {
    const current = await existingRelationships(prolog, String(entity.id));
    return current.length > 0 ? current : relationships;
  } catch (error) {
    if (error instanceof Error) return relationships;
    throw error;
  }
}

export async function executeUpsert(
  input: UpsertInput,
  context: OperationContext,
): Promise<OperationResult<UpsertPayload>> {
  const prolog = requireProlog(context);
  try {
    const validated = validateUpsertInput(input, context.clock());
    await validateAppendOnlyVerificationReceipts(validated.entity, context);
    validateRelationshipSources(input.id, validated.relationships);
    await validateSymbolGranularity(
      validated.entity,
      validated.relationships,
      context,
    );
    const relationships = await effectiveRelationships(
      input,
      validated.entity,
      validated.relationships,
      context,
    );
    await validateStrictLanePairing(prolog, relationships);
    await validateLiveRelationshipTargets(
      prolog,
      validated.entity,
      relationships,
    );
    const semantic = analyzeSemanticAdvisorInput({
      payload: { ...input, relationships },
    });
    assertSemanticInventoryBoundary(
      { ...input, relationships },
      relationships,
      semantic.receipt,
    );
    await assertLogicalGroundingClaimKeys(
      prolog,
      { ...input, relationships },
      relationships,
    );
    const exists = await prolog.query(
      `once(kb_entity('${escapeAtom(input.id)}', _, _))`,
    );
    const transaction = buildUpsertTransaction({
      entity: validated.entity,
      relationships,
      skipContradictionCheck: input._skipContradictionCheck === true,
    });
    const written = await prolog.query(transaction);
    if (!written.success) {
      throw new Error(formatUpsertError(input.id, written.error));
    }
    await recordEntityAudit(
      prolog,
      exists.success ? "updated" : "created",
      validated.entity,
    );
    await recordRelationshipAudits(prolog, relationships);
    await saveMutation(prolog);
    if (input.type === "symbol") {
      try {
        await refreshSymbolCoordinates(input.id, context);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
      }
    }
    const coverage = await scenarioCoverageWarnings(
      prolog,
      validated.relationships,
      input.type,
      input.id,
    );
    const created = exists.success ? 0 : 1;
    const payload: UpsertPayload = {
      created,
      updated: exists.success ? 1 : 0,
      relationships_created: relationships.length,
      warnings: [...semantic.warnings, ...coverage],
      semanticAdvisor: semantic.receipt,
      ...(input.type === "req"
        ? {
            contradictionCheck: {
              outcome: input._skipContradictionCheck
                ? "skipped"
                : "no-conflict",
              checked_req_id: input.id,
              strict_readiness:
                semantic.receipt.logic_readiness === "modeled"
                  ? "modeled"
                  : semantic.receipt.candidate_lane,
            },
          }
        : {}),
    };
    return {
      content: [
        {
          type: "text",
          text: `Upserted ${input.id} (${created > 0 ? "created" : "updated"}) with ${relationships.length} relationship(s).`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Upsert execution failed: ${message}`);
  }
}
