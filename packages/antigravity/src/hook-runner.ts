#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  type ShellRead,
  commandEditPaths,
  commandReadViews,
  filesChangedSince,
  isSearchCommand,
} from "kibi-agent-core/bash-command";
import {
  checkoutSessionNote,
  hasKibiPreCommitGate,
} from "kibi-agent-core/checkout-hooks";
import {
  CONFIRM_FIRM_EDITS_ENV,
  confirmFirmEdits,
  firmRequirementsTouched,
  removesOnlyDeadImplementsComments,
} from "kibi-agent-core/decision-guard";
import { firmEditReviewed } from "kibi-agent-core/firm-edit-review";
import { parseStdinJson, readStdin } from "kibi-agent-core/hook-input";
import { skillLoadTrace } from "kibi-agent-core/hook-usage-log";
import {
  globFilter,
  hookReadRows,
  searchToolRead,
} from "kibi-agent-core/read-context";
import {
  requestTopicWords,
  requirementCandidatesForPath,
} from "kibi-agent-core/requirement-candidates";
import {
  createEntitySummarizer,
  implementedRequirementIds,
} from "kibi-agent-core/snippets";
import { resolveKibiWorkspace } from "kibi-agent-core/workspace-optin";

import {
  type EntitySummary,
  type IndexedSymbol,
  type KnowledgeIndex,
  loadKnowledgeIndex,
} from "kibi-agent-core/knowledge-index";
import { classifyPath, toWorkspacePath } from "kibi-agent-core/path-policy";
import { type AntigravityHookInput, parseHookInput } from "./hook-input.js";
import {
  type KbUsage,
  extractCliKbUsage,
  extractMcpKbUsage,
  isVerifiedGitCommit,
  unwrapKibiMcpCall,
  workspaceOverwrite,
} from "./kb-tools.js";
import {
  type SessionEvent,
  type SessionState,
  appendSessionEvents,
  loadSessionState,
  sessionDir,
  sessionJournal,
  workspaceDataDir,
} from "./session-state.js";
import {
  DIRECT_KB_ACCESS_NOTE,
  type LineRange,
  captureReminder,
  claimSignoffReminder,
  editKnowledgeUpdate,
  fileKnowledgeSnippet,
  firmEditConfirmation,
  firmEditContext,
  focusUpdate,
  focusedSymbols,
  isRequirementUpsert,
  markDecisionFlag,
  ruleCaptureTemplate,
  rulePromptNote,
  searchTip,
  sessionStartContext,
  editFocus as sharedEditFocus,
  signoffReminder,
  startDecisionSession,
  statedReason,
  statedRule,
  stopReminder,
  unownedSourceNote,
  unreadableManifestNote,
} from "./snippets.js";
import {
  type HookTrace,
  appendHookUsage,
  flushHookTelemetry,
  hookTelemetryEnabled,
} from "./usage-log.js";

export { CONFIRM_FIRM_EDITS_ENV };

export type InjectedSystemStep = {
  systemMessage: {
    systemMessage: string;
  };
};

export type AntigravityHookOutput = {
  /** SessionStart / PreInvocation / PostInvocation */
  injectSteps?: InjectedSystemStep[];
  /** PreToolUse / Stop */
  decision?: "allow" | "deny" | "ask" | "force_ask" | "continue";
  reason?: string;
  /** PreToolUse shallow argument overwrite */
  overwrite?: Record<string, unknown>;
};

export type HookEnvironment = {
  pluginData?: string | undefined;
  env?: NodeJS.ProcessEnv | undefined;
};

type ToolNames = ReadonlySet<string | undefined>;
const readTools: ToolNames = new Set(["read_file", "view_file"]);
const editTools: ToolNames = new Set([
  "edit_file",
  "write_file",
  "replace_file_content",
  "multi_replace_file_content",
  "write_to_file",
]);
const wholeFileWriteTools: ToolNames = new Set(["write_file", "write_to_file"]);
const searchTools: ToolNames = new Set(["grep_search", "find_by_name"]);
const shellTools: ToolNames = new Set(["run_command"]);

/** Maximum combined characters injected in one PreInvocation turn. */
const MAX_INJECTED_CONTEXT_CHARS = 3600;

function injectSystem(text: string): AntigravityHookOutput {
  return {
    injectSteps: [{ systemMessage: { systemMessage: text } }],
  };
}

function fieldsOf(toolArgs: unknown): Record<string, unknown> {
  return (toolArgs ?? {}) as Record<string, unknown>;
}

function toolPath(toolArgs: unknown): string | undefined {
  const fields = fieldsOf(toolArgs);
  const candidate =
    fields.Path ??
    fields.AbsolutePath ??
    fields.TargetFile ??
    fields.file_path ??
    fields.path;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : undefined;
}

function searchPath(toolArgs: unknown): string | undefined {
  const fields = fieldsOf(toolArgs);
  const candidate = fields.SearchPath ?? fields.SearchDirectory;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : undefined;
}

