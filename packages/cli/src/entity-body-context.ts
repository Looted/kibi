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
 * Entity Markdown bodies carry human and agent context next to, not inside,
 * the checked meaning. This module is the one place that knows which body
 * text is context, so the extractor, the strict check, compile-intent,
 * bootstrap, the migration and search all agree.
 */

/** Heading words whose sections hold context rather than normative text. */
// implements REQ-kb-entity-body-context
export const CONTEXT_HEADING_WORDS = [
  "context",
  "rationale",
  "why",
  "background",
  "source",
  "notes",
  "evidence",
] as const;

/** A context section needs at least this many words of prose. */
// implements REQ-kb-entity-body-context
export const MIN_CONTEXT_WORDS = 12;

/** Token-set Jaccard at or above this value counts as a restatement. */
// implements REQ-kb-entity-body-context
export const RESTATEMENT_JACCARD = 0.8;

/** Tag that marks legacy entities acknowledged as lacking context. */
// implements REQ-kb-entity-body-context
export const CONTEXT_MISSING_TAG = "review:context-missing";

const HEADING_LINE = /^\s{0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const CONTEXT_HEADING = new RegExp(
  `^(?:${CONTEXT_HEADING_WORDS.join("|")})\\b`,
  "i",
);

/** One body section; the preamble before the first heading has level 0. */
// implements REQ-kb-entity-body-context
export type BodySection = Readonly<{
  level: number;
  heading: string;
  /** Prose lines under the heading, up to the next heading. */
  text: string;
  isContext: boolean;
}>;

/** True when a heading's text starts with a context heading word. */
// implements REQ-kb-entity-body-context
export function isContextHeading(heading: string): boolean {
  return CONTEXT_HEADING.test(heading.trim().replace(/^[*_`\s]+/, ""));
}

type ClassifiedLine = Readonly<{
  line: string;
  /** Heading level, or 0 for prose. */
  level: number;
  heading: string;
  inContext: boolean;
}>;

/**
 * Classify every line of a body. A line under a context heading stays in
 * context until the next heading of the same or a higher level, so
 * `### Constraints` below `## Context` is still context.
 */
function classifyLines(body: string): ClassifiedLine[] {
  const classified: ClassifiedLine[] = [];
  let contextLevel: number | null = null;
  for (const line of body.replace(/\r\n?/g, "\n").split("\n")) {
    const match = HEADING_LINE.exec(line);
    if (match === null) {
      classified.push({
        line,
        level: 0,
        heading: "",
        inContext: contextLevel !== null,
      });
      continue;
    }
    const level = match[1]?.length ?? 1;
    const heading = (match[2] ?? "").replace(/[ \t]+#+$/, "").trim();
    if (contextLevel !== null && level <= contextLevel) contextLevel = null;
    if (contextLevel === null && isContextHeading(heading)) {
      contextLevel = level;
    }
    classified.push({ line, level, heading, inContext: contextLevel !== null });
  }
  return classified;
}

/** Split a Markdown body (front matter removed) into sections by ATX headings. */
// implements REQ-kb-entity-body-context
export function parseBodySections(body: string): BodySection[] {
  const sections: BodySection[] = [];
  let current: { level: number; heading: string; isContext: boolean } = {
    level: 0,
    heading: "",
    isContext: false,
  };
  let lines: string[] = [];
  const flush = () => {
    const text = lines.join("\n").trim();
    if (current.level > 0 || text !== "") sections.push({ ...current, text });
    lines = [];
  };
  for (const row of classifyLines(body)) {
    if (row.level === 0) {
      lines.push(row.line);
      continue;
    }
    flush();
    current = {
      level: row.level,
      heading: row.heading,
      isContext: row.inContext,
    };
  }
  flush();
  return sections;
}

/**
 * The body with every line of its context sections removed (other lines are
 * untouched), for deriving the checked meaning.
 */
// implements REQ-kb-entity-body-context
export function withoutContextSections(body: string): string {
  return classifyLines(body)
    .filter((row) => !row.inContext)
    .map((row) => row.line)
    .join("\n");
}

/** Text of the context sections of a body, headings excluded. */
// implements REQ-kb-entity-body-context
export function contextSectionText(body: string): string {
  return parseBodySections(body)
    .filter((section) => section.isContext && section.text !== "")
    .map((section) => section.text)
    .join("\n\n");
}

/** The entity fields the context rules read. */
// implements REQ-kb-entity-body-context
export type ContextEntity = Readonly<{
  title?: unknown;
  semantic_text?: unknown;
  fact_kind?: unknown;
}>;

/** Types whose entities must carry body context. */
// implements REQ-kb-entity-body-context
export const CONTEXT_REQUIRED_TYPES = [
  "req",
  "scenario",
  "test",
  "adr",
  "fact",
] as const;

/**
 * True when the type needs no body context: symbols, flags and events, and
 * facts of any fact_kind other than observation or meta (their front matter
 * is the content).
 */
// implements REQ-kb-entity-body-context
export function isContextExempt(type: string, entity: ContextEntity): boolean {
  if (type === "fact") {
    return entity.fact_kind !== "observation" && entity.fact_kind !== "meta";
  }
  return !(CONTEXT_REQUIRED_TYPES as readonly string[]).includes(type);
}

function proseWithoutHeadings(body: string): string {
  return parseBodySections(body)
    .map((section) => section.text)
    .filter((text) => text !== "")
    .join("\n");
}

/**
 * The body prose that counts as context. Requirements: only text under
 * context headings. Scenarios, tests, ADRs and observation or meta facts:
 * all body prose outside headings.
 */
// implements REQ-kb-entity-body-context
export function contextProse(
  type: string,
  body: string,
  _entity: ContextEntity = {},
): string {
  return type === "req" ? contextSectionText(body) : proseWithoutHeadings(body);
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token !== "");
}

/** Normalized token-set Jaccard similarity of two texts (0 when both empty). */
// implements REQ-kb-entity-body-context
export function tokenSetJaccard(left: string, right: string): number {
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

// implements REQ-kb-entity-body-context
export type ContextAssessment = Readonly<{
  ok: boolean;
  /** Why the context does not count; absent when it does. */
  reason?: "none" | "too_short" | "restatement";
  words: number;
}>;

/**
 * Judge an entity's body context: at least MIN_CONTEXT_WORDS words of
 * context prose that do not restate the title (or, for requirements, the
 * semantic text). Exempt types always pass.
 */
// implements REQ-kb-entity-body-context
export function assessContext(
  type: string,
  body: string,
  entity: ContextEntity,
): ContextAssessment {
  if (isContextExempt(type, entity)) return { ok: true, words: 0 };
  const prose = contextProse(type, body, entity);
  const words = tokens(prose).length;
  if (words === 0) return { ok: false, reason: "none", words };
  if (words < MIN_CONTEXT_WORDS)
    return { ok: false, reason: "too_short", words };
  const references = [
    typeof entity.title === "string" ? entity.title : "",
    type === "req" && typeof entity.semantic_text === "string"
      ? entity.semantic_text
      : "",
  ].filter((text) => text.trim() !== "");
  if (
    references.some(
      (reference) => tokenSetJaccard(prose, reference) >= RESTATEMENT_JACCARD,
    )
  ) {
    return { ok: false, reason: "restatement", words };
  }
  return { ok: true, words };
}

/** True when the entity's body states context that is not a restatement. */
// implements REQ-kb-entity-body-context
export function hasContext(
  type: string,
  body: string,
  entity: ContextEntity,
): boolean {
  return assessContext(type, body, entity).ok;
}

const TYPE_LABEL: Record<string, string> = {
  req: "requirement",
  scenario: "scenario",
  test: "test",
  adr: "ADR",
  fact: "observation fact",
};

// implements REQ-kb-entity-body-context
export type ContextFinding = Readonly<{
  type: string;
  id: string;
  reason: NonNullable<ContextAssessment["reason"]>;
  words: number;
  description: string;
  suggestion: string;
}>;

/**
 * The finding for an entity whose body lacks context, or null when it has
 * context, is exempt, or is tagged review:context-missing. The strict check
 * and the kb_upsert warning share it.
 */
// implements REQ-kb-entity-body-context
export function contextFinding(
  type: string,
  id: string,
  body: string,
  entity: ContextEntity & Readonly<{ tags?: unknown }>,
): ContextFinding | null {
  const assessment = assessContext(type, body, entity);
  if (assessment.ok || assessment.reason === undefined) return null;
  if (Array.isArray(entity.tags) && entity.tags.includes(CONTEXT_MISSING_TAG)) {
    return null;
  }
  return {
    type,
    id,
    reason: assessment.reason,
    words: assessment.words,
    description: `${TYPE_LABEL[type] ?? type} ${id} has no body context: ${missingContextDescription(type, assessment.reason)}`,
    suggestion: CONTEXT_MISSING_HINT,
  };
}

/** True when the entity's tags acknowledge missing context as legacy. */
// implements REQ-kb-entity-body-context
export function isContextAcknowledged(tags: unknown): boolean {
  return Array.isArray(tags) && tags.includes(CONTEXT_MISSING_TAG);
}

/** What is missing for a type, in the words the check and warnings use. */
// implements REQ-kb-entity-body-context
export function missingContextDescription(
  type: string,
  reason: ContextAssessment["reason"],
): string {
  const where =
    type === "req"
      ? "a '## Context' (or Rationale, Why, Background, Source, Notes, Evidence) section"
      : "body prose";
  const what =
    reason === "restatement"
      ? "only restates the title or statement"
      : reason === "too_short"
        ? `is shorter than ${MIN_CONTEXT_WORDS} words`
        : "is missing";
  return `${where} that states why this exists ${what}`;
}

/** Hint shared by the check finding and the kb_upsert warning. */
// implements REQ-kb-entity-body-context
export const CONTEXT_MISSING_HINT =
  "Add a '## Context' section (requirements) or a prose body (scenarios, tests, ADRs, observation facts) stating why this exists, who asked, the source and anything that does not fit the front matter. Never invent a reason the requester did not give: write 'Reason not stated' instead and leave the entity tagged review:context-missing until a person answers.";

/** Where an entity's statement came from, for the `## Source` section. */
// implements REQ-kb-entity-body-context
export type BodySource = Readonly<{
  /** Verbatim text from the source; rendered as a blockquote. */
  excerpt?: string | undefined;
  /** Human title of the source (a ticket, page or document). */
  title?: string | undefined;
  /** Locator of the source (URL, ticket id, path). */
  reference?: string | undefined;
}>;

function blockquote(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split("\n")
    .map((line) => (line.trim() === "" ? ">" : `> ${line}`))
    .join("\n");
}

/**
 * Render a requirement body: the statement, then `## Context` and
 * `## Source` when given. The statement stays the first, heading-free block
 * so it remains the derived meaning when no `semantic_text` is pinned.
 */
// implements REQ-kb-entity-body-context
export function renderRequirementBody(input: {
  statement: string;
  context?: string | undefined;
  source?: BodySource | undefined;
}): string {
  const blocks = [input.statement.trim()];
  const context = input.context?.trim();
  if (context) blocks.push(`## Context\n\n${context}`);
  const source = input.source;
  const sourceLines: string[] = [];
  const excerpt = source?.excerpt?.trim();
  if (excerpt) sourceLines.push(blockquote(excerpt));
  const reference = [source?.title?.trim(), source?.reference?.trim()]
    .filter((part): part is string => part !== undefined && part !== "")
    .join(" - ");
  if (reference) sourceLines.push(`Source: ${reference}`);
  if (sourceLines.length > 0) {
    blocks.push(`## Source\n\n${sourceLines.join("\n\n")}`);
  }
  return `${blocks.join("\n\n")}\n`;
}

function firstLine(text: string): string | undefined {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

/**
 * The line a search row shows for a body: the first line of the context
 * prose when the body has any, else the first non-blank body line. With a
 * statement-only body the first line would repeat the title.
 */
// implements REQ-kb-entity-body-context
export function bodySnippetLine(
  type: string,
  body: string,
  entity: ContextEntity = {},
): string | undefined {
  return firstLine(contextProse(type, body, entity)) ?? firstLine(body);
}
