#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  type ShellRead,
  shellToolCommand,
  shellToolEditPaths,
  shellToolReadViews,
} from "kibi-agent-core/bash-command";
import { checkoutSessionNote } from "kibi-agent-core/checkout-hooks";
import {
  type DecisionSession,
  captureReminder,
  claimCaptureReminder,
  claimRuleCaptureTemplate,
  claimSignoffReminder,
  confirmFirmEdits,
  firmEditNotice,
  firmRequirementsTouched,
  hasDecisionFlag,
  isRequirementUpsert,
  markDecisionFlag,
  recordRequest,
  removesOnlyDeadImplementsComments,
  rulePromptNote,
  sessionRulePhrase,
  settleFirmRequirements,
  settledFirmRequirements,
  signoffReminder,
  startDecisionSession,
  statedReason,
} from "kibi-agent-core/decision-guard";
import {
  type HookTrace,
  appendHookUsage,
  appendHookUsageRows,
  editTraces,
  finishHookTelemetry,
  hookTracesWanted,
  kbUsageTrace,
  readPackageVersion,
} from "kibi-agent-core/hook-usage-log";
import {
  extractKbMcpToolCall,
  isKibiMcpToolName,
  stampKibiWorkspace,
} from "kibi-agent-core/kb-mcp-tools";
import {
  type IndexedSymbol,
  loadKnowledgeIndex,
} from "kibi-agent-core/knowledge-index";
import {
  guardedChangeNotice,
  guardedChangeOf,
  guardedChangeOfShellCommand,
} from "kibi-agent-core/level-guard";
import { classifyPath, extractEditedPaths } from "kibi-agent-core/path-policy";
import {
  globFilter,
  hookReadRows,
  searchToolRead,
} from "kibi-agent-core/read-context";
import {
  claimSnippetSlot,
  createEntitySummarizer,
  editFocus,
  editKnowledgeContext,
  implementedRequirementIds,
} from "kibi-agent-core/snippets";

type Summarize = ReturnType<typeof createEntitySummarizer>;
import {
  parseHookInput,
  parseStdinJson,
  readStdin,
} from "kibi-agent-core/hook-input";
import { resolveKibiWorkspace } from "kibi-agent-core/workspace-optin";
import {
  addDirtyPaths,
  clearDirtyPaths,
  loadHookState,
  recordKbMcpTool,
  resolvePluginDataDir,
  resolveSessionStateDir,
} from "./hook-state.js";
import {
  DIRECT_KB_EDIT_WARNING,
  SESSION_START_CONTEXT,
  freshnessReminder,
  impactCheckReminder,
  postEditImpactNote,
} from "./messages.js";
import {
  canonicalizeWorkspacePath,
  extractExplicitPathFields,
  isDirectKbPath,
  isMeaningfulTrackedPath,
  isSourceImpactRelevantPath,
} from "./path-policy.js";

export type ZcodeHookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "Stop";

export type HookResult = {
  continue: true;
  /**
   * ZCode validates hook stdout against a strict schema and routes
   * `hookSpecificOutput.additionalContext` into the conversation only when
   * `hookEventName` names the event that is actually running; any other key
   * fails validation and discards the whole output.
   */
  hookSpecificOutput?: {
    hookEventName: ZcodeHookEvent;
    additionalContext?: string;
    /**
     * PreToolUse only: replacement tool input. ZCode applies it before its
     * normal permission flow, so no permission decision is sent.
     */
    updatedInput?: Record<string, unknown>;
  };
  systemMessage?: string;
};

export type HookEnvironment = {
  pluginData?: string;
  /** Process environment for the telemetry opt-in; defaults to process.env. */
  env?: NodeJS.ProcessEnv;
};

const editableTools = new Set<string | undefined>([
  "Edit",
  "MultiEdit",
  "Write",
  "apply_patch",
]);

/**
 * Tools that actually mutate files. Only these create dirty paths: a path
 * argument inside a read-only tool call (Read, Grep, search tools, …) is not
 * evidence that the file changed.
 */
function isMutatingTool(toolName: string | undefined): boolean {
  return editableTools.has(toolName);
}

