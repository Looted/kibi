/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * Prolog codec utilities for escaping atoms, parsing responses, and handling
 * Prolog list/property structures.
 */

/**
 * Escape a string for use as a Prolog atom.
 * Escapes backslashes/control characters and doubles single quotes per ISO
 * Prolog syntax.
 */
export function escapeAtom(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\u0007", "\\a")
    .replaceAll("\u0008", "\\b")
    .replaceAll("\u000c", "\\f")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")
    .replaceAll("\u000b", "\\v")
    .replaceAll("'", "''");
}

/**
 * Convert a string to a Prolog atom, quoting if necessary.
 * Simple atoms (lowercase start, alphanumeric + underscore) pass through.
 */
export function toPrologAtom(value: string): string {
  const simplePrologAtom = /^[a-z][a-zA-Z0-9_]*$/;
  return simplePrologAtom.test(value) ? value : `'${escapeAtom(value)}'`;
}

/**
 * Escape a string value for use inside a Prolog double-quoted string literal.
 * Escapes: backslash, double-quote, newline, carriage-return, tab.
 * Returns the full quoted literal including surrounding double-quotes.
 */
export function toPrologString(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

/**
 * Escape a string for embedding inside a single-quoted Prolog atom.
 * Alias for escapeAtom for semantic clarity.
 */
export function escapeAtomContent(value: string): string {
  return escapeAtom(value);
}

/**
 * Parse a Prolog list of list rows without decoding or normalizing columns.
 * Malformed outer collections fail closed rather than returning a partial
 * projection.
 */
export function parseListOfLists(listStr: string): string[][] {
  return parseListRows(listStr).flatMap((row) => {
    const scanned = scanTopLevelGeneral(row, ",");
    if (!scanned.balanced) return [];
    const columns = scanned.parts.map((column) => column.trim());
    return columns.length === 0 || (columns.length === 1 && columns[0] === "")
      ? []
      : [columns];
  });
}

export function firstTwoDefinedParts(
  parts: readonly (string | undefined)[],
): [string, string] | undefined {
  const first = parts[0];
  const second = parts[1];
  if (first === undefined || second === undefined) {
    return undefined;
  }
  return [first, second];
}

export function fallbackWhenPairMissing<T>(
  pair: [string, string] | undefined,
  fallback: T,
): T | null {
  return pair === undefined ? fallback : null;
}

// covered_by TEST-cli-prolog-codec
export function typedLiteralFromParts(
  parts: readonly (string | undefined)[],
  original: string,
): unknown {
  const pair = firstTwoDefinedParts(parts);
  if (!pair) {
    return original;
  }
  const [literalPart, datatypePart] = pair;

  let literalValue = literalPart.trim();
  // Datatypes are matched by substring, so surrounding spaces never matter.
  const datatype = datatypePart;

  literalValue = unquote(literalValue, DOUBLE_QUOTE_ONLY) ?? literalValue;

  if (datatype.includes("#integer")) {
    return Number.parseInt(literalValue, 10);
  }
  if (datatype.includes("#decimal") || datatype.includes("#double")) {
    return Number.parseFloat(literalValue);
  }
  if (datatype.includes("#boolean")) {
    return literalValue === "true";
  }

  if (literalValue.startsWith("[") && literalValue.endsWith("]")) {
    const listContent = literalValue.substring(1, literalValue.length - 1);
    return splitTopLevelGeneral(listContent, ",").map((item) => item.trim());
  }

  return literalValue;
}

export function fileUriLeaf(value: string): string {
  // Without a slash, lastIndexOf is -1 and the whole value is the leaf.
  return value.substring(value.lastIndexOf("/") + 1);
}

export function entityFromBindingParts(
  parts: readonly (string | undefined)[],
): Record<string, unknown> {
  if (parts.length < 3) {
    return {};
  }

  const pair = firstTwoDefinedParts(parts);
  if (!pair) {
    return {};
  }
  const [idPart, typePart] = pair;

  const id = idPart.trim();
  const type = typePart.trim();
  const props = parsePropertyList(parts.slice(2).join(","));
  return { ...props, id: normalizeEntityId(stripQuotes(id)), type };
}

export function parseEntityFromBinding(
  bindingStr: string,
): Record<string, unknown> {
  const cleaned = bindingStr.trim().replace(/^\[/, "").replace(/\]$/, "");
  return entityFromBindingParts(splitTopLevelGeneral(cleaned, ","));
}

export function parseEntityFromList(data: string[]): Record<string, unknown> {
  // A short or sparse row leaves a part undefined.
  const [idPart, typePart, propsPart] = data;
  if (
    idPart === undefined ||
    typePart === undefined ||
    propsPart === undefined
  ) {
    return {};
  }
  const id = idPart.trim();
  const type = typePart.trim();
  const props = parsePropertyList(propsPart);
  return { ...props, id: normalizeEntityId(stripQuotes(id)), type };
}

export function parsePropertyList(propsStr: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  let cleaned = propsStr.trim();
  if (cleaned.startsWith("[")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.endsWith("]")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  const pairs = splitTopLevelGeneral(cleaned, ",");

  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) continue;

    const key = pair.substring(0, eqIndex).trim();
    const value = pair.substring(eqIndex + 1).trim();

    if (key === "..." || value === "..." || value === "...|...") {
      continue;
    }

    let parsed = parsePrologValue(value);
    if (
      (key === "rule_ir" ||
        key === "argument_constants" ||
        key === "argument_aliases" ||
        key === "semantic_inventory" ||
        key === "proof_receipts" ||
        key === "proof_contract" ||
        key === "proof_bindings" ||
        key === "origin") &&
      typeof parsed === "string"
    ) {
      try {
        parsed = JSON.parse(parsed) as unknown;
      } catch {
        // Keep malformed structured fields as strings so the schema validator
        // can report the precise payload problem instead of losing evidence.
      }
    }
    if (!Object.hasOwn(props, key)) {
      props[key] = parsed;
      continue;
    }
    const existing = props[key];
    props[key] = Array.isArray(existing)
      ? [...existing, parsed]
      : [existing, parsed];
  }

  return props;
}

