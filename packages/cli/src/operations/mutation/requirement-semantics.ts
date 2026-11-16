import { KbRejection } from "../../cli-errors.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import {
  type SemanticInventoryBoundaryResult,
  type SemanticRelationship,
  semanticInventoryContract,
  storedClaimKey,
  validateSemanticInventoryBoundary,
} from "../semantic-advisor/ingestion-boundary.js";
import { isRecord, stringValue } from "../semantic-advisor/shared.js";
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

/**
 * kb_upsert on an existing requirement that changes neither its prose nor its
 * proposition ledger keeps the stored ledger. A payload that adds a
 * relationship (for example `specified_by`) and carries no `semantic_*` or
 * `logic_claims` field, and no `title` or `text_ref` that differs from the
 * stored value, is merged over the stored semantic contract (and the stored
 * `text_ref` it omits) before validation. When the stored ledger reads its
 * prose from `semantic_text`, a changed `title` or `text_ref` is merged the
 * same way, since neither is the prose: the authored file keeps its ledger,
 * and the store must not lose the claims and subjects it records. The
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
  // Title and text_ref are prose only while they are the semantic source.
  // Once the stored ledger reads semantic_text, changing either (renaming the
  // requirement, or clearing a text_ref whose file is gone) changes no
  // proposition: the authored file keeps its ledger, so the store must too.
  const readsSemanticText =
    stored.semantic_source_field === "semantic_text" &&
    stringValue(stored.semantic_text).length > 0;
  if (
    !readsSemanticText &&
    PROSE_FIELDS.some(
      (field) =>
        properties[field] !== undefined && properties[field] !== stored[field],
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
    // Leaving an absent field out keeps the analyzed payload as authored.
    // rationale: an undefined field changes no boundary decision; only the
    // advisor's internal receipt hash sees the extra key.
    // Stryker disable next-line ConditionalExpression
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
  throw new KbRejection(
    "INCOMPLETE_PROPOSITIONS",
    `Proposition-complete ingestion failed: ${input.id} would be written as a current requirement without a complete proposition inventory (${after.errors.join("; ")}). Leave semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims out of this kb_upsert so Kibi derives them from the prose, sending semantic_inventory entries ({claim_key, status, subjects}) only for the claims you classify, or retire the requirement through a superseding one instead.`,
  );
}

/**
 * The fields of the inventory contract that follow from the prose alone. A
 * write that sends one of them is judged exactly as sent; the entries of
 * semantic_inventory also carry the writer's judgment, so sending them alone
 * still lets Kibi derive the rest.
 */
export const CONTRACT_FIELDS = [
  "semantic_inventory_version",
  "semantic_source_field",
  "semantic_source_hash",
  "logic_claims",
] as const;

/** One claim of an inventory the server filled in, as the result reports it. */
export type ServerInventoryEntry = Readonly<{
  claim_key: string;
  role: string;
  status: string;
  claim_text: string;
  /**
   * For a claim recorded `missing`: the advisor's reading (ambiguous or
   * ontology_gap), for the writer to confirm in a later write.
   */
  advisor_status?: string;
}>;

/** Proposition roles that carry context, not a checkable claim. */
const CONTEXT_ROLES = new Set(["rationale", "example", "subjective"]);

const GROUNDING_RELATIONSHIPS = new Set([
  "requires_property",
  "requires_predicate",
  "requires_rule",
]);

/** The claim keys the requirement's grounding links name, as far as known. */
async function groundedClaimKeys(
  id: string,
  relationships: readonly SemanticRelationship[],
  prolog: Pick<PrologPort, "query">,
  staged: StagedUpsertState | undefined,
): Promise<Set<string>> {
  const keys = new Set<string>();
  for (const relationship of relationships) {
    if (
      relationship.from !== id ||
      !GROUNDING_RELATIONSHIPS.has(stringValue(relationship.type))
    )
      continue;
    const target = stringValue(relationship.to);
    const planned = staged?.entities.get(target);
    let key = "";
    if (planned !== undefined) {
      key = planned.type === "fact" ? stringValue(planned.claim_key) : "";
    } else {
      try {
        key = await storedClaimKey(prolog as PrologPort, target);
      } catch {
        // A target that does not exist yet is reported by the grounding
        // check; it grounds no claim here.
      }
    }
    if (key) keys.add(key);
  }
  return keys;
}

/**
 * A requirement write that sends none of the inventory fields gets the
 * contract the semantic advisor derives for its prose, instead of a
 * rejection that prints that contract for the caller to send back. Each
 * claim is `modeled` when one of the write's grounding links names its
 * claim_key, else it keeps the status (and subjects) the stored ledger gave
 * it, else the advisor's own status (an ambiguity or ontology gap stays
 * explicit; an advisor `modeled` without a grounding link becomes
 * `missing`). Every check then runs on the filled write as on a sent one, so
 * a link that grounds no claim is still refused. A write that sends any
 * inventory field is judged exactly as sent.
 */