function shellCommand(toolArgs: unknown): string {
  const fields = fieldsOf(toolArgs);
  const candidate = fields.CommandLine ?? fields.command ?? "";
  return typeof candidate === "string" ? candidate : "";
}

function symbolsFor(
  workspace: Workspace,
  relativePath: string,
): readonly IndexedSymbol[] {
  return workspace.index().files[relativePath] ?? [];
}

function linkedFileCount(index: KnowledgeIndex): number {
  return Object.values(index.files).filter((symbols) =>
    symbols.some((symbol) => symbol.implements.length > 0),
  ).length;
}

/** Read window of a read_file / view_file call; undefined when whole file is read. */
export function readFocus(toolArgs: unknown): LineRange[] | undefined {
  const fields = fieldsOf(toolArgs);
  const startLine =
    typeof fields.StartLine === "number" ? fields.StartLine : undefined;
  const endLine =
    typeof fields.EndLine === "number" ? fields.EndLine : undefined;
  if (startLine === undefined && endLine === undefined) return undefined;
  const start = Math.max(1, startLine ?? 1);
  const end = Math.max(start, endLine ?? start);
  return [{ start, end }];
}

/**
 * Normalize Antigravity edit/write arguments into the shared shape expected by
 * kibi-agent-core's `editFocus` and `removesOnlyDeadImplementsComments`.
 */
export function normalizeEditArgs(
  toolName: string | undefined,
  toolArgs: unknown,
): Record<string, unknown> {
  const fields = fieldsOf(toolArgs);
  if (toolName === "edit_file") {
    return {
      old_string: fields.Target,
      new_string: fields.Replacement,
      replace_all: true,
    };
  }
  if (toolName === "replace_file_content") {
    return {
      old_string: fields.TargetContent,
      new_string: fields.ReplacementContent,
      replace_all: fields.AllowMultiple === true,
    };
  }
  if (toolName === "multi_replace_file_content") {
    const chunks = Array.isArray(fields.ReplacementChunks)
      ? fields.ReplacementChunks
      : [];
    return {
      edits: chunks.map((chunk) => {
        const record = fieldsOf(chunk);
        return {
          old_string: record.TargetContent,
          new_string: record.ReplacementContent,
          replace_all: record.AllowMultiple === true,
        };
      }),
    };
  }
  if (toolName === "write_file") {
    return { content: fields.Content };
  }
  if (toolName === "write_to_file") {
    return { content: fields.CodeContent };
  }
  return fields;
}

export function editFocus(
  absolutePath: string,
  toolName: string | undefined,
  toolArgs: unknown,
): LineRange[] | undefined {
  return sharedEditFocus(absolutePath, normalizeEditArgs(toolName, toolArgs));
}

function isWholeFileWrite(
  toolName: string | undefined,
  toolArgs: unknown,
): boolean {
  if (!wholeFileWriteTools.has(toolName)) return false;
  return fieldsOf(toolArgs).Append !== true;
}

function isExplored(state: SessionState, relativePath: string): boolean {
  return state.exploredPaths.has(relativePath);
}

function requirementIds(symbols: readonly IndexedSymbol[]): string[] {
  return implementedRequirementIds(symbols);
}

type Workspace = {
  root: string;
  stateDir: string | undefined;
  index: () => KnowledgeIndex;
  summarize: (entityId: string) => EntitySummary;
  telemetry: boolean;
  confirmFirm: boolean;
};

type FirmEdit = { path: string; where: string; ids: string[]; edit: string };

function editFingerprint(
  toolName: string | undefined,
  toolArgs: unknown,
): string {
  return createHash("sha256")
    .update(JSON.stringify([toolName ?? null, toolArgs ?? null]))
    .digest("hex");
}

function promptHash(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 24);
}

function queueContextEvent(text: string): SessionEvent {
  return { kind: "queued_context", id: randomUUID(), text };
}

function firmEdit(
  relativePath: string,
  symbols: readonly IndexedSymbol[],
  focus: LineRange[] | undefined,
  wholeFile: boolean,
  state: SessionState,
  workspace: Workspace,
  edit: string,
): FirmEdit | undefined {
  if (!workspace.confirmFirm) return undefined;
  const touched = {
    symbols,
    focus,
    wholeFile,
    absolutePath: path.join(workspace.root, relativePath),
    summarize: workspace.summarize,
    confirmed: state.firmConfirmed,
  };
  const { ids, symbol } = firmRequirementsTouched({
    ...touched,
    reviewed: firmEditReviewed(workspace.root, relativePath, (id) =>
      state.firmAskedEdit.get(id) === edit
        ? state.firmAskedAt.get(id)
        : undefined,
    ),
  });
  const reviewedIds = firmRequirementsTouched(touched).ids.filter(
    (id) => !ids.includes(id),
  );
  if (reviewedIds.length > 0) {
    appendSessionEvents(workspace.stateDir, [
      { kind: "firm_reviewed", path: relativePath, ids: reviewedIds },
    ]);
  }
  if (ids.length === 0) return undefined;
  return {
    path: relativePath,
    where: symbol ? `${symbol.title} in ${relativePath}` : relativePath,
    ids,
    edit,
  };
}

