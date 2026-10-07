import { escapeAtom } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import { semanticClaimKey } from "./clauses.js";
import { legacyPropositionRoles } from "./proposition-role.js";
import {
  type Payload,
  SEMANTIC_INVENTORY_VERSION,
  isRecord,
  propertiesOf,
  semanticSourceHash,
  semanticSourceOf,
  stringValue,
} from "./shared.js";
import type { SemanticAdvisorReceipt, SemanticProposition } from "./types.js";

const CURRENT_REQUIREMENT_STATUSES = new Set([
  "open",
  "in_progress",
  "closed",
  "active",
  "approved",
]);
const CONTEXT_ROLES = new Set(["rationale", "example", "subjective"]);
const LOGICAL_RELATIONSHIPS = new Set([
  "requires_property",
  "requires_predicate",
  "requires_rule",
]);

export interface SemanticInventoryBoundaryResult {
  readonly applicable: boolean;
  readonly errors: readonly string[];
  readonly sourceHash: string;
}

export type SemanticRelationship = Readonly<{
  type?: unknown;
  from?: unknown;
  to?: unknown;
}>;

// A stored role matches when it is the advisor's current role or, for an
// assertive proposition, a role an earlier advisor assigned to the same text.
function roleMatchesAdvisor(
  role: string,
  expected: SemanticProposition,
): boolean {
  if (role === expected.role) return true;
  return (
    !CONTEXT_ROLES.has(expected.role) &&
    (legacyPropositionRoles(expected.claim_text) as readonly string[]).includes(
      role,
    )
  );
}

function inventoryOf(payload: Payload): readonly Record<string, unknown>[] {
  const raw = propertiesOf(payload).semantic_inventory;
  return Array.isArray(raw) ? raw.filter(isRecord) : [];
}

function exactSpanText(
  source: string,
  span: Readonly<Record<string, unknown>>,
): string | null {
  const start = span.start;
  const end = span.end;
  if (
    typeof start !== "number" ||
    typeof end !== "number" ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end <= start
  )
    return null;
  const bytes = Buffer.from(source, "utf8");
  if (end > bytes.length) return null;
  return bytes.subarray(start, end).toString("utf8");
}

function propositionIsAssertive(proposition: SemanticProposition): boolean {
  return !CONTEXT_ROLES.has(proposition.role);
}

