import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import Ajv, { type ErrorObject } from "ajv";
import type { PrologProcess } from "kibi-cli/prolog";
import {
  escapeAtom,
  toPrologAtom,
  toPrologString,
} from "kibi-cli/prolog/codec";
import {
  type GranularSymbolCandidate,
  SYMBOL_ROLES,
  type SymbolKind,
  getBehavioralSymbolNames,
  getNonBehavioralSymbolNames,
  inferSymbolRole,
  isAllowedGranularityReason,
  isTraceabilityRelationshipType,
} from "kibi-cli/public/symbol-granularity";
import entitySchema from "kibi-cli/schemas/entity";
import relationshipSchema from "kibi-cli/schemas/relationship";
import { Project, ScriptKind } from "ts-morph";
import { isMcpDebugEnabled } from "../env.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import type { SemanticAdvisorReceipt } from "../semantic-advisor/types.js";
import {
  formatInvalidRelationshipError,
  formatRelationshipSourceMismatch,
  validateLiveRelationshipTargets,
} from "./relationship-validation.js";
import { refreshCoordinatesForSymbolId } from "./symbols.js";

let refreshCoordinatesForSymbolIdImpl = refreshCoordinatesForSymbolId;

export interface UpsertArgs {
  /** Entity type (req, scenario, test, adr, flag, event, symbol, fact) */
  type: string;
  /** Unique entity identifier */
  id: string;
  /** Key-value pairs to store as RDF properties (title, status, source, tags, etc.) */
  properties: Record<string, unknown>;
  /** Optional relationships to create alongside this entity */
  relationships?: Array<Record<string, unknown>>;
  /** Internal: skip contradiction detection for bulk operations (improves performance) */
  _skipContradictionCheck?: boolean;
  /** Internal: tool-call request/session identifier when available */
  _requestId?: string;
}

export interface UpsertResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    created: number;
    updated: number;
    relationships_created: number;
    warnings: string[];
    semanticAdvisor: SemanticAdvisorReceipt;
    contradictionCheck?: {
      outcome: "no-conflict" | "skipped";
      checked_req_id: string;
      strict_readiness: string;
    };
  };
}

export interface ValidatedUpsertArgs {
  entity: Record<string, unknown>;
  relationships: Array<Record<string, unknown>>;
}

const ajv = new Ajv({ strict: false });
const entitySchemaRecord = entitySchema as Record<string, unknown>;
const entitySchemaProperties = entitySchemaRecord.properties;
const normalizedEntitySchemaProperties =
  entitySchemaProperties !== null &&
  typeof entitySchemaProperties === "object" &&
  !Array.isArray(entitySchemaProperties)
    ? (entitySchemaProperties as Record<string, unknown>)
    : {};
const validateEntity = ajv.compile({
  ...entitySchemaRecord,
  properties: {
    ...normalizedEntitySchemaProperties,
    granularity_reason: {
      type: "string",
      enum: [
        "config-artifact",
        "module-level-behavior",
        "extractor-miss",
        "legacy-link",
      ],
    },
    symbol_role: {
      type: "string",
      enum: [...SYMBOL_ROLES],
    },
  },
});
const validateRelationship = ajv.compile(relationshipSchema);

const PROPERTY_ALIAS_HINTS = new Map([
  ["subjectKey", "subject_key"],
  ["propertyKey", "property_key"],
  ["predicateName", "predicate_name"],
  ["predicateArgs", "predicate_args"],
  ["canonicalKey", "canonical_key"],
  ["closedWorld", "closed_world"],
]);

const PROPERTY_VALUE_FIELDS = [
  "value_string",
  "value_int",
  "value_number",
  "value_bool",
];

function valueFieldHint(value: unknown): string {
  if (typeof value === "boolean") {
    return `Use value_type: "bool" plus value_bool: ${String(value)}.`;
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? `Use value_type: "int" plus value_int: ${String(value)}.`
      : `Use value_type: "number" plus value_number: ${String(value)}.`;
  }
  if (typeof value === "string") {
    return `Use value_type: "string" plus value_string: ${JSON.stringify(value)}.`;
  }
  return "Use value_type plus exactly one of value_string, value_int, value_number, or value_bool.";
}

