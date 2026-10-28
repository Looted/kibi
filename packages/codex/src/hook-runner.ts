#!/usr/bin/env node
// implements REQ-codex-kibi-plugin-v1
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  requestWords,
  rulePromptNote,
  settleFirmRequirements,
  settledFirmRequirements,
  signoffReminder,
} from "kibi-agent-core/decision-guard";
import {
  appendHookUsageRows,
  editTraces,
  hookTelemetryEnabled,
  kbUsageTrace,
  readPackageVersion,
} from "kibi-agent-core/hook-usage-log";
import { stampKibiWorkspace } from "kibi-agent-core/kb-mcp-tools";
import {
  type IndexedSymbol,
  loadKnowledgeIndex,
} from "kibi-agent-core/knowledge-index";
import {
  canonicalizeWorkspacePath,
  extractEditedPaths,
} from "kibi-agent-core/path-policy";
import { requirementCandidatesForPath } from "kibi-agent-core/requirement-candidates";
import {
  type Summarize,
  claimSnippetSlot,
  createEntitySummarizer,
  editFocus,
  editKnowledgeContext,
  implementedRequirementIds,
  unownedSourceNote,
  unreadableManifestNote,
} from "kibi-agent-core/snippets";
import { parseHookInput, parseStdinJson, readStdin } from "./hook-input.js";
import {
  addDirtyPaths,
  clearDirtyPaths,
  loadHookState,
  recordKbMcpTool,
  resolveWorkspaceStateDir,
} from "./hook-state.js";
import { extractKbMcpToolCall } from "./kb-mcp-tools.js";
import {
  DIRECT_KB_EDIT_WARNING,
  freshnessReminder,
  impactCheckReminder,
} from "./messages.js";
import {
  isDirectKbPath,
  isMeaningfulTrackedPath,
  isSourceImpactRelevantPath,
} from "./path-policy.js";
import { resolveKibiWorkspace } from "./workspace-optin.js";

export type HookResult = {
  continue: true;
  stopReason?: string;
  systemMessage?: string;
  suppressOutput?: boolean;
  /**
   * Stop only: Codex continues the turn with `reason` as the next prompt.
   * Used once per session, never while `stop_hook_active` is set.
   */
  decision?: "block";
  reason?: string;
  /**
   * PreToolUse only: route a Kibi MCP call to the session's workspace.
   * Codex applies `updatedInput` only with `permissionDecision: "allow"`,
   * and that decision does not override the server's tool approval mode.
   */
  hookSpecificOutput?:
    | {
        hookEventName: "PreToolUse";
        permissionDecision: "allow";
        updatedInput: Record<string, unknown>;
      }
    | {
        /**
         * PreToolUse only: model-visible context that does not block or
         * rewrite the edit (Codex caps it at roughly 2,500 tokens).
         */
        hookEventName: "PreToolUse";
        additionalContext: string;
      }
    | {
        /** UserPromptSubmit only: developer context added to the prompt. */
        hookEventName: "UserPromptSubmit";
        additionalContext: string;
      };
};

export type HookEnvironment = {
  pluginData?: string;
  /** Process environment for the telemetry opt-in; defaults to process.env. */
  env?: NodeJS.ProcessEnv;
};

const editableTools = new Set(["Edit", "MultiEdit", "Write", "apply_patch"]);

function defaultResult(): HookResult {
  return { continue: true };
}

function isEditLikeTool(toolName: string | undefined): boolean {
  return toolName === undefined || editableTools.has(toolName);
}