// implements REQ-kibi-proposition-complete-ingestion
export function validateSemanticInventoryBoundary(
  payload: Payload,
  relationships: readonly SemanticRelationship[],
  receipt: SemanticAdvisorReceipt,
): SemanticInventoryBoundaryResult {
  const properties = propertiesOf(payload);
  const semanticSource = semanticSourceOf(payload);
  const sourceHash = semanticSourceHash(semanticSource.text);
  const currentRequirement =
    stringValue(payload.type) === "req" &&
    CURRENT_REQUIREMENT_STATUSES.has(stringValue(properties.status));
  const assertive = receipt.propositions.filter(propositionIsAssertive);
  const applicable =
    currentRequirement &&
    semanticSource.text.length > 0 &&
    (semanticSource.field !== "title" ||
      assertive.some(({ role }) => role === "normative"));
  if (!applicable) return { applicable, errors: [], sourceHash };

  const errors: string[] = [];
  if (properties.semantic_inventory_version !== SEMANTIC_INVENTORY_VERSION) {
    errors.push(
      `semantic_inventory_version must be '${SEMANTIC_INVENTORY_VERSION}'`,
    );
  }
  if (properties.semantic_source_field !== semanticSource.field) {
    errors.push(
      `semantic_source_field must be '${semanticSource.field}' for the current requirement prose`,
    );
  }
  if (properties.semantic_source_hash !== sourceHash) {
    errors.push(
      `semantic_source_hash must equal the SHA-256 hash of ${semanticSource.field} (expected '${sourceHash}')`,
    );
  }

  const inventory = inventoryOf(payload);
  if (!Array.isArray(properties.semantic_inventory)) {
    errors.push(
      "semantic_inventory must contain one entry for every advisor proposition",
    );
  }
  if (inventory.length !== receipt.propositions.length) {
    errors.push(
      `semantic_inventory must contain exactly ${receipt.propositions.length} proposition(s); received ${inventory.length}`,
    );
  }

  const seenKeys = new Set<string>();
  const seenSpans = new Set<string>();
  for (const [index, entry] of inventory.entries()) {
    const expected = receipt.propositions[index];
    const claimKey = stringValue(entry.claim_key);
    const claimText = stringValue(entry.claim_text);
    const role = stringValue(entry.role);
    const status = stringValue(entry.status);
    const span = isRecord(entry.span) ? entry.span : {};
    const start = span.start;
    const end = span.end;
    const spanKey = `${String(start)}:${String(end)}`;

    if (seenKeys.has(claimKey))
      errors.push(`semantic_inventory has duplicate claim_key '${claimKey}'`);
    seenKeys.add(claimKey);
    if (seenSpans.has(spanKey))
      errors.push(`semantic_inventory has duplicate span '${spanKey}'`);
    seenSpans.add(spanKey);

    const derivedKey = semanticClaimKey(claimText);
    if (claimKey !== derivedKey) {
      errors.push(
        `semantic_inventory[${index}].claim_key must match claim_text (expected '${derivedKey}')`,
      );
    }
    const sliced = exactSpanText(semanticSource.text, span);
    if (sliced !== claimText) {
      errors.push(
        `semantic_inventory[${index}].span must select its exact claim_text from ${semanticSource.field}`,
      );
    }
    if (
      expected &&
      (claimKey !== expected.claim_key ||
        claimText !== expected.claim_text ||
        !roleMatchesAdvisor(role, expected) ||
        start !== expected.span.start ||
        end !== expected.span.end)
    ) {
      errors.push(
        `semantic_inventory[${index}] does not match advisor proposition '${expected.claim_key}'`,
      );
    }
    const contextRole = CONTEXT_ROLES.has(role);
    if (contextRole && status !== "nonlogical") {
      errors.push(
        `semantic_inventory[${index}] role '${role}' must use status 'nonlogical'`,
      );
    }
    if (!contextRole && status === "nonlogical") {
      errors.push(
        `semantic_inventory[${index}] assertive role '${role}' cannot use status 'nonlogical'`,
      );
    }
  }

  const declaredClaims = Array.isArray(properties.logic_claims)
    ? properties.logic_claims.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const expectedClaims = assertive.map(({ claim_key }) => claim_key);
  if (
    declaredClaims.length !== expectedClaims.length ||
    expectedClaims.some((claimKey) => !declaredClaims.includes(claimKey))
  ) {
    errors.push(
      "logic_claims must contain exactly every assertive semantic_inventory claim_key",
    );
  }

  const modeledCount = inventory.filter(
    ({ status }) => status === "modeled",
  ).length;
  const groundingRelationships = relationships.filter(
    (relationship) =>
      relationship.from === payload.id &&
      LOGICAL_RELATIONSHIPS.has(stringValue(relationship.type)),
  );
  const groundingCount = groundingRelationships.length;
  if (modeledCount !== groundingCount) {
    const groundingTargets = groundingRelationships
      .map(
        (relationship) =>
          `${stringValue(relationship.type)}->${stringValue(relationship.to)}`,
      )
      .join(", ");
    errors.push(
      `modeled semantic_inventory entries (${modeledCount}) must equal logical grounding relationships (${groundingCount})${groundingTargets ? ` [${groundingTargets}]` : ""}`,
    );
  }

  return { applicable, errors, sourceHash };
}

export function assertSemanticInventoryBoundary(
  payload: Payload,
  relationships: readonly SemanticRelationship[],
  receipt: SemanticAdvisorReceipt,
): void {
  const result = validateSemanticInventoryBoundary(
    payload,
    relationships,
    receipt,
  );
  if (result.errors.length > 0) {
    throw new Error(
      `Proposition-complete ingestion failed: ${result.errors.join("; ")}. Run kb_model mode analyze (CLI: semantic-advisor) with the complete prose and preserve its inventory contract before retrying.`,
    );
  }
}

