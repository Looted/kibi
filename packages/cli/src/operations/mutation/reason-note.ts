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

import { parseAtomList, toPrologAtom } from "../../prolog/codec.js";
import { readEntityOrigin } from "../../public/entity-origin.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import {
  SUPERSEDED_ADR_STATUSES,
  adrExcerpt,
  requirementReason,
} from "../../search-answer.js";
import { loadMarkdownBody } from "../../search-ranking.js";

type Entity = Readonly<Record<string, unknown>>;

/**
 * Origins whose author could have said why, as requirement-rationale-missing
 * reads them: an imported, inferred or legacy requirement's reason lives with
 * its original.
 */
const REASON_ORIGIN_KINDS = new Set(["human", "agent"]);

/** A fact write names at most this many grounded requirements in notes. */
export const REASON_NOTE_REQUIREMENT_LIMIT = 5;

/** The fields of a fact that state its value. */
function groundedValue(fact: Entity): string {
  return JSON.stringify(
    Object.keys(fact)
      .filter((key) => key === "operator" || key.startsWith("value"))
      .sort()
      .map((key) => [key, fact[key]]),
  );
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The statement a requirement's meaning is read from. */
function statement(req: Entity): string {
  return text(req.semantic_text) || text(req.title);
}

/** Whether a person or agent wrote the requirement, so could have said why. */
function reasonOrigin(req: Entity): boolean {
  const origin = readEntityOrigin(req.origin);
  return origin !== null && REASON_ORIGIN_KINDS.has(origin.kind);
}

export type ReasonNoteInput = Readonly<{
  type: string;
  id: string;
  /** The entity before the write; undefined when the write created it. */
  before: Entity | undefined;
  /** The entity as written. */
  after: Entity;
  prolog: Pick<PrologPort, "query">;
  workspaceRoot: string;
}>;

/**
 * kb_upsert notes on a requirement's reason. A write that creates a human-
 * or agent-authored requirement, changes its statement, or changes a value it
 * is grounded on, while the requirement records no reason, says so and asks
 * for the person's own words. A write that changes a grounded value of a
 * requirement that does record a reason quotes it and asks whether it still
 * holds. The reason is read as the search answer reads it.
 */
export async function reasonNotes(input: ReasonNoteInput): Promise<string[]> {
  try {
    return await notesFor(input);
  } catch {
    // The notes advise; a failed read never fails the write it follows.
    return [];
  }
}

async function notesFor(input: ReasonNoteInput): Promise<string[]> {
  if (input.type === "req") {
    const changed =
      input.before === undefined ||
      statement(input.before) !== statement(input.after);
    if (!changed || !reasonOrigin(input.after)) return [];
    const reason = await reasonOf(input.after, input.id, input);
    return reason === undefined ? [missingReasonNote(input.id)] : [];
  }
  if (input.type !== "fact" || input.before === undefined) return [];
  if (groundedValue(input.before) === groundedValue(input.after)) return [];
  const notes: string[] = [];
  const reqIds = await groundedRequirements(input.id, input.prolog);
  for (const reqId of reqIds.slice(0, REASON_NOTE_REQUIREMENT_LIMIT)) {
    const req = (
      await loadEntities(input.prolog, { id: reqId, type: "req" })
    )[0];
    if (req === undefined || !reasonOrigin(req)) continue;
    const reason = await reasonOf(req, reqId, input);
    notes.push(
      reason === undefined
        ? missingReasonNote(reqId, input.id)
        : staleReasonNote(reqId, input.id, reason),
    );
  }
  return notes;
}

function missingReasonNote(reqId: string, factId?: string): string {
  const change =
    factId === undefined
      ? `${reqId} records no reason`
      : `${factId} changed a value ${reqId} is grounded on, and ${reqId} records no reason`;
  return `${change} (no rationale, no Why, Rationale or Context section, no linked ADR). If the person said why in this conversation, record it now as rationale on ${reqId} in their words; if they did not, leave it empty and do not write a reason of your own.`;
}

function staleReasonNote(
  reqId: string,
  factId: string,
  reason: string,
): string {
  return `${factId} changed a value ${reqId} is grounded on; the reason ${reqId} records predates this change: "${reason}". Ask whether that reason still holds; if the person gave a new one, record it as rationale on ${reqId} in their words.`;
}

/** The requirements grounded on a fact, sorted by id. */
async function groundedRequirements(
  factId: string,
  prolog: Pick<PrologPort, "query">,
): Promise<string[]> {
  const fact = toPrologAtom(factId);
  const result = await prolog.query(
    `findall(R, (member(T, [requires_property, constrains]), kb_relationship(T, R, ${fact}), kb_entity(R, req, _)), Rs)`,
  );
  if (!result.success) return [];
  return [...new Set(parseAtomList(String(result.bindings.Rs ?? "[]")))].sort();
}

/** A requirement's recorded reason text, or undefined when it records none. */
async function reasonOf(
  req: Entity,
  reqId: string,
  input: ReasonNoteInput,
): Promise<string | undefined> {
  const source = text(req.source);
  const body = source
    ? await loadMarkdownBody(source, input.workspaceRoot)
    : null;
  const why = requirementReason(
    req,
    body,
    await linkedAdrExcerpts(reqId, input),
  );
  return why.recorded ? why.text : undefined;
}

/** Excerpts of the current ADRs linked with a requirement by any edge. */
async function linkedAdrExcerpts(
  reqId: string,
  input: ReasonNoteInput,
): Promise<(string | undefined)[]> {
  const req = toPrologAtom(reqId);
  const result = await input.prolog.query(
    `findall(A, (kb_entity(A, adr, _), kibi_relationships:relationship_type(Rel), (kb_relationship(Rel, A, ${req}) ; kb_relationship(Rel, ${req}, A))), As)`,
  );
  if (!result.success) return [];
  const excerpts: (string | undefined)[] = [];
  for (const adrId of [
    ...new Set(parseAtomList(String(result.bindings.As ?? "[]"))),
  ].sort()) {
    const adr = (
      await loadEntities(input.prolog, { id: adrId, type: "adr" })
    )[0];
    if (adr === undefined || SUPERSEDED_ADR_STATUSES.has(text(adr.status)))
      continue;
    const source = text(adr.source);
    const body = source
      ? await loadMarkdownBody(source, input.workspaceRoot)
      : null;
    excerpts.push(body ? adrExcerpt(body) : undefined);
  }
  return excerpts;
}
