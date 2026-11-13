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

import path from "node:path";
import { rankSubjectCandidates } from "kibi-plugin-builtin";
import { contextProse } from "../../entity-body-context.js";
import { resolveKbPlPath } from "../../prolog.js";
import { escapeAtom, toPrologAtom } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import {
  definitionQuote,
  readSubjectNeighbours,
} from "../../public/operations/subject-domain.js";
import { readAuthoredEntity } from "../../public/operations/entity-context.js";
import {
  MIN_DEFINITION_WORDS,
  SUBJECT_DUPLICATE_JACCARD,
  type SubjectEntry,
  activeSubjects,
  assessDefinition,
  subjectHierarchyCycles,
  subjectSimilarity,
} from "../../public/operations/subject-layer.js";
import { listLaneMarkdownSources } from "../migration/kb-sources.js";
import { readKbManifest } from "../../utils/kb-manifest.js";
import { readSubjectVocabulary } from "../modeling/vocabulary-alignment.js";

/** The schema that made subjects domain definitions (claim anchors). */
const SUBJECT_LAYER_SCHEMA_VERSION = 16;

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

/** The `with` partners a requirement payload's pair_reviews name. */
export function pairReviewPartners(
  entity: Readonly<Record<string, unknown>>,
): string[] {
  const raw = entity.pair_reviews;
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((review) =>
          review !== null && typeof review === "object"
            ? text((review as Entry).with)
            : "",
        )
        .filter((id) => id !== ""),
    ),
  ].sort();
}

/**
 * kb_upsert notes for the domain definition layer. For a requirement: each
 * unmodeled claim that names no subject, with the existing subjects its words
 * suggest; for each subject its claims name, the other current requirements
 * the check pairs with it (on that subject, a narrower or a broader one), so
 * the writer compares them first; and a pair review whose partner is not a
 * current requirement. For a subject fact: a body that does not define it,
 * another active subject fact with the same key, and existing subjects it
 * reads as a duplicate of. A store below schema 16 has no subject layer and
 * gets no notes. Best effort: a store read that fails leaves the notes out,
 * never the write.
 */
export async function subjectLayerWarnings(
  input: Readonly<{ id: string; type: string }>,
  entity: Readonly<Record<string, unknown>>,
  body: string,
  prolog: Pick<PrologPort, "query"> | undefined,
  workspaceRoot: string,
): Promise<string[]> {
  if (prolog === undefined) return [];
  const schemaVersion = readKbManifest(workspaceRoot)?.schemaVersion ?? 0;
  if (schemaVersion < SUBJECT_LAYER_SCHEMA_VERSION) return [];
  try {
    if (input.type === "req") {
      return await requirementWarnings(input.id, entity, prolog, workspaceRoot);
    }
    if (input.type === "fact" && entity.fact_kind === "subject") {
      return await subjectFactWarnings(
        input.id,
        entity,
        body,
        prolog,
        workspaceRoot,
      );
    }
  } catch {
    // The notes are advice; the write stands without them.
  }
  return [];
}

/**
 * Whether a subject's title says more than its key: a placeholder such as
 * "Subject report_export.pdf" only restates the key, so a suggestion shows
 * the key alone.
 */