function ajvErrorParams(error: ErrorObject): {
  additionalProperty?: string;
  allowedValues?: unknown[];
} {
  return error.params as {
    additionalProperty?: string;
    allowedValues?: unknown[];
  };
}

function factKindShapeHints(entity: Record<string, unknown>): string[] {
  if (entity.type !== "fact") return [];

  if (entity.fact_kind === "property_value") {
    const missing = [
      "subject_key",
      "property_key",
      "operator",
      "value_type",
    ].filter((field) => entity[field] === undefined);
    const presentValueFields = PROPERTY_VALUE_FIELDS.filter(
      (field) => entity[field] !== undefined,
    );
    const hints: string[] = [];
    if (missing.length > 0) {
      hints.push(`fact_kind 'property_value' requires ${missing.join(", ")}.`);
    }
    if (presentValueFields.length !== 1) {
      hints.push(
        "fact_kind 'property_value' requires exactly one typed value field: value_string, value_int, value_number, or value_bool.",
      );
    }
    if (hints.length > 0) {
      hints.push(
        "Next action: use kb_model_requirement for prose claims, or provide subject_key, property_key, operator, value_type, and one value_* field in kb_upsert.properties.",
      );
    }
    return hints;
  }

  if (entity.fact_kind === "predicate") {
    const predicateArgs = entity.predicate_args;
    const hasPredicateArgs =
      Array.isArray(predicateArgs) && predicateArgs.length > 0;
    const missing = [
      ...(entity.predicate_name === undefined ? ["predicate_name"] : []),
      ...(!hasPredicateArgs ? ["predicate_args"] : []),
      ...(entity.canonical_key === undefined ? ["canonical_key"] : []),
    ];
    const hints: string[] = [];
    if (missing.length > 0) {
      hints.push(`fact_kind 'predicate' requires ${missing.join(", ")}.`);
    }
    if (hints.length > 0) {
      hints.push(
        "Next action: call kb_suggest_predicates before hand-writing ontology predicate facts.",
      );
    }
    return hints;
  }

  return [];
}

function formatEntityValidationErrors(
  entity: Record<string, unknown>,
  errors: ErrorObject[],
): string {
  const messages = errors.map((error) => {
    const path = error.instancePath || "root";
    const params = ajvErrorParams(error);
    if (error.keyword === "additionalProperties" && params.additionalProperty) {
      const property = params.additionalProperty;
      const suggested = PROPERTY_ALIAS_HINTS.get(property);
      if (property === "value") {
        return `${path}: unknown property 'value'. ${valueFieldHint(entity.value)} Do not use generic value in kb_upsert.properties.`;
      }
      if (suggested) {
        return `${path}: unknown property '${property}'. Did you mean '${suggested}'? kb_upsert.properties uses snake_case typed fact fields.`;
      }
    }
    if (error.keyword === "enum" && params.allowedValues) {
      return `${path}: ${error.message}. Allowed values: ${params.allowedValues.map(String).join(", ")}`;
    }
    return `${path}: ${error.message}`;
  });

  const extraHints = factKindShapeHints(entity);
  for (const [alias, canonical] of PROPERTY_ALIAS_HINTS) {
    if (Object.prototype.hasOwnProperty.call(entity, alias)) {
      extraHints.push(
        `Unknown property '${alias}'. Use '${canonical}' in kb_upsert.properties.`,
      );
    }
  }
  if (Object.prototype.hasOwnProperty.call(entity, "value")) {
    extraHints.push(valueFieldHint(entity.value));
  }
  if (
    Object.keys(entity).some((key) => PROPERTY_ALIAS_HINTS.has(key)) ||
    Object.prototype.hasOwnProperty.call(entity, "value")
  ) {
    extraHints.push(
      "Next action: if starting from prose, call kb_model_requirement and apply its sequential applyPlan instead of guessing field names.",
    );
  }

  return [...messages, ...extraHints].join("; ");
}

function validateFactModelingShape(entity: Record<string, unknown>): void {
  const hints = factKindShapeHints(entity);
  if (hints.length > 0) {
    throw new Error(`Entity validation failed: ${hints.join("; ")}`);
  }
}

/**
 * Handle kb.upsert tool calls
 * Accepts { type, id, properties } — the flat format matching the tool schema.
 * Validates the assembled entity against JSON Schema before Prolog writes.
 * implements REQ-002, REQ-011
 */
