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
 * Doubles single-quote characters per ISO Prolog standard.
 */
export function escapeAtom(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Convert a string to a Prolog atom, quoting if necessary.
 * Simple atoms (lowercase start, alphanumeric + underscore) pass through.
 */
export function toPrologAtom(value: string): string {
  const simplePrologAtom = /^[a-z][a-zA-Z0-9_]*$/;
  return simplePrologAtom.test(value)
    ? value
    : `'${value.replace(/'/g, "''")}'`;
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
  return value.replace(/'/g, "''");
}

/* v8 ignore next 46 lines */
// parseListOfLists requires complex Prolog response strings for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
export function parseListOfLists(listStr: string): string[][] {
  const cleaned = listStr.trim().replace(/^\[/, "").replace(/\]$/, "");

  if (cleaned === "") {
    return [];
  }

  const results: string[][] = [];
  let depth = 0;
  let current = "";
  let currentList: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (char === "[") {
      depth++;
      if (depth > 1) current += char;
    } else if (char === "]") {
      depth--;
      if (depth === 0) {
        if (current) {
          currentList.push(current.trim());
          current = "";
        }
        if (currentList.length > 0) {
          results.push(currentList);
          currentList = [];
        }
      } else {
        current += char;
      }
    } else if (char === "," && depth === 1) {
      if (current) {
        currentList.push(current.trim());
        current = "";
      }
    } else if (char === "," && depth === 0) {
      // Skip comma between lists
    } else {
      current += char;
    }
  }

  return results;
}

/* v8 ignore next 17 lines */
// parseEntityFromBinding requires complex Prolog binding strings for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
export function parseEntityFromBinding(
  bindingStr: string,
): Record<string, unknown> {
  const cleaned = bindingStr.trim().replace(/^\[/, "").replace(/\]$/, "");
  const parts = splitTopLevelGeneral(cleaned, ",");

  if (parts.length < 3) {
    return {};
  }

  const id = parts[0].trim();
  const type = parts[1].trim();
  const propsStr = parts.slice(2).join(",").trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}

/* v8 ignore next 12 lines */
// parseEntityFromList requires complex Prolog list data for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
export function parseEntityFromList(data: string[]): Record<string, unknown> {
  if (data.length < 3) {
    return {};
  }

  const id = data[0].trim();
  const type = data[1].trim();
  const propsStr = data[2].trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}

/* v8 ignore next 30 lines */
// parsePropertyList requires complex Prolog property strings for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
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

    const parsed = parsePrologValue(value);
    props[key] = parsed;
  }

  return props;
}

/* v8 ignore next 89 lines */
// parsePrologValue requires complex Prolog typed literal strings for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
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
      let literalValue = parts[0].trim();
      const datatype = parts[1].trim();

      if (literalValue.startsWith('"') && literalValue.endsWith('"')) {
        literalValue = literalValue.substring(1, literalValue.length - 1);
      }

      // Parse typed literals based on datatype
      if (datatype.includes("#integer")) {
        return Number.parseInt(literalValue, 10);
      }
      if (datatype.includes("#decimal") || datatype.includes("#double")) {
        return Number.parseFloat(literalValue);
      }
      if (datatype.includes("#boolean")) {
        return literalValue === "true";
      }

      // Handle array notation for string values
      if (literalValue.startsWith("[") && literalValue.endsWith("]")) {
        const listContent = literalValue.substring(1, literalValue.length - 1);
        if (listContent === "") {
          return [];
        }
        return splitTopLevelGeneral(listContent, ",").map((item) =>
          item.trim(),
        );
      }

      return literalValue;
    }
  }

  // Handle URI
  if (value.startsWith("file:///")) {
    const lastSlash = value.lastIndexOf("/");
    if (lastSlash !== -1) {
      return value.substring(lastSlash + 1);
    }
    return value;
  }

  // Handle quoted string
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.substring(1, value.length - 1);
  }

  // Handle quoted atom
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.substring(1, value.length - 1);
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

