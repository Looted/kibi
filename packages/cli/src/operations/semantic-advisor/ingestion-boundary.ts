import { escapeAtom } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import { semanticClaimKey } from "./clauses.js";
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

type SemanticRelationship = Readonly<{
  type?: unknown;
  from?: unknown;
  to?: unknown;
}>;

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
        role !== expected.role ||
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
  const groundingCount = relationships.filter(
    (relationship) =>
      relationship.from === payload.id &&
      LOGICAL_RELATIONSHIPS.has(stringValue(relationship.type)),
  ).length;
  if (modeledCount !== groundingCount) {
    errors.push(
      `modeled semantic_inventory entries (${modeledCount}) must equal logical grounding relationships (${groundingCount})`,
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
      `Proposition-complete ingestion failed: ${result.errors.join("; ")}. Run kb_semantic_advisor with the complete prose and preserve its inventory contract before retrying.`,
    );
  }
}

// implements REQ-kibi-proposition-complete-ingestion
export async function assertLogicalGroundingClaimKeys(
  prolog: PrologPort,
  payload: Payload,
  relationships: readonly SemanticRelationship[],
): Promise<void> {
  if (stringValue(payload.type) !== "req") return;
  if (
    propertiesOf(payload).semantic_inventory_version !==
    SEMANTIC_INVENTORY_VERSION
  )
    return;
  const modeledClaimKeys = inventoryOf(payload)
    .filter(({ status }) => status === "modeled")
    .map(({ claim_key }) => stringValue(claim_key));
  const groundedClaimKeys: string[] = [];
  for (const relationship of relationships) {
    if (
      relationship.from !== payload.id ||
      !LOGICAL_RELATIONSHIPS.has(stringValue(relationship.type))
    )
      continue;
    const target = stringValue(relationship.to);
    const result = await prolog.query(
      `once((kb_entity('${escapeAtom(target)}', fact, _SemanticGroundProps), memberchk(claim_key=_SemanticGroundRaw, _SemanticGroundProps), normalize_term_atom(_SemanticGroundRaw, ClaimKey)))`,
    );
    const claimKey = result.success
      ? stringValue(result.bindings.ClaimKey).replace(/^['"]|['"]$/g, "")
      : "";
    if (!claimKey) {
      throw new Error(
        `Proposition-complete ingestion failed: logical grounding target '${target}' must declare a claim_key.`,
      );
    }
    groundedClaimKeys.push(claimKey);
  }
  const duplicate = groundedClaimKeys.find(
    (claimKey, index) => groundedClaimKeys.indexOf(claimKey) !== index,
  );
  if (duplicate) {
    throw new Error(
      `Proposition-complete ingestion failed: claim '${duplicate}' has more than one logical grounding relationship.`,
    );
  }
  if (
    groundedClaimKeys.length !== modeledClaimKeys.length ||
    modeledClaimKeys.some((claimKey) => !groundedClaimKeys.includes(claimKey))
  ) {
    throw new Error(
      "Proposition-complete ingestion failed: modeled proposition claim_keys must match logical grounding target claim_keys exactly.",
    );
  }
}
