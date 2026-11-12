import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const stateFileName = "hook-state.json";
const journalFileName = "hook-state.events.jsonl";
const maxDirtyPaths = 50;
const workspaceStateRoot = "workspaces";

/**
 * The plugin data directory: the one the host names (`ZCODE_PLUGIN_DATA`, or
 * the `CLAUDE_PLUGIN_DATA` alias), else a per-user temp directory, so edits
 * seen by one hook run still reach the Stop reminder when none is named.
 */
export function resolvePluginDataDir(
  explicit: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (
    explicit ||
    env.ZCODE_PLUGIN_DATA?.trim() ||
    env.CLAUDE_PLUGIN_DATA?.trim() ||
    path.join(os.tmpdir(), `kibi-zcode-${process.getuid?.() ?? "user"}`)
  );
}

/**
 * Hook state lives under a per-workspace directory keyed by the resolved Kibi
 * project root, so edits in one project can never surface as reminders in
 * another (worktrees included — their roots differ from the main checkout).
 * Within a workspace, state is namespaced per host session so one session
 * cannot consume, clear, or acknowledge another session's pending work.
 * Session ids are hashed before they touch the filesystem; missing ids fall
 * into a dedicated `unattributed` bucket that never touches identified
 * sessions.
 */
export function resolveWorkspaceStateDir(
  pluginData: string | undefined,
  workspaceRoot: string,
): string | undefined {
  if (!pluginData) {
    return undefined;
  }

  const workspaceKey = createHash("sha256")
    .update(path.resolve(workspaceRoot))
    .digest("hex");
  return path.join(pluginData, workspaceStateRoot, workspaceKey);
}

export function resolveSessionStateDir(
  pluginData: string | undefined,
  workspaceRoot: string,
  sessionId: string | undefined,
): string | undefined {
  const workspaceDir = resolveWorkspaceStateDir(pluginData, workspaceRoot);
  if (!workspaceDir) {
    return undefined;
  }

  const trimmed = sessionId?.trim();
  const sessionKey = trimmed
    ? createHash("sha256").update(trimmed).digest("hex").slice(0, 32)
    : "unattributed";
  return path.join(workspaceDir, "sessions", sessionKey);
}

export type HookState = {
  dirtyPaths: string[];
  kbCheckRun: boolean;
  impactCheckRun: boolean;
  impactCheckedPaths: string[];
};

function emptyHookState(): HookState {
  return {
    dirtyPaths: [],
    kbCheckRun: false,
    impactCheckRun: false,
    impactCheckedPaths: [],
  };
}

function statePath(pluginData: string): string {
  return path.join(pluginData, stateFileName);
}

/** The non-empty string entries of a list, as normalized relative paths. */
function pathEntries(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim().replaceAll("\\", "/"))
        .filter((entry) => entry.length > 0)
    : [];
}

/** Normalized path lists, deduplicated and bounded to the newest entries. */
function mergePaths(
  existingPaths: readonly string[],
  addedPaths: readonly string[],
): string[] {
  return [...new Set([...existingPaths, ...addedPaths])].slice(-maxDirtyPaths);
}

function uniqueTempPath(pluginData: string): string {
  return path.join(
    pluginData,
    `${stateFileName}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`,
  );
}

function coerceHookState(value: unknown): HookState {
  // Optional chaining also covers `null` and primitives, which carry no list.
  const record = value as Record<string, unknown> | null | undefined;
  if (!Array.isArray(record?.dirtyPaths)) {
    return emptyHookState();
  }

  return {
    dirtyPaths: mergePaths([], pathEntries(record.dirtyPaths)),
    kbCheckRun: record.kbCheckRun === true,
    impactCheckRun: record.impactCheckRun === true,
    impactCheckedPaths: mergePaths([], pathEntries(record.impactCheckedPaths)),
  };
}

type JournalEvent =
  | { kind: "add_dirty_paths"; dirtyPaths: string[] }
  | { kind: "record_kb_check"; impactCheckRun: boolean; sourceFiles: string[] }
  | { kind: "replace"; state: HookState };

function journalPath(pluginData: string): string {
  return path.join(pluginData, journalFileName);
}

function withDirtyPaths(state: HookState, dirtyPaths: unknown): HookState {
  // A later edit invalidates a previous impact check for that exact path:
  // a check must not cover a newer edit merely because the filename
  // matches. Path-specific invalidation keeps still-current checks for
  // other files intact.
  const editedPaths = pathEntries(dirtyPaths);
  return {
    ...state,
    dirtyPaths: mergePaths(state.dirtyPaths, editedPaths),
    impactCheckedPaths: state.impactCheckedPaths.filter(
      (checkedPath) => !editedPaths.includes(checkedPath),
    ),
  };
}

