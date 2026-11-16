/**
 * The one session brief every Kibi surface opens with.
 *
 * Host adapters (Claude Code, Codex, Cursor, OpenCode, ZCode) add it to the
 * session-start context, and the MCP server returns it in its initialize
 * instructions and in kb_status, so an agent on a host without hooks (Gemini
 * CLI, any MCP client) and a CLI-only agent read the same policy. Host lines
 * (tool-name prefixes, skill names, setup notes) go after it, never instead
 * of it.
 */

/** The three steps of a change, then the rule for a conflicting request. */
export const SESSION_BRIEF_LINES: readonly string[] = [
  "Kibi records this repository's requirements and decisions with their reasons.",
  "- Before changing behaviour, kb_search for the recorded intent and kb_query the requirement that governs it.",
  "- When the person states a rule or makes a decision, record it with their reason (kb_upsert: who decided and why).",
  "- Before finishing, stage the change with its .kb files and run the commit check, `kibi check --staged`.",
  "A request that would make a recorded requirement or decision false (narrowing it or adding an exception counts; touching its code does not) is a question, not a task: name the rule and ask.",
];

/** The session brief as one block of text. */
export const SESSION_BRIEF: string = SESSION_BRIEF_LINES.join("\n");

/**
 * The session brief followed by host-specific lines, one block per session
 * start. Empty host lines are dropped.
 */
export function sessionBriefWith(hostLines: readonly string[]): string {
  return [SESSION_BRIEF, ...hostLines.filter((line) => line.length > 0)].join(
    "\n",
  );
}
