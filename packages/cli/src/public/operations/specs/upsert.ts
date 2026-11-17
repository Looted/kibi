import { executeUpsertRequest } from "../../../operations/mutation/implemented-by.js";
import type {
  UpsertInput,
  UpsertPayload,
} from "../../../operations/mutation/types.js";
import { ADVERTISED_DESCRIPTION } from "../advertised-schema.js";
import type { OperationSpec } from "../types.js";
import {
  ENTITY_PROPERTIES_SCHEMA,
  ENTITY_TYPES,
  RELATIONSHIPS_SCHEMA,
} from "./mutation-schemas.js";

/** kb_upsert's plannedFacts (dryRun only); kb_validate_upsert takes it too. */
export const PLANNED_FACTS_SCHEMA = {
  type: "array",
  description:
    "dryRun only. Fact upsert payloads (type, id, properties, optional relationships) that will be written before this payload, typically the applyPlan entries kb_model returned. They are validated in order and staged with the payload, so a requires_predicate or requires_property target that does not exist yet resolves, its claim_key is read from the plan, and the contradiction preview runs against the KB as it would be after the whole batch (result: stagedFacts, whatIf). A conflict the batch would introduce, such as an allow and a deny permission_rule on the same key, is refused as the commit would refuse it. Rejected without dryRun: write the facts first.",
  [ADVERTISED_DESCRIPTION]:
    "dryRun only: fact payloads (e.g. kb_model applyPlan entries) staged before this one, so their links resolve.",
  items: {
    type: "object",
    required: ["type", "id", "properties"],
    properties: {
      type: { type: "string", const: "fact" },
      id: { type: "string", minLength: 1 },
      properties: { type: "object" },
      relationships: RELATIONSHIPS_SCHEMA,
    },
  },
} as const;

/** kb_upsert's source-first document; kb_validate_upsert takes it too. */
export const UPSERT_DOCUMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  description:
    "Optional source-first document write. Paths are workspace-relative; omit body when updating to preserve the existing body bytes (a requirement whose semantic_text changes gets the new statement in place of the old one, with its context sections kept). For a new requirement pass a sectioned body: statement, '## Context' (why, who asked, constraints), '## Source' (blockquoted excerpt and reference); context never changes the checked meaning, which stays in semantic_text.",
  [ADVERTISED_DESCRIPTION]:
    "Optional source document write; omit body on update to keep it. New requirements take statement, Context, Source.",
  properties: {
    path: { type: "string", minLength: 1 },
    body: { type: "string" },
  },
} as const;

/** kb_upsert's implementedBy: the code a requirement write links to it. */
export const IMPLEMENTED_BY_SCHEMA = {
  type: "array",
  minItems: 1,
  description:
    "req only: the declarations that implement it, each {sourceFile, symbol} (function, Class.method or exported constant), with optional coveredBy test ids. Kibi creates or reuses each symbol, links it with implements and to each coveredBy test with covered_by; an entry that resolves to no single granular declaration is refused with candidates.",
  [ADVERTISED_DESCRIPTION]:
    "req only: declarations that implement it, each {sourceFile, symbol, coveredBy?}; linked by implements (and covered_by).",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["sourceFile", "symbol"],
    properties: {
      sourceFile: { type: "string", minLength: 1 },
      symbol: { type: "string", minLength: 1 },
      coveredBy: {
        type: "array",
        items: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

/** kb_upsert's why: the reason a requirement exists, in the asker's words. */
export const WHY_SCHEMA = {
  type: "string",
  minLength: 1,
  description:
    "req only: why the requirement exists, in the words of the person who asked ('Reason not stated' when they gave none). Kibi records it as rationale and as the body's Context section, with origin.ref as its Source.",
  [ADVERTISED_DESCRIPTION]: "req only: why it exists, in the asker's words.",
} as const;

export const upsertSpec = {
  name: "kb_upsert",
  cliName: "upsert",
  description:
    "Create or update one entity and optional relationships. Use for KB mutations after validating intent; prefer a dryRun:true call first because it validates without writing and returns semantic advisor receipts for prose-heavy requirements. Use kb_model (mode requirement) before hand-writing strict property facts from prose, and kb_model (mode predicates) before hand-writing ontology predicate facts. Use the `relationships` array for batch creation of multiple links in a single call (e.g., linking a requirement to multiple tests or facts). An update keeps the properties and relationships it leaves out: send the fields that change (with title and status) and only the links to add. Prefer modeling requirements as reusable fact links (`constrains`, `requires_property`, or `requires_predicate`) so consistency and contradiction checks remain queryable. Relationship endpoints must already exist in KB. For requirements, the write will be rejected if it contradicts existing current requirements that constrain the same subject with incompatible properties. To replace a conflicting requirement, include a `supersedes` relationship from the new requirement to the old one in the same request, then upsert the old requirement with status closed (kb_check blocks a superseded requirement that is not closed). Successful writes may return non-blocking semantic advisor warnings; inspect and repair those warnings before treating prose as contradiction-checkable. For a requirement send the statement as `document.body` and the reason as `why`; give other entities a prose body (kb_check blocks one without context). Never invent a reason: write 'Reason not stated'. A requirement write returns its open kb_check steps as nextActions. Do not use for read-only inspection. Side effects: writes KB, may refresh symbol coordinates; dryRun:true writes nothing.",
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
          "Unique entity ID (string). Example: 'REQ-cli-gc'. Name entities by the behavior they govern (<TYPE>-<area>-<behavior>), never by the next free number. Existing ID updates the entity; new ID creates it.",
        [ADVERTISED_DESCRIPTION]:
          "Unique entity ID named by the behavior it governs (<TYPE>-<area>-<behavior>); an existing ID updates the entity.",
      },
      properties: ENTITY_PROPERTIES_SCHEMA,
      relationships: RELATIONSHIPS_SCHEMA,
      dryRun: {
        type: "boolean",
        default: false,
        description:
          "Validate the payload and return schema/modeling errors, a normalized preview and the semantic advisor receipt without writing the KB or workspace. Use it as the preflight before the real write.",
        [ADVERTISED_DESCRIPTION]:
          "Validate and preview without writing the KB or workspace; use it as the preflight before the real write.",
      },
      plannedFacts: PLANNED_FACTS_SCHEMA,
      document: UPSERT_DOCUMENT_SCHEMA,
      implementedBy: IMPLEMENTED_BY_SCHEMA,
      why: WHY_SCHEMA,
    },
  },
  requiresProlog: true,
  effects: ["kb-write", "workspace-write"],
  execute: executeUpsertRequest,
} as const satisfies OperationSpec<UpsertInput, UpsertPayload>;