export async function handleKbUpsert(
  prolog: PrologProcess,
  args: UpsertArgs,
): Promise<UpsertResult> {
  const { entity, relationships } = validateKbUpsertArgs(args);

  const semanticAdvisor = analyzeSemanticAdvisorInput({
    payload: { ...args },
  });
  const type = entity.type as string;

  const entities = [entity];
  // If relationships are not explicitly provided, preserve existing ones.
  // This prevents accidental relationship loss when updating only properties.
  let effectiveRelationships = relationships;

  let created = 0;
  let updated = 0;
  let relationshipsCreated = 0;

  try {
    if (
      (args.relationships === undefined ||
        (Array.isArray(args.relationships) &&
          args.relationships.length === 0)) &&
      args.id
    ) {
      // Preserve relationships on updates when the request omits relationships
      // OR provides an empty array. This avoids accidental edge deletion by
      // clients that always serialize `relationships: []` for partial updates.
      // For creates, this remains cheap because existence is checked first.
      const existsResult = await prolog.query(
        `once(kb_entity('${escapeAtom(args.id as string)}', _, _))`,
      );
      if (existsResult.success) {
        const existing = await fetchExistingRelationships(
          prolog,
          args.id as string,
        );
        if (existing.length > 0) {
          effectiveRelationships = existing;
        }
      }
    }

    // Validate strict-lane fact_kind pairing for constrains/requires_property
    // implements REQ-011
    await validateStrictLanePairing(prolog, effectiveRelationships);
    await validateLiveRelationshipTargets(
      prolog,
      entity,
      effectiveRelationships,
    );

    // Process entities
    for (const entity of entities) {
      const id = entity.id as string;
      const type = entity.type as string;

      // Check if entity exists before transaction (to determine created vs updated)
      const checkGoal = `once(kb_entity('${escapeAtom(id)}', _, _))`;
      const checkResult = await prolog.query(checkGoal);

      const isUpdate = checkResult.success;

      // Build property list for Prolog
      const props = buildPropertyList(entity);

      // Build relationship goals
      const relationshipGoals: string[] = [];
      for (const rel of effectiveRelationships) {
        const relType = rel.type as string;
        const from = rel.from as string;
        const to = rel.to as string;
        const metadata = buildRelationshipMetadata(rel);
        relationshipGoals.push(
          `kb_assert_relationship_no_audit(${relType}, '${escapeAtom(from)}', '${escapeAtom(to)}', ${metadata})`,
        );
      }

      // Build atomic transaction goal wrapping entity + all relationships
      // For requirements, also include contradiction check within the transaction
      // implements REQ-002, REQ-011
      let transactionGoal: string;
      const needsContradictionCheck =
        type === "req" && !args._skipContradictionCheck;

      if (relationshipGoals.length === 0) {
        // Simple case: just entity
        if (needsContradictionCheck) {
          transactionGoal = `rdf_transaction((kb_assert_entity_no_audit(${type}, ${props}), check_req_contradiction('${escapeAtom(id)}')))`;
        } else {
          transactionGoal = `rdf_transaction((kb_assert_entity_no_audit(${type}, ${props})))`;
        }
      } else {
        // Entity + relationships in one transaction
        const goals = [
          `kb_assert_entity_no_audit(${type}, ${props})`,
          ...relationshipGoals,
        ].join(", ");
        if (needsContradictionCheck) {
          transactionGoal = `rdf_transaction((${goals}, check_req_contradiction('${escapeAtom(id)}')))`;
        } else {
          transactionGoal = `rdf_transaction((${goals}))`;
        }
      }

      const txResult = await prolog.query(transactionGoal);

      if (!txResult.success) {
        // Format error message without exposing raw transaction goal
        const formattedError = formatUpsertError(id, txResult.error);
        throw new Error(formattedError);
      }

      await recordEntityAudit(
        prolog,
        isUpdate ? "updated" : "created",
        type,
        entity,
      );
      for (const rel of effectiveRelationships) {
        await recordRelationshipAudit(prolog, rel);
      }

      // Update counters
      if (isUpdate) {
        updated++;
      } else {
        created++;
      }

      relationshipsCreated += effectiveRelationships.length;
    }
    // Save KB to disk after all entities/relationships are written to ensure
    // durability across process restarts.
    prolog.invalidateCache();
    const saveResult = await prolog.query("kb_save");
    if (!saveResult.success) {
      throw new Error(
        `Failed to save KB after upsert: ${saveResult.error || "Unknown error"}`,
      );
    }
    if (type === "symbol") {
      try {
        await refreshCoordinatesForSymbolIdImpl(entity.id as string);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isMcpDebugEnabled()) {
          console.warn(
            `[KIBI-MCP] Symbol coordinate auto-refresh failed for ${String(entity.id)}: ${message}`,
          );
        }
      }
    }

    // Check for scenario-coverage guidance
    const coverageWarnings = await checkScenarioCoverageGuidance(
      prolog,
      relationships,
      type,
      entity.id as string,
    );
    return {
      content: [
        {
          type: "text",
          text: `Upserted ${String(entity.id)} (${created > 0 ? "created" : "updated"}) with ${relationshipsCreated} relationship(s).`,
        },
      ],
      structuredContent: {
        created,
        updated,
        relationships_created: relationshipsCreated,
        warnings: [...semanticAdvisor.warnings, ...coverageWarnings],
        semanticAdvisor: semanticAdvisor.receipt,
        ...(type === "req"
          ? {
              contradictionCheck: {
                outcome: args._skipContradictionCheck
                  ? "skipped"
                  : "no-conflict",
                checked_req_id: entity.id as string,
                strict_readiness:
                  semanticAdvisor.receipt.logic_readiness === "modeled"
                    ? "modeled"
                    : semanticAdvisor.receipt.candidate_lane,
              },
            }
          : {}),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Upsert execution failed: ${message}`);
  }
}

export function validateKbUpsertArgs(args: UpsertArgs): ValidatedUpsertArgs {
  const { type, id, properties, relationships = [] } = args;

  if (!type || !id) {
    throw new Error("'type' and 'id' are required for upsert");
  }

  const entity: Record<string, unknown> = {
    id,
    type,
    ...properties,
  };

  if (!entity.created_at) {
    entity.created_at = new Date().toISOString();
  }
  if (!entity.updated_at) {
    entity.updated_at = new Date().toISOString();
  }
  if (!entity.source) {
    entity.source = "mcp://kibi/upsert";
  }

  if (!validateEntity(entity)) {
    const errors = validateEntity.errors || [];
    const errorMessages = formatEntityValidationErrors(entity, errors);
    throw new Error(`Entity validation failed: ${errorMessages}`);
  }
  validateFactModelingShape(entity);

  for (let i = 0; i < relationships.length; i++) {
    const rel = relationships[i];
    if (!validateRelationship(rel)) {
      const errors = validateRelationship.errors || [];
      const errorMessages = errors
        .map((e) => `${e.instancePath || "root"}: ${e.message}`)
        .join("; ");
      throw new Error(
        `Relationship validation failed at index ${i}: ${errorMessages}`,
      );
    }
  }

  validateRelationshipSources(id, relationships);
  validateSymbolGranularity(entity, relationships);

  return { entity, relationships };
}

function chooseScriptKind(filePath: string): ScriptKind {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".tsx")) return ScriptKind.TSX;
  if (
    lower.endsWith(".ts") ||
    lower.endsWith(".mts") ||
    lower.endsWith(".cts")
  ) {
    return ScriptKind.TS;
  }
  if (lower.endsWith(".jsx")) return ScriptKind.JSX;
  return ScriptKind.JS;
}

function hasTraceabilityRelationship(
  relationships: Array<Record<string, unknown>>,
): boolean {
  return relationships.some((relationship) =>
    isTraceabilityRelationshipType(relationship.type),
  );
}

function hasAllowedGranularityReason(entity: Record<string, unknown>): boolean {
  return isAllowedGranularityReason(entity.granularity_reason);
}

function createSymbolCandidate(
  name: string,
  kind: SymbolKind,
): GranularSymbolCandidate {
  return {
    name,
    kind,
    role: inferSymbolRole(kind),
  };
}

function collectGranularSymbolCandidates(
  filePath: string,
  content: string,
): GranularSymbolCandidate[] {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.createSourceFile(
    `${filePath}::granularity`,
    content,
    {
      overwrite: true,
      scriptKind: chooseScriptKind(filePath),
    },
  );
  const candidates: GranularSymbolCandidate[] = [];
  const methodNameCounts = new Map<string, number>();
  const bareMethodCandidates = new Map<string, GranularSymbolCandidate>();

  for (const fn of sourceFile.getFunctions()) {
    if (fn.isExported()) {
      const name = fn.getName();
      if (name) candidates.push(createSymbolCandidate(name, "function"));
    }
  }
  for (const cls of sourceFile.getClasses()) {
    if (cls.isExported()) {
      const name = cls.getName();
      if (name) candidates.push(createSymbolCandidate(name, "class"));

      for (const method of cls.getMethods()) {
        const methodName = method.getName();
        if (name) {
          candidates.push(
            createSymbolCandidate(`${name}.${methodName}`, "method"),
          );
        }
        bareMethodCandidates.set(
          methodName,
          createSymbolCandidate(methodName, "method"),
        );
        methodNameCounts.set(
          methodName,
          (methodNameCounts.get(methodName) ?? 0) + 1,
        );
      }
    }
  }
  for (const [methodName, count] of methodNameCounts) {
    const candidate = bareMethodCandidates.get(methodName);
    if (count === 1 && candidate) candidates.push(candidate);
  }
  for (const iface of sourceFile.getInterfaces()) {
    if (iface.isExported()) {
      candidates.push(createSymbolCandidate(iface.getName(), "interface"));
    }
  }
  for (const alias of sourceFile.getTypeAliases()) {
    if (alias.isExported()) {
      candidates.push(createSymbolCandidate(alias.getName(), "type"));
    }
  }
  for (const en of sourceFile.getEnums()) {
    if (en.isExported())
      candidates.push(createSymbolCandidate(en.getName(), "enum"));
  }

  return candidates.sort((a, b) => a.name.localeCompare(b.name));
}

function validateSymbolGranularity(
  entity: Record<string, unknown>,
  relationships: Array<Record<string, unknown>>,
): void {
  if (entity.type !== "symbol") return;
  if (!hasTraceabilityRelationship(relationships)) return;
  if (hasAllowedGranularityReason(entity)) return;
  if (typeof entity.sourceFile !== "string") return;
  if (typeof entity.title !== "string") return;

  const sourcePath = path.isAbsolute(entity.sourceFile)
    ? entity.sourceFile
    : path.resolve(process.cwd(), entity.sourceFile);
  if (!existsSync(sourcePath)) return;

  const candidates = collectGranularSymbolCandidates(
    entity.sourceFile,
    readFileSync(sourcePath, "utf8"),
  );
  const candidateNames = [
    ...new Set(candidates.map((candidate) => candidate.name)),
  ];
  if (candidateNames.includes(entity.title)) return;

  const behavioralNames = getBehavioralSymbolNames(candidates);
  if (behavioralNames.length === 0) return;

  const nonBehavioralNames = getNonBehavioralSymbolNames(candidates);
  const maxNamesInMessage = 10;
  const shownBehavioral = behavioralNames.slice(0, maxNamesInMessage);
  const hiddenBehavioralCount = behavioralNames.length - shownBehavioral.length;
  const behavioralList =
    shownBehavioral.join(", ") +
    (hiddenBehavioralCount > 0 ? `, and ${hiddenBehavioralCount} more` : "");

  const shownNonBehavioral = nonBehavioralNames.slice(0, maxNamesInMessage);
  const hiddenNonBehavioralCount =
    nonBehavioralNames.length - shownNonBehavioral.length;
  const nonBehavioralList =
    shownNonBehavioral.join(", ") +
    (hiddenNonBehavioralCount > 0
      ? `, and ${hiddenNonBehavioralCount} more`
      : "");

  const ignoredSymbolsMessage =
    nonBehavioralNames.length > 0
      ? ` Non-behavioral symbols in the file were ignored for this decision: ${nonBehavioralList}.`
      : "";

  throw new Error(
    `Symbol ${String(entity.id)} links ${entity.sourceFile} coarsely while granular symbols are available (behavioral only): ${behavioralList}. Move relationships to a behavioral symbol, add a manifest behavioral anchor, or set granularity_reason to config-artifact, module-level-behavior, extractor-miss, or legacy-link.${ignoredSymbolsMessage}`,
  );
}

export const __test__ = {
  // implements REQ-vscode-traceability
  setRefreshCoordinatesForSymbolIdForTests(
    fn: typeof refreshCoordinatesForSymbolId | undefined,
  ) {
    refreshCoordinatesForSymbolIdImpl = fn ?? refreshCoordinatesForSymbolId;
  },
};

/**
 * Build Prolog property list from entity object
 * Returns simple Key=Value format without typed literals
 * Example output: "[id='test-1', title=\"Test\", status=active]"
 * implements REQ-002
 */
function buildPropertyList(entity: Record<string, unknown>): string {
  const pairs: string[] = [];

  // Defined internally to ensure thread safety and avoid initialization order issues.
  // Using simple arrays instead of Sets is performant enough for small lists and avoids Set allocation overhead.
  // implements REQ-002
  const ATOM_FIELDS = [
    "status",
    "owner",
    "priority",
    "severity",
    "symbol_role",
    "granularity_reason",
    "verification_scope",
    "verification_perspective",
    // Typed fact enum fields must be atoms for Prolog validation
    "fact_kind",
    "operator",
    "value_type",
    "polarity",
  ];
  const STRING_FIELDS = [
    "id",
    "title",
    "created_at",
    "updated_at",
    "source",
    "text_ref",
  ];

  for (const [key, value] of Object.entries(entity)) {
    if (key === "type") continue;
    if (value === undefined || value === null) continue;

    let prologValue: string;

    if (key === "id" && typeof value === "string") {
      prologValue = `'${value.replace(/'/g, "''")}'`;
    } else if (Array.isArray(value)) {
      prologValue = JSON.stringify(value);
    } else if (ATOM_FIELDS.includes(key) && typeof value === "string") {
      prologValue = toPrologAtom(value);
    } else if (STRING_FIELDS.includes(key) && typeof value === "string") {
      prologValue = `${toPrologString(value)}`;
    } else if (typeof value === "string") {
      prologValue = `${toPrologString(value)}`;
    } else if (typeof value === "number") {
      prologValue = String(value);
    } else if (typeof value === "boolean") {
      prologValue = value ? "true" : "false";
    } else {
      prologValue = `${toPrologString(String(value))}`;
    }

    pairs.push(`${key}=${prologValue}`);
  }

  return `[${pairs.join(", ")}]`;
}

