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
  // implements REQ-009
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
  // implements REQ-009
  const simplePrologAtom = /^[a-z][a-zA-Z0-9_]*$/;
  return simplePrologAtom.test(value) ? value : `'${escapeAtom(value)}'`;
}

/**
 * Escape a string value for use inside a Prolog double-quoted string literal.
 * Escapes: backslash, double-quote, newline, carriage-return, tab.
 * Returns the full quoted literal including surrounding double-quotes.
 */
export function toPrologString(value: string): string {
  // implements REQ-009
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
  // implements REQ-009
  return escapeAtom(value);
}

/**
 * Parse a Prolog list of list rows without decoding or normalizing columns.
 * Malformed outer collections fail closed rather than returning a partial
 * projection.
 */
export function parseListOfLists(listStr: string): string[][] {
  // implements REQ-009
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
  const datatype = datatypePart.trim();

  const decodedLiteral = decodePrologQuotedLiteral(literalValue, '"');
  if (decodedLiteral !== undefined) {
    literalValue = decodedLiteral;
  } else if (literalValue.startsWith('"') && literalValue.endsWith('"')) {
    literalValue = literalValue.substring(1, literalValue.length - 1);
  }

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
    if (listContent === "") {
      return [];
    }
    return splitTopLevelGeneral(listContent, ",").map((item) => item.trim());
  }

  return literalValue;
}

export function fileUriLeaf(value: string): string {
  const lastSlash = value.lastIndexOf("/");
  if (lastSlash !== -1) {
    return value.substring(lastSlash + 1);
  }
  return value;
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
  const propsStr = parts.slice(2).join(",").trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}

export function parseEntityFromBinding(
  // implements REQ-009
  bindingStr: string,
): Record<string, unknown> {
  const cleaned = bindingStr.trim().replace(/^\[/, "").replace(/\]$/, "");
  return entityFromBindingParts(splitTopLevelGeneral(cleaned, ","));
}

export function parseEntityFromList(data: string[]): Record<string, unknown> {
  // implements REQ-009
  if (data.length < 3) {
    return {};
  }

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
  const propsStr = propsPart.trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}

export function parsePropertyList(propsStr: string): Record<string, unknown> {
  // implements REQ-009, REQ-skillopt-logical-evidence-fidelity
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
        key === "semantic_inventory" ||
        key === "proof_receipts" ||
        key === "proof_contract" ||
        key === "proof_bindings") &&
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
  // implements REQ-009
  const value = valueInput.trim();

  // Handle typed literal: ^^("value", type)
  if (value.startsWith("^^(")) {
    const innerStart = value.indexOf("(") + 1;
    let depth = 1;
    let innerEnd = innerStart;
    for (let i = innerStart; i < value.length; i++) {
      if (value[i] === "(") depth++;
      if (value[i] === ")") {
        depth--;
        if (depth === 0) {
          innerEnd = i;
          break;
        }
      }
    }
    const innerContent = value.substring(innerStart, innerEnd);

    const parts = splitTopLevelGeneral(innerContent, ",");
    if (parts.length >= 2) {
      return typedLiteralFromParts(parts, value);
    }
  }

  // Handle URI
  if (value.startsWith("file:///")) {
    return fileUriLeaf(value);
  }

  // Handle quoted string
  if (value.startsWith('"') && value.endsWith('"')) {
    return (
      decodePrologQuotedLiteral(value, '"') ??
      value.substring(1, value.length - 1)
    );
  }

  // Handle quoted atom
  if (value.startsWith("'") && value.endsWith("'")) {
    return (
      decodePrologQuotedLiteral(value, "'") ??
      value.substring(1, value.length - 1)
    );
  }

  // Handle list
  if (value.startsWith("[") && value.endsWith("]")) {
    const listContent = value.substring(1, value.length - 1);
    if (listContent === "") {
      return [];
    }
    const items = splitTopLevelGeneral(listContent, ",").map((item) => {
      return parsePrologValue(item.trim());
    });
    return items;
  }

  return value;
}

export function splitTopLevelGeneral(str: string, delimiter: string): string[] {
  // implements REQ-009
  return scanTopLevelGeneral(str, delimiter).parts;
}

type PrologQuote = "'" | '"';

type TopLevelScan = {
  readonly parts: string[];
  readonly balanced: boolean;
};

