#!/usr/bin/env node
// implements REQ-claude-code-kibi-plugin-v1
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { spawnSync } from "node:child_process";
import {
  commandEditPaths,
  commandFilePaths,
  filesChangedSince,
  isSearchCommand,
} from "./bash-command.js";
import { parseHookInput, parseStdinJson, readStdin } from "./hook-input.js";
import type { HookInput } from "./hook-input.js";

import {
  CONFIRM_FIRM_EDITS_ENV,
  confirmFirmEdits,
  firmRequirementsTouched,
} from "kibi-agent-core/decision-guard";
import { stampKibiWorkspace } from "kibi-agent-core/kb-mcp-tools";
import {
  requestTopicWords,
  requirementCandidatesForPath,
} from "kibi-agent-core/requirement-candidates";
import {
  createEntitySummarizer,
  implementedRequirementIds,
} from "kibi-agent-core/snippets";

export { CONFIRM_FIRM_EDITS_ENV };
import {
  type KbUsage,
  extractCliKbUsage,
  extractMcpKbUsage,
  isVerifiedGitCommit,
} from "./kb-tools.js";
import {
  type EntitySummary,
  type IndexedSymbol,
  type KnowledgeIndex,
  loadKnowledgeIndex,
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
  rulePromptNote,
  searchTip,
  sessionStartContext,
  editFocus as sharedEditFocus,
  signoffReminder,
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
import { resolveKibiWorkspace } from "./workspace-optin.js";

export type ContextEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "Stop";

/** Claude Code hook stdout. An empty object means "no opinion". */
export type HookOutput = {
  hookSpecificOutput?: {
    hookEventName: ContextEvent;
    additionalContext?: string;
    /**
     * PreToolUse only: replacement tool input. Sent without a permission
     * decision, so Claude Code's normal permission flow still applies.
     */
    updatedInput?: Record<string, unknown>;
    /**
     * PreToolUse only: `ask` puts the call to the person with
     * `permissionDecisionReason`; the hooks never deny or allow a call.
     */
    permissionDecision?: "ask";
    permissionDecisionReason?: string;
  };
};

export type HookEnvironment = {
  pluginData?: string | undefined;
  projectDir?: string | undefined;
  /**
   * Process environment for the telemetry opt-in and the firm-edit
   * confirmation opt-out; defaults to process.env.
   */
  env?: NodeJS.ProcessEnv | undefined;
};

const readTools = new Set(["Read"]);
const editTools = new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);
const searchTools = new Set(["Grep", "Glob"]);

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

function bashCommand(toolInput: unknown): string {
  if (!isRecord(toolInput)) return "";
  return typeof toolInput.command === "string" ? toolInput.command : "";
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
  return sharedEditFocus(absolutePath, toolInput);
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
  /** Usage telemetry opt-in; gates work done only to describe the call. */
  telemetry: boolean;
  /** Ask the person before an edit changes a firm requirement's code. */
  confirmFirm: boolean;
};

type FirmEdit = { path: string; where: string; ids: string[] };

// implements REQ-claude-firm-edit-confirmation
/**
 * The current firm requirements an edit changes that the person has not yet
 * let an edit change this session.
 */
function firmEdit(
  relativePath: string,
  symbols: readonly IndexedSymbol[],
  focus: LineRange[] | undefined,
  wholeFile: boolean,
  state: SessionState,
  workspace: Workspace,
): FirmEdit | undefined {
  if (!workspace.confirmFirm) return undefined;
  const { ids, symbol } = firmRequirementsTouched({
    symbols,
    focus,
    wholeFile,
    summarize: workspace.summarize,
    confirmed: state.firmConfirmed,
  });
  if (ids.length === 0) return undefined;
  return {
    path: relativePath,
    where: symbol ? `${symbol.title} in ${relativePath}` : relativePath,
    ids,
  };
}

// implements REQ-claude-firm-edit-confirmation
/**
 * Put the edit to the person: Claude Code shows the reason in its permission
 * prompt (or, in a run nobody can answer, refuses the call and gives the
 * reason to the agent), and the agent gets the context either way. The
 * PostToolUse of an allowed edit marks the requirements confirmed.
 */
function withFirmConfirmation(
  output: HookOutput,
  firm: FirmEdit,
  workspace: Workspace,
  trace: HookTrace,
): HookOutput {
  appendSessionEvents(workspace.stateDir, [
    { kind: "firm_asked", path: firm.path, ids: firm.ids },
  ]);
  trace.action = "edit_firm_ask";
  trace.requirementIds = firm.ids;
  const describe = (id: string) => workspace.summarize(id);
  const agentContext = [
    output.hookSpecificOutput?.additionalContext,
    firmEditContext(firm.ids),
  ]
    .filter((part): part is string => part !== undefined)
    .join("\n\n");
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: firmEditConfirmation(
        firm.where,
        firm.ids.map(describe),
      ),
      additionalContext: agentContext,
    },
  };
}

