import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  ExtractedEntity,
  ExtractionResult,
} from "../../extractors/markdown.js";
import {
  normalizeEntityId,
  parseAtomList,
  parseEntityFromList,
  parseListOfLists,
  parseTriples,
} from "../../prolog/codec.js";
import {
  runOperationJsonQuery,
  toPrologAtom,
  toPrologList,
} from "../operations/prolog-json.js";
import type { PrologPort } from "../operations/runtime-types.js";
import { PROOF_RECEIPT_MAX_AGE_SECONDS } from "../proof-receipt.js";
import relationshipSchema from "../schemas/relationship.js";
import {
  analyzeTelemetryAcceptance,
  createTelemetryAcceptanceDiagnostics,
  parseTelemetryUsageLog,
} from "../telemetry-acceptance.js";
import { createCoverageDepthQualityDiagnostics } from "./coverage-depth-quality.js";
import { createRequirementQualityDiagnostics } from "./requirement-quality.js";
import { createSymbolQualityDiagnostics } from "./symbol-quality.js";
import type { QualityDiagnostic } from "./types.js";

const RELATIONSHIP_TYPES: readonly string[] =
  relationshipSchema.properties.type.enum;
const ENTITY_BATCH_SIZE = 32;
const PROLOG_OUTPUT_CAPACITY_MARKER =
  "Query exceeded bounded Prolog output capacity (ENOBUFS)";
const ENTITY_IDS_QUERY = "findall(Id, kb_entity(Id, _, _), Ids)";

type FullKbQualityDiagnosticsOptions = {
  readonly prolog: Pick<PrologPort, "query" | "queryEntities">;
  readonly hardViolationEntityIds?: ReadonlySet<string>;
  readonly maxDiagnostics?: number;
  readonly workspaceRoot?: string;
  readonly now?: Date;
  readonly proofSnapshot?: string;
  readonly checkedAt?: string;
};

type CoverageEvidencePayload = Readonly<{
  readonly rows?: readonly Readonly<Record<string, unknown>>[];
}>;

function stringField(entity: Record<string, unknown>, key: string): string {
  const value = entity[key];
  return typeof value === "string" ? value : "";
}