/** Canonical workspace-relative dirty paths for one mutation event. */
export function extractMutatedWorkspacePaths(
  workspaceRoot: string,
  eventCwd: string | undefined,
  toolInput: unknown,
): string[] {
  return extractExplicitPathFields(toolInput)
    .map(
      (rawPath) =>
        canonicalizeWorkspacePath(workspaceRoot, {
          eventCwd,
          rawPath,
        })?.workspaceRelative,
    )
    .filter((candidate): candidate is string => candidate !== undefined)
    .filter(isMeaningfulTrackedPath);
}

/** `base` is the directory the call's relative paths resolve against. */
type EditTarget = { relative: string; absolute: string; base: string };

/** Workspace files an edit call targets, including `apply_patch` headers. */
function editTargets(
  workspaceRoot: string,
  input: ReturnType<typeof parseHookInput>,
): EditTarget[] {
  return extractEditedPaths(input.toolInput)
    .map((rawPath) =>
      canonicalizeWorkspacePath(workspaceRoot, {
        eventCwd: input.cwd,
        rawPath,
      }),
    )
    .filter((target) => target !== undefined)
    .map((target) => ({
      relative: target.workspaceRelative,
      absolute: target.absolute,
      base: input.cwd ?? workspaceRoot,
    }));
}

/**
 * The shared kibi-agent-core edit snippet for each requirement-linked file
 * the edit targets, shown once per file per ZCode session, after the
 * firm-requirement notice when the edit touches one.
 */
function preEditContext(
  workspaceRoot: string,
  stateDir: string | undefined,
  input: ReturnType<typeof parseHookInput>,
  env: NodeJS.ProcessEnv,
  trace: HookTrace = {},
): string | undefined {
  const targets = editTargets(workspaceRoot, input);
  const [first] = targets;
  // rationale: without a target the next lines throw on `first`, and the
  // caller's catch turns that into the same missing context.
  // Stryker disable next-line ConditionalExpression
  if (first === undefined) return undefined;
  const files = loadKnowledgeIndex(workspaceRoot, stateDir).files;
  trace.pathKind = classifyPath(first.relative);
  trace.requirementIds = implementedRequirementIds(files[first.relative] ?? []);
  const summarize = createEntitySummarizer(workspaceRoot);
  const notice = firmNotice(
    workspaceRoot,
    targets,
    files,
    summarize,
    { stateDir, sessionId: input.sessionId },
    input,
    env,
  );
  const knowledge = editKnowledgeContext({
    relativePaths: targets.map((target) => target.relative),
    symbolsFor: (relativePath) => files[relativePath] ?? [],
    summarize,
    stateDir,
    sessionId: input.sessionId,
    focusFor: (relativePath) => {
      const target = targets.find(
        (candidate) => candidate.relative === relativePath,
      );
      return target ? editFocus(target.absolute, input.toolInput) : undefined;
    },
  });
  // Empty when there is neither, which the caller treats as no context.
  return [notice, knowledge]
    .filter((part): part is string => part !== undefined)
    .join("\n\n");
}

/**
 * The empty edit-path list for tool payloads the hook does not treat as
 * edits; named so the dirty-path assembly reads what it spreads.
 */
function noEditPaths(): string[] {
  // rationale: a bogus entry never surfaces, because the dirty-path
  // pipeline drops paths the meaningful-path policy rejects.
  // Stryker disable next-line ArrayDeclaration
  return [];
}

/** Read window of a Read call; undefined when the whole file is read. */
function readWindow(fields: Record<string, unknown>) {
  const offset = typeof fields.offset === "number" ? fields.offset : undefined;
  const limit = typeof fields.limit === "number" ? fields.limit : undefined;
  if (offset === undefined && limit === undefined) return undefined;
  const start = Math.max(1, offset ?? 1);
  return [{ start, end: limit !== undefined ? start + limit - 1 : start }];
}

/**
 * What a Read, Grep or shell call puts in view: a Read's file and window, a
 * Grep's pattern over its path (limited by its glob), a command's files and
 * searches.
 */
