import { executeDelete } from "../../../operations/mutation/delete.js";
import { executeUpsert } from "../../../operations/mutation/upsert.js";
import type {
  DeleteInput,
  DeletePayload,
  UpsertInput,
  UpsertPayload,
  ValidateUpsertPayload,
} from "../../../operations/mutation/types.js";
import { executeValidateUpsert } from "../../../operations/mutation/validate-upsert.js";
import type { OperationSpec } from "../types.js";

const ENTITY_TYPES = [
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
] as const;

const ENTITY_PROPERTIES_SCHEMA = {
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
    fact_kind: {
      type: "string",
      enum: [
        "subject",
        "property_value",
        "observation",
        "meta",
        "predicate_schema",
        "predicate",
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
  },
  required: ["title", "status"],
} as const;

const RELATIONSHIPS_SCHEMA = {
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

export const upsertSpec = {
  name: "kb_upsert",
  cliName: "upsert",
  description:
    "Create or update one entity and optional relationships. Use for KB mutations after validating intent; prefer kb_validate_upsert first because it returns semantic advisor receipts for prose-heavy requirements. Use kb_model_requirement before hand-writing strict property facts from prose, and kb_suggest_predicates before hand-writing ontology predicate facts. Use the `relationships` array for batch creation of multiple links in a single call (e.g., linking a requirement to multiple tests or facts). Prefer modeling requirements as reusable fact links (`constrains`, `requires_property`, or `requires_predicate`) so consistency and contradiction checks remain queryable. Relationship endpoints must already exist in KB. For requirements, the write will be rejected if it contradicts existing current requirements that constrain the same subject with incompatible properties. To replace a conflicting requirement, include a `supersedes` relationship from the new requirement to the old one in the same request. Successful writes may return non-blocking semantic advisor warnings; inspect and repair those warnings before treating prose as contradiction-checkable. Do not use for read-only inspection. Side effects: writes KB, may refresh symbol coordinates.",
  businessInputSchema: {
    type: "object",
    required: ["type", "id", "properties"],
    properties: {
      type: {
        type: "string",
        enum: ENTITY_TYPES,
        description:
          "Entity type to create/update. Allowed: req, scenario, test, adr, flag, event, symbol, fact. Example: 'req'.",
      },
      id: {
        type: "string",
        description:
          "Unique entity ID (string). Example: 'REQ-123'. Existing ID updates the entity; new ID creates it.",
      },
      properties: ENTITY_PROPERTIES_SCHEMA,
      relationships: RELATIONSHIPS_SCHEMA,
    },
  },
  requiresProlog: true,
  effects: ["kb-write", "workspace-write"],
  execute: executeUpsert,
} as const satisfies OperationSpec<UpsertInput, UpsertPayload>;

export const validateUpsertSpec = {
  name: "kb_validate_upsert",
  cliName: "validate-upsert",
  description:
    "Validate a kb_upsert payload without mutating the KB. Use this read-only preflight before kb_upsert, especially for requirements, because it returns schema/modeling errors plus semantic advisor receipts that identify prose likely needing kb_model_requirement, kb_suggest_predicates, ambiguity review, or an ontology-gap observation.",
  businessInputSchema: {
    type: "object",
    required: ["type", "id", "properties"],
    properties: {
      type: { type: "string", enum: ENTITY_TYPES },
      id: { type: "string" },
      properties: {
        type: "object",
        description:
          "Entity properties to validate using the same snake_case field names accepted by kb_upsert.",
      },
      relationships: { type: "array", items: { type: "object" } },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executeValidateUpsert,
} as const satisfies OperationSpec<UpsertInput, ValidateUpsertPayload>;

export const deleteSpec = {
  name: "kb_delete",
  cliName: "delete",
  description:
    "Delete entities by ID. Use only for intentional removals after dependency checks. Do not use as a bulk cleanup shortcut. Side effects: mutates and saves KB; skips entities with dependents.",
  businessInputSchema: {
    type: "object",
    required: ["ids"],
    properties: {
      ids: {
        type: "array",
        items: { type: "string" },
        description:
          "Required list of entity IDs to delete. Example: ['REQ-001','TEST-002']. At least one ID is required.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-write", "workspace-write"],
  execute: executeDelete,
} as const satisfies OperationSpec<DeleteInput, DeletePayload>;