function informativeTitle(subjectKey: string, title: string | undefined) {
  const words = (value: string) =>
    value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const keyWords = new Set([...words(subjectKey), "subject"]);
  return words(title ?? "").some((word) => !keyWords.has(word));
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
    const vocabulary = (
      await readSubjectVocabulary(prolog as PrologPort)
    ).filter((entry) => entry.reqDerived !== true);
    for (const entry of missing) {
      const suggestions = rankSubjectCandidates(
        text(entry.claim_text),
        vocabulary,
        { limit: SUGGESTED_SUBJECTS },
      ).map(
        (candidate) =>
          `${candidate.subjectKey}${informativeTitle(candidate.subjectKey, candidate.title) ? ` ("${candidate.title}")` : ""}`,
      );
      warnings.push(
        `claim-subject-missing: inventory claim ${text(entry.claim_key)} of ${id} ("${text(entry.claim_text)}") is not modeled and names no subjects, so kb_check blocks it and Kibi cannot pair it with the other requirements on its subjects. Add subjects: [<subject_key>, ...] to that entry${suggestions.length > 0 ? `; existing subjects its words suggest: ${suggestions.join(", ")}` : ""}. Define a missing subject as a subject fact first.`,
      );
    }
  }
  const subjectKeys = anchoredSubjects(entity).slice(0, MAX_SUBJECTS_REPORTED);
  const withIds = pairReviewPartners(entity);
  if (subjectKeys.length === 0 && withIds.length === 0) return warnings;
  const neighbours = await readSubjectNeighbours(prolog, workspaceRoot, {
    requirementId: id,
    subjectKeys,
    withIds,
  });
  for (const subject of neighbours.subjects) {
    const subjectKey = subject.subjectKey;
    if (!subject.defined) {
      warnings.push(
        `claim-subject-undefined: ${id} names subject ${subjectKey}, which no active subject fact defines. Define it (fact_kind subject, a body that says what it is and is not) or name an existing subject.`,
      );
      continue;
    }
    const others = subject.requirements;
    if (others.length === 0) continue;
    const definition = definitionQuote(subject);
    const named = others
      .slice(0, MAX_NEIGHBOURS_NAMED)
      .map((req) => `${req.id} ("${req.title}")`)
      .join(", ");
    const more =
      others.length > MAX_NEIGHBOURS_NAMED
        ? ` and ${others.length - MAX_NEIGHBOURS_NAMED} more`
        : "";
    warnings.push(
      `Subject ${subjectKey}${definition === "" ? "" : ` (${definition})`} is also governed by ${named}${more} (on it, a narrower or a broader subject). Read them: if one contradicts ${id}, or restricts what ${id} describes in a way its text does not say, ask the human which rule holds before relying on either. kb_query {"factKind":"subject","subjectKey":"${subjectKey}"} shows the whole subject.`,
    );
  }
  const unpaired = await readUnpairedReviewPartners(
    prolog,
    id,
    withIds.filter((withId) => !neighbours.notCurrent.includes(withId)),
  );
  if (unpaired.length > 0) {
    warnings.push(
      `related-requirement-unmodeled: a pair review on ${id} names ${unpaired.join(", ")}, ${unpaired.length === 1 ? `which shares no subject with ${id} (on it, a narrower or a broader one) and has no relates_to edge to it, so kibi check never pairs the two and that review settles` : `which share no subject with ${id} (on it, a narrower or a broader one) and have no relates_to edge to it, so kibi check never pairs them with ${id} and those reviews settle`} nothing. Check the id in its with field; if the requirements do interact, add a relates_to link between them (a verdict counts only while one links the pair), otherwise drop the review.`,
    );
  }
  if (neighbours.notCurrent.length > 0) {
    warnings.push(
      `related-requirement-unmodeled: a pair review on ${id} names ${neighbours.notCurrent.join(", ")}, which ${neighbours.notCurrent.length === 1 ? "is not a current requirement, so that review settles" : "are not current requirements, so those reviews settle"} nothing. Check the id in its with field; a review of a superseded or removed requirement can be dropped.`,
    );
  }
  return warnings;
}

/**
 * The current requirements among withIds that kibi check never pairs with the
 * current requirement reqId: they share no subject with it (on it, a narrower
 * or a broader one) and no relates_to edge links them, so a pair review that
 * names one settles nothing. Empty when reqId is not current itself.
 */
async function readUnpairedReviewPartners(
  prolog: Pick<PrologPort, "query">,
  reqId: string,
  withIds: readonly string[],
): Promise<string[]> {
  if (withIds.length === 0) return [];
  const modulePath = escapeAtom(
    path.join(path.dirname(resolveKbPlPath()), "domain_subjects.pl"),
  );
  const req = toPrologAtom(reqId);
  const result = await prolog.query(
    `(use_module(library(http/json)), use_module('${modulePath}'), kb:current_req(${req}), findall(W, (member(W, [${withIds.map(toPrologAtom).join(",")}]), W \\== ${req}, kb:current_req(W), \\+ ( call(domain_subjects:requirement_subject_pair(${req}, W, _)) ; call(domain_subjects:requirement_subject_pair(W, ${req}, _)) ; kb:kb_relationship(relates_to, ${req}, W) ; kb:kb_relationship(relates_to, W, ${req}) )), Found), sort(Found, Unpaired), with_output_to(string(Json), json_write(current_output, Unpaired, [width(0)])))`,
  );
  if (!result.success) return [];
  let parsed: unknown = result.bindings.Json;
  // The binding is the JSON text, sometimes quoted once more.
  while (typeof parsed === "string") parsed = JSON.parse(parsed);
  return Array.isArray(parsed) ? parsed.map(String) : [];
}