function toolReads(
  input: ReturnType<typeof parseHookInput>,
  cwd: string,
): { reads: ShellRead[]; admits?: (relativePath: string) => boolean } {
  const fields = (input.toolInput ?? {}) as Record<string, unknown>;
  if (input.toolName === "Read") {
    const file = fields.file_path;
    if (typeof file !== "string") return { reads: [] };
    const focus = readWindow(fields);
    return {
      reads: [
        {
          absolute: path.resolve(cwd, file),
          directory: false,
          ...(focus ? { focus } : {}),
        },
      ],
    };
  }
  if (input.toolName === "Grep") {
    const read = searchToolRead({
      pattern: fields.pattern,
      path: fields.path,
      cwd,
      ignoreCase: fields["-i"] === true,
    });
    const glob = typeof fields.glob === "string" ? fields.glob : undefined;
    return {
      reads: read ? [read] : [],
      ...(glob ? { admits: globFilter(glob) } : {}),
    };
  }
  return { reads: shellToolReadViews(input.toolName, input.toolInput, cwd) };
}

/**
 * Requirement rows for the code a read, search or shell call puts in view
 * (see kibi-agent-core/read-context), each requirement once per session.
 */
export function readRows(
  workspaceRoot: string,
  stateDir: string | undefined,
  input: ReturnType<typeof parseHookInput>,
  trace: HookTrace,
): string | undefined {
  const { reads, admits } = toolReads(input, input.cwd ?? workspaceRoot);
  if (reads.length === 0) return undefined;
  const rows = hookReadRows(reads, {
    workspaceRoot,
    files: loadKnowledgeIndex(workspaceRoot, stateDir).files,
    isSource: (relativePath) => classifyPath(relativePath) === "source",
    admits,
    summarize: createEntitySummarizer(workspaceRoot),
    stateDir,
    sessionKey: input.sessionId,
  });
  if (!rows) return undefined;
  trace.action = "read_snippet";
  trace.requirementIds = rows.ids;
  return rows.text;
}

/**
 * A shell call that writes files in place (`sed -i`, `perl -i`, `>`, `tee`)
 * gets the same firm notice as an edit of those files, read as a whole-file
 * write since the hook cannot tell which lines it changes.
 */
function shellFirmNotice(
  workspaceRoot: string,
  stateDir: string | undefined,
  input: ReturnType<typeof parseHookInput>,
  env: NodeJS.ProcessEnv,
): string | undefined {
  const base = input.cwd ?? workspaceRoot;
  const targets = shellToolEditPaths(input.toolName, input.toolInput, base)
    .map((rawPath) =>
      canonicalizeWorkspacePath(workspaceRoot, {
        eventCwd: input.cwd,
        rawPath,
      }),
    )
    .filter((target) => target !== undefined)
    .map((target) => ({
      relative: target.workspaceRelative,
      absolute: target.absolute,
      base,
    }));
  // rationale: firmNotice returns undefined for empty targets with no side effects, so
  // skipping the early return changes nothing observable.
  // Stryker disable next-line ConditionalExpression
  if (targets.length === 0) return undefined;
  return firmNotice(
    workspaceRoot,
    targets,
    loadKnowledgeIndex(workspaceRoot, stateDir).files,
    createEntitySummarizer(workspaceRoot),
    { stateDir, sessionId: input.sessionId },
    input,
    env,
  );
}

/**
 * The ZCode plugin's hooks stay advisory, so an edit of code that implements
 * a firm requirement gets a notice telling the agent to ask the person
 * first, once per requirement per session. An edit whose location the hook
 * cannot resolve counts as touching the whole file.
 */
