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
  tokenSetJaccard,
} from "../../entity-body-context.js";
import type { Violation } from "../../utils/rule-registry.js";
import {
  type AuthoredEntity,
  authoredSupersededIds,
  listContextAuthoredEntities,
} from "./entity-context.js";

/** An active subject fact must define its subject in its body (blocking). */
export const SUBJECT_DEFINITION_MISSING_RULE = "subject-definition-missing";
/** Two active subject facts must not define one thing twice (blocking). */
export const SUBJECT_DUPLICATE_RULE = "subject-duplicate";

export const SUBJECT_LAYER_RULES = [
  SUBJECT_DEFINITION_MISSING_RULE,
  SUBJECT_DUPLICATE_RULE,
] as const;

/** The fewest words of body prose that count as a definition. */
export const MIN_DEFINITION_WORDS = 8;

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

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]/u)
    .filter((token) => token !== "");
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
 * prose that do not restate its title or its key.
 */
export function assessDefinition(
  subject: Pick<SubjectEntry, "subjectKey" | "title" | "definition">,
): DefinitionAssessment {
  const words = tokens(subject.definition).length;
  if (words === 0) return { ok: false, reason: "none", words };
  if (words < MIN_DEFINITION_WORDS)
    return { ok: false, reason: "too_short", words };
  const references = [subject.title, subject.subjectKey.replace(/[._]/g, " ")];
  if (
    references.some(
      (reference) =>
        tokenSetJaccard(subject.definition, reference) >= RESTATEMENT_JACCARD,
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
      ? "is a template other subjects repeat with only the key or title changed"
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
    if (subject.definition.trim() === "") continue;
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

/**
 * Pairs of distinct subject keys whose words mostly coincide: candidate
 * duplicates. Parent and child keys, and pairs either side relates through
 * distinct_from, part_of or kind_of, are left out. Each pair is a pure function of the two
 * subjects, so adding a third subject never changes it.
 */
export function subjectDuplicatePairs(
  subjects: readonly SubjectEntry[],
): { left: SubjectEntry; right: SubjectEntry; similarity: number }[] {
  const pairs: {
    left: SubjectEntry;
    right: SubjectEntry;
    similarity: number;
  }[] = [];
  for (let i = 0; i < subjects.length; i += 1) {
    const left = subjects[i] as SubjectEntry;
    for (let j = i + 1; j < subjects.length; j += 1) {
      const right = subjects[j] as SubjectEntry;
      if (left.subjectKey === right.subjectKey) continue;
      if (isKeyPrefix(left.subjectKey, right.subjectKey)) continue;
      if (declaredRelated(left, right)) continue;
      const similarity = tokenSetJaccard(
        subjectWords(left),
        subjectWords(right),
      );
      if (similarity >= SUBJECT_DUPLICATE_JACCARD) {
        pairs.push({
          left,
          right,
          similarity: Math.round(similarity * 1000) / 1000,
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
    ({ left, right, similarity }) => ({
      rule: SUBJECT_DUPLICATE_RULE,
      entityId: left.id,
      description: `Subjects ${left.subjectKey} (${left.id}) and ${right.subjectKey} (${right.id}) read as one thing defined twice (word similarity ${similarity}), so requirements about it are split across two subjects that never meet`,
      suggestion: `If they are one subject, keep one subject fact, point every constrains link, claim anchor and subject_key at its key and archive the other. If they differ, add the other key to distinct_from on either fact (or part_of or kind_of when one is a part or kind of the other) and say in its definition how they differ`,
      source: left.path,
      evidence: {
        subjectKey: left.subjectKey,
        other: right.subjectKey,
        otherId: right.id,
        similarity,
      },
    }),
  );
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
  ];
}

/** Read the authored entities once and evaluate the selected rules. */
export function collectSubjectLayerViolations(
  rules: ReadonlySet<string>,
  workspaceRoot: string,
): Violation[] {
  if (!SUBJECT_LAYER_RULES.some((rule) => rules.has(rule))) return [];
  const entities = listContextAuthoredEntities(workspaceRoot);
  return evaluateSubjectLayer(
    entities,
    authoredSupersededIds(workspaceRoot, entities),
    rules,
  );
}
