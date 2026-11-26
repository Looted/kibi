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

/**
 * The three steps of a change, then the rule for a conflicting request.
 *
 * Agents act on this brief and on tool results, and rarely load a skill
 * before they start, so each step says when to do it and that it needs no
 * permission. The check step is the changed-files check, the commit gate's
 * verdict on the change, and comes before the final message rather than at
 * commit time, which an agent seldom reaches.
 */
export const SESSION_BRIEF_LINES: readonly string[] = [
  "Kibi records this repository's requirements and decisions with their reasons.",
  "- Before changing behaviour, kb_search for the recorded intent and kb_query the requirement that governs it.",
  "- Record a rule the person states with kb_record in the same turn, with their reason; it needs no permission.",
  "- Before your final message, run the tests linked to the code you changed, then kb_check with changed: true.",
  "- A request that would make a recorded requirement or decision false (narrowing it or adding an exception counts; touching its code does not) is a question, not a task: name the rule and ask.",
];

/** The session brief as one block of text. */
export const SESSION_BRIEF: string = SESSION_BRIEF_LINES.join("\n");

/** The prefix of the check step, which a workspace without Git replaces. */
const CHECK_STEP_PREFIX = "- Before your final message,";

/**
 * The check step outside any Git repository: there is no commit and no
 * changed-files view, so the whole check runs instead.
 */
export const NO_GIT_FINISH_LINE =
  "- Before your final message, run the tests linked to the code you changed, then `kibi check` (this directory has no Git repository, so there is no commit check).";

/** The session brief for a workspace with Git, or one without. */
export function sessionBriefFor(noGit: boolean): string {
  if (!noGit) return SESSION_BRIEF;
  return SESSION_BRIEF_LINES.map((line) =>
    line.startsWith(CHECK_STEP_PREFIX) ? NO_GIT_FINISH_LINE : line,
  ).join("\n");
}

/**
 * The session brief followed by host-specific lines, one block per session
 * start. Empty host lines are dropped.
 */
export function sessionBriefWith(hostLines: readonly string[]): string {
  return [SESSION_BRIEF, ...hostLines.filter((line) => line.length > 0)].join(
    "\n",
  );
}
