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
import { isDeepStrictEqual } from "node:util";
import { load as loadYaml } from "js-yaml";
import {
  type SubjectVocabularyEntry,
  rankSubjectCandidates,
  vocabularyTokens,
} from "kibi-plugin-builtin";
import {
  type AuthoredEntity,
  authoredSupersededIds,
  listContextAuthoredEntities,
} from "../../public/operations/entity-context.js";
import {
  SUBJECT_LAYER_SCHEMA_VERSION,
  type SubjectEntry,
  activeSubjects,
  assessDefinition,
  subjectDuplicatePairs,
  subjectHierarchyViolations,
  templatedDefinitionIds,
} from "../../public/operations/subject-layer.js";
import { readAllShards } from "../../relationships/shards.js";
import { notStatedDefinition } from "../../utils/subject-definition.js";
import { claimNeedsSubjects } from "../mutation/subject-warnings.js";
import {
  readText,
  sliceFrontmatter,
  writeFileAtomically,
} from "./kb-sources.js";

/**
 * The domain subject layer (KB schema 16).
 *
 * From schema 16 a subject fact must define its subject in its body, two
 * active subject facts must not define one thing twice, and every unmodeled
 * normative, condition, exception or definition claim of a current
 * requirement must name the subjects it is about (inventory `subjects`), so
 * requirements on one subject meet. Writing a definition and choosing between
 * duplicates are a person's call; the migration lists them. A claim's
 * subjects are suggested from the subjects its words match, and a person
 * approves each suggestion by id.
 */

/** The KB schema that adds the domain subject layer. */
export const DOMAIN_SUBJECTS_SCHEMA_VERSION = SUBJECT_LAYER_SCHEMA_VERSION;

/** Migration action code of a suggested claim anchor (approvable). */
export const CLAIM_SUBJECT_ANCHOR_SUGGEST_CODE = "claim_subject_anchor_suggest";
/** Migration action code of a claim no defined subject matches. */
export const CLAIM_SUBJECT_ANCHOR_REVIEW_CODE = "claim_subject_anchor_review";
/** Migration action code of a subject fact without a definition. */
export const SUBJECT_DEFINITION_REVIEW_CODE = "subject_definition_review";
/** Migration action code of two subject facts that read as one. */
export const SUBJECT_DUPLICATE_REVIEW_CODE = "subject_duplicate_review";
/** Migration action code of a subject whose part_of, kind_of or distinct_from loop. */
export const SUBJECT_HIERARCHY_REVIEW_CODE = "subject_hierarchy_review";

/**
 * Migration action code that records "Definition not stated" on legacy
 * subject facts without a body (automatic; never replaces authored prose).
 */
export const SUBJECT_DEFINITION_NOT_STATED_CODE =
  "subject_definition_not_stated";
export const SUBJECT_DEFINITION_NOT_STATED_ACTION_ID =
  "subject-definition-not-stated";

export const CLAIM_SUBJECT_ANCHOR_ACTION_PREFIX = "claim-subject-anchor-";
export const SUBJECT_DEFINITION_ACTION_PREFIX = "subject-definition-";
export const SUBJECT_DUPLICATE_ACTION_PREFIX = "subject-duplicate-";
export const SUBJECT_HIERARCHY_ACTION_PREFIX = "subject-hierarchy-";

/** Requirement statuses that govern (kb:current_req). */
const CURRENT_REQUIREMENT_STATUSES = new Set([
  "open",
  "in_progress",
  "closed",
  "active",
  "approved",
]);

/** How many subjects a claim anchor review offers. */
const ANCHOR_CANDIDATES = 3;

/** One unmodeled claim of a current requirement that names no subject. */
export type ClaimAnchorSuggestion = Readonly<{
  requirementId: string;
  path: string;
  claimKey: string;
  claimText: string;
  /** Active subjects the claim's words match, best first; may be empty. */
  candidates: readonly Readonly<{
    subjectKey: string;
    title?: string;
    score: number;
    /**
     * Whether the match is more than one shared word: the claim's subject
     * phrase names a key segment, the claim names every key segment, or it
     * shares two or more words with the key and title.
     */
    strong: boolean;
    /** Whether the subject's body passes subject-definition-missing. */
    defined: boolean;
  }>[];
}>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function inventoryOf(
  entity: AuthoredEntity,
): Readonly<Record<string, unknown>>[] {
  const raw = entity.data.semantic_inventory;
  return Array.isArray(raw)
    ? raw.filter(
        (entry): entry is Readonly<Record<string, unknown>> =>
          entry !== null && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];
}

