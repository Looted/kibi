import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import { KbRejection } from "../../cli-errors.js";
import { proofReceiptHistoryErrors } from "../../public/proof-receipt.js";
import entitySchema from "../../public/schemas/entity.js";
import relationshipSchema from "../../public/schemas/relationship.js";
import {
  SYMBOL_ROLES,
  isAllowedGranularityReason,
} from "../../public/symbol-granularity.js";
import { schemaIssues } from "../../telemetry-details.js";
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

// rationale: with Ajv's default options this schema compiles with logged
// strict-mode warnings only; it accepts and rejects exactly the same entities.
// Stryker disable next-line ObjectLiteral
const ajv = new Ajv({ strict: false });
const schema = entitySchema as Record<string, unknown>;
const properties = schema.properties as Record<string, unknown>;
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

type TypeConditionalBranch = {
  if: { properties: { type: { const?: string; enum?: string[] } } };
  else: { not: TypeConditionalNot };
};
type TypeConditionalNot = { required?: string[]; anyOf?: TypeConditionalNot[] };

/**
 * The fields a type-conditional `else: { not: ... }` branch of the entity
 * schema forbids, and the types that may carry them. Every `not` in the
 * entity schema is such a branch, at `#/allOf/<n>/else/not`, so a `not`
 * error always names one.
 */
function typeRestrictedFields(schemaPath: string): {
  fields: string[];
  types: string[];
} {
  const allOf = (upsertEntitySchema as unknown as { allOf: unknown[] }).allOf;
  const branch = allOf[
    Number(schemaPath.split("/")[2])
  ] as TypeConditionalBranch;
  const typeRule = branch.if.properties.type;
  const types = typeRule.enum ?? [typeRule.const as string];
  const not = branch.else.not;
  const alternatives = not.anyOf ?? [not];
  const fields = alternatives.flatMap((entry) => entry.required as string[]);
  return { fields, types };
}

/**
 * The documented status vocabulary of each entity type (docs/entity-schema.md).
 * The schema accepts the union of every type's statuses for older sources, so
 * an invalid status names only the values that fit the entity being written.
 */
const STATUS_VALUES_BY_TYPE: ReadonlyMap<string, readonly string[]> = new Map([
  ["req", ["open", "in_progress", "closed", "retired"]],
  ["scenario", ["draft", "active", "deprecated"]],
  ["test", ["passing", "failing", "skipped", "pending"]],
  ["adr", ["proposed", "accepted", "deprecated", "superseded"]],
  ["flag", ["active", "inactive", "deprecated"]],
  ["event", ["active", "deprecated"]],
  ["symbol", ["active", "deprecated", "removed"]],
  ["fact", ["active", "deprecated"]],
]);

