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

import {
  RESTATEMENT_JACCARD,
  contextProse,
} from "../../entity-body-context.js";
import { singularizeToken } from "../../operations/semantic-advisor/shared.js";
import { readKbManifest } from "../../utils/kb-manifest.js";
import type { Violation } from "../../utils/rule-registry.js";
import {
  DEFINITION_NOT_STATED_PREFIX,
  isNotStatedDefinition,
  notStatedDefinition,
} from "../../utils/subject-definition.js";
import {
  type AuthoredEntity,
  authoredSupersededIds,
  listContextAuthoredEntities,
} from "./entity-context.js";

export {
  DEFINITION_NOT_STATED_PREFIX,
  isNotStatedDefinition,
  notStatedDefinition,
};

/** An active subject fact must define its subject in its body (blocking). */
export const SUBJECT_DEFINITION_MISSING_RULE = "subject-definition-missing";
/** Two active subject facts must not define one thing twice (blocking). */
export const SUBJECT_DUPLICATE_RULE = "subject-duplicate";
/**
 * part_of and kind_of must form a hierarchy: no subject names itself, and no
 * chain of broader subjects leads back to where it started (blocking).
 */
export const SUBJECT_HIERARCHY_INVALID_RULE = "subject-hierarchy-invalid";

export const SUBJECT_LAYER_RULES = [
  SUBJECT_DEFINITION_MISSING_RULE,
  SUBJECT_DUPLICATE_RULE,
  SUBJECT_HIERARCHY_INVALID_RULE,
] as const;

/**
 * The KB schema that introduced the domain subject layer. A KB on an older
 * schema has not run the upgrade that reviews its subjects, so the subject
 * rules wait for `kibi migrate`.
 */
export const SUBJECT_LAYER_SCHEMA_VERSION = 16;

/** The fewest words of body prose that count as a definition. */
export const MIN_DEFINITION_WORDS = 8;

/**
 * The fewest distinct words a definition must add beyond its title, its key
 * and function words: "The cart is the cart of the cart." says nothing.
 */
export const MIN_DEFINITION_CONTENT_WORDS = 3;

/**
 * Token Jaccard of two subjects' key and title words at which they read as
 * one subject defined twice. Measured on Kibi's own KB: 0.7 and above caught
 * the real duplicates (`kibi.entity_body_context` and
 * `kibi.entity_body.context`) and otherwise only parent and child keys, which
 * the prefix rule excludes.
 */
export const SUBJECT_DUPLICATE_JACCARD = 0.7;

/** Fact statuses that take a subject out of the vocabulary. */
const INACTIVE_FACT_STATUSES = new Set([
  "superseded",
  "deprecated",
  "closed",
  "removed",
  "retired",
  "inactive",
  "archived",
]);

/** One active subject fact as the subject rules read it. */
export type SubjectEntry = Readonly<{
  id: string;
  subjectKey: string;
  title: string;
  definition: string;
  distinctFrom: readonly string[];
  /** Keys this subject declares itself part_of or kind_of. */
  broader: readonly string[];
  partOf: readonly string[];
  kindOf: readonly string[];
  path: string;
}>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function keys(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * One character of a script written without spaces between words (Chinese,
 * Japanese kana and kanji). Each one counts as a word: splitting on spaces
 * would read a whole sentence as one word.
 */
const UNSPACED_SCRIPT_CHARACTER =
  /([\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}])/u;

/**
 * Lowercase words of a text: runs of letters and digits, with each
 * character of an unspaced script as a word of its own. Hangul is written
 * with spaces between words and splits on them like Latin script.
 */
export function definitionTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]/u)
    .flatMap((token) => token.split(UNSPACED_SCRIPT_CHARACTER))
    .filter((token) => token !== "");
}

/**
 * Function words that say nothing about a subject on their own: English,
 * and the commonest Chinese and Japanese particles.
 */