function modeledClaimKeysOf(payload: Payload): readonly string[] | null {
  if (stringValue(payload.type) !== "req") return null;
  if (
    propertiesOf(payload).semantic_inventory_version !==
    SEMANTIC_INVENTORY_VERSION
  )
    return null;
  return inventoryOf(payload)
    .filter(({ status }) => status === "modeled")
    .map(({ claim_key }) => stringValue(claim_key));
}

function groundingTargets(
  payload: Payload,
  relationships: readonly SemanticRelationship[],
): readonly string[] {
  return relationships
    .filter(
      (relationship) =>
        relationship.from === payload.id &&
        LOGICAL_RELATIONSHIPS.has(stringValue(relationship.type)),
    )
    .map((relationship) => stringValue(relationship.to));
}

function plannedClaimKey(planned: Readonly<Record<string, unknown>>): string {
  return planned.type === "fact" ? stringValue(planned.claim_key) : "";
}

function groundingClaimKeyError(
  modeledClaimKeys: readonly string[],
  grounded: readonly (readonly [target: string, claimKey: string])[],
): string | null {
  const missing = grounded.find(([, claimKey]) => !claimKey);
  if (missing)
    return `Proposition-complete ingestion failed: logical grounding target '${missing[0]}' must declare a claim_key.`;
  const groundedClaimKeys = grounded.map(([, claimKey]) => claimKey);
  const duplicate = groundedClaimKeys.find(
    (claimKey, index) => groundedClaimKeys.indexOf(claimKey) !== index,
  );
  if (duplicate)
    return `Proposition-complete ingestion failed: claim '${duplicate}' has more than one logical grounding relationship.`;
  if (
    groundedClaimKeys.length !== modeledClaimKeys.length ||
    modeledClaimKeys.some((claimKey) => !groundedClaimKeys.includes(claimKey))
  )
    return "Proposition-complete ingestion failed: modeled proposition claim_keys must match logical grounding target claim_keys exactly.";
  return null;
}

/**
 * The write-time claim_key check, run against planned writes only. Returns
 * null when it passes or when a target is outside the plan (the write-time
 * check reads that target from the KB).
 */
// implements REQ-kibi-proposition-complete-ingestion, REQ-bootstrap-intent-claim-accounting
export function stagedLogicalGroundingError(
  payload: Payload,
  relationships: readonly SemanticRelationship[],
  planned: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
): string | null {
  const modeledClaimKeys = modeledClaimKeysOf(payload);
  if (!modeledClaimKeys) return null;
  const grounded: (readonly [string, string])[] = [];
  for (const target of groundingTargets(payload, relationships)) {
    const entity = planned.get(target);
    if (entity === undefined) return null;
    grounded.push([target, plannedClaimKey(entity)]);
  }
  return groundingClaimKeyError(modeledClaimKeys, grounded);
}

// implements REQ-kibi-proposition-complete-ingestion
export async function assertLogicalGroundingClaimKeys(
  prolog: PrologPort,
  payload: Payload,
  relationships: readonly SemanticRelationship[],
  staged?: Readonly<{
    entities: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
  }>,
): Promise<void> {
  const modeledClaimKeys = modeledClaimKeysOf(payload);
  if (!modeledClaimKeys) return;
  const grounded: (readonly [string, string])[] = [];
  for (const target of groundingTargets(payload, relationships)) {
    // A grounding fact an earlier plan step writes is read from that write.
    const planned = staged?.entities.get(target);
    let claimKey = "";
    if (planned !== undefined) {
      claimKey = plannedClaimKey(planned);
    } else {
      const result = await prolog.query(
        `once((kb_entity('${escapeAtom(target)}', fact, _SemanticGroundProps), memberchk(claim_key=_SemanticGroundRaw, _SemanticGroundProps), normalize_term_atom(_SemanticGroundRaw, ClaimKey)))`,
      );
      claimKey = result.success
        ? stringValue(result.bindings.ClaimKey).replace(/^['"]|['"]$/g, "")
        : "";
    }
    grounded.push([target, claimKey]);
    // The first target without a claim_key is reported; later reads are moot.
    if (!claimKey) break;
  }
  const error = groundingClaimKeyError(modeledClaimKeys, grounded);
  if (error) throw new Error(error);
}
