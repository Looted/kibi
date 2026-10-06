import { escapeAtom } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
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

/** Stored fields a relationship-only update may leave out. */
const PRESERVED_IDENTITY_FIELDS = ["title", "status", "text_ref"] as const;

function suppliesSemanticContract(
  properties: Readonly<Record<string, unknown>>,
): boolean {
  return Object.keys(properties).some(
    (key) => key.startsWith("semantic_") || key === "logic_claims",
  );
}

async function storedRequirement(
  id: string,
  prolog: Pick<PrologPort, "query">,
  staged: StagedUpsertState | undefined,
): Promise<Readonly<Record<string, unknown>> | undefined> {
  // An earlier step of the same plan that writes this entity is its history.
  const planned = staged?.entities.get(id);
  if (planned !== undefined)
    return planned.type === "req" ? planned : undefined;
  const exists = await prolog.query(
    `once(kb_entity('${escapeAtom(id)}', req, _))`,
  );
  if (!exists.success) return undefined;
  const [existing] = await loadEntities(prolog, { id, type: "req" });
  return existing;
}

// implements REQ-kibi-upsert-preserves-requirement-semantics
/**
 * kb_upsert on an existing requirement that changes neither its prose nor its
 * proposition ledger keeps the stored ledger. A payload that adds a
 * relationship (for example `specified_by`) and carries no `semantic_*` or
 * `logic_claims` field, and no `title` or `text_ref` that differs from the
 * stored value, is merged over the stored semantic contract (and the stored
 * `title`, `status` and `text_ref` it omits) before validation. The
 * proposition-complete check then runs against the merged requirement, which
 * is also what the write records. A payload that supplies any ledger field or
 * changes the prose is validated exactly as given.
 */
export async function withStoredRequirementSemantics(
  input: UpsertInput,
  prolog: Pick<PrologPort, "query">,
  staged?: StagedUpsertState,
): Promise<UpsertInput> {
  if (input.type !== "req") return input;
  const properties = input.properties ?? {};
  if (suppliesSemanticContract(properties)) return input;
  const stored = await storedRequirement(input.id, prolog, staged);
  if (stored === undefined) return input;
  if (
    PROSE_FIELDS.some(
      (field) =>
        properties[field] !== undefined && properties[field] !== stored[field],
    )
  )
    return input;
  const preserved: Record<string, unknown> = {};
  for (const field of [
    ...SEMANTIC_CONTRACT_FIELDS,
    ...PRESERVED_IDENTITY_FIELDS,
  ]) {
    if (stored[field] !== undefined) preserved[field] = stored[field];
  }
  if (!SEMANTIC_CONTRACT_FIELDS.some((field) => field in preserved))
    return input;
  return { ...input, properties: { ...preserved, ...properties } };
}
