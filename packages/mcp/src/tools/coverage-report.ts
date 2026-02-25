import type { PrologProcess } from "@kibi/cli/prolog";
import { parseAtomList, parsePairList } from "./prolog-list.js";

type CoverageType = "req" | "symbol";

export interface CoverageReportArgs {
  type?: CoverageType;
}

export interface CoverageReportResult {
  content: Array<{ type: string; text: string }>;
  structuredContent: {
    requested_type: CoverageType | "all";
    coverage: {
      requirements?: {
        total: number;
        with_gaps: number;
        healthy: number;
        gaps: Array<{ req: string; reason: string }>;
      };
      symbols?: {
        total: number;
        untested: number;
        tested: number;
        untested_symbols: string[];
      };
    };
    provenance: {
      deterministic: true;
      predicates: string[];
    };
  };
}

export async function handleKbCoverageReport(
  prolog: PrologProcess,
  args: CoverageReportArgs,
): Promise<CoverageReportResult> {
  const requested = args.type ?? "all";
  if (args.type && args.type !== "req" && args.type !== "symbol") {
    throw new Error("'type' must be one of: req, symbol");
  }

  const coverage: CoverageReportResult["structuredContent"]["coverage"] = {};
  const predicates: string[] = [];

  if (requested === "all" || requested === "req") {
    const reqIds = await queryAtoms(
      prolog,
      "setof(Req, kb_entity(Req, req, _), Reqs)",
      "Reqs",
    );
    const gapPairs = await queryPairs(
      prolog,
      "setof([Req,Reason], coverage_gap(Req, Reason), Rows)",
      "Rows",
    );

    const gaps = gapPairs.map(([req, reason]) => ({ req, reason }));
    coverage.requirements = {
      total: reqIds.length,
      with_gaps: gaps.length,
      healthy: Math.max(reqIds.length - gaps.length, 0),
      gaps,
    };
    predicates.push("coverage_gap");
  }

  if (requested === "all" || requested === "symbol") {
    const symbolIds = await queryAtoms(
      prolog,
      "setof(Symbol, kb_entity(Symbol, symbol, _), Symbols)",
      "Symbols",
    );
    const untestedResult = await prolog.query("untested_symbols(Symbols)");
    const untestedSymbols =
      untestedResult.success && untestedResult.bindings.Symbols
        ? parseAtomList(untestedResult.bindings.Symbols)
        : [];

    coverage.symbols = {
      total: symbolIds.length,
      untested: untestedSymbols.length,
      tested: Math.max(symbolIds.length - untestedSymbols.length, 0),
      untested_symbols: untestedSymbols,
    };
    predicates.push("untested_symbols");
  }

  const summaryParts: string[] = [];
  if (coverage.requirements) {
    summaryParts.push(
      `${coverage.requirements.healthy}/${coverage.requirements.total} requirements healthy`,
    );
  }
  if (coverage.symbols) {
    summaryParts.push(
      `${coverage.symbols.tested}/${coverage.symbols.total} symbols tested`,
    );
  }

  return {
    content: [
      {
        type: "text",
        text:
          summaryParts.length > 0
            ? `Coverage report: ${summaryParts.join("; ")}.`
            : "Coverage report: no data.",
      },
    ],
    structuredContent: {
      requested_type: requested,
      coverage,
      provenance: {
        deterministic: true,
        predicates,
      },
    },
  };
}

async function queryAtoms(
  prolog: PrologProcess,
  goal: string,
  bindingName: string,
): Promise<string[]> {
  const result = await prolog.query(goal);
  if (!result.success || !result.bindings[bindingName]) {
    return [];
  }
  return parseAtomList(result.bindings[bindingName]);
}

async function queryPairs(
  prolog: PrologProcess,
  goal: string,
  bindingName: string,
): Promise<Array<[string, string]>> {
  const result = await prolog.query(goal);
  if (!result.success || !result.bindings[bindingName]) {
    return [];
  }
  return parsePairList(result.bindings[bindingName]);
}
