// implements REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1, REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1, REQ-opencode-kibi-plugin-v1
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  type EntitySummary,
  type FactClaim,
  type IndexedSymbol,
  readEntitySummary,
} from "./knowledge-index.js";
import type { RequirementHead } from "./requirement-candidates.js";

/**
 * Progressive-disclosure snippets shared by every host adapter.
 *
 * Each snippet is the first layer only: requirement IDs with titles, the
 * symbols that link them, what the lead requirement must keep true and the
 * decision behind it (edits only), and the exact follow-up call that opens the
 * next layer. Text is phrased as project facts rather than instructions (hosts
 * may treat imperative out-of-band text as a possible prompt injection) and
 * stays within a small budget so repeated reads never flood the context.
 */

const MAX_REQUIREMENTS = 4;
const MAX_SYMBOLS_PER_REQUIREMENT = 3;
const MAX_TESTS = 3;
const MAX_TITLE = 80;
const MAX_GROUNDING = 2;
const MAX_CLAIM = 160;
/** Files larger than this are not scanned to locate an edit. */
const MAX_FOCUS_SCAN_BYTES = 2 * 1024 * 1024;
// implements REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1
export const MAX_SNIPPET_CHARS = 1200;

// implements REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1
export type LineRange = { start: number; end: number };

// implements REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1
export type Summarize = (entityId: string) => EntitySummary;

// implements REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1
export type SnippetInput = {
  relativePath: string;
  symbols: readonly IndexedSymbol[];
  surface: "read" | "edit";
  /** Lines the tool call targets (edit location or read window). */
  focus?: readonly LineRange[] | undefined;
  summarize: Summarize;
  /** Host context budget for this snippet; defaults to MAX_SNIPPET_CHARS. */
  maxChars?: number | undefined;
};

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

/** A symbol without a line is NaN here, and NaN overlaps nothing. */
function overlaps(symbol: IndexedSymbol, range: LineRange): boolean {
  const line = Number(symbol.line);
  return line <= range.end && Number(symbol.endLine ?? line) >= range.start;
}

/** Lines a focused symbol spans; every focused symbol has a line. */
function span(symbol: IndexedSymbol): number {
  return Number(symbol.endLine ?? symbol.line) - Number(symbol.line);
}

// implements REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1
/** Symbols whose coordinates intersect the focus, innermost first. */
export function focusedSymbols(
  symbols: readonly IndexedSymbol[],
  focus: readonly LineRange[] | undefined,
): IndexedSymbol[] {
  if (!focus) return [];
  return symbols
    .filter((symbol) => focus.some((range) => overlaps(symbol, range)))
    .sort((left, right) => span(left) - span(right));
}

// implements REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1
/**
 * Lines an edit will replace, located in the current file content from the
 * edit's `old_string`/`oldString` (single edits and `edits` lists).
 */
export function editFocus(
  absolutePath: string,
  toolInput: unknown,
): LineRange[] | undefined {
  // Reading a field of a primitive yields undefined; only null and
  // undefined need replacing before fields are read.
  type Fields = Record<string, unknown>;
  const input = (toolInput ?? {}) as Fields;
  // rationale: a placeholder entry in place of no edits is a primitive, whose
  // fields read as undefined, so the empty list cannot be told apart.
  // Stryker disable next-line ArrayDeclaration
  const edits: unknown[] = Array.isArray(input.edits) ? input.edits : [];
  const usable = [input, ...edits.map((edit) => (edit ?? {}) as Fields)]
    .flatMap((record) => [record.old_string, record.oldString])
    .filter(
      (needle): needle is string =>
        typeof needle === "string" && needle.length > 0,
    );
  // rationale: without needles the scan below finds nothing either; the
  // early return only saves reading the file.
  // Stryker disable next-line ConditionalExpression
  if (usable.length === 0) return undefined;

  let content: string;
  try {
    if (fs.statSync(absolutePath).size > MAX_FOCUS_SCAN_BYTES) return undefined;
    content = fs.readFileSync(absolutePath, "utf8");
  } catch {
    return undefined;
  }

  const ranges: LineRange[] = [];
  for (const needle of usable) {
    const offset = content.indexOf(needle);
    if (offset < 0) continue;
    const start = content.slice(0, offset).split("\n").length;
    ranges.push({ start, end: start + needle.split("\n").length - 1 });
  }
  return ranges.length > 0 ? ranges : undefined;
}