/**
 * Build Prolog metadata list for relationship
 * Returns simple Key=Value format without typed literals
 */
function buildRelationshipMetadata(rel: Record<string, unknown>): string {
  const pairs: string[] = [];

  for (const [key, value] of Object.entries(rel)) {
    if (key === "type" || key === "from" || key === "to") continue;

    let prologValue: string;

    if (typeof value === "string") {
      prologValue = `${toPrologString(value)}`;
    } else if (typeof value === "number") {
      prologValue = String(value);
    } else {
      prologValue = `${toPrologString(String(value))}`;
    }

    pairs.push(`${key}=${prologValue}`);
  }

  return `[${pairs.join(", ")}]`;
}

/**
 * Ensure all relationship rows belong to the entity being upserted.
 * Rejects foreign-source relationship writes in the same request.
 * implements REQ-002, REQ-011
 */
function validateRelationshipSources(
  entityId: string,
  relationships: Array<Record<string, unknown>>,
): void {
  for (const rel of relationships) {
    if (rel.from !== entityId) {
      throw new Error(formatRelationshipSourceMismatch(entityId, rel));
    }
  }
}

/**
 * Validate strict-lane fact_kind pairing for constrains/requires_property relationships.
 * constrains targets must be subject, observation, or meta facts (or legacy without fact_kind).
 * requires_property targets must be property_value, observation, or meta facts (or legacy without fact_kind).
 * implements REQ-011
 */
