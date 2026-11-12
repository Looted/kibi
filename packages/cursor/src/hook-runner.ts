#!/usr/bin/env node
import fs from "node:fs";
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
  holdRuleNote,
  isRequirementUpsert,
  markDecisionFlag,
  recordRequest,
  removesOnlyDeadImplementsComments,
  settleFirmRequirements,
  settledFirmRequirements,
  signoffReminder,
  takeRuleNote,
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
import { classifyPath } from "kibi-agent-core/path-policy";
import {
  type LineRange,
  createEntitySummarizer,
  editFocus,
  fileKnowledgeSnippet,
  implementedRequirementIds,
} from "kibi-agent-core/snippets";
import { preEditGuidance, readGuidance, writeGuidance } from "./guidance.js";
import { parseHookInput, parseStdinJson, readStdin } from "./hook-input.js";
import {
  addDirtyPaths,
  clearSessionHookState,
  hasGuidedPath,
  loadHookState,
  recordKbMcpTool,
  recordPlanDelivered,
  rememberGuidedPath,
  resolveStateDir,
} from "./hook-state.js";
import { extractKbMcpToolCall } from "./kb-mcp-tools.js";
import {
  BOOTSTRAP_REMINDER,
  DIRECT_KB_EDIT_WARNING,
  interfaceAdvisory,
  stopFollowupMessage,
} from "./messages.js";
import {
  extractExplicitPathFields,
  isDirectKbPath,
  isKbFreshnessRelevantPath,
  isMeaningfulTrackedPath,
  isSourceImpactRelevantPath,
  toRepoRelativePath,
} from "./path-policy.js";
import {
  type SourceLinkedSymbols,
  getSourceLinkedSymbols,
} from "./source-linked-requirements.js";

export type CursorHookResult = {
  /** beforeSubmitPrompt only: whether the prompt goes through. */
  continue?: boolean;
  additional_context?: string;
  permission?: "allow" | "deny";
  user_message?: string;
  agent_message?: string;
  followup_message?: string;
  /**
   * preToolUse only: replacement tool input. Used without `permission`, so
   * Cursor's own approval flow is unchanged.
   */
  updated_input?: Record<string, unknown>;
};

export type HookEnvironment = {
  pluginData?: string;
  workspaceTrusted?: boolean;
  /** Process environment for the telemetry opt-in; defaults to process.env. */
  env?: NodeJS.ProcessEnv;
};

/**
 * The shared kibi-agent-core snippet for a file that implements requirements,
 * or undefined so the generic Cursor guidance applies. Test-only links
 * (`covered_by`, `executable_for`) are not requirement ownership here.
 */
function knowledgeFor(
  workspaceRoot: string,
  linked: SourceLinkedSymbols,
  surface: "read" | "edit",
  focus?: LineRange[],
): string | undefined {
  if (implementedRequirementIds(linked.symbols).length === 0) return undefined;
  return fileKnowledgeSnippet({
    relativePath: linked.relativePath,
    symbols: linked.symbols,
    surface,
    focus,
    summarize: createEntitySummarizer(workspaceRoot),
  });
}

/**
 * Cursor does not enforce a hook's "ask", so an edit of code that implements
 * a firm requirement gets a notice telling the agent to ask the person first,
 * once per requirement per conversation.
 */
function firmNotice(
  workspaceRoot: string,
  linked: SourceLinkedSymbols,
  focus: LineRange[] | undefined,
  session: DecisionSession,
  env: NodeJS.ProcessEnv,
  commentOnly: boolean,
): string | undefined {
  if (!confirmFirmEdits(env)) return undefined;
  const summarize = createEntitySummarizer(workspaceRoot);
  const { ids, symbol } = firmRequirementsTouched({
    symbols: linked.symbols,
    focus,
    wholeFile: focus === undefined,
    summarize,
    confirmed: settledFirmRequirements(session),
    commentOnly,
  });
  if (ids.length === 0) return undefined;
  settleFirmRequirements(session, ids);
  return firmEditNotice(
    symbol ? `${symbol.title} in ${linked.relativePath}` : linked.relativePath,
    ids.map(summarize),
  );
}

