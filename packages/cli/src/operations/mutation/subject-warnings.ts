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

import { rankSubjectCandidates } from "kibi-plugin-builtin";
import { tokenSetJaccard } from "../../entity-body-context.js";
import { contextProse } from "../../entity-body-context.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import {
  definitionQuote,
  readSubjectDomain,
} from "../../public/operations/subject-domain.js";
import {
  MIN_DEFINITION_WORDS,
  SUBJECT_DUPLICATE_JACCARD,
  assessDefinition,
  isKeyPrefix,
  subjectWords,
} from "../../public/operations/subject-layer.js";
import { readSubjectVocabulary } from "../modeling/vocabulary-alignment.js";

/** Roles whose unmodeled claims must name their subjects (claim-subject-missing). */
const ANCHORED_ROLES = new Set([
  "normative",
  "condition",
  "exception",
  "definition",
]);
const UNMODELED_STATUSES = new Set(["ambiguous", "ontology_gap", "missing"]);

/** At most this many subjects a requirement write reports neighbours for. */
const MAX_SUBJECTS_REPORTED = 5;
/** At most this many neighbouring requirements one subject line names. */
const MAX_NEIGHBOURS_NAMED = 8;
/** How many existing subjects a claim without anchors is offered. */
const SUGGESTED_SUBJECTS = 3;

type Entry = Readonly<Record<string, unknown>>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && item !== "",
      )
    : [];
}

function inventory(entity: Readonly<Record<string, unknown>>): Entry[] {
  const raw = entity.semantic_inventory;
  return Array.isArray(raw)
    ? raw.filter(
        (entry): entry is Entry =>
          entry !== null && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];
}

/** Whether an inventory entry must name its subjects and does not. */
export function claimNeedsSubjects(entry: Entry): boolean {
  return (
    ANCHORED_ROLES.has(text(entry.role)) &&
    UNMODELED_STATUSES.has(text(entry.status)) &&
    strings(entry.subjects).length === 0
  );
}

/** The subject keys a requirement payload's inventory anchors name. */
export function anchoredSubjects(
  entity: Readonly<Record<string, unknown>>,
): string[] {
  return [
    ...new Set(inventory(entity).flatMap((entry) => strings(entry.subjects))),
  ].sort();
}

/**
 * kb_upsert notes for the domain definition layer. For a requirement: each
 * unmodeled claim that names no subject, with the existing subjects its words
 * suggest; and for each subject its claims name, the other current
 * requirements about that subject, so the writer compares them before the
 * check pairs them. For a subject fact: a body that does not define it, and
 * existing subjects it reads as a duplicate of. Best effort: a store read
 * that fails leaves the notes out, never the write.
 */
export async function subjectLayerWarnings(
  input: Readonly<{ id: string; type: string }>,
  entity: Readonly<Record<string, unknown>>,
  body: string,
  prolog: Pick<PrologPort, "query"> | undefined,
  workspaceRoot: string,
): Promise<string[]> {
  if (prolog === undefined) return [];
  try {
    if (input.type === "req") {
      return await requirementWarnings(input.id, entity, prolog, workspaceRoot);
    }
    if (input.type === "fact" && entity.fact_kind === "subject") {
      return await subjectFactWarnings(input.id, entity, body, prolog);
    }
  } catch {
    // The notes are advice; the write stands without them.
  }
  return [];
}