async function validateStrictLanePairing(
  prolog: PrologProcess,
  relationships: Array<Record<string, unknown>>,
): Promise<void> {
  // implements REQ-011
  for (const rel of relationships) {
    if (rel.type === "constrains") {
      const targetId = rel.to as string;
      // Reject if target is a fact with fact_kind=property_value.
      // Allow: legacy (no fact_kind), subject, observation, meta, or non-existent
      // (non-existent targets are caught by relationship type validation elsewhere).
      const rejectResult = await prolog.query(
        `once((kb_entity('${escapeAtom(targetId)}', fact, _SlpProps), memberchk(fact_kind=_SlpFK, _SlpProps), normalize_term_atom(_SlpFK, property_value)))`,
      );
      if (rejectResult.success) {
        throw new Error(
          `Relationship 'constrains' requires target '${targetId}' to be a subject, observation, or meta fact. Property_value facts cannot be direct targets of constrains relationships.`,
        );
      }
    } else if (rel.type === "requires_property") {
      const targetId = rel.to as string;
      // Reject if target is a fact with fact_kind=subject.
      // Allow: legacy (no fact_kind), property_value, observation, meta, or non-existent.
      const rejectResult = await prolog.query(
        `once((kb_entity('${escapeAtom(targetId)}', fact, _SlpProps), memberchk(fact_kind=_SlpFK, _SlpProps), normalize_term_atom(_SlpFK, subject)))`,
      );
      if (rejectResult.success) {
        throw new Error(
          `Relationship 'requires_property' requires target '${targetId}' to be a property_value, observation, or meta fact. Subject facts cannot be direct targets of requires_property relationships.`,
        );
      }
    }
  }
}

