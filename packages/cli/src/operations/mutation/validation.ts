import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import { proofReceiptHistoryErrors } from "../../public/proof-receipt.js";
import entitySchema from "../../public/schemas/entity.js";
import relationshipSchema from "../../public/schemas/relationship.js";
// implements REQ-kibi-operation-interface-parity
import {
  SYMBOL_ROLES,
  isAllowedGranularityReason,
} from "../../public/symbol-granularity.js";
import {
  deriveFactClaimKey,
  semanticClaimKey,
} from "../semantic-advisor/clauses.js";
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
// Compiled on first mutation: every CLI command imports this module, and
// most never validate an upsert.
let entityValidator: ValidateFunction | undefined;
let relationshipValidator: ValidateFunction | undefined;
function entitySchemaValidator(): ValidateFunction {
  entityValidator ??= ajv.compile(upsertEntitySchema);
  return entityValidator;
}
function relationshipSchemaValidator(): ValidateFunction {
  relationshipValidator ??= ajv.compile(relationshipSchema);
  return relationshipValidator;
}
const upsertEntitySchema = {
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
};

const ALIASES = new Map([
  ["subjectKey", "subject_key"],
  ["propertyKey", "property_key"],
  ["predicateName", "predicate_name"],
  ["predicateArgs", "predicate_args"],
  ["canonicalKey", "canonical_key"],
  ["closedWorld", "closed_world"],
]);

/** Property names agents use for entity prose that belongs in document.body. */
const DOCUMENT_TEXT_PROPERTIES = new Set([
  "body",
  "text",
  "description",
  "content",
  "markdown",
  "prose",
  "summary",
  "details",
]);

/** Whether the upsert entity schema defines `key` as an entity property. */
export function isUpsertEntityProperty(key: string): boolean {
  return Object.hasOwn(
    upsertEntitySchema.properties as Readonly<Record<string, unknown>>,
    key,
  );
}

/** Every top-level entity key the upsert entity schema does not define. */
function unknownEntityProperties(
  entity: Readonly<Record<string, unknown>>,
): string[] {
  const known = upsertEntitySchema.properties as Readonly<
    Record<string, unknown>
  >;
  return Object.keys(entity).filter((key) => !Object.hasOwn(known, key));
}

/**
 * The fields a type-conditional `else: { not: ... }` branch of the entity
 * schema forbids, and the types that may carry them; null for any other
 * schema path.
 */
function typeRestrictedFields(
  schemaPath: string,
): { fields: string[]; types: string[] } | null {
  const match = /^#\/allOf\/(\d+)\/else\/not$/.exec(schemaPath);
  if (match === null) return null;
  const allOf = (upsertEntitySchema as { allOf?: unknown }).allOf;
  const branch = Array.isArray(allOf) ? allOf[Number(match[1])] : undefined;
  if (branch === null || typeof branch !== "object") return null;
  const record = branch as {
    if?: { properties?: { type?: { const?: unknown; enum?: unknown } } };
    else?: { not?: { required?: unknown; anyOf?: unknown } };
  };
  const typeRule = record.if?.properties?.type;
  const types = Array.isArray(typeRule?.enum)
    ? typeRule.enum.map(String)
    : typeof typeRule?.const === "string"
      ? [typeRule.const]
      : [];
  const not = record.else?.not;
  const requiredLists = [
    not?.required,
    ...(Array.isArray(not?.anyOf)
      ? not.anyOf.map((entry: { required?: unknown }) => entry?.required)
      : []),
  ];
  const fields = requiredLists.flatMap((list) =>
    Array.isArray(list) ? list.map(String) : [],
  );
  return types.length > 0 && fields.length > 0 ? { fields, types } : null;
}

// implements REQ-kibi-symbol-link-guidance
/**
 * The documented status vocabulary of each entity type (docs/entity-schema.md).
 * The schema accepts the union of every type's statuses for older sources, so
 * an invalid status names only the values that fit the entity being written.
 */
const STATUS_VALUES_BY_TYPE: ReadonlyMap<string, readonly string[]> = new Map([
  ["req", ["open", "in_progress", "closed", "deprecated"]],
  ["scenario", ["draft", "active", "deprecated"]],
  ["test", ["passing", "failing", "skipped", "pending"]],
  ["adr", ["proposed", "accepted", "deprecated", "superseded"]],
  ["flag", ["active", "inactive", "deprecated"]],
  ["event", ["active", "deprecated"]],
  ["symbol", ["active", "deprecated", "removed"]],
  ["fact", ["active", "deprecated"]],
]);

