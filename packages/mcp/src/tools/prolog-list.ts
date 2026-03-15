/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

export function parseAtomList(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "[]" || trimmed.length === 0) {
    return [];
  }

  const content = unwrapList(trimmed);
  if (content.length === 0) {
    return [];
  }

  return splitTopLevel(content, ",")
    .map((token) => stripQuotes(token.trim()))
    .filter((token) => token.length > 0);
}

export function parsePairList(raw: string): Array<[string, string]> {
  const rows = parseListRows(raw);
  const pairs: Array<[string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevel(unwrapList(row.trim()), ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 2) {
      pairs.push([parts[0], parts[1]]);
    }
  }

  return pairs;
}

export function parseTriples(raw: string): Array<[string, string, string]> {
  const rows = parseListRows(raw);
  const triples: Array<[string, string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevel(unwrapList(row.trim()), ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 3) {
      triples.push([parts[0], parts[1], parts[2]]);
    }
  }

  return triples;
}

/**
 * Escape single quotes for Prolog atoms.
 * Uses standard Prolog doubling of single quotes.
 */
export function escapeAtom(value: string): string {
  if (!value) return "";
  return value.replace(/'/g, "''");
}

/**
 * Escape double quotes for Prolog strings.
 */
export function escapeString(value: string): string {
  if (!value) return "";
  return value.replace(/"/g, '\\"');
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

  return splitTopLevel(content, ",");
}

function unwrapList(value: string): string {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).trim();
  }
  return value;
}

/**
 * Split a string by delimiter at the top level (not inside brackets, parens or quotes).
 */
export function splitTopLevel(input: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let inDoubleQuotes = false;
  let inSingleQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : "";

    if (ch === '"' && !inSingleQuotes && prev !== "\\") {
      inDoubleQuotes = !inDoubleQuotes;
      current += ch;
      continue;
    }

    if (ch === "'" && !inDoubleQuotes && prev !== "\\") {
      inSingleQuotes = !inSingleQuotes;
      current += ch;
      continue;
    }

    if (!inSingleQuotes && !inDoubleQuotes && (ch === "[" || ch === "(")) {
      depth++;
      current += ch;
      continue;
    }

    if (!inSingleQuotes && !inDoubleQuotes && (ch === "]" || ch === ")")) {
      depth--;
      current += ch;
      continue;
    }

    if (!inSingleQuotes && !inDoubleQuotes && depth === 0 && ch === delimiter) {
      if (current.length > 0) {
        parts.push(current);
      }
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
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
