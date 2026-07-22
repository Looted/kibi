import { executeDelete } from "../../../operations/mutation/delete.js";
import type {
  DeleteInput,
  DeletePayload,
  UpsertInput,
  ValidateUpsertPayload,
} from "../../../operations/mutation/types.js";
import { executeValidateUpsert } from "../../../operations/mutation/validate-upsert.js";
import type { OperationSpec } from "../types.js";
import { ENTITY_TYPES } from "./mutation-schemas.js";

export { upsertSpec } from "./upsert.js";

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
