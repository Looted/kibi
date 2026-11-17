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
  /**
   * Whether a `keeps` receipt recorded for this edit covers this requirement
   * for this symbol (see `firmEditReviewed`); a requirement every touched
   * symbol has one for is not counted.
   */
  reviewed?: (requirementId: string, symbol: IndexedSymbol) => boolean;
}): { ids: string[]; symbol: IndexedSymbol | undefined } {
  if (input.commentOnly === true) return { ids: [], symbol: undefined };
  const touched = input.wholeFile
    ? input.symbols
    : focusedSymbols(input.symbols, input.focus);
  const ids = implementedRequirementIds(touched).filter((id) => {
    if (input.confirmed?.has(id)) return false;
    const summary = input.summarize(id);
    if (summary.firmness !== "firm" || isRetiredStatus(summary.status))
      return false;
    const reviewed = input.reviewed;
    if (reviewed === undefined) return true;
    return !touched
      .filter((symbol) => symbol.implements.includes(id))
      .every((symbol) => reviewed(id, symbol));
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

/**
 * A dead `implements` comment that trails code, from the whitespace (or the
 * code's own `;`) before its comment marker to the end of the line.
 */
const TRAILING_DEAD_IMPLEMENTS =
  /^\s*(?:\/\/+|#+|%+|\/\*+|--)\s*(?:implements|Implements|IMPLEMENTS)(?:\s*:\s*|\s+)[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+(?:\s*,\s*[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+)*\s*(?:\*\/)?\s*$/;

/**
 * Whether every quote character in `code` is closed: an even count of each
 * unescaped `'`, `"` and backquote. Text that fails may end inside a string,
 * where the "comment" after it would be part of the string.
 */
function quotesClosed(code: string): boolean {
  // rationale: any quote-free text in place of an escape leaves every quote
  // count as it is.
  // Stryker disable next-line StringLiteral
  const unescaped = code.replace(/\\./g, "");
  return ["'", '"', "`"].every(
    (quote) => unescaped.split(quote).length % 2 === 1,
  );
}

/**
 * True when `after` is the line `before` with only a trailing dead
 * `implements` comment cut off: the code before it is kept exactly (trailing
 * whitespace aside), and it closes every quote it opens, so the cut text
 * cannot be part of a string.
 */
export function removesTrailingDeadImplementsComment(
  before: string,
  after: string,
): boolean {
  const code = after.trimEnd();
  if (code === "" || !before.startsWith(code)) return false;
  const cut = before.slice(code.length);
  if (!TRAILING_DEAD_IMPLEMENTS.test(cut)) return false;
  // The marker needs whitespace or the code's own `;` before it, as for
  // `x(); // implements REQ-a` or `x();// implements REQ-a`.
  if (!/^\s/.test(cut) && !code.endsWith(";")) return false;
  return quotesClosed(code);
}

/**
 * True when `after` is `before` with one or more dead comments removed:
 * whole comment lines, or comments cut off the end of a code line.
 */
function removesOnlyDeadComments(before: string, after: string): boolean {
  const kept = before.split("\n");
  const wanted = after.split("\n");
  let removed = 0;
  let next = 0;
  for (const line of kept) {
    const target = wanted[next];
    if (target === line) {
      next += 1;
    } else if (isDeadImplementsComment(line)) {
      removed += 1;
    } else if (
      target !== undefined &&
      removesTrailingDeadImplementsComment(line, target)
    ) {
      removed += 1;
      next += 1;
    } else {
      return false;
    }
  }
  return removed > 0 && next === wanted.length;
}

type PatchSection = {
  kind: string;
  path: string;
  lines: string[];
};

const PATCH_SECTION_HEADER = /^\*\*\* (Update|Add|Delete) File: (.+)$/;

/**
 * The file sections of an `apply_patch` envelope, or undefined when the text
 * is not one envelope from `*** Begin Patch` to `*** End Patch`.
 */
function parsePatchSections(patch: string): PatchSection[] | undefined {
  const lines = patch.trim().split(/\r?\n/);
  // rationale: split always yields at least one line, so the first and the
  // last line exist.
  // Stryker disable next-line OptionalChaining
  if (lines[0]?.trim() !== "*** Begin Patch") return undefined;
  // rationale: as above, the last line exists.
  // Stryker disable next-line OptionalChaining
  if (lines.at(-1)?.trim() !== "*** End Patch") return undefined;
  const sections: PatchSection[] = [];
  let current: PatchSection | undefined;
  for (const line of lines.slice(1, -1)) {
    const header = PATCH_SECTION_HEADER.exec(line.trim());
    if (header?.[1] && header[2]) {
      current = {
        kind: header[1],
        path: normalizeWorkspacePath(header[2]),
        lines: [],
      };
      sections.push(current);
    } else if (current === undefined) {
      return undefined;
    } else {
      // A `*** Move to:` line lands here too, and no section that holds one
      // only removes comments.
      current.lines.push(line);
    }
  }
  return sections;
}

/**
 * True for an `Update File` section that stays in place, removes at least
 * one dead comment, and changes nothing else: each removed line is a dead
 * comment line, or a code line directly replaced by itself without its
 * trailing dead comment.
 */
function patchSectionRemovesOnlyDeadComments(section: PatchSection): boolean {
  if (section.kind !== "Update") return false;
  let removed = 0;
  const lines = section.lines;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] as string;
    if (line.startsWith("-")) {
      const replacement = lines[index + 1];
      if (isDeadImplementsComment(line.slice(1))) {
        removed += 1;
      } else if (
        replacement?.startsWith("+") &&
        removesTrailingDeadImplementsComment(
          line.slice(1),
          replacement.slice(1),
        )
      ) {
        removed += 1;
        index += 1;
      } else {
        return false;
      }
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
  const records = Array.isArray(input.edits)
    ? [input, ...input.edits.map((edit: unknown) => (edit ?? {}) as Fields)]
    : [input];
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
    "If the person declined the edit, the requirement stands: name it and ask the person how to proceed, rather than reaching the same change another way. If it was allowed and the change alters what the requirement says, the requirement is updated with kb_upsert in this change. " +
      `If nobody could answer and the edit keeps the requirement, record verdict "keeps" for that symbol with kibi review-firm-edit and retry: a keeps receipt recorded after this question lets the retry of this edit through in this session; a later session is asked again. kibi check --staged blocks the commit until each edited symbol has a current keeps receipt, so record one after the edit too. A receipt is your judgment, not the person's approval, and kibi signoff lists it as such.`,
  ].join("\n");
}

/**
 * Phrases that make a sentence read as a rule or decision wherever they
 * stand: a deontic modal ("must", "is not allowed", "has to") or a marker
 * that the request sets a rule ("from now on", "only admins").
 */
const RULE_PHRASES =
  /\b(?:from now on|going forward|must(?:n['’]t| not)?|should (?:always|never)|is not allowed|are not allowed|not be allowed|only (?:allow|admins?|owners?)|is required|are required|has to|have to)\b/i;

/**
 * "never" and "always" set a rule only as an instruction: at the start of a
 * clause ("Never log keys", "and always require 2FA", "also never ..."), or
 * after a phrase that asks for the behavior ("make sure we never", "ensure
 * keys always", "remember to always", "users may never"). In a description
 * of how the code behaves today ("keys currently never expire") they state a
 * fact, not a rule.
 */
const IMPERATIVE_ADVERB =
  /(?:^|[;:,(]\s*|\b(?:and|but|so|then|please|also|let['’]?s|let us)\s+)(never|always)\b(?!-)(?!\s+mind\b)/i;

/** A phrase that asks for the behavior, so the adverb after it instructs. */
const ASKING_ADVERB =
  /(?:\b(?:make sure|ensure)(?:\s+that)?(?:\s+[\w'’-]+){0,3}?\s+|\b(?:remember|need|want|be sure|try) to\s+|\b(?:may|shall|can)\s+(?=never)|\b(?:we|you)\s+(?=(?:never|always)\s+(?:want|need) to\b))(never|always)\b(?!-)/i;

/**
 * At a clause start the adverb instructs only when a verb in its base form
 * follows: "and always have been stored", "never invalidated", "always
 * crashes" and "Always a pleasure" describe.
 */
const DESCRIBING_NEXT_WORD =
  /^\s+(?:a|an|the|have been|has|had|been|was|were|is|are|am|did|does|\w+ed|\w*[^s\W]s)\b/i;

/** A question that asks for a change ("Can you make sure ...?") is a request. */
const REQUEST_QUESTION =
  /^(?:please\s+)?(?:can|could|would|will)\s+(?:you|we)\b/i;

/** A request question that asks to be told something ("Could you tell me why ...?"). */
const ASKS_TO_BE_TOLD =
  /^(?:please\s+)?(?:can|could|would|will)\s+(?:you|we)\s+(?:tell|explain|show)\b/i;

/** Fenced and inline code, whose words are not the person's phrasing. */
const CODE_SPANS = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`/g;

/** List, heading and number markers before a line's words. */
const LINE_MARKERS = /^(?:[-*+#]+\s+|\d+[.)]\s+)+/;

/** Emphasis markers around words ("**Never**", "_always_"). */
const EMPHASIS = /\*+|(?<!\w)_+|_+(?!\w)/g;

/**
 * Lines that are not the person's own request text: an indented code block
 * (four spaces or a tab, after a blank line or at the start) and quoted
 * text (`>`), such as a reviewer's words pasted in.
 */
function requestLines(text: string): string[] {
  const lines: string[] = [];
  let previous: "blank" | "code" | "text" = "blank";
  for (const line of text.split("\n")) {
    if (/^(?: {4}|\t)/.test(line) && previous !== "text") {
      previous = "code";
      continue;
    }
    previous = line.trim() === "" ? "blank" : "text";
    if (/^\s*>/.test(line)) continue;
    lines.push(line.trim().replace(LINE_MARKERS, "").replace(EMPHASIS, ""));
  }
  return lines;
}

/** The request's sentences, with code removed; a question keeps its `?`. */
function requestSentences(prompt: string): string[] {
  // An empty piece matches no rule phrase, so pieces are not filtered.
  return requestLines(prompt.replace(CODE_SPANS, " "))
    .flatMap((line) => line.split(/(?<=[.!?])\s/))
    .map((sentence) => sentence.trim());
}

/** The adverb ("never" or "always") that instructs in `sentence`, or undefined. */
function instructingAdverb(sentence: string): string | undefined {
  const asked = ASKING_ADVERB.exec(sentence);
  if (asked) return (asked[1] as string).toLowerCase();
  const pattern = new RegExp(IMPERATIVE_ADVERB.source, "gi");
  for (const match of sentence.matchAll(pattern)) {
    const rest = sentence.slice((match.index as number) + match[0].length);
    if (!DESCRIBING_NEXT_WORD.test(rest))
      return (match[1] as string).toLowerCase();
  }
  return undefined;
}

/** The rule phrase of `prompt`, the request's sentences, and which one holds it. */
function ruleMatch(
  prompt: string,
): { phrase: string; sentences: string[]; index: number } | undefined {
  const sentences = requestSentences(prompt);
  for (const [index, sentence] of sentences.entries()) {
    if (
      sentence.endsWith("?") &&
      (!REQUEST_QUESTION.test(sentence) || ASKS_TO_BE_TOLD.test(sentence))
    )
      continue;
    const match = RULE_PHRASES.exec(sentence);
    if (match) return { phrase: match[0].toLowerCase(), sentences, index };
    const adverb = instructingAdverb(sentence);
    if (adverb) return { phrase: adverb, sentences, index };
  }
  return undefined;
}

/**
 * The phrase that makes `prompt` read as a rule, or undefined. A sentence
 * that asks a question (other than a request such as "Can you make sure
 * ...?") states no rule.
 */
export function statedRule(prompt: string): string | undefined {
  return ruleMatch(prompt)?.phrase;
}

/** Words that give the reason for a rule. */
const REASON_MARKER = /\b(?:because|so that)\b/i;

/** The longest reason a note quotes. */
const MAX_REASON_CHARS = 200;

/**
 * The reason a rule prompt gives for its rule: the "because ..." or "so that
 * ..." clause of the sentence that states the rule, or of the sentence after
 * it. Undefined when the prompt states no rule or gives no such reason.
 */
export function statedReason(prompt: string | undefined): string | undefined {
  const match = prompt === undefined ? undefined : ruleMatch(prompt);
  if (match === undefined) return undefined;
  for (const sentence of match.sentences.slice(match.index, match.index + 2)) {
    const marker = REASON_MARKER.exec(sentence);
    if (marker === null) continue;
    const reason = sentence.slice(marker.index).replace(/[.!]+$/, "");
    return reason.length > MAX_REASON_CHARS
      ? `${reason.slice(0, MAX_REASON_CHARS - 1).trimEnd()}…`
      : reason;
  }
  return undefined;
}

/** The line that asks for the person's stated reason in `why`. */
function reasonLine(reason: string): string {
  return `The request gives its reason ("${reason}"): put that reason in the why field, in the person's words.`;
}

/** Prompt-time note for a request that reads as a rule or decision. */
export function rulePromptNote(phrase: string, reason?: string): string {
  return [
    `Kibi: this request reads as a rule or decision (it says "${phrase}").`,
    "A rule the person states is project knowledge: kb_search shows whether a recorded requirement already says something about it (changing a firm one is a question for the person first), and a new rule is recorded with kb_record (the statement, the person's reason, saidBy user and the code that enforces it; a changed one with kb_upsert) as part of this change, not after it.",
    ...(reason === undefined ? [] : [reasonLine(reason)]),
  ].join("\n");
}

/**
 * Stop-time note for a session that changed source files and wrote nothing
 * to the knowledge base. When a prompt stated a rule, the note quotes its
 * phrase and asks for the rule or a reason it is not one; only a session
 * without one may report that no decision was made.
 */
export function captureReminder(rulePhrase: string | undefined): string {
  return rulePhrase === undefined
    ? [
        "Kibi: this session changed source files and recorded nothing in the knowledge base.",
        "A decision the person stated or this change made (a rule, a limit, a default, who may do what) is recorded with kb_record (statement, why, who said it and the code that implements it) before the work is reported done; when there was none, the final report says so in one line.",
      ].join("\n")
    : [
        `Kibi: the person's request said "${rulePhrase}", this session changed source files, and nothing was recorded in the knowledge base.`,
        `Record the rule behind "${rulePhrase}" with kb_record (statement, why, who said it and the code that implements it) before the work is reported done, or say in the final report why "${rulePhrase}" is not a rule.`,
      ].join("\n");
}

/**
 * Post-edit note for the first source edit of a session whose prompt stated
 * a rule: a kb_record input to fill in, so recording the rule, its reason
 * and its code is one call in the agent's words. kb_record writes it as one
 * kb_upsert payload and returns the commit gate's verdict and what is left
 * (subjects, a scenario, a test) as nextActions with ready payloads.
 */
export function ruleCaptureTemplate(
  rulePhrase: string,
  reason?: string,
): string {
  const template = {
    statement: "<the rule as one shall or must sentence>",
    why:
      reason === undefined
        ? "<why the person wants it, in their words; 'Reason not stated' if they gave none>"
        : "<the person's reason, in their words>",
    saidBy: "user",
    quote: "<the person's words, quoted>",
    code: [
      { file: "<file you changed>", symbol: "<function that enforces it>" },
    ],
  };
  return [
    `Kibi: the request said "${rulePhrase}" and this session now changes source files. Record that rule in this change with one kb_record call (without MCP: kibi record --input -); fill in this template:`,
    JSON.stringify(template),
    ...(reason === undefined ? [] : [reasonLine(reason)]),
    "Then follow the nextActions the result returns. Facts, decisions and other modeling go through kb_upsert.",
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
    `Unless the edit keeps ${one ? "that rule" : "those rules"}, ask the person before making it and name the rule; change the requirement with kb_upsert in this change only when they say so. After the edit, record your verdict for each edited symbol with kibi review-firm-edit ("keeps" or "changes"). kibi check --staged blocks the commit until each has a current keeps receipt. A receipt is your judgment, not the person's approval.`,
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
  | "capture-template"
  | "requirement-recorded"
  | "signoff-asked";

/** The key of markers for events that carry no session id. */
const UNATTRIBUTED = "unattributed";

/**
 * A session without an id idle this long has ended: the next prompt starts it
 * afresh, so a later session does not inherit its markers.
 */
const UNATTRIBUTED_IDLE_MS = 2 * 60 * 60 * 1000;

/** Markers of any session left untouched this long are removed. */
const STALE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function sessionKey(session: DecisionSession): string {
  return createHash("sha256")
    .update(session.sessionId?.trim() || UNATTRIBUTED)
    .digest("hex")
    .slice(0, 32);
}

/** Where the decision guard keeps every session's markers. */
function guardRoot(session: DecisionSession): string {
  if (!session.stateDir) throw new Error();
  return path.join(session.stateDir, "decision-guard");
}

/**
 * The marker file `name` of the session. Throws without a state directory,
 * so every caller's best-effort `catch` also covers "nothing to remember".
 */
function sessionPath(session: DecisionSession, name: string): string {
  return path.join(guardRoot(session), sessionKey(session), name);
}

/** Newest modification time of `files`; NaN when none can be read. */
function newestOf(files: readonly string[]): number {
  let newest = Number.NaN;
  for (const file of files) {
    try {
      const time = fs.statSync(file).mtimeMs;
      if (!(time <= newest)) newest = time;
    } catch {
      // Missing: it adds no activity.
    }
  }
  return newest;
}

/** The marker files in `dir`, none when it cannot be read. */
function markerFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir).map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

/** Remove `target`, best effort: a file or directory that stays is harmless. */
function removeQuietly(target: string): void {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    // Left in place.
  }
}

/**
 * Start or continue a host session's markers, and say whether an earlier
 * session's state was dropped. Events without a session id share one key, so
 * a session start that does not resume drops what an earlier session without
 * one left, and so does a prompt after UNATTRIBUTED_IDLE_MS without activity.
 * `hostFiles` are the host's own state files of the session: they count as
 * activity and are dropped with the markers. A session start also removes
 * the markers of any session untouched for STALE_SESSION_MS.
 */
export function startDecisionSession(
  session: DecisionSession,
  cause: "startup" | "resume" | "prompt",
  options: { now?: number; hostFiles?: readonly string[] } = {},
): boolean {
  const now = options.now ?? Date.now();
  const hostFiles = options.hostFiles ?? [];
  let root: string;
  try {
    root = guardRoot(session);
  } catch {
    return false;
  }
  const own = sessionKey(session);
  let dropped = false;
  if (!session.sessionId?.trim() && cause !== "resume") {
    const files = [...markerFiles(path.join(root, own)), ...hostFiles];
    dropped =
      cause === "startup" || newestOf(files) < now - UNATTRIBUTED_IDLE_MS;
    if (dropped) {
      for (const file of files) removeQuietly(file);
    }
  }
  if (cause === "prompt") return dropped;
  let keys: string[] = [];
  try {
    keys = fs.readdirSync(root);
  } catch {
    // No markers yet.
  }
  for (const key of keys) {
    if (key === own) continue;
    const dir = path.join(root, key);
    // A directory without markers is left over too.
    if (!(newestOf(markerFiles(dir)) >= now - STALE_SESSION_MS)) {
      removeQuietly(dir);
    }
  }
  return dropped;
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
  now = Date.now(),
): string | undefined {
  startDecisionSession(session, "prompt", { now });
  const rule = statedRule(prompt);
  try {
    writeMarker(
      sessionPath(session, "request-words.json"),
      JSON.stringify(requestTopicWords(prompt)),
    );
  } catch {
    // Best effort.
  }
  if (rule !== undefined) {
    markDecisionFlag(session, "rule-prompt");
    try {
      writeMarker(sessionPath(session, "rule-phrase"), rule);
      // The latest rule prompt's reason, or none: an empty marker.
      writeMarker(
        sessionPath(session, "rule-reason"),
        statedReason(prompt) ?? "",
      );
    } catch {
      // Best effort: without it the reminders read as for no rule.
    }
  }
  return rule;
}

/** The reason the session's latest rule prompt gave, or undefined. */
export function sessionRuleReason(
  session: DecisionSession,
): string | undefined {
  let reason = "";
  try {
    reason = String(fs.readFileSync(sessionPath(session, "rule-reason")));
  } catch {
    // No rule prompt this session, or no state directory.
  }
  return reason || undefined;
}

/** The phrase of the session's latest prompt that read as a rule, or undefined. */
export function sessionRulePhrase(
  session: DecisionSession,
): string | undefined {
  let phrase = "";
  try {
    phrase = String(fs.readFileSync(sessionPath(session, "rule-phrase")));
  } catch {
    // No rule prompt this session, or no state directory.
  }
  return phrase || undefined;
}

/**
 * The rule capture template, the first time a session whose prompt read as a
 * rule changes source files before anything is recorded; otherwise undefined.
 * A host that delivers it before the edit passes `editingSource` for an edit
 * of a source file, which counts as the change.
 */
export function claimRuleCaptureTemplate(
  session: DecisionSession,
  editingSource = false,
): string | undefined {
  const phrase = sessionRulePhrase(session);
  if (
    phrase === undefined ||
    !(editingSource || hasDecisionFlag(session, "source-edited")) ||
    hasDecisionFlag(session, "kb-recorded") ||
    !claimDecisionFlag(session, "capture-template")
  )
    return undefined;
  return ruleCaptureTemplate(phrase, sessionRuleReason(session));
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
 * Whether a kb_upsert call's input writes a requirement (not a dry run). A
 * kb_record input (a statement and who said it) always writes one. Hosts
 * pass the MCP arguments, sometimes wrapped in `arguments`.
 */
export function isRequirementUpsert(toolInput: unknown): boolean {
  const input = record(toolInput);
  const args = record(input?.arguments) ?? record(input?.args) ?? input;
  const recorded =
    typeof args?.statement === "string" && typeof args.saidBy === "string";
  if (!args || (args.type !== "req" && !recorded)) return false;
  return args.dryRun !== true;
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
export function holdRuleNote(
  session: DecisionSession,
  phrase: string,
  reason?: string,
): void {
  try {
    writeMarker(
      sessionPath(session, "rule-note"),
      rulePromptNote(phrase, reason),
    );
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
