#!/usr/bin/env node
// implements REQ-cursor-kibi-plugin-v1, REQ-cursor-stop-job-vs-plan
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readGuidance, writeGuidance } from "./guidance.js";
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
  toRepoRelativePath,
} from "./path-policy.js";

export type CursorHookResult = {
  additional_context?: string;
  permission?: "allow" | "deny";
  user_message?: string;
  agent_message?: string;
  followup_message?: string;
};

export type HookEnvironment = {
  pluginData?: string;
  workspaceTrusted?: boolean;
};

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

function hasKibiConfig(cwd: string | undefined): boolean {
  if (!cwd) {
    return false;
  }

  return fs.existsSync(path.join(cwd, ".kb", "manifest.json"));
}

function isEditLikeTool(toolName: string | undefined): boolean {
  return toolName === undefined || editableTools.has(toolName);
}

function isKnownEditableTool(toolName: string | undefined): boolean {
  return toolName !== undefined && editableTools.has(toolName);
}

function isPlanDeliveryTool(toolName: string | undefined): boolean {
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
  const input = parseHookInput(rawInput);
  const pluginData = environment.pluginData ?? process.env.PLUGIN_DATA;
  const stateDir = resolveStateDir(pluginData, input.conversationId);
  const cwd = resolveWorkspaceRoot(input);
  const kibiReady = hasKibiConfig(cwd);
  const workspaceTrusted = environment.workspaceTrusted === true;
  const initialState = loadHookState(stateDir);

  switch (input.event) {
    case "sessionStart":
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
        return advisory ? { additional_context: advisory } : emptyResult();
      }

    case "preToolUse": {
      const explicitPaths = extractExplicitPathFields(input.toolInput);
      const hasDirectKbEdit =
        isEditLikeTool(input.toolName) && explicitPaths.some(isDirectKbPath);

      if (hasDirectKbEdit) {
        return {
          permission: "allow",
          agent_message: DIRECT_KB_EDIT_WARNING,
        };
      }

      return emptyResult();
    }

    case "beforeReadFile": {
      const primaryPath = resolvePrimaryPath(input);
      if (!primaryPath || !kibiReady) {
        return { permission: "allow" };
      }

      const relativePath = toRepoRelativePath(primaryPath, cwd);
      const state = loadHookState(stateDir);
      if (hasGuidedPath(state, "read", relativePath)) {
        return { permission: "allow" };
      }

      const guidance = readGuidance(primaryPath, {
        cwd,
        hasKibi: kibiReady,
        mcpState: state.mcpState,
        workspaceTrusted,
      });
      if (!guidance) {
        return { permission: "allow" };
      }

      rememberGuidedPath(stateDir, "read", relativePath);
      return {
        permission: "allow",
        agent_message: guidance,
      };
    }

    case "postToolUse": {
      const kbToolCall = extractKbMcpToolCall(input.toolName, input.toolInput);
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
        });
        if (!guidance) {
          return emptyResult();
        }

        rememberGuidedPath(stateDir, "read", relativePath);
        return { additional_context: guidance };
      }

      if (isEditLikeTool(input.toolName)) {
        if (hasGuidedPath(state, "write", relativePath)) {
          return emptyResult();
        }

        const guidance = writeGuidance(primaryPath, {
          cwd,
          hasKibi: kibiReady,
          mcpState: state.mcpState,
          workspaceTrusted,
        });
        if (!guidance) {
          return emptyResult();
        }

        rememberGuidedPath(stateDir, "write", relativePath);
        return { additional_context: guidance };
      }

      return emptyResult();
    }

    case "stop": {
      const state = loadHookState(stateDir);
      const shouldClearSession =
        state.dirtyPaths.length > 0 ||
        state.kbMutationTools.length > 0 ||
        state.kbCheckRun ||
        state.planDelivered;

      if (input.status === "aborted" || input.status === "error") {
        if (shouldClearSession) {
          clearSessionHookState(stateDir);
        }
        return emptyResult();
      }

      const followupMessage = stopFollowupMessage(state);
      if (followupMessage) {
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
}

export async function main(): Promise<void> {
  const result = await runHook(parseStdinJson(await readStdin()), {
    workspaceTrusted: process.argv.includes("--trusted-workspace"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

export function isInvokedAsCli(
  argv1: string | undefined,
  moduleUrl: string,
): boolean {
  const invokedPath = argv1
    ? pathToFileURL(path.resolve(argv1)).href
    : "";
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

if (isInvokedAsCli(process.argv[1], import.meta.url)) {
  void runHookCli();
}

export const hookRunnerPath = fileURLToPath(import.meta.url);
