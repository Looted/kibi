import type { UpsertInput } from "../mutation/types.js";
import { validateUpsertInput } from "../mutation/validation.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import { assertSemanticInventoryBoundary } from "../semantic-advisor/ingestion-boundary.js";

/** Validate the original payload without dropping malformed relationships. */
// implements REQ-KIBI-BOOTSTRAP-PLAN
export function validateBootstrapPayload(
  payload: Readonly<Record<string, unknown>>,
  now: Date,
): UpsertInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new Error("Bootstrap action payload must be an upsert object");
  if (
    payload.relationships !== undefined &&
    !Array.isArray(payload.relationships)
  )
    throw new Error(
      "Relationship validation failed: relationships must be an array",
    );
  const input = payload as UpsertInput;
  validateUpsertInput(input, now);
  const relationships = input.relationships ?? [];
  const semantic = analyzeSemanticAdvisorInput({
    payload: { ...input, relationships },
  });
  assertSemanticInventoryBoundary(
    { ...input, relationships },
    relationships,
    semantic.receipt,
  );
  return input;
}