/**
 * Put an edit of firm-requirement code to the user via Antigravity's
 * `force_ask` PreToolUse decision, and queue the agent-facing context for the
 * next PreInvocation turn.
 */
function withFirmConfirmation(
  firm: FirmEdit,
  workspace: Workspace,
  trace: HookTrace,
): AntigravityHookOutput {
  appendSessionEvents(workspace.stateDir, [
    {
      kind: "firm_asked",
      path: firm.path,
      ids: firm.ids,
      at: Date.now(),
      edit: firm.edit,
    },
    queueContextEvent(firmEditContext(firm.ids)),
  ]);
  trace.action = "edit_firm_ask";
  trace.requirementIds = firm.ids;
  const describe = (id: string) => workspace.summarize(id);
  return {
    decision: "force_ask",
    reason: firmEditConfirmation(firm.where, firm.ids.map(describe)),
  };
}

/** Whether `target` resolves inside one of `roots`. */
function insideAnyRoot(
  roots: readonly string[],
  target: string,
  cwd: string | undefined,
): boolean {
  return roots.some((root) => {
    if (root.trim().length === 0) return false;
    const resolvedRoot = path.resolve(root);
    return (
      path.resolve(cwd ?? resolvedRoot, target) === resolvedRoot ||
      toWorkspacePath(root, target, cwd) !== undefined
    );
  });
}

/**
 * The permission decision Kibi returns when it has no firm requirement to
 * confirm. Kibi never grants a permission the user has not granted: every
 * edit, command and MCP call gets "ask", which applies the user's own
 * Antigravity permissions and "Always Allow" choices. Only reads and searches
 * of files inside the opened workspace (or the Kibi workspace) are allowed,
 * so the plugin does not add prompts to ordinary exploration.
 */
function passthroughPreToolDecision(
  input: AntigravityHookInput,
  workspaceRoot?: string,
): AntigravityHookOutput {
  const isRead = readTools.has(input.toolName);
  if (!isRead && !searchTools.has(input.toolName)) {
    return { decision: "ask" };
  }
  const roots = [...input.workspacePaths];
  if (workspaceRoot) roots.push(workspaceRoot);
  const rawPath = toolPath(input.toolArgs) ?? searchPath(input.toolArgs);
  if (rawPath) {
    return insideAnyRoot(roots, rawPath, input.cwd)
      ? { decision: "allow" }
      : { decision: "ask" };
  }
  // A read names its file; one without a path is not something Kibi can vouch
  // for. A search without a path runs in the current directory.
  if (!isRead && input.cwd && insideAnyRoot(roots, input.cwd, input.cwd)) {
    return { decision: "allow" };
  }
  return { decision: "ask" };
}

function preToolUse(
  input: AntigravityHookInput,
  workspace: Workspace,
  trace: HookTrace = {},
): AntigravityHookOutput {
  const passthrough = passthroughPreToolDecision(input, workspace.root);
  const toolName = input.toolName;
  const overwrite = workspaceOverwrite(
    toolName,
    input.toolArgs,
    workspace.root,
  );
  if (overwrite) {
    return {
      decision: passthrough.decision ?? "ask",
      overwrite,
    };
  }

  const state = loadSessionState(workspace.stateDir);
  trace.kbUsedBefore = state.kbUsed;
  const events: SessionEvent[] = [];
  const queueAndCommit = (text: string, action: string): void => {
    trace.action = action;
    events.push(queueContextEvent(text));
    appendSessionEvents(workspace.stateDir, events);
  };

  if (shellTools.has(toolName)) {
    return shellPreToolUse(input, workspace, state, trace, passthrough);
  }

  if (searchTools.has(toolName)) {
    trace.action = "search_silent";
    const rows =
      toolName === "grep_search"
        ? grepSearchRows(input, state, workspace, trace, events)
        : undefined;
    if (rows) {
      spendSearchTip(state, events);
      queueAndCommit(rows, "read_snippet");
      return passthrough;
    }
    if (state.kbUsed || state.notices.has("search-tip")) return passthrough;
    const linked = linkedFileCount(workspace.index());
    if (linked === 0) return passthrough;
    events.push({ kind: "notice", name: "search-tip" });
    queueAndCommit(searchTip(linked), "search_tip");
    return passthrough;
  }

  const isRead = readTools.has(toolName);
  const isEdit = editTools.has(toolName);
  if (!isRead && !isEdit) return passthrough;

  const rawPath = toolPath(input.toolArgs);
  const target = rawPath
    ? toWorkspacePath(workspace.root, rawPath, input.cwd)
    : undefined;
  if (!target) return passthrough;
  const kind = classifyPath(target.relative);
  trace.path = target.relative;
  trace.pathKind = kind;

  if (kind === "kb") {
    trace.action = "kb_direct_silent";
    if (state.notices.has("kb-direct")) return passthrough;
    events.push({ kind: "notice", name: "kb-direct" });
    queueAndCommit(DIRECT_KB_ACCESS_NOTE, "kb_direct_note");
    return passthrough;
  }
  if (kind === "other") return passthrough;

  const relativePath = target.relative;
  const symbols = symbolsFor(workspace, relativePath);
  trace.requirementIds = requirementIds(symbols);

  if (isRead) {
    trace.action = "read_silent";
    const focus = readFocus(input.toolArgs);
    const rows = requirementRows(
      [
        {
          absolute: target.absolute,
          directory: false,
          ...(focus ? { focus } : {}),
        },
      ],
      state,
      workspace,
      trace,
      events,
    );
    if (!rows) return passthrough;
    queueAndCommit(rows, "read_snippet");
    return passthrough;
  }

  trace.action = "edit_silent";
  const wholeFile = isWholeFileWrite(toolName, input.toolArgs);
  const focus = wholeFile
    ? undefined
    : editFocus(target.absolute, toolName, input.toolArgs);
  const normalizedEdit = normalizeEditArgs(toolName, input.toolArgs);
  const firm = removesOnlyDeadImplementsComments(
    target.absolute,
    normalizedEdit,
    input.cwd ?? workspace.root,
  )
    ? undefined
    : firmEdit(
        relativePath,
        symbols,
        focus,
        wholeFile,
        state,
        workspace,
        editFingerprint(toolName, input.toolArgs),
      );
  queueEditPreToolUse(
    relativePath,
    kind,
    symbols,
    focus,
    state,
    workspace,
    events,
    queueAndCommit,
  );
  return firm ? withFirmConfirmation(firm, workspace, trace) : passthrough;
}

