import type { PrologProcess } from "@kibi/cli/src/prolog.js";
import { parseAtomList, parsePairList } from "./prolog-list.js";

export type DeriveRule =
  | "transitively_implements"
  | "transitively_depends"
  | "impacted_by_change"
  | "affected_symbols"
  | "coverage_gap"
  | "untested_symbols"
  | "stale"
  | "orphaned"
  | "conflicting"
  | "deprecated_still_used";

export interface DeriveArgs {
  rule: DeriveRule;
  params?: Record<string, unknown>;
}

type DeriveRow = Record<string, unknown>;

export interface DeriveResult {
  content: Array<{ type: string; text: string }>;
  structuredContent: {
    rule: DeriveRule;
    params: Record<string, unknown>;
    count: number;
    rows: DeriveRow[];
    provenance: {
      predicate: string;
      deterministic: true;
    };
  };
}

const RULES: DeriveRule[] = [
  "transitively_implements",
  "transitively_depends",
  "impacted_by_change",
  "affected_symbols",
  "coverage_gap",
  "untested_symbols",
  "stale",
  "orphaned",
  "conflicting",
  "deprecated_still_used",
];

export async function handleKbDerive(
  prolog: PrologProcess,
  args: DeriveArgs,
): Promise<DeriveResult> {
  const params = args.params ?? {};
  const { rule } = args;

  if (!RULES.includes(rule)) {
    throw new Error(`Unsupported rule '${rule}'`);
  }

  let rows: DeriveRow[] = [];
  switch (rule) {
    case "transitively_implements":
      rows = await deriveTransitivelyImplements(prolog, params);
      break;
    case "transitively_depends":
      rows = await deriveTransitivelyDepends(prolog, params);
      break;
    case "impacted_by_change":
      rows = await deriveImpactedByChange(prolog, params);
      break;
    case "affected_symbols":
      rows = await deriveAffectedSymbols(prolog, params);
      break;
    case "coverage_gap":
      rows = await deriveCoverageGap(prolog, params);
      break;
    case "untested_symbols":
      rows = await deriveUntestedSymbols(prolog);
      break;
    case "stale":
      rows = await deriveStale(prolog, params);
      break;
    case "orphaned":
      rows = await deriveOrphaned(prolog, params);
      break;
    case "conflicting":
      rows = await deriveConflicting(prolog, params);
      break;
    case "deprecated_still_used":
      rows = await deriveDeprecatedStillUsed(prolog, params);
      break;
  }

  return {
    content: [
      {
        type: "text",
        text: `Derived ${rows.length} row(s) for rule '${rule}'.`,
      },
    ],
    structuredContent: {
      rule,
      params,
      count: rows.length,
      rows,
      provenance: {
        predicate: rule,
        deterministic: true,
      },
    },
  };
}

async function deriveTransitivelyImplements(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const symbolFilter = asOptionalString(params.symbol);
  const reqFilter = asOptionalString(params.req);
  const cond = makeConjunction([
    symbolFilter ? `Symbol='${escapeAtom(symbolFilter)}'` : "",
    reqFilter ? `Req='${escapeAtom(reqFilter)}'` : "",
  ]);

  const goal = `setof([Symbol,Req], (transitively_implements(Symbol, Req)${cond}), Rows)`;
  const pairs = await queryPairRows(prolog, goal, "Rows");
  return pairs.map(([symbol, req]) => ({ symbol, req }));
}

async function deriveTransitivelyDepends(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const req1Filter = asOptionalString(params.req1);
  const req2Filter = asOptionalString(params.req2);
  const cond = makeConjunction([
    req1Filter ? `Req1='${escapeAtom(req1Filter)}'` : "",
    req2Filter ? `Req2='${escapeAtom(req2Filter)}'` : "",
  ]);

  const goal = `setof([Req1,Req2], (transitively_depends(Req1, Req2)${cond}), Rows)`;
  const pairs = await queryPairRows(prolog, goal, "Rows");
  return pairs.map(([req1, req2]) => ({ req1, req2 }));
}

async function deriveImpactedByChange(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const changed = asRequiredString(params.changed, "params.changed is required");
  const goal = `setof(Entity, impacted_by_change(Entity, '${escapeAtom(changed)}'), Rows)`;
  const entities = await queryAtomRows(prolog, goal, "Rows");
  return entities.map((entity) => ({ changed, entity }));
}