/**
 * Check for scenario-coverage guidance when verified_by is added to a
 * requirement that already has scenarios (specified_by relationships).
 * Returns non-blocking warnings; never throws.
 */
async function checkScenarioCoverageGuidance(
  prolog: PrologProcess,
  relationships: Array<Record<string, unknown>>,
  entityType: string,
  entityId: string,
): Promise<string[]> {
  const warnings: string[] = [];
  if (entityType !== "req") return warnings;

  try {
    for (const rel of relationships) {
      const relType = rel.type as string;
      if (relType !== "verified_by") continue;

      // Check if this requirement has scenarios
      const scenarioQuery = `kb_relationship(specified_by, '${escapeAtom(entityId)}', ScenarioId)`;
      const scenarioResult = await prolog.query(`once(${scenarioQuery})`);
      if (scenarioResult.success) {
        warnings.push(
          `Scenario-backed coverage: verified_by(${entityId},test) is valid but will not satisfy symbol-coverage because ${entityId} has specified_by a scenario. Use verified_by(scenario,test) or validates(test,scenario) instead.`,
        );
        break; // One warning per entity is enough
      }
    }
  } catch {
    // Non-blocking: never fail the upsert
  }
  return warnings;
}

/**
 * Query existing relationships for an entity from the live KB.
 * Used to preserve relationships when the upsert request omits the
 * relationships field (entity-only property update).
 */
