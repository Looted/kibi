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
  // implements REQ-009
  return value.replace(/'/g, "''");
}

/**
 * Convert a string to a Prolog atom, quoting if necessary.
 * Simple atoms (lowercase start, alphanumeric + underscore) pass through.
 */
export function toPrologAtom(value: string): string {
  // implements REQ-009
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
  // implements REQ-009
  return value.replace(/'/g, "''");
}

export function parseListOfLists(listStr: string): string[][] {
  // implements REQ-009
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

export function parseEntityFromBinding(
  // implements REQ-009
  bindingStr: string,
): Record<string, unknown> {
  const cleaned = bindingStr.trim().replace(/^\[/, "").replace(/\]$/, "");
  const parts = splitTopLevelGeneral(cleaned, ",");

  if (parts.length < 3) {
    return {};
  }

  const idPart = parts[0];
  const typePart = parts[1];
  if (idPart === undefined || typePart === undefined) {
    return {};
  }

  const id = idPart.trim();
  const type = typePart.trim();
  const propsStr = parts.slice(2).join(",").trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
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
        key === "proof_contract") &&
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
      const literalPart = parts[0];
      const datatypePart = parts[1];
      if (literalPart === undefined || datatypePart === undefined) {
        return value;
      }

      let literalValue = literalPart.trim();
      const datatype = datatypePart.trim();

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
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value.substring(1, value.length - 1);
    }
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

export function splitTopLevel(str: string, delimiter: string): string[] {
  // implements REQ-009
  return splitTopLevelGeneral(str, delimiter);
}

function stripOuterQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeEntityId(value: string): string {
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

    const rule = rulePart.trim().replace(/^'|'$/g, "");
    const entityId = entityIdPart.trim().replace(/^'|'$/g, "");
    const description = descriptionPart.trim().replace(/^"|"$/g, "");
    const suggestion = suggestionPart.trim().replace(/^"|"$/g, "");
    const source =
      parts.length >= 5
        ? parts[4]?.trim().replace(/^'|'$/g, "") || undefined
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
    return value.slice(1, -1);
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value;
}
