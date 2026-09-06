import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  ExtractedEntity,
  ExtractionResult,
} from "../../extractors/markdown.js";
import {
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
import {
  analyzeTelemetryAcceptance,
  createTelemetryAcceptanceDiagnostics,
  parseTelemetryUsageLog,
} from "../telemetry-acceptance.js";
import { createCoverageDepthQualityDiagnostics } from "./coverage-depth-quality.js";
import { createRequirementQualityDiagnostics } from "./requirement-quality.js";
import { createSymbolQualityDiagnostics } from "./symbol-quality.js";
import type { QualityDiagnostic } from "./types.js";

const RELATIONSHIP_TYPES = [
  "depends_on",
  "executable_for",
  "specified_by",
  "verified_by",
  "validates",
  "implements",
  "covered_by",
  "constrained_by",
  "constrains",
  "requires_property",
  "requires_predicate",
  "guards",
  "publishes",
  "consumes",
  "supersedes",
  "relates_to",
] as const;

type FullKbQualityDiagnosticsOptions = {
  readonly prolog: Pick<PrologPort, "query">;
  readonly hardViolationEntityIds?: ReadonlySet<string>;
  readonly maxDiagnostics?: number;
  readonly workspaceRoot?: string;
  readonly now?: Date;
  readonly proofSnapshot?: string;
  readonly checkedAt?: string;
};

type CoveragePayload = Readonly<{
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
    factKind === "predicate"
  ) {
    extracted.fact_kind = factKind;
  }
  const claimKey = optionalStringField(entity, "claim_key");
  if (claimKey !== undefined) extracted.claim_key = claimKey;
  const claimText = optionalStringField(entity, "claim_text");
  if (claimText !== undefined) extracted.claim_text = claimText;
  const predicateName = optionalStringField(entity, "predicate_name");
  if (predicateName !== undefined) extracted.predicate_name = predicateName;
  const predicateNamespace = optionalStringField(entity, "predicate_namespace");
  if (predicateNamespace !== undefined) {
    extracted.predicate_namespace = predicateNamespace;
  }
  const predicateArity = optionalNumberField(entity, "predicate_arity");
  if (predicateArity !== undefined) extracted.predicate_arity = predicateArity;
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

async function loadKbExtractionResults(
  prolog: Pick<PrologPort, "query">,
): Promise<ExtractionResult[]> {
  const entityResult = await prolog.query(
    "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
  );
  const entities = entityResult.bindings.Results
    ? parseListOfLists(entityResult.bindings.Results).map(parseEntityFromList)
    : [];
  const relationships = new Map<string, ExtractionResult["relationships"]>();

  for (const relationshipType of RELATIONSHIP_TYPES) {
    const relResult = await prolog.query(
      `findall([From,To,'${relationshipType}'], kb_relationship(${relationshipType}, From, To), Rels)`,
    );
    const rows = relResult.bindings.Rels
      ? parseTriples(relResult.bindings.Rels)
      : [];
    for (const [from, to, type] of rows) {
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

function proofStage(
  row: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | undefined {
  const stages = row.proofStages;
  if (!stages || typeof stages !== "object" || Array.isArray(stages)) {
    return undefined;
  }
  const passingE2e = (stages as Record<string, unknown>).passingE2e;
  return passingE2eStage(passingE2e);
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
  let payload: CoveragePayload;
  try {
    payload = await runOperationJsonQuery<CoveragePayload>(
      prolog as PrologPort,
      "discovery.pl",
      `discovery:coverage_report_json('req', ${toPrologList([])}, true, true, ${requirementCount}, 0, ${toPrologAtom(proofSnapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`,
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
    const passingE2e = proofStage(row);
    const proofGaps = stringArrayField(row.proofGaps);
    const passingE2eTests = stringArrayField(passingE2e?.tests);
    evidence.set(id, {
      ...(typeof row.proofStatus === "string"
        ? { proofStatus: row.proofStatus }
        : {}),
      ...(typeof passingE2e?.status === "string"
        ? { passingE2eStatus: passingE2e.status }
        : {}),
      ...(passingE2eTests !== undefined ? { passingE2eTests } : {}),
      ...(proofGaps !== undefined
        ? {
            receiptGapCodes: proofGaps.filter(
              (gap) =>
                gap.includes("proof_receipt") ||
                gap.includes("proof_contract") ||
                gap.includes("proof_snapshot"),
            ),
          }
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