const FUNCTION_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "which",
  "with",
  "的",
  "是",
  "了",
  "在",
  "和",
  "の",
  "は",
  "が",
  "を",
  "に",
  "で",
  "と",
  "も",
]);

/** A word with a simple English plural ending removed ("exports", "slugs"). */
function singular(word: string): string {
  return singularizeToken(word, []);
}

function contentWords(value: string): Set<string> {
  return new Set(
    definitionTokens(value)
      .filter((word) => !FUNCTION_WORDS.has(word))
      .map(singular),
  );
}

function jaccard(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): number {
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  const union = left.size + right.size - shared;
  return union === 0 ? 0 : shared / union;
}

/** The active subject facts among authored entities. */
export function activeSubjects(
  entities: readonly AuthoredEntity[],
  superseded: ReadonlySet<string>,
): SubjectEntry[] {
  return entities
    .filter(
      (entity) =>
        entity.type === "fact" &&
        entity.data.fact_kind === "subject" &&
        text(entity.data.subject_key) !== "" &&
        !INACTIVE_FACT_STATUSES.has(text(entity.data.status)) &&
        !superseded.has(entity.id),
    )
    .map((entity) => ({
      id: entity.id,
      subjectKey: text(entity.data.subject_key),
      title: text(entity.data.title),
      definition: contextProse("fact", entity.body).trim(),
      distinctFrom: keys(entity.data.distinct_from),
      broader: [...keys(entity.data.part_of), ...keys(entity.data.kind_of)],
      partOf: keys(entity.data.part_of),
      kindOf: keys(entity.data.kind_of),
      path: entity.path,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export type DefinitionAssessment = Readonly<{
  ok: boolean;
  reason?: "none" | "too_short" | "restatement" | "template";
  words: number;
}>;

/**
 * Judge a subject's definition: at least MIN_DEFINITION_WORDS words of body
 * prose that do not restate its title or its key, and that add at least
 * MIN_DEFINITION_CONTENT_WORDS words of their own beyond them and function
 * words.
 */
export function assessDefinition(
  subject: Pick<SubjectEntry, "subjectKey" | "title" | "definition">,
): DefinitionAssessment {
  const words = definitionTokens(subject.definition).length;
  if (words === 0) return { ok: false, reason: "none", words };
  if (words < MIN_DEFINITION_WORDS)
    return { ok: false, reason: "too_short", words };
  const definition = contentWords(subject.definition);
  const references = [
    contentWords(subject.title),
    contentWords(subject.subjectKey.replace(/[._-]/g, " ")),
  ];
  const named = new Set(references.flatMap((reference) => [...reference]));
  const ownWords = [...definition].filter((word) => !named.has(word)).length;
  if (
    ownWords < MIN_DEFINITION_CONTENT_WORDS ||
    references.some(
      (reference) => jaccard(definition, reference) >= RESTATEMENT_JACCARD,
    )
  ) {
    return { ok: false, reason: "restatement", words };
  }
  return { ok: true, words };
}

const DEFINITION_HINT =
  "Write the subject's definition as the fact's body: what this thing is in the product, what it includes and what it is not (name the similar subjects it differs from). Every claim and requirement about the subject is read against this text, so state only what the project's people and code say. When nobody has said, write 'Definition not stated:' followed by where the subject is named and who could define it";

function definitionProblem(reason: DefinitionAssessment["reason"]): string {
  return reason === "restatement"
    ? "only restates its title or key"
    : reason === "template"
      ? `is a template that ${DEFINITION_TEMPLATE_MIN_SHARED} or more subjects repeat with only the key or title changed`
      : reason === "too_short"
        ? `is shorter than ${MIN_DEFINITION_WORDS} words`
        : "is missing";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A definition with the subject's own key and title masked out, lowercased
 * and with spacing collapsed: two subjects whose masked definitions are equal
 * share a template, not a definition.
 */
export function definitionTemplate(
  subject: Pick<SubjectEntry, "subjectKey" | "title" | "definition">,
): string {
  let masked = subject.definition.toLowerCase();
  const names = [
    subject.title,
    subject.subjectKey,
    subject.subjectKey.replace(/[._]/g, " "),
  ]
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name !== "")
    .sort((left, right) => right.length - left.length);
  for (const name of names) {
    masked = masked.replace(new RegExp(escapeRegExp(name), "g"), "\u0000");
  }
  return masked.replace(/\s+/g, " ").trim();
}

/**
 * How many subjects must share one masked definition before it counts as a
 * template: generated boilerplate repeats across many subjects, while two
 * hand-written definitions rarely coincide.
 */
export const DEFINITION_TEMPLATE_MIN_SHARED = 3;

/** Ids of subjects whose definition other subjects repeat as a template. */
export function templatedDefinitionIds(
  subjects: readonly SubjectEntry[],
): Set<string> {
  const byTemplate = new Map<string, string[]>();
  for (const subject of subjects) {
    // Recorded gaps look alike by design; they are not boilerplate definitions.
    if (
      subject.definition.trim() === "" ||
      isNotStatedDefinition(subject.definition)
    )
      continue;
    const template = definitionTemplate(subject);
    byTemplate.set(template, [...(byTemplate.get(template) ?? []), subject.id]);
  }
  return new Set(
    [...byTemplate.values()]
      .filter((ids) => ids.length >= DEFINITION_TEMPLATE_MIN_SHARED)
      .flat(),
  );
}

/** subject-definition-missing over the active subjects. */
export function subjectDefinitionViolations(
  subjects: readonly SubjectEntry[],
): Violation[] {
  const findings: Violation[] = [];
  const templated = templatedDefinitionIds(subjects);
  for (const subject of subjects) {
    const own = assessDefinition(subject);
    const assessment: DefinitionAssessment =
      own.ok && templated.has(subject.id)
        ? { ok: false, reason: "template", words: own.words }
        : own;
    if (assessment.ok) continue;
    findings.push({
      rule: SUBJECT_DEFINITION_MISSING_RULE,
      entityId: subject.id,
      description: `Subject ${subject.subjectKey} (${subject.id}) has no definition: its body ${definitionProblem(assessment.reason)}, so requirements that name it can mean different things by it`,
      suggestion: DEFINITION_HINT,
      source: subject.path,
      evidence: {
        subjectKey: subject.subjectKey,
        reason: assessment.reason,
        words: assessment.words,
      },
    });
  }
  return findings;
}

/** The words two subjects are compared by: key segments and title. */
export function subjectWords(
  subject: Pick<SubjectEntry, "subjectKey" | "title">,
): string {
  return `${subject.subjectKey.replace(/[._]/g, " ")} ${subject.title}`;
}

/** True when one key is a dotted prefix of the other (parent and part). */
export function isKeyPrefix(left: string, right: string): boolean {
  return left.startsWith(`${right}.`) || right.startsWith(`${left}.`);
}

/**
 * A key's dotted segments, each as its singular words joined by a space:
 * `report.exports` and `report.export` have the same segments, and
 * `report_export` is the single segment "report export".
 */
export function keySegments(subjectKey: string): string[] {
  return subjectKey
    .toLowerCase()
    .split(".")
    .map((segment) =>
      definitionTokens(segment.replace(/[_-]/g, " ")).map(singular).join(" "),
    )
    .filter((segment) => segment !== "");
}

function keyWords(subjectKey: string): string[] {
  return keySegments(subjectKey).flatMap((segment) => segment.split(" "));
}

/**
 * True when one key's words begin the other's, as an ancestor's begin its
 * descendant's: `report.export` and `report_export` both sit above
 * `report.export.pdf`.
 */
export function isAncestorKey(left: string, right: string): boolean {
  const [shorter, longer] = [keyWords(left), keyWords(right)].sort(
    (a, b) => a.length - b.length,
  ) as [string[], string[]];
  return (
    shorter.length < longer.length &&
    shorter.every((word, index) => longer[index] === word)
  );
}

/**
 * True when the keys part below their last segment: each continues past the
 * first segment where they differ, so they sit under different parents
 * (`web.drawing.view` and `mobile.drawing.view`). Same-named subjects under
 * different parents are siblings, not one subject.
 */
export function underDifferentParents(left: string, right: string): boolean {
  const a = keySegments(left);
  const b = keySegments(right);
  const split = a.findIndex((segment, index) => b[index] !== segment);
  return split >= 0 && split < a.length - 1 && split < b.length - 1;
}

/**
 * True when either subject already declares how it relates to the other:
 * distinct_from, part_of or kind_of naming the other key.
 */
export function declaredRelated(
  left: Pick<SubjectEntry, "subjectKey" | "distinctFrom" | "broader">,
  right: Pick<SubjectEntry, "subjectKey" | "distinctFrom" | "broader">,
): boolean {
  return (
    left.distinctFrom.includes(right.subjectKey) ||
    right.distinctFrom.includes(left.subjectKey) ||
    left.broader.includes(right.subjectKey) ||
    right.broader.includes(left.subjectKey)
  );
}

function comparedWords(
  subject: Pick<SubjectEntry, "subjectKey" | "title">,
): Set<string> {
  return new Set([
    ...keyWords(subject.subjectKey),
    ...contentWords(subject.title),
  ]);
}

/**
 * How alike two subjects read, from 0 to 1, or null when the pair is never a
 * duplicate: the same subject_key on two facts is 1; a pair either side
 * relates through distinct_from, part_of or kind_of, an ancestor and its
 * descendant, and siblings under different parents are null. Otherwise keys
 * with the same singular words are 1, and any other pair is the Jaccard of
 * their key and title words, plural endings and function words removed.
 */
export function subjectSimilarity(
  left: Pick<SubjectEntry, "subjectKey" | "title" | "distinctFrom" | "broader">,
  right: Pick<
    SubjectEntry,
    "subjectKey" | "title" | "distinctFrom" | "broader"
  >,
): number | null {
  if (left.subjectKey === right.subjectKey) return 1;
  if (declaredRelated(left, right)) return null;
  if (isAncestorKey(left.subjectKey, right.subjectKey)) return null;
  if (
    keyWords(left.subjectKey).join(" ") === keyWords(right.subjectKey).join(" ")
  )
    return 1;
  if (underDifferentParents(left.subjectKey, right.subjectKey)) return null;
  return jaccard(comparedWords(left), comparedWords(right));
}

export type SubjectDuplicatePair = {
  left: SubjectEntry;
  right: SubjectEntry;
  similarity: number;
  /** Both facts carry the same subject_key. */
  sameKey: boolean;
};

/**
 * Pairs of active subject facts that read as one subject: two facts with the
 * same subject_key, and distinct keys whose words mostly coincide (see
 * subjectSimilarity). Each pair is a pure function of the two subjects, so
 * adding a third subject never changes it.
 */
export function subjectDuplicatePairs(
  subjects: readonly SubjectEntry[],
): SubjectDuplicatePair[] {
  const pairs: SubjectDuplicatePair[] = [];
  for (let i = 0; i < subjects.length; i += 1) {
    const left = subjects[i] as SubjectEntry;
    for (let j = i + 1; j < subjects.length; j += 1) {
      const right = subjects[j] as SubjectEntry;
      const similarity = subjectSimilarity(left, right);
      if (similarity !== null && similarity >= SUBJECT_DUPLICATE_JACCARD) {
        pairs.push({
          left,
          right,
          similarity: Math.round(similarity * 1000) / 1000,
          sameKey: left.subjectKey === right.subjectKey,
        });
      }
    }
  }
  return pairs;
}

/** subject-duplicate over the active subjects. */
export function subjectDuplicateViolations(
  subjects: readonly SubjectEntry[],
): Violation[] {
  return subjectDuplicatePairs(subjects).map(
    ({ left, right, similarity, sameKey }) => ({
      rule: SUBJECT_DUPLICATE_RULE,
      entityId: left.id,
      description: sameKey
        ? `Subject facts ${left.id} and ${right.id} both define subject_key ${left.subjectKey}, so the subject has two definitions and readers cannot tell which one a requirement means`
        : `Subjects ${left.subjectKey} (${left.id}) and ${right.subjectKey} (${right.id}) read as one thing defined twice (word similarity ${similarity}), so requirements about it are split across two subjects that never meet`,
      suggestion: sameKey
        ? "Keep one subject fact for the key: merge what the other definition adds into it, point its constrains links at the kept fact and archive the other (or supersede it)"
        : "If they are one subject, keep one subject fact, point every constrains link, claim anchor and subject_key at its key and archive the other. If they differ, add the other key to distinct_from on either fact (or part_of or kind_of when one is a part or kind of the other) and say in its definition how they differ",
      source: left.path,
      evidence: {
        subjectKey: left.subjectKey,
        other: right.subjectKey,
        otherId: right.id,
        similarity,
        ...(sameKey ? { sameKey: true } : {}),
      },
    }),
  );
}

const HIERARCHY_FIELDS = ["part_of", "kind_of", "distinct_from"] as const;

function fieldKeys(
  subject: SubjectEntry,
  field: (typeof HIERARCHY_FIELDS)[number],
): readonly string[] {
  return field === "part_of"
    ? subject.partOf
    : field === "kind_of"
      ? subject.kindOf
      : subject.distinctFrom;
}

/** The nearest dotted prefix of a key that is itself a defined subject. */
function nearestDefinedPrefix(
  subjectKey: string,
  defined: ReadonlySet<string>,
): string | undefined {
  const segments = subjectKey.split(".");
  for (let length = segments.length - 1; length > 0; length -= 1) {
    const prefix = segments.slice(0, length).join(".");
    if (defined.has(prefix)) return prefix;
  }
  return undefined;
}

/**
 * Groups of subject keys that sit under each other: strongly connected
 * components of more than one key in the broader-subject graph (each key's
 * nearest defined dotted prefix and its defined part_of and kind_of keys).
 * Each group is sorted, and the groups are sorted by their first key.
 */
export function subjectHierarchyCycles(
  subjects: readonly SubjectEntry[],
): string[][] {
  const defined = new Set(subjects.map((subject) => subject.subjectKey));
  const edges = new Map<string, Set<string>>();
  for (const key of defined) edges.set(key, new Set());
  for (const subject of subjects) {
    const out = edges.get(subject.subjectKey) as Set<string>;
    const prefix = nearestDefinedPrefix(subject.subjectKey, defined);
    if (prefix !== undefined) out.add(prefix);
    for (const broader of subject.broader) {
      if (broader !== subject.subjectKey && defined.has(broader))
        out.add(broader);
    }
  }
  // Tarjan's strongly connected components, iterative over sorted keys.
  let counter = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const groups: string[][] = [];
  const visit = (start: string): void => {
    const work: [string, string[]][] = [];
    const enter = (key: string): void => {
      index.set(key, counter);
      low.set(key, counter);
      counter += 1;
      stack.push(key);
      onStack.add(key);
      work.push([key, [...(edges.get(key) as Set<string>)].sort()]);
    };
    enter(start);
    while (work.length > 0) {
      const [key, pending] = work[work.length - 1] as [string, string[]];
      const next = pending.shift();
      if (next !== undefined) {
        if (!index.has(next)) enter(next);
        else if (onStack.has(next))
          low.set(
            key,
            Math.min(low.get(key) as number, index.get(next) as number),
          );
        continue;
      }
      work.pop();
      const parent = work[work.length - 1];
      if (parent !== undefined)
        low.set(
          parent[0],
          Math.min(low.get(parent[0]) as number, low.get(key) as number),
        );
      if (low.get(key) === index.get(key)) {
        const group: string[] = [];
        let member: string;
        do {
          member = stack.pop() as string;
          onStack.delete(member);
          group.push(member);
        } while (member !== key);
        if (group.length > 1) groups.push(group.sort());
      }
    }
  };
  for (const key of [...defined].sort()) if (!index.has(key)) visit(key);
  return groups.sort((left, right) =>
    (left[0] as string).localeCompare(right[0] as string),
  );
}

const HIERARCHY_HINT =
  "A subject's part_of and kind_of name broader subjects and distinct_from names other subjects, never the subject itself, and following part_of, kind_of and dotted keys upward must never come back to where it started. Remove the link that points the wrong way: keep the one that says which subject contains or generalizes the other";

/** subject-hierarchy-invalid over the active subjects. */
export function subjectHierarchyViolations(
  subjects: readonly SubjectEntry[],
): Violation[] {
  const findings: Violation[] = [];
  for (const subject of subjects) {
    const fields = HIERARCHY_FIELDS.filter((field) =>
      fieldKeys(subject, field).includes(subject.subjectKey),
    );
    if (fields.length === 0) continue;
    findings.push({
      rule: SUBJECT_HIERARCHY_INVALID_RULE,
      entityId: subject.id,
      description: `Subject ${subject.subjectKey} (${subject.id}) names itself under ${fields.join(", ")}, so it cannot be read as broader than, or distinct from, another subject`,
      suggestion: HIERARCHY_HINT,
      source: subject.path,
      evidence: { subjectKey: subject.subjectKey, selfReference: fields },
    });
  }
  for (const keys of subjectHierarchyCycles(subjects)) {
    const members = subjects.filter((subject) =>
      keys.includes(subject.subjectKey),
    );
    const first = members[0] as SubjectEntry;
    findings.push({
      rule: SUBJECT_HIERARCHY_INVALID_RULE,
      entityId: first.id,
      description: `Subjects ${keys.join(", ")} sit under each other through part_of, kind_of or dotted keys (${members.map((subject) => subject.id).join(", ")}), so none of them is broader and requirements on one reach all of them`,
      suggestion: HIERARCHY_HINT,
      source: first.path,
      evidence: { subjectKey: first.subjectKey, cycle: keys },
    });
  }
  return findings;
}

/** Evaluate the selected subject-layer rules over authored entities. */
export function evaluateSubjectLayer(
  entities: readonly AuthoredEntity[],
  superseded: ReadonlySet<string>,
  rules: ReadonlySet<string> = new Set(SUBJECT_LAYER_RULES),
): Violation[] {
  const subjects = activeSubjects(entities, superseded);
  return [
    ...(rules.has(SUBJECT_DEFINITION_MISSING_RULE)
      ? subjectDefinitionViolations(subjects)
      : []),
    ...(rules.has(SUBJECT_DUPLICATE_RULE)
      ? subjectDuplicateViolations(subjects)
      : []),
    ...(rules.has(SUBJECT_HIERARCHY_INVALID_RULE)
      ? subjectHierarchyViolations(subjects)
      : []),
  ];
}

/** Whether a KB's manifest is on the schema the subject rules apply to. */
export function subjectLayerApplies(workspaceRoot: string): boolean {
  const manifest = readKbManifest(workspaceRoot);
  return (
    manifest !== null && manifest.schemaVersion >= SUBJECT_LAYER_SCHEMA_VERSION
  );
}

/**
 * Read the authored entities once and evaluate the selected rules. A KB
 * whose manifest predates schema 16 has no subject layer yet: the rules wait
 * for `kibi migrate`.
 */
export function collectSubjectLayerViolations(
  rules: ReadonlySet<string>,
  workspaceRoot: string,
): Violation[] {
  if (!SUBJECT_LAYER_RULES.some((rule) => rules.has(rule))) return [];
  if (!subjectLayerApplies(workspaceRoot)) return [];
  const entities = listContextAuthoredEntities(workspaceRoot);
  return evaluateSubjectLayer(
    entities,
    authoredSupersededIds(workspaceRoot, entities),
    rules,
  );
}