export async function withServerSemanticInventory(
  sent: UpsertInput,
  input: UpsertInput,
  relationships: readonly SemanticRelationship[],
  prolog: Pick<PrologPort, "query">,
  staged?: StagedUpsertState,
  lookup: StoredEntityLookup = storedEntityLookup(prolog, input.id, input.type),
): Promise<{ input: UpsertInput; applied?: readonly ServerInventoryEntry[] }> {
  if (input.type !== "req") return { input };
  const sentProperties = sent.properties ?? {};
  if (
    CONTRACT_FIELDS.some((field) => sentProperties[field] !== undefined) ||
    (sentProperties.semantic_inventory !== undefined &&
      !Array.isArray(sentProperties.semantic_inventory))
  )
    return { input };
  // The payload's own entries carry the writer's judgment about a claim (its
  // status and subjects), keyed by claim_key.
  const sentEntries = new Map<string, Record<string, unknown>>();
  for (const entry of Array.isArray(sentProperties.semantic_inventory)
    ? sentProperties.semantic_inventory
    : []) {
    if (isRecord(entry)) sentEntries.set(stringValue(entry.claim_key), entry);
  }
  const own = input.properties ?? {};
  const alone = boundaryOf(input, own, relationships);
  if (alone.applicable && alone.errors.length === 0) return { input };
  const stored = await storedRequirement(input.id, lookup, staged);
  const recorded: Record<string, unknown> = {};
  for (const field of BOUNDARY_FIELDS) {
    if (stored?.[field] !== undefined) recorded[field] = stored[field];
  }
  const written = boundaryOf(input, { ...recorded, ...own }, relationships);
  if (!written.applicable || written.errors.length === 0) return { input };
  // The ledger is derived from the prose the write leaves on record: the
  // stored prose under the payload's own fields, without any ledger field,
  // since the derived contract replaces them all.
  const prose: Record<string, unknown> = {};
  for (const field of ["status", ...PROSE_FIELDS, "semantic_text"] as const) {
    if (stored?.[field] !== undefined) prose[field] = stored[field];
  }
  Object.assign(prose, own);
  // Stored clauses still split the prose only while that prose is unchanged.
  if (
    prose.semantic_clauses === undefined &&
    stored?.semantic_clauses !== undefined &&
    prose.semantic_text === stored.semantic_text
  )
    prose.semantic_clauses = stored.semantic_clauses;
  const ledger = new Set<string>([...CONTRACT_FIELDS, "semantic_inventory"]);
  const properties = Object.fromEntries(
    Object.entries(prose).filter(([field]) => !ledger.has(field)),
  );
  const payload = { type: input.type, id: input.id, properties };
  const { receipt } = analyzeSemanticAdvisorInput({
    payload: { ...payload, relationships },
  });

  const grounded = await groundedClaimKeys(
    input.id,
    relationships,
    prolog,
    staged,
  );
  const storedEntries = new Map<string, Record<string, unknown>>();
  for (const entry of Array.isArray(stored?.semantic_inventory)
    ? stored.semantic_inventory
    : []) {
    if (isRecord(entry)) storedEntries.set(stringValue(entry.claim_key), entry);
  }
  const stated = new Set(receipt.propositions.map((p) => p.claim_key));
  const unstated = [...sentEntries.keys()].filter((key) => !stated.has(key));
  if (unstated.length > 0)
    throw new KbRejection(
      "INCOMPLETE_PROPOSITIONS",
      `Proposition-complete ingestion failed: semantic_inventory names claim key(s) ${unstated.join(", ")} that the prose of ${input.id} does not state, so the entries were written for other prose. Send semantic_inventory entries only for the claim keys kb_model mode analyze returns for the current prose, or omit semantic_inventory to have Kibi derive it.`,
      [
        {
          rule: "semantic_inventory_unstated_claim",
          field: "semantic_inventory",
        },
      ],
    );
  const seed = receipt.propositions.map((proposition) => {
    const own = sentEntries.get(proposition.claim_key);
    const previous = storedEntries.get(proposition.claim_key);
    const ownStatus = stringValue(own?.status);
    const previousStatus = stringValue(previous?.status);
    // The writer's own status stands as sent, so a `modeled` without a
    // grounding link is refused below instead of silently downgraded.
    const status = ownStatus
      ? ownStatus
      : grounded.has(proposition.claim_key)
        ? "modeled"
        : previousStatus && previousStatus !== "modeled"
          ? previousStatus
          : CONTEXT_ROLES.has(proposition.role)
            ? proposition.status
            : // Nobody classified this claim: `missing` says so. The
              // advisor's ambiguity or ontology-gap guess is a hint the
              // result reports, never a judgment recorded for the writer.
              "missing";
    const subjects = Array.isArray(own?.subjects)
      ? own.subjects
      : Array.isArray(previous?.subjects)
        ? previous.subjects
        : undefined;
    return {
      claim_key: proposition.claim_key,
      status,
      ...(subjects !== undefined ? { subjects } : {}),
    };
  });
  const contract = semanticInventoryContract(
    { ...payload, properties: { ...properties, semantic_inventory: seed } },
    receipt,
  );
  const filled: UpsertInput = {
    ...input,
    properties: { ...properties, ...contract },
  };
  const advised = new Map(
    receipt.propositions.map((p) => [p.claim_key, p.status] as const),
  );
  const applied = (
    contract.semantic_inventory as readonly Record<string, unknown>[]
  ).map((entry) => {
    const key = stringValue(entry.claim_key);
    const status = stringValue(entry.status);
    const hint = stringValue(advised.get(key));
    return {
      claim_key: key,
      role: stringValue(entry.role),
      status,
      claim_text: stringValue(entry.claim_text),
      ...(status === "missing" &&
      (hint === "ambiguous" || hint === "ontology_gap")
        ? { advisor_status: hint }
        : {}),
    };
  });
  return { input: filled, applied };
}