function withKbCheck(
  state: HookState,
  impactCheckRun: boolean,
  sourceFiles: unknown,
): HookState {
  return {
    ...state,
    kbCheckRun: true,
    impactCheckRun: state.impactCheckRun || impactCheckRun,
    impactCheckedPaths: impactCheckRun
      ? mergePaths(state.impactCheckedPaths, pathEntries(sourceFiles))
      : state.impactCheckedPaths,
  };
}

function readJournal(pluginData: string, initialState: HookState): HookState {
  let contents: string;
  try {
    contents = fs.readFileSync(journalPath(pluginData), "utf8");
  } catch {
    return initialState;
  }

  return contents.split("\n").reduce((state, line) => {
    try {
      // Blank lines and a line torn by a process terminated mid-append fail
      // to parse, and a `null` line fails on property access: each is skipped
      // while later events remain readable and durable. Other non-object
      // lines match no event kind.
      const value = JSON.parse(line) as Record<string, unknown>;
      switch (value.kind) {
        // Earlier releases journaled a stateless `clear`, which coerces to
        // the empty state exactly like the `replace` clearing writes now.
        case "clear":
        case "replace":
          return coerceHookState(value.state);
        case "add_dirty_paths":
          return withDirtyPaths(state, value.dirtyPaths);
        case "record_kb_check":
          return withKbCheck(
            state,
            value.impactCheckRun === true,
            value.sourceFiles,
          );
      }
    } catch {
      // Skipped line; see above.
    }
    return state;
  }, initialState);
}

function appendJournalEvent(pluginData: string, event: JournalEvent): void {
  fs.mkdirSync(pluginData, { recursive: true });
  // appendFileSync writes strings as utf8 by default.
  fs.appendFileSync(journalPath(pluginData), `${JSON.stringify(event)}\n`);
}

function readSnapshot(pluginData: string): HookState {
  try {
    // Without an encoding readFileSync returns a Buffer, which JSON.parse
    // reads as its utf8 text.
    return coerceHookState(
      JSON.parse(fs.readFileSync(statePath(pluginData)).toString()),
    );
  } catch {
    return emptyHookState();
  }
}

export function loadHookState(pluginData: string | undefined): HookState {
  return pluginData
    ? readJournal(pluginData, readSnapshot(pluginData))
    : emptyHookState();
}

export function saveHookState(
  pluginData: string | undefined,
  state: HookState,
): void {
  if (!pluginData) {
    return;
  }

  const boundedState = coerceHookState(state);
  appendJournalEvent(pluginData, { kind: "replace", state: boundedState });
  const tempPath = uniqueTempPath(pluginData);
  fs.writeFileSync(tempPath, `${JSON.stringify(boundedState)}\n`);
  fs.renameSync(tempPath, statePath(pluginData));
}

export function addDirtyPaths(
  pluginData: string | undefined,
  dirtyPaths: readonly string[],
): HookState {
  if (!pluginData) {
    return withDirtyPaths(emptyHookState(), dirtyPaths);
  }

  appendJournalEvent(pluginData, {
    kind: "add_dirty_paths",
    dirtyPaths: [...dirtyPaths],
  });
  return loadHookState(pluginData);
}

/** Only `kb_check` changes hook state; other KB tools leave it as it is. */
export function recordKbMcpTool(
  pluginData: string | undefined,
  toolName: string,
  options: { impactCheckRun?: boolean; sourceFiles?: readonly string[] } = {},
): HookState {
  if (toolName.trim() !== "kb_check") {
    return loadHookState(pluginData);
  }

  const impactCheckRun = options.impactCheckRun === true;
  const sourceFiles = [...(options.sourceFiles ?? [])];
  if (!pluginData) {
    return withKbCheck(emptyHookState(), impactCheckRun, sourceFiles);
  }

  appendJournalEvent(pluginData, {
    kind: "record_kb_check",
    impactCheckRun,
    sourceFiles,
  });
  return loadHookState(pluginData);
}

export function clearDirtyPaths(pluginData: string | undefined): HookState {
  // The replace event saveHookState journals clears every earlier event.
  saveHookState(pluginData, emptyHookState());
  return loadHookState(pluginData);
}
