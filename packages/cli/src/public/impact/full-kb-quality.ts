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
import {
  createCoarseAnchorQualityDiagnostics,
  createCoverageDepthQualityDiagnostics,
} from "./coverage-depth-quality.js";
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
  /**
   * The per-contract receipt bindings kb_coverage uses (a Prolog
   * TestId -> binding hash dict), or null for strict snapshot binding. Read
   * lazily so a check without proof evidence never pays for it.
   */
  readonly proofTestBindings?: () => Promise<string | null>;
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

/** Optional fields copied when they hold a non-empty string. */
const STRING_FIELDS = [
  "owner",
  "priority",
  "severity",
  "text_ref",
  "semantic_text",
  "semantic_source_hash",
  "granularity_reason",
  "symbol_kind",
  "symbol_role",
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
] as const;

/** Optional fields copied when they hold one of the listed strings. */
const ENUM_FIELDS: Readonly<Record<string, ReadonlySet<string>>> = {
  semantic_inventory_version: new Set(["kibi.semantic-inventory.v1"]),
  semantic_source_field: new Set(["semantic_text", "text_ref", "title"]),
  verification_scope: new Set(["unit", "integration", "end_to_end"]),
  verification_perspective: new Set(["internal", "consumer"]),
  fact_kind: new Set([
    "subject",
    "property_value",
    "observation",
    "meta",
    "predicate_schema",
    "predicate",
    "rule_schema",
    "rule",
  ]),
  operator: new Set(["eq", "neq", "lt", "lte", "gt", "gte"]),
  value_type: new Set(["string", "int", "number", "bool"]),
  polarity: new Set(["require", "forbid", "assert", "deny"]),
};

/** Optional fields copied as strings when they hold a list. */
const STRING_ARRAY_FIELDS = [
  "tags",
  "logic_claims",
  "semantic_clauses",
  "argument_names",
  "argument_types",
  "argument_descriptions",
  "key_arguments",
  "aliases",
  "examples",
  "predicate_args",
  "value_set",
] as const;

/** Optional fields copied as they are when they hold a list. */
const LIST_FIELDS = [
  "semantic_inventory",
  "proof_bindings",
  "proof_receipts",
] as const;

/** Optional fields copied when they hold an object that is not a list. */
const OBJECT_FIELDS = ["proof_contract", "rule_ir"] as const;

/** Optional fields copied when they hold a number. */
const NUMBER_FIELDS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
  "value_int",
  "value_number",
  "predicate_arity",
  "claim_span_start",
  "claim_span_end",
] as const;

/** Optional fields copied when they hold a boolean. */
const BOOLEAN_FIELDS = ["value_bool", "closed_world"] as const;

function toExtractedEntity(entity: Record<string, unknown>): ExtractedEntity {
  const extracted: Record<string, unknown> = {
    id: stringField(entity, "id"),
    type: stringField(entity, "type"),
    title: stringField(entity, "title"),
    status: stringField(entity, "status"),
    created_at: stringField(entity, "created_at"),
    updated_at: stringField(entity, "updated_at"),
    source: stringField(entity, "source"),
  };
  for (const field of STRING_FIELDS) {
    const value = optionalStringField(entity, field);
    if (value !== undefined) extracted[field] = value;
  }
  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    const value = entity[field];
    // has() takes any value; only an allowed string is in the set.
    if (allowed.has(value as string)) extracted[field] = value;
  }
  for (const field of STRING_ARRAY_FIELDS) {
    const value = entity[field];
    if (Array.isArray(value)) extracted[field] = value.map(String);
  }
  for (const field of LIST_FIELDS) {
    const value = entity[field];
    if (Array.isArray(value)) extracted[field] = value;
  }
  for (const field of OBJECT_FIELDS) {
    const value = entity[field];
    if (typeof value === "object" && value !== null && !Array.isArray(value))
      extracted[field] = value;
  }
  for (const field of NUMBER_FIELDS) {
    const value = entity[field];
    if (typeof value === "number") extracted[field] = value;
  }
  for (const field of BOOLEAN_FIELDS) {
    const value = entity[field];
    if (typeof value === "boolean") extracted[field] = value;
  }
  return extracted as unknown as ExtractedEntity;
}

function sourceFileFor(entity: Record<string, unknown>): string | undefined {
  return (
    optionalStringField(entity, "sourceFile") ??
    optionalStringField(entity, "source_file")
  );
}

/** An entity batch whose answer overflowed the Prolog output. */
class BoundedEntityProjectionError extends Error {}

function isOutputCapacityError(error: string | undefined): boolean {
  return error?.includes(PROLOG_OUTPUT_CAPACITY_MARKER) === true;
}

