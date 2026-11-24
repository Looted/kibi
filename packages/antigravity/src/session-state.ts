import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Per-conversation hook memory for Antigravity, stored as an append-only
 * JSONL journal.
 *
 * Antigravity can invoke parallel tool calls within a turn, so each hook
 * appends one small JSONL event (single O_APPEND write) and state is the
 * replay of the journal. Because Antigravity's PreToolUse and PostToolUse
 * contracts do not carry an `additionalContext` field, snippets produced by
 * tool hooks are queued in the journal (`queued_context`) and drained into
 * `injectSteps` by the next `PreInvocation` hook before the model runs.
 */

export type SessionEvent =
  | { kind: "shown"; surface: "read" | "edit"; path: string }
  | { kind: "notice"; name: string }
  | { kind: "kb"; operation: string; paths: string[]; ids: string[] }
  | { kind: "edited"; path: string; pathKind: string; edit?: string }
  | { kind: "command_started"; at: number }
  | { kind: "checked"; paths: string[]; all: boolean }
  | { kind: "reminded"; paths: string[] }
  | {
      kind: "prompt";
      hash: string;
      words: string[];
      rule: boolean;
      phrase?: string;
      reason?: string | undefined;
    }
  | {
      kind: "firm_asked";
      path: string;
      ids: string[];
      at?: number;
      edit?: string;
    }
  | { kind: "firm_reviewed"; path: string; ids: string[] }
  | { kind: "queued_context"; id: string; text: string }
  | { kind: "context_flushed"; ids: string[] };

type QueuedContextItem = {
  id: string;
  text: string;
};

export type SessionState = {
  shownRead: Set<string>;
  shownEdit: Set<string>;
  notices: Set<string>;
  kbUsed: boolean;
  exploredPaths: Set<string>;
  exploredIds: Set<string>;
  pendingSource: string[];
  reminded: Set<string>;
  commandStartedAt: number | undefined;
  lastPromptHash: string | undefined;
  requestWords: string[];
  rulePhrase: string | undefined;
  ruleReason: string | undefined;
  firmAsked: Map<string, string[]>;
  firmAskedAt: Map<string, number>;
  firmAskedEdit: Map<string, string>;
  firmConfirmed: Set<string>;
  sourceEdited: boolean;
  kbRecorded: boolean;
  queuedContext: QueuedContextItem[];
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

function emptySessionState(): SessionState {
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
    lastPromptHash: undefined,
    requestWords: [],
    rulePhrase: undefined,
    ruleReason: undefined,
    firmAsked: new Map(),
    firmAskedAt: new Map(),
    firmAskedEdit: new Map(),
    firmConfirmed: new Set(),
    sourceEdited: false,
    kbRecorded: false,
    queuedContext: [],
  };
}

function applyEvent(state: SessionState, event: SessionEvent): void {
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
      for (const id of state.firmAsked.get(event.path) ?? []) {
        if (
          event.edit !== undefined &&
          state.firmAskedEdit.get(id) === event.edit
        ) {
          state.firmConfirmed.add(id);
        }
      }
      state.firmAsked.delete(event.path);
      if (event.pathKind !== "source") return;
      state.sourceEdited = true;
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
      state.lastPromptHash = event.hash;
      state.requestWords = event.words;
      if (event.phrase) {
        state.rulePhrase = event.phrase;
        state.ruleReason = event.reason || undefined;
      }
      return;
    case "firm_asked":
      state.firmAsked.set(event.path, [
        ...new Set([...(state.firmAsked.get(event.path) ?? []), ...event.ids]),
      ]);
      if (event.at !== undefined) {
        for (const id of event.ids) state.firmAskedAt.set(id, event.at);
      }
      for (const id of event.ids) {
        if (event.edit === undefined) state.firmAskedEdit.delete(id);
        else state.firmAskedEdit.set(id, event.edit);
      }
      return;
    case "firm_reviewed": {
      const left = (state.firmAsked.get(event.path) ?? []).filter(
        (id) => !event.ids.includes(id),
      );
      if (left.length > 0) state.firmAsked.set(event.path, left);
      else state.firmAsked.delete(event.path);
      return;
    }
    case "queued_context":
      if (!state.queuedContext.some((item) => item.id === event.id)) {
        state.queuedContext.push({ id: event.id, text: event.text });
      }
      return;
    case "context_flushed": {
      const flushed = new Set(event.ids);
      state.queuedContext = state.queuedContext.filter(
        (item) => !flushed.has(item.id),
      );
      return;
    }
  }
}

export function sessionJournal(dir: string | undefined): string[] {
  return dir ? [path.join(dir, JOURNAL)] : [];
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
    try {
      applyEvent(state, JSON.parse(line) as SessionEvent);
    } catch {
      // Skip empty or torn lines; remaining events still apply.
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
