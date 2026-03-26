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
import { splitTopLevel } from "kibi-cli/prolog/codec";

// implements REQ-002
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

// implements REQ-002
export function parsePairList(raw: string): Array<[string, string]> {
  const rows = parseListRows(raw);
  const pairs: Array<[string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevel(row, ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 2) {
      pairs.push([parts[0], parts[1]]);
    }
  }

  return pairs;
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

function stripQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value;
}