async function fetchExistingRelationships(
  prolog: PrologProcess,
  entityId: string,
): Promise<Array<Record<string, unknown>>> {
  const relTypes = [
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
  ];
  const existing: Array<Record<string, unknown>> = [];

  try {
    for (const relType of relTypes) {
      const forwardGoal = `findall(To, kb_relationship(${relType}, '${escapeAtom(entityId)}', To), Targets)`;
      const forwardResult = await prolog.query(forwardGoal);
      if (forwardResult.success && forwardResult.bindings.Targets) {
        const targetsStr = forwardResult.bindings.Targets;
        const targets = parsePrologList(targetsStr);
        for (const to of targets) {
          existing.push({ type: relType, from: entityId, to });
        }
      }

      const reverseGoal = `findall(From, kb_relationship(${relType}, From, '${escapeAtom(entityId)}'), Sources)`;
      const reverseResult = await prolog.query(reverseGoal);
      if (reverseResult.success && reverseResult.bindings.Sources) {
        const sourcesStr = reverseResult.bindings.Sources;
        const sources = parsePrologList(sourcesStr);
        for (const from of sources) {
          existing.push({ type: relType, from, to: entityId });
        }
      }
    }
  } catch (e) {
    // Best-effort: if we can't read existing relationships, proceed without them.
    // This preserves backward compatibility and avoids breaking mocked tests.
  }

  return existing;
}

