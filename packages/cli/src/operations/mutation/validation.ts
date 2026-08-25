import Ajv, { type ErrorObject } from "ajv";
import entitySchema from "../../public/schemas/entity.js";
import relationshipSchema from "../../public/schemas/relationship.js";
// implements REQ-kibi-operation-interface-parity
import {
  SYMBOL_ROLES,
  isAllowedGranularityReason,
} from "../../public/symbol-granularity.js";
import { verificationReceiptHistoryErrors } from "../../public/verification-receipt.js";
import { semanticClaimKey } from "../semantic-advisor/clauses.js";
import {
  factKindShapeHints,
  validateFactModelingShape,
  valueFieldHint,
} from "./strict-fact.js";
import type { UpsertInput, ValidatedUpsert } from "./types.js";

const ajv = new Ajv({ strict: false });
const schema = entitySchema as Record<string, unknown>;
const properties =
  schema.properties !== null && typeof schema.properties === "object"
    ? (schema.properties as Record<string, unknown>)
    : {};
const validateEntity = ajv.compile({
  ...schema,
  properties: {
    ...properties,
    granularity_reason: {
      type: "string",
      enum: [
        "config-artifact",
        "module-level-behavior",
        "extractor-miss",
        "legacy-link",
        "test-suite",
      ],
    },
    symbol_role: { type: "string", enum: [...SYMBOL_ROLES] },
  },
});
const validateRelationship = ajv.compile(relationshipSchema);

const ALIASES = new Map([
  ["subjectKey", "subject_key"],
  ["propertyKey", "property_key"],
  ["predicateName", "predicate_name"],
  ["predicateArgs", "predicate_args"],
  ["canonicalKey", "canonical_key"],
  ["closedWorld", "closed_world"],
]);

function formatEntityErrors(
  entity: Readonly<Record<string, unknown>>,
  errors: readonly ErrorObject[],
): string {
  const messages = errors.map((error) => {
    const params = error.params as {
      readonly additionalProperty?: string;
      readonly allowedValues?: readonly unknown[];
    };
    const path = error.instancePath || "root";
    if (error.keyword === "additionalProperties" && params.additionalProperty) {
      const property = params.additionalProperty;
      if (property === "value") {
        return `${path}: unknown property 'value'. ${valueFieldHint(entity.value)} Do not use generic value in kb_upsert.properties.`;
      }
      const canonical = ALIASES.get(property);
      if (canonical) {
        return `${path}: unknown property '${property}'. Did you mean '${canonical}'? kb_upsert.properties uses snake_case typed fact fields.`;
      }
    }
    if (error.keyword === "enum" && params.allowedValues) {
      return `${path}: ${error.message}. Allowed values: ${params.allowedValues.map(String).join(", ")}`;
    }
    return `${path}: ${error.message}`;
  });
  const hints = factKindShapeHints(entity);
  for (const [alias, canonical] of ALIASES) {
    if (Object.hasOwn(entity, alias)) {
      hints.push(
        `Unknown property '${alias}'. Use '${canonical}' in kb_upsert.properties.`,
      );
    }
  }
  if (Object.hasOwn(entity, "value")) hints.push(valueFieldHint(entity.value));
  if (
    hints.length > 0 &&
    (Object.hasOwn(entity, "value") ||
      [...ALIASES.keys()].some((key) => Object.hasOwn(entity, key)))
  ) {
    hints.push(
      "Next action: if starting from prose, call kb_model_requirement and apply its sequential applyPlan instead of guessing field names.",
    );
  }
  return [...messages, ...hints].join("; ");
}

export function validateUpsertInput(
  input: UpsertInput,
  now: Date,
): ValidatedUpsert {
  if (!input.type || !input.id) {
    throw new Error("'type' and 'id' are required for upsert");
  }
  const entity: Record<string, unknown> = {
    id: input.id,
    type: input.type,
    ...input.properties,
  };
  entity.created_at ??= now.toISOString();
  entity.updated_at ??= now.toISOString();
  entity.source ??= "mcp://kibi/upsert";
  if (!validateEntity(entity)) {
    throw new Error(
      `Entity validation failed: ${formatEntityErrors(entity, validateEntity.errors ?? [])}`,
    );
  }
  if (entity.type === "test" && Array.isArray(entity.verification_receipts)) {
    const receipts = entity.verification_receipts.filter(
      (value): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value),
    );
    const receiptErrors = verificationReceiptHistoryErrors(
      input.id,
      entity.verification_scope,
      receipts,
    );
    if (receiptErrors.length > 0) {
      throw new Error(`Entity validation failed: ${receiptErrors.join("; ")}`);
    }
  }
  validateFactModelingShape(entity);
  if (
    entity.type === "fact" &&
    typeof entity.claim_key === "string" &&
    typeof entity.claim_text === "string"
  ) {
    const expectedClaimKey = semanticClaimKey(entity.claim_text);
    if (entity.claim_key !== expectedClaimKey) {
      throw new Error(
        `Entity validation failed: claim_key must equal the stable key derived from claim_text (expected '${expectedClaimKey}')`,
      );
    }
  }
  const relationships = input.relationships ?? [];
  relationships.forEach((relationship, index) => {
    if (!validateRelationship(relationship)) {
      const details = (validateRelationship.errors ?? [])
        .map((error) => `${error.instancePath || "root"}: ${error.message}`)
        .join("; ");
      throw new Error(
        `Relationship validation failed at index ${index}: ${details}`,
      );
    }
  });
  return { entity, relationships };
}

export { isAllowedGranularityReason };