async function subjectFactWarnings(
  id: string,
  entity: Readonly<Record<string, unknown>>,
  body: string,
  prolog: Pick<PrologPort, "query">,
  workspaceRoot: string,
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
  const written = {
    subjectKey,
    title,
    distinctFrom: strings(entity.distinct_from),
    broader: [...strings(entity.part_of), ...strings(entity.kind_of)],
    partOf: strings(entity.part_of),
    kindOf: strings(entity.kind_of),
  };
  const vocabulary = await readSubjectVocabulary(prolog as PrologPort);
  const [sameKey] = (
    await readSubjectNeighbours(prolog, workspaceRoot, {
      requirementId: "",
      subjectKeys: [subjectKey],
      withIds: [],
    })
  ).subjects;
  const twins = (sameKey?.subjectFacts ?? []).filter((fact) => fact.id !== id);
  if (twins.length > 0) {
    warnings.push(
      `subject-duplicate: subject ${subjectKey} is already defined by ${twins.map((fact) => fact.id).join(", ")}. Two active subject facts with one key make the term mean two things: extend the existing definition instead, or retire one of them.`,
    );
  }
  // The same key is reported above from the active subject facts; the
  // vocabulary also lists retired ones. Otherwise the check's own
  // similarity decides, so upsert and kb_check agree.
  const similar = vocabulary.filter((entry) => {
    if (entry.factId === id || entry.subjectKey === subjectKey) return false;
    const similarity = subjectSimilarity(written, {
      subjectKey: entry.subjectKey,
      title: entry.title ?? "",
      distinctFrom: [],
      broader: [],
    });
    return similarity !== null && similarity >= SUBJECT_DUPLICATE_JACCARD;
  });
  if (similar.length > 0) {
    warnings.push(
      `subject-duplicate: subject ${subjectKey} reads like existing ${similar.map((entry) => `${entry.subjectKey} (${entry.factId})`).join(", ")}. Reuse the existing subject, or name it under distinct_from (or part_of or kind_of when this subject is a part or kind of it) and say in the definition how they differ; kb_check blocks the pair otherwise.`,
    );
  }
  warnings.push(...hierarchyWarnings(id, written, workspaceRoot));
  return warnings;
}

/**
 * subject-hierarchy-invalid for the subject just written: it names itself
 * under part_of, kind_of or distinct_from, or it sits in a cycle with the
 * other active subjects authored in the workspace, as kb_check reads them.
 */
function hierarchyWarnings(
  id: string,
  written: Readonly<{
    subjectKey: string;
    distinctFrom: readonly string[];
    partOf: readonly string[];
    kindOf: readonly string[];
  }>,
  workspaceRoot: string,
): string[] {
  const warnings: string[] = [];
  const self = (
    [
      ["part_of", written.partOf],
      ["kind_of", written.kindOf],
      ["distinct_from", written.distinctFrom],
    ] as const
  )
    .filter(([, keys]) => keys.includes(written.subjectKey))
    .map(([field]) => field);
  if (self.length > 0) {
    warnings.push(
      `subject-hierarchy-invalid: subject ${written.subjectKey} (${id}) names itself under ${self.join(", ")}; kb_check blocks it. part_of and kind_of name broader subjects and distinct_from other subjects, never the subject itself: remove ${written.subjectKey} from ${self.join(", ")}.`,
    );
  }
  const stored = activeSubjects(
    listLaneMarkdownSources(workspaceRoot, ["facts"]).flatMap((file) => {
      const entity = readAuthoredEntity(file.content, file.relativePath);
      return entity === null ? [] : [entity];
    }),
    new Set(),
  ).filter((subject) => subject.id !== id);
  const subject: SubjectEntry = {
    id,
    subjectKey: written.subjectKey,
    title: "",
    definition: "",
    distinctFrom: written.distinctFrom,
    broader: [...written.partOf, ...written.kindOf],
    partOf: written.partOf,
    kindOf: written.kindOf,
    path: "",
  };
  for (const cycle of subjectHierarchyCycles([...stored, subject])) {
    if (!cycle.includes(written.subjectKey)) continue;
    warnings.push(
      `subject-hierarchy-invalid: subjects ${cycle.join(", ")} sit under each other through part_of, kind_of or dotted keys, so none of them is broader and kb_check blocks them. Remove the link that points the wrong way: keep the one that says which subject contains or generalizes the other.`,
    );
  }
  return warnings;
}
