// implements REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1, REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1, REQ-opencode-kibi-plugin-v1
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  type EntitySummary,
  type IndexedSymbol,
  readEntitySummary,
} from "./knowledge-index.js";

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

function overlaps(symbol: IndexedSymbol, range: LineRange): boolean {
  if (symbol.line === undefined) return false;
  const end = symbol.endLine ?? symbol.line;
  return symbol.line <= range.end && end >= range.start;
}

// implements REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1
/** Symbols whose coordinates intersect the focus, innermost first. */
export function focusedSymbols(
  symbols: readonly IndexedSymbol[],
  focus: readonly LineRange[] | undefined,
): IndexedSymbol[] {
  if (!focus || focus.length === 0) return [];
  return symbols
    .filter((symbol) => focus.some((range) => overlaps(symbol, range)))
    .sort(
      (left, right) =>
        (left.endLine ?? left.line ?? 0) -
        (left.line ?? 0) -
        ((right.endLine ?? right.line ?? 0) - (right.line ?? 0)),
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  if (!isRecord(toolInput)) return undefined;
  const needles: string[] = [];
  const collect = (record: Record<string, unknown>) => {
    for (const key of ["old_string", "oldString"]) {
      const value = record[key];
      if (typeof value === "string") needles.push(value);
    }
  };
  collect(toolInput);
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (isRecord(edit)) collect(edit);
    }
  }
  const usable = needles.filter((needle) => needle.length > 0);
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
  return status !== undefined && RETIRED_STATUS.test(status);
}

// implements REQ-agent-core-edit-snippets, REQ-claude-code-kibi-plugin-v1, REQ-opencode-kibi-plugin-v1
/** `ID (status): title`, with the status shown only when it is retired. */
export function describeEntity(summary: EntitySummary): string {
  const notable = isRetiredStatus(summary.status) ? ` (${summary.status})` : "";
  return summary.title
    ? `${summary.id}${notable}: ${truncate(summary.title, MAX_TITLE)}`
    : `${summary.id}${notable}`;
}

function jsonString(value: string): string {
  return JSON.stringify(value);
}

// implements REQ-agent-core-edit-snippets, REQ-claude-code-kibi-plugin-v1, REQ-opencode-kibi-plugin-v1
/** Link types through which a requirement is grounded in semantic facts. */
export const GROUNDING_LINK_TYPES: readonly string[] = [
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
];

// implements REQ-agent-core-edit-snippets, REQ-claude-code-kibi-plugin-v1, REQ-opencode-kibi-plugin-v1
/**
 * What a requirement says must stay true (its linked facts) and the decision
 * behind it (a linked ADR), read from its frontmatter links and
 * relationship-shard records. A retired requirement is not current policy, so
 * its grounding is not presented as something to keep true.
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
    const shown = facts
      .slice(0, maxFacts)
      .map((id) => describeEntity(summarize(id)));
    const more = facts.length > maxFacts ? ` +${facts.length - maxFacts}` : "";
    lines.push(`${requirementId} must keep true: ${shown.join("; ")}${more}.`);
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

// implements REQ-agent-core-edit-snippets, REQ-claude-code-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1, REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1
/**
 * Knowledge snippet for a file with requirement-linked symbols, or undefined
 * when the manifest links nothing to it.
 */
export function fileKnowledgeSnippet(input: SnippetInput): string | undefined {
  const { relativePath, symbols, surface, summarize } = input;
  const focus = focusedSymbols(symbols, input.focus);

  // Requirement -> symbol titles, focus symbols first so their owners lead.
  const owners = new Map<string, string[]>();
  const ordered = [
    ...focus,
    ...symbols.filter((symbol) => !focus.includes(symbol)),
  ];
  for (const symbol of ordered) {
    for (const requirement of symbol.implements) {
      const titles = owners.get(requirement) ?? [];
      if (!titles.includes(symbol.title)) titles.push(symbol.title);
      owners.set(requirement, titles);
    }
  }
  const tests = [
    ...new Set(symbols.flatMap((symbol) => symbol.coveredBy)),
  ].sort();
  const executes = [
    ...new Set(symbols.flatMap((symbol) => symbol.executableFor)),
  ].sort();
  if (owners.size === 0 && tests.length === 0 && executes.length === 0) {
    return undefined;
  }

  const focusOwners = new Set(focus.flatMap((symbol) => symbol.implements));
  const requirementIds = [...owners.keys()].sort((left, right) => {
    const focusOrder =
      Number(focusOwners.has(right)) - Number(focusOwners.has(left));
    return focusOrder !== 0
      ? focusOrder
      : (owners.get(right)?.length ?? 0) - (owners.get(left)?.length ?? 0);
  });

  const lines: string[] = [
    `Kibi knowledge for ${relativePath} (symbol manifest):`,
  ];
  for (const requirementId of requirementIds.slice(0, MAX_REQUIREMENTS)) {
    const symbolTitles = owners.get(requirementId) ?? [];
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

  if (surface === "edit") {
    lines.push(
      `Behavior changes here are traced to these requirements; kb_check({sourceFiles:[${jsonString(relativePath)}], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports ownership drift after the edit.`,
    );
  }

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
};

// implements REQ-agent-core-edit-snippets, REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1
/**
 * Pre-edit context for hosts without their own snippet memory: the shared
 * edit snippet for each linked file the call targets, shown once per file per
 * session, at most `maxFiles` per call.
 */
export function editKnowledgeContext(
  input: EditKnowledgeInput,
): string | undefined {
  const snippets: string[] = [];
  for (const relativePath of new Set(input.relativePaths)) {
    if (snippets.length >= (input.maxFiles ?? 3)) break;
    const symbols = input.symbolsFor(relativePath);
    if (symbols.length === 0) continue;
    const snippet = fileKnowledgeSnippet({
      relativePath,
      symbols,
      surface: "edit",
      focus: input.focusFor?.(relativePath),
      summarize: input.summarize,
      maxChars: input.maxChars,
    });
    if (!snippet) continue;
    const key = `${input.sessionId ?? ""}\u0000edit\u0000${relativePath}`;
    if (!claimSnippetSlot(input.stateDir, key)) continue;
    snippets.push(snippet);
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
