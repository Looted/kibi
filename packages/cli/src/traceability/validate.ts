import type { PrologProcess } from "../prolog.js";

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

function unquoteAtom(v: string): string {
  // remove surrounding single quotes and unescape doubled quotes
  v = v.trim();
  if (v.startsWith("'") && v.endsWith("'")) {
    v = v.slice(1, -1).replace(/''/g, "'");
  }
  return v;
}

function splitTopLevelComma(s: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'") {
      // handle doubled '' inside atom
      if (inQuote && s[i + 1] === "'") {
        cur += "'";
        i++;
        continue;
      }
      inQuote = !inQuote;
      cur += ch;
      continue;
    }
    if (ch === "," && !inQuote) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur !== "") parts.push(cur.trim());
  return parts;
}

function splitTopLevelLists(value: string): string[] {
  const lists: string[] = [];
  let cur = "";
  let inQuote = false;
  let depth = 0;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];

    if (ch === "'") {
      // handle doubled '' inside atom
      if (inQuote && i + 1 < value.length && value[i + 1] === "'") {
        cur += "'";
        i++;
        continue;
      }
      inQuote = !inQuote;
      cur += ch;
      continue;
    }

    if (!inQuote) {
      if (ch === "[") {
        depth++;
        cur += ch;
        continue;
      }
      if (ch === "]") {
        depth--;
        cur += ch;
        if (depth === 0) {
          lists.push(cur.trim());
          cur = "";
        }
        continue;
      }
    }

    // Only collect characters that are inside a list; commas and
    // whitespace between top-level lists are ignored.
    if (depth > 0) {
      cur += ch;
    }
  }

  return lists;
}

function parsePrologListOfLists(value: string): string[][] {
  // value expected like: [[a,1,'file.pl',10,0,'name'],[...]] or []
  const out: string[][] = [];
  const trimmed = value.trim();
  if (trimmed === "[]" || trimmed === "") return out;

  // Strip a single outer list wrapper, if present.
  const withoutOuter =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1)
      : trimmed;

  const rowStrings = splitTopLevelLists(withoutOuter);
  for (const row of rowStrings) {
    const rowTrimmed = row.trim();
    if (!rowTrimmed.startsWith("[") || !rowTrimmed.endsWith("]")) {
      continue;
    }
    const inner = rowTrimmed.slice(1, -1);
    const cols = splitTopLevelComma(inner);
    out.push(cols.map((c) => c.trim()));
  }
  return out;
}

export async function validateStagedSymbols(
  options: ValidationOptions,
): Promise<Violation[]> {
  const { minLinks, prolog } = options;

  const goal = `findall([Sym,Count,File,Line,Col,Name], changed_symbol_violation(Sym, ${minLinks}, Count, File, Line, Col, Name), Rows)`;

  const res = await prolog.query(goal);
  if (!res.success) {
    throw new Error(`Prolog query failed: ${res.error || "unknown error"}`);
  }

  const rowsRaw = res.bindings["Rows"] ?? "[]";
  const lists = parsePrologListOfLists(rowsRaw);
  const violations: Violation[] = [];
  for (const row of lists) {
    // row: [Sym,Count,File,Line,Col,Name]
    if (row.length < 6) continue;
    const [sym, count, file, line, col, name] = row;
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

export function formatViolations(violations: Violation[]): string {
  if (!violations || violations.length === 0) return "";
  const total = violations.length;
  const minLinks = violations[0]?.requiredLinks ?? 0;
  const lines: string[] = [];
  lines.push(
    `Traceability failed: ${total}/${total} staged symbols unlinked (minLinks=${minLinks})`,
  );
  for (const v of violations) {
    const loc = `${v.file}:${v.line}`;
    const name = `${v.name}()`;
    // Suggest adding requirement links via `implements:` using requirement IDs (e.g. REQ-001)
    const suggestion =
      "Add one or more requirement links, for example: implements: REQ-001";
    lines.push(`${loc}  ${name}  -> ${suggestion}`);
  }
  return lines.join("\n");
}
