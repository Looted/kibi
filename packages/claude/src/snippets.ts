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
  ruleCaptureTemplate,
  rulePromptNote,
  signoffReminder,
  statedReason,
  startDecisionSession,
  statedRule,
} from "kibi-agent-core/decision-guard";
import { sessionBriefWith } from "kibi-agent-core/session-brief";
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
  return sessionBriefWith([
    `Kibi hooks show requirement snippets before reads and edits of the ${linkedFileCount} linked source files. MCP tools: mcp__plugin_kibi-claude_kibi__kb_*; CLI peer: \`npx --no-install kibi <route> --input -\`. Guidance: the kibi-claude:kibi-usage skill.`,
  ]);
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