export function parsePrologValue(valueInput: string): unknown {
  const value = valueInput.trim();

  // Handle typed literal: ^^("value", type)
  if (value.startsWith("^^(")) {
    const innerStart = value.indexOf("(") + 1;
    let depth = 1;
    let innerEnd = innerStart;
    for (let i = innerStart; ; i++) {
      const char = value[i];
      if (char === undefined) break;
      if (char === "(") depth++;
      if (char === ")") {
        depth--;
        if (depth === 0) {
          innerEnd = i;
          break;
        }
      }
    }
    const innerContent = value.substring(innerStart, innerEnd);
    // Fewer than two parts leave the value as it is.
    return typedLiteralFromParts(
      splitTopLevelGeneral(innerContent, ","),
      value,
    );
  }

  // Handle URI
  if (value.startsWith("file:///")) {
    return fileUriLeaf(value);
  }

  // Handle quoted string or atom
  const unquoted = unquote(value, PROLOG_QUOTES);
  if (unquoted !== undefined) return unquoted;

  // Handle list
  if (value.startsWith("[") && value.endsWith("]")) {
    const listContent = value.substring(1, value.length - 1);
    return splitTopLevelGeneral(listContent, ",").map(parsePrologValue);
  }

  return value;
}

export function splitTopLevelGeneral(str: string, delimiter: string): string[] {
  return scanTopLevelGeneral(str, delimiter).parts;
}

type PrologQuote = "'" | '"';

type TopLevelScan = {
  readonly parts: string[];
  readonly balanced: boolean;
};