function preToolUse(
  input: HookInput,
  workspace: Workspace,
  trace: HookTrace = {},
): HookOutput {
  const toolName = input.toolName ?? "";
  // Name the session's workspace on every Kibi MCP call so the MCP launcher
  // answers from it, even after the session moves into a git worktree.
  const stamped = stampKibiWorkspace(toolName, input.toolInput, workspace.root);
  if (stamped) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        updatedInput: stamped,
      },
    };
  }
  const state = loadSessionState(workspace.stateDir);
  trace.kbUsedBefore = state.kbUsed;
  const events: SessionEvent[] = [];
  const emit = (text: string, action: string): HookOutput => {
    trace.action = action;
    appendSessionEvents(workspace.stateDir, events);
    return context("PreToolUse", text);
  };

  if (toolName === "Bash") {
    return bashPreToolUse(input, workspace, state, trace);
  }

  if (searchTools.has(toolName)) {
    trace.action = "search_silent";
    if (state.kbUsed || state.notices.has("search-tip")) return {};
    const linked = linkedFileCount(workspace.index());
    if (linked === 0) return {};
    events.push({ kind: "notice", name: "search-tip" });
    return emit(searchTip(linked), "search_tip");
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
  trace.path = target.relative;
  trace.pathKind = kind;

  if (kind === "kb") {
    trace.action = "kb_direct_silent";
    if (state.notices.has("kb-direct")) return {};
    events.push({ kind: "notice", name: "kb-direct" });
    return emit(DIRECT_KB_ACCESS_NOTE, "kb_direct_note");
  }
  if (kind === "other") return {};

  const relativePath = target.relative;
  const symbols = workspace.index().files[relativePath] ?? [];
  trace.requirementIds = requirementIds(symbols);

  if (isRead) {
    trace.action = "read_silent";
    const snippet = readSnippet(
      relativePath,
      symbols,
      state,
      workspace,
      readFocus(input.toolInput),
    );
    if (!snippet) return {};
    events.push({ kind: "shown", surface: "read", path: relativePath });
    return emit(snippet, "read_snippet");
  }

  trace.action = "edit_silent";

  // Edit-like tools.
  const focus =
    toolName === "Edit" || toolName === "MultiEdit"
      ? editFocus(target.absolute, input.toolInput)
      : undefined;
  const firm = firmEdit(
    relativePath,
    symbols,
    focus,
    toolName === "Write",
    state,
    workspace,
  );
  const output = editPreToolUse(
    relativePath,
    kind,
    symbols,
    focus,
    state,
    workspace,
    events,
    emit,
  );
  return firm ? withFirmConfirmation(output, firm, workspace, trace) : output;
}