function isKnownEditTool(toolName: string | undefined): boolean {
  // rationale: the undefined check only narrows the type for Set.has; at
  // runtime Set.has(undefined) is false, so dropping it changes nothing.
  // Stryker disable next-line ConditionalExpression
  return toolName !== undefined && editableTools.has(toolName);
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
 * the edit targets, shown once per file per Codex session. A source file
 * without a linked symbol gets the discovery note instead (once per file),
 * unless the manifest itself could not be read, which is said once per
 * session rather than calling the file unlinked.
 */
// implements REQ-codex-kibi-plugin-v1
function preEditContext(
  workspaceRoot: string,
  stateDir: string | undefined,
  input: ReturnType<typeof parseHookInput>,
  env: NodeJS.ProcessEnv,
): string | undefined {
  const targets = editTargets(workspaceRoot, input);
  // rationale: with no targets every later step yields nothing, so this
  // early return only skips loading the index.
  // Stryker disable next-line ConditionalExpression
  if (targets.length === 0) return undefined;
  const index = loadKnowledgeIndex(workspaceRoot, stateDir);
  const summarize = createEntitySummarizer(workspaceRoot);
  const session: DecisionSession = { stateDir, sessionId: input.sessionId };
  const words = requestWords(session);
  const notice = firmNotice(
    targets,
    index.files,
    summarize,
    session,
    input,
    env,
  );
  const knowledge = editKnowledgeContext({
    relativePaths: targets.map((target) => target.relative),
    symbolsFor: (relativePath) => index.files[relativePath] ?? [],
    summarize,
    stateDir,
    sessionId: input.sessionId,
    focusFor: (relativePath) => {
      const target = targets.find(
        // rationale: only Edit-style input carries old_string, and it names a
        // single file, so a focused edit always has exactly one target.
        // Stryker disable next-line ConditionalExpression
        (candidate) => candidate.relative === relativePath,
      );
      return target ? editFocus(target.absolute, input.toolInput) : undefined;
    },
    noteFor: (relativePath) => {
      if (!isSourceImpactRelevantPath(relativePath)) return undefined;
      // A manifest the scanner could not read, in whole or for this file (a
      // coordinate binds a symbol here but no record was indexed), is not
      // evidence that nothing is linked.
      const unread =
        index.manifest === "unreadable" ||
        (index.coordinateFiles.includes(relativePath) &&
          !index.unlinkedFiles.includes(relativePath));
      if (!unread)
        return unownedSourceNote(
          relativePath,
          requirementCandidatesForPath(
            workspaceRoot,
            relativePath,
            undefined,
            words,
          ),
        );
      // rationale: any constant fallback keys a session without an id the
      // same way; only the per-session part is observable.
      // Stryker disable next-line StringLiteral
      const noticeKey = `${input.sessionId ?? ""}\u0000notice\u0000manifest-unreadable`;
      return claimSnippetSlot(stateDir, noticeKey)
        ? unreadableManifestNote(relativePath)
        : undefined;
    },
  });
  const parts = [notice, knowledge].filter(
    (part): part is string => part !== undefined,
  );
  return parts.join("\n\n") || undefined;
}

// implements REQ-agent-hosts-decision-guard
/**
 * Codex's pre-tool hook cannot put a call to the person, so an edit of code
 * that implements a firm requirement gets a notice telling the agent to ask
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

function packageVersion(): string | null {
  // bin/hook-runner.mjs and dist/hook-runner.js sit one level below the
  // plugin root that holds package.json. Each hook event is its own process,
  // so the version is read at most once per event anyway.
  return readPackageVersion(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json",
    ),
  );
}

/** One `edited` trace per edited file, with the requirements it implements. */
function editTelemetryTraces(
  workspaceRoot: string,
  stateDir: string | undefined,
  input: ReturnType<typeof parseHookInput>,
): ReturnType<typeof editTraces> {
  const files = loadKnowledgeIndex(workspaceRoot, stateDir).files;
  return editTraces(
    editTargets(workspaceRoot, input).map((target) => target.relative),
    (relativePath) => implementedRequirementIds(files[relativePath] ?? []),
  );
}

/**
 * Opt-in (`KIBI_DIAGNOSTIC_MODE`) hook rows for the lookup-before-first-edit
 * telemetry metric: Kibi lookups through MCP or the CLI, and edits with the
 * requirements the edited files implement.
 */
// implements REQ-codex-kibi-plugin-v1
function recordToolTelemetry(
  workspaceRoot: string,
  stateDir: string | undefined,
  input: ReturnType<typeof parseHookInput>,
  startedAt: Date,
  env: NodeJS.ProcessEnv | undefined,
): void {
  // rationale: appendHookUsageRows applies the same opt-in; this guard only
  // skips loading the index when telemetry is off.
  // Stryker disable next-line ConditionalExpression
  if (!hookTelemetryEnabled(env)) return;
  const kbUsage = kbUsageTrace(input.toolName, input.toolInput);
  if (!kbUsage && !isKnownEditTool(input.toolName)) return;
  const traces = kbUsage
    ? [kbUsage]
    : editTelemetryTraces(workspaceRoot, stateDir, input);
  appendHookUsageRows(
    {
      host: "codex",
      packageVersion: packageVersion(),
      workspaceRoot,
      event: "PostToolUse",
      sessionId: input.sessionId,
      hostTool: input.toolName,
      startedAt,
    },
    traces,
    env,
  );
}

export async function runHook(
  rawInput: unknown,
  environment: HookEnvironment = {},
): Promise<HookResult> {
  const startedAt = new Date();
  const input = parseHookInput(rawInput);
  const pluginData = environment.pluginData ?? process.env.PLUGIN_DATA;

  // Workspaces that never adopted Kibi must stay silent: no reminders, no
  // tracking, and no state writes. The resolution is shared by every event so
  // a subdirectory session maps to the same workspace root as its repository.
  const workspace = resolveKibiWorkspace(input.cwd ?? process.cwd());
  if (!workspace.optedIn) {
    return defaultResult();
  }
  const stateDir = resolveWorkspaceStateDir(pluginData, workspace.root);

  switch (input.event) {
    // rationale: the default case below returns the same defaultResult, so
    // this case is behaviorally redundant.
    // Stryker disable next-line ConditionalExpression, StringLiteral
    case "SessionStart":
      // rationale: same redundancy as above; the default case already
      // returns defaultResult.
      // Stryker disable next-line StringLiteral
      return defaultResult();

    // implements REQ-agent-hosts-decision-guard
    case "UserPromptSubmit": {
      const rule = recordRequest(
        { stateDir, sessionId: input.sessionId },
        // rationale: a missing prompt states no rule whatever text stands in.
        // Stryker disable next-line StringLiteral
        input.prompt ?? "",
      );
      if (rule === undefined) return defaultResult();
      return {
        continue: true,
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: rulePromptNote(rule),
        },
      };
    }

    case "PreToolUse": {
      // Name the session's workspace on every Kibi MCP call so the launcher
      // answers from it, even after the thread moves into a git worktree.
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
            permissionDecision: "allow",
            updatedInput: stamped,
          },
        };
      }
      // Paths come from explicit fields and from `apply_patch` headers, so a
      // patch to .kb/ is warned about like an explicit-path edit.
      const explicitPaths = extractEditedPaths(input.toolInput);
      const hasDirectKbEdit =
        isEditLikeTool(input.toolName) && explicitPaths.some(isDirectKbPath);

      if (hasDirectKbEdit) {
        return { continue: true, systemMessage: DIRECT_KB_EDIT_WARNING };
      }

      let context: string | undefined;
      try {
        context = isKnownEditTool(input.toolName)
          ? preEditContext(
              workspace.root,
              stateDir,
              input,
              environment.env ?? process.env,
            )
          : undefined;
      } catch {
        // Requirement context is advisory; an unreadable manifest or file
        // leaves the edit without it rather than reporting a hook error.
      }
      if (context) {
        return {
          continue: true,
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            additionalContext: context,
          },
        };
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
      const kbToolCall = extractKbMcpToolCall(input.toolName, input.toolInput);
      if (kbToolCall) {
        recordKbMcpTool(stateDir, kbToolCall.toolName, {
          impactCheckRun: kbToolCall.impactCheckRun,
          sourceFiles: kbToolCall.sourceFiles,
        });
      }

      // `apply_patch` names its files only in the patch text, so the explicit
      // path fields alone would leave those edits untracked and the Stop
      // reminder silent.
      const dirtyPaths = extractEditedPaths(input.toolInput).filter(
        isMeaningfulTrackedPath,
      );

      if (dirtyPaths.length > 0) {
        addDirtyPaths(stateDir, dirtyPaths);
      }
      const session = { stateDir, sessionId: input.sessionId };
      if (
        isKnownEditTool(input.toolName) &&
        dirtyPaths.some(isSourceImpactRelevantPath)
      ) {
        markDecisionFlag(session, "source-edited");
      }
      if (
        kbToolCall?.toolName === "kb_upsert" ||
        kbUsageTrace(input.toolName, input.toolInput)?.kbOperation ===
          "kb_upsert"
      ) {
        markDecisionFlag(session, "kb-recorded");
        // implements REQ-kibi-signoff-views
        if (isRequirementUpsert(input.toolInput)) {
          markDecisionFlag(session, "requirement-recorded");
        }
      }

      return defaultResult();
    }

    case "Stop": {
      const state = loadHookState(stateDir);
      const uncheckedSourcePaths = state.dirtyPaths
        .filter(isSourceImpactRelevantPath)
        .filter((sourcePath) => !state.impactCheckedPaths.includes(sourcePath));
      // implements REQ-agent-hosts-decision-guard
      // Source changed and nothing was recorded: continue the turn once with
      // the capture request, before the context that holds the decision ends.
      const session = { stateDir, sessionId: input.sessionId };
      if (!input.stopHookActive && claimCaptureReminder(session)) {
        const reason = [
          captureReminder(hasDecisionFlag(session, "rule-prompt")),
          ...(uncheckedSourcePaths.length > 0
            ? [impactCheckReminder(uncheckedSourcePaths)]
            : []),
        ].join("\n");
        clearDirtyPaths(stateDir);
        return { continue: true, decision: "block", reason };
      }
      // implements REQ-kibi-signoff-views
      // Requirements were written and the person has not seen them as a
      // signoff view: continue once with the request to show `kibi signoff`.
      if (
        !input.stopHookActive &&
        claimSignoffReminder(session, workspace.root)
      ) {
        return {
          continue: true,
          decision: "block",
          reason: signoffReminder(),
        };
      }
      if (uncheckedSourcePaths.length > 0) {
        clearDirtyPaths(stateDir);
        return {
          continue: true,
          systemMessage: impactCheckReminder(uncheckedSourcePaths),
        };
      }

      const freshnessPaths = state.dirtyPaths.filter(
        (dirtyPath) => !isSourceImpactRelevantPath(dirtyPath),
      );

      if (freshnessPaths.length > 0) {
        clearDirtyPaths(stateDir);
        return {
          continue: true,
          systemMessage: freshnessReminder(freshnessPaths),
        };
      }

      // rationale: reaching this line with dirty paths implies every path is
      // source-impact relevant and impact checked, and recording a check also
      // sets kbCheckRun, so the length term cannot change the outcome.
      // Stryker disable next-line ConditionalExpression
      if (state.dirtyPaths.length > 0 || state.kbCheckRun) {
        clearDirtyPaths(stateDir);
      }

      return defaultResult();
    }

    default:
      return defaultResult();
  }
}

export async function main(): Promise<void> {
  const result = await runHook(parseStdinJson(await readStdin()));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

// implements REQ-codex-kibi-plugin-v1
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
