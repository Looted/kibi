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

/**
 * Decision firmness: how firmly a requirement or ADR was decided, which tells
 * a later agent whether it may supersede the decision on evidence or must ask
 * a human first. This module is the one place that knows the values, the
 * default and what a supersede must explain, so extraction, checks, search,
 * query and migration agree.
 */

import { parseBodySections } from "./entity-body-context.js";

/** Firmness values, firmest first. */
// implements REQ-kb-decision-firmness
export const FIRMNESS_VALUES = ["firm", "default", "exploratory"] as const;

// implements REQ-kb-decision-firmness
export type Firmness = (typeof FIRMNESS_VALUES)[number];

/** The firmness of a decision that does not state one. */
// implements REQ-kb-decision-firmness
export const DEFAULT_FIRMNESS: Firmness = "default";

/** Entity types that carry firmness. */
// implements REQ-kb-decision-firmness
export const FIRMNESS_TYPES = ["req", "adr"] as const;

/** A supersede must explain itself under a heading starting with this. */
// implements REQ-kb-decision-firmness
export const WHY_THIS_CHANGED_HEADING = "Why this changed";

/** The explanation needs at least this many words of prose. */
// implements REQ-kb-decision-firmness
export const MIN_WHY_CHANGED_WORDS = 12;

const WHY_THIS_CHANGED = /^why\s+this\s+changed\b/i;

/**
 * How the manifest records one acknowledged supersede edge. Edges, not ids,
 * are acknowledged, so a supersede added later to the same entity still has
 * to explain itself.
 */
// implements REQ-kb-decision-firmness
export function supersedeAcknowledgement(from: string, to: string): string {
  return `${from} -> ${to}`;
}

// implements REQ-kb-decision-firmness
export function isFirmness(value: unknown): value is Firmness {
  return (
    typeof value === "string" &&
    (FIRMNESS_VALUES as readonly string[]).includes(value)
  );
}

// implements REQ-kb-decision-firmness
export function carriesFirmness(type: unknown): boolean {
  return (
    typeof type === "string" &&
    (FIRMNESS_TYPES as readonly string[]).includes(type)
  );
}

/**
 * The firmness a decision is read with: the authored value, else `default`.
 * Undefined for types that carry no firmness.
 */
// implements REQ-kb-decision-firmness
export function effectiveFirmness(
  type: unknown,
  value: unknown,
): Firmness | undefined {
  if (!carriesFirmness(type)) return undefined;
  return isFirmness(value) ? value : DEFAULT_FIRMNESS;
}

/**
 * The reference that makes a firm decision traceable to a human's words:
 * `origin.ref`, or `approval_ref` on a requirement.
 */
// implements REQ-kb-decision-firmness
export function firmnessRef(entity: {
  type?: unknown;
  origin?: unknown;
  approval_ref?: unknown;
}): string | undefined {
  const origin = entity.origin;
  if (origin !== null && typeof origin === "object") {
    const ref = (origin as { ref?: unknown }).ref;
    if (typeof ref === "string" && ref.trim() !== "") return ref.trim();
  }
  if (
    entity.type === "req" &&
    typeof entity.approval_ref === "string" &&
    entity.approval_ref.trim() !== ""
  ) {
    return entity.approval_ref.trim();
  }
  return undefined;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/**
 * Words of prose under the body's "Why this changed" heading (nested
 * headings included), or 0 when the body has no such section.
 */
// implements REQ-kb-decision-firmness
export function whyThisChangedWords(body: string): number {
  const sections = parseBodySections(body);
  let level: number | null = null;
  let words = 0;
  for (const section of sections) {
    if (level !== null && section.level > 0 && section.level <= level) {
      level = null;
    }
    if (
      level === null &&
      section.level > 0 &&
      WHY_THIS_CHANGED.test(section.heading.replace(/^[*_`\s]+/, ""))
    ) {
      level = section.level;
    }
    if (level !== null) words += wordCount(section.text);
  }
  return words;
}
