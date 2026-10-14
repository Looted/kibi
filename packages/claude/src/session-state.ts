// implements REQ-claude-code-kibi-plugin-v1
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Per-session hook memory, stored as an append-only JSONL journal.
 *
 * Claude Code runs hooks for parallel tool calls concurrently, so a
 * read-modify-write JSON file would lose updates. Each hook instead appends
 * one small event line (a single O_APPEND write) and state is the replay of
 * the journal. The journal lives under `CLAUDE_PLUGIN_DATA`, keyed by the
 * hashed workspace root and session id, so sessions and worktrees never see
 * each other's state.
 */

export type SessionEvent =
  /** A snippet was shown for a path (`read` or `edit` surface). */
  | { kind: "shown"; surface: "read" | "edit"; path: string }
  /** A one-per-session notice was shown. */
  | { kind: "notice"; name: string }
  /** The agent used Kibi; paths/ids it explored. */
  | { kind: "kb"; operation: string; paths: string[]; ids: string[] }
  /** A file was changed by an edit tool or a shell command. */
  | { kind: "edited"; path: string; pathKind: string }
  /** A shell command started (epoch milliseconds), to attribute its writes. */
  | { kind: "command_started"; at: number }
  /** A check acknowledged pending edits (all of them when `all`). */
  | { kind: "checked"; paths: string[]; all: boolean }
  /** A Stop reminder named these paths. */
  | { kind: "reminded"; paths: string[] }
  /**
   * The host dropped the conversation context (SessionStart after a compact
   * or clear), so everything shown so far is gone from the model's view.
   */
  | { kind: "context_reset" }
  /**
   * The person submitted a prompt: its topic words, and whether it reads as
   * a rule or decision ("must", "never", "from now on").
   */
  | { kind: "prompt"; words: string[]; rule: boolean }
  /**
   * An edit of `path` was put to the person because it changes code that
   * implements these firm requirements.
   */
  | { kind: "firm_asked"; path: string; ids: string[] };

export type SessionState = {
  shownRead: Set<string>;
  shownEdit: Set<string>;
  notices: Set<string>;
  kbUsed: boolean;
  exploredPaths: Set<string>;
  exploredIds: Set<string>;
  /** Edited source paths not yet acknowledged by a later check. */
  pendingSource: string[];
  reminded: Set<string>;
  /** Start of the latest shell command, when one was recorded. */
  commandStartedAt: number | undefined;
  /** Topic words of the latest prompt. */
  requestWords: string[];
  /** True once any prompt this session read as a rule or decision. */
  rulePrompt: boolean;
  /** Firm requirements whose edit was put to the person, by edited path. */
  firmAsked: Map<string, string[]>;
  /** Firm requirements the person let an edit change this session. */
  firmConfirmed: Set<string>;
  /** True once any source file was changed this session. */
  sourceEdited: boolean;
  /** True once the agent wrote to the knowledge base this session. */
  kbRecorded: boolean;
};

const JOURNAL = "session.jsonl";

export function workspaceDataDir(
  pluginData: string | undefined,
  workspaceRoot: string,
): string | undefined {
  if (!pluginData) return undefined;
  const key = createHash("sha256")
    .update(path.resolve(workspaceRoot))
    .digest("hex")
    .slice(0, 32);
  return path.join(pluginData, "workspaces", key);
}

export function sessionDir(
  workspaceDir: string | undefined,
  sessionId: string | undefined,
): string | undefined {
  if (!workspaceDir) return undefined;
  const trimmed = sessionId?.trim() ?? "";
  const key =
    trimmed.length > 0
      ? createHash("sha256").update(trimmed).digest("hex").slice(0, 32)
      : "unattributed";
  return path.join(workspaceDir, "sessions", key);
}

export function emptySessionState(): SessionState {
  return {
    shownRead: new Set(),
    shownEdit: new Set(),
    notices: new Set(),
    kbUsed: false,
    exploredPaths: new Set(),
    exploredIds: new Set(),
    pendingSource: [],
    reminded: new Set(),
    commandStartedAt: undefined,
    requestWords: [],
    rulePrompt: false,
    firmAsked: new Map(),
    firmConfirmed: new Set(),
    sourceEdited: false,
    kbRecorded: false,
  };
}

export function applyEvent(state: SessionState, event: SessionEvent): void {
  switch (event.kind) {
    case "shown":
      (event.surface === "read" ? state.shownRead : state.shownEdit).add(
        event.path,
      );
      return;
    case "notice":
      state.notices.add(event.name);
      return;
    case "kb":
      state.kbUsed = true;
      if (event.operation === "kb_upsert") state.kbRecorded = true;
      for (const explored of event.paths) state.exploredPaths.add(explored);
      for (const id of event.ids) state.exploredIds.add(id);
      return;
    case "edited": {
      // An edit that reached PostToolUse was allowed, so the person accepted
      // the firm requirements its confirmation named.
      for (const id of state.firmAsked.get(event.path) ?? []) {
        state.firmConfirmed.add(id);
      }
      state.firmAsked.delete(event.path);
      if (event.pathKind !== "source") return;
      state.sourceEdited = true;
      // A later edit invalidates an earlier check and reminder for the path.
      state.pendingSource = [
        ...state.pendingSource.filter((pending) => pending !== event.path),
        event.path,
      ];
      state.reminded.delete(event.path);
      return;
    }
    case "checked":
      state.pendingSource = event.all
        ? []
        : state.pendingSource.filter(
            (pending) => !event.paths.includes(pending),
          );
      return;
    case "reminded":
      for (const reminded of event.paths) state.reminded.add(reminded);
      return;
    case "command_started":
      state.commandStartedAt = Math.max(state.commandStartedAt ?? 0, event.at);
      return;
    case "prompt":
      state.requestWords = event.words;
      if (event.rule) state.rulePrompt = true;
      return;
    case "firm_asked":
      state.firmAsked.set(event.path, [
        ...new Set([...(state.firmAsked.get(event.path) ?? []), ...event.ids]),
      ]);
      return;
    case "context_reset":
      // Snippets, notices and Kibi lookups shown before the reset are no
      // longer in context, so they may be shown again. Pending edits and
      // their reminders describe work done, not context, and are kept.
      state.shownRead.clear();
      state.shownEdit.clear();
      state.notices.clear();
      state.exploredPaths.clear();
      state.exploredIds.clear();
      return;
  }
}

export function loadSessionState(dir: string | undefined): SessionState {
  const state = emptySessionState();
  if (!dir) return state;
  let journal: string;
  try {
    journal = fs.readFileSync(path.join(dir, JOURNAL), "utf8");
  } catch {
    return state;
  }
  for (const line of journal.split("\n")) {
    if (line.length === 0) continue;
    try {
      applyEvent(state, JSON.parse(line) as SessionEvent);
    } catch {
      // A torn or foreign line is skipped; the rest of the journal still applies.
    }
  }
  return state;
}

export function appendSessionEvents(
  dir: string | undefined,
  events: readonly SessionEvent[],
): void {
  if (!dir || events.length === 0) return;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(
      path.join(dir, JOURNAL),
      events.map((event) => `${JSON.stringify(event)}\n`).join(""),
    );
  } catch {
    // Hook memory is best effort; failure means a snippet may repeat.
  }
}