// Parts are sliced from the input rather than built a character at a time:
// candidate pages run to megabytes, and per-character concatenation made
// scanning them most of a search's parsing time.
function scanTopLevelGeneral(str: string, delimiter: string): TopLevelScan {
  const results: string[] = [];
  let partStart = 0;
  let quote: PrologQuote | null = null;
  const delimiters: string[] = [];
  let balanced = true;

  for (let i = 0; ; i++) {
    const char = str[i];
    if (char === undefined) break;

    if (quote !== null) {
      // An escape skips the next character. A doubled quote inside a quoted
      // atom closes and reopens the quote, which scans the same way.
      if (char === "\\") i++;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (char === "[" || char === "(" || char === "{") {
      delimiters.push(char);
      continue;
    }

    if (char === "]" || char === ")" || char === "}") {
      const expectedOpening = char === "]" ? "[" : char === ")" ? "(" : "{";
      if (delimiters.at(-1) !== expectedOpening) {
        balanced = false;
      } else {
        delimiters.pop();
      }
      continue;
    }

    if (
      delimiters.length === 0 &&
      delimiter.length > 0 &&
      str.startsWith(delimiter, i)
    ) {
      if (i > partStart) results.push(str.slice(partStart, i));
      i += delimiter.length - 1;
      partStart = i + 1;
    }
  }

  if (str.length > partStart) results.push(str.slice(partStart));

  return {
    parts: results,
    balanced: balanced && quote === null && delimiters.length === 0,
  };
}

export function splitTopLevel(str: string, delimiter: string): string[] {
  return splitTopLevelGeneral(str, delimiter);
}

export function normalizeEntityId(value: string): string {
  if (value.startsWith("kb:entity/")) {
    return value.slice("kb:entity/".length);
  }
  if (!value.startsWith("file:///")) {
    return value;
  }

  return fileUriLeaf(value);
}

export function parseAtomList(raw: string): string[] {
  // An empty list or input unwraps to nothing, which has no tokens.
  return splitTopLevelGeneral(unwrapList(raw.trim()), ",")
    .map((token) => stripQuotes(token.trim()))
    .filter((token) => token.length > 0);
}

export function parsePairList(raw: string): Array<[string, string]> {
  const rows = parseListRows(raw);
  const pairs: Array<[string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevelGeneral(row, ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 2) pairs.push([parts[0], parts[1]] as [string, string]);
  }

  return pairs;
}

export function parseTriples(raw: string): Array<[string, string, string]> {
  const rows = parseListRows(raw);
  const triples: Array<[string, string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevelGeneral(row, ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 3)
      triples.push([parts[0], parts[1], parts[2]] as [string, string, string]);
  }

  return triples;
}

function parseListRows(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }

  // An empty list scans to no rows.
  const scanned = scanTopLevelGeneral(unwrapList(trimmed), ",");
  if (!scanned.balanced) {
    return [];
  }

  const rows: string[] = [];
  for (const term of scanned.parts) {
    const row = term.trim();
    if (row.length === 0) continue;
    if (!row.startsWith("[") || !row.endsWith("]")) {
      return [];
    }
    rows.push(row.slice(1, -1));
  }
  return rows;
}

