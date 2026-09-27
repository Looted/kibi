#!/usr/bin/env node
// implements REQ-claude-code-kibi-plugin-v1
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { parseHookInput, parseStdinJson, readStdin } from "./hook-input.js";
import type { HookInput } from "./hook-input.js";
import {
  type KbUsage,
  extractCliKbUsage,
  extractMcpKbUsage,
} from "./kb-tools.js";
import {
  type EntitySummary,
  type IndexedSymbol,
  type KnowledgeIndex,
  loadKnowledgeIndex,
  readEntitySummary,
} from "./knowledge-index.js";
import { classifyPath, toWorkspacePath } from "./path-policy.js";
import {
  type SessionEvent,
  type SessionState,
  appendSessionEvents,
  loadSessionState,
  sessionDir,
  workspaceDataDir,
} from "./session-state.js";
import {
  DIRECT_KB_ACCESS_NOTE,
  type LineRange,
  fileKnowledgeSnippet,
  focusUpdate,
  focusedSymbols,
  searchTip,
  sessionStartContext,
  stopReminder,
  unownedSourceNote,
} from "./snippets.js";
import { resolveKibiWorkspace } from "./workspace-optin.js";

export type ContextEvent = "SessionStart" | "PreToolUse" | "Stop";

/** Claude Code hook stdout. An empty object means "no opinion". */
export type HookOutput = {
  hookSpecificOutput?: {
    hookEventName: ContextEvent;
    additionalContext: string;
  };
};

export type HookEnvironment = {
  pluginData?: string | undefined;
  projectDir?: string | undefined;
};

const readTools = new Set(["Read"]);
const editTools = new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);
const searchTools = new Set(["Grep", "Glob"]);
/** Files larger than this are not scanned to locate an edit. */
const MAX_FOCUS_SCAN_BYTES = 2 * 1024 * 1024;

function context(event: ContextEvent, text: string): HookOutput {
  return {
    hookSpecificOutput: { hookEventName: event, additionalContext: text },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toolPath(toolInput: unknown): string | undefined {
  if (!isRecord(toolInput)) return undefined;
  const candidate = toolInput.file_path ?? toolInput.notebook_path;
  return typeof candidate === "string" ? candidate : undefined;
}

function linkedFileCount(index: KnowledgeIndex): number {
  return Object.values(index.files).filter((symbols) =>
    symbols.some((symbol) => symbol.implements.length > 0),
  ).length;
}

/** Read window of a Read call; no focus when the whole file is read. */
export function readFocus(toolInput: unknown): LineRange[] | undefined {
  if (!isRecord(toolInput)) return undefined;
  const offset =
    typeof toolInput.offset === "number" ? toolInput.offset : undefined;
  const limit =
    typeof toolInput.limit === "number" ? toolInput.limit : undefined;
  if (offset === undefined && limit === undefined) return undefined;
  const start = Math.max(1, offset ?? 1);
  return [{ start, end: limit !== undefined ? start + limit - 1 : start }];
}

/** Lines an Edit/MultiEdit will replace, located in the current file content. */
export function editFocus(
  absolutePath: string,
  toolInput: unknown,
): LineRange[] | undefined {
  if (!isRecord(toolInput)) return undefined;
  const needles: string[] = [];
  if (typeof toolInput.old_string === "string")
    needles.push(toolInput.old_string);
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (isRecord(edit) && typeof edit.old_string === "string") {
        needles.push(edit.old_string);
      }
    }
  }
  const usable = needles.filter((needle) => needle.length > 0);
  if (usable.length === 0) return undefined;

  let content: string;
  try {
    if (fs.statSync(absolutePath).size > MAX_FOCUS_SCAN_BYTES) return undefined;
    content = fs.readFileSync(absolutePath, "utf8");
  } catch {
    return undefined;
  }

  const ranges: LineRange[] = [];
  for (const needle of usable) {
    const offset = content.indexOf(needle);
    if (offset < 0) continue;
    const start = content.slice(0, offset).split("\n").length;
    ranges.push({ start, end: start + needle.split("\n").length - 1 });
  }
  return ranges.length > 0 ? ranges : undefined;
}

function isExplored(state: SessionState, relativePath: string): boolean {
  return state.exploredPaths.has(relativePath);
}