function formatList(items: readonly string[], limit: number): string {
  const shown = items.slice(0, limit).join(", ");
  return items.length > limit ? `${shown} +${items.length - limit}` : shown;
}

const RETIRED_STATUS = /supersed|deprecat|reject|obsolete|retired/i;

// implements REQ-agent-core-edit-snippets, REQ-claude-code-kibi-plugin-v1, REQ-opencode-kibi-plugin-v1
/** True for a status that marks an entity as no longer current policy. */
export function isRetiredStatus(status: string | undefined): boolean {
  // `String(undefined)` is "undefined", which names no retired status.
  return RETIRED_STATUS.test(String(status));
}

// implements REQ-agent-core-edit-snippets, REQ-claude-code-kibi-plugin-v1, REQ-opencode-kibi-plugin-v1, REQ-kb-decision-firmness, REQ-kb-decision-firmness-from-origin
/**
 * `ID (status) [firmness]: title`, with the status shown only when it is
 * retired and the firmness only on a current decision: `[firm: ask before
 * changing]` says what a firm rule asks of the agent where it reads it, and
 * `[exploratory]` marks a guess. An unlabeled current decision is `default`,
 * an agent's choice.
 */
export function describeEntity(summary: EntitySummary): string {
  const retired = isRetiredStatus(summary.status) ? ` (${summary.status})` : "";
  // A retired decision binds nothing, however firmly it was once made.
  const firmness =
    !retired &&
    (summary.firmness === "firm" || summary.firmness === "exploratory")
      ? summary.firmness === "firm"
        ? " [firm: ask before changing]"
        : " [exploratory]"
      : "";
  const notable = `${retired}${firmness}`;
  const title = displayTitle(summary);
  return title
    ? `${summary.id}${notable}: ${truncate(title, MAX_TITLE)}`
    : `${summary.id}${notable}`;
}

/**
 * The title, completed from the statement when an older title was cut at a
 * dot inside a name ("...call console" for "...call console.log").
 */
function displayTitle(summary: EntitySummary): string | undefined {
  const { title, statement } = summary;
  if (!title || !statement?.startsWith(title)) return title;
  const rest = statement.slice(title.length);
  if (!/^\.\S/.test(rest)) return title;
  const end = rest.search(/[.!?](?:\s|$)/);
  // The rest starts with a dot and a non-space, so a stop is never at 0.
  return end === -1 ? statement : statement.slice(0, title.length + end);
}

function jsonString(value: string): string {
  return JSON.stringify(value);
}

// implements REQ-claude-code-kibi-plugin-v1, REQ-codex-kibi-plugin-v1, REQ-kb-unowned-file-candidates, REQ-claude-request-topic-candidates
/**
 * Discovery note for a source file none of whose symbols implement a
 * requirement. No link is not no rule, so the note names the current
 * requirements whose titles share the path's words, when there are any.
 */
export function unownedSourceNote(
  relativePath: string,
  candidates: readonly RequirementHead[] = [],
): string {
  const head = `Kibi: no symbol in ${relativePath} is linked to a requirement yet; that does not mean no recorded rule covers the behavior it implements.`;
  const search = `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) surfaces requirements that may already describe it; new behavior is recorded with kb_upsert (requirement + scenario + symbol implements link) as part of the change.`;
  // Fewer candidates rather than a note over the snippet budget.
  for (let shown = candidates.length; shown > 0; shown--) {
    const named = candidates
      .slice(0, shown)
      .map(
        (candidate) =>
          `${candidate.id}: ${truncate(candidate.title, MAX_TITLE)}`,
      );
    const note = [
      head,
      `Requirements whose titles share words with this path or the request: ${named.join("; ")}. kb_query({id:${jsonString((candidates[0] as RequirementHead).id)}}) shows whether one describes the behavior being changed; one that does is traced by an implements link from the symbol that implements it (for markup, the component that renders it).`,
      search,
    ].join("\n");
    if (note.length <= MAX_SNIPPET_CHARS) return note;
  }
  if (candidates.length > 0) return [head, search].join("\n");
  // implements REQ-claude-request-topic-candidates
  // Nothing found is not an all-clear: say that nothing recorded is known to
  // cover the file, and that what this change decides for it is recorded now.
  return [
    head,
    "No requirement title matches this file, so nothing recorded is known to cover it.",
    `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) finds a rule recorded under other words. A decision this change makes for this code (a rule the person states, a limit, who may do what) is recorded with kb_upsert (requirement + scenario + symbol implements link) before the work is reported done.`,
  ].join("\n");
}