function firmNotice(
  workspaceRoot: string,
  targets: readonly EditTarget[],
  files: Record<string, readonly IndexedSymbol[]>,
  summarize: Summarize,
  session: DecisionSession,
  input: ReturnType<typeof parseHookInput>,
  env: NodeJS.ProcessEnv,
): string | undefined {
  if (!confirmFirmEdits(env)) return undefined;
  const settled = settledFirmRequirements(session);
  for (const target of targets) {
    const focus = editFocus(target.absolute, input.toolInput);
    const { ids, symbol } = firmRequirementsTouched({
      symbols: files[target.relative] ?? [],
      focus,
      wholeFile: focus === undefined,
      absolutePath: target.absolute,
      summarize,
      confirmed: settled,
      commentOnly: removesOnlyDeadImplementsComments(
        target.absolute,
        input.toolInput,
        target.base,
      ),
    });
    if (ids.length === 0) continue;
    settleFirmRequirements(session, ids);
    return firmEditNotice(
      symbol ? `${symbol.title} in ${target.relative}` : target.relative,
      ids.map(summarize),
    );
  }
  return undefined;
}

// bin/hook-runner.mjs sits one level below the plugin root.
const packageVersion = readPackageVersion(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
);

/**
 * Opt-in (`KIBI_DIAGNOSTIC_MODE`) hook rows for the lookup-before-first-edit
 * telemetry metric: Kibi lookups through MCP or the CLI, and edits with the
 * requirements the edited files implement.
 */
function recordToolTelemetry(
  workspaceRoot: string,
  stateDir: string | undefined,
  input: ReturnType<typeof parseHookInput>,
  startedAt: Date,
  env: NodeJS.ProcessEnv | undefined,
): void {
  if (!hookTracesWanted(env)) return;
  const row = {
    host: "zcode",
    packageVersion,
    workspaceRoot,
    event: "PostToolUse",
    sessionId: input.sessionId,
    hostTool: input.toolName,
    startedAt,
  };
  const kbUsage = kbUsageTrace(input.toolName, input.toolInput);
  if (kbUsage) {
    appendHookUsageRows(row, [kbUsage], env);
    return;
  }
  if (!isMutatingTool(input.toolName)) return;
  const files = loadKnowledgeIndex(workspaceRoot, stateDir).files;
  appendHookUsageRows(
    row,
    editTraces(
      editTargets(workspaceRoot, input).map((target) => target.relative),
      (relativePath) => implementedRequirementIds(files[relativePath] ?? []),
    ),
    env,
  );
}

/** Canonical workspace-relative forms of kb_check sourceFiles (repo-relative contract). */
export function canonicalizeCheckSourceFiles(
  workspaceRoot: string,
  sourceFiles: readonly string[],
): string[] {
  return sourceFiles
    .map(
      (rawPath) =>
        canonicalizeWorkspacePath(workspaceRoot, {
          base: workspaceRoot,
          rawPath,
        })?.workspaceRelative,
    )
    .filter((candidate): candidate is string => candidate !== undefined);
}

function defaultResult(): HookResult {
  return { continue: true };
}

function contextResult(event: ZcodeHookEvent, message: string): HookResult {
  return {
    continue: true,
    hookSpecificOutput: { hookEventName: event, additionalContext: message },
  };
}

/**
 * ZCode's pre-tool hook cannot put a call to the person, so an edit that
 * changes the Kibi level or lowers a requirement's required_evidence, or a
 * Kibi call that lowers one, gets a notice telling the agent to ask first,
 * every time, since the choice is the person's.
 */
export function guardedNotice(
  workspaceRoot: string,
  input: ReturnType<typeof parseHookInput>,
  trace: HookTrace,
): string | undefined {
  const shellCommand = shellToolCommand(input.toolName, input.toolInput);
  if (shellCommand !== undefined) {
    const change = guardedChangeOfShellCommand(
      workspaceRoot,
      shellCommand,
      input.cwd ?? workspaceRoot,
    );
    if (change !== undefined) {
      trace.action =
        change.kind === "level"
          ? "level_change_notice"
          : "evidence_lowering_notice";
      return guardedChangeNotice(change);
    }
  }
  const targets: { relativePath?: string }[] = isKibiMcpToolName(input.toolName)
    ? [{}]
    : isEditLikeTool(input.toolName)
      ? extractEditedPaths(input.toolInput)
          .map((rawPath) =>
            canonicalizeWorkspacePath(workspaceRoot, {
              eventCwd: input.cwd,
              rawPath,
            }),
          )
          .filter((target) => target !== undefined)
          .map((target) => ({ relativePath: target.workspaceRelative }))
      : [];
  for (const target of targets) {
    const change = guardedChangeOf({
      workspaceRoot,
      toolName: input.toolName,
      toolInput: input.toolInput,
      ...target,
    });
    if (change === undefined) continue;
    trace.action =
      change.kind === "level"
        ? "level_change_notice"
        : "evidence_lowering_notice";
    return guardedChangeNotice(change);
  }
  return undefined;
}

