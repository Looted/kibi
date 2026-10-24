// implements REQ-claude-firm-edit-confirmation, REQ-claude-decision-capture-nudges, REQ-agent-hosts-decision-guard
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { EntitySummary, IndexedSymbol } from "./knowledge-index.js";
import { requestTopicWords } from "./requirement-candidates.js";
import {
  type LineRange,
  type Summarize,
  focusedSymbols,
  implementedRequirementIds,
  isRetiredStatus,
} from "./snippets.js";

/**
 * Host-neutral pieces of the hooks that act on recorded decisions while the
 * work happens: which firm requirements an edit changes, the confirmation and
 * agent texts for it, and the prompt-time and stop-time capture notes. Each
 * host adapter decides how to put the confirmation to the person.
 */

/** Set to `0`, `false` or `off` to stop asking before edits of firm requirements. */
export const CONFIRM_FIRM_EDITS_ENV = "KIBI_CONFIRM_FIRM_EDITS";

// implements REQ-claude-firm-edit-confirmation, REQ-agent-hosts-decision-guard
/** False when the operator turned the firm-edit confirmation off. */
export function confirmFirmEdits(env: NodeJS.ProcessEnv): boolean {
  const value = env[CONFIRM_FIRM_EDITS_ENV]?.trim().toLowerCase();
  return !(value === "0" || value === "false" || value === "off");
}

// implements REQ-claude-firm-edit-confirmation, REQ-agent-hosts-decision-guard
/**
 * The current firm requirements an edit changes that are not in `confirmed`:
 * those implemented by the symbols the edit lands in, or by every symbol of
 * the file for a whole-file write. An edit whose location is unknown, or
 * outside every symbol, changes none.
 */
export function firmRequirementsTouched(input: {
  symbols: readonly IndexedSymbol[];
  focus: readonly LineRange[] | undefined;
  wholeFile: boolean;
  summarize: Summarize;
  confirmed?: ReadonlySet<string>;
}): { ids: string[]; symbol: IndexedSymbol | undefined } {
  const touched = input.wholeFile
    ? input.symbols
    : focusedSymbols(input.symbols, input.focus);
  const ids = implementedRequirementIds(touched).filter((id) => {
    if (input.confirmed?.has(id)) return false;
    const summary = input.summarize(id);
    return summary.firmness === "firm" && !isRetiredStatus(summary.status);
  });
  return { ids, symbol: input.wholeFile ? undefined : touched[0] };
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
  // A title that ends in a full stop would read "preference.. Allow".
  const named = `${shown.join("; ")}${more}`.replace(/\.+$/, "");
  return `Kibi: this edit changes ${where}, which implements ${noun} recorded in the knowledge base: ${named}. Allow it if the change keeps ${requirements.length === 1 ? "that requirement" : "them"}, or if you mean to change ${requirements.length === 1 ? "the requirement" : "them"} too.`;
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

// implements REQ-claude-decision-capture-nudges, REQ-agent-hosts-decision-guard
/** The phrase that makes `prompt` read as a rule, or undefined. */
export function statedRule(prompt: string): string | undefined {
  const match = RULE_PHRASES.exec(prompt);
  return match ? match[0].toLowerCase() : undefined;
}

// implements REQ-claude-decision-capture-nudges, REQ-agent-hosts-decision-guard
/** Prompt-time note for a request that reads as a rule or decision. */
export function rulePromptNote(phrase: string): string {
  return [
    `Kibi: this request reads as a rule or decision (it says "${phrase}").`,
    "A rule the person states is project knowledge: kb_search shows whether a recorded requirement already says something about it (changing a firm one is a question for the person first), and a new or changed rule is recorded with kb_upsert (a requirement, firm because the person stated it, with the implements link from the code that enforces it) as part of this change, not after it.",
  ].join("\n");
}

// implements REQ-claude-decision-capture-nudges, REQ-agent-hosts-decision-guard
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

// implements REQ-agent-hosts-decision-guard
/**
 * Pre-edit context for hosts whose pre-tool hook cannot put a call to the
 * person: the edit is named as a change to the person's rule, and the agent
 * is told to ask before making it unless it keeps the rule.
 */
export function firmEditNotice(
  where: string,
  requirements: readonly EntitySummary[],
): string {
  const shown = requirements
    .slice(0, 2)
    .map((summary) =>
      summary.title ? `${summary.id}: ${summary.title}` : summary.id,
    );
  const more =
    requirements.length > shown.length
      ? ` (+${requirements.length - shown.length} more)`
      : "";
  const one = requirements.length === 1;
  return [
    `Kibi: this edit changes ${where}, which implements ${one ? "a firm requirement" : "firm requirements"}, a rule the person set: ${shown.join("; ")}${more}.`,
    `Unless the edit keeps ${one ? "that rule" : "those rules"}, ask the person before making it and name the rule; change the requirement with kb_upsert in this change only when they say so.`,
  ].join("\n");
}

/** Where one host session's decision-guard markers live. */
export type DecisionSession = {
  stateDir: string | undefined;
  sessionId: string | undefined;
};

// implements REQ-agent-hosts-decision-guard, REQ-kibi-signoff-views
/** Session markers the decision guard keeps. */
export type DecisionFlag =
  | "source-edited"
  | "kb-recorded"
  | "rule-prompt"
  | "capture-asked"
  | "requirement-recorded"
  | "signoff-asked";

function sessionPath(
  session: DecisionSession,
  name: string,
): string | undefined {
  if (!session.stateDir) return undefined;
  const key = createHash("sha256")
    .update(session.sessionId?.trim() || "unattributed")
    .digest("hex")
    .slice(0, 32);
  return path.join(session.stateDir, "decision-guard", key, name);
}

function writeMarker(file: string, content: string, flag: "w" | "wx" | "a") {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { flag });
}

