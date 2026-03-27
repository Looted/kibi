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
export function escapeAtom(value) {
  // implements REQ-009
  return value.replace(/'/g, "''");
}
/**
 * Convert a string to a Prolog atom, quoting if necessary.
 * Simple atoms (lowercase start, alphanumeric + underscore) pass through.
 */
export function toPrologAtom(value) {
  // implements REQ-009
  const simplePrologAtom = /^[a-z][a-zA-Z0-9_]*$/;
  return simplePrologAtom.test(value)
    ? value
    : `'${value.replace(/'/g, "''")}'`;
}
/**
 * Escape a string for embedding inside a single-quoted Prolog atom.
 * Alias for escapeAtom for semantic clarity.
 */
export function escapeAtomContent(value) {
  // implements REQ-009
  return value.replace(/'/g, "''");
}
/**
 * Split a string by delimiter at the top level (not inside brackets or quotes).
 * This is the general-purpose version that splits at depth 0.
 */
export function splitTopLevel(str, delimiter) {
  // implements REQ-009
  const results = [];
  let current = "";
  let depth = 0;
  let inDoubleQuotes = false;
  let inSingleQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prev = i > 0 ? str[i - 1] : "";
    if (char === '"' && !inSingleQuotes && prev !== "\\") {
      inDoubleQuotes = !inDoubleQuotes;
      current += char;
      continue;
    }
    if (char === "'" && !inDoubleQuotes && prev !== "\\") {
      inSingleQuotes = !inSingleQuotes;
      current += char;
      continue;
    }
    if (!inSingleQuotes && !inDoubleQuotes && (char === "[" || char === "(")) {
      depth++;
      current += char;
      continue;
    }
    if (!inSingleQuotes && !inDoubleQuotes && (char === "]" || char === ")")) {
      depth--;
      current += char;
      continue;
    }
    if (
      !inSingleQuotes &&
      !inDoubleQuotes &&
      depth === 0 &&
      char === delimiter
    ) {
      if (current.length > 0) {
        results.push(current);
      }
      current = "";
      continue;
    }
    current += char;
  }
  if (current.length > 0) {
    results.push(current);
  }
  return results;
}
/**
 * Parse a Prolog list of lists into a JavaScript array.
 * Input: "[[a,b,c],[d,e,f]]"
 * Output: [["a", "b", "c"], ["d", "e", "f"]]
 */
export function parseListOfLists(listStr) {
  // implements REQ-009
  const cleaned = listStr.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (cleaned === "") {
    return [];
  }
  const results = [];
  let depth = 0;
  let current = "";
  let currentList = [];
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
/**
 * Parse a single entity from Prolog binding format.
 * Input: "[abc123, req, [id=abc123, title=\"Test\", ...]]"
 */
export function parseEntityFromBinding(bindingStr) {
  // implements REQ-009
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
/**
 * Parse entity from array returned by parseListOfLists.
 * Input: ["abc123", "req", "[id=abc123, title=\"Test\", ...]"]
 */
export function parseEntityFromList(data) {
  // implements REQ-009
  if (data.length < 3) {
    return {};
  }
  const id = data[0].trim();
  const type = data[1].trim();
  const propsStr = data[2].trim();
  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}
/**
 * Parse Prolog property list into JavaScript object.
 * Input: "[id=abc123, title=\"Test\"]"
 */
export function parsePropertyList(propsStr) {
  // implements REQ-009
  const props = {};
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
/**
 * Parse a single Prolog value, handling typed literals and URIs.
 */
export function parsePrologValue(valueInput) {
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
/**
 * General-purpose split at top level (not inside brackets or quotes).
 * More robust version used by property parsing.
 */
function splitTopLevelGeneral(str, delimiter) {
  const results = [];
  let current = "";
  let depth = 0;
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : "";
    if (char === '"' && prevChar !== "\\") {
      inQuotes = !inQuotes;
      current += char;
    } else if (!inQuotes && (char === "[" || char === "(")) {
      depth++;
      current += char;
    } else if (!inQuotes && (char === "]" || char === ")")) {
      depth--;
      current += char;
    } else if (!inQuotes && depth === 0 && char === delimiter) {
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
/**
 * Strip outer quotes from a string value.
 */
function stripOuterQuotes(value) {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}
/**
 * Normalize entity ID by extracting filename from file:// URI.
 */
function normalizeEntityId(value) {
  if (!value.startsWith("file:///")) {
    return value;
  }
  const idx = value.lastIndexOf("/");
  return idx === -1 ? value : value.slice(idx + 1);
}
/**
 * Parse an atom list from Prolog response.
 * Input: "[a, b, c]" or atom string
 */
export function parseAtomList(raw) {
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
/**
 * Parse a list of pairs from Prolog response.
 */
export function parsePairList(raw) {
  // implements REQ-009
  const rows = parseListRows(raw);
  const pairs = [];
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
/**
 * Parse a list of triples from Prolog response.
 */
export function parseTriples(raw) {
  // implements REQ-009
  const rows = parseListRows(raw);
  const triples = [];
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
/**
 * Parse list rows from Prolog response.
 */
function parseListRows(raw) {
  const trimmed = raw.trim();
  if (trimmed === "[]" || trimmed.length === 0) {
    return [];
  }
  const content = unwrapList(trimmed);
  if (content.length === 0) {
    return [];
  }
  const rows = [];
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
/**
 * Unwrap outer list brackets.
 */
function unwrapList(value) {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).trim();
  }
  return value;
}
/**
 * Strip quotes from a value (single or double).
 */
function stripQuotes(value) {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}
