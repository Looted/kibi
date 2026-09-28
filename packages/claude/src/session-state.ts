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
  /** A file was changed by an edit tool. */
  | { kind: "edited"; path: string; pathKind: string }
  /** A check acknowledged pending edits (all of them when `all`). */
  | { kind: "checked"; paths: string[]; all: boolean }
  /** A Stop reminder named these paths. */
  | { kind: "reminded"; paths: string[] };

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
      for (const explored of event.paths) state.exploredPaths.add(explored);
      for (const id of event.ids) state.exploredIds.add(id);
      return;
    case "edited":
      if (event.pathKind !== "source") return;
      // A later edit invalidates an earlier check and reminder for the path.
      state.pendingSource = [
        ...state.pendingSource.filter((pending) => pending !== event.path),
        event.path,
      ];
      state.reminded.delete(event.path);
      return;
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
