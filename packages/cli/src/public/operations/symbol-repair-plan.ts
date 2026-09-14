import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { coarseCoordinateSpan } from "../../extractors/symbol-coordinates.js";
import {
  type ManifestSymbolEntry,
  analyzeSourceText,
  enrichSymbolCoordinates,
} from "../../extractors/symbols-coordinator.js";
import { isCoarseGranularityReason } from "../symbol-granularity.js";
import { loadEntities } from "./discovery-entities.js";
import type { OperationContext } from "./runtime-types.js";

export const SYMBOL_REPAIR_PLAN_VERSION = "kibi.symbol-repair-plan.v1" as const;

export type SymbolRepairPlan = Readonly<{
  version: typeof SYMBOL_REPAIR_PLAN_VERSION;
  readOnly: true;
  autoApplicable: false;
  repairs: readonly Readonly<Record<string, unknown>>[];
}>;

function sourceFileOf(
  entity: Readonly<Record<string, unknown>>,
): string | null {
  const value = entity.sourceFile ?? entity.source;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function coordinatesPresent(
  entity: Readonly<Record<string, unknown>>,
): boolean {
  return [
    entity.sourceLine,
    entity.sourceColumn,
    entity.sourceEndLine,
    entity.sourceEndColumn,
  ].every((value) => Number.isInteger(value) && Number(value) >= 0);
}

export type CoordinateRepairEvidence = Readonly<{
  symbolId: string;
  sourceFile: string | null;
  refreshable: boolean;
  reason:
    | "extractable"
    | "coarse_anchor"
    | "extractor_miss"
    | "source_unavailable";
  suggestion: string;
}>;

/** Preview the same extraction and explicit coarse fallback used by refresh. */
export async function inspectCoordinateRepairs(
  symbols: readonly Readonly<Record<string, unknown>>[],
  workspaceRoot: string,
): Promise<Map<string, CoordinateRepairEvidence>> {
  const entries: ManifestSymbolEntry[] = symbols.map((symbol) => {
    const sourceFile = sourceFileOf(symbol);
    return {
      id: String(symbol.id),
      title: typeof symbol.title === "string" ? symbol.title : "",
      ...(sourceFile === null ? {} : { sourceFile }),
      ...(typeof symbol.granularity_reason === "string"
        ? { granularity_reason: symbol.granularity_reason }
        : {}),
    };
  });
  const enriched = await enrichSymbolCoordinates(entries, workspaceRoot);
  return new Map(
    entries.map((entry, index) => {
      const sourceFile = entry.sourceFile ?? null;
      let source: string | null = null;
      if (sourceFile) {
        try {
          source = readFileSync(
            path.resolve(workspaceRoot, sourceFile),
            "utf8",
          );
        } catch {
          /* A missing or unreadable source requires authored repair. */
        }
      }
      const extracted =
        entry.title.length > 0 && coordinatesPresent(enriched[index] ?? {});
      const coarse =
        source !== null &&
        sourceFile !== null &&
        isCoarseGranularityReason(entry.granularity_reason) &&
        coarseCoordinateSpan(sourceFile, entry.title, source) !== null;
      const reason =
        source === null
          ? "source_unavailable"
          : extracted
            ? "extractable"
            : coarse
              ? "coarse_anchor"
              : "extractor_miss";
      const refreshable = source !== null && (extracted || coarse);
      return [
        entry.id,
        {
          symbolId: entry.id,
          sourceFile,
          refreshable,
          reason,
          suggestion: refreshable
            ? "Refresh and persist current symbol coordinates."
            : source === null
              ? "Repair sourceFile to point to readable implementation code before refreshing."
              : "Query and validate the symbol, then author a resolvable title/sourceFile or an explicit granularity_reason: extractor-miss (or another intentional coarse anchor) through kb_upsert before refreshing.",
        },
      ];
    }),
  );
}

/** Attach current extraction evidence before constructing requirement repairs. */
export async function addCoordinateRepairEvidence(
  rows: readonly Readonly<Record<string, unknown>>[],
  context: OperationContext,
): Promise<readonly Readonly<Record<string, unknown>>[]> {
  const missingByRow = rows.map((row) => {
    const stages = row.proofStages as
      | { sourceCoordinates?: { missingSymbols?: unknown } }
      | undefined;
    const missing = stages?.sourceCoordinates?.missingSymbols;
    return Array.isArray(missing)
      ? missing.filter((id): id is string => typeof id === "string")
      : [];
  });
  const ids = new Set(missingByRow.flat());
  if (ids.size === 0 || !context.prolog) return rows;
  const symbols = (
    await loadEntities(context.prolog, { type: "symbol" })
  ).filter((symbol) => ids.has(String(symbol.id)));
  const evidence = await inspectCoordinateRepairs(
    symbols,
    context.workspaceRoot,
  );
  return rows.map((row, index) => {
    const missing = missingByRow[index] ?? [];
    if (missing.length === 0) return row;
    const coordinateRepairs = missing.map(
      (id) =>
        evidence.get(id) ?? {
          symbolId: id,
          sourceFile: null,
          refreshable: false,
          reason: "source_unavailable",
          suggestion: "Query and repair the missing symbol before refreshing.",
        },
    );
    const stages = row.proofStages as Record<string, Record<string, unknown>>;
    return {
      ...row,
      ...(Array.isArray(row.proofRepairs)
        ? {
            proofRepairs: row.proofRepairs.map((repair) =>
              repair?.gap === "missing_symbol_coordinates" &&
              coordinateRepairs.some((item) => !item.refreshable)
                ? {
                    ...repair,
                    action: [
                      ...new Set(
                        coordinateRepairs
                          .filter((item) => !item.refreshable)
                          .map((item) => item.suggestion),
                      ),
                    ].join(" "),
                  }
                : repair,
            ),
          }
        : {}),
      proofStages: {
        ...stages,
        sourceCoordinates: {
          ...stages.sourceCoordinates,
          coordinateRepairs,
        },
      },
    };
  });
}

function currentCandidates(
  entity: Readonly<Record<string, unknown>>,
  symbols: readonly Readonly<Record<string, unknown>>[],
  extractedByPath: ReadonlyMap<
    string,
    readonly { name: string; kind: string }[]
  >,
): Readonly<Record<string, unknown>>[] {
  const title = typeof entity.title === "string" ? entity.title : "";
  const kind = typeof entity.symbol_kind === "string" ? entity.symbol_kind : "";
  const source = sourceFileOf(entity);
  const extracted = source ? (extractedByPath.get(source) ?? []) : [];
  const names = new Set(
    extracted
      .filter((candidate) => !kind || candidate.kind === kind)
      .map((candidate) => candidate.name),
  );
  return symbols
    .filter((candidate) => candidate.id !== entity.id)
    .filter((candidate) => {
      const candidateTitle =
        typeof candidate.title === "string" ? candidate.title : "";
      const candidateKind =
        typeof candidate.symbol_kind === "string" ? candidate.symbol_kind : "";
      return (
        (title !== "" && candidateTitle === title) ||
        (kind !== "" && candidateKind === kind && names.has(candidateTitle))
      );
    })
    .map((candidate) => ({
      symbolId: String(candidate.id),
      title: candidate.title,
      symbolKind: candidate.symbol_kind,
      sourceFile: sourceFileOf(candidate),
      evidence: "current extraction/title/kind match",
    }));
}

/** Build review-only, evidence-backed symbol recovery suggestions. */
export async function buildSymbolRepairPlan(
  rows: readonly Readonly<Record<string, unknown>>[],
  context: OperationContext,
): Promise<SymbolRepairPlan | undefined> {
  if (!context.prolog || rows.length === 0) return undefined;
  const symbols = await loadEntities(context.prolog, { type: "symbol" });
  const extractedByPath = new Map<
    string,
    readonly { name: string; kind: string }[]
  >();
  for (const symbol of symbols) {
    const source = sourceFileOf(symbol);
    if (!source || extractedByPath.has(source)) continue;
    const absolute = path.isAbsolute(source)
      ? source
      : path.resolve(context.workspaceRoot, source);
    if (!existsSync(absolute)) continue;
    try {
      const analysis = analyzeSourceText(
        absolute,
        readFileSync(absolute, "utf8"),
      );
      if (analysis.providerId === null) continue;
      extractedByPath.set(
        source,
        analysis.symbols.map((candidate) => ({
          name: candidate.name,
          kind: candidate.kind,
        })),
      );
    } catch {
      // An unavailable extractor cannot establish that a declaration is absent.
    }
  }

  const coordinateEvidence = await inspectCoordinateRepairs(
    symbols.filter((symbol) => !coordinatesPresent(symbol)),
    context.workspaceRoot,
  );
  const repairs = rows.flatMap((row) => {
    if (row.type !== "symbol") return [];
    const entity = symbols.find((candidate) => candidate.id === row.id);
    if (!entity) return [];
    const source = sourceFileOf(entity);
    const absolute = source
      ? path.isAbsolute(source)
        ? source
        : path.resolve(context.workspaceRoot, source)
      : null;
    const exists = absolute !== null && existsSync(absolute);
    const candidates = currentCandidates(entity, symbols, extractedByPath);
    const extraction = source ? extractedByPath.get(source) : undefined;
    const extractionProvesAbsent =
      exists &&
      extraction !== undefined &&
      !extraction.some(
        (candidate) =>
          candidate.name === entity.title &&
          (!entity.symbol_kind || candidate.kind === entity.symbol_kind),
      );
    const gaps = Array.isArray(row.gaps) ? row.gaps.map(String) : [];
    const action = !exists
      ? entity.symbol_origin === "extracted"
        ? "delete_obsolete_symbol"
        : "review"
      : extractionProvesAbsent && entity.symbol_origin === "extracted"
        ? "delete_obsolete_symbol"
        : !coordinatesPresent(entity)
          ? coordinateEvidence.get(String(entity.id))?.refreshable === true
            ? "refresh_coordinates"
            : "review"
          : candidates.length > 0
            ? "remap"
            : "review";
    return [
      {
        symbolId: String(entity.id),
        action,
        candidates,
        evidence: {
          sourceFile: source,
          sourceExists: exists,
          extractionProvesAbsent,
          gaps,
          currentExtractionAvailable: source
            ? extractedByPath.has(source)
            : false,
          autoApply: false,
          coordinateRepair: coordinateEvidence.get(String(entity.id)),
        },
      },
    ];
  });
  return {
    version: SYMBOL_REPAIR_PLAN_VERSION,
    readOnly: true,
    autoApplicable: false,
    repairs,
  };
}