// implements REQ-upsert-unknown-field-guidance
function formatEntityErrors(
  entity: Readonly<Record<string, unknown>>,
  errors: readonly ErrorObject[],
): string {
  // A field only some entity types carry fails a type-conditional `not`
  // branch; AJV then reports "must NOT be valid" plus the "else" it chose.
  const restricted = new Set(
    errors.flatMap((error) =>
      error.keyword === "not" && typeRestrictedFields(error.schemaPath)
        ? [error.schemaPath.replace(/\/else\/not$/, "/if")]
        : [],
    ),
  );
  const visible = errors.filter(
    (error) => !(error.keyword === "if" && restricted.has(error.schemaPath)),
  );
  const messages = visible.map((error) => {
    const restriction =
      error.keyword === "not" ? typeRestrictedFields(error.schemaPath) : null;
    if (restriction !== null) {
      const present = restriction.fields.filter((field) =>
        Object.hasOwn(entity, field),
      );
      const named = present.length > 0 ? present : restriction.fields;
      return `${named.join(", ")} ${named.length === 1 ? "is" : "are"} only valid on ${restriction.types.join(" and ")} entities; remove ${named.length === 1 ? "it" : "them"} from this ${String(entity.type ?? "entity")}`;
    }
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
      if (path === "root" && DOCUMENT_TEXT_PROPERTIES.has(property)) {
        const others = unknownEntityProperties(entity).filter(
          (key) => key !== property,
        );
        return `${path}: unknown property '${property}' (${error.message}). Entity prose (scenario, requirement, test, ADR or observation text) belongs in kb_upsert.document.body, not in kb_upsert.properties.${others.length > 0 ? ` Other unknown properties: ${others.map((key) => `'${key}'`).join(", ")}.` : ""}`;
      }
      if (path === "root") {
        const unknown = unknownEntityProperties(entity);
        const listed = unknown.length > 0 ? unknown : [property];
        const proseHint = listed.some((key) =>
          DOCUMENT_TEXT_PROPERTIES.has(key),
        )
          ? " Entity prose belongs in kb_upsert.document.body."
          : "";
        return `${path}: unknown propert${listed.length === 1 ? "y" : "ies"} ${listed.map((key) => `'${key}'`).join(", ")} (${error.message}). Remove ${listed.length === 1 ? "it" : "them"} from kb_upsert.properties or use fields the ${String(entity.type ?? "entity")} schema defines.${proseHint}`;
      }
      return `${path}: unknown property '${property}' (${error.message}).`;
    }
    if (error.keyword === "enum" && params.allowedValues) {
      const typed =
        path === "/status"
          ? STATUS_VALUES_BY_TYPE.get(String(entity.type))
          : undefined;
      if (typed !== undefined)
        return `${path}: ${error.message}. Allowed values for ${String(entity.type)} entities: ${typed.join(", ")}`;
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
  const validateEntity = entitySchemaValidator();
  if (!validateEntity(entity)) {
    throw new Error(
      `Entity validation failed: ${formatEntityErrors(entity, validateEntity.errors ?? [])}`,
    );
  }
  deriveFactClaimKey(entity);
  validateSymbolSourceFile(entity);
  validateProofExemptionPairing(entity);
  if (entity.type === "test" && Array.isArray(entity.proof_receipts)) {
    const receipts = entity.proof_receipts.filter(
      (value): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value),
    );
    const receiptErrors = proofReceiptHistoryErrors(
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
  const validateRelationship = relationshipSchemaValidator();
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

/**
 * A symbol whose sourceFile points into .kb/ can publish coordinates to the
 * artifact, but the engine never merges coordinates for KB-internal paths —
 * coverage then reports missing_symbol_coordinates forever with no signal.
 * Reject the configuration at upsert time instead.
 *
 * Also reject absolute paths and `..` escapes so coordinate refresh cannot be
 * used as a workspace-escape oracle against files outside the repository.
 */
function validateSymbolSourceFile(
  entity: Readonly<Record<string, unknown>>,
): void {
  if (entity.type !== "symbol") return;
  const sourceFile = entity.sourceFile;
  if (typeof sourceFile !== "string" || sourceFile.trim() === "") return;
  const normalized = sourceFile.replaceAll("\\", "/").trim();
  if (normalized === ".kb" || normalized.startsWith(".kb/")) {
    throw new Error(
      `Entity validation failed: symbol sourceFile must point at a real code file in the workspace, not into the knowledge base ('${sourceFile}'). Coordinates for .kb/ paths are never merged into the engine, so coverage would report missing_symbol_coordinates permanently. Point the symbol at the implementing or verifying code file instead.`,
    );
  }
  // Lexical confinement (no workspace root needed): absolute paths and `..`
  // segments are never valid authored sourceFile values.
  if (
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.startsWith("//") ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(
      `Entity validation failed: symbol sourceFile must be a workspace-relative path ('${sourceFile}'). Absolute paths and '..' escapes are rejected so coordinate refresh cannot read files outside the repository.`,
    );
  }
}

/**
 * proof_exempt parks a current requirement outside E2E-proof scope. Without a
 * reason the requirement would disappear from the proof ladder silently, so
 * the exemption only exists with its justification attached (mirrored in
 * requirement_proof.pl, which ignores an exemption without a reason).
 */
function validateProofExemptionPairing(
  entity: Readonly<Record<string, unknown>>,
): void {
  if (entity.type !== "req") return;
  const flag = entity.proof_exempt;
  const isExempt =
    flag === true ||
    flag === "true" ||
    flag === "yes" ||
    flag === "on" ||
    flag === 1 ||
    flag === "1";
  if (!isExempt) return;
  const reason = entity.proof_exempt_reason;
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new Error(
      "Entity validation failed: proof_exempt requires a non-empty proof_exempt_reason explaining why the requirement is outside E2E-proof scope",
    );
  }
}