/** Context before an Edit, MultiEdit, Write or NotebookEdit of a source or test file. */
function editPreToolUse(
  relativePath: string,
  kind: string,
  symbols: readonly IndexedSymbol[],
  focus: LineRange[] | undefined,
  state: SessionState,
  workspace: Workspace,
  events: SessionEvent[],
  emit: (text: string, action: string) => HookOutput,
): HookOutput {
  if (state.shownEdit.has(relativePath)) {
    // Only a symbol not yet announced for this file is new information.
    const symbol = focusedSymbols(symbols, focus)[0];
    if (!symbol || symbol.implements.length === 0) return {};
    const key = `${relativePath}#${symbol.id}`;
    if (state.shownEdit.has(key)) return {};
    const update = focusUpdate(relativePath, symbols, focus);
    if (!update) return {};
    events.push({ kind: "shown", surface: "edit", path: key });
    return emit(update, "edit_focus_update");
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
    // The read snippet already described the file (requirements, symbols,
    // tests, next layer); the first edit still has to say what must stay
    // true and name the impact check, which the read never showed.
    const update = editKnowledgeUpdate({
      relativePath,
      symbols,
      surface: "edit",
      focus,
      summarize: workspace.summarize,
    });
    if (update) return emit(update, "edit_update_snippet");
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
  if (snippet) return emit(snippet, "edit_snippet");

  if (kind === "source") {
    const index = workspace.index();
    // A manifest the scanner could not read, in whole or for this file (the
    // coordinate artifact binds a symbol here but no record was indexed), is
    // not evidence that nothing is linked; say so once per session instead.
    const unread =
      index.manifest === "unreadable" ||
      (index.coordinateFiles.includes(relativePath) &&
        !index.unlinkedFiles.includes(relativePath));
    if (!unread) {
      return emit(
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
    }
    if (!state.notices.has("manifest-unreadable")) {
      events.push({ kind: "notice", name: "manifest-unreadable" });
      return emit(unreadableManifestNote(relativePath), "edit_manifest_note");
    }
  }
  appendSessionEvents(workspace.stateDir, events);
  return {};
}

/** The read snippet for a file, unless this session already has it. */
function readSnippet(
  relativePath: string,
  symbols: readonly IndexedSymbol[],
  state: SessionState,
  workspace: Workspace,
  focus?: LineRange[],
): string | undefined {
  if (
    state.shownRead.has(relativePath) ||
    state.shownEdit.has(relativePath) ||
    isExplored(state, relativePath)
  ) {
    return undefined;
  }
  const owners = requirementIds(symbols);
  if (owners.length > 0 && owners.every((id) => state.exploredIds.has(id))) {
    return undefined;
  }
  return (
    fileKnowledgeSnippet({
      relativePath,
      symbols,
      surface: "read",
      focus,
      summarize: workspace.summarize,
    }) ?? undefined
  );
}

/**
 * A shell command reads and writes files without the Read and Edit tools.
 * Before it runs, the first linked file it names gets the read snippet, or,
 * when the command writes that file in place (`sed -i`, `perl -i`, `>`,
 * `>>`, `tee`), the edit snippet with what must stay true, as an Edit call
 * would; a command that reads `.kb/` directly or searches the tree gets the
 * notes the Read, Grep and Glob tools would. The start time is recorded so
 * the PostToolUse hook can attribute the files the command changed.
 */
function bashPreToolUse(
  input: HookInput,
  workspace: Workspace,
  state: SessionState,
  trace: HookTrace,
): HookOutput {
  const events: SessionEvent[] = [{ kind: "command_started", at: Date.now() }];
  const command = bashCommand(input.toolInput);
  const emit = (text: string, action: string): HookOutput => {
    trace.action = action;
    appendSessionEvents(workspace.stateDir, events);
    return context("PreToolUse", text);
  };
  const cwd = input.cwd ?? workspace.root;
  const edited = new Set(commandEditPaths(command, cwd));
  const firm = [...edited]
    .map((absolute) => {
      const target = toWorkspacePath(workspace.root, absolute, input.cwd);
      if (!target || classifyPath(target.relative) !== "source") return;
      const symbols = workspace.index().files[target.relative] ?? [];
      return firmEdit(
        target.relative,
        symbols,
        undefined,
        true,
        state,
        workspace,
      );
    })
    .find((candidate) => candidate !== undefined);
  const output = bashContext(
    input,
    workspace,
    state,
    trace,
    command,
    edited,
    events,
    emit,
  );
  return firm ? withFirmConfirmation(output, firm, workspace, trace) : output;
}

function bashContext(
  input: HookInput,
  workspace: Workspace,
  state: SessionState,
  trace: HookTrace,
  command: string,
  edited: ReadonlySet<string>,
  events: SessionEvent[],
  emit: (text: string, action: string) => HookOutput,
): HookOutput {
  let namesKb = false;
  const cwd = input.cwd ?? workspace.root;
  for (const absolute of commandFilePaths(command, cwd)) {
    const target = toWorkspacePath(workspace.root, absolute, input.cwd);
    if (!target) continue;
    const kind = classifyPath(target.relative);
    if (kind === "kb") namesKb = true;
    if (kind === "kb" || kind === "other") continue;
    const symbols = workspace.index().files[target.relative] ?? [];
    if (edited.has(absolute)) {
      // An in-place write is an edit: say what must stay true before it
      // runs. A file with no linked symbol is left to PostToolUse, which
      // sees whether the command changed it.
      if (state.shownEdit.has(target.relative)) continue;
      const alreadyKnown =
        state.shownRead.has(target.relative) ||
        isExplored(state, target.relative);
      const note = alreadyKnown
        ? editKnowledgeUpdate({
            relativePath: target.relative,
            symbols,
            surface: "edit",
            summarize: workspace.summarize,
          })
        : fileKnowledgeSnippet({
            relativePath: target.relative,
            symbols,
            surface: "edit",
            summarize: workspace.summarize,
          });
      if (!note) continue;
      trace.path = target.relative;
      trace.pathKind = kind;
      trace.requirementIds = requirementIds(symbols);
      events.push({ kind: "shown", surface: "edit", path: target.relative });
      return emit(note, alreadyKnown ? "edit_update_snippet" : "edit_snippet");
    }
    const snippet = readSnippet(target.relative, symbols, state, workspace);
    if (!snippet) continue;
    trace.path = target.relative;
    trace.pathKind = kind;
    trace.requirementIds = requirementIds(symbols);
    events.push({ kind: "shown", surface: "read", path: target.relative });
    return emit(snippet, "read_snippet");
  }
  if (namesKb && !state.notices.has("kb-direct")) {
    events.push({ kind: "notice", name: "kb-direct" });
    return emit(DIRECT_KB_ACCESS_NOTE, "kb_direct_note");
  }
  if (
    isSearchCommand(command) &&
    !state.kbUsed &&
    !state.notices.has("search-tip")
  ) {
    const linked = linkedFileCount(workspace.index());
    if (linked > 0) {
      events.push({ kind: "notice", name: "search-tip" });
      return emit(searchTip(linked), "search_tip");
    }
  }
  appendSessionEvents(workspace.stateDir, events);
  return {};
}

/**
 * Files the finished shell command changed are tracked like Edit-tool edits
 * (pending impact check, telemetry), and the first one this session has not
 * yet seen an edit note for gets it: the edit snippet for a linked file, the
 * discovery note for a source file no requirement owns.
 */
function bashChanges(
  workspace: Workspace,
  events: SessionEvent[],
  trace: HookTrace,
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
    events.push({ kind: "edited", path: relative, pathKind });
    const index = workspace.index();
    const symbols = index.files[relative] ?? [];
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
    const snippet = alreadyKnown
      ? editKnowledgeUpdate({
          relativePath: relative,
          symbols,
          surface: "edit",
          summarize: workspace.summarize,
        })
      : fileKnowledgeSnippet({
          relativePath: relative,
          symbols,
          surface: "edit",
          summarize: workspace.summarize,
        });
    if (snippet) {
      note = snippet;
    } else if (
      pathKind === "source" &&
      owners.length === 0 &&
      index.manifest !== "unreadable"
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

/** True when the repository's pre-commit hook runs Kibi's staged check. */
function hasKibiPreCommitGate(workspaceRoot: string): boolean {
  const resolved = spawnSync(
    "git",
    ["rev-parse", "--git-path", "hooks/pre-commit"],
    { cwd: workspaceRoot, encoding: "utf8", timeout: 2000 },
  );
  const hookPath =
    resolved.status === 0 && resolved.stdout.trim().length > 0
      ? path.resolve(workspaceRoot, resolved.stdout.trim())
      : path.join(workspaceRoot, ".git", "hooks", "pre-commit");
  try {
    return /kibi[^\n]*\bcheck\b/.test(fs.readFileSync(hookPath, "utf8"));
  } catch {
    return false;
  }
}

function postToolUse(
  input: HookInput,
  workspace: Workspace,
  trace: HookTrace = {},
): HookOutput {
  const toolName = input.toolName ?? "";
  const events: SessionEvent[] = [];
  // Replaying the journal is only needed to describe the call for telemetry.
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
    const rawPath = toolPath(input.toolInput);
    const target = rawPath
      ? toWorkspacePath(workspace.root, rawPath, input.cwd)
      : undefined;
    if (target) {
      const pathKind = classifyPath(target.relative);
      events.push({ kind: "edited", path: target.relative, pathKind });
      if (pathKind !== "other") {
        trace.kbUsedBefore = kbUsedBefore();
        trace.action = "edited";
        trace.path = target.relative;
        trace.pathKind = pathKind;
        // Which requirements the edited file implements is what tells the
        // acceptance report whether this edit needed a lookup first.
        if (workspace.telemetry && pathKind !== "kb") {
          trace.requirementIds = requirementIds(
            workspace.index().files[target.relative] ?? [],
          );
        }
      }
    }
  } else if (toolName === "Bash") {
    const command = bashCommand(input.toolInput);
    const usage = extractCliKbUsage(command);
    if (usage) recordUsage(usage);
    const note = bashChanges(workspace, events, trace);
    if (isVerifiedGitCommit(command) && hasKibiPreCommitGate(workspace.root)) {
      events.push({ kind: "checked", paths: [], all: true });
    }
    appendSessionEvents(workspace.stateDir, events);
    return note ? context("PostToolUse", note) : {};
  } else {
    const usage = extractMcpKbUsage(toolName, input.toolInput);
    if (usage) recordUsage(usage);
    // implements REQ-kibi-signoff-views
    if (
      usage?.operation === "kb_upsert" &&
      isRequirementUpsert(input.toolInput)
    ) {
      markDecisionFlag(
        { stateDir: workspace.stateDir, sessionId: input.sessionId },
        "requirement-recorded",
      );
    }
  }

  appendSessionEvents(workspace.stateDir, events);
  return {};
}

function stop(
  input: HookInput,
  workspace: Workspace,
  trace: HookTrace = {},
): HookOutput {
  // One continuation per stop: never re-prompt while a Stop hook already did.
  if (input.stopHookActive) return {};
  const state = loadSessionState(workspace.stateDir);
  const unreminded = state.pendingSource.filter(
    (pending) => !state.reminded.has(pending),
  );
  // implements REQ-claude-decision-capture-nudges
  // Source changed and nothing was recorded: ask once whether the session
  // held a decision worth keeping, before the context that holds it is gone.
  const capture =
    state.sourceEdited &&
    !state.kbRecorded &&
    !state.notices.has("capture-stop");
  // implements REQ-kibi-signoff-views
  // Requirements were written and the person has not seen a signoff view:
  // ask once for `kibi signoff` before the work is reported done.
  const signoff =
    !capture &&
    claimSignoffReminder(
      { stateDir: workspace.stateDir, sessionId: input.sessionId },
      workspace.root,
    );
  if (unreminded.length === 0 && !capture && !signoff) return {};
  const events: SessionEvent[] = [];
  const parts: string[] = [];
  if (capture) {
    events.push({ kind: "notice", name: "capture-stop" });
    parts.push(captureReminder(state.rulePrompt));
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
  return context("Stop", parts.join("\n"));
}

// implements REQ-claude-decision-capture-nudges, REQ-claude-request-topic-candidates
/**
 * Remember the request's topic words (for unlinked-file candidates) and,
 * when it reads as a rule or decision, say while the work is still ahead that
 * recording it is part of the change.
 */
function userPromptSubmit(
  input: HookInput,
  workspace: Workspace,
  trace: HookTrace,
): HookOutput {
  const prompt = input.prompt ?? "";
  const rule = statedRule(prompt);
  appendSessionEvents(workspace.stateDir, [
    {
      kind: "prompt",
      words: requestTopicWords(prompt),
      rule: rule !== undefined,
    },
  ]);
  if (rule === undefined) {
    trace.action = "prompt_silent";
    return {};
  }
  trace.action = "prompt_rule_note";
  return context("UserPromptSubmit", rulePromptNote(rule));
}

export async function runHook(
  rawInput: unknown,
  environment: HookEnvironment = {},
): Promise<HookOutput> {
  const startedAt = new Date();
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
  const workspace: Workspace = {
    root: resolved.root,
    stateDir: sessionDir(dataDir, input.sessionId),
    index: () => {
      index ??= loadKnowledgeIndex(resolved.root, dataDir);
      return index;
    },
    telemetry: hookTelemetryEnabled(environment.env),
    confirmFirm: confirmFirmEdits(environment.env ?? process.env),
    summarize: createEntitySummarizer(resolved.root),
  };

  const trace: HookTrace = {};
  const output = dispatchHook(input, workspace, trace);
  appendHookUsage(
    {
      workspaceRoot: resolved.root,
      event: input.event,
      sessionId: input.sessionId,
      hostTool: input.toolName,
      trace,
      startedAt,
    },
    environment.env,
  );
  await flushHookTelemetry(
    {
      event: input.event,
      workspaceRoot: resolved.root,
      sessionId: input.sessionId,
    },
    environment.env,
  );
  return output;
}

function dispatchHook(
  input: HookInput,
  workspace: Workspace,
  trace: HookTrace,
): HookOutput {
  switch (input.event) {
    case "SessionStart":
      trace.action = "session_start";
      // A compact or clear drops the conversation context, so the snippets
      // this session already showed are gone from the model's view and may be
      // shown again; a resume restores the transcript and keeps them.
      if (input.source === "compact" || input.source === "clear") {
        appendSessionEvents(workspace.stateDir, [{ kind: "context_reset" }]);
      }
      return context(
        "SessionStart",
        sessionStartContext(linkedFileCount(workspace.index())),
      );
    case "UserPromptSubmit":
      return userPromptSubmit(input, workspace, trace);
    case "PreToolUse":
      return preToolUse(input, workspace, trace);
    case "PostToolUse":
      return postToolUse(input, workspace, trace);
    case "Stop":
      return stop(input, workspace, trace);
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