/** Words that open a claim's predicate: the subject phrase ends before one. */
const PREDICATE_OPENERS = new Set([
  "must",
  "shall",
  "should",
  "may",
  "will",
  "can",
  "cannot",
  "is",
  "are",
  "has",
  "have",
]);

/**
 * The claim's words with identifiers split: camelCase, snake_case and dotted
 * names read as their parts, so exportCsv meets the subject export.csv.
 */
export function claimWords(textValue: string): string {
  return textValue
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[._]/g, " ");
}

/** Content tokens of the claim's subject phrase: the words before its verb. */
function subjectPhraseTokens(words: string): Set<string> {
  const raw = words.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  const cut = raw.findIndex((word) => PREDICATE_OPENERS.has(word));
  return new Set(
    vocabularyTokens((cut < 0 ? raw : raw.slice(0, cut)).join(" ")),
  );
}

/**
 * Whether a subject matches a claim by more than one incidental word: the
 * claim's subject phrase names one of its key segments, the claim names every
 * key segment, or the claim shares two or more words with its key and title.
 */
export function isStrongSubjectMatch(
  claimText: string,
  subject: Readonly<{ subjectKey: string; title?: string }>,
): boolean {
  const words = claimWords(claimText);
  const claim = new Set(vocabularyTokens(words));
  const key = new Set(
    vocabularyTokens(subject.subjectKey.replace(/[._]/g, " ")),
  );
  if (key.size === 0) return false;
  if ([...key].every((token) => claim.has(token))) return true;
  const phrase = subjectPhraseTokens(words);
  if ([...key].some((token) => phrase.has(token))) return true;
  const named = new Set([...key, ...vocabularyTokens(subject.title ?? "")]);
  return [...named].filter((token) => claim.has(token)).length >= 2;
}

function vocabularyOf(
  subjects: readonly SubjectEntry[],
): SubjectVocabularyEntry[] {
  return subjects.map((subject) => ({
    subjectKey: subject.subjectKey,
    title: subject.title,
    factId: subject.id,
  }));
}

/**
 * Every unmodeled anchored claim of a current requirement that names no
 * subject, with the defined subjects its words suggest. Read-only.
 */
export function planClaimSubjectAnchors(
  workspaceRoot: string,
  entities: readonly AuthoredEntity[] = listContextAuthoredEntities(
    workspaceRoot,
  ),
): ClaimAnchorSuggestion[] {
  const superseded = authoredSupersededIds(workspaceRoot, entities);
  const subjects = activeSubjects(entities, superseded);
  const vocabulary = vocabularyOf(subjects);
  const templated = templatedDefinitionIds(subjects);
  const defined = new Set(
    subjects
      .filter(
        (subject) => assessDefinition(subject).ok && !templated.has(subject.id),
      )
      .map((subject) => subject.subjectKey),
  );
  const suggestions: ClaimAnchorSuggestion[] = [];
  for (const entity of entities) {
    if (entity.type !== "req") continue;
    if (!CURRENT_REQUIREMENT_STATUSES.has(text(entity.data.status))) continue;
    if (superseded.has(entity.id)) continue;
    for (const entry of inventoryOf(entity)) {
      if (!claimNeedsSubjects(entry)) continue;
      const claimKey = text(entry.claim_key);
      if (claimKey === "") continue;
      const claimText = text(entry.claim_text);
      suggestions.push({
        requirementId: entity.id,
        path: entity.path,
        claimKey,
        claimText,
        candidates: rankSubjectCandidates(claimWords(claimText), vocabulary, {
          limit: ANCHOR_CANDIDATES,
        }).map((candidate) => ({
          subjectKey: candidate.subjectKey,
          ...(candidate.title === undefined ? {} : { title: candidate.title }),
          score: candidate.score,
          strong: isStrongSubjectMatch(claimText, candidate),
          defined: defined.has(candidate.subjectKey),
        })),
      });
    }
  }
  return suggestions.sort(
    (left, right) =>
      left.requirementId.localeCompare(right.requirementId) ||
      left.claimKey.localeCompare(right.claimKey),
  );
}