function packageVersion(): string | null {
  // bin/hook-runner.mjs and dist/hook-runner.js sit one level below the
  // package root. Each hook
  // event is its own process, so the version is read at most once per event.
  return readPackageVersion(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json",
    ),
  );
}

/**
 * Opt-in (`KIBI_DIAGNOSTIC_MODE`) hook rows for the lookup-before-first-edit
 * telemetry metric: Kibi lookups through MCP or the CLI, and edits with the
 * requirements the edited files implement.
 */
function recordToolTelemetry(
  input: ReturnType<typeof parseHookInput>,
  workspaceRoot: string,
  stateDir: string | undefined,
  startedAt: Date,
  env: NodeJS.ProcessEnv | undefined,
): void {
  // rationale: appendHookUsageRows applies the same opt-in; this guard only
  // skips reading the index when telemetry is off.
  // Stryker disable next-line ConditionalExpression
  if (!hookTracesWanted(env)) return;
  const kbUsage = kbUsageTrace(input.toolName, input.toolInput);
  if (!kbUsage && !isKnownEditableTool(input.toolName)) return;
  const traces = kbUsage
    ? [kbUsage]
    : editTraces(
        extractExplicitPathFields(input.toolInput).map((candidate) =>
          toRepoRelativePath(candidate, workspaceRoot),
        ),
        (relativePath) =>
          implementedRequirementIds(
            getSourceLinkedSymbols(workspaceRoot, relativePath, stateDir)
              .symbols,
          ),
      );
  appendHookUsageRows(
    {
      host: "cursor",
      packageVersion: packageVersion(),
      workspaceRoot,
      event: "postToolUse",
      sessionId: input.conversationId,
      hostTool: input.toolName,
      startedAt,
    },
    traces,
    env,
  );
}

const editableTools = new Set([
  "Edit",
  "MultiEdit",
  "Write",
  "StrReplace",
  "apply_patch",
  "EditNotebook",
]);

const readTools = new Set(["Read", "TabRead"]);
const planDeliveryTools = new Set(["CreatePlan", "create_plan", "createPlan"]);

function emptyResult(): CursorHookResult {
  return {};
}

/** Whether the Cursor workspace root holds `.kb/manifest.json`, the initialized-project signal. */
export function hasKibiConfig(cwd: string | undefined): boolean {
  if (!cwd) {
    return false;
  }

  return fs.existsSync(path.join(cwd, ".kb", "manifest.json"));
}

/**
 * The Kibi workspace that owns `directory`: the nearest ancestor with
 * `.kb/manifest.json`, without crossing a `.git` boundary.
 */
