// implements REQ-claude-code-kibi-plugin-v1
/**
 * Claude Code wording around the shared progressive-disclosure snippets.
 *
 * The file snippet itself (requirements, what the lead requirement must keep
 * true, the decision behind it, tests, and the next-layer calls) is built by
 * kibi-agent-core so every host adapter shows the same projection; this module
 * keeps only the Claude Code session, search, and stop messages.
 */
import type { EntitySummary } from "kibi-agent-core/knowledge-index";

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

// implements REQ-claude-firm-edit-confirmation
/**
 * The permission-prompt text for an edit of a firm requirement's code: what
 * the edit changes, the requirements, and what allowing it means. The person
 * reads it, so it names the rule rather than the mechanism.
 */
export function firmEditConfirmation(
  where: string,
  requirements: readonly EntitySummary[],
): string {
  // Every one is firm, so each is named by id and title only.
  const shown = requirements
    .slice(0, 2)
    .map((summary) =>
      summary.title ? `${summary.id}: ${summary.title}` : summary.id,
    );
  const more =
    requirements.length > shown.length
      ? ` (+${requirements.length - shown.length} more)`
      : "";
  const noun =
    requirements.length === 1 ? "a firm requirement" : "firm requirements";
  return `Kibi: this edit changes ${where}, which implements ${noun} recorded in the knowledge base: ${shown.join("; ")}${more}. Allow it if the change keeps ${requirements.length === 1 ? "that requirement" : "them"}, or if you mean to change ${requirements.length === 1 ? "the requirement" : "them"} too.`;
}

// implements REQ-claude-firm-edit-confirmation
/** What the agent is told when its edit was put to the person. */
export function firmEditContext(ids: readonly string[]): string {
  const named = ids.slice(0, 2).join(", ");
  return [
    `Kibi asked the person to confirm this edit because it changes code that implements firm ${ids.length === 1 ? "requirement" : "requirements"} ${named}.`,
    "If the edit was declined or could not be confirmed, the requirement stands: name it and ask the person how to proceed, rather than reaching the same change another way. If it was allowed and the change alters what the requirement says, the requirement is updated with kb_upsert in this change.",
  ].join("\n");
}

/**
 * Phrases that make a request read as a rule or decision. Matching is
 * deliberately loose: the note it triggers only asks whether there is
 * something to record.
 */
const RULE_PHRASES =
  /\b(?:from now on|going forward|must(?:n['’]t| not)?|should (?:always|never)|never|always|is not allowed|are not allowed|not be allowed|only (?:allow|admins?|owners?)|is required|are required|has to|have to)\b/i;

// implements REQ-claude-decision-capture-nudges
/** The phrase that makes `prompt` read as a rule, or undefined. */
export function statedRule(prompt: string): string | undefined {
  const match = RULE_PHRASES.exec(prompt);
  return match ? match[0].toLowerCase() : undefined;
}

// implements REQ-claude-decision-capture-nudges
/** Prompt-time note for a request that reads as a rule or decision. */
export function rulePromptNote(phrase: string): string {
  return [
    `Kibi: this request reads as a rule or decision (it says "${phrase}").`,
    "A rule the person states is project knowledge: kb_search shows whether a recorded requirement already says something about it (changing a firm one is a question for the person first), and a new or changed rule is recorded with kb_upsert (a requirement, firm because the person stated it, with the implements link from the code that enforces it) as part of this change, not after it.",
  ].join("\n");
}

// implements REQ-claude-decision-capture-nudges
/**
 * Stop-time note for a session that changed source files and wrote nothing
 * to the knowledge base.
 */
export function captureReminder(rulePrompt: boolean): string {
  return [
    rulePrompt
      ? "Kibi: a request this session read as a rule or decision, the session changed source files, and nothing was recorded in the knowledge base."
      : "Kibi: this session changed source files and recorded nothing in the knowledge base.",
    "A decision the person stated or this change made (a rule, a limit, a default, who may do what) is recorded with kb_upsert as a requirement linked to the code that implements it before the work is reported done; when there was none, the final report says so in one line.",
  ].join("\n");
}
