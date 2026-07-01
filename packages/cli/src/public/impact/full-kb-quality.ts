import type { PrologProcess } from "../../prolog.js";
import { parseListOfLists, parseEntityFromList, parseTriples } from "../../prolog/codec.js";
import type { ExtractedEntity, ExtractionResult } from "../../extractors/markdown.js";
import type { QualityDiagnostic } from "./types.js";
import { createCoverageDepthQualityDiagnostics } from "./coverage-depth-quality.js";
import { createRequirementQualityDiagnostics } from "./requirement-quality.js";
import { createSymbolQualityDiagnostics } from "./symbol-quality.js";

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
  readonly prolog: PrologProcess;
  readonly hardViolationEntityIds?: ReadonlySet<string>;
  readonly maxDiagnostics?: number;
};

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
  if (sourceEndColumn !== undefined) extracted.sourceEndColumn = sourceEndColumn;
  const factKind = optionalStringField(entity, "fact_kind");
  if (
    factKind === "subject" ||
    factKind === "property_value" ||
    factKind === "observation" ||
    factKind === "meta"
  ) {
    extracted.fact_kind = factKind;
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
  prolog: PrologProcess,
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
    const rows = relResult.bindings.Rels ? parseTriples(relResult.bindings.Rels) : [];
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

function capDiagnostics(
  diagnostics: readonly QualityDiagnostic[],
  maxDiagnostics: number | undefined,
): readonly QualityDiagnostic[] {
  return maxDiagnostics !== undefined && maxDiagnostics >= 0
    ? diagnostics.slice(0, maxDiagnostics)
    : diagnostics;
}

export async function collectFullKbQualityDiagnostics(
  options: FullKbQualityDiagnosticsOptions,
): Promise<readonly QualityDiagnostic[]> {
  const manifestResults = await loadKbExtractionResults(options.prolog);
  const coverageDepthDiagnostics =
    createCoverageDepthQualityDiagnostics(manifestResults);
  const diagnostics = [
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
