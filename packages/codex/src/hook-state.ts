// implements REQ-codex-kibi-plugin-v1
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const stateFileName = "hook-state.json";
const journalFileName = "hook-state.events.jsonl";
const maxDirtyPaths = 50;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDirtyPath(dirtyPath: string): string {
  return dirtyPath.trim().replaceAll("\\", "/");
}

function uniqueTempPath(pluginData: string): string {
  return path.join(
    pluginData,
    `${stateFileName}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`,
  );
}

function mergeDirtyPaths(
  existingPaths: readonly string[],
  dirtyPaths: readonly string[],
): HookState {
  const merged = [...existingPaths, ...dirtyPaths]
    .map(normalizeDirtyPath)
    .filter((dirtyPath) => dirtyPath.length > 0);

  return {
    ...emptyHookState(),
    dirtyPaths: [...new Set(merged)].slice(-maxDirtyPaths),
  };
}

function coerceHookState(value: unknown): HookState {
  if (!isRecord(value) || !Array.isArray(value.dirtyPaths)) {
    return emptyHookState();
  }

  const dirtyPaths = value.dirtyPaths
    .filter((dirtyPath): dirtyPath is string => typeof dirtyPath === "string")
    .map(normalizeDirtyPath)
    .filter((dirtyPath) => dirtyPath.length > 0);

  const impactCheckedPaths = Array.isArray(value.impactCheckedPaths)
    ? value.impactCheckedPaths
        .filter((entry): entry is string => typeof entry === "string")
        .map(normalizeDirtyPath)
        .filter((entry) => entry.length > 0)
    : [];

  return {
    dirtyPaths: [...new Set(dirtyPaths)].slice(-maxDirtyPaths),
    kbCheckRun: value.kbCheckRun === true,
    impactCheckRun: value.impactCheckRun === true,
    impactCheckedPaths: [...new Set(impactCheckedPaths)].slice(-maxDirtyPaths),
  };
}

type JournalEvent =
  | { kind: "add_dirty_paths"; dirtyPaths: string[] }
  | { kind: "record_kb_check"; impactCheckRun: boolean; sourceFiles: string[] }
  | { kind: "clear" }
  | { kind: "replace"; state: HookState };

function journalPath(pluginData: string): string {
  return path.join(pluginData, journalFileName);
}

function applyJournalEvent(state: HookState, event: JournalEvent): HookState {
  switch (event.kind) {
    case "add_dirty_paths":
      return {
        ...state,
        dirtyPaths: mergeDirtyPathValues(state.dirtyPaths, event.dirtyPaths),
      };
    case "record_kb_check":
      return {
        ...state,
        kbCheckRun: true,
        impactCheckRun: state.impactCheckRun || event.impactCheckRun,
        impactCheckedPaths: event.impactCheckRun
          ? mergeDirtyPathValues(state.impactCheckedPaths, event.sourceFiles)
          : state.impactCheckedPaths,
      };
    case "clear":
      return emptyHookState();
    case "replace":
      return coerceHookState(event.state);
  }
}

function readJournal(pluginData: string, initialState: HookState): HookState {
  let contents: string;
  try {
    contents = fs.readFileSync(journalPath(pluginData), "utf8");
  } catch {
    return initialState;
  }

  return contents.split("\n").reduce((state, line) => {
    if (line.trim().length === 0) return state;
    try {
      const value: unknown = JSON.parse(line);
      if (!isRecord(value) || typeof value.kind !== "string") return state;
      if (value.kind === "clear")
        return applyJournalEvent(state, { kind: "clear" });
      if (value.kind === "replace" && isRecord(value.state)) {
        return applyJournalEvent(state, {
          kind: "replace",
          state: coerceHookState(value.state),
        });
      }
      if (value.kind === "add_dirty_paths" && Array.isArray(value.dirtyPaths)) {
        return applyJournalEvent(state, {
          kind: "add_dirty_paths",
          dirtyPaths: value.dirtyPaths.filter(
            (entry): entry is string => typeof entry === "string",
          ),
        });
      }
      if (value.kind === "record_kb_check") {
        return applyJournalEvent(state, {
          kind: "record_kb_check",
          impactCheckRun: value.impactCheckRun === true,
          sourceFiles: Array.isArray(value.sourceFiles)
            ? value.sourceFiles.filter(
                (entry): entry is string => typeof entry === "string",
              )
            : [],
        });
      }
    } catch {
      // A process can be terminated after opening the journal but before its
      // complete line is visible. Ignore only that incomplete event; later
      // events remain readable and durable.
    }
    return state;
  }, initialState);
}

