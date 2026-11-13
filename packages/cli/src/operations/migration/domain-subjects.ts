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
import {
  type SubjectVocabularyEntry,
  rankSubjectCandidates,
} from "kibi-plugin-builtin";
import {
  type AuthoredEntity,
  authoredSupersededIds,
  listContextAuthoredEntities,
} from "../../public/operations/entity-context.js";
import {
  type SubjectEntry,
  activeSubjects,
  assessDefinition,
  subjectDuplicatePairs,
  templatedDefinitionIds,
} from "../../public/operations/subject-layer.js";
import { claimNeedsSubjects } from "../mutation/subject-warnings.js";
import { readText, writeFileAtomically } from "./kb-sources.js";

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
export const DOMAIN_SUBJECTS_SCHEMA_VERSION = 16;

/** Migration action code of a suggested claim anchor (approvable). */
export const CLAIM_SUBJECT_ANCHOR_SUGGEST_CODE = "claim_subject_anchor_suggest";
/** Migration action code of a claim no defined subject matches. */
export const CLAIM_SUBJECT_ANCHOR_REVIEW_CODE = "claim_subject_anchor_review";
/** Migration action code of a subject fact without a definition. */
export const SUBJECT_DEFINITION_REVIEW_CODE = "subject_definition_review";
/** Migration action code of two subject facts that read as one. */
export const SUBJECT_DUPLICATE_REVIEW_CODE = "subject_duplicate_review";

export const CLAIM_SUBJECT_ANCHOR_ACTION_PREFIX = "claim-subject-anchor-";
export const SUBJECT_DEFINITION_ACTION_PREFIX = "subject-definition-";
export const SUBJECT_DUPLICATE_ACTION_PREFIX = "subject-duplicate-";

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
  /** Defined subjects the claim's words match, best first; may be empty. */
  candidates: readonly Readonly<{
    subjectKey: string;
    title?: string;
    score: number;
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
  const vocabulary = vocabularyOf(activeSubjects(entities, superseded));
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
        candidates: rankSubjectCandidates(claimText, vocabulary, {
          limit: ANCHOR_CANDIDATES,
        }).map((candidate) => ({
          subjectKey: candidate.subjectKey,
          ...(candidate.title === undefined ? {} : { title: candidate.title }),
          score: candidate.score,
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
    return templated.has(subject.id) ? [{ ...subject, reason: "template" }] : [];
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

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * The front matter lines of a requirement with `subjects` added to one
 * inventory entry, or an error. Only lines are inserted; none is changed.
 */
export function withClaimSubjects(
  content: string,
  claimKey: string,
  subjects: readonly string[],
): string {
  const lines = content.split("\n");
  const close = lines.indexOf("---", 1);
  if (lines[0] !== "---" || close < 0)
    throw new Error("the file has no front matter");
  const start = lines.findIndex(
    (line, index) =>
      index < close &&
      /^\s*- claim_key:\s*/.test(line) &&
      line.replace(/^\s*- claim_key:\s*/, "").replace(/^['"]|['"]$/g, "") ===
        claimKey,
  );
  if (start < 0)
    throw new Error(`no inventory entry has claim_key ${claimKey}`);
  const fieldIndent = indentOf(lines[start] as string) + 2;
  let end = start + 1;
  while (
    end < close &&
    (lines[end] as string).trim() !== "" &&
    indentOf(lines[end] as string) >= fieldIndent
  )
    end += 1;
  const fields = lines
    .slice(start + 1, end)
    .filter((line) => indentOf(line) === fieldIndent);
  if (fields.some((line) => /^\s*subjects:/.test(line)))
    throw new Error(`inventory entry ${claimKey} already names subjects`);
  const pad = " ".repeat(fieldIndent);
  return [
    ...lines.slice(0, end),
    `${pad}subjects:`,
    ...subjects.map((subject) => `${pad}  - ${subject}`),
    ...lines.slice(end),
  ].join("\n");
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