async function deriveAffectedSymbols(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const req = asRequiredString(params.req, "params.req is required");
  const goal = `affected_symbols('${escapeAtom(req)}', Symbols)`;
  const result = await prolog.query(goal);
  if (!result.success || !result.bindings.Symbols) {
    return [];
  }

  const symbols = parseAtomList(result.bindings.Symbols);
  return symbols.map((symbol) => ({ req, symbol }));
}

async function deriveCoverageGap(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const reqFilter = asOptionalString(params.req);
  const cond = reqFilter ? `Req='${escapeAtom(reqFilter)}'` : "";
  const goal = `setof([Req,Reason], (coverage_gap(Req, Reason)${makeConjunction([cond])}), Rows)`;
  const pairs = await queryPairRows(prolog, goal, "Rows");
  return pairs.map(([req, reason]) => ({ req, reason }));
}

async function deriveUntestedSymbols(prolog: PrologProcess): Promise<DeriveRow[]> {
  const result = await prolog.query("untested_symbols(Symbols)");
  if (!result.success || !result.bindings.Symbols) {
    return [];
  }

  const symbols = parseAtomList(result.bindings.Symbols);
  return symbols.map((symbol) => ({ symbol }));
}

async function deriveStale(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const maxAgeDays = Number(params.max_age_days ?? params.maxAgeDays);
  if (!Number.isFinite(maxAgeDays)) {
    throw new Error("params.max_age_days is required and must be numeric");
  }

  const entityFilter = asOptionalString(params.entity);
  const cond = entityFilter ? `Entity='${escapeAtom(entityFilter)}'` : "";
  const goal = `setof(Entity, (stale(Entity, ${maxAgeDays})${makeConjunction([cond])}), Rows)`;
  const entities = await queryAtomRows(prolog, goal, "Rows");
  return entities.map((entity) => ({ entity, max_age_days: maxAgeDays }));
}

async function deriveOrphaned(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const symbolFilter = asOptionalString(params.symbol);
  const cond = symbolFilter ? `Symbol='${escapeAtom(symbolFilter)}'` : "";
  const goal = `setof(Symbol, (orphaned(Symbol)${makeConjunction([cond])}), Rows)`;
  const symbols = await queryAtomRows(prolog, goal, "Rows");
  return symbols.map((symbol) => ({ symbol }));
}

async function deriveConflicting(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const adr1Filter = asOptionalString(params.adr1);
  const adr2Filter = asOptionalString(params.adr2);
  const cond = makeConjunction([
    adr1Filter ? `Adr1='${escapeAtom(adr1Filter)}'` : "",
    adr2Filter ? `Adr2='${escapeAtom(adr2Filter)}'` : "",
  ]);
  const goal = `setof([Adr1,Adr2], (conflicting(Adr1, Adr2)${cond}), Rows)`;
  const pairs = await queryPairRows(prolog, goal, "Rows");
  return pairs.map(([adr1, adr2]) => ({ adr1, adr2 }));
}

async function deriveDeprecatedStillUsed(
  prolog: PrologProcess,
  params: Record<string, unknown>,
): Promise<DeriveRow[]> {
  const adrFilter = asOptionalString(params.adr);
  const goal = adrFilter
    ? `deprecated_still_used('${escapeAtom(adrFilter)}', Symbols)`
    : "setof([Adr,Symbols], deprecated_still_used(Adr, Symbols), Rows)";

  if (adrFilter) {
    const result = await prolog.query(goal);
    if (!result.success || !result.bindings.Symbols) {
      return [];
    }
    return [{ adr: adrFilter, symbols: parseAtomList(result.bindings.Symbols) }];
  }

  const pairs = await queryPairRows(prolog, goal, "Rows");
  return pairs.map(([adr, symbolsRaw]) => ({
    adr,
    symbols: parseAtomList(symbolsRaw),
  }));
}

async function queryAtomRows(
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

async function queryPairRows(
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

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(message);
  }
  return value;
}

function makeConjunction(parts: string[]): string {
  const filtered = parts.filter((part) => part.length > 0);
  if (filtered.length === 0) {
    return "";
  }
  return `, ${filtered.join(", ")}`;
}

function escapeAtom(value: string): string {
  return value.replace(/'/g, "\\'");
}
