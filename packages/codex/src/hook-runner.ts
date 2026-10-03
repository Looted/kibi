#!/usr/bin/env node
// implements REQ-codex-kibi-plugin-v1
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  appendHookUsageRows,
  editTraces,
  hookTelemetryEnabled,
  kbUsageTrace,
  readPackageVersion,
} from "kibi-agent-core/hook-usage-log";
import { stampKibiWorkspace } from "kibi-agent-core/kb-mcp-tools";
import { loadKnowledgeIndex } from "kibi-agent-core/knowledge-index";
import {
  canonicalizeWorkspacePath,
  extractEditedPaths,
} from "kibi-agent-core/path-policy";
import {
  createEntitySummarizer,
  editFocus,
  editKnowledgeContext,
  implementedRequirementIds,
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
  extractExplicitPathFields,
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
 * the edit targets, shown once per file per Codex session.
 */
// implements REQ-codex-kibi-plugin-v1
function preEditContext(
  workspaceRoot: string,
  stateDir: string | undefined,
  input: ReturnType<typeof parseHookInput>,
): string | undefined {
  const targets = editTargets(workspaceRoot, input);
  if (targets.length === 0) return undefined;
  const files = loadKnowledgeIndex(workspaceRoot, stateDir).files;
  return editKnowledgeContext({
    relativePaths: targets.map((target) => target.relative),
    symbolsFor: (relativePath) => files[relativePath] ?? [],
    summarize: createEntitySummarizer(workspaceRoot),
    stateDir,
    sessionId: input.sessionId,
    focusFor: (relativePath) => {
      const target = targets.find(
        (candidate) => candidate.relative === relativePath,
      );
      return target ? editFocus(target.absolute, input.toolInput) : undefined;
    },
  });
}

let cachedPackageVersion: string | null | undefined;

function packageVersion(): string | null {
  // bin/hook-runner.mjs and dist/hook-runner.js sit one level below the
  // plugin root that holds package.json.
  if (cachedPackageVersion !== undefined) return cachedPackageVersion;
  cachedPackageVersion = readPackageVersion(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json",
    ),
  );
  return cachedPackageVersion;
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
  if (!hookTelemetryEnabled(env)) return;
  const kbUsage = kbUsageTrace(input.toolName, input.toolInput);
  let traces = kbUsage ? [kbUsage] : [];
  if (!kbUsage && isKnownEditTool(input.toolName)) {
    const files = loadKnowledgeIndex(workspaceRoot, stateDir).files;
    traces = editTraces(
      editTargets(workspaceRoot, input).map((target) => target.relative),
      (relativePath) => implementedRequirementIds(files[relativePath] ?? []),
    );
  }
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
      const explicitPaths = extractExplicitPathFields(input.toolInput);
      const hasDirectKbEdit =
        isEditLikeTool(input.toolName) && explicitPaths.some(isDirectKbPath);

      if (hasDirectKbEdit) {
        return { continue: true, systemMessage: DIRECT_KB_EDIT_WARNING };
      }

      let context: string | undefined;
      try {
        context = isKnownEditTool(input.toolName)
          ? preEditContext(workspace.root, stateDir, input)
          : undefined;
      } catch {
        // Requirement context is advisory; an unreadable manifest or file
        // leaves the edit without it rather than reporting a hook error.
        context = undefined;
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

      const dirtyPaths = extractExplicitPathFields(input.toolInput).filter(
        isMeaningfulTrackedPath,
      );

      if (dirtyPaths.length > 0) {
        addDirtyPaths(stateDir, dirtyPaths);
      }

      return defaultResult();
    }

    case "Stop": {
      const state = loadHookState(stateDir);
      const uncheckedSourcePaths = state.dirtyPaths
        .filter(isSourceImpactRelevantPath)
        .filter((sourcePath) => !state.impactCheckedPaths.includes(sourcePath));
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
