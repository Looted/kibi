import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { analyzeSourceText } from "../../extractors/symbols-coordinator.js";
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
      extractedByPath.set(
        source,
        analysis.symbols.map((candidate) => ({
          name: candidate.name,
          kind: candidate.kind,
        })),
      );
    } catch {
      extractedByPath.set(source, []);
    }
  }

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
          ? "refresh_coordinates"
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
