// implements REQ-claude-code-kibi-plugin-v1
/**
 * Claude Code wording around the shared progressive-disclosure snippets.
 *
 * The file snippet itself (requirements, what the lead requirement must keep
 * true, the decision behind it, tests, and the next-layer calls) is built by
 * kibi-agent-core so every host adapter shows the same projection; this module
 * keeps only the Claude Code session, search, and stop messages.
 */

export {
  captureReminder,
  claimSignoffReminder,
  firmEditConfirmation,
  firmEditContext,
  isRequirementUpsert,
  markDecisionFlag,
  rulePromptNote,
  signoffReminder,
  statedRule,
} from "kibi-agent-core/decision-guard";
export {
  type LineRange,
  MAX_SNIPPET_CHARS,
  type SnippetInput,
  editFocus,
  editKnowledgeUpdate,
  fileKnowledgeSnippet,
  focusUpdate,
  focusedSymbols,
  unownedSourceNote,
  unreadableManifestNote,
} from "kibi-agent-core/snippets";

export function searchTip(linkedFileCount: number): string {
  return `Kibi tip: this repository records requirements, scenarios, decisions, and code ownership in a Kibi knowledge base (${linkedFileCount} source files have requirement-linked symbols). For intent questions — why code exists, what it must do — kb_search answers from that knowledge, naming the governing requirements, facts, decisions and tests; kb_query({sourceFile:"<path>"}) lists what a file implements.`;
}

export const DIRECT_KB_ACCESS_NOTE =
  "Kibi: .kb/ holds Kibi-managed knowledge. kb_query/kb_search read it and kb_upsert writes it while keeping the branch store, relationships, and validation consistent; direct file reads miss relationships and direct edits bypass validation.";

export function sessionStartContext(linkedFileCount: number): string {
  return [
    `Kibi knowledge base is active in this workspace (${linkedFileCount} source files have requirement-linked symbols).`,
    "Kibi hooks add short requirement/test snippets (from the symbol manifest) before reads and edits of linked files; kb_query returns the authoritative detail.",
    "A request that conflicts with a recorded requirement or ADR is a question, not a task: name the rule and ask before changing the code or the rule, and change it only when the person says so.",
    "A file with no linked symbols gets a short note; no link is not no rule, so kb_search what it does (permissions, roles, limits, data).",
    "Recording new behavior (requirement, scenario, implements link) is part of the change and needs no permission.",
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