function requirementIds(symbols: readonly IndexedSymbol[]): string[] {
  return [...new Set(symbols.flatMap((symbol) => symbol.implements))];
}

type Workspace = {
  root: string;
  stateDir: string | undefined;
  index: () => KnowledgeIndex;
  summarize: (entityId: string) => EntitySummary;
};

function preToolUse(input: HookInput, workspace: Workspace): HookOutput {
  const toolName = input.toolName ?? "";
  const state = loadSessionState(workspace.stateDir);
  const events: SessionEvent[] = [];
  const emit = (text: string): HookOutput => {
    appendSessionEvents(workspace.stateDir, events);
    return context("PreToolUse", text);
  };

  if (searchTools.has(toolName)) {
    if (state.kbUsed || state.notices.has("search-tip")) return {};
    const linked = linkedFileCount(workspace.index());
    if (linked === 0) return {};
    events.push({ kind: "notice", name: "search-tip" });
    return emit(searchTip(linked));
  }

  const isRead = readTools.has(toolName);
  const isEdit = editTools.has(toolName);
  if (!isRead && !isEdit) return {};

  const rawPath = toolPath(input.toolInput);
  const target = rawPath
    ? toWorkspacePath(workspace.root, rawPath, input.cwd)
    : undefined;
  if (!target) return {};
  const kind = classifyPath(target.relative);

  if (kind === "kb") {
    if (state.notices.has("kb-direct")) return {};
    events.push({ kind: "notice", name: "kb-direct" });
    return emit(DIRECT_KB_ACCESS_NOTE);
  }
  if (kind === "other") return {};

  const relativePath = target.relative;
  const symbols = workspace.index().files[relativePath] ?? [];

  if (isRead) {
    if (
      state.shownRead.has(relativePath) ||
      state.shownEdit.has(relativePath) ||
      isExplored(state, relativePath)
    ) {
      return {};
    }
    const owners = requirementIds(symbols);
    if (owners.length > 0 && owners.every((id) => state.exploredIds.has(id))) {
      return {};
    }
    const snippet = fileKnowledgeSnippet({
      relativePath,
      symbols,
      surface: "read",
      focus: readFocus(input.toolInput),
      summarize: workspace.summarize,
    });
    if (!snippet) return {};
    events.push({ kind: "shown", surface: "read", path: relativePath });
    return emit(snippet);
  }

  // Edit-like tools.
  const focus =
    toolName === "Edit" || toolName === "MultiEdit"
      ? editFocus(target.absolute, input.toolInput)
      : undefined;

  if (state.shownEdit.has(relativePath)) {
    // Only a symbol not yet announced for this file is new information.
    const symbol = focusedSymbols(symbols, focus)[0];
    if (!symbol || symbol.implements.length === 0) return {};
    const key = `${relativePath}#${symbol.id}`;
    if (state.shownEdit.has(key)) return {};
    const update = focusUpdate(relativePath, symbols, focus);
    if (!update) return {};
    events.push({ kind: "shown", surface: "edit", path: key });
    return emit(update);
  }

  const alreadyKnown =
    state.shownRead.has(relativePath) || isExplored(state, relativePath);
  const focusSymbol = focusedSymbols(symbols, focus)[0];
  if (focusSymbol) {
    events.push({
      kind: "shown",
      surface: "edit",
      path: `${relativePath}#${focusSymbol.id}`,
    });
  }
  events.push({ kind: "shown", surface: "edit", path: relativePath });

  if (alreadyKnown) {
    const update = focusUpdate(relativePath, symbols, focus);
    if (update) return emit(update);
    appendSessionEvents(workspace.stateDir, events);
    return {};
  }

  const snippet = fileKnowledgeSnippet({
    relativePath,
    symbols,
    surface: "edit",
    focus,
    summarize: workspace.summarize,
  });
  if (snippet) return emit(snippet);

  if (kind === "source") return emit(unownedSourceNote(relativePath));
  appendSessionEvents(workspace.stateDir, events);
  return {};
}

function recordKbUsage(
  usage: KbUsage,
  workspace: Workspace,
  events: SessionEvent[],
): void {
  const paths = usage.paths
    .map(
      (candidate) =>
        // kb_* source paths are repo-relative by contract.
        toWorkspacePath(workspace.root, candidate, workspace.root)?.relative,
    )
    .filter((candidate): candidate is string => candidate !== undefined);
  events.push({
    kind: "kb",
    operation: usage.operation,
    paths,
    ids: usage.ids,
  });
  if (usage.check) {
    events.push({ kind: "checked", paths, all: usage.checkAll });
  }
}

