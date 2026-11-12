import path from "node:path";
import { type PrologProcess, resolveKbPlPath } from "../prolog.js";
import {
  type ParsedViolation,
  escapeAtom,
  parseViolationRows,
  splitTopLevelGeneral,
  toPrologAtom,
} from "../prolog/codec.js";

export interface ValidationOptions {
  minLinks: number;
  prolog: PrologProcess;
}

export interface Violation {
  symbolId: string;
  name: string;
  file: string;
  line: number;
  column: number;
  currentLinks: number;
  requiredLinks: number;
}

// SWI-Prolog writes quoted atoms with backslash escapes (`'it\\'s'`); the
// doubled-quote form (`'it''s'`) is accepted too.
function unquoteAtom(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed
      .slice(1, -1)
      .replace(/''|\\(.)/g, (_match, escaped?: string) => escaped ?? "'");
  }
  return trimmed;
}

// Rows are split with the shared Prolog scanner so quoted commas, brackets
// and escaped quotes inside atoms never split a row or a column.
function parsePrologListOfLists(value: string): string[][] {
  // value is a Prolog list like [[a,1,'file.pl',10,0,'name'],[...]] or [].
  const out: string[][] = [];
  for (const row of splitTopLevelGeneral(value.trim().slice(1, -1), ",")) {
    const rowTrimmed = row.trim();
    if (!rowTrimmed.startsWith("[") || !rowTrimmed.endsWith("]")) {
      continue;
    }
    out.push(
      splitTopLevelGeneral(rowTrimmed.slice(1, -1), ",").map((c) => c.trim()),
    );
  }
  return out;
}

export async function validateStagedSymbols(
  options: ValidationOptions,
): Promise<Violation[]> {
  const { minLinks, prolog } = options;

  const goal = `findall([Sym,Count,File,Line,Col,Name], kb:changed_symbol_violation(Sym, ${minLinks}, Count, File, Line, Col, Name), Rows)`;

  const res = await prolog.query(goal);
  if (!res.success) {
    throw new Error(`Prolog query failed: ${res.error || "unknown error"}`);
  }

  const rowsRaw = res.bindings.Rows;
  const lists = rowsRaw === undefined ? [] : parsePrologListOfLists(rowsRaw);
  const violations: Violation[] = [];
  for (const row of lists) {
    // row: [Sym,Count,File,Line,Col,Name]
    if (row.length < 6) continue;
    const [sym, count, file, line, col, name] = row as [
      string,
      string,
      string,
      string,
      string,
      string,
    ];

    const symbolId = unquoteAtom(sym);
    const currentLinks = Number(count.replace(/[^0-9]/g, "")) || 0;
    const requiredLinks = minLinks;
    const fileStr = unquoteAtom(file);
    const nameStr = unquoteAtom(name);
    const lineNum = Number(line.replace(/[^0-9]/g, "")) || 0;
    const colNum = Number(col.replace(/[^0-9]/g, "")) || 0;

    violations.push({
      symbolId,
      name: nameStr,
      file: fileStr,
      line: lineNum,
      column: colNum,
      currentLinks,
      requiredLinks,
    });
  }

  return violations;
}

/**
 * Full-check `symbol-coverage` for the staged change set: the changed source
 * symbols in the consulted overlay plus `extraSymbolIds` (symbols whose staged
 * manifest entry changed). The Prolog rule is the one `kibi check` runs, so a
 * commit cannot pass the staged gate with coverage the full check rejects.
 */
export async function validateStagedSymbolCoverage(options: {
  prolog: PrologProcess;
  extraSymbolIds?: readonly string[];
}): Promise<ParsedViolation[]> {
  const extra = `[${[...new Set(options.extraSymbolIds ?? [])]
    .sort()
    .map(toPrologAtom)
    .join(",")}]`;
  const checksPl = escapeAtom(
    path.join(path.dirname(resolveKbPlPath()), "checks.pl"),
  );
  const goal = `(use_module('${checksPl}'), call(checks:check_changed_symbol_coverage(${extra}, Violations)))`;
  const res = await options.prolog.query(goal);
  if (!res.success) {
    throw new Error(
      `Prolog symbol-coverage query failed: ${res.error || "unknown error"}`,
    );
  }
  const rows = res.bindings.Violations;
  return rows === undefined ? [] : parseViolationRows(rows);
}

/** Text lines for staged symbol-coverage violations, in `kibi check` form. */
export function formatCoverageViolations(
  violations: readonly ParsedViolation[],
): string {
  if (violations.length === 0) return "";
  const lines = [
    `Found ${violations.length} symbol-coverage violation(s) in staged symbols (the same rule kibi check runs):`,
  ];
  for (const violation of violations) {
    lines.push("", `[${violation.rule}] ${violation.entityId}`);
    if (violation.source) lines.push(`  Source: ${violation.source}`);
    lines.push(`  ${violation.description}`);
    if (violation.suggestion)
      lines.push(`  Suggestion: ${violation.suggestion}`);
  }
  return lines.join("\n");
}

export function formatViolations(violations: Violation[]): string {
  if (violations.length === 0) return "";
  const total = violations.length;
  const [first] = violations as [Violation, ...Violation[]];
  const minLinks = first.requiredLinks ?? 0;
  const lines: string[] = [
    `Traceability failed: ${total} changed symbol(s) have fewer than ${minLinks} requirement link(s) (minLinks=${minLinks}):`,
  ];
  for (const v of violations) {
    lines.push(
      `  ${v.file}:${v.line}  ${v.name}  (${v.currentLinks} of ${v.requiredLinks} link(s))`,
    );
  }
  lines.push(
    "To link a symbol, give it an owning requirement, stage the change and re-run kibi check --staged:",
    `  - Add a .kb/symbols.yaml entry with kb_upsert (CLI: kibi upsert --input -): title as listed above (e.g. ${JSON.stringify(first.name)}), sourceFile, and the relationship implements -> REQ-<area>-<behavior> for production code or executable_for -> TEST-<area>-<behavior> for executable test code. Stage .kb/symbols.yaml with the code.`,
    "  If no requirement fits, find one with kb_search or create it with kb_upsert (type req) first; production symbols also need covered_by -> TEST-<area>-<behavior>.",
    "  A code comment is never a link: an `implements` comment above the declaration does not count (kibi migrate lists the ones left in the repository).",
  );
  return lines.join("\n");
}

// Test helpers for edge-case coverage
export const __test__ = {
  unquoteAtom,
  parsePrologListOfLists,
};
