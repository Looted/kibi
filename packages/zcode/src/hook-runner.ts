#!/usr/bin/env node
// implements REQ-zcode-kibi-plugin-v1
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseHookInput, parseStdinJson, readStdin } from "./hook-input.js";
import {
  addDirtyPaths,
  clearDirtyPaths,
  loadHookState,
  recordKbMcpTool,
  resolveSessionStateDir,
} from "./hook-state.js";
import { extractKbMcpToolCall } from "./kb-mcp-tools.js";
import {
  DIRECT_KB_EDIT_WARNING,
  SESSION_START_CONTEXT,
  freshnessReminder,
  impactCheckReminder,
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
    additionalContext: string;
  };
  systemMessage?: string;
};

export type HookEnvironment = {
  pluginData?: string;
};

const editableTools = new Set(["Edit", "MultiEdit", "Write", "apply_patch"]);

/**
 * Tools that actually mutate files. Only these create dirty paths: a path
 * argument inside a read-only tool call (Read, Grep, search tools, …) is not
 * evidence that the file changed.
 */
function isMutatingTool(toolName: string | undefined): boolean {
  return toolName !== undefined && editableTools.has(toolName);
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

const zcodeHookEvents: readonly ZcodeHookEvent[] = [
  "SessionStart",
  "PreToolUse",
  "PostToolUse",
  "Stop",
];

function isZcodeHookEvent(event: string): event is ZcodeHookEvent {
  return zcodeHookEvents.includes(event as ZcodeHookEvent);
}

function defaultResult(): HookResult {
  return { continue: true };
}

function contextResult(event: string, message: string): HookResult {
  if (isZcodeHookEvent(event)) {
    return {
      continue: true,
      hookSpecificOutput: { hookEventName: event, additionalContext: message },
    };
  }

  return { continue: true, systemMessage: message };
}

function isEditLikeTool(toolName: string | undefined): boolean {
  return toolName === undefined || editableTools.has(toolName);
}

export async function runHook(
  rawInput: unknown,
  environment: HookEnvironment = {},
): Promise<HookResult> {
  const input = parseHookInput(rawInput);
  const pluginData =
    environment.pluginData ??
    process.env.ZCODE_PLUGIN_DATA ??
    process.env.CLAUDE_PLUGIN_DATA;

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

  switch (input.event) {
    case "SessionStart":
      return contextResult(input.event, SESSION_START_CONTEXT);

    case "PreToolUse": {
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
        return contextResult(input.event, DIRECT_KB_EDIT_WARNING);
      }

      return defaultResult();
    }

    case "PostToolUse": {
      const kbToolCall = extractKbMcpToolCall(input.toolName, input.toolInput);
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
      if (isMutatingTool(input.toolName)) {
        const dirtyPaths = extractMutatedWorkspacePaths(
          workspace.root,
          input.cwd,
          input.toolInput,
        );

        if (dirtyPaths.length > 0) {
          addDirtyPaths(stateDir, dirtyPaths);
        }
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
        return contextResult(
          input.event,
          impactCheckReminder(uncheckedSourcePaths),
        );
      }

      const freshnessPaths = state.dirtyPaths.filter(
        (dirtyPath) => !isSourceImpactRelevantPath(dirtyPath),
      );

      if (freshnessPaths.length > 0) {
        clearDirtyPaths(stateDir);
        return contextResult(input.event, freshnessReminder(freshnessPaths));
      }

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

// implements REQ-zcode-kibi-plugin-v1
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
