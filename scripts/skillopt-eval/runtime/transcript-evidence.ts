/**
 * Evaluator lanes read from the target's Codex transcript: the final answer
 * (H1) and the ordering of Kibi consultation against source edits (H2).
 *
 * The transcript is model-authored evidence. Nothing here trusts it beyond
 * what it literally says: the answer lane only extracts what the agent told
 * the user, and the ordering lane only counts events the host recorded.
 */

import { routedOperationName } from "./mcp-tool-names";

/** Verdict values a `kibi-answer` block may carry. */
// implements REQ-skillopt-codex-optimization
export const KIBI_ANSWER_VERDICTS = [
  "governed",
  "conflict",
  "infeasible",
  "unknown",
  "no_knowledge",
  "analysis_incomplete",
  "unresolved",
  "no_conflict",
] as const;

// implements REQ-skillopt-codex-optimization
export type KibiAnswer = Readonly<{
  /** Where the structured fields came from. */
  source: "block" | "regex" | "none";
  verdict: string | null;
  governing: readonly string[];
  conflict: string | null;
  unknowns: readonly string[];
  nextStep: string | null;
  /** Optional proof state the answer reports (`proven`, `unresolved`, ...). */
  proof: string | null;
}>;

// implements REQ-skillopt-codex-optimization
export type FinalAnswerEvidence = Readonly<{
  /** The user-facing text of the final agent message ("" when absent). */
  text: string;
  answer: KibiAnswer;
}>;

// implements REQ-skillopt-codex-optimization
export type TranscriptOrdering = Readonly<{
  /** Event index of the first brokered `kb_search` call, or null. */
  firstKbSearchIndex: number | null;
  /** Event index of the first file change/patch event, or null. */
  firstEditIndex: number | null;
  /** Kibi calls (excluding `kb_skills`) observed before the first edit. */
  kibiCallsBeforeFirstEdit: number;
  /** Workspace-relative paths named by file change events. */
  editedPaths: readonly string[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseLines(transcript: string): readonly Record<string, unknown>[] {
  const events: Record<string, unknown>[] = [];
  for (const line of transcript.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isRecord(parsed)) events.push(parsed);
    } catch {
      // Malformed lines are reported by normalizeCodexJsonl; skip them here.
    }
  }
  return events;
}

/** The item an event describes (`item.*`, legacy `msg`, or the event itself). */
function eventItem(event: Record<string, unknown>): Record<string, unknown> {
  if (isRecord(event.item)) return event.item;
  if (isRecord(event.msg)) return event.msg;
  if (isRecord(event.payload) && isRecord(event.payload.item)) {
    return event.payload.item;
  }
  return event;
}

function agentMessageText(event: Record<string, unknown>): string | null {
  const item = eventItem(event);
  if (item.type !== "agent_message") return null;
  if (typeof event.type === "string" && event.type === "item.started") {
    return null;
  }
  const text = item.text ?? item.message;
  return typeof text === "string" ? text : null;
}

/**
 * The target runs with an output schema, so its final message is usually a
 * JSON object whose `answer` string carries the user-facing answer. A plain
 * text final message is used as-is.
 */
function userFacingText(message: string): string {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{")) return message;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isRecord(parsed) && typeof parsed.answer === "string") {
      return parsed.answer;
    }
  } catch {
    // Not JSON; keep the raw text.
  }
  return message;
}

/** The last agent message's user-facing text, or "" when there is none. */
// implements REQ-skillopt-codex-optimization
export function lastAgentMessage(transcript: string): string {
  let last: string | null = null;
  for (const event of parseLines(transcript)) {
    const text = agentMessageText(event);
    if (text !== null) last = text;
  }
  return last === null ? "" : userFacingText(last);
}

const ENTITY_ID_PATTERN =
  /\b(?:REQ|ADR|FACT|SCEN|TEST|SYM)-[A-Za-z0-9_.-]*[A-Za-z0-9]/g;

function stringList(value: unknown): readonly string[] {
  if (typeof value === "string") return value.trim() === "" ? [] : [value];
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return entry.trim() === "" ? [] : [entry];
    if (isRecord(entry) && typeof entry.id === "string") return [entry.id];
    return [];
  });
}

