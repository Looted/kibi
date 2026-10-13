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
    "Validate a kb_upsert payload without mutating the KB. Use this read-only preflight before kb_upsert, especially for requirements, because it returns schema/modeling errors plus semantic advisor receipts that identify prose likely needing kb_model mode requirement or predicates, ambiguity review, or an ontology-gap observation.",
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
    "Delete entities by ID, or exact relationship triples. Use only for intentional removals after dependency checks. Do not use as a bulk cleanup shortcut. An entity authored in a Markdown or YAML source is not deleted directly: the call writes nothing and returns outcome plan_returned with a hash-bound deletionPlan and a nextActions entry holding the exact kb_apply_plan input ({plan, approvedPlanHash}); apply that unmodified, or repeat this call with approvedPlanHash = deletionPlan.planHash to apply the freshly computed plan in one step (a stale or different hash fails with DELETE_PLAN_HASH_MISMATCH and writes nothing). Authored requirements are never deleted: outcome supersession_required points to kb_upsert with a supersedes relationship. dryRun:true previews any delete and writes nothing. Side effects: mutates and saves KB and authored sources; skips entities with dependents; dryRun and plan_returned write nothing.",
  businessInputSchema: {
    type: "object",
    oneOf: [
      { required: ["ids"], not: { required: ["relationships"] } },
      { required: ["relationships"], not: { required: ["ids"] } },
    ],
    properties: {
      ids: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description: "Entity IDs to delete after dependency checks.",
      },
      relationships: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["type", "from", "to"],
          additionalProperties: false,
          properties: {
            type: { type: "string", minLength: 1 },
            from: { type: "string", minLength: 1 },
            to: { type: "string", minLength: 1 },
          },
        },
        description:
          "Exact relationship triples to retract, including legacy shard records.",
      },
      approvedPlanHash: {
        type: "string",
        pattern: "^[a-fA-F0-9]{64}$",
        description:
          "With ids only: the deletionPlan.planHash a prior call for the same ids returned. The plan is recomputed and applied through kb_apply_plan when its hash still matches; a mismatch fails with DELETE_PLAN_HASH_MISMATCH and writes nothing. Not allowed with relationships or dryRun.",
      },
      dryRun: {
        type: "boolean",
        description:
          "Preview without writing. Relationship and direct entity deletes run their preflight and return outcome dry_run with wouldDelete counts, the sourceWrites (paths and hashes) a commit would make, and skippedEffects. Authored ids return the same deletion plan as without dryRun.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-write", "workspace-write"],
  execute: executeDelete,
} as const satisfies OperationSpec<DeleteInput, DeletePayload>;