function isEditLikeTool(toolName: string | undefined): boolean {
  return toolName === undefined || editableTools.has(toolName);
}

/**
 * The impact check to run after an edit of source files, once per file per
 * session, as context next to the tool result.
 */
function postEditContext(
  stateDir: string | undefined,
  sourcePaths: readonly string[],
  captureTemplate?: string,
): HookResult | undefined {
  // The state directory is already per session, so the key names the file.
  const fresh = sourcePaths.filter((sourcePath) =>
    claimSnippetSlot(stateDir, `post-edit\u0000${sourcePath}`),
  );
  const notes = [
    ...(fresh.length > 0 ? [postEditImpactNote(fresh)] : []),
    ...(captureTemplate === undefined ? [] : [captureTemplate]),
  ];
  return notes.length > 0
    ? contextResult("PostToolUse", notes.join("\n\n"))
    : undefined;
}

export async function runHook(
  rawInput: unknown,
  environment: HookEnvironment = {},
): Promise<HookResult> {
  const startedAt = new Date();
  const input = parseHookInput(rawInput);
  const env = environment.env ?? process.env;
  const pluginData = resolvePluginDataDir(environment.pluginData, env);

  // Workspaces that never adopted Kibi must stay silent: no reminders, no
  // tracking, and no state writes. The resolution is shared by every event so
  // a subdirectory session maps to the same workspace root as its repository.
  const workspace = resolveKibiWorkspace(input.cwd ?? process.cwd());
  if (!workspace.optedIn) {
    return defaultResult();
  }
  // State is namespaced per host session (ZCode `session_id`) so concurrent
  // sessions in one workspace cannot consume, clear, or acknowledge each
  // other's pending work. Events without a session id use a dedicated
  // `unattributed` bucket that never touches identified sessions.
  const stateDir = resolveSessionStateDir(
    pluginData,
    workspace.root,
    input.sessionId,
  );

  const session: DecisionSession = { stateDir, sessionId: input.sessionId };
  const trace: HookTrace = {};

  try {
    switch (input.event) {
      case "SessionStart":
        trace.action = "session_start";
        startDecisionSession(session, "startup");
        return contextResult(
          input.event,
          [SESSION_START_CONTEXT, checkoutSessionNote(workspace.root)]
            .filter((line): line is string => line !== null)
            .join("\n"),
        );

      case "UserPromptSubmit": {
        const rule = input.prompt
          ? recordRequest(session, input.prompt, {
              workspaceRoot: workspace.root,
            })
          : undefined;
        trace.action =
          rule === undefined ? "prompt_silent" : "prompt_rule_note";
        return rule === undefined
          ? defaultResult()
          : contextResult(
              input.event,
              rulePromptNote(rule, statedReason(input.prompt, workspace.root)),
            );
      }

      case "PreToolUse": {
        // Name the session's workspace on a Kibi MCP call that carries none,
        // so the launcher answers from it, also after the session moves into
        // a git worktree. A call that names its own workspace passes through.
        const guarded = guardedNotice(workspace.root, input, trace);
        if (isKibiMcpToolName(input.toolName)) {
          const stamped = stampKibiWorkspace(
            input.toolName,
            input.toolInput,
            workspace.root,
          );
          return stamped === undefined && guarded === undefined
            ? defaultResult()
            : {
                continue: true,
                hookSpecificOutput: {
                  hookEventName: "PreToolUse",
                  ...(stamped ? { updatedInput: stamped } : {}),
                  ...(guarded ? { additionalContext: guarded } : {}),
                },
              };
        }
        if (guarded) return contextResult(input.event, guarded);
        const explicitPaths = extractExplicitPathFields(input.toolInput);
        const hasDirectKbEdit =
          isEditLikeTool(input.toolName) &&
          explicitPaths.some((rawPath) => {
            const canonical = canonicalizeWorkspacePath(workspace.root, {
              eventCwd: input.cwd,
              rawPath,
            });
            return (
              canonical !== undefined &&
              isDirectKbPath(canonical.workspaceRelative)
            );
          });

        if (hasDirectKbEdit) {
          trace.action = "kb_direct_note";
          trace.pathKind = "kb";
          return contextResult(input.event, DIRECT_KB_EDIT_WARNING);
        }

        let knowledge: string | undefined;
        try {
          knowledge = isMutatingTool(input.toolName)
            ? preEditContext(workspace.root, stateDir, input, env, trace)
            : (shellFirmNotice(workspace.root, stateDir, input, env) ??
              readRows(workspace.root, stateDir, input, trace));
        } catch {
          // Requirement context is advisory; an unreadable manifest or file
          // leaves the edit without it rather than reporting a hook error.
        }
        // Only an edit's context sets the path kind.
        if (trace.pathKind !== undefined) {
          trace.action = knowledge ? "edit_snippet" : "edit_silent";
        }
        if (knowledge) {
          return contextResult(input.event, knowledge);
        }

        return defaultResult();
      }

      case "PostToolUse": {
        try {
          recordToolTelemetry(
            workspace.root,
            stateDir,
            input,
            startedAt,
            environment.env,
          );
        } catch {
          // Telemetry is best effort and must never change the hook's output.
        }
        const kbToolCall = extractKbMcpToolCall(
          input.toolName,
          input.toolInput,
        );
        if (kbToolCall) {
          recordKbMcpTool(stateDir, kbToolCall.toolName, {
            impactCheckRun: kbToolCall.impactCheckRun,
            // kb_check sourceFiles follow the repo-relative contract: normalize
            // them against the workspace root so a check acknowledges exactly
            // the canonical paths dirty tracking recorded.
            sourceFiles: canonicalizeCheckSourceFiles(
              workspace.root,
              kbToolCall.sourceFiles,
            ),
          });
        }

        // Only file-mutating tool events create dirty paths; a path argument
        // inside a read-only tool call is not evidence of a change.
        let editedSource: string[] = [];
        // A shell `sed -i` or `>` writes files too; its targets count as
        // edits just as an Edit call's paths do.
        const shellEdits = shellToolEditPaths(
          input.toolName,
          input.toolInput,
          input.cwd ?? workspace.root,
        );
        // rationale: taking the branch for a non-mutating, non-shell event recomputes
        // the same ternary below and produces no dirty paths, so neither
        // forcing the condition true nor comparing length >= 0 is observable.
        // Stryker disable next-line ConditionalExpression,EqualityOperator
        if (isMutatingTool(input.toolName) || shellEdits.length > 0) {
          const dirtyPaths = [
            ...(isMutatingTool(input.toolName)
              ? extractMutatedWorkspacePaths(
                  workspace.root,
                  input.cwd,
                  input.toolInput,
                )
              : noEditPaths()),
            // rationale: addDirtyPaths and the reminders re-apply the same undefined
            // and meaningful-path filters, so dropping the trailing filters
            // here changes nothing observable.
            // Stryker disable next-line MethodExpression
            ...shellEdits
              .map(
                (absolute) =>
                  canonicalizeWorkspacePath(workspace.root, {
                    eventCwd: input.cwd,
                    rawPath: absolute,
                  })?.workspaceRelative,
              )
              .filter((relative) => relative !== undefined)
              .filter(isMeaningfulTrackedPath),
          ];

          if (dirtyPaths.length > 0) {
            addDirtyPaths(stateDir, dirtyPaths);
          }
          editedSource = dirtyPaths.filter(isSourceImpactRelevantPath);
          if (editedSource.length > 0) {
            markDecisionFlag(session, "source-edited");
          }
        }
        // An MCP call is judged by its parsed name, under which a dry-run
        // upsert is a validation; other calls by the CLI route they ran.
        const kbOperation = kbToolCall
          ? kbToolCall.toolName
          : kbUsageTrace(input.toolName, input.toolInput)?.kbOperation;
        if (kbOperation === "kb_upsert") {
          markDecisionFlag(session, "kb-recorded");
          if (isRequirementUpsert(input.toolInput)) {
            markDecisionFlag(session, "requirement-recorded");
          }
        }

        return (
          postEditContext(
            stateDir,
            editedSource,
            editedSource.length > 0
              ? claimRuleCaptureTemplate(session)
              : undefined,
          ) ?? defaultResult()
        );
      }

      case "Stop": {
        // One continuation per stop: pending work waits for the next Stop.
        if (input.stopHookActive) return defaultResult();
        const state = loadHookState(stateDir);
        const uncheckedSourcePaths = state.dirtyPaths
          .filter(isSourceImpactRelevantPath)
          .filter(
            (sourcePath) => !state.impactCheckedPaths.includes(sourcePath),
          );
        // Source changed and nothing was recorded: ask once per session for
        // the decision behind the change, with any impact-check reminder.
        const capture = claimCaptureReminder(session)
          ? captureReminder(sessionRulePhrase(session))
          : undefined;
        // Requirements were written without a signoff view since: ask once.
        // A recorded requirement also marks the KB as recorded, so this never
        // claims the signoff reminder in a Stop that shows the capture one.
        const signoff = claimSignoffReminder(session, workspace.root)
          ? signoffReminder()
          : undefined;
        if (
          capture !== undefined ||
          signoff !== undefined ||
          uncheckedSourcePaths.length > 0
        ) {
          clearDirtyPaths(stateDir);
          trace.action =
            capture !== undefined
              ? "stop_capture_reminder"
              : signoff !== undefined
                ? "stop_signoff_reminder"
                : "stop_reminder";
          return contextResult(
            input.event,
            [
              capture,
              signoff,
              uncheckedSourcePaths.length > 0
                ? impactCheckReminder(uncheckedSourcePaths)
                : undefined,
            ]
              .filter((part): part is string => part !== undefined)
              .join("\n"),
          );
        }

        const freshnessPaths = state.dirtyPaths.filter(
          (dirtyPath) => !isSourceImpactRelevantPath(dirtyPath),
        );

        if (freshnessPaths.length > 0) {
          clearDirtyPaths(stateDir);
          trace.action = "stop_freshness_reminder";
          return contextResult(input.event, freshnessReminder(freshnessPaths));
        }

        // Every dirty path left here is an impact-checked source path, so
        // there is state to clear exactly when a kb_check ran.
        if (state.kbCheckRun) {
          clearDirtyPaths(stateDir);
        }

        return defaultResult();
      }

      default:
        return defaultResult();
    }
  } finally {
    appendHookUsage(
      {
        host: "zcode",
        packageVersion,
        workspaceRoot: workspace.root,
        event: input.event,
        sessionId: input.sessionId,
        hostTool: input.toolName,
        trace,
        startedAt,
      },
      env,
    );
    await finishHookTelemetry(
      {
        event: input.event,
        workspaceRoot: workspace.root,
        sessionId: input.sessionId,
      },
      env,
    );
  }
}

export async function main(): Promise<void> {
  const result = await runHook(parseStdinJson(await readStdin()));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

export function isInvokedAsCli(
  argv1: string | undefined,
  moduleUrl: string,
): boolean {
  return (
    argv1 !== undefined && moduleUrl === pathToFileURL(path.resolve(argv1)).href
  );
}

export async function runHookCli(run = main): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown hook error";
    process.stdout.write(
      `${JSON.stringify({ continue: true, systemMessage: `Kibi hook runner error: ${message}` })}\n`,
    );
  }
}

export async function runHookCliIfMain(
  isMain = isInvokedAsCli(process.argv[1], import.meta.url),
  start = runHookCli,
): Promise<void> {
  if (!isMain) return;
  await start();
}

void runHookCliIfMain();

export const hookRunnerPath = fileURLToPath(import.meta.url);
