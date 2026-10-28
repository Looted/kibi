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

/** The firmness of an agent-written decision that does not state one. */
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
  return (FIRMNESS_VALUES as readonly unknown[]).includes(value);
}

// implements REQ-kb-decision-firmness
export function carriesFirmness(type: unknown): boolean {
  return (FIRMNESS_TYPES as readonly unknown[]).includes(type);
}

/**
 * The firmness a decision is read with: the authored value, else what its
 * origin implies. A decision an agent wrote (`origin.kind: agent`) without a
 * firmness is a delegated choice, `default`. Any other decision without one
 * (written by a person, imported from their documents, or carried over from
 * before origins were recorded) is theirs, so it reads as `firm`: an agent
 * asks before changing it. Undefined for types that carry no firmness.
 */
// implements REQ-kb-decision-firmness, REQ-kb-decision-firmness-from-origin
export function effectiveFirmness(
  type: unknown,
  value: unknown,
  origin?: unknown,
): Firmness | undefined {
  if (!carriesFirmness(type)) return undefined;
  if (isFirmness(value)) return value;
  return originKind(origin) === "agent" ? DEFAULT_FIRMNESS : "firm";
}

/**
 * Whether a decision's firmness comes from its origin rather than an authored
 * `firmness` value. Rules that judge the author's own marking (a firm decision
 * must cite the person's words) apply only to explicit values.
 */
// implements REQ-kb-decision-firmness-from-origin
export function firmnessIsImplicit(type: unknown, value: unknown): boolean {
  return carriesFirmness(type) && !isFirmness(value);
}

/** The `kind` of an origin record, or undefined when there is none. */
// implements REQ-kb-decision-firmness-from-origin
export function originKind(origin: unknown): string | undefined {
  if (origin === null || typeof origin !== "object") return undefined;
  const kind = (origin as { kind?: unknown }).kind;
  return typeof kind === "string" ? kind : undefined;
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
  return text.split(/\s/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/**
 * Words of prose under the body's "Why this changed" heading (nested
 * headings included), or 0 when the body has no such section.
 */
// implements REQ-kb-decision-firmness
export function whyThisChangedWords(body: string): number {
  // The open section's heading level, 0 outside one (and for the preamble,
  // whose empty heading never matches).
  let level = 0;
  let words = 0;
  for (const section of parseBodySections(body)) {
    if (section.level <= level) level = 0;
    if (
      level === 0 &&
      WHY_THIS_CHANGED.test(section.heading.replace(/^[*_`\s]+/, ""))
    ) {
      level = section.level;
    }
    if (level > 0) words += wordCount(section.text);
  }
  return words;
}
