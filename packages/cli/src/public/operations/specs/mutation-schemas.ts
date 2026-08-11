import { VERIFICATION_RECEIPT_SCHEMA } from "../../verification-receipt.js";

export const ENTITY_TYPES = [
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
] as const;

const CLAIM_PROVENANCE_CONDITIONAL = JSON.parse(`{
  "if": {
    "anyOf": [
      { "required": ["claim_key"] },
      { "required": ["claim_text"] }
    ]
  },
  "then": { "required": ["claim_key", "claim_text"] }
}`) as Record<string, unknown>;

export const ENTITY_PROPERTIES_SCHEMA = {
  type: "object",
  description:
    "Entity fields to persist. Must include title and status. If created_at, updated_at, or source are omitted, server fills defaults.",
  properties: {
    title: {
      type: "string",
      description:
        "Required short title. Example: 'Protect account settings endpoint'.",
    },
    status: {
      type: "string",
      description:
        "Required lifecycle state. Allowed values depend on entity type; backward-compatible legacy statuses are also accepted. Examples: 'open', 'passing', 'accepted', 'active'.",
    },
    source: {
      type: "string",
      description:
        "Optional provenance string. Example: 'docs/requirements/REQ-123.md'. Defaults to 'mcp://kibi/upsert'.",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Optional categorization tags. Example: ['security','api'].",
    },
    owner: {
      type: "string",
      description: "Optional owner name/team. Example: 'platform-team'.",
    },
    priority: {
      type: "string",
      description: "Optional priority label. Example: 'high'.",
    },
    severity: {
      type: "string",
      description: "Optional severity label. Example: 'critical'.",
    },
    links: {
      type: "array",
      items: { type: "string" },
      description:
        "Optional references. Example: ['REQ-010','https://example.com/spec'].",
    },
    text_ref: {
      type: "string",
      description:
        "Optional text anchor/reference. Example: 'requirements.md#L40'.",
    },
    semantic_text: {
      type: "string",
      description:
        "Requirement-only authored prose used for semantic inventory hashes and UTF-8 spans. Keep text_ref available for independent document or code evidence.",
    },
    logic_claims: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", pattern: "^CLAIM-[A-F0-9]{16}$" },
      description:
        "Requirement-only manifest of every atomic normative claim key returned by kb_semantic_advisor. A requirement is logic-complete only when every key is grounded by a linked property_value or predicate fact with the same claim_key.",
    },
    semantic_clauses: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
      description:
        "Optional complete atomic decomposition used by kb_semantic_advisor and proposition-complete ingestion. Preserve it when automatic sentence splitting needs a reviewed override.",
    },
    semantic_inventory_version: {
      type: "string",
      const: "kibi.semantic-inventory.v1",
      description:
        "Requirement-only proposition ledger contract version returned by kb_semantic_advisor.",
    },
    semantic_source_field: {
      type: "string",
      enum: ["semantic_text", "text_ref", "title"],
      description:
        "Requirement field whose exact UTF-8 bytes anchor semantic_inventory spans.",
    },
    semantic_source_hash: {
      type: "string",
      pattern: "^[a-f0-9]{64}$",
      description:
        "SHA-256 of the exact semantic source text returned in the advisor inventory contract.",
    },
    sourceFile: {
      type: "string",
      description:
        "Optional code source file for symbol entities. Example: 'src/auth/login.ts'.",
    },
    granularity_reason: {
      type: "string",
      enum: [
        "config-artifact",
        "module-level-behavior",
        "extractor-miss",
        "legacy-link",
      ],
      description:
        "Optional justification for a coarse file/module-level symbol traceability relationship when narrower function/class/type symbols exist.",
    },
    symbol_role: {
      type: "string",
      enum: [
        "behavioral",
        "structural",
        "type-shape",
        "config",
        "module",
        "unknown",
      ],
      description:
        "Optional role classification for symbol entities. Example: 'behavioral'.",
    },
    verification_scope: {
      type: "string",
      enum: ["unit", "integration", "end_to_end"],
      description:
        "Optional typed verification scope for test entities. Example: 'end_to_end'.",
    },
    verification_perspective: {
      type: "string",
      enum: ["internal", "consumer"],
      description:
        "Optional typed verification perspective for test entities. Example: 'consumer'.",
    },
    verification_receipts: {
      type: "array",
      maxItems: 50,
      items: VERIFICATION_RECEIPT_SCHEMA,
      description:
        "Append-only test execution evidence. Proof accepts only the newest valid passed receipt bound to the current code snapshot and within the seven-day freshness window.",
    },
    fact_kind: {
      type: "string",
      enum: [
        "subject",
        "property_value",
        "observation",
        "meta",
        "predicate_schema",
        "predicate",
        "rule_schema",
        "rule",
      ],
      description:
        "Optional fact lane kind for fact entities. Strict lane uses 'subject' and 'property_value'; context lane uses 'observation' or 'meta'; ontology lane uses 'predicate_schema' or 'predicate'. Use kb_model_requirement or kb_suggest_predicates when starting from prose.",
    },
    subject_key: {
      type: "string",
      description:
        "Snake_case only. Optional canonical subject key for strict fact entities. Example: 'user.session'. Do not use subjectKey in kb_upsert.properties.",
    },
    property_key: {
      type: "string",
      description:
        "Snake_case only. Optional canonical property key for property_value facts. Example: 'session.timeout_minutes'. Do not use propertyKey in kb_upsert.properties.",
    },
    operator: {
      type: "string",
      enum: ["eq", "neq", "lt", "lte", "gt", "gte"],
      description:
        "Optional comparison operator for property_value facts. Example: 'eq'.",
    },
    value_type: {
      type: "string",
      enum: ["string", "int", "number", "bool"],
      description:
        "Optional typed value discriminator for property_value facts. Pair with exactly one value_string, value_int, value_number, or value_bool; do not use generic value.",
    },
    value_string: {
      type: "string",
      description: "Optional string value for property_value facts.",
    },
    value_int: {
      type: "integer",
      description: "Optional integer value for property_value facts.",
    },
    value_number: {
      type: "number",
      description: "Optional number value for property_value facts.",
    },
    value_bool: {
      type: "boolean",
      description: "Optional boolean value for property_value facts.",
    },
    unit: {
      type: "string",
      description: "Optional unit for numeric property_value facts.",
    },
    scope: {
      type: "string",
      description: "Optional scope qualifier for fact entities.",
    },
    polarity: {
      type: "string",
      enum: ["require", "forbid", "assert", "deny"],
      description: "Optional polarity for property_value or predicate facts.",
    },
    closed_world: {
      type: "boolean",
      description:
        "Optional closed-world marker for strict fact interpretation.",
    },
    canonical_key: {
      type: "string",
      description:
        "Optional canonical identity key for predicate or strict fact claims.",
    },
    claim_key: {
      type: "string",
      pattern: "^CLAIM-[A-F0-9]{16}$",
      description:
        "Stable semantic-advisor key for the atomic prose clause grounded by this fact.",
    },
    claim_text: {
      type: "string",
      description:
        "Exact atomic requirement clause represented by this fact, retained for human audit.",
    },
    predicate_name: {
      type: "string",
      description:
        "Optional predicate name for ontology predicate facts. Prefer kb_suggest_predicates before hand-writing predicate_name.",
    },
    predicate_args: {
      type: "array",
      items: { type: "string" },
      description:
        "Optional ordered predicate arguments for ontology predicate facts. Prefer kb_suggest_predicates before hand-writing predicate_args.",
    },
    predicate_namespace: {
      type: "string",
      description: "Optional namespace for a project-local predicate schema.",
    },
    predicate_arity: {
      type: "integer",
      minimum: 1,
      description: "Required arity for predicate_schema facts.",
    },
    argument_names: {
      type: "array",
      items: { type: "string" },
      description: "Ordered argument role names for predicate_schema facts.",
    },
    argument_types: {
      type: "array",
      items: { type: "string" },
      description: "Ordered argument types for predicate_schema facts.",
    },
    argument_descriptions: {
      type: "array",
      items: { type: "string" },
      description: "Optional ordered argument explanations.",
    },
    aliases: {
      type: "array",
      items: { type: "string" },
      description: "Optional vocabulary aliases for predicate discovery.",
    },
    examples: {
      type: "array",
      items: { type: "string" },
      description: "Optional ground-term examples for a predicate schema.",
    },
    semantic_inventory: {
      type: "array",
      description:
        "Requirement proposition ledger returned by kb_semantic_advisor; preserve entries while modeling each assertive span.",
      items: { type: "object" },
    },
    rule_ir: {
      type: "object",
      description:
        "Schema-validated kibi.logic.v1 rule IR. It is persisted as data and never executed as caller-supplied Prolog.",
    },
    rule_hash: {
      type: "string",
      description: "Deterministic hash of canonical rule_ir.",
    },
    rule_schema_id: {
      type: "string",
      description: "Rule schema fact ID used to validate this rule.",
    },
    rule_name: { type: "string", description: "Stable rule schema name." },
    semantic_key: {
      type: "string",
      description:
        "Canonical semantic identity of the normalized logical model.",
    },
    claim_span_start: { type: "integer", minimum: 0 },
    claim_span_end: { type: "integer", minimum: 0 },
  },
  allOf: [
    CLAIM_PROVENANCE_CONDITIONAL,
    {
      if: { required: ["verification_receipts"] },
      // biome-ignore lint/suspicious/noThenProperty: JSON Schema conditional keyword.
      then: { required: ["verification_scope"] },
    },
  ],
  required: ["title", "status"],
} as const;

export const RELATIONSHIPS_SCHEMA = {
  type: "array",
  description:
    "Optional relationship rows to create in the same call. For requirement encoding, prefer `constrains` + `requires_property` for strict property facts or `requires_predicate` for ontology predicate facts. Side effect: asserts edges in KB.",
  items: {
    type: "object",
    required: ["type", "from", "to"],
    properties: {
      type: {
        type: "string",
        enum: [
          "depends_on",
          "specified_by",
          "verified_by",
          "validates",
          "implements",
          "covered_by",
          "executable_for",
          "constrained_by",
          "constrains",
          "requires_property",
          "requires_predicate",
          "requires_rule",
          "guards",
          "publishes",
          "consumes",
          "supersedes",
          "relates_to",
        ],
        description:
          "Relationship type enum. Use only supported values. Direction semantics follow KB model (e.g., implements symbol->req, verified_by req/scenario->test, executable_for symbol->test).",
      },
      from: {
        type: "string",
        description:
          "Source entity ID (must exist). Example: 'SYM-login-handler'.",
      },
      to: {
        type: "string",
        description: "Target entity ID (must exist). Example: 'REQ-001'.",
      },
    },
  },
} as const;