function queueEditPreToolUse(
  relativePath: string,
  kind: string,
  symbols: readonly IndexedSymbol[],
  focus: LineRange[] | undefined,
  state: SessionState,
  workspace: Workspace,
  events: SessionEvent[],
  queueAndCommit: (text: string, action: string) => void,
): void {
  if (state.shownEdit.has(relativePath)) {
    const symbol = focusedSymbols(symbols, focus)[0];
    if (!symbol || symbol.implements.length === 0) return;
    const key = `${relativePath}#${symbol.id}`;
    if (state.shownEdit.has(key)) return;
    const update = focusUpdate(relativePath, symbols, focus);
    if (!update) return;
    events.push({ kind: "shown", surface: "edit", path: key });
    queueAndCommit(update, "edit_focus_update");
    return;
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

  const snippetInput = {
    relativePath,
    symbols,
    surface: "edit",
    focus,
    summarize: workspace.summarize,
  } as const;
  if (alreadyKnown) {
    const update = editKnowledgeUpdate(snippetInput);
    if (update) {
      queueAndCommit(update, "edit_update_snippet");
      return;
    }
    appendSessionEvents(workspace.stateDir, events);
    return;
  }

  const snippet = fileKnowledgeSnippet(snippetInput);
  if (snippet) {
    queueAndCommit(snippet, "edit_snippet");
    return;
  }

  if (kind === "source") {
    const index = workspace.index();
    const unread =
      index.manifest === "unreadable" ||
      (index.coordinateFiles.includes(relativePath) &&
        !index.unlinkedFiles.includes(relativePath));
    if (!unread) {
      queueAndCommit(
        unownedSourceNote(
          relativePath,
          requirementCandidatesForPath(
            workspace.root,
            relativePath,
            undefined,
            state.requestWords,
          ),
        ),
        "edit_unowned_note",
      );
      return;
    }
    if (!state.notices.has("manifest-unreadable")) {
      events.push({ kind: "notice", name: "manifest-unreadable" });
      queueAndCommit(
        unreadableManifestNote(relativePath),
        "edit_manifest_note",
      );
      return;
    }
  }
  appendSessionEvents(workspace.stateDir, events);
}

/**
 * Marks the one-time search tip as spent once a search has shown rows,
 * since the rows already say the code is governed.
 */
export function spendSearchTip(
  state: SessionState,
  events: SessionEvent[],
): void {
  if (!state.notices.has("search-tip"))
    events.push({ kind: "notice", name: "search-tip" });
}

/**
 * Requirement rows for the code a read or search puts in view (see
 * kibi-agent-core/read-context), each requirement once per session, counting
 * those a Kibi tool result already showed; the files they describe are
 * marked as read.
 */
export function requirementRows(
  reads: readonly ShellRead[],
  state: SessionState,
  workspace: Workspace,
  trace: HookTrace,
  events: SessionEvent[],
  admits?: (relativePath: string) => boolean,
): string | undefined {
  const rows = hookReadRows(reads, {
    workspaceRoot: workspace.root,
    files: workspace.index().files,
    isSource: (relativePath) => classifyPath(relativePath) === "source",
    admits,
    summarize: workspace.summarize,
    stateDir: workspace.stateDir,
    sessionKey: "session",
    shownIds: state.exploredIds,
    // An edit snippet already named the requirements of its file.
    shownPaths: new Set([...state.exploredPaths, ...state.shownEdit]),
  });
  if (!rows) return undefined;
  for (const shown of rows.paths)
    events.push({ kind: "shown", surface: "read", path: shown });
  trace.path = rows.paths[0] as string;
  trace.pathKind = "source";
  trace.requirementIds = rows.ids;
  return rows.text;
}

/**
 * A grep_search call as a search: its Query over its SearchPath, regular
 * expression only with IsRegex, limited by its Includes globs.
 */
function grepSearchRows(
  input: AntigravityHookInput,
  state: SessionState,
  workspace: Workspace,
  trace: HookTrace,
  events: SessionEvent[],
): string | undefined {
  const fields = fieldsOf(input.toolArgs);
  const read = searchToolRead({
    pattern: fields.Query,
    path: searchPath(input.toolArgs),
    cwd: input.cwd ?? workspace.root,
    ignoreCase: fields.CaseInsensitive === true,
    fixed: fields.IsRegex !== true,
  });
  if (!read) return undefined;
  const includes = (Array.isArray(fields.Includes) ? fields.Includes : [])
    .filter((glob): glob is string => typeof glob === "string")
    .map(globFilter);
  return requirementRows(
    [read],
    state,
    workspace,
    trace,
    events,
    includes.length > 0
      ? (relativePath) => includes.some((admits) => admits(relativePath))
      : undefined,
  );
}

function shellPreToolUse(
  input: AntigravityHookInput,
  workspace: Workspace,
  state: SessionState,
  trace: HookTrace,
  passthrough: AntigravityHookOutput,
): AntigravityHookOutput {
  const events: SessionEvent[] = [{ kind: "command_started", at: Date.now() }];
  const command = shellCommand(input.toolArgs);
  const queueAndCommit = (text: string, action: string): void => {
    trace.action = action;
    events.push(queueContextEvent(text));
    appendSessionEvents(workspace.stateDir, events);
  };
  const cwd = input.cwd ?? workspace.root;
  const edited = new Set(commandEditPaths(command, cwd));
  const firm = [...edited]
    .map((absolute) => {
      const target = toWorkspacePath(workspace.root, absolute, input.cwd);
      if (!target || classifyPath(target.relative) !== "source")
        return undefined;
      const symbols = symbolsFor(workspace, target.relative);
      return firmEdit(
        target.relative,
        symbols,
        undefined,
        true,
        state,
        workspace,
        editFingerprint("run_command", command),
      );
    })
    .find((candidate) => candidate !== undefined);

  queueShellContext(
    input,
    workspace,
    state,
    trace,
    command,
    edited,
    events,
    queueAndCommit,
  );
  return firm ? withFirmConfirmation(firm, workspace, trace) : passthrough;
}

function queueShellContext(
  input: AntigravityHookInput,
  workspace: Workspace,
  state: SessionState,
  trace: HookTrace,
  command: string,
  edited: ReadonlySet<string>,
  events: SessionEvent[],
  queueAndCommit: (text: string, action: string) => void,
): void {
  let namesKb = false;
  const cwd = input.cwd ?? workspace.root;
  const reads = commandReadViews(command, cwd);
  for (const { absolute, directory } of reads) {
    if (directory) continue;
    const target = toWorkspacePath(workspace.root, absolute, input.cwd);
    if (!target) continue;
    const kind = classifyPath(target.relative);
    if (kind === "kb") namesKb = true;
    if (kind === "kb" || kind === "other") continue;
    const symbols = symbolsFor(workspace, target.relative);
    if (edited.has(absolute)) {
      if (state.shownEdit.has(target.relative)) continue;
      const alreadyKnown =
        state.shownRead.has(target.relative) ||
        isExplored(state, target.relative);
      const snippetInput = {
        relativePath: target.relative,
        symbols,
        surface: "edit",
        summarize: workspace.summarize,
      } as const;
      const note = alreadyKnown
        ? editKnowledgeUpdate(snippetInput)
        : fileKnowledgeSnippet(snippetInput);
      if (!note) continue;
      trace.path = target.relative;
      trace.pathKind = kind;
      trace.requirementIds = requirementIds(symbols);
      events.push({ kind: "shown", surface: "edit", path: target.relative });
      queueAndCommit(
        note,
        alreadyKnown ? "edit_update_snippet" : "edit_snippet",
      );
      return;
    }
  }
  // Every linked file the command reads or searches, in one block.
  const rows = requirementRows(
    reads.filter(({ absolute }) => !edited.has(absolute)),
    state,
    workspace,
    trace,
    events,
  );
  if (rows) {
    if (isSearchCommand(command)) spendSearchTip(state, events);
    queueAndCommit(rows, "read_snippet");
    return;
  }
  if (namesKb && !state.notices.has("kb-direct")) {
    events.push({ kind: "notice", name: "kb-direct" });
    queueAndCommit(DIRECT_KB_ACCESS_NOTE, "kb_direct_note");
    return;
  }
  if (
    isSearchCommand(command) &&
    !state.kbUsed &&
    !state.notices.has("search-tip")
  ) {
    const linked = linkedFileCount(workspace.index());
    if (linked > 0) {
      events.push({ kind: "notice", name: "search-tip" });
      queueAndCommit(searchTip(linked), "search_tip");
      return;
    }
  }
  appendSessionEvents(workspace.stateDir, events);
}

function shellChanges(
  workspace: Workspace,
  events: SessionEvent[],
  trace: HookTrace,
  edit: string,
): string | undefined {
  const state = loadSessionState(workspace.stateDir);
  if (state.commandStartedAt === undefined) return undefined;
  let note: string | undefined;
  for (const relative of filesChangedSince(
    workspace.root,
    state.commandStartedAt,
  )) {
    const pathKind = classifyPath(relative);
    if (pathKind === "kb" || pathKind === "other") continue;
    events.push({ kind: "edited", path: relative, pathKind, edit });
    const symbols = symbolsFor(workspace, relative);
    const owners = requirementIds(symbols);
    if (trace.action === undefined && owners.length > 0) {
      trace.action = "edited";
      trace.kbUsedBefore = state.kbUsed;
      trace.path = relative;
      trace.pathKind = pathKind;
      trace.requirementIds = owners;
    }
    if (note !== undefined || state.shownEdit.has(relative)) continue;
    const alreadyKnown =
      state.shownRead.has(relative) || isExplored(state, relative);
    const snippetInput = {
      relativePath: relative,
      symbols,
      surface: "edit",
      summarize: workspace.summarize,
    } as const;
    const snippet = alreadyKnown
      ? editKnowledgeUpdate(snippetInput)
      : fileKnowledgeSnippet(snippetInput);
    if (snippet) {
      note = snippet;
    } else if (
      pathKind === "source" &&
      workspace.index().manifest !== "unreadable"
    ) {
      note = unownedSourceNote(
        relative,
        requirementCandidatesForPath(
          workspace.root,
          relative,
          undefined,
          state.requestWords,
        ),
      );
    }
    if (note !== undefined) {
      events.push({ kind: "shown", surface: "edit", path: relative });
    }
  }
  return note;
}

function captureTemplateNote(
  workspace: Workspace,
  events: SessionEvent[],
): string | undefined {
  const field = (event: SessionEvent, name: "pathKind" | "operation") =>
    (event as Partial<Record<typeof name, string>>)[name];
  if (
    !events.some((event) => field(event, "pathKind") === "source") ||
    events.some((event) => field(event, "operation") === "kb_upsert")
  ) {
    return undefined;
  }
  const state = loadSessionState(workspace.stateDir);
  if (
    state.rulePhrase === undefined ||
    state.kbRecorded ||
    state.notices.has("capture-template")
  ) {
    return undefined;
  }
  events.push({ kind: "notice", name: "capture-template" });
  return ruleCaptureTemplate(state.rulePhrase, state.ruleReason);
}

function recordKbUsage(
  usage: KbUsage,
  workspace: Workspace,
  events: SessionEvent[],
): void {
  const paths = usage.paths
    .map(
      (candidate) =>
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

function postToolUse(
  input: AntigravityHookInput,
  workspace: Workspace,
  trace: HookTrace = {},
): AntigravityHookOutput {
  // Failed or declined tool calls never confirm firm edits or land changes.
  if (input.error && input.error.trim().length > 0) return {};

  const toolName = input.toolName;
  const events: SessionEvent[] = [];
  const kbUsedBefore = (): boolean | undefined =>
    workspace.telemetry
      ? loadSessionState(workspace.stateDir).kbUsed
      : undefined;
  const recordUsage = (usage: KbUsage): void => {
    trace.kbUsedBefore = kbUsedBefore();
    trace.action = "kb_usage";
    trace.kbOperation = usage.operation;
    recordKbUsage(usage, workspace, events);
  };

  if (editTools.has(toolName)) {
    const rawPath = toolPath(input.toolArgs);
    const target = rawPath
      ? toWorkspacePath(workspace.root, rawPath, input.cwd)
      : undefined;
    if (target) {
      const pathKind = classifyPath(target.relative);
      events.push({
        kind: "edited",
        path: target.relative,
        pathKind,
        edit: editFingerprint(toolName, input.toolArgs),
      });
      if (pathKind !== "other") {
        trace.kbUsedBefore = kbUsedBefore();
        trace.action = "edited";
        trace.path = target.relative;
        trace.pathKind = pathKind;
        if (workspace.telemetry && pathKind !== "kb") {
          trace.requirementIds = requirementIds(
            symbolsFor(workspace, target.relative),
          );
        }
      }
    }
  } else if (shellTools.has(toolName)) {
    const command = shellCommand(input.toolArgs);
    const usage = extractCliKbUsage(command);
    if (usage) recordUsage(usage);
    if (isRequirementUpsert({ command })) {
      markDecisionFlag(
        { stateDir: workspace.stateDir, sessionId: input.conversationId },
        "requirement-recorded",
      );
    }
    const changed = shellChanges(
      workspace,
      events,
      trace,
      editFingerprint("run_command", command),
    );
    const note = changed ?? captureTemplateNote(workspace, events);
    if (note) events.push(queueContextEvent(note));
    if (isVerifiedGitCommit(command) && hasKibiPreCommitGate(workspace.root)) {
      events.push({ kind: "checked", paths: [], all: true });
    }
    appendSessionEvents(workspace.stateDir, events);
    return {};
  } else {
    const unwrapped = unwrapKibiMcpCall(toolName, input.toolArgs);
    const usage = extractMcpKbUsage(toolName, input.toolArgs);
    if (usage) recordUsage(usage);
    if (
      usage?.operation === "kb_upsert" &&
      isRequirementUpsert(unwrapped?.payload ?? input.toolArgs)
    ) {
      markDecisionFlag(
        { stateDir: workspace.stateDir, sessionId: input.conversationId },
        "requirement-recorded",
      );
    }
  }

  const template = captureTemplateNote(workspace, events);
  if (template) events.push(queueContextEvent(template));
  appendSessionEvents(workspace.stateDir, events);
  return {};
}

/**
 * Evaluate new user prompts once per distinct prompt hash and flush any
 * Kibi snippets queued by tool hooks into `injectSteps` right before the next
 * model invocation.
 */
function preInvocation(
  input: AntigravityHookInput,
  workspace: Workspace,
  trace: HookTrace = {},
): AntigravityHookOutput {
  const state = loadSessionState(workspace.stateDir);
  const events: SessionEvent[] = [];
  const messages: string[] = [];

  const prompt = input.lastUserInput?.trim() ?? "";
  if (prompt.length > 0) {
    const hash = promptHash(prompt);
    if (hash !== state.lastPromptHash) {
      const rule = statedRule(prompt, workspace.root);
      const reason = statedReason(prompt, workspace.root);
      startDecisionSession(
        { stateDir: workspace.stateDir, sessionId: input.conversationId },
        "prompt",
        { hostFiles: sessionJournal(workspace.stateDir) },
      );
      events.push({
        kind: "prompt",
        hash,
        words: requestTopicWords(prompt),
        rule: rule !== undefined,
        phrase: rule ?? "",
        reason,
      });
      if (rule !== undefined) {
        trace.action = "prompt_rule_note";
        messages.push(rulePromptNote(rule, reason));
      } else {
        trace.action = "prompt_silent";
      }
    }
  }

  if (state.queuedContext.length > 0) {
    const flushedIds = state.queuedContext.map((item) => item.id);
    events.push({ kind: "context_flushed", ids: flushedIds });
    for (const item of state.queuedContext) {
      if (!messages.includes(item.text)) {
        messages.push(item.text);
      }
    }
    trace.action ??= "context_injected";
  }

  appendSessionEvents(workspace.stateDir, events);
  if (messages.length === 0) return {};

  let combined = messages.join("\n\n");
  if (combined.length > MAX_INJECTED_CONTEXT_CHARS) {
    combined = `${combined.slice(0, MAX_INJECTED_CONTEXT_CHARS - 1)}…`;
  }
  return injectSystem(combined);
}

function stop(
  input: AntigravityHookInput,
  workspace: Workspace,
  trace: HookTrace = {},
): AntigravityHookOutput {
  if (input.continuationActive) return {};
  if (input.terminationReason && input.terminationReason !== "NO_TOOL_CALL") {
    return {};
  }

  const state = loadSessionState(workspace.stateDir);
  const unreminded = state.pendingSource.filter(
    (pending) => !state.reminded.has(pending),
  );
  const capture =
    state.sourceEdited &&
    !state.kbRecorded &&
    !state.notices.has("capture-stop");
  const signoff =
    !capture &&
    claimSignoffReminder(
      { stateDir: workspace.stateDir, sessionId: input.conversationId },
      workspace.root,
    );
  if (unreminded.length === 0 && !capture && !signoff) return {};

  const events: SessionEvent[] = [];
  const parts: string[] = [];
  if (capture) {
    events.push({ kind: "notice", name: "capture-stop" });
    parts.push(captureReminder(state.rulePhrase));
  }
  if (signoff) parts.push(signoffReminder());
  if (unreminded.length > 0) {
    events.push({ kind: "reminded", paths: unreminded });
    parts.push(stopReminder(unreminded));
  }
  appendSessionEvents(workspace.stateDir, events);
  trace.action = capture
    ? "stop_capture_reminder"
    : signoff
      ? "stop_signoff_reminder"
      : "stop_reminder";
  trace.kbUsedBefore = state.kbUsed;
  return {
    decision: "continue",
    reason: parts.join("\n"),
  };
}

function resolveStartDirectory(
  input: AntigravityHookInput,
  env: NodeJS.ProcessEnv,
): string {
  if (input.cwd && input.cwd.trim().length > 0) return input.cwd;
  if (input.workspacePaths.length > 0 && input.workspacePaths[0]) {
    return input.workspacePaths[0];
  }
  return env.ANTIGRAVITY_WORKSPACE?.trim() || process.cwd();
}

export async function runHook(
  rawInput: unknown,
  environment: HookEnvironment = {},
): Promise<AntigravityHookOutput> {
  const startedAt = new Date();
  const env = environment.env ?? process.env;
  const input = parseHookInput(rawInput);
  const pluginData =
    environment.pluginData ??
    env.PLUGIN_DATA ??
    path.join(os.tmpdir(), `kibi-antigravity-${process.getuid?.() ?? "user"}`);

  const startDir = resolveStartDirectory(input, env);
  let resolved = resolveKibiWorkspace(startDir, env);
  if (!resolved.optedIn && input.workspacePaths.length > 1) {
    for (const candidate of input.workspacePaths.slice(1)) {
      const check = resolveKibiWorkspace(candidate, env);
      if (check.optedIn) {
        resolved = check;
        break;
      }
    }
  }
  if (!resolved.optedIn) {
    return input.event === "PreToolUse"
      ? passthroughPreToolDecision(input)
      : {};
  }

  const dataDir = workspaceDataDir(pluginData, resolved.root);
  let index: KnowledgeIndex | undefined;
  const workspace: Workspace = {
    root: resolved.root,
    stateDir: sessionDir(dataDir, input.conversationId),
    index: () => {
      index ??= loadKnowledgeIndex(resolved.root, dataDir);
      return index;
    },
    telemetry: hookTelemetryEnabled(env),
    confirmFirm: confirmFirmEdits(env),
    summarize: createEntitySummarizer(resolved.root),
  };

  const trace: HookTrace = {};
  const output = dispatchHook(input, workspace, trace);
  appendHookUsage(
    {
      workspaceRoot: resolved.root,
      event: input.event,
      sessionId: input.conversationId,
      hostTool: input.toolName,
      trace,
      startedAt,
    },
    env,
  );
  await flushHookTelemetry(
    {
      event: input.event,
      workspaceRoot: resolved.root,
      sessionId: input.conversationId,
    },
    env,
  );
  return output;
}

function dispatchHook(
  input: AntigravityHookInput,
  workspace: Workspace,
  trace: HookTrace,
): AntigravityHookOutput {
  switch (input.event) {
    case "SessionStart": {
      trace.action = "session_start";
      startDecisionSession(
        { stateDir: workspace.stateDir, sessionId: input.conversationId },
        "startup",
        { hostFiles: sessionJournal(workspace.stateDir) },
      );
      return injectSystem(
        [
          sessionStartContext(linkedFileCount(workspace.index())),
          checkoutSessionNote(workspace.root),
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      );
    }
    case "PreInvocation":
      return preInvocation(input, workspace, trace);
    case "PreToolUse": {
      const output = preToolUse(input, workspace, trace);
      if (trace.action === undefined) {
        Object.assign(
          trace,
          skillLoadTrace(input.toolName, {
            ...(input.toolArgs ?? {}),
            file_path: toolPath(input.toolArgs),
          }),
        );
      }
      return output;
    }
    case "PostToolUse":
      return postToolUse(input, workspace, trace);
    case "Stop":
      return stop(input, workspace, trace);
    default:
      return {};
  }
}

export async function main(run: typeof runHook = runHook): Promise<void> {
  const raw = parseStdinJson(await readStdin());
  try {
    const result = await run(raw);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`kibi-antigravity hook error: ${message}\n`);
    const parsed = parseHookInput(raw);
    const fallback =
      parsed.event === "PreToolUse" ? passthroughPreToolDecision(parsed) : {};
    process.stdout.write(`${JSON.stringify(fallback)}\n`);
  }
}

export function isInvokedAsCli(
  argv1: string | undefined,
  moduleUrl: string,
): boolean {
  const invokedPath = argv1 ? pathToFileURL(path.resolve(argv1)).href : "";
  return moduleUrl === invokedPath;
}

export async function runHookCli(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`kibi-antigravity hook error: ${message}\n`);
    process.stdout.write("{}\n");
  }
}

export async function runHookCliIfMain(
  isMain = isInvokedAsCli(process.argv[1], import.meta.url),
  start: () => Promise<void> = runHookCli,
): Promise<void> {
  if (isMain) await start();
}

void runHookCliIfMain();