/** Active subject facts whose body does not define them. Read-only. */
export function planSubjectDefinitionReviews(
  workspaceRoot: string,
  entities: readonly AuthoredEntity[] = listContextAuthoredEntities(
    workspaceRoot,
  ),
): (SubjectEntry & { reason: string })[] {
  const subjects = activeSubjects(
    entities,
    authoredSupersededIds(workspaceRoot, entities),
  );
  const templated = templatedDefinitionIds(subjects);
  return subjects.flatMap((subject) => {
    const assessment = assessDefinition(subject);
    if (!assessment.ok)
      return [{ ...subject, reason: assessment.reason ?? "none" }];
    return templated.has(subject.id)
      ? [{ ...subject, reason: "template" }]
      : [];
  });
}

/** Pairs of active subject facts that read as one subject. Read-only. */
export function planSubjectDuplicateReviews(
  workspaceRoot: string,
  entities: readonly AuthoredEntity[] = listContextAuthoredEntities(
    workspaceRoot,
  ),
): ReturnType<typeof subjectDuplicatePairs> {
  return subjectDuplicatePairs(
    activeSubjects(entities, authoredSupersededIds(workspaceRoot, entities)),
  );
}

/**
 * Subjects that name themselves under part_of, kind_of or distinct_from, and
 * groups of subjects that sit under each other (subject-hierarchy-invalid).
 * Which link points the wrong way is a person's call. Read-only.
 */