function appendJournalEvent(pluginData: string, event: JournalEvent): void {
  fs.mkdirSync(pluginData, { recursive: true });
  fs.appendFileSync(
    journalPath(pluginData),
    `${JSON.stringify(event)}\n`,
    "utf8",
  );
}

export function loadHookState(pluginData: string | undefined): HookState {
  if (!pluginData) {
    return emptyHookState();
  }

  try {
    return readJournal(
      pluginData,
      coerceHookState(
        JSON.parse(fs.readFileSync(statePath(pluginData), "utf8")),
      ),
    );
  } catch {
    return readJournal(pluginData, emptyHookState());
  }
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
  fs.mkdirSync(pluginData, { recursive: true });
  const tempPath = uniqueTempPath(pluginData);
  fs.writeFileSync(tempPath, `${JSON.stringify(boundedState)}\n`);
  fs.renameSync(tempPath, statePath(pluginData));
}

export function addDirtyPaths(
  pluginData: string | undefined,
  dirtyPaths: readonly string[],
): HookState {
  const initialState = loadHookState(pluginData);
  const fallbackState: HookState = {
    ...initialState,
    dirtyPaths: mergeDirtyPathValues(initialState.dirtyPaths, dirtyPaths),
  };

  if (!pluginData) {
    return fallbackState;
  }

  appendJournalEvent(pluginData, {
    kind: "add_dirty_paths",
    dirtyPaths: [...dirtyPaths],
  });
  return loadHookState(pluginData);
}

function mergeDirtyPathValues(
  existingPaths: readonly string[],
  dirtyPaths: readonly string[],
): string[] {
  return mergeDirtyPaths(existingPaths, dirtyPaths).dirtyPaths;
}

export function recordKbMcpTool(
  pluginData: string | undefined,
  toolName: string,
  options: { impactCheckRun?: boolean; sourceFiles?: readonly string[] } = {},
): HookState {
  const normalized = toolName.trim();
  if (normalized.length === 0) {
    return loadHookState(pluginData);
  }

  const initialState = loadHookState(pluginData);
  const update = (state: HookState): HookState => {
    if (normalized !== "kb_check") {
      return state;
    }

    return {
      ...state,
      kbCheckRun: true,
      impactCheckRun: state.impactCheckRun || options.impactCheckRun === true,
      impactCheckedPaths:
        options.impactCheckRun === true
          ? mergeDirtyPathValues(
              state.impactCheckedPaths,
              options.sourceFiles ?? [],
            )
          : state.impactCheckedPaths,
    };
  };
  const fallbackState = update(initialState);

  if (!pluginData) {
    return fallbackState;
  }

  if (normalized !== "kb_check") {
    return initialState;
  }

  appendJournalEvent(pluginData, {
    kind: "record_kb_check",
    impactCheckRun: options.impactCheckRun === true,
    sourceFiles: [...(options.sourceFiles ?? [])],
  });
  return loadHookState(pluginData);
}

export function clearDirtyPaths(pluginData: string | undefined): HookState {
  const clearedState = emptyHookState();

  if (!pluginData) {
    return clearedState;
  }

  appendJournalEvent(pluginData, { kind: "clear" });
  saveHookState(pluginData, clearedState);
  return loadHookState(pluginData);
}