function optionalString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (isRecord(value) || Array.isArray(value)) return JSON.stringify(value);
  return null;
}

function normalizeVerdict(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalized === "" ? null : normalized;
}

function blockAnswer(text: string): KibiAnswer | null {
  const blocks = [...text.matchAll(/```kibi-answer[^\n]*\n([\s\S]*?)```/g)];
  const body = blocks.at(-1)?.[1];
  if (body === undefined) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  return {
    source: "block",
    verdict: normalizeVerdict(optionalString(parsed.verdict)),
    governing: stringList(parsed.governing).flatMap((entry) => {
      const ids = entry.match(ENTITY_ID_PATTERN);
      return ids === null ? [entry] : ids;
    }),
    conflict: optionalString(parsed.conflict),
    unknowns: stringList(parsed.unknowns),
    nextStep: optionalString(parsed.nextStep ?? parsed.next_step),
    proof: normalizeVerdict(optionalString(parsed.proof)),
  };
}

function lineValue(text: string, label: RegExp): string | null {
  for (const line of text.split("\n")) {
    const match = line.match(label);
    const value = match?.[1]?.trim();
    if (value !== undefined && value !== "") return value;
  }
  return null;
}

/**
 * Regex fallback for answers without a fenced block. Governing IDs are the
 * requirement IDs on lines that say "govern" and do not call the requirement
 * superseded, so "REQ-a (superseded by REQ-b)" never counts REQ-a.
 */
