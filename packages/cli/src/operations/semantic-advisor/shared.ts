import { createHash } from "node:crypto";

import { semanticClaimKey } from "./clauses.js";
import type {
  SemanticModelingSuggestion,
  SemanticPredicateClaim,
  SemanticStrictPropertyClaim,
} from "./types.js";

export type Payload = Readonly<Record<string, unknown>>;
export type MatchGroups = Readonly<Record<string, string | undefined>>;
export const SEMANTIC_INVENTORY_VERSION = "kibi.semantic-inventory.v1";
export type SemanticSourceField = "semantic_text" | "text_ref" | "title";

// implements REQ-mcp-semantic-advisor-preflight
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// implements REQ-mcp-semantic-advisor-preflight
export function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// implements REQ-mcp-semantic-advisor-preflight
export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

// implements REQ-mcp-semantic-advisor-preflight
export function payloadHash(payload: Payload): string {
  const stable = Object.fromEntries(
    Object.entries(payload).filter(([key]) => !key.startsWith("_")),
  );
  return createHash("sha256").update(canonicalize(stable)).digest("hex");
}

// implements REQ-kibi-legacy-migration-preview-v2
export function semanticSourceOf(payload: Payload): {
  readonly field: SemanticSourceField;
  readonly text: string;
} {
  const properties = propertiesOf(payload);
  const declaredField = stringValue(properties.semantic_source_field);
  if (
    declaredField === "semantic_text" ||
    declaredField === "text_ref" ||
    declaredField === "title"
  ) {
    return {
      field: declaredField,
      text: stringValue(properties[declaredField]),
    };
  }
  const semanticText = stringValue(properties.semantic_text);
  if (semanticText) return { field: "semantic_text", text: semanticText };
  const textRef = stringValue(properties.text_ref);
  return textRef
    ? { field: "text_ref", text: textRef }
    : { field: "title", text: stringValue(properties.title) };
}

export function semanticSourceHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function semanticClausesOf(
  payload: Payload,
): readonly string[] | undefined {
  const value = propertiesOf(payload).semantic_clauses;
  if (!Array.isArray(value)) return undefined;
  return value.filter(
    (clause): clause is string =>
      typeof clause === "string" && clause.trim().length > 0,
  );
}

// implements REQ-mcp-semantic-advisor-preflight
export function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

// implements REQ-mcp-semantic-advisor-preflight
export function propertiesOf(payload: Payload): Record<string, unknown> {
  return isRecord(payload.properties) ? payload.properties : {};
}

// implements REQ-mcp-semantic-advisor-preflight
export function statementOf(payload: Payload): string {
  return semanticSourceOf(payload).text;
}

// implements REQ-mcp-semantic-advisor-preflight
export function sourceOf(payload: Payload): string {
  return (
    stringValue(propertiesOf(payload).source) || "mcp://kibi/semantic-advisor"
  );
}

