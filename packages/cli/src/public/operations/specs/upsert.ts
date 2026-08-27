import type {
  UpsertInput,
  UpsertPayload,
} from "../../../operations/mutation/types.js";
import { executeUpsert } from "../../../operations/mutation/upsert.js";
import type { OperationSpec } from "../types.js";
import {
  ENTITY_PROPERTIES_SCHEMA,
  ENTITY_TYPES,
  RELATIONSHIPS_SCHEMA,
} from "./mutation-schemas.js";

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
      document: {
        type: "object",
        additionalProperties: false,
        description:
          "Optional source-first document write. Paths are workspace-relative; omit body when updating to preserve the existing body bytes.",
        properties: {
          path: { type: "string", minLength: 1 },
          body: { type: "string" },
        },
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-write", "workspace-write"],
  execute: executeUpsert,
} as const satisfies OperationSpec<UpsertInput, UpsertPayload>;