function formatEntityErrors(
  entity: Readonly<Record<string, unknown>>,
  errors: readonly ErrorObject[],
): string {
  // A field only some entity types carry fails a type-conditional `not`
  // branch (AJV reports only that `not`, never the `if`). The type is always
  // set: validateUpsertInput requires it.
  const type = String(entity.type);
  const messages = errors.map((error) => {
    if (error.keyword === "not") {
      const restriction = typeRestrictedFields(error.schemaPath);
      // The `not` fails because at least one listed field is present.
      const named = restriction.fields.filter((field) =>
        Object.hasOwn(entity, field),
      );
      return `${named.join(", ")} ${named.length === 1 ? "is" : "are"} only valid on ${restriction.types.join(" and ")} entities; remove ${named.length === 1 ? "it" : "them"} from this ${type}`;
    }
    const path = error.instancePath || "root";
    if (error.keyword === "additionalProperties") {
      const property = (error.params as { additionalProperty: string })
        .additionalProperty;
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
        // The reported property is one of the entity's unknown keys.
        const listed = unknownEntityProperties(entity);
        const proseHint = listed.some((key) =>
          DOCUMENT_TEXT_PROPERTIES.has(key),
        )
          ? " Entity prose belongs in kb_upsert.document.body."
          : "";
        return `${path}: unknown propert${listed.length === 1 ? "y" : "ies"} ${listed.map((key) => `'${key}'`).join(", ")} (${error.message}). Remove ${listed.length === 1 ? "it" : "them"} from kb_upsert.properties or use fields the ${type} schema defines.${proseHint}`;
      }
      return `${path}: unknown property '${property}' (${error.message}).`;
    }
    if (error.keyword === "enum") {
      const allowedValues = (error.params as { allowedValues: unknown[] })
        .allowedValues;
      const typed =
        path === "/status" ? STATUS_VALUES_BY_TYPE.get(type) : undefined;
      if (typed !== undefined)
        return `${path}: ${error.message}. Allowed values for ${type} entities: ${typed.join(", ")}`;
      return `${path}: ${error.message}. Allowed values: ${allowedValues.map(String).join(", ")}`;
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
  // Either one already pushed a hint above.
  if (
    Object.hasOwn(entity, "value") ||
    [...ALIASES.keys()].some((key) => Object.hasOwn(entity, key))
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
    throw new KbRejection(
      "VALIDATION_FAILED",
      "'type' and 'id' are required for upsert",
      [{ rule: "required", field: input.type ? "id" : "type" }],
    );
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
    throw new KbRejection(
      "ENTITY_VALIDATION_FAILED",
      `Entity validation failed: ${formatEntityErrors(entity, validateEntity.errors as ErrorObject[])}`,
      schemaIssues(validateEntity.errors),
    );
  }
  deriveFactClaimKey(entity);
  validateSymbolSourceFile(entity);
  validateProofExemptionPairing(entity);
  validateRetiredReason(entity);
  // The schema admits proof_receipts only on a test, as an array of objects.
  if (entity.proof_receipts !== undefined) {
    const receiptErrors = proofReceiptHistoryErrors(
      input.id,
      entity.verification_scope,
      entity.proof_receipts as Record<string, unknown>[],
    );
    if (receiptErrors.length > 0) {
      throw new KbRejection(
        "ENTITY_VALIDATION_FAILED",
        `Entity validation failed: ${receiptErrors.join("; ")}`,
        [{ rule: "proof_receipt_history", field: "proof_receipts" }],
      );
    }
  }
  validateFactModelingShape(entity);
  // The schema admits claim_key only on a fact, and only with claim_text.
  if (entity.claim_key !== undefined) {
    const expectedClaimKey = semanticClaimKey(entity.claim_text as string);
    if (entity.claim_key !== expectedClaimKey) {
      throw new KbRejection(
        "ENTITY_VALIDATION_FAILED",
        `Entity validation failed: claim_key must equal the stable key derived from claim_text (expected '${expectedClaimKey}')`,
        [{ rule: "claim_key_mismatch", field: "claim_key" }],
      );
    }
  }
  const relationships = input.relationships ?? [];
  const validateRelationship = relationshipSchemaValidator();
  relationships.forEach((relationship, index) => {
    if (!validateRelationship(relationship)) {
      // AJV stops at the first error of this flat schema.
      const error = (
        validateRelationship.errors as ErrorObject[]
      )[0] as ErrorObject;
      const details = `${error.instancePath || "root"}: ${error.message}`;
      throw new KbRejection(
        "RELATIONSHIP_VALIDATION_FAILED",
        `Relationship validation failed at index ${index}: ${details}`,
        schemaIssues(validateRelationship.errors, ["relationships", "0"]),
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
  // The schema types sourceFile as a string; a blank one passes both checks.
  const sourceFile = entity.sourceFile;
  if (typeof sourceFile !== "string") return;
  const normalized = sourceFile.replaceAll("\\", "/").trim();
  if (normalized === ".kb" || normalized.startsWith(".kb/")) {
    throw new KbRejection(
      "ENTITY_VALIDATION_FAILED",
      `Entity validation failed: symbol sourceFile must point at a real code file in the workspace, not into the knowledge base ('${sourceFile}'). Coordinates for .kb/ paths are never merged into the engine, so coverage would report missing_symbol_coordinates permanently. Point the symbol at the implementing or verifying code file instead.`,
      [{ rule: "symbol_source_in_kb", field: "sourceFile" }],
    );
  }
  // Lexical confinement (no workspace root needed): absolute paths and `..`
  // segments are never valid authored sourceFile values.
  if (
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new KbRejection(
      "ENTITY_VALIDATION_FAILED",
      `Entity validation failed: symbol sourceFile must be a workspace-relative path ('${sourceFile}'). Absolute paths and '..' escapes are rejected so coordinate refresh cannot read files outside the repository.`,
      [{ rule: "symbol_source_outside_workspace", field: "sourceFile" }],
    );
  }
}

/**
 * A retired requirement no longer governs, so the status only exists with the
 * reason the behavior is gone (mirrored by the retired-reason-missing check
 * rule for hand-edited sources).
 */
// implements REQ-kb-requirement-retired-status
function validateRetiredReason(
  entity: Readonly<Record<string, unknown>>,
): void {
  if (entity.type !== "req" || entity.status !== "retired") return;
  // The schema admits retired_reason only as a non-blank string.
  if (entity.retired_reason === undefined) {
    throw new KbRejection(
      "ENTITY_VALIDATION_FAILED",
      "Entity validation failed: status retired requires retired_reason saying why the behavior no longer exists (with the date or change that retired it)",
      [{ rule: "required", field: "retired_reason" }],
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
  // The schema admits proof_exempt only on a req, as a boolean.
  if (entity.proof_exempt !== true) return;
  const reason = entity.proof_exempt_reason;
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new KbRejection(
      "ENTITY_VALIDATION_FAILED",
      "Entity validation failed: proof_exempt requires a non-empty proof_exempt_reason explaining why the requirement is outside E2E-proof scope",
      [{ rule: "required", field: "proof_exempt_reason" }],
    );
  }
}
