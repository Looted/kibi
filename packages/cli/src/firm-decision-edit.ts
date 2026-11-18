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

import { effectiveFirmness, firmnessRef } from "./decision-firmness.js";
import { requirementSemanticText } from "./extractors/markdown.js";
import { markdownSections, requirementReason } from "./search-answer.js";

/** A requirement or ADR as authored: front matter and Markdown body. */
export type DecisionDocument = Readonly<{
  type: string;
  data: Readonly<Record<string, unknown>>;
  body: string;
}>;

/** The parts of a decision's claim an in-place edit may change. */
export type DecisionClaimField =
  | "title"
  | "statement"
  | "reason"
  | "source"
  | "body"
  | "firmness";

function normalized(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * What a requirement states: its authored `semantic_text`, else the
 * statement its body derives. Context sections are not part of it.
 */
function requirementStatement(document: DecisionDocument): string {
  const authored = normalized(document.data.semantic_text);
  return authored !== ""
    ? authored
    : normalized(requirementSemanticText(document.body));
}

/**
 * The reason readers quote for a requirement: its `rationale` field, else
 * its Why, Rationale or Context section, else its "Why this changed"
 * section, as kb_search and the hooks read it; "" when none is recorded
 * ("Reason not stated" records none).
 */
function quotedReason(document: DecisionDocument): string {
  const reason = requirementReason(
    { rationale: document.data.rationale },
    document.body,
    [],
  );
  return reason.recorded ? normalized(reason.text) : "";
}

/** The requirement's Source section: the person's words it was recorded from. */
function sourceSection(document: DecisionDocument): string {
  return normalized(
    (markdownSections(document.body).sections.get("source") ?? []).join(" "),
  );
}

/**
 * The claim fields that differ between two versions of one decision. A
 * requirement's claim is its title, its stated meaning, the statement its
 * body derives and its recorded reason (other context may change freely);
 * an ADR's claim is its
 * title and whole body. Lowering a firm decision's firmness changes it too.
 */
export function decisionClaimChanges(
  before: DecisionDocument,
  after: DecisionDocument,
): DecisionClaimField[] {
  const changed: DecisionClaimField[] = [];
  if (normalized(before.data.title) !== normalized(after.data.title))
    changed.push("title");
  if (before.type === "req") {
    if (
      requirementStatement(before) !== requirementStatement(after) ||
      normalized(requirementSemanticText(before.body)) !==
        normalized(requirementSemanticText(after.body))
    )
      changed.push("statement");
    // The recorded reason is quoted as the person's, wherever it is kept
    // (the field or a body section), so rewriting it changes the decision
    // too; giving a reason where none was recorded does not.
    const reason = quotedReason(before);
    if (reason !== "" && reason !== quotedReason(after)) changed.push("reason");
    // The Source section quotes the person's words.
    const source = sourceSection(before);
    if (source !== "" && source !== sourceSection(after))
      changed.push("source");
  } else if (normalized(before.body) !== normalized(after.body)) {
    changed.push("body");
  }
  if (
    effectiveFirmness(before.type, before.data.firmness, before.data.origin) ===
      "firm" &&
    effectiveFirmness(after.type, after.data.firmness, after.data.origin) !==
      "firm"
  )
    changed.push("firmness");
  return changed;
}

/**
 * Whether `after` cites human words `before` did not: the reference a person
 * gave for this change. Kibi checks that a new reference is present, not that
 * it is genuine.
 */
export function citesNewHumanWords(
  before: DecisionDocument,
  after: DecisionDocument,
): boolean {
  // origin.ref and a requirement's approval_ref are each a place for the
  // person's words; a new one in either releases the edit.
  const refs = (document: DecisionDocument) => [
    firmnessRef({ type: document.type, origin: document.data.origin }),
    firmnessRef({
      type: document.type,
      approval_ref: document.data.approval_ref,
    }),
  ];
  const old = refs(before);
  return refs(after).some(
    (ref, index) => ref !== undefined && ref !== old[index],
  );
}

/**
 * The claim fields an edit changes on a firm decision without citing new
 * human words; empty when the edit is allowed. Only a decision that is firm
 * before the edit is guarded.
 */
export function unapprovedFirmEdit(
  before: DecisionDocument,
  after: DecisionDocument,
): DecisionClaimField[] {
  if (
    effectiveFirmness(before.type, before.data.firmness, before.data.origin) !==
    "firm"
  )
    return [];
  const changed = decisionClaimChanges(before, after);
  return citesNewHumanWords(before, after) ? [] : changed;
}

/** What to do instead of editing a firm decision in place. */
export function firmEditGuidance(type: string): string {
  return `Ask the person who stated it. If they agree, either write the change with ${type === "req" ? "origin.ref or approval_ref" : "origin.ref"} pointing at their words, or supersede it with a new firmness: firm decision that cites them; otherwise leave it and propose the change`;
}
