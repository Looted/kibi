import type { PrologPort } from "../../public/operations/runtime-types.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import {
  type SemanticInventoryBoundaryResult,
  type SemanticRelationship,
  validateSemanticInventoryBoundary,
} from "../semantic-advisor/ingestion-boundary.js";
import { stringValue } from "../semantic-advisor/shared.js";
import {
  type StoredEntityLookup,
  storedEntityLookup,
} from "./stored-entity.js";
import type { StagedUpsertState, UpsertInput } from "./types.js";

/** The fields that make up a requirement's proposition ledger. */
const SEMANTIC_CONTRACT_FIELDS = [
  "semantic_text",
  "semantic_clauses",
  "semantic_inventory",
  "semantic_inventory_version",
  "semantic_source_field",
  "semantic_source_hash",
  "logic_claims",
] as const;

/** Prose a requirement's semantic source can be read from besides semantic_text. */
const PROSE_FIELDS = ["title", "text_ref"] as const;

/** Stored prose a relationship-only update may leave out. */
const PRESERVED_PROSE_FIELDS = ["text_ref"] as const;

function suppliesSemanticContract(
  properties: Readonly<Record<string, unknown>>,
): boolean {
  return Object.keys(properties).some(
    (key) => key.startsWith("semantic_") || key === "logic_claims",
  );
}

async function storedRequirement(
  id: string,
  lookup: StoredEntityLookup,
  staged: StagedUpsertState | undefined,
): Promise<Readonly<Record<string, unknown>> | undefined> {
  // An earlier step of the same plan that writes this entity is its history.
  const planned = staged?.entities.get(id);
  if (planned !== undefined)
    return planned.type === "req" ? planned : undefined;
  return (await lookup.entity()) ?? undefined;
}

// implements REQ-kibi-upsert-preserves-requirement-semantics
/**
 * kb_upsert on an existing requirement that changes neither its prose nor its
 * proposition ledger keeps the stored ledger. A payload that adds a
 * relationship (for example `specified_by`) and carries no `semantic_*` or
 * `logic_claims` field, and no `title` or `text_ref` that differs from the
 * stored value, is merged over the stored semantic contract (and the stored
 * `text_ref` it omits) before validation. When the stored ledger reads its
 * prose from `semantic_text`, a changed `text_ref` is merged the same way,
 * since it is not the prose. The
 * proposition-complete check then runs against the merged requirement, which
 * is also what the write records. A payload that supplies any ledger field or
 * changes the prose is validated exactly as given.
 */
export async function withStoredRequirementSemantics(
  input: UpsertInput,
  prolog: Pick<PrologPort, "query">,
  staged?: StagedUpsertState,
  lookup: StoredEntityLookup = storedEntityLookup(prolog, input.id, input.type),
): Promise<UpsertInput> {
  if (input.type !== "req") return input;
  const properties = input.properties ?? {};
  if (suppliesSemanticContract(properties)) return input;
  const stored = await storedRequirement(input.id, lookup, staged);
  if (stored === undefined) return input;
  // text_ref is prose only while it is the semantic source. Once the stored
  // ledger reads semantic_text, changing it (for example clearing a text_ref
  // whose file is gone) changes no proposition. A changed title stays a
  // prose change: it is what a reader takes the requirement to say.
  const readsSemanticText =
    stored.semantic_source_field === "semantic_text" &&
    stringValue(stored.semantic_text).length > 0;
  if (
    PROSE_FIELDS.some(
      (field) =>
        !(field === "text_ref" && readsSemanticText) &&
        properties[field] !== undefined &&
        properties[field] !== stored[field],
    )
  )
    return input;
  const preserved: Record<string, unknown> = {};
  for (const field of [
    ...SEMANTIC_CONTRACT_FIELDS,
    ...PRESERVED_PROSE_FIELDS,
  ]) {
    if (stored[field] !== undefined) preserved[field] = stored[field];
  }
  // Only a recorded ledger is kept. A stored `semantic_text` alone (derived
  // from the body at sync) is not one, and merging it would turn a payload
  // that is valid as sent into one the ingestion boundary rejects.
  if (
    stored.semantic_inventory_version === undefined ||
    !Array.isArray(stored.semantic_inventory)
  )
    return input;
  return { ...input, properties: { ...preserved, ...properties } };
}