// implements REQ-kibi-hooks-flow-manifest, REQ-claude-code-kibi-plugin-v1, REQ-codex-kibi-plugin-v1
/** Shown instead of the discovery note when the manifest itself could not be read. */
export function unreadableManifestNote(relativePath: string): string {
  return [
    "Kibi: the hook could not read .kb/symbols.yaml, so requirement snippets are unavailable this session.",
    `kb_query({sourceFile:${jsonString(relativePath)}}) still lists what ${relativePath} implements; \`kibi sync\` rewrites the manifest in the canonical block layout.`,
  ].join("\n");
}

/** The impact-check line that closes every edit snippet. */
function impactCheckLine(relativePath: string): string {
  return `Behavior changes here are traced to these requirements; kb_check({sourceFiles:[${jsonString(relativePath)}], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports ownership drift after the edit.`;
}

// implements REQ-agent-core-edit-snippets, REQ-claude-code-kibi-plugin-v1, REQ-opencode-kibi-plugin-v1
/** Link types through which a requirement is grounded in semantic facts. */
export const GROUNDING_LINK_TYPES: readonly string[] = [
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
];

/** Set-valued properties whose claim reads as a verb on the members. */
const PROPERTY_VERBS: Readonly<Record<string, string>> = {
  calls: "call",
  imports: "import",
  reads: "read",
  uses: "use",
  throws: "throw",
};

/** How a scalar or set property is constrained, by fact operator. */
const OPERATOR_PHRASES: Readonly<Record<string, string>> = {
  eq: "must be",
  neq: "must not be",
  lt: "must be less than",
  lte: "must be at most",
  gt: "must be greater than",
  gte: "must be at least",
  matches: "must match",
  includes: "must include",
  subset_of: "must be within",
  excludes: "must not include",
};

function joinMembers(values: readonly string[], conjunction: string): string {
  // Claims always carry at least one member here.
  if (values.length === 1) return values[0] as string;
  return `${values.slice(0, -1).join(", ")} ${conjunction} ${values.at(-1)}`;
}

const MODAL =
  /^(.{1,100}?)\s+(?:must|may|can|cannot|should|shall|will|never)\b/i;

/** The claim's own subject words, before its modal verb, else the key's. */
function subjectPhrase(claim: FactClaim): string | undefined {
  // `String(undefined)` has no modal verb.
  const spoken = MODAL.exec(String(claim.claimText))?.[1];
  if (spoken) return spoken;
  return claim.subjectKey?.replace(/[._]+/g, " ").trim() || undefined;
}

// implements REQ-agent-core-edit-snippets
/**
 * A property fact as a sentence naming its operator and members ("The greet
 * function must not call console.log"); a predicate or rule fact as the
 * claim text it models. Undefined for a subject fact and for a fact without
 * readable fields.
 */
export function factClaimSentence(summary: EntitySummary): string | undefined {
  const claim = summary.claim;
  if (!claim || claim.factKind === "subject") return undefined;
  const values = claim.values ?? [];
  if (claim.propertyKey && claim.operator && values.length > 0) {
    const subject = subjectPhrase(claim);
    if (!subject) return claim.claimText;
    const verb = PROPERTY_VERBS[claim.propertyKey];
    const verbal = verb
      ? (
          {
            excludes: `must not ${verb} ${joinMembers(values, "or")}`,
            includes: `must ${verb} ${joinMembers(values, "and")}`,
            subset_of: `may ${verb} only ${joinMembers(values, "or")}`,
            eq: `must ${verb} exactly ${joinMembers(values, "and")}`,
          } as Record<string, string>
        )[claim.operator]
      : undefined;
    if (verbal) return `${subject} ${verbal}`;
    const phrase = OPERATOR_PHRASES[claim.operator];
    if (phrase) {
      const property = claim.propertyKey.replace(/_+/g, " ");
      const unit = claim.unit ? ` ${claim.unit}` : "";
      return `${subject}: ${property} ${phrase} ${values.join(", ")}${unit}`;
    }
  }
  return claim.claimText;
}

