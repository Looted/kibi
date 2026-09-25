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

/** Copied from CLI semantic-advisor shared helpers — do not import from kibi-cli. */

// implements REQ-capability-plugin-builtin-parity-v1
export function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// implements REQ-capability-plugin-builtin-parity-v1
export function normalizePredicateToken(value: string): string {
  return value
    .trim()
    .replace(/\b(?:a|an|the)\b\s*/gi, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// implements REQ-capability-plugin-builtin-parity-v1
export function singularize(value: string): string {
  if (["status", "results"].includes(value)) return value;
  return value.endsWith("s") && value.length > 3 ? value.slice(0, -1) : value;
}

// implements REQ-capability-plugin-builtin-parity-v1
export function normalizeSubjectKey(value: string): string {
  return normalizeKey(value).split("_").map(singularize).join(".");
}

// implements REQ-capability-plugin-builtin-parity-v1
export function commaList(
  value: string,
  separator: RegExp = /,|\band\b/i,
): string {
  return value
    .split(separator)
    .map((part) => normalizeKey(part.trim()))
    .filter(Boolean)
    .join(",");
}