async function requirementWarnings(
  id: string,
  entity: Readonly<Record<string, unknown>>,
  prolog: Pick<PrologPort, "query">,
  workspaceRoot: string,
): Promise<string[]> {
  const warnings: string[] = [];
  const missing = inventory(entity).filter(claimNeedsSubjects);
  if (missing.length > 0) {
    const vocabulary = (await readSubjectVocabulary(prolog as PrologPort))
      .filter((entry) => entry.reqDerived !== true);
    for (const entry of missing) {
      const suggestions = rankSubjectCandidates(
        text(entry.claim_text),
        vocabulary,
        { limit: SUGGESTED_SUBJECTS },
      ).map(
        (candidate) =>
          `${candidate.subjectKey}${candidate.title ? ` ("${candidate.title}")` : ""}`,
      );
      warnings.push(
        `claim-subject-missing: inventory claim ${text(entry.claim_key)} of ${id} ("${text(entry.claim_text)}") is not modeled and names no subjects, so kb_check blocks it and Kibi cannot pair it with the other requirements on its subjects. Add subjects: [<subject_key>, ...] to that entry${suggestions.length > 0 ? `; existing subjects its words suggest: ${suggestions.join(", ")}` : ""}. Define a missing subject as a subject fact first.`,
      );
    }
  }
  for (const subjectKey of anchoredSubjects(entity).slice(
    0,
    MAX_SUBJECTS_REPORTED,
  )) {
    const domain = await readSubjectDomain(prolog, workspaceRoot, subjectKey);
    if (!domain.defined) {
      warnings.push(
        `claim-subject-undefined: ${id} names subject ${subjectKey}, which no active subject fact defines. Define it (fact_kind subject, a body that says what it is and is not) or name an existing subject.`,
      );
      continue;
    }
    const others = domain.requirements.filter((req) => req.id !== id);
    if (others.length === 0) continue;
    const definition = definitionQuote(domain);
    const named = others
      .slice(0, MAX_NEIGHBOURS_NAMED)
      .map((req) => `${req.id} ("${req.title}")`)
      .join(", ");
    const more =
      others.length > MAX_NEIGHBOURS_NAMED
        ? ` and ${others.length - MAX_NEIGHBOURS_NAMED} more`
        : "";
    warnings.push(
      `Subject ${subjectKey}${definition === "" ? "" : ` (${definition})`} is also governed by ${named}${more}. Read them: if one contradicts ${id}, or restricts what ${id} describes in a way its text does not say, ask the human which rule holds before relying on either. kb_query {"factKind":"subject","subjectKey":"${subjectKey}"} shows the whole subject.`,
    );
  }
  return warnings;
}

async function subjectFactWarnings(
  id: string,
  entity: Readonly<Record<string, unknown>>,
  body: string,
  prolog: Pick<PrologPort, "query">,
): Promise<string[]> {
  const warnings: string[] = [];
  const subjectKey = text(entity.subject_key);
  const title = text(entity.title);
  const definition = contextProse("fact", body).trim();
  const assessment = assessDefinition({ subjectKey, title, definition });
  if (!assessment.ok) {
    warnings.push(
      `subject-definition-missing: subject ${subjectKey} (${id}) needs a definition as its body: at least ${MIN_DEFINITION_WORDS} words saying what it is in the product and what it is not. kb_check blocks a subject without one.`,
    );
  }
  const related = [
    ...strings(entity.distinct_from),
    ...strings(entity.part_of),
    ...strings(entity.kind_of),
  ];
  const vocabulary = await readSubjectVocabulary(prolog as PrologPort);
  const similar = vocabulary.filter(
    (entry) =>
      entry.subjectKey !== subjectKey &&
      entry.factId !== id &&
      !isKeyPrefix(entry.subjectKey, subjectKey) &&
      !related.includes(entry.subjectKey) &&
      tokenSetJaccard(
        subjectWords({ subjectKey, title }),
        subjectWords({
          subjectKey: entry.subjectKey,
          title: entry.title ?? "",
        }),
      ) >= SUBJECT_DUPLICATE_JACCARD,
  );
  if (similar.length > 0) {
    warnings.push(
      `subject-duplicate: subject ${subjectKey} reads like existing ${similar.map((entry) => `${entry.subjectKey} (${entry.factId})`).join(", ")}. Reuse the existing subject, or name it under distinct_from (or part_of or kind_of when this subject is a part or kind of it) and say in the definition how they differ; kb_check blocks the pair otherwise.`,
    );
  }
  return warnings;
}