/** Stored fields that decide how sync reads a requirement's propositions. */
const BOUNDARY_FIELDS = [
  "status",
  "title",
  "text_ref",
  ...SEMANTIC_CONTRACT_FIELDS,
] as const;

/** Whether a requirement states an inventory contract sync always checks. */
function advertisesSemanticContract(
  properties: Readonly<Record<string, unknown>>,
): boolean {
  return (
    properties.semantic_inventory_version !== undefined ||
    properties.semantic_source_hash !== undefined ||
    properties.semantic_inventory !== undefined
  );
}

function boundaryOf(
  input: UpsertInput,
  properties: Readonly<Record<string, unknown>>,
  relationships: readonly SemanticRelationship[],
): SemanticInventoryBoundaryResult {
  const payload = { type: input.type, id: input.id, properties };
  const { receipt } = analyzeSemanticAdvisorInput({
    payload: { ...payload, relationships },
  });
  return validateSemanticInventoryBoundary(payload, relationships, receipt);
}

// implements REQ-kibi-upsert-preserves-requirement-semantics, REQ-kibi-proposition-complete-ingestion, REQ-kibi-uncompiled-source-semantic-baseline
/**
 * An update to a stored requirement is judged as its authored file will read
 * afterwards: the stored status, prose and proposition ledger with the
 * payload's fields on top (the source writer keeps every front matter key the
 * payload leaves out and states the stored `semantic_text`). A payload such
 * as `{status: "closed"}` passes the check on its own fields, yet the file it
 * leaves is a current requirement whose prose has no inventory, which sync
 * then refuses. Such a write is refused here with the error sync would give.
 *
 * A requirement that was already current with the same prose and no complete
 * inventory is legacy content sync keeps accepting, so a write that changes
 * neither keeps working. A write that makes the requirement current, or
 * changes the prose sync checks, must carry the complete inventory.
 *
 * A requirement the store does not hold (its file failed the last sync, or
 * was written since) is judged by the rule sync applies to that file: it
 * keeps the legacy treatment only when the last sync recorded the file as
 * legacy content or as having compiled with the same prose.
 */
export async function assertStoredRequirementBoundary(
  input: UpsertInput,
  relationships: readonly SemanticRelationship[],
  prolog: Pick<PrologPort, "query">,
  staged?: StagedUpsertState,
  lookup: StoredEntityLookup = storedEntityLookup(prolog, input.id, input.type),
): Promise<void> {
  if (input.type !== "req") return;
  const stored = await storedRequirement(input.id, lookup, staged);
  if (stored === undefined) return;
  const before: Record<string, unknown> = {};
  for (const field of BOUNDARY_FIELDS) {
    if (stored[field] !== undefined) before[field] = stored[field];
  }
  const written = { ...before, ...(input.properties ?? {}) };
  const after = boundaryOf(input, written, relationships);
  if (after.errors.length === 0) return;
  if (lookup.keepsSemanticBaseline !== undefined) {
    if (
      !advertisesSemanticContract(written) &&
      lookup.keepsSemanticBaseline(after.sourceHash)
    )
      return;
  } else {
    const previous = boundaryOf(input, before, relationships);
    if (previous.applicable && previous.sourceHash === after.sourceHash) return;
  }
  throw new Error(
    `Proposition-complete ingestion failed: ${input.id} would be written as a current requirement without a complete proposition inventory (${after.errors.join("; ")}). Run kb_model mode analyze (CLI: semantic-advisor) with id '${input.id}' and its complete semantic_text, then send the returned inventory contract (semantic_inventory, semantic_inventory_version, semantic_source_field, semantic_source_hash, logic_claims) in this kb_upsert, or retire the requirement through a superseding one instead.`,
  );
}