function optionalStringField(
  entity: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = entity[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumberField(
  entity: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = entity[key];
  return typeof value === "number" ? value : undefined;
}

function optionalStringArrayField(
  entity: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = entity[key];
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => String(item));
}

function optionalBooleanField(
  entity: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = entity[key];
  return typeof value === "boolean" ? value : undefined;
}

function optionalObjectField(
  entity: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = entity[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function toExtractedEntity(entity: Record<string, unknown>): ExtractedEntity {
  const extracted: ExtractedEntity = {
    id: stringField(entity, "id"),
    type: stringField(entity, "type"),
    title: stringField(entity, "title"),
    status: stringField(entity, "status"),
    created_at: stringField(entity, "created_at"),
    updated_at: stringField(entity, "updated_at"),
    source: stringField(entity, "source"),
  };
  const tags = optionalStringArrayField(entity, "tags");
  if (tags !== undefined) extracted.tags = tags;
  const owner = optionalStringField(entity, "owner");
  if (owner !== undefined) extracted.owner = owner;
  const priority = optionalStringField(entity, "priority");
  if (priority !== undefined) extracted.priority = priority;
  const severity = optionalStringField(entity, "severity");
  if (severity !== undefined) extracted.severity = severity;
  const textRef = optionalStringField(entity, "text_ref");
  if (textRef !== undefined) extracted.text_ref = textRef;
  const semanticText = optionalStringField(entity, "semantic_text");
  if (semanticText !== undefined) extracted.semantic_text = semanticText;
  const logicClaims = optionalStringArrayField(entity, "logic_claims");
  if (logicClaims !== undefined) extracted.logic_claims = logicClaims;
  const semanticClauses = optionalStringArrayField(entity, "semantic_clauses");
  if (semanticClauses !== undefined)
    extracted.semantic_clauses = semanticClauses;
  const semanticInventoryVersion = optionalStringField(
    entity,
    "semantic_inventory_version",
  );
  if (semanticInventoryVersion === "kibi.semantic-inventory.v1") {
    extracted.semantic_inventory_version = semanticInventoryVersion;
  }
  const semanticSourceField = optionalStringField(
    entity,
    "semantic_source_field",
  );
  if (
    semanticSourceField === "semantic_text" ||
    semanticSourceField === "text_ref" ||
    semanticSourceField === "title"
  ) {
    extracted.semantic_source_field = semanticSourceField;
  }
  const semanticSourceHash = optionalStringField(
    entity,
    "semantic_source_hash",
  );
  if (semanticSourceHash !== undefined) {
    extracted.semantic_source_hash = semanticSourceHash;
  }
  const semanticInventory = entity.semantic_inventory;
  if (Array.isArray(semanticInventory)) {
    extracted.semantic_inventory = semanticInventory as readonly Record<
      string,
      unknown
    >[];
  }
  const granularityReason = optionalStringField(entity, "granularity_reason");
  if (granularityReason !== undefined) {
    extracted.granularity_reason = granularityReason;
  }
  const symbolKind = optionalStringField(entity, "symbol_kind");
  if (symbolKind !== undefined) extracted.symbol_kind = symbolKind;
  const symbolRole = optionalStringField(entity, "symbol_role");
  if (symbolRole !== undefined) extracted.symbol_role = symbolRole;
  const verificationScope = optionalStringField(entity, "verification_scope");
  if (
    verificationScope === "unit" ||
    verificationScope === "integration" ||
    verificationScope === "end_to_end"
  ) {
    extracted.verification_scope = verificationScope;
  }
  const verificationPerspective = optionalStringField(
    entity,
    "verification_perspective",
  );
  if (
    verificationPerspective === "internal" ||
    verificationPerspective === "consumer"
  ) {
    extracted.verification_perspective = verificationPerspective;
  }
  const proofContract = optionalObjectField(entity, "proof_contract");
  if (proofContract !== undefined) {
    extracted.proof_contract = proofContract as NonNullable<
      ExtractedEntity["proof_contract"]
    >;
  }
  const proofBindings = entity.proof_bindings;
  if (Array.isArray(proofBindings)) {
    extracted.proof_bindings = proofBindings as NonNullable<
      ExtractedEntity["proof_bindings"]
    >;
  }
  const proofReceipts = entity.proof_receipts;
  if (Array.isArray(proofReceipts)) {
    extracted.proof_receipts = proofReceipts as NonNullable<
      ExtractedEntity["proof_receipts"]
    >;
  }
  const sourceLine = optionalNumberField(entity, "sourceLine");
  if (sourceLine !== undefined) extracted.sourceLine = sourceLine;
  const sourceColumn = optionalNumberField(entity, "sourceColumn");
  if (sourceColumn !== undefined) extracted.sourceColumn = sourceColumn;
  const sourceEndLine = optionalNumberField(entity, "sourceEndLine");
  if (sourceEndLine !== undefined) extracted.sourceEndLine = sourceEndLine;
  const sourceEndColumn = optionalNumberField(entity, "sourceEndColumn");
  if (sourceEndColumn !== undefined)
    extracted.sourceEndColumn = sourceEndColumn;
  const factKind = optionalStringField(entity, "fact_kind");
  if (
    factKind === "subject" ||
    factKind === "property_value" ||
    factKind === "observation" ||
    factKind === "meta" ||
    factKind === "predicate_schema" ||
    factKind === "predicate" ||
    factKind === "rule_schema" ||
    factKind === "rule"
  ) {
    extracted.fact_kind = factKind;
  }
  for (const field of [
    "subject_key",
    "property_key",
    "value_string",
    "unit",
    "scope",
    "valid_from",
    "valid_to",
    "canonical_key",
    "claim_key",
    "claim_text",
    "predicate_name",
    "predicate_namespace",
    "rule_hash",
    "rule_schema_id",
    "rule_name",
    "semantic_key",
  ] as const) {
    const value = optionalStringField(entity, field);
    if (value !== undefined) extracted[field] = value;
  }
  const operator = optionalStringField(entity, "operator");
  if (
    operator === "eq" ||
    operator === "neq" ||
    operator === "lt" ||
    operator === "lte" ||
    operator === "gt" ||
    operator === "gte"
  ) {
    extracted.operator = operator;
  }
  const valueType = optionalStringField(entity, "value_type");
  if (
    valueType === "string" ||
    valueType === "int" ||
    valueType === "number" ||
    valueType === "bool"
  ) {
    extracted.value_type = valueType;
  }
  const polarity = optionalStringField(entity, "polarity");
  if (
    polarity === "require" ||
    polarity === "forbid" ||
    polarity === "assert" ||
    polarity === "deny"
  ) {
    extracted.polarity = polarity;
  }
  const valueInt = optionalNumberField(entity, "value_int");
  if (valueInt !== undefined) extracted.value_int = valueInt;
  const valueNumber = optionalNumberField(entity, "value_number");
  if (valueNumber !== undefined) extracted.value_number = valueNumber;
  const predicateArity = optionalNumberField(entity, "predicate_arity");
  if (predicateArity !== undefined) extracted.predicate_arity = predicateArity;
  const claimSpanStart = optionalNumberField(entity, "claim_span_start");
  if (claimSpanStart !== undefined) extracted.claim_span_start = claimSpanStart;
  const claimSpanEnd = optionalNumberField(entity, "claim_span_end");
  if (claimSpanEnd !== undefined) extracted.claim_span_end = claimSpanEnd;
  const valueBool = optionalBooleanField(entity, "value_bool");
  if (valueBool !== undefined) extracted.value_bool = valueBool;
  const closedWorld = optionalBooleanField(entity, "closed_world");
  if (closedWorld !== undefined) extracted.closed_world = closedWorld;
  const ruleIr = optionalObjectField(entity, "rule_ir");
  if (ruleIr !== undefined) extracted.rule_ir = ruleIr;
  for (const field of [
    "argument_names",
    "argument_types",
    "argument_descriptions",
    "aliases",
    "examples",
    "predicate_args",
  ] as const) {
    const values = optionalStringArrayField(entity, field);
    if (values !== undefined) extracted[field] = values;
  }
  return extracted;
}

function sourceFileFor(entity: Record<string, unknown>): string | undefined {
  return (
    optionalStringField(entity, "sourceFile") ??
    optionalStringField(entity, "source_file")
  );
}

class BoundedEntityProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoundedEntityProjectionError";
  }
}

function isOutputCapacityError(error: string | undefined): boolean {
  return error?.includes(PROLOG_OUTPUT_CAPACITY_MARKER) === true;
}

function parseAuthoritativeEntityIds(raw: string): string[] {
  const trimmed = raw.trim();
  if (
    trimmed !== "[]" &&
    (!trimmed.startsWith("[") || !trimmed.endsWith("]"))
  ) {
    throw new Error("Full KB entity ID enumeration returned malformed data");
  }
  const ids = parseAtomList(trimmed);
  if (ids.some((id) => id.length === 0)) {
    throw new Error("Full KB entity ID enumeration returned an empty ID");
  }
  return ids;
}

function validateEntityBatch(
  requestedIds: readonly string[],
  entities: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  const requested = new Set<string>();
  for (const id of requestedIds) {
    const normalizedId = normalizeEntityId(id);
    if (normalizedId.length === 0 || requested.has(normalizedId)) {
      throw new Error(
        "Full KB bounded entity projection returned duplicate or empty requested IDs",
      );
    }
    requested.add(normalizedId);
  }

  const returned = new Map<string, Record<string, unknown>>();
  for (const entity of entities) {
    const id = stringField(entity, "id");
    const type = stringField(entity, "type");
    const normalizedId = normalizeEntityId(id);
    if (normalizedId.length === 0 || type.length === 0) {
      throw new Error(
        "Full KB bounded entity projection returned a malformed entity row",
      );
    }
    if (!requested.has(normalizedId) || returned.has(normalizedId)) {
      throw new Error(
        `Full KB bounded entity projection returned an unexpected entity ID: ${normalizedId}`,
      );
    }
    returned.set(normalizedId, entity);
  }

  const missing = [...requested.keys()].filter((id) => !returned.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Full KB bounded entity projection returned an incomplete page; missing ${missing.join(", ")}`,
    );
  }

  return [...requested.keys()].map(
    (id) => returned.get(id) as Record<string, unknown>,
  );
}

function validateIndexedEntityPage(
  entities: readonly Record<string, unknown>[],
  seenIds: ReadonlySet<string>,
): Record<string, unknown>[] {
  const pageIds = new Set<string>();
  for (const entity of entities) {
    const id = normalizeEntityId(stringField(entity, "id"));
    const type = stringField(entity, "type");
    if (id.length === 0 || type.length === 0) {
      throw new Error(
        "Full KB paginated entity projection returned a malformed entity row",
      );
    }
    if (pageIds.has(id) || seenIds.has(id)) {
      throw new Error(
        `Full KB paginated entity projection returned duplicate entity ID: ${id}`,
      );
    }
    pageIds.add(id);
  }
  return [...entities];
}

function isOutputCapacityException(error: unknown): boolean {
  return isOutputCapacityError(
    error instanceof Error ? error.message : String(error),
  );
}

async function loadIndexedEntityProjection(
  queryEntities: NonNullable<PrologPort["queryEntities"]>,
): Promise<Record<string, unknown>[]> {
  const entities: Record<string, unknown>[] = [];
  const seenIds = new Set<string>();
  let offset = 0;
  let pageSize = ENTITY_BATCH_SIZE;
  let totalCount: number | undefined;
  type EntityPage = Awaited<ReturnType<typeof queryEntities>>;

  while (totalCount === undefined || offset < totalCount) {
    let page: EntityPage;
    try {
      page = await queryEntities({ limit: pageSize, offset });
    } catch (error) {
      if (!isOutputCapacityException(error) || pageSize === 1) {
        throw error;
      }
      pageSize = Math.ceil(pageSize / 2);
      continue;
    }

    if (
      !Number.isInteger(page.count) ||
      page.count < 0 ||
      (totalCount !== undefined && page.count !== totalCount)
    ) {
      throw new Error(
        "Full KB paginated entity projection returned an inconsistent count",
      );
    }
    totalCount ??= page.count;
    if (page.entities.length > pageSize) {
      throw new Error(
        "Full KB paginated entity projection returned an oversized page",
      );
    }
    const pageEntities = validateIndexedEntityPage(page.entities, seenIds);
    if (offset + pageEntities.length > totalCount) {
      throw new Error(
        "Full KB paginated entity projection returned more rows than its count",
      );
    }
    if (pageEntities.length === 0 && offset < totalCount) {
      throw new Error(
        "Full KB paginated entity projection returned an incomplete page",
      );
    }
    for (const entity of pageEntities) {
      seenIds.add(normalizeEntityId(stringField(entity, "id")));
    }
    entities.push(...pageEntities);
    offset += pageEntities.length;
    if (offset < totalCount && pageEntities.length < pageSize) {
      throw new Error(
        "Full KB paginated entity projection returned an incomplete page",
      );
    }
  }

  if (entities.length !== totalCount) {
    throw new Error(
      "Full KB paginated entity projection returned an incomplete result",
    );
  }
  return entities;
}

async function loadEntityBatch(
  prolog: Pick<PrologPort, "query">,
  ids: readonly string[],
): Promise<Record<string, unknown>[]> {
  const idTerms = ids.map((id) => toPrologAtom(id)).join(",");
  const result = await prolog.query(
    `findall([Id,Type,Props], (member(Id, [${idTerms}]), kb_entity(Id, Type, Props)), Results)`,
  );
  if (!result.success) {
    const message = result.error ?? "Unknown error";
    if (isOutputCapacityError(result.error)) {
      throw new BoundedEntityProjectionError(message);
    }
    throw new Error(
      `Full KB bounded entity projection query failed: ${message}`,
    );
  }

  const rawRows = result.bindings.Results;
  if (rawRows === undefined) {
    throw new Error(
      "Full KB bounded entity projection query returned no Results binding",
    );
  }
  return validateEntityBatch(
    ids,
    parseListOfLists(rawRows).map(parseEntityFromList),
  );
}

async function loadEntityBatchAdaptively(
  prolog: Pick<PrologPort, "query">,
  ids: readonly string[],
): Promise<Record<string, unknown>[]> {
  try {
    return await loadEntityBatch(prolog, ids);
  } catch (error) {
    if (!(error instanceof BoundedEntityProjectionError)) throw error;
    if (ids.length === 1) {
      throw new Error(
        `Full KB entity projection failed for ${ids[0]}: ${error.message}`,
      );
    }
    const midpoint = Math.ceil(ids.length / 2);
    const left = await loadEntityBatchAdaptively(
      prolog,
      ids.slice(0, midpoint),
    );
    const right = await loadEntityBatchAdaptively(prolog, ids.slice(midpoint));
    return [...left, ...right];
  }
}

async function loadBoundedEntityProjection(
  prolog: Pick<PrologPort, "query">,
): Promise<Record<string, unknown>[]> {
  const idsResult = await prolog.query(ENTITY_IDS_QUERY);
  if (!idsResult.success) {
    throw new Error(
      `Full KB entity ID enumeration query failed: ${idsResult.error ?? "Unknown error"}`,
    );
  }
  const rawIds = idsResult.bindings.Ids;
  if (rawIds === undefined) {
    throw new Error(
      "Full KB entity ID enumeration query returned no Ids binding",
    );
  }
  const ids = parseAuthoritativeEntityIds(rawIds);
  const entities: Record<string, unknown>[] = [];
  for (let offset = 0; offset < ids.length; offset += ENTITY_BATCH_SIZE) {
    entities.push(
      ...(await loadEntityBatchAdaptively(
        prolog,
        ids.slice(offset, offset + ENTITY_BATCH_SIZE),
      )),
    );
  }
  return entities;
}

export async function loadKbExtractionResults(
  prolog: Pick<PrologPort, "query" | "queryEntities">,
): Promise<ExtractionResult[]> {
  let entities: Record<string, unknown>[];
  if (prolog.queryEntities !== undefined) {
    entities = await loadIndexedEntityProjection(
      prolog.queryEntities.bind(prolog),
    );
  } else {
    const entityResult = await prolog.query(
      "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
    );
    if (entityResult.success) {
      entities = entityResult.bindings.Results
        ? parseListOfLists(entityResult.bindings.Results).map(
            parseEntityFromList,
          )
        : [];
    } else if (isOutputCapacityError(entityResult.error)) {
      entities = await loadBoundedEntityProjection(prolog);
    } else {
      throw new Error(
        `Full KB entity projection query failed: ${entityResult.error ?? "Unknown error"}`,
      );
    }
  }
  const relationships = new Map<string, ExtractionResult["relationships"]>();

  for (const relationshipType of RELATIONSHIP_TYPES) {
    const relResult = await prolog.query(
      `findall([From,To,'${relationshipType}'], kb_relationship(${relationshipType}, From, To), Rels)`,
    );
    if (!relResult.success) {
      throw new Error(
        `Full KB relationship projection query failed for ${relationshipType}: ${relResult.error ?? "Unknown error"}`,
      );
    }
    const rows = relResult.bindings.Rels
      ? parseTriples(relResult.bindings.Rels)
      : [];
    for (const [rawFrom, rawTo, type] of rows) {
      const from = normalizeEntityId(rawFrom);
      const to = normalizeEntityId(rawTo);
      const current = relationships.get(from) ?? [];
      current.push({ from, to, type });
      relationships.set(from, current);
    }
  }

  return entities.map((entity) => {
    const result: ExtractionResult = {
      entity: toExtractedEntity(entity),
      relationships: relationships.get(stringField(entity, "id")) ?? [],
    };
    const sourceFile = sourceFileFor(entity);
    if (sourceFile !== undefined) {
      result.sourceFile = sourceFile;
    }
    return result;
  });
}

export function passingE2eStage(
  passingE2e: unknown,
): Readonly<Record<string, unknown>> | undefined {
  return passingE2e &&
    typeof passingE2e === "object" &&
    !Array.isArray(passingE2e)
    ? (passingE2e as Readonly<Record<string, unknown>>)
    : undefined;
}

function stringArrayField(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) ? value.map(String) : undefined;
}

async function loadCoverageProofEvidence(
  prolog: Pick<PrologPort, "query">,
  requirementCount: number,
  proofSnapshot: string | undefined,
  checkedAt: string | undefined,
): Promise<
  ReadonlyMap<
    string,
    Readonly<{
      readonly proofStatus?: string;
      readonly passingE2eStatus?: string;
      readonly passingE2eTests?: readonly string[];
      readonly receiptGapCodes?: readonly string[];
    }>
  >
> {
  if (
    proofSnapshot === undefined ||
    checkedAt === undefined ||
    requirementCount === 0
  ) {
    return new Map();
  }
  let payload: CoverageEvidencePayload;
  try {
    // W1 push-down: the slim evidence projection returns only the fields the
    // quality diagnostics consume, keeping the response far below the output
    // capacity limit on large KBs (the full coverage report rows were the
    // original ENOBUFS offender).
    payload = await runOperationJsonQuery<CoverageEvidencePayload>(
      prolog as PrologPort,
      "discovery.pl",
      `discovery:coverage_evidence_json(${toPrologList([])}, ${toPrologAtom(proofSnapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`,
      "Quality diagnostic coverage evidence",
    );
  } catch {
    // Quality diagnostics must fail closed when the optional proof readback is
    // unavailable; a failed advisory query must not make kb_check fail.
    return new Map();
  }
  const evidence = new Map<
    string,
    Readonly<{
      readonly proofStatus?: string;
      readonly passingE2eStatus?: string;
      readonly passingE2eTests?: readonly string[];
      readonly receiptGapCodes?: readonly string[];
    }>
  >();
  for (const row of payload.rows ?? []) {
    const id = typeof row.id === "string" ? row.id : undefined;
    if (id === undefined) continue;
    const passingE2eTests = stringArrayField(row.passingE2eTests) ?? [];
    evidence.set(id, {
      ...(typeof row.proofStatus === "string"
        ? { proofStatus: row.proofStatus }
        : {}),
      ...(typeof row.passingE2eStatus === "string"
        ? { passingE2eStatus: row.passingE2eStatus }
        : {}),
      passingE2eTests,
      ...(Array.isArray(row.receiptGapCodes)
        ? { receiptGapCodes: row.receiptGapCodes.map(String) }
        : {}),
    });
  }
  return evidence;
}

function capDiagnostics(
  diagnostics: readonly QualityDiagnostic[],
  maxDiagnostics: number | undefined,
): readonly QualityDiagnostic[] {
  return maxDiagnostics !== undefined && maxDiagnostics >= 0
    ? diagnostics.slice(0, maxDiagnostics)
    : diagnostics;
}

function telemetryReadDiagnostic(message: string): QualityDiagnostic {
  return {
    id: "telemetry_evidence_unreadable",
    severity: "review",
    blocking: false,
    category: "telemetry",
    source: ".kb/usage.log",
    message,
    suggestion:
      "Repair or regenerate .kb/usage.log through Kibi diagnostic mode, then rerun kibi usage-metrics --require-acceptance and an unfiltered kb_check.",
  };
}

async function collectTelemetryDiagnostics(
  workspaceRoot: string | undefined,
  now: Date,
): Promise<readonly QualityDiagnostic[]> {
  if (workspaceRoot === undefined) return [];
  const usageLogPath = path.join(workspaceRoot, ".kb", "usage.log");
  let contents: string;
  try {
    contents = await readFile(usageLogPath, "utf8");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    const message = error instanceof Error ? error.message : String(error);
    return [
      telemetryReadDiagnostic(
        `Telemetry acceptance evidence is unreadable: ${message}`,
      ),
    ];
  }

  try {
    const report = analyzeTelemetryAcceptance(
      parseTelemetryUsageLog(contents),
      now,
    );
    return createTelemetryAcceptanceDiagnostics(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      telemetryReadDiagnostic(
        `Telemetry acceptance evidence is malformed: ${message}`,
      ),
    ];
  }
}

export async function collectFullKbQualityDiagnostics(
  options: FullKbQualityDiagnosticsOptions,
): Promise<readonly QualityDiagnostic[]> {
  const [manifestResults, telemetryDiagnostics] = await Promise.all([
    loadKbExtractionResults(options.prolog),
    collectTelemetryDiagnostics(
      options.workspaceRoot,
      options.now ?? new Date(),
    ),
  ]);
  const proofEvidence = await loadCoverageProofEvidence(
    options.prolog,
    manifestResults.filter((result) => result.entity.type === "req").length,
    options.proofSnapshot,
    options.checkedAt,
  );
  const coverageDepthDiagnostics = createCoverageDepthQualityDiagnostics(
    manifestResults,
    proofEvidence,
  );
  const diagnostics = [
    ...telemetryDiagnostics,
    ...createRequirementQualityDiagnostics({
      manifestResults,
      ...(options.hardViolationEntityIds !== undefined
        ? { hardViolationEntityIds: options.hardViolationEntityIds }
        : {}),
    }),
    ...coverageDepthDiagnostics,
    ...createSymbolQualityDiagnostics({
      manifestResults,
      symbolsByFile: new Map(),
    }),
  ];

  return capDiagnostics(diagnostics, options.maxDiagnostics);
}