function scanTopLevelGeneral(str: string, delimiter: string): TopLevelScan {
  const results: string[] = [];
  let current = "";
  let quote: PrologQuote | null = null;
  const delimiters: string[] = [];
  let balanced = true;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (quote !== null) {
      current += char;
      if (char === "\\") {
        const escaped = str[i + 1];
        if (escaped !== undefined) {
          current += escaped;
          i++;
        }
      } else if (char === quote) {
        const doubledPrologQuote = quote === "'" && str[i + 1] === "'";
        if (doubledPrologQuote) {
          current += str[i + 1] ?? "";
          i++;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }

    if (char === "[" || char === "(" || char === "{") {
      delimiters.push(char);
      current += char;
      continue;
    }

    if (char === "]" || char === ")" || char === "}") {
      const expectedOpening = char === "]" ? "[" : char === ")" ? "(" : "{";
      if (delimiters.at(-1) !== expectedOpening) {
        balanced = false;
      } else {
        delimiters.pop();
      }
      current += char;
      continue;
    }

    if (
      delimiters.length === 0 &&
      delimiter.length > 0 &&
      str.startsWith(delimiter, i)
    ) {
      if (current) {
        results.push(current);
        current = "";
      }
      i += delimiter.length - 1;
    } else {
      current += char;
    }
  }

  if (current) {
    results.push(current);
  }

  return {
    parts: results,
    balanced: balanced && quote === null && delimiters.length === 0,
  };
}

export function splitTopLevel(str: string, delimiter: string): string[] {
  // implements REQ-009
  return splitTopLevelGeneral(str, delimiter);
}

function stripOuterQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return decodePrologQuotedLiteral(value, "'") ?? value.slice(1, -1);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return decodePrologQuotedLiteral(value, '"') ?? value.slice(1, -1);
  }
  return value;
}

export function normalizeEntityId(value: string): string {
  if (value.startsWith("kb:entity/")) {
    return value.slice("kb:entity/".length);
  }
  if (!value.startsWith("file:///")) {
    return value;
  }

  const idx = value.lastIndexOf("/");
  return idx === -1 ? value : value.slice(idx + 1);
}

export function parseAtomList(raw: string): string[] {
  // implements REQ-009
  const trimmed = raw.trim();
  if (trimmed === "[]" || trimmed.length === 0) {
    return [];
  }

  const content = unwrapList(trimmed);
  if (content.length === 0) {
    return [];
  }

  return splitTopLevelGeneral(content, ",")
    .map((token) => stripQuotes(token.trim()))
    .filter((token) => token.length > 0);
}

export function parsePairList(raw: string): Array<[string, string]> {
  // implements REQ-009
  const rows = parseListRows(raw);
  const pairs: Array<[string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevelGeneral(row, ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 2) {
      const first = parts[0];
      const second = parts[1];
      if (first !== undefined && second !== undefined) {
        pairs.push([first, second]);
      }
    }
  }

  return pairs;
}

export function parseTriples(raw: string): Array<[string, string, string]> {
  // implements REQ-009
  const rows = parseListRows(raw);
  const triples: Array<[string, string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevelGeneral(row, ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 3) {
      const first = parts[0];
      const second = parts[1];
      const third = parts[2];
      if (first !== undefined && second !== undefined && third !== undefined) {
        triples.push([first, second, third]);
      }
    }
  }

  return triples;
}

function parseListRows(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "[]" || trimmed.length === 0) {
    return [];
  }

  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }

  const content = unwrapList(trimmed);
  if (content.length === 0) {
    return [];
  }

  const scanned = scanTopLevelGeneral(content, ",");
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
    rows.push(row.slice(1, -1).trim());
  }
  return rows;
}

function unwrapList(value: string): string {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).trim();
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
  // implements REQ-006
  const trimmed = raw.trim();
  if (trimmed === "[]" || trimmed.length === 0) {
    return [];
  }

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

    const rulePart = parts[0];
    const entityIdPart = parts[1];
    const descriptionPart = parts[2];
    const suggestionPart = parts[3];
    if (
      rulePart === undefined ||
      entityIdPart === undefined ||
      descriptionPart === undefined ||
      suggestionPart === undefined
    ) {
      continue;
    }

    const rule = stripQuotes(rulePart.trim());
    const entityId = stripQuotes(entityIdPart.trim());
    const description = stripQuotes(descriptionPart.trim());
    const suggestion = stripQuotes(suggestionPart.trim());
    const source =
      parts.length >= 5
        ? stripQuotes(parts[4]?.trim() ?? "") || undefined
        : undefined;

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
  if (value.startsWith("'") && value.endsWith("'")) {
    return decodePrologQuotedLiteral(value, "'") ?? value.slice(1, -1);
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return decodePrologQuotedLiteral(value, '"') ?? value.slice(1, -1);
  }

  return value;
}

/** Decode one Prolog quoted literal without decoding an escaped value twice. */
function decodePrologQuotedLiteral(
  value: string,
  quote: PrologQuote,
): string | undefined {
  if (!value.startsWith(quote) || !value.endsWith(quote) || value.length < 2) {
    return undefined;
  }

  const content = value.slice(1, -1);
  let decoded = "";
  for (let index = 0; index < content.length; index++) {
    const char = content[index];
    if (char === undefined) continue;

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

    const escaped = content[index + 1];
    if (escaped === undefined) return undefined;
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
        if (!/^[0-9A-Fa-f]{4}$/.test(code)) return undefined;
        decoded += String.fromCodePoint(Number.parseInt(code, 16));
        index += 4;
        break;
      }
      case "U": {
        const code = content.slice(index + 1, index + 9);
        if (!/^[0-9A-Fa-f]{8}$/.test(code)) return undefined;
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