function postToolUse(input: HookInput, workspace: Workspace): HookOutput {
  const toolName = input.toolName ?? "";
  const events: SessionEvent[] = [];

  if (editTools.has(toolName)) {
    const rawPath = toolPath(input.toolInput);
    const target = rawPath
      ? toWorkspacePath(workspace.root, rawPath, input.cwd)
      : undefined;
    if (target) {
      events.push({
        kind: "edited",
        path: target.relative,
        pathKind: classifyPath(target.relative),
      });
    }
  } else if (toolName === "Bash") {
    const usage = isRecord(input.toolInput)
      ? extractCliKbUsage(input.toolInput.command)
      : undefined;
    if (usage) recordKbUsage(usage, workspace, events);
  } else {
    const usage = extractMcpKbUsage(toolName, input.toolInput);
    if (usage) recordKbUsage(usage, workspace, events);
  }

  appendSessionEvents(workspace.stateDir, events);
  return {};
}

function stop(input: HookInput, workspace: Workspace): HookOutput {
  // One continuation per stop: never re-prompt while a Stop hook already did.
  if (input.stopHookActive) return {};
  const state = loadSessionState(workspace.stateDir);
  const unreminded = state.pendingSource.filter(
    (pending) => !state.reminded.has(pending),
  );
  if (unreminded.length === 0) return {};
  appendSessionEvents(workspace.stateDir, [
    { kind: "reminded", paths: unreminded },
  ]);
  return context("Stop", stopReminder(unreminded));
}

export async function runHook(
  rawInput: unknown,
  environment: HookEnvironment = {},
): Promise<HookOutput> {
  const input = parseHookInput(rawInput);
  // Without session memory every read would repeat its snippet, so hosts that
  // predate CLAUDE_PLUGIN_DATA fall back to a per-user temp directory.
  const pluginData =
    environment.pluginData ??
    process.env.CLAUDE_PLUGIN_DATA ??
    path.join(os.tmpdir(), `kibi-claude-${process.getuid?.() ?? "user"}`);
  const projectDir = environment.projectDir ?? process.env.CLAUDE_PROJECT_DIR;

  // Workspaces that never adopted Kibi stay silent: no output, no state.
  const resolved = resolveKibiWorkspace(
    input.cwd ?? projectDir ?? process.cwd(),
  );
  if (!resolved.optedIn) return {};

  const dataDir = workspaceDataDir(pluginData, resolved.root);
  let index: KnowledgeIndex | undefined;
  const summaries = new Map<string, EntitySummary>();
  const workspace: Workspace = {
    root: resolved.root,
    stateDir: sessionDir(dataDir, input.sessionId),
    index: () => {
      index ??= loadKnowledgeIndex(resolved.root, dataDir);
      return index;
    },
    summarize: (entityId) => {
      let summary = summaries.get(entityId);
      if (!summary) {
        summary = readEntitySummary(resolved.root, entityId);
        summaries.set(entityId, summary);
      }
      return summary;
    },
  };

  switch (input.event) {
    case "SessionStart":
      return context(
        "SessionStart",
        sessionStartContext(linkedFileCount(workspace.index())),
      );
    case "PreToolUse":
      return preToolUse(input, workspace);
    case "PostToolUse":
      return postToolUse(input, workspace);
    case "Stop":
      return stop(input, workspace);
    default:
      return {};
  }
}

async function main(): Promise<void> {
  const result = await runHook(parseStdinJson(await readStdin()));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function isInvokedAsCli(argv1: string | undefined, moduleUrl: string): boolean {
  const invokedPath = argv1 ? pathToFileURL(path.resolve(argv1)).href : "";
  return moduleUrl === invokedPath;
}

/**
 * Hooks are advisory: any failure is reported on stderr (visible in Claude
 * Code's debug output) and the tool call proceeds without added context.
 */
async function runHookCli(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`kibi-claude hook error: ${message}\n`);
    process.stdout.write("{}\n");
  }
}

if (isInvokedAsCli(process.argv[1], import.meta.url)) {
  void runHookCli();
}