export function planSubjectHierarchyReviews(
  workspaceRoot: string,
  entities: readonly AuthoredEntity[] = listContextAuthoredEntities(
    workspaceRoot,
  ),
): ReturnType<typeof subjectHierarchyViolations> {
  return subjectHierarchyViolations(
    activeSubjects(entities, authoredSupersededIds(workspaceRoot, entities)),
  );
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/** A subject key as a sequence item: plain when it reads back as itself. */
function subjectItem(subject: string): string {
  try {
    const plain = loadYaml(`- ${subject}`);
    if (
      Array.isArray(plain) &&
      plain.length === 1 &&
      plain[0] === subject &&
      !/[\s#:]/.test(subject)
    )
      return subject;
  } catch {
    // Fall through to a quoted scalar.
  }
  return JSON.stringify(subject);
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * The front matter lines of a requirement with `subjects` added to one
 * inventory entry, or an error. Only lines are inserted; none is changed.
 * The edit is parsed back and refused unless it adds exactly that entry's
 * subjects. Line breaks (LF or CRLF), a byte order mark, comments, key order
 * and block scalars are kept.
 */
export function withClaimSubjects(
  content: string,
  claimKey: string,
  subjects: readonly string[],
): string {
  const bom = content.startsWith("\uFEFF") ? "\uFEFF" : "";
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.slice(bom.length).split(/\r?\n/);
  const isFence = (line: string | undefined) =>
    line !== undefined && /^---[ \t]*$/.test(line);
  const close = lines.findIndex((line, index) => index > 0 && isFence(line));
  if (!isFence(lines[0]) || close < 0)
    throw new Error("the file has no front matter");
  const frontMatter = lines.slice(1, close).join("\n");
  let data: unknown;
  try {
    data = loadYaml(frontMatter);
  } catch (error) {
    throw new Error(
      `the front matter does not parse (${(error as Error).message.split("\n")[0]})`,
    );
  }
  const inventory = isMapping(data) ? data.semantic_inventory : undefined;
  const entries = Array.isArray(inventory) ? inventory : [];
  const position = entries.findIndex(
    (entry) => isMapping(entry) && entry.claim_key === claimKey,
  );
  if (position < 0)
    throw new Error(`no inventory entry has claim_key ${claimKey}`);
  const named = (entries[position] as Record<string, unknown>).subjects;
  if (Array.isArray(named) && named.length === 0)
    throw new Error(
      `inventory entry ${claimKey} has an empty subjects list; add the subject to it by hand`,
    );
  if (named !== undefined)
    throw new Error(`inventory entry ${claimKey} already names subjects`);
  // The inventory's items: dash lines at the indent of its first item.
  const key = lines.findIndex(
    (line, index) =>
      index > 0 && index < close && /^semantic_inventory[ \t]*:/.test(line),
  );
  if (key < 0)
    throw new Error("semantic_inventory is not a block at the top level");
  const items: number[] = [];
  let itemIndent = -1;
  let last = key + 1;
  for (let index = key + 1; index < close; index += 1) {
    const line = lines[index] as string;
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const indent = indentOf(line);
    if (itemIndent < 0) {
      if (!trimmed.startsWith("-")) break;
      itemIndent = indent;
    }
    // A top-level key (or anything left of the items) ends the sequence.
    if (indent < itemIndent || (indent === 0 && !trimmed.startsWith("-")))
      break;
    if (indent === itemIndent && /^-(\s|$)/.test(trimmed)) items.push(index);
    last = index + 1;
  }
  const start = items[position];
  if (start === undefined || items.length !== entries.length)
    throw new Error(
      `inventory entry ${claimKey} is not written as a block sequence item`,
    );
  const end = items[position + 1] ?? last;
  const item = lines[start] as string;
  const afterDash = item.slice(itemIndent + 1);
  let fieldIndent: number;
  if (afterDash.trim() === "" || afterDash.trim().startsWith("#")) {
    const next = lines
      .slice(start + 1, end)
      .find((line) => line.trim() !== "" && !line.trim().startsWith("#"));
    if (next === undefined)
      throw new Error(`inventory entry ${claimKey} has no fields`);
    fieldIndent = indentOf(next);
  } else {
    fieldIndent =
      itemIndent + 1 + (afterDash.length - afterDash.trimStart().length);
  }
  if (/^[{[]/.test(lines[start]?.slice(fieldIndent) ?? ""))
    throw new Error(
      `inventory entry ${claimKey} is written in flow style; add subjects by hand`,
    );
  // Insert after the entry's last content line, so a blank line inside a
  // block scalar and trailing blank lines or comments stay where they are.
  let insertAt = start + 1;
  for (let index = start + 1; index < end; index += 1) {
    const line = lines[index] as string;
    const trimmed = line.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("#") && indentOf(line) < fieldIndent) continue;
    insertAt = index + 1;
  }
  const pad = " ".repeat(fieldIndent);
  const nextLines = [
    ...lines.slice(0, insertAt),
    `${pad}subjects:`,
    ...subjects.map((subject) => `${pad}  - ${subjectItem(subject)}`),
    ...lines.slice(insertAt),
  ];
  const nextClose = close + 1 + subjects.length;
  let reread: unknown;
  try {
    reread = loadYaml(nextLines.slice(1, nextClose).join("\n"));
  } catch {
    reread = undefined;
  }
  const expected = structuredClone(data) as Record<string, unknown>;
  (
    (expected.semantic_inventory as Record<string, unknown>[])[
      position
    ] as Record<string, unknown>
  ).subjects = [...subjects];
  if (!isDeepStrictEqual(reread, expected))
    throw new Error(
      `adding subjects to inventory entry ${claimKey} would change more than its subjects; add them by hand`,
    );
  return `${bom}${nextLines.join(eol)}`;
}

/**
 * Anchor one inventory claim to subjects, inserting only the `subjects` lines
 * of that entry. Refuses when the entry is gone or already names subjects.
 */
export function applyClaimSubjectAnchor(
  workspaceRoot: string,
  relativePath: string,
  claimKey: string,
  subjects: readonly string[],
): void {
  if (subjects.length === 0)
    throw new Error(
      `${relativePath}: no subject to anchor ${claimKey} to; add subjects to the entry by hand.`,
    );
  const absolute = path.join(workspaceRoot, relativePath);
  const content = readText(absolute);
  if (content === null)
    throw new Error(
      `${relativePath} cannot be read; rerun kibi migrate and approve the new plan.`,
    );
  let next: string;
  try {
    next = withClaimSubjects(content, claimKey, subjects);
  } catch (error) {
    throw new Error(
      `${relativePath}: ${(error as Error).message}; rerun kibi migrate and approve the new plan.`,
    );
  }
  writeFileAtomically(absolute, next);
}

/** A legacy subject fact without a body, and the gap note it gets. */
export type SubjectDefinitionPlaceholder = Readonly<{
  id: string;
  path: string;
  subjectKey: string;
  body: string;
}>;

/** Requirements that link to each fact through constrains, by fact id. */
function constrainingRequirements(
  workspaceRoot: string,
  entities: readonly AuthoredEntity[],
): Map<string, Set<string>> {
  const byFact = new Map<string, Set<string>>();
  const add = (from: string, to: string) =>
    byFact.set(to, (byFact.get(to) ?? new Set()).add(from));
  for (const entity of entities) {
    if (entity.type !== "req" || !Array.isArray(entity.data.links)) continue;
    for (const link of entity.data.links) {
      const edge = link as { type?: unknown; target?: unknown } | null;
      if (edge?.type === "constrains" && typeof edge.target === "string")
        add(entity.id, edge.target);
    }
  }
  try {
    for (const relationship of readAllShards(path.join(workspaceRoot, ".kb")))
      if (relationship.type === "constrains")
        add(relationship.from, relationship.to);
  } catch {
    // Malformed shards fail sync with their own diagnostic.
  }
  return byFact;
}

/**
 * Active subject facts whose file has no body at all, with the "Definition
 * not stated" note bootstrap and kb_model write on the subjects they create.
 * A body with any text, even a too-short one, is authored and only listed for
 * review. Read-only.
 */
export function planSubjectDefinitionPlaceholders(
  workspaceRoot: string,
  entities: readonly AuthoredEntity[] = listContextAuthoredEntities(
    workspaceRoot,
  ),
): SubjectDefinitionPlaceholder[] {
  const subjects = activeSubjects(
    entities,
    authoredSupersededIds(workspaceRoot, entities),
  );
  const bodies = new Map(entities.map((entity) => [entity.id, entity.body]));
  const constrainedBy = constrainingRequirements(workspaceRoot, entities);
  return subjects
    .filter((subject) => (bodies.get(subject.id) ?? "").trim() === "")
    .map((subject) => {
      const owners = [...(constrainedBy.get(subject.id) ?? [])].sort();
      return {
        id: subject.id,
        path: subject.path,
        subjectKey: subject.subjectKey,
        body: notStatedDefinition(
          subject.subjectKey,
          owners.length > 0
            ? `${owners.length === 1 ? "requirement" : "requirements"} ${owners.join(", ")}, which ${owners.length === 1 ? "links" : "link"} to the subject fact ${subject.id} through constrains`
            : `the subject fact ${subject.id}, recorded before KB schema 16 without a definition`,
        ),
      };
    });
}

/**
 * The document with `body` as its body, or null when it has front matter
 * followed by anything but whitespace (an authored body is never replaced).
 */
export function withNotStatedBody(
  content: string,
  body: string,
): string | null {
  const slice = sliceFrontmatter(content);
  if (slice === null) return null;
  const [fence = "", ...rest] = slice.suffix.split(/\r?\n/);
  if (rest.join("").trim() !== "") return null;
  const text = body.trimEnd().replace(/\n/g, slice.eol);
  return `${slice.prefix}${slice.text}${fence}${slice.eol}${slice.eol}${text}${slice.eol}`;
}

/**
 * Write the "Definition not stated" note on every legacy subject fact
 * without a body. Returns the facts written and those left alone.
 */
export function applySubjectDefinitionPlaceholders(workspaceRoot: string): {
  written: SubjectDefinitionPlaceholder[];
  skipped: { path: string; reason: string }[];
} {
  const written: SubjectDefinitionPlaceholder[] = [];
  const skipped: { path: string; reason: string }[] = [];
  for (const target of planSubjectDefinitionPlaceholders(workspaceRoot)) {
    const absolute = path.join(workspaceRoot, target.path);
    const content = readText(absolute);
    const next =
      content === null ? null : withNotStatedBody(content, target.body);
    if (next === null) {
      skipped.push({
        path: target.path,
        reason: "the file changed or has no front matter",
      });
      continue;
    }
    writeFileAtomically(absolute, next);
    written.push(target);
  }
  return { written, skipped };
}