function regexAnswer(text: string): KibiAnswer {
  const verdictText = lineValue(
    text,
    /\bverdict\b[*_`\s]*[:=-]\s*[*_`]*([A-Za-z_ -]+?)[*_`]*(?:[.;,(]|$)/i,
  );
  const governing = new Set<string>();
  for (const line of text.split("\n")) {
    if (!/govern/i.test(line) || /supersed|not\s+govern/i.test(line)) continue;
    for (const id of line.match(/\bREQ-[A-Za-z0-9_.-]*[A-Za-z0-9]/g) ?? []) {
      governing.add(id);
    }
  }
  const unknownsText = lineValue(text, /\bunknowns?\b[*_`\s]*[:=]\s*(.+)$/i);
  const structured =
    verdictText !== null || governing.size > 0 || unknownsText !== null;
  return {
    source: structured ? "regex" : "none",
    verdict: normalizeVerdict(verdictText),
    governing: [...governing],
    conflict: lineValue(text, /\bconflict\b[*_`\s]*[:=]\s*(.+)$/i),
    unknowns:
      unknownsText === null
        ? []
        : unknownsText
            .split(/[;,]/)
            .map((entry) => entry.trim())
            .filter((entry) => entry !== "" && !/^none\.?$/i.test(entry)),
    nextStep: lineValue(text, /\bnext\s*step\b[*_`\s]*[:=]\s*(.+)$/i),
    proof: normalizeVerdict(
      lineValue(text, /\bproof(?:\s*state)?\b[*_`\s]*[:=]\s*`?([A-Za-z_]+)/i),
    ),
  };
}

/** Parse a fenced `kibi-answer` JSON block, falling back to labelled lines. */
// implements REQ-skillopt-codex-optimization
export function parseKibiAnswer(text: string): KibiAnswer {
  return blockAnswer(text) ?? regexAnswer(text);
}

// implements REQ-skillopt-codex-optimization
export function finalAnswerEvidence(transcript: string): FinalAnswerEvidence {
  const text = lastAgentMessage(transcript);
  return { text, answer: parseKibiAnswer(text) };
}

const EDIT_ITEM_TYPES = new Set(["file_change", "patch_apply", "apply_patch"]);
const EDIT_EVENT_TYPES = new Set(["patch_apply_begin", "patch_apply_end"]);
// A shell command that writes into src/ is an edit even without a patch event.
const SHELL_SOURCE_WRITE =
  /(?:>>?\s*\.?\/?src\/|\btee\s+(?:-a\s+)?\.?\/?src\/|\bsed\s+-i\S*\s.*\bsrc\/|\bperl\s+-p?i\S*\s.*\bsrc\/|\b(?:mv|cp)\s+\S+\s+\.?\/?src\/)/;

function itemKey(event: Record<string, unknown>, index: number): string {
  const item = eventItem(event);
  return typeof item.id === "string" ? `item:${item.id}` : `event:${index}`;
}

function mcpToolName(item: Record<string, unknown>): string | null {
  const type = item.type;
  if (
    type !== "mcp_tool_call" &&
    type !== "mcp_call" &&
    type !== "tool_call" &&
    type !== "custom_tool_call" &&
    type !== "function_call"
  ) {
    return null;
  }
  const raw = item.tool ?? item.name ?? item.tool_name;
  if (typeof raw !== "string") return null;
  // Hosts may prefix the server ("kibi__kb_search", "kibi.kb_search").
  const name = raw.split(/__|\.|\//).at(-1) ?? raw;
  const args = isRecord(item.arguments) ? item.arguments : {};
  return routedOperationName(name, args);
}

function editPaths(item: Record<string, unknown>): readonly string[] {
  const changes = Array.isArray(item.changes) ? item.changes : [];
  const fromChanges = changes.flatMap((change) =>
    isRecord(change) && typeof change.path === "string" ? [change.path] : [],
  );
  if (isRecord(item.changes)) return Object.keys(item.changes);
  return fromChanges;
}

function isEdit(
  event: Record<string, unknown>,
  item: Record<string, unknown>,
): boolean {
  if (typeof event.type === "string" && EDIT_EVENT_TYPES.has(event.type)) {
    return true;
  }
  if (typeof item.type === "string" && EDIT_ITEM_TYPES.has(item.type)) {
    return true;
  }
  if (
    (item.type === "custom_tool_call" || item.type === "function_call") &&
    item.name === "apply_patch"
  ) {
    return true;
  }
  return (
    item.type === "command_execution" &&
    typeof item.command === "string" &&
    SHELL_SOURCE_WRITE.test(item.command)
  );
}

function isKibiCli(item: Record<string, unknown>): boolean {
  return (
    item.type === "command_execution" &&
    typeof item.command === "string" &&
    /(?:^|[\s/'"])kibi\s+(?!skills-)[a-z]/.test(item.command)
  );
}

/**
 * Order of Kibi consultation against source edits. Codex reports one item on
 * `item.started`, `item.updated` and `item.completed`; each item counts once,
 * at its first appearance.
 */
// implements REQ-skillopt-codex-optimization
export function transcriptOrdering(transcript: string): TranscriptOrdering {
  const seen = new Set<string>();
  let firstKbSearchIndex: number | null = null;
  let firstEditIndex: number | null = null;
  let kibiCalls = 0;
  let kibiCallsBeforeFirstEdit = 0;
  const editedPaths = new Set<string>();
  for (const [index, event] of parseLines(transcript).entries()) {
    const key = itemKey(event, index);
    if (seen.has(key)) continue;
    seen.add(key);
    const item = eventItem(event);
    const tool = mcpToolName(item);
    if (tool?.startsWith("kb_")) {
      if (tool !== "kb_skills") kibiCalls += 1;
      if (tool === "kb_search" && firstKbSearchIndex === null) {
        firstKbSearchIndex = index;
      }
      continue;
    }
    if (isKibiCli(item)) {
      kibiCalls += 1;
      if (
        firstKbSearchIndex === null &&
        /\bkibi\s+search\b/.test(String(item.command))
      ) {
        firstKbSearchIndex = index;
      }
      continue;
    }
    if (isEdit(event, item)) {
      for (const path of editPaths(item)) editedPaths.add(path);
      if (firstEditIndex === null) {
        firstEditIndex = index;
        kibiCallsBeforeFirstEdit = kibiCalls;
      }
    }
  }
  return {
    firstKbSearchIndex,
    firstEditIndex,
    kibiCallsBeforeFirstEdit:
      firstEditIndex === null ? kibiCalls : kibiCallsBeforeFirstEdit,
    editedPaths: [...editedPaths],
  };
}
