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
import { splitTopLevel } from "kibi-runtime";

// implements REQ-002
export function parseAtomList(raw: string): string[] {
  // An empty list ("[]" or blank) splits into one empty token, which the
  // filter drops, so it needs no early return.
  return splitTopLevel(unwrapList(raw.trim()), ",")
    .map((token) => stripQuotes(token.trim()))
    .filter((token) => token.length > 0);
}

// implements REQ-002
export function parsePairList(raw: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const row of listRows(raw)) {
    const parts = splitTopLevel(row, ",").map((part) =>
      stripQuotes(part.trim()),
    );
    if (parts.length >= 2) {
      pairs.push([parts[0] as string, parts[1] as string]);
    }
  }
  return pairs;
}

/**
 * The inner lists of a list of lists. Whitespace around a row is left in
 * place: every part of a row is trimmed when it is split.
 */
function* listRows(raw: string): Generator<string> {
  let depth = 0;
  let current = "";
  for (const ch of unwrapList(raw.trim())) {
    if (ch === "[") {
      depth++;
      if (depth > 1) current += ch;
    } else if (ch === "]") {
      depth--;
      if (depth === 0) {
        yield current;
        current = "";
      } else {
        current += ch;
      }
    } else if (ch !== "," || depth !== 0) {
      current += ch;
    }
  }
}

function unwrapList(value: string): string {
  return value.startsWith("[") && value.endsWith("]")
    ? value.slice(1, -1)
    : value;
}

function stripQuotes(value: string): string {
  for (const quote of ["'", '"']) {
    if (value.startsWith(quote) && value.endsWith(quote)) {
      return value.slice(1, -1);
    }
  }
  return value;
}