function parseAuthoritativeEntityIds(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    throw new Error("Full KB entity ID enumeration returned malformed data");
  }
  // parseAtomList drops empty atoms, so every ID it returns is non-empty.
  return parseAtomList(trimmed);
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
  // An Error reads as "Name: message", which holds the message.
  return isOutputCapacityError(String(error));
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

  // The loop ends once offset reaches the count, and no page may carry the
  // offset past it, so every counted row has been read.
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
    // Never probe with an unbounded all-entities findall: receipt histories
    // make that answer grow without limit, and an overflow terminates the
    // interactive Prolog process that serves every later query.
    entities = await loadBoundedEntityProjection(prolog);
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
    const rawRows = relResult.bindings.Rels;
    if (rawRows === undefined) continue;
    for (const [rawFrom, rawTo, type] of parseTriples(rawRows)) {
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
  proofTestBindings: (() => Promise<string | null>) | undefined,
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
    // Judge receipts with the binding kb_coverage uses; under strict snapshot
    // binding any unrelated change since kibi prove would read every receipt
    // as stale and bring back the weak-depth review.
    const bindings = (await proofTestBindings?.()) ?? null;
    const binding =
      bindings === null ? "strict_snapshot, _{}" : `per_contract, ${bindings}`;
    // W1 push-down: the slim evidence projection returns only the fields the
    // quality diagnostics consume, keeping the response far below the output
    // capacity limit on large KBs (the full coverage report rows were the
    // original ENOBUFS offender).
    payload = await runOperationJsonQuery<CoverageEvidencePayload>(
      prolog as PrologPort,
      "discovery.pl",
      `discovery:coverage_evidence_json(${toPrologList([])}, ${binding}, ${toPrologAtom(proofSnapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`,
      // rationale: the label only names a failure, which this caller swallows
      // Stryker disable next-line StringLiteral
      "Quality diagnostic coverage evidence",
    );
  } catch {
    // Quality diagnostics must fail closed when the optional proof readback is
    // unavailable; a failed advisory query must not make kb_check fail.
    return new Map();
  }
  if (!Array.isArray(payload.rows)) return new Map();
  const evidence = new Map<
    string,
    Readonly<{
      readonly proofStatus?: string;
      readonly passingE2eStatus?: string;
      readonly passingE2eTests?: readonly string[];
      readonly receiptGapCodes?: readonly string[];
    }>
  >();
  for (const row of payload.rows) {
    // A row without a string id is kept under a key no requirement id equals.
    const id = row.id as string;
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
  // undefined >= 0 is false, so no cap keeps every diagnostic.
  return (maxDiagnostics as number) >= 0
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
  now: Date | undefined,
): Promise<readonly QualityDiagnostic[]> {
  if (workspaceRoot === undefined) return [];
  const usageLogPath = path.join(workspaceRoot, ".kb", "usage.log");
  let contents: string;
  try {
    contents = await readFile(usageLogPath, "utf8");
  } catch (error) {
    // readFile rejects with a system error that carries a code.
    const failure = error as NodeJS.ErrnoException;
    if (failure.code === "ENOENT") return [];
    return [
      telemetryReadDiagnostic(
        `Telemetry acceptance evidence is unreadable: ${failure.message}`,
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
    // The parser and the analysis throw only Error values.
    return [
      telemetryReadDiagnostic(
        `Telemetry acceptance evidence is malformed: ${(error as Error).message}`,
      ),
    ];
  }
}

export async function collectFullKbQualityDiagnostics(
  options: FullKbQualityDiagnosticsOptions,
): Promise<readonly QualityDiagnostic[]> {
  const [manifestResults, telemetryDiagnostics] = await Promise.all([
    loadKbExtractionResults(options.prolog),
    collectTelemetryDiagnostics(options.workspaceRoot, options.now),
  ]);
  const proofEvidence = await loadCoverageProofEvidence(
    options.prolog,
    manifestResults.filter((result) => result.entity.type === "req").length,
    options.proofSnapshot,
    options.checkedAt,
    options.proofTestBindings,
  );
  const coverageDepthDiagnostics = createCoverageDepthQualityDiagnostics(
    manifestResults,
    proofEvidence,
  );
  const diagnostics = [
    ...telemetryDiagnostics,
    // The requirement review reads only manifestResults and
    // hardViolationEntityIds from these options.
    ...createRequirementQualityDiagnostics({ ...options, manifestResults }),
    ...coverageDepthDiagnostics,
    ...createCoarseAnchorQualityDiagnostics(manifestResults),
    ...createSymbolQualityDiagnostics({
      manifestResults,
      symbolsByFile: new Map(),
    }),
  ];

  return capDiagnostics(diagnostics, options.maxDiagnostics);
}
