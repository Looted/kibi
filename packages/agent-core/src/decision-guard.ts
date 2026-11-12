import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { EntitySummary, IndexedSymbol } from "./knowledge-index.js";
import { extractPatchTexts, normalizeWorkspacePath } from "./path-policy.js";
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

/** False when the operator turned the firm-edit confirmation off. */
export function confirmFirmEdits(env: NodeJS.ProcessEnv): boolean {
  const value = env[CONFIRM_FIRM_EDITS_ENV]?.trim().toLowerCase();
  return !(value === "0" || value === "false" || value === "off");
}

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
  /** The edit only removes dead `implements` comments, so it changes none. */
  commentOnly?: boolean;
}): { ids: string[]; symbol: IndexedSymbol | undefined } {
  if (input.commentOnly === true) return { ids: [], symbol: undefined };
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

/** Files larger than this are not compared for a whole-file write. */
const MAX_COMMENT_ONLY_BYTES = 2 * 1024 * 1024;

/**
 * A line that holds nothing but an `implements` comment naming entity ids
 * (`// implements REQ-a, REQ-b`, `# implements: REQ-a`, ` * implements REQ-a`).
 * Kibi stopped reading these comments as links, so removing one changes no
 * behavior and no recorded link.
 */
const DEAD_IMPLEMENTS_LINE =
  /^\s*(?:\/\/+|#+|%+|\/\*+|\*|--)\s*(?:implements|Implements|IMPLEMENTS)(?:\s*:\s*|\s+)[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+(?:\s*,\s*[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+)*\s*(?:\*\/)?\s*$/;

/** True for a line that is only a dead `implements` comment. */
export function isDeadImplementsComment(line: string): boolean {
  return DEAD_IMPLEMENTS_LINE.test(line);
}

/** True when `after` is `before` with one or more dead comment lines removed. */
function removesOnlyDeadComments(before: string, after: string): boolean {
  const kept = before.split("\n");
  const wanted = after.split("\n");
  let removed = 0;
  let next = 0;
  for (const line of kept) {
    if (wanted[next] === line) {
      next += 1;
    } else if (isDeadImplementsComment(line)) {
      removed += 1;
    } else {
      return false;
    }
  }
  return removed > 0 && next === wanted.length;
}

type PatchSection = {
  kind: string;
  path: string;
  moved: boolean;
  lines: string[];
};

const PATCH_SECTION_HEADER = /^\*\*\* (Update|Add|Delete) File: (.+)$/;

/**
 * The file sections of an `apply_patch` envelope, or undefined when the text
 * is not one envelope from `*** Begin Patch` to `*** End Patch`.
 */
function parsePatchSections(patch: string): PatchSection[] | undefined {
  const lines = patch.trim().split(/\r?\n/);
  if (lines[0]?.trim() !== "*** Begin Patch") return undefined;
  if (lines.at(-1)?.trim() !== "*** End Patch") return undefined;
  const sections: PatchSection[] = [];
  let current: PatchSection | undefined;
  for (const line of lines.slice(1, -1)) {
    const header = PATCH_SECTION_HEADER.exec(line.trim());
    if (header?.[1] && header[2]) {
      current = {
        kind: header[1],
        path: normalizeWorkspacePath(header[2]),
        moved: false,
        lines: [],
      };
      sections.push(current);
    } else if (current === undefined) {
      return undefined;
    } else if (line.startsWith("*** Move to:")) {
      current.moved = true;
    } else {
      current.lines.push(line);
    }
  }
  return sections.length > 0 ? sections : undefined;
}

/**
 * True for an `Update File` section that stays in place, removes at least
 * one line, removes only dead comment lines and adds none.
 */
function patchSectionRemovesOnlyDeadComments(section: PatchSection): boolean {
  if (section.kind !== "Update" || section.moved) return false;
  let removed = 0;
  for (const line of section.lines) {
    if (line.startsWith("-")) {
      if (!isDeadImplementsComment(line.slice(1))) return false;
      removed += 1;
    } else if (
      !(
        line.startsWith(" ") ||
        line.startsWith("@@") ||
        line === "" ||
        line === "*** End of File"
      )
    ) {
      // An added line, or anything the envelope format does not hold.
      return false;
    }
  }
  return removed > 0;
}

/**
 * Whether the patch envelopes only delete dead comments from `absolutePath`.
 * With `base`, the sections whose path resolves to the file against it are
 * judged; without it every section in the patch must qualify.
 */
function patchesRemoveOnlyDeadComments(
  absolutePath: string,
  patches: readonly string[],
  base: string | undefined,
): boolean {
  const target = path.resolve(absolutePath);
  const relevant: PatchSection[] = [];
  for (const patch of patches) {
    const sections = parsePatchSections(patch);
    if (sections === undefined) return false;
    relevant.push(
      ...(base === undefined
        ? sections
        : sections.filter(
            (section) => path.resolve(base, section.path) === target,
          )),
    );
  }
  return (
    relevant.length > 0 && relevant.every(patchSectionRemovesOnlyDeadComments)
  );
}

/**
 * Whether an edit only deletes `implements` comments Kibi no longer reads:
 * every replacement of an Edit or MultiEdit (`old_string`/`new_string`, or
 * the camel-case spelling), a whole-file write (`content`) compared with the
 * file on disk, or an `apply_patch` envelope whose section for the file only
 * removes such lines. `base` is the directory relative patch paths resolve
 * against (the event cwd); without it every section of the patch must only
 * remove such lines. Such an edit keeps every requirement the code
 * implements, so it is not put to the person. Any other shape of edit,
 * including one made by a shell command or a patch that adds, deletes or
 * moves the file, answers false.
 */
export function removesOnlyDeadImplementsComments(
  absolutePath: string,
  toolInput: unknown,
  base?: string,
): boolean {
  type Fields = Record<string, unknown>;
  const input = (toolInput ?? {}) as Fields;
  const edits: unknown[] = Array.isArray(input.edits) ? input.edits : [];
  const records = [input, ...edits.map((edit) => (edit ?? {}) as Fields)];
  const pairs: [string, string][] = [];
  for (const entry of records) {
    const before = entry.old_string ?? entry.oldString;
    const after = entry.new_string ?? entry.newString;
    if (before === undefined && after === undefined) continue;
    if (typeof before !== "string" || typeof after !== "string") return false;
    pairs.push([before, after]);
  }
  const patches = extractPatchTexts(toolInput);
  if (patches.length > 0) {
    // A patch beside replacements or content is a shape no host sends.
    return (
      pairs.length === 0 &&
      input.content === undefined &&
      patchesRemoveOnlyDeadComments(absolutePath, patches, base)
    );
  }
  if (pairs.length === 0) {
    if (typeof input.content !== "string") return false;
    try {
      if (fs.statSync(absolutePath).size > MAX_COMMENT_ONLY_BYTES) return false;
      pairs.push([fs.readFileSync(absolutePath, "utf8"), input.content]);
    } catch {
      return false;
    }
  }
  return pairs.every(([before, after]) =>
    removesOnlyDeadComments(before, after),
  );
}

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

/** The phrase that makes `prompt` read as a rule, or undefined. */
export function statedRule(prompt: string): string | undefined {
  const match = RULE_PHRASES.exec(prompt);
  return match ? match[0].toLowerCase() : undefined;
}

/** Prompt-time note for a request that reads as a rule or decision. */
export function rulePromptNote(phrase: string): string {
  return [
    `Kibi: this request reads as a rule or decision (it says "${phrase}").`,
    "A rule the person states is project knowledge: kb_search shows whether a recorded requirement already says something about it (changing a firm one is a question for the person first), and a new or changed rule is recorded with kb_upsert (a requirement, firm because the person stated it, with the implements link from the code that enforces it) as part of this change, not after it.",
  ].join("\n");
}

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

/** Session markers the decision guard keeps. */
export type DecisionFlag =
  | "source-edited"
  | "kb-recorded"
  | "rule-prompt"
  | "capture-asked"
  | "requirement-recorded"
  | "signoff-asked";

/**
 * The marker file `name` of the session. Throws without a state directory,
 * so every caller's best-effort `catch` also covers "nothing to remember".
 */
function sessionPath(session: DecisionSession, name: string): string {
  if (!session.stateDir) throw new Error();
  const key = createHash("sha256")
    .update(session.sessionId?.trim() || "unattributed")
    .digest("hex")
    .slice(0, 32);
  return path.join(session.stateDir, "decision-guard", key, name);
}

function writeMarker(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** Create an empty marker; `wx` fails when it already exists. */
function touchMarker(file: string, flag: "w" | "wx") {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.closeSync(fs.openSync(file, flag));
}

function readMarker(session: DecisionSession, name: string): unknown {
  return JSON.parse(String(fs.readFileSync(sessionPath(session, name))));
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** Set a session marker; best effort. */
export function markDecisionFlag(
  session: DecisionSession,
  flag: DecisionFlag,
): void {
  try {
    touchMarker(sessionPath(session, flag), "w");
  } catch {
    // Markers are best effort; a lost one means a note may repeat or skip.
  }
}

export function hasDecisionFlag(
  session: DecisionSession,
  flag: DecisionFlag,
): boolean {
  try {
    return fs.existsSync(sessionPath(session, flag));
  } catch {
    return false;
  }
}

/**
 * True the first time `flag` is claimed in the session. Without a state
 * directory nothing can be remembered, so nothing is claimed.
 */
export function claimDecisionFlag(
  session: DecisionSession,
  flag: DecisionFlag,
): boolean {
  try {
    touchMarker(sessionPath(session, flag), "wx");
    return true;
  } catch {
    return false;
  }
}

/**
 * Remember a submitted prompt's topic words (for unlinked-file candidates)
 * and whether it read as a rule. Returns the rule phrase, if any.
 */
export function recordRequest(
  session: DecisionSession,
  prompt: string,
): string | undefined {
  const rule = statedRule(prompt);
  try {
    writeMarker(
      sessionPath(session, "request-words.json"),
      JSON.stringify(requestTopicWords(prompt)),
    );
  } catch {
    // Best effort.
  }
  if (rule !== undefined) markDecisionFlag(session, "rule-prompt");
  return rule;
}

/** Topic words of the session's latest prompt, or none. */
export function requestWords(session: DecisionSession): string[] {
  try {
    return stringList(readMarker(session, "request-words.json"));
  } catch {
    return [];
  }
}

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

/** Where `kibi signoff` keeps the latest view, relative to the workspace. */
export const SIGNOFF_LATEST_JSON = path.join(
  ".kb",
  "briefs",
  "signoff",
  "latest.json",
);

/** `value` as an object of named fields; `null` stays `null`, so `??` skips it. */
function record(value: unknown): Record<string, unknown> | null | undefined {
  return typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown> | null)
    : undefined;
}

/**
 * Whether a kb_upsert call's input writes a requirement (not a dry run).
 * Hosts pass the MCP arguments, sometimes wrapped in `arguments`.
 */
export function isRequirementUpsert(toolInput: unknown): boolean {
  const input = record(toolInput);
  const args = record(input?.arguments) ?? record(input?.args) ?? input;
  return args?.type === "req" && args.dryRun !== true;
}

/** Modification time of `file`, or NaN when it cannot be read. */
function mtimeMs(file: () => string): number {
  let time = Number.NaN;
  try {
    time = fs.statSync(file()).mtimeMs;
  } catch {
    // Missing: NaN compares false with everything.
  }
  return time;
}

/**
 * Whether the stop should ask for a signoff view: the session wrote a
 * requirement, `kibi signoff` has not written a view since, and the session
 * has not been asked yet (claiming the ask).
 */
export function claimSignoffReminder(
  session: DecisionSession,
  workspaceRoot: string,
): boolean {
  const recorded = mtimeMs(() => sessionPath(session, "requirement-recorded"));
  if (Number.isNaN(recorded)) return false;
  const shown = mtimeMs(() => path.join(workspaceRoot, SIGNOFF_LATEST_JSON));
  if (shown >= recorded) return false;
  return claimDecisionFlag(session, "signoff-asked");
}

/** Stop-time note for a session that recorded requirements without a signoff view. */
export function signoffReminder(): string {
  return [
    "Kibi: this session recorded or changed requirements, and the person has not seen them as a signoff view.",
    "Before reporting the work done, asking to commit, or opening or merging the pull request, run `kibi signoff` and put its output in the reply unchanged; a requirement the agent wrote waits for the person's approval, so ask for it with this view, never in your own words. When they answer, record their answer on the same branch and push it to the same pull request, never to a separate one. When replies go through a messaging tool, pass the output there as the message text, and share `.kb/briefs/signoff/latest.html` only as a rendered page (the Artifact tool in Claude apps), never as an attached file, which chat apps show as raw source (kibi-decisions, resources/signoff-views.md).",
  ].join("\n");
}

function readSettled(session: DecisionSession): string[] {
  try {
    return stringList(readMarker(session, "firm-settled.json"));
  } catch {
    return [];
  }
}

/** Firm requirements the agent was already told about this session. */
export function settledFirmRequirements(session: DecisionSession): Set<string> {
  return new Set(readSettled(session));
}

/** Remember that the agent was told about these firm requirements. */
export function settleFirmRequirements(
  session: DecisionSession,
  ids: readonly string[],
): void {
  try {
    writeMarker(
      sessionPath(session, "firm-settled.json"),
      JSON.stringify([...new Set([...readSettled(session), ...ids])]),
    );
  } catch {
    // Best effort: a lost write means the notice may repeat.
  }
}

/**
 * Keep a prompt's rule note for a host whose prompt hook cannot add context,
 * so the next hook that can speak to the agent delivers it.
 */
export function holdRuleNote(session: DecisionSession, phrase: string): void {
  try {
    writeMarker(sessionPath(session, "rule-note"), rulePromptNote(phrase));
  } catch {
    // Best effort.
  }
}

/** The held rule note, removed so it is delivered once; or undefined. */
export function takeRuleNote(session: DecisionSession): string | undefined {
  let note = "";
  try {
    const file = sessionPath(session, "rule-note");
    note = String(fs.readFileSync(file));
    fs.rmSync(file);
  } catch {
    // No note held, or no state directory.
  }
  return note || undefined;
}