// implements REQ-mcp-semantic-advisor-preflight
export function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// implements REQ-mcp-semantic-advisor-preflight
export function normalizePredicateToken(value: string): string {
  return value
    .trim()
    .replace(/\b(?:a|an|the)\b\s*/gi, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// implements REQ-mcp-semantic-advisor-preflight
export function singularize(value: string): string {
  if (["status", "results"].includes(value)) return value;
  return value.endsWith("s") && value.length > 3 ? value.slice(0, -1) : value;
}

// implements REQ-mcp-semantic-advisor-preflight
export function normalizeSubjectKey(value: string): string {
  return normalizeKey(value).split("_").map(singularize).join(".");
}

export function relationship(
  from: string,
  to: string,
  type: string,
): Record<string, unknown> {
  return { type, from, to };
}

// implements REQ-mcp-semantic-advisor-preflight
export function strictSuggestion(
  payload: Payload,
  evidence: string,
  claim: SemanticStrictPropertyClaim,
  rationale: string,
  confidence = 0.9,
): SemanticModelingSuggestion {
  const claimText = statementOf(payload);
  const semanticSource = semanticSourceOf(payload);
  const reqId =
    stringValue(payload.id) || `REQ-SEMANTIC-${shortHash(claim.subject_key)}`;
  const subjectId = `FACT-SUBJECT-${shortHash(claim.subject_key)}`;
  const propertyId = `FACT-PROP-${shortHash(`${claim.subject_key}.${claim.property_key}.${claim.operator}.${canonicalize(claim)}`)}`;
  const source = sourceOf(payload);
  const value =
    claim.value_string ??
    claim.value_int ??
    claim.value_number ??
    claim.value_bool;
  const propertyFields = {
    ...(claim.value_string !== undefined
      ? { value_string: claim.value_string }
      : {}),
    ...(claim.value_int !== undefined ? { value_int: claim.value_int } : {}),
    ...(claim.value_number !== undefined
      ? { value_number: claim.value_number }
      : {}),
    ...(claim.value_bool !== undefined ? { value_bool: claim.value_bool } : {}),
    ...(claim.unit ? { unit: claim.unit } : {}),
  };
  return {
    kind: "strict_property",
    claim_key: semanticClaimKey(claimText),
    claim_text: claimText,
    confidence,
    evidence,
    rationale,
    suggested_next_tool: "kb_model_requirement",
    claim,
    rejected_alternatives: ["predicate", "observation_review"],
    applyPlan: [
      {
        type: "fact",
        id: subjectId,
        properties: {
          title: `${claim.subject_key} subject`,
          status: "active",
          source,
          fact_kind: "subject",
          subject_key: claim.subject_key,
          canonical_key: claim.subject_key,
          tags: ["lane:strict", "semantic-advisor-suggestion"],
        },
        relationships: [],
      },
      {
        type: "fact",
        id: propertyId,
        properties: {
          title: `${claim.subject_key} ${claim.property_key}`,
          status: "active",
          source,
          fact_kind: "property_value",
          subject_key: claim.subject_key,
          property_key: claim.property_key,
          operator: claim.operator,
          value_type: claim.value_type,
          ...propertyFields,
          canonical_key: `${claim.subject_key}.${claim.property_key}.${claim.operator}.${value}`,
          tags: ["lane:strict", "semantic-advisor-suggestion"],
        },
        relationships: [],
      },
      {
        type: "req",
        id: reqId,
        properties: {
          title:
            stringValue(propertiesOf(payload).title) ||
            "Semantic advisor requirement suggestion",
          status: "open",
          source,
          ...(semanticSource.field === "semantic_text"
            ? { semantic_text: statementOf(payload) }
            : semanticSource.field === "text_ref"
              ? { text_ref: statementOf(payload) }
              : {}),
          tags: ["semantic-advisor-suggestion"],
        },
        relationships: [
          relationship(reqId, subjectId, "constrains"),
          relationship(reqId, propertyId, "requires_property"),
        ],
      },
    ],
  };
}

// implements REQ-mcp-semantic-advisor-preflight
export function predicateSuggestion(
  payload: Payload,
  evidence: string,
  name: string,
  args: readonly string[],
  rationale: string,
  polarity: "assert" | "deny" = "assert",
): SemanticModelingSuggestion {
  const claimText = statementOf(payload);
  const canonicalKey = `${name}(${args.join(",")})`;
  const predicate: SemanticPredicateClaim = {
    predicate_name: name,
    predicate_args: args,
    canonical_key: canonicalKey,
    polarity,
  };
  const factId = `FACT-PRED-${shortHash(canonicalKey)}`;
  const reqId = stringValue(payload.id);
  return {
    kind: "predicate",
    claim_key: semanticClaimKey(claimText),
    claim_text: claimText,
    confidence: 0.84,
    evidence,
    rationale,
    suggested_next_tool: "kb_suggest_predicates",
    predicate,
    rejected_alternatives: ["strict_property"],
    applyPlan: [
      {
        type: "fact",
        id: factId,
        properties: {
          title: `${name} suggestion`,
          status: "active",
          source: sourceOf(payload),
          fact_kind: "predicate",
          predicate_name: name,
          predicate_args: args,
          canonical_key: canonicalKey,
          polarity,
          tags: ["lane:ontology", "semantic-advisor-suggestion"],
        },
        relationships: [],
      },
    ],
    relationshipPlan: reqId
      ? {
          applyAfter: factId,
          requiresExistingReq: reqId,
          relationship: relationship(reqId, factId, "requires_predicate"),
        }
      : null,
  };
}