export function kibiWorkspaceFor(
  directory: string | undefined,
): string | undefined {
  if (!directory) return undefined;
  let current = path.resolve(directory);
  for (;;) {
    if (fs.existsSync(path.join(current, ".kb", "manifest.json"))) {
      return current;
    }
    if (fs.existsSync(path.join(current, ".git"))) return undefined;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function isEditLikeTool(toolName: string | undefined): boolean {
  return toolName === undefined || editableTools.has(toolName);
}

function isKnownEditableTool(toolName: string | undefined): boolean {
  // rationale: the undefined check narrows the type for Set<string>.has;
  // at runtime Set.has(undefined) is false, so the result is the same.
  // Stryker disable next-line ConditionalExpression
  return toolName !== undefined && editableTools.has(toolName);
}

function isPlanDeliveryTool(toolName: string | undefined): boolean {
  // rationale: same type-narrowing as isKnownEditableTool above.
  // Stryker disable next-line ConditionalExpression
  return toolName !== undefined && planDeliveryTools.has(toolName);
}

function isReadLikeTool(toolName: string | undefined): boolean {
  return toolName === undefined || readTools.has(toolName);
}

function resolveWorkspaceRoot(
  input: ReturnType<typeof parseHookInput>,
): string {
  return input.workspaceRoots?.[0] ?? input.cwd ?? process.cwd();
}

function resolvePrimaryPath(
  input: ReturnType<typeof parseHookInput>,
): string | undefined {
  if (input.filePath) {
    return input.filePath;
  }

  const explicitPaths = extractExplicitPathFields(input.toolInput);
  return explicitPaths[0];
}

export async function runHook(
  rawInput: unknown,
  environment: HookEnvironment = {},
): Promise<CursorHookResult> {
  const startedAt = new Date();
  const input = parseHookInput(rawInput);
  const pluginData = environment.pluginData ?? process.env.PLUGIN_DATA;
  const stateDir = resolveStateDir(pluginData, input.conversationId);
  const cwd = resolveWorkspaceRoot(input);
  const kibiReady = hasKibiConfig(cwd);
  const workspaceTrusted = environment.workspaceTrusted === true;
  const initialState = loadHookState(stateDir);
  const session: DecisionSession = {
    stateDir,
    sessionId: input.conversationId,
  };
  const trace: HookTrace = {};

  try {
    switch (input.event) {
      case "sessionStart":
        trace.action = "session_start";
        if (!kibiReady) {
          const advisory = interfaceAdvisory(
            initialState.mcpState,
            workspaceTrusted,
          );
          return {
            additional_context: advisory
              ? `${BOOTSTRAP_REMINDER}\n${advisory}`
              : BOOTSTRAP_REMINDER,
          };
        }
        {
          const advisory = interfaceAdvisory(
            initialState.mcpState,
            workspaceTrusted,
          );
          const context = [advisory, missingHooksNote(cwd)]
            .filter((line): line is string => Boolean(line))
            .join("\n");
          return context ? { additional_context: context } : emptyResult();
        }

      case "preToolUse": {
        // Name the agent's workspace on every Kibi MCP call so the launcher
        // answers from it, also for agents working in a git worktree. The
        // per-call cwd wins over workspace_roots, which can be the window's
        // folders rather than the agent's checkout.
        const stamped = stampKibiWorkspace(
          input.toolName,
          input.toolInput,
          kibiWorkspaceFor(input.cwd ?? input.workspaceRoots?.[0]),
        );
        if (stamped) {
          return { updated_input: stamped };
        }
        const explicitPaths = extractExplicitPathFields(input.toolInput);
        const hasDirectKbEdit =
          isEditLikeTool(input.toolName) && explicitPaths.some(isDirectKbPath);

        if (hasDirectKbEdit) {
          trace.action = "kb_direct_note";
          trace.pathKind = "kb";
          return {
            permission: "allow",
            agent_message: DIRECT_KB_EDIT_WARNING,
          };
        }

        const primaryPath = resolvePrimaryPath(input);
        if (
          !primaryPath ||
          !kibiReady ||
          !isKnownEditableTool(input.toolName)
        ) {
          return emptyResult();
        }

        const relativePath = toRepoRelativePath(primaryPath, cwd);
        const state = loadHookState(stateDir);
        const linked = getSourceLinkedSymbols(cwd, primaryPath, stateDir);
        trace.pathKind = classifyPath(relativePath);
        trace.requirementIds = implementedRequirementIds(linked.symbols);
        const focus = editFocus(
          path.resolve(cwd, primaryPath),
          input.toolInput,
        );
        const ruleNote = takeRuleNote(session);
        const notice = firmNotice(
          cwd,
          linked,
          focus,
          session,
          environment.env ?? process.env,
          removesOnlyDeadImplementsComments(
            path.resolve(cwd, primaryPath),
            input.toolInput,
          ),
        );
        const guidance = hasGuidedPath(state, "pre-edit", relativePath)
          ? undefined
          : preEditGuidance(primaryPath, {
              cwd,
              hasKibi: kibiReady,
              mcpState: state.mcpState,
              workspaceTrusted,
              // A file that implements requirements always gets the shared
              // snippet, so the bare linked-requirement wording is never needed.
              knowledge: knowledgeFor(cwd, linked, "edit", focus),
            });
        if (guidance) {
          rememberGuidedPath(stateDir, "pre-edit", relativePath);
        }
        const parts = [ruleNote, notice, guidance].filter(
          (part): part is string => part !== undefined,
        );
        trace.action = parts.length > 0 ? "edit_snippet" : "edit_silent";
        return parts.length > 0
          ? { permission: "allow", agent_message: parts.join("\n\n") }
          : emptyResult();
      }

      case "beforeSubmitPrompt": {
        // Cursor's prompt hook cannot add context: the request's rule note
        // waits for the next pre-edit message.
        if (kibiReady && input.prompt) {
          const rule = recordRequest(session, input.prompt);
          if (rule !== undefined) holdRuleNote(session, rule);
          trace.action =
            rule === undefined ? "prompt_silent" : "prompt_rule_note";
        }
        return { continue: true };
      }

      case "beforeReadFile": {
        const primaryPath = resolvePrimaryPath(input);
        if (!primaryPath || !kibiReady) {
          return { permission: "allow" };
        }

        const relativePath = toRepoRelativePath(primaryPath, cwd);
        trace.pathKind = classifyPath(relativePath);
        trace.action = "read_silent";
        const state = loadHookState(stateDir);
        if (hasGuidedPath(state, "read", relativePath)) {
          return { permission: "allow" };
        }

        const guidance = readGuidance(primaryPath, {
          cwd,
          hasKibi: kibiReady,
          mcpState: state.mcpState,
          workspaceTrusted,
          knowledge: knowledgeFor(
            cwd,
            getSourceLinkedSymbols(cwd, primaryPath, stateDir),
            // rationale: the snippet only special-cases "edit", so any other
            // surface literal renders the same read snippet.
            // Stryker disable next-line StringLiteral
            "read",
          ),
        });
        if (!guidance) {
          return { permission: "allow" };
        }

        rememberGuidedPath(stateDir, "read", relativePath);
        trace.action = "read_snippet";
        return {
          permission: "allow",
          agent_message: guidance,
        };
      }

      case "postToolUse": {
        if (kibiReady) {
          try {
            recordToolTelemetry(
              input,
              cwd,
              stateDir,
              startedAt,
              environment.env,
            );
          } catch {
            // Telemetry is best effort and must never change the hook's output.
          }
        }
        const kbToolCall = extractKbMcpToolCall(
          input.toolName,
          input.toolInput,
        );
        if (kbToolCall) {
          recordKbMcpTool(stateDir, kbToolCall.toolName, {
            impactCheckRun: kbToolCall.impactCheckRun,
            sourceFiles: kbToolCall.sourceFiles,
          });
        }

        if (isPlanDeliveryTool(input.toolName)) {
          recordPlanDelivered(stateDir);
        }

        const explicitPaths = extractExplicitPathFields(input.toolInput);
        if (isKnownEditableTool(input.toolName)) {
          const dirtyPaths = explicitPaths
            .map((candidate) => toRepoRelativePath(candidate, cwd))
            .filter(
              (candidate) =>
                isMeaningfulTrackedPath(candidate) ||
                isKbFreshnessRelevantPath(candidate),
            );

          if (dirtyPaths.length > 0) {
            addDirtyPaths(stateDir, dirtyPaths);
          }
          if (dirtyPaths.some(isSourceImpactRelevantPath)) {
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

        const primaryPath = resolvePrimaryPath(input);
        if (!primaryPath || !kibiReady) {
          return emptyResult();
        }

        const relativePath = toRepoRelativePath(primaryPath, cwd);
        const state = loadHookState(stateDir);

        if (isReadLikeTool(input.toolName)) {
          if (hasGuidedPath(state, "read", relativePath)) {
            return emptyResult();
          }

          const guidance = readGuidance(primaryPath, {
            cwd,
            hasKibi: kibiReady,
            mcpState: state.mcpState,
            workspaceTrusted,
            knowledge: knowledgeFor(
              cwd,
              getSourceLinkedSymbols(cwd, primaryPath, stateDir),
              // rationale: as above, only "edit" changes the snippet.
              // Stryker disable next-line StringLiteral
              "read",
            ),
          });
          if (!guidance) {
            return emptyResult();
          }

          rememberGuidedPath(stateDir, "read", relativePath);
          return { additional_context: guidance };
        }

        if (isEditLikeTool(input.toolName)) {
          // rationale: the runner only ever passes "read" or "write"; an empty
          // kind selects the same write bucket.
          // Stryker disable StringLiteral
          if (hasGuidedPath(state, "write", relativePath)) {
            return emptyResult();
          }
          // Stryker restore

          const guidance = writeGuidance(primaryPath, {
            cwd,
            hasKibi: kibiReady,
            mcpState: state.mcpState,
            workspaceTrusted,
          });
          if (!guidance) {
            return emptyResult();
          }

          // rationale: same bucket equivalence as the lookup above.
          // Stryker disable StringLiteral
          rememberGuidedPath(stateDir, "write", relativePath);
          // Stryker restore
          return { additional_context: guidance };
        }

        return emptyResult();
      }

      case "stop": {
        const state = loadHookState(stateDir);
        const shouldClearSession =
          state.dirtyPaths.length > 0 ||
          state.kbCheckRun ||
          state.planDelivered;

        if (input.status === "aborted" || input.status === "error") {
          if (shouldClearSession) {
            clearSessionHookState(stateDir);
          }
          return emptyResult();
        }

        // Source changed and nothing was recorded: the follow-up asks for the
        // decision to be recorded, once per conversation.
        const capture = claimCaptureReminder(session)
          ? captureReminder(hasDecisionFlag(session, "rule-prompt"))
          : undefined;
        // Requirements were written without a signoff view since: ask once.
        // A recorded requirement also counts as recorded knowledge, so this
        // never coincides with the capture request above.
        const signoff = claimSignoffReminder(session, cwd)
          ? signoffReminder()
          : undefined;
        const reminder = stopFollowupMessage(state);
        const followupMessage = [capture, signoff, reminder]
          .filter((part): part is string => part !== undefined)
          .join("\n");
        if (followupMessage) {
          trace.action = capture
            ? "stop_capture_reminder"
            : signoff
              ? "stop_signoff_reminder"
              : "stop_reminder";
          clearSessionHookState(stateDir);
          return { followup_message: followupMessage };
        }

        if (shouldClearSession) {
          clearSessionHookState(stateDir);
        }

        return emptyResult();
      }

      default:
        return emptyResult();
    }
  } finally {
    if (kibiReady) {
      appendHookUsage(
        {
          host: "cursor",
          packageVersion: packageVersion(),
          workspaceRoot: cwd,
          event: input.event,
          sessionId: input.conversationId,
          hostTool: input.toolName,
          trace,
          startedAt,
        },
        environment.env ?? process.env,
      );
    }
    await finishHookTelemetry(
      {
        event: input.event,
        workspaceRoot: kibiReady ? cwd : undefined,
        sessionId: input.conversationId,
      },
      environment.env ?? process.env,
    );
  }
}

export async function main(): Promise<void> {
  const result = await runHook(parseStdinJson(await readStdin()), {
    workspaceTrusted: process.argv.includes("--trusted-workspace"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

// covered_by TEST-cursor-kibi-plugin-v1
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
    const message =
      error instanceof Error ? error.message : "Unknown hook error";
    process.stdout.write(
      `${JSON.stringify({
        additional_context: `Kibi hook runner error: ${message}`,
      })}\n`,
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