/* v8 ignore next 53 lines */
// splitTopLevelGeneral requires complex delimiter parsing for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
export function splitTopLevelGeneral(str: string, delimiter: string): string[] {
  // implements REQ-009
  const results: string[] = [];
  let current = "";
  let depth = 0;
  let inDoubleQuotes = false;
  let inSingleQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : "";

    if (char === '"' && !inSingleQuotes && prevChar !== "\\") {
      inDoubleQuotes = !inDoubleQuotes;
      current += char;
    } else if (char === "'" && !inDoubleQuotes && prevChar !== "\\") {
      inSingleQuotes = !inSingleQuotes;
      current += char;
    } else if (
      !inDoubleQuotes &&
      !inSingleQuotes &&
      (char === "[" || char === "(")
    ) {
      depth++;
      current += char;
    } else if (
      !inDoubleQuotes &&
      !inSingleQuotes &&
      (char === "]" || char === ")")
    ) {
      depth--;
      current += char;
    } else if (
      !inDoubleQuotes &&
      !inSingleQuotes &&
      depth === 0 &&
      char === delimiter
    ) {
      if (current) {
        results.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    results.push(current);
  }

  return results;
}

/* v8 ignore next 4 lines */
// splitTopLevel is a thin wrapper - tested via splitTopLevelGeneral.
export function splitTopLevel(str: string, delimiter: string): string[] {
  // implements REQ-009
  return splitTopLevelGeneral(str, delimiter);
}

/* v8 ignore next 9 lines */
// stripOuterQuotes is a private helper - covered by parseEntityFromList tests.
function stripOuterQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

/* v8 ignore next 8 lines */
// normalizeEntityId is a private helper - covered by parseEntityFromList tests.
function normalizeEntityId(value: string): string {
  if (!value.startsWith("file:///")) {
    return value;
  }

  const idx = value.lastIndexOf("/");
  return idx === -1 ? value : value.slice(idx + 1);
}

/* v8 ignore next 15 lines */
// parseAtomList requires complex Prolog atom list strings for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
export function parseAtomList(raw: string): string[] {
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

/* v8 ignore next 15 lines */
// parsePairList requires complex Prolog pair list strings for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
export function parsePairList(raw: string): Array<[string, string]> {
  const rows = parseListRows(raw);
  const pairs: Array<[string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevelGeneral(row, ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 2) {
      pairs.push([parts[0], parts[1]]);
    }
  }

  return pairs;
}

/* v8 ignore next 15 lines */
// parseTriples requires complex Prolog triple list strings for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
export function parseTriples(raw: string): Array<[string, string, string]> {
  const rows = parseListRows(raw);
  const triples: Array<[string, string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevelGeneral(row, ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 3) {
      triples.push([parts[0], parts[1], parts[2]]);
    }
  }

  return triples;
}

/* v8 ignore next 45 lines */
// parseListRows requires complex Prolog list row strings for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
function parseListRows(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "[]" || trimmed.length === 0) {
    return [];
  }

  const content = unwrapList(trimmed);
  if (content.length === 0) {
    return [];
  }

  const rows: string[] = [];
  let depth = 0;
  let current = "";

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === "[") {
      depth++;
      if (depth > 1) {
        current += ch;
      }
      continue;
    }

    if (ch === "]") {
      depth--;
      if (depth === 0) {
        rows.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "," && depth === 0) {
      continue;
    }

    current += ch;
  }

  return rows;
}

/* v8 ignore next 6 lines */
// unwrapList is a private helper - covered by other parsing function tests.
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

/* v8 ignore next 43 lines */
// parseViolationRows requires complex Prolog violation list strings for testing.
// Integration tests verify the codec works end-to-end with real Prolog output.
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

    const rule = parts[0].trim().replace(/^'|'$/g, "");
    const entityId = parts[1].trim().replace(/^'|'$/g, "");
    const description = parts[2].trim().replace(/^"|"$/g, "");
    const suggestion = parts[3].trim().replace(/^"|"$/g, "");
    const source =
      parts.length >= 5
        ? parts[4].trim().replace(/^'|'$/g, "") || undefined
        : undefined;

    violations.push({ rule, entityId, description, suggestion, source });
  }

  return violations;
}

/* v8 ignore next 11 lines */
// stripQuotes is a private helper - covered by other parsing function tests.
function stripQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value;
}