function unwrapList(value: string): string {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parsed violation from Prolog check output.
 */
export interface ParsedViolation {
  rule: string;
  entityId: string;
  description: string;
  suggestion: string;
  source?: string;
}

export function parseViolationRows(raw: string): ParsedViolation[] {
  const trimmed = raw.trim();
  const violations: ParsedViolation[] = [];

  // Unwrap outer list
  const content =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1)
      : trimmed;

  // Split at top-level commas to get individual violation(...) terms
  const terms = splitTopLevelGeneral(content, ",");

  for (const term of terms) {
    const t = term.trim();
    if (!t.startsWith("violation(") || !t.endsWith(")")) continue;

    // Strip "violation(" prefix and trailing ")"
    const inner = t.slice("violation(".length, -1);

    // Split the 5 arguments at top-level commas
    const parts = splitTopLevelGeneral(inner, ",");
    if (parts.length < 4) continue;

    const [rulePart, entityIdPart, descriptionPart, suggestionPart] = parts as [
      string,
      string,
      string,
      string,
    ];
    const rule = stripQuotes(rulePart.trim());
    const entityId = stripQuotes(entityIdPart.trim());
    const description = stripQuotes(descriptionPart.trim());
    const suggestion = stripQuotes(suggestionPart.trim());
    const source = stripQuotes(parts[4]?.trim() ?? "") || undefined;

    violations.push({
      rule,
      entityId,
      description,
      suggestion,
      ...(source !== undefined ? { source } : {}),
    });
  }

  return violations;
}

function stripQuotes(value: string): string {
  return unquote(value, PROLOG_QUOTES) ?? value;
}

const PROLOG_QUOTES: readonly PrologQuote[] = ["'", '"'];
const DOUBLE_QUOTE_ONLY: readonly PrologQuote[] = ['"'];

/**
 * The text of a literal wrapped in one of `quotes`, decoded when its escapes
 * are valid and taken verbatim otherwise; undefined when it is not wrapped.
 * A lone quote character reads as an empty literal.
 */
function unquote(
  value: string,
  quotes: readonly PrologQuote[],
): string | undefined {
  const quote = value[0] as PrologQuote;
  if (!quotes.includes(quote) || !value.endsWith(quote)) return undefined;
  const content = value.slice(1, -1);
  return decodeQuotedContent(content, quote) ?? content;
}

/** Decode the content of one Prolog quoted literal without decoding twice. */
function decodeQuotedContent(
  content: string,
  quote: PrologQuote,
): string | undefined {
  let decoded = "";
  for (let index = 0; index < content.length; index++) {
    const char = content[index] as string;

    if (quote === "'" && char === "'") {
      if (content[index + 1] !== "'") return undefined;
      decoded += "'";
      index++;
      continue;
    }
    if (char !== "\\") {
      decoded += char;
      continue;
    }

    // A trailing backslash escapes nothing and falls to the default case.
    const escaped = content[index + 1];
    index++;
    switch (escaped) {
      case "a":
        decoded += "\u0007";
        break;
      case "b":
        decoded += "\b";
        break;
      case "e":
        decoded += "\u001b";
        break;
      case "f":
        decoded += "\f";
        break;
      case "n":
        decoded += "\n";
        break;
      case "r":
        decoded += "\r";
        break;
      case "t":
        decoded += "\t";
        break;
      case "v":
        decoded += "\u000b";
        break;
      case "\\":
        decoded += "\\";
        break;
      case "'":
        decoded += "'";
        break;
      case '"':
        decoded += '"';
        break;
      case "u": {
        const code = content.slice(index + 1, index + 5);
        if (!/[0-9A-Fa-f]{4}/.test(code)) return undefined;
        decoded += String.fromCodePoint(Number.parseInt(code, 16));
        index += 4;
        break;
      }
      case "U": {
        const code = content.slice(index + 1, index + 9);
        if (!/[0-9A-Fa-f]{8}/.test(code)) return undefined;
        const codePoint = Number.parseInt(code, 16);
        if (codePoint > 0x10ffff) return undefined;
        decoded += String.fromCodePoint(codePoint);
        index += 8;
        break;
      }
      case "x": {
        let end = index + 1;
        while (/[0-9A-Fa-f]/.test(content[end] ?? "")) end++;
        if (end === index + 1 || content[end] !== "\\") return undefined;
        const codePoint = Number.parseInt(content.slice(index + 1, end), 16);
        if (codePoint > 0x10ffff) return undefined;
        decoded += String.fromCodePoint(codePoint);
        index = end;
        break;
      }
      default:
        return undefined;
    }
  }
  return decoded;
}