function parsePrologList(listStr: string): string[] {
  const trimmed = listStr.trim();
  if (trimmed === "[]") return [];
  const match = trimmed.match(/^\[(.*)\]$/s);
  if (!match || !match[1]) return [];
  const content = match[1];
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of content) {
    if (char === "[") depth++;
    if (char === "]") depth--;
    if (char === "," && depth === 0) {
      items.push(current.trim().replace(/^'|'$/g, ""));
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    items.push(current.trim().replace(/^'|'$/g, ""));
  }
  return items;
}

/**
 * Record audit entry for a successfully committed entity mutation.
 * Called only after the RDF transaction succeeds.
 * implements REQ-011
 */
async function recordEntityAudit(
  prolog: PrologProcess,
  changeKind: "created" | "updated",
  type: string,
  entity: Record<string, unknown>,
): Promise<void> {
  const props = buildPropertyList(entity);
  const result = await prolog.query(
    `kb_log_entity_upsert(${changeKind}, ${type}, ${props})`,
  );
  if (!result.success) {
    throw new Error(
      `Failed to record audit entry for ${String(entity.id)}: ${result.error || "Unknown error"}`,
    );
  }
}

/**
 * Record audit entry for a successfully committed relationship mutation.
 * Called only after the RDF transaction succeeds.
 * implements REQ-011
 */
async function recordRelationshipAudit(
  prolog: PrologProcess,
  rel: Record<string, unknown>,
): Promise<void> {
  const relType = rel.type as string;
  const from = rel.from as string;
  const to = rel.to as string;
  const metadata = buildRelationshipMetadata(rel);
  const result = await prolog.query(
    `kb_log_relationship_upsert(${relType}, '${escapeAtom(from)}', '${escapeAtom(to)}', ${metadata})`,
  );
  if (!result.success) {
    throw new Error(
      `Failed to record relationship audit entry ${from}->${to}: ${result.error || "Unknown error"}`,
    );
  }
}

/**
 * Format upsert error message for user-facing display.
 * Removes raw transaction goals and extracts meaningful contradiction details.
 * implements REQ-011
 */
function formatUpsertError(
  entityId: string,
  rawError: string | undefined,
): string {
  if (!rawError) {
    return `Failed to upsert entity ${entityId}: Unknown error`;
  }

  const invalidRelationshipError = formatInvalidRelationshipError(rawError);
  if (invalidRelationshipError !== null) {
    return `Failed to upsert entity ${entityId}: ${invalidRelationshipError}`;
  }

  // Check for contradiction error - Prolog returns kb_contradiction([...]) term
  // Try to extract readable details from the term
  const contradictionMatch = rawError.match(
    /kb_contradiction\(\s*\[([^\]]+)\]\s*\)/,
  );
  if (contradictionMatch) {
    // Extract individual conflict details from the list
    const details = contradictionMatch[1];
    if (!details) {
      return `Contradiction detected for entity ${entityId}: This requirement conflicts with existing requirements. Add a supersedes relationship to the conflicting requirement, or deprecate the old requirement before creating the new one.`;
    }
    // Parse out readable parts - each entry is like 'Reason'-'ReqId'
    const conflicts: string[] = [];
    const conflictRegex = /'([^']+)'-'([^']+)'/g;
    let execResult: RegExpExecArray | null = conflictRegex.exec(details);
    while (execResult !== null) {
      const reason = execResult[1];
      const otherReq = execResult[2];
      if (reason !== undefined && otherReq !== undefined) {
        conflicts.push(`  - Conflicts with ${otherReq}: ${reason}`);
      }
      execResult = conflictRegex.exec(details);
    }

    if (conflicts.length > 0) {
      const uniqueConflicts = [...new Set(conflicts)];
      return `Contradiction detected for requirement ${entityId}:\n${uniqueConflicts.join("\n")}\n\nTo resolve:\n  1. Add a supersedes relationship from the new requirement to the conflicting one, OR\n  2. Deprecate the conflicting requirement before creating the new one.`;
    }

    return `Contradiction detected for entity ${entityId}: This requirement conflicts with existing requirements. Add a supersedes relationship to the conflicting requirement, or deprecate the old requirement before creating the new one.`;
  }

  // Check for RDF transaction error
  if (rawError.includes("rdf_transaction")) {
    return `Failed to upsert entity ${entityId}: Transaction failed`;
  }

  // Default: return cleaned error without raw goal
  return `Failed to upsert entity ${entityId}: ${rawError}`;
}