/** A fact's claim sentence, else its authored title; a subject fact adds nothing. */
function groundingText(summary: EntitySummary): string | undefined {
  if (summary.claim?.factKind === "subject") return undefined;
  return factClaimSentence(summary) ?? summary.title;
}

function withoutClosingStop(text: string): string {
  return text.replace(/[.\s]+$/, "");
}

// implements REQ-agent-core-edit-snippets, REQ-claude-code-kibi-plugin-v1, REQ-opencode-kibi-plugin-v1
/**
 * What a requirement says must stay true and the decision behind it (a
 * linked ADR), read from its frontmatter links and relationship-shard
 * records. Each linked fact is shown as the claim it models, with its
 * operator and members (a fact without typed fields by its title); without
 * one the requirement's own statement is shown. Fact IDs are internal and
 * never shown. A retired requirement is not current policy, so its grounding
 * is not presented as something to keep true.
 */
export function requirementGroundingLines(
  requirementId: string,
  summarize: Summarize,
  options: { maxFacts?: number } = {},
): string[] {
  const maxFacts = options.maxFacts ?? MAX_GROUNDING;
  const requirement = summarize(requirementId);
  if (isRetiredStatus(requirement.status)) return [];
  const links = requirement.links ?? [];
  const facts = [
    ...new Set(
      links
        .filter((link) => GROUNDING_LINK_TYPES.includes(link.type))
        .map((link) => link.target),
    ),
  ];
  const adrs = [
    ...new Set(
      links
        .filter((link) => link.target.startsWith("ADR-"))
        .map((link) => link.target),
    ),
  ];
  const lines: string[] = [];
  if (facts.length > 0) {
    const claims = [
      ...new Set(
        facts
          .map((id) => groundingText(summarize(id)))
          .filter((sentence): sentence is string => Boolean(sentence))
          .map(withoutClosingStop),
      ),
    ];
    const statement = requirement.statement
      ? withoutClosingStop(requirement.statement)
      : undefined;
    const shown =
      claims.length > 0
        ? claims.slice(0, maxFacts)
        : statement
          ? [statement]
          : [];
    const more =
      claims.length > maxFacts ? ` +${claims.length - maxFacts} more` : "";
    if (shown.length > 0) {
      lines.push(
        `${requirementId} must keep true: ${shown.map((claim) => truncate(claim, MAX_CLAIM)).join("; ")}${more}.`,
      );
    }
  }
  const adr = adrs[0];
  if (adr) lines.push(`Decision: ${describeEntity(summarize(adr))}.`);
  return lines;
}

// implements REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1, REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1
/** Requirement IDs a file's symbols implement, in manifest order. */
export function implementedRequirementIds(
  symbols: readonly IndexedSymbol[],
): string[] {
  return [...new Set(symbols.flatMap((symbol) => symbol.implements))];
}

// implements REQ-agent-core-edit-snippets, REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1, REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1, REQ-opencode-kibi-plugin-v1
/**
 * Memoized entity summaries for one hook process: titles, statuses and links
 * are read from the workspace once per entity however often a snippet asks.
 */
export function createEntitySummarizer(workspaceRoot: string): Summarize {
  const summaries = new Map<string, EntitySummary>();
  return (entityId) => {
    let summary = summaries.get(entityId);
    if (!summary) {
      summary = readEntitySummary(workspaceRoot, entityId);
      summaries.set(entityId, summary);
    }
    return summary;
  };
}

/**
 * Requirement -> symbol titles, with the requirement IDs ranked so the focus
 * symbols' owners lead, then the requirements with the most symbols.
 */
function requirementOwners(
  symbols: readonly IndexedSymbol[],
  focus: readonly IndexedSymbol[],
): { owners: Map<string, string[]>; requirementIds: string[] } {
  const owners = new Map<string, string[]>();
  const ordered = new Set([...focus, ...symbols]);
  for (const symbol of ordered) {
    for (const requirement of symbol.implements) {
      const titles = owners.get(requirement) ?? [];
      if (!titles.includes(symbol.title)) titles.push(symbol.title);
      owners.set(requirement, titles);
    }
  }
  const focusOwners = new Set(focus.flatMap((symbol) => symbol.implements));
  const requirementIds = [...owners.keys()].sort((left, right) => {
    const focusOrder =
      Number(focusOwners.has(right)) - Number(focusOwners.has(left));
    return focusOrder !== 0
      ? focusOrder
      : (owners.get(right) as string[]).length -
          (owners.get(left) as string[]).length;
  });
  return { owners, requirementIds };
}

