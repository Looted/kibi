// implements REQ-claude-code-kibi-plugin-v1
import type { EntitySummary, IndexedSymbol } from "./knowledge-index.js";

/**
 * Progressive-disclosure snippets.
 *
 * Each snippet is the first layer only: requirement IDs with titles, the
 * symbols that link them, and the exact follow-up call that opens the next
 * layer. Text is phrased as project facts rather than instructions (Claude
 * Code treats imperative out-of-band text as a possible prompt injection) and
 * stays within a small budget so repeated reads never flood the context.
 */

const MAX_REQUIREMENTS = 4;
const MAX_SYMBOLS_PER_REQUIREMENT = 3;
const MAX_TESTS = 3;
const MAX_TITLE = 80;
export const MAX_SNIPPET_CHARS = 1200;

export type LineRange = { start: number; end: number };

export type SnippetInput = {
  relativePath: string;
  symbols: readonly IndexedSymbol[];
  surface: "read" | "edit";
  /** Lines the tool call targets (edit location or read window). */
  focus?: readonly LineRange[] | undefined;
  summarize: (entityId: string) => EntitySummary;
};

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function overlaps(symbol: IndexedSymbol, range: LineRange): boolean {
  if (symbol.line === undefined) return false;
  const end = symbol.endLine ?? symbol.line;
  return symbol.line <= range.end && end >= range.start;
}

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

function formatList(items: readonly string[], limit: number): string {
  const shown = items.slice(0, limit).join(", ");
  return items.length > limit ? `${shown} +${items.length - limit}` : shown;
}

function describeEntity(summary: EntitySummary): string {
  const notable =
    summary.status && /supersed|deprecat|reject|obsolete/i.test(summary.status)
      ? ` (${summary.status})`
      : "";
  return summary.title
    ? `${summary.id}${notable}: ${truncate(summary.title, MAX_TITLE)}`
    : `${summary.id}${notable}`;
}

function jsonString(value: string): string {
  return JSON.stringify(value);
}

const FACT_LINK_TYPES = new Set([
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
]);
const MAX_GROUNDING = 2;

/**
 * What the lead requirement says must stay true (its linked facts) and the
 * decision behind it (a linked ADR), read from authored frontmatter links.
 */
function groundingLines(
  requirementId: string,
  summarize: (entityId: string) => EntitySummary,
): string[] {
  const links = summarize(requirementId).links ?? [];
  const facts = [
    ...new Set(
      links
        .filter((link) => FACT_LINK_TYPES.has(link.type))
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
      .slice(0, MAX_GROUNDING)
      .map((id) => describeEntity(summarize(id)));
    const more =
      facts.length > MAX_GROUNDING ? ` +${facts.length - MAX_GROUNDING}` : "";
    lines.push(`${requirementId} must keep true: ${shown.join("; ")}${more}.`);
  }
  const adr = adrs[0];
  if (adr) lines.push(`Decision: ${describeEntity(summarize(adr))}.`);
  return lines;
}

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
    lines.push(...groundingLines(leadId, summarize));
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
  const leadRequirement = requirementIds[0];
  const next = [
    leadRequirement
      ? `kb_query({id:${jsonString(leadRequirement)}}) returns full requirement text`
      : undefined,
    `kb_search({query:"<topic>", sourceLocations:[${location}]}) answers with governing requirements, facts, decisions, and tests`,
  ].filter((part): part is string => part !== undefined);
  lines.push(`Next layer: ${next.join("; ")}.`);

  if (surface === "edit") {
    lines.push(
      `Behavior changes here are traced to these requirements; kb_check({sourceFiles:[${jsonString(relativePath)}], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports ownership drift after the edit.`,
    );
  }

  return truncate(lines.join("\n"), MAX_SNIPPET_CHARS);
}

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

export function unownedSourceNote(relativePath: string): string {
  return [
    `Kibi: no symbol in ${relativePath} is linked to a requirement yet.`,
    `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) surfaces requirements that may already describe it; new behavior is recorded with kb_upsert (requirement + symbol implements link).`,
  ].join("\n");
}

export function searchTip(linkedFileCount: number): string {
  return `Kibi tip: this repository records requirements, scenarios, decisions, and code ownership in a Kibi knowledge base (${linkedFileCount} source files have requirement-linked symbols). For intent questions — why code exists, what it must do — kb_search answers from that knowledge, naming the governing requirements, facts, decisions and tests; kb_query({sourceFile:"<path>"}) lists what a file implements.`;
}

export const DIRECT_KB_ACCESS_NOTE =
  "Kibi: .kb/ holds Kibi-managed knowledge. kb_query/kb_search read it and kb_upsert writes it while keeping the branch store, relationships, and validation consistent; direct file reads miss relationships and direct edits bypass validation.";

export function sessionStartContext(linkedFileCount: number): string {
  return [
    `Kibi knowledge base is active in this workspace (${linkedFileCount} source files have requirement-linked symbols).`,
    "Kibi hooks add short requirement/test snippets before reads and edits of linked files, derived from the symbol manifest; kb_query returns the authoritative detail.",
    "Operations: kb_search (ask it a question; the answer layer names governing requirements, must-stay-true facts, ADRs and tests), kb_query (exact id or sourceFile), kb_check (validation and edit impact), kb_upsert (writes). MCP tool names are host-prefixed (e.g. mcp__plugin_kibi-claude_kibi__kb_query); the project-local CLI (`npx --no-install kibi <route> --input -`) is the peer route.",
    "Workflow guidance lives in the kibi-claude:kibi-usage skill (also served by kb_skills with action load).",
  ].join("\n");
}

export function stopReminder(paths: readonly string[]): string {
  const shown = paths.slice(0, 8);
  const more =
    paths.length > shown.length ? ` +${paths.length - shown.length}` : "";
  return [
    `Kibi: ${paths.length} source ${paths.length === 1 ? "file" : "files"} changed this session without a Kibi impact check: ${shown.join(", ")}${more}.`,
    `kb_check({sourceFiles:${JSON.stringify(shown)}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports requirement ownership, stale traceability, and symbol-manifest drift for ${paths.length === 1 ? "it" : "them"}. If the change has no KB impact, a one-line no-impact rationale in the final report closes this out.`,
  ].join("\n");
}
