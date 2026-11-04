#!/usr/bin/env node
// implements REQ-zcode-kibi-plugin-v1
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { missingHooksNote } from "kibi-agent-core/checkout-hooks";
import {
  type DecisionSession,
  captureReminder,
  claimCaptureReminder,
  claimSignoffReminder,
  confirmFirmEdits,
  firmEditNotice,
  firmRequirementsTouched,
  hasDecisionFlag,
  isRequirementUpsert,
  markDecisionFlag,
  recordRequest,
  rulePromptNote,
  settleFirmRequirements,
  settledFirmRequirements,
  signoffReminder,
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
import { stampKibiWorkspace } from "kibi-agent-core/kb-mcp-tools";
import {
  type IndexedSymbol,
  loadKnowledgeIndex,
} from "kibi-agent-core/knowledge-index";
import { classifyPath, extractEditedPaths } from "kibi-agent-core/path-policy";
import {
  claimSnippetSlot,
  createEntitySummarizer,
  editFocus,
  editKnowledgeContext,
  implementedRequirementIds,
} from "kibi-agent-core/snippets";

type Summarize = ReturnType<typeof createEntitySummarizer>;
import { parseHookInput, parseStdinJson, readStdin } from "./hook-input.js";
import {
  addDirtyPaths,
  clearDirtyPaths,
  loadHookState,
  recordKbMcpTool,
  resolvePluginDataDir,
  resolveSessionStateDir,
} from "./hook-state.js";
import { extractKbMcpToolCall } from "./kb-mcp-tools.js";
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
import { resolveKibiWorkspace } from "./workspace-optin.js";

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

type EditTarget = { relative: string; absolute: string };

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
    }));
}

/**
 * The shared kibi-agent-core edit snippet for each requirement-linked file
 * the edit targets, shown once per file per ZCode session, after the
 * firm-requirement notice when the edit touches one.
 */
// implements REQ-zcode-kibi-plugin-v1
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

// implements REQ-agent-hosts-decision-guard
/**
 * The ZCode plugin's hooks stay advisory, so an edit of code that implements
 * a firm requirement gets a notice telling the agent to ask the person
 * first, once per requirement per session. An edit whose location the hook
 * cannot resolve counts as touching the whole file.
 */
function firmNotice(
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
      summarize,
      confirmed: settled,
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

// dist/hook-runner.js sits one level below the plugin root.
const packageVersion = readPackageVersion(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
);

/**
 * Opt-in (`KIBI_DIAGNOSTIC_MODE`) hook rows for the lookup-before-first-edit
 * telemetry metric: Kibi lookups through MCP or the CLI, and edits with the
 * requirements the edited files implement.
 */
// implements REQ-zcode-kibi-plugin-v1
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
): HookResult | undefined {
  // The state directory is already per session, so the key names the file.
  const fresh = sourcePaths.filter((sourcePath) =>
    claimSnippetSlot(stateDir, `post-edit\u0000${sourcePath}`),
  );
  return fresh.length > 0
    ? contextResult("PostToolUse", postEditImpactNote(fresh))
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
        // implements REQ-kibi-fresh-clone-setup
        return contextResult(
          input.event,
          [SESSION_START_CONTEXT, missingHooksNote(workspace.root)]
            .filter((line): line is string => line !== null)
            .join("\n"),
        );

      // implements REQ-agent-hosts-decision-guard
      case "UserPromptSubmit": {
        const rule = input.prompt
          ? recordRequest(session, input.prompt)
          : undefined;
        trace.action =
          rule === undefined ? "prompt_silent" : "prompt_rule_note";
        return rule === undefined
          ? defaultResult()
          : contextResult(input.event, rulePromptNote(rule));
      }

      case "PreToolUse": {
        // Name the session's workspace on every Kibi MCP call so the launcher
        // answers from it, also after the session moves into a git worktree.
        const stamped = stampKibiWorkspace(
          input.toolName,
          input.toolInput,
          workspace.root,
        );
        if (stamped) {
          return {
            continue: true,
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              updatedInput: stamped,
            },
          };
        }
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
            : undefined;
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
        if (isMutatingTool(input.toolName)) {
          const dirtyPaths = extractMutatedWorkspacePaths(
            workspace.root,
            input.cwd,
            input.toolInput,
          );

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
          // implements REQ-kibi-signoff-views
          if (isRequirementUpsert(input.toolInput)) {
            markDecisionFlag(session, "requirement-recorded");
          }
        }

        return postEditContext(stateDir, editedSource) ?? defaultResult();
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
        // implements REQ-agent-hosts-decision-guard
        // Source changed and nothing was recorded: ask once per session for
        // the decision behind the change, with any impact-check reminder.
        const capture = claimCaptureReminder(session)
          ? captureReminder(hasDecisionFlag(session, "rule-prompt"))
          : undefined;
        // implements REQ-kibi-signoff-views
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

// implements REQ-zcode-kibi-plugin-v1
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