// implements REQ-agent-hosts-decision-guard
/** Set a session marker; best effort. */
export function markDecisionFlag(
  session: DecisionSession,
  flag: DecisionFlag,
): void {
  const file = sessionPath(session, flag);
  if (!file) return;
  try {
    writeMarker(file, "", "w");
  } catch {
    // Markers are best effort; a lost one means a note may repeat or skip.
  }
}

// implements REQ-agent-hosts-decision-guard
export function hasDecisionFlag(
  session: DecisionSession,
  flag: DecisionFlag,
): boolean {
  const file = sessionPath(session, flag);
  return file !== undefined && fs.existsSync(file);
}

// implements REQ-agent-hosts-decision-guard
/**
 * True the first time `flag` is claimed in the session. Without a state
 * directory nothing can be remembered, so nothing is claimed.
 */
export function claimDecisionFlag(
  session: DecisionSession,
  flag: DecisionFlag,
): boolean {
  const file = sessionPath(session, flag);
  if (!file) return false;
  try {
    writeMarker(file, "", "wx");
    return true;
  } catch {
    return false;
  }
}

// implements REQ-agent-hosts-decision-guard
/**
 * Remember a submitted prompt's topic words (for unlinked-file candidates)
 * and whether it read as a rule. Returns the rule phrase, if any.
 */
export function recordRequest(
  session: DecisionSession,
  prompt: string,
): string | undefined {
  const rule = statedRule(prompt);
  const file = sessionPath(session, "request-words.json");
  if (file) {
    try {
      writeMarker(file, JSON.stringify(requestTopicWords(prompt)), "w");
    } catch {
      // Best effort.
    }
  }
  if (rule !== undefined) markDecisionFlag(session, "rule-prompt");
  return rule;
}

// implements REQ-agent-hosts-decision-guard
/** Topic words of the session's latest prompt, or none. */
export function requestWords(session: DecisionSession): string[] {
  const file = sessionPath(session, "request-words.json");
  if (!file) return [];
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed)
      ? parsed.filter((word): word is string => typeof word === "string")
      : [];
  } catch {
    return [];
  }
}

// implements REQ-agent-hosts-decision-guard
/**
 * Whether the stop should ask for the session's decision to be recorded:
 * source changed, nothing was written with kb_upsert, and the session has
 * not been asked yet (claiming the ask).
 */