// implements REQ-agent-core-edit-snippets, REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1, REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1
/**
 * Knowledge snippet for a file with requirement-linked symbols, or undefined
 * when the manifest links nothing to it.
 */
export function fileKnowledgeSnippet(input: SnippetInput): string | undefined {
  const { relativePath, symbols, surface, summarize } = input;
  const focus = focusedSymbols(symbols, input.focus);
  const { owners, requirementIds } = requirementOwners(symbols, focus);
  const tests = [
    ...new Set(symbols.flatMap((symbol) => symbol.coveredBy)),
  ].sort();
  const executes = [
    ...new Set(symbols.flatMap((symbol) => symbol.executableFor)),
  ].sort();
  if (owners.size === 0 && tests.length === 0 && executes.length === 0) {
    return undefined;
  }

  const lines: string[] = [
    `Kibi knowledge for ${relativePath} (symbol manifest):`,
  ];
  for (const requirementId of requirementIds.slice(0, MAX_REQUIREMENTS)) {
    const symbolTitles = owners.get(requirementId) as string[];
    lines.push(
      `- ${describeEntity(summarize(requirementId))} — ${formatList(symbolTitles, MAX_SYMBOLS_PER_REQUIREMENT)}`,
    );
  }
  if (requirementIds.length > MAX_REQUIREMENTS) {
    lines.push(
      `- +${requirementIds.length - MAX_REQUIREMENTS} more requirements: kb_query({sourceFile:${jsonString(relativePath)}})`,
    );
  }
  const leadId = requirementIds[0];
  if (surface === "edit" && leadId) {
    lines.push(...requirementGroundingLines(leadId, summarize));
  }
  if (tests.length > 0) {
    lines.push(`Covered by: ${formatList(tests, MAX_TESTS)}.`);
  }
  if (executes.length > 0) {
    lines.push(`Test code for: ${formatList(executes, MAX_TESTS)}.`);
  }

  const primaryFocus = focus[0];
  if (primaryFocus) {
    const owner = primaryFocus.implements[0];
    const verb =
      surface === "edit" ? "The edit is inside" : "These lines are inside";
    lines.push(
      owner
        ? `${verb} ${primaryFocus.title}, which implements ${owner}.`
        : `${verb} ${primaryFocus.title}.`,
    );
  }

  const location = primaryFocus
    ? `{path:${jsonString(relativePath)}, symbol:${jsonString(primaryFocus.title)}}`
    : `{path:${jsonString(relativePath)}}`;
  const next = [
    leadId
      ? `kb_query({id:${jsonString(leadId)}}) returns full requirement text`
      : undefined,
    `kb_search({query:"<topic>", sourceLocations:[${location}]}) answers with governing requirements, facts, decisions, and tests`,
  ].filter((part): part is string => part !== undefined);
  lines.push(`Next layer: ${next.join("; ")}.`);

  if (surface === "edit") lines.push(impactCheckLine(relativePath));

  return truncate(lines.join("\n"), input.maxChars ?? MAX_SNIPPET_CHARS);
}

// implements REQ-claude-code-kibi-plugin-v1
/**
 * Reduced edit snippet for a file whose descriptive snippet (requirements,
 * symbols, tests, next-layer calls) was already shown this session: which
 * symbol the edit lands in, what the lead requirement must keep true and the
 * decision behind it, and the impact check. The descriptive parts are not
 * repeated. Undefined when no symbol of the file implements a requirement
 * and the edit lands in no symbol.
 */