export function claimCaptureReminder(session: DecisionSession): boolean {
  return (
    hasDecisionFlag(session, "source-edited") &&
    !hasDecisionFlag(session, "kb-recorded") &&
    claimDecisionFlag(session, "capture-asked")
  );
}

// implements REQ-kibi-signoff-views
/** Where `kibi signoff` keeps the latest view, relative to the workspace. */
export const SIGNOFF_LATEST_JSON = path.join(
  ".kb",
  "briefs",
  "signoff",
  "latest.json",
);

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

// implements REQ-kibi-signoff-views
/**
 * Whether a kb_upsert call's input writes a requirement (not a dry run).
 * Hosts pass the MCP arguments, sometimes wrapped in `arguments`.
 */
export function isRequirementUpsert(toolInput: unknown): boolean {
  const input = record(toolInput);
  const args = record(input?.arguments) ?? record(input?.args) ?? input;
  return args?.type === "req" && args.dryRun !== true;
}

function mtimeMs(file: string | undefined): number | undefined {
  if (!file) return undefined;
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return undefined;
  }
}

// implements REQ-kibi-signoff-views
/**
 * Whether the stop should ask for a signoff view: the session wrote a
 * requirement, `kibi signoff` has not written a view since, and the session
 * has not been asked yet (claiming the ask).
 */
export function claimSignoffReminder(
  session: DecisionSession,
  workspaceRoot: string,
): boolean {
  const recorded = mtimeMs(sessionPath(session, "requirement-recorded"));
  if (recorded === undefined) return false;
  const shown = mtimeMs(path.join(workspaceRoot, SIGNOFF_LATEST_JSON));
  if (shown !== undefined && shown >= recorded) return false;
  return claimDecisionFlag(session, "signoff-asked");
}

// implements REQ-kibi-signoff-views
/** Stop-time note for a session that recorded requirements without a signoff view. */
export function signoffReminder(): string {
  return [
    "Kibi: this session recorded or changed requirements, and the person has not seen them as a signoff view.",
    "Before reporting the work done or asking to commit, run `kibi signoff` and put its output in the reply unchanged; a requirement the agent wrote waits for the person's approval, so ask for it with this view, never in your own words. When replies go through a messaging tool, pass the output there as the message text, and share `.kb/briefs/signoff/latest.html` only as a rendered page (the Artifact tool in Claude apps), never as an attached file, which chat apps show as raw source (kibi-decisions, resources/signoff-views.md).",
  ].join("\n");
}

function readSettled(file: string | undefined): string[] {
  if (!file) return [];
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

// implements REQ-agent-hosts-decision-guard
/** Firm requirements the agent was already told about this session. */
export function settledFirmRequirements(session: DecisionSession): Set<string> {
  return new Set(readSettled(sessionPath(session, "firm-settled.json")));
}

// implements REQ-agent-hosts-decision-guard
/** Remember that the agent was told about these firm requirements. */
export function settleFirmRequirements(
  session: DecisionSession,
  ids: readonly string[],
): void {
  const file = sessionPath(session, "firm-settled.json");
  if (!file) return;
  try {
    writeMarker(
      file,
      JSON.stringify([...new Set([...readSettled(file), ...ids])]),
      "w",
    );
  } catch {
    // Best effort: a lost write means the notice may repeat.
  }
}

// implements REQ-agent-hosts-decision-guard
/**
 * Keep a prompt's rule note for a host whose prompt hook cannot add context,
 * so the next hook that can speak to the agent delivers it.
 */
export function holdRuleNote(session: DecisionSession, phrase: string): void {
  const file = sessionPath(session, "rule-note");
  if (!file) return;
  try {
    writeMarker(file, rulePromptNote(phrase), "w");
  } catch {
    // Best effort.
  }
}

// implements REQ-agent-hosts-decision-guard
/** The held rule note, removed so it is delivered once; or undefined. */
export function takeRuleNote(session: DecisionSession): string | undefined {
  const file = sessionPath(session, "rule-note");
  if (!file) return undefined;
  try {
    const note = fs.readFileSync(file, "utf8");
    fs.rmSync(file, { force: true });
    return note || undefined;
  } catch {
    return undefined;
  }
}