export function editKnowledgeUpdate(input: SnippetInput): string | undefined {
  const { relativePath, symbols, summarize } = input;
  const focus = focusedSymbols(symbols, input.focus);
  const { requirementIds } = requirementOwners(symbols, focus);
  const leadId = requirementIds[0];
  const lines: string[] = [];
  const focused = focusUpdate(relativePath, symbols, input.focus);
  if (focused) {
    lines.push(focused);
  } else if (leadId) {
    lines.push(
      `Kibi: this edit to ${relativePath} changes code that implements ${formatList(requirementIds, 2)}.`,
    );
  }
  if (!leadId) return lines[0];
  lines.push(...requirementGroundingLines(leadId, summarize));
  lines.push(impactCheckLine(relativePath));
  return truncate(lines.join("\n"), input.maxChars ?? MAX_SNIPPET_CHARS);
}

// implements REQ-claude-code-kibi-plugin-v1
/**
 * One-line focus update for a file whose snippet was already shown this
 * session: only the new fact (which symbol the edit lands in) is repeated.
 */
export function focusUpdate(
  relativePath: string,
  symbols: readonly IndexedSymbol[],
  focus: readonly LineRange[] | undefined,
): string | undefined {
  const symbol = focusedSymbols(symbols, focus)[0];
  if (!symbol) return undefined;
  const owners =
    symbol.implements.length > 0
      ? `, which implements ${formatList(symbol.implements, 2)}`
      : "";
  return `Kibi: this edit to ${relativePath} is inside ${symbol.title}${owners}.`;
}

// implements REQ-agent-core-edit-snippets, REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1
export type EditKnowledgeInput = {
  /** Workspace-relative paths the edit call targets, in call order. */
  relativePaths: readonly string[];
  /** Symbols with relationships for a workspace-relative path. */
  symbolsFor: (relativePath: string) => readonly IndexedSymbol[];
  summarize: Summarize;
  /** Where the once-per-session markers live; undefined shows every time. */
  stateDir: string | undefined;
  /** Host session the markers are scoped to. */
  sessionId: string | undefined;
  /** Lines the edit targets in a file, when the host input names them. */
  focusFor?: ((relativePath: string) => LineRange[] | undefined) | undefined;
  /** Most files described in one call (an `apply_patch` may touch many). */
  maxFiles?: number | undefined;
  maxChars?: number | undefined;
  /**
   * Note for a file that gets no snippet (for example an unlinked source
   * file), shown under the same once-per-file-per-session rule.
   */
  noteFor?: ((relativePath: string) => string | undefined) | undefined;
};

// implements REQ-agent-core-edit-snippets, REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1
/**
 * Pre-edit context for hosts without their own snippet memory: the shared
 * edit snippet for each linked file the call targets (or `noteFor`'s note for
 * a file without one), shown once per file per session, at most `maxFiles`
 * per call.
 */
export function editKnowledgeContext(
  input: EditKnowledgeInput,
): string | undefined {
  const snippets: string[] = [];
  for (const relativePath of new Set(input.relativePaths)) {
    if (snippets.length >= (input.maxFiles ?? 3)) break;
    const symbols = input.symbolsFor(relativePath);
    // A file without symbols has no snippet.
    const snippet = fileKnowledgeSnippet({
      relativePath,
      symbols,
      surface: "edit",
      focus: input.focusFor?.(relativePath),
      summarize: input.summarize,
      maxChars: input.maxChars,
    });
    const text = snippet ?? input.noteFor?.(relativePath);
    if (!text) continue;
    const key = `${String(input.sessionId)}\u0000edit\u0000${relativePath}`;
    if (!claimSnippetSlot(input.stateDir, key)) continue;
    snippets.push(text);
  }
  return snippets.length > 0 ? snippets.join("\n\n") : undefined;
}

// implements REQ-agent-core-edit-snippets, REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1
/**
 * Claim the one-time slot for `key` under `stateDir`: true the first time a
 * key is claimed, false afterwards. The marker is created exclusively, so
 * hooks for parallel tool calls never both show the same snippet. Without a
 * state directory every call is a first time.
 */
export function claimSnippetSlot(
  stateDir: string | undefined,
  key: string,
): boolean {
  if (!stateDir) return true;
  const marker = path.join(
    stateDir,
    "shown-snippets",
    createHash("sha256").update(key).digest("hex").slice(0, 32),
  );
  try {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, "", { flag: "wx" });
    return true;
  } catch {
    // An existing marker means the snippet was already shown; an unwritable
    // state directory also stays quiet rather than repeating the snippet on
    // every call.
    return false;
  }
}
