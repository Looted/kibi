#!/usr/bin/env node
// implements REQ-codex-kibi-plugin-v1
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseHookInput, parseStdinJson, readStdin } from "./hook-input.js";
import {
  addDirtyPaths,
  clearDirtyPaths,
  loadHookState,
  recordKbMcpTool,
} from "./hook-state.js";
import { extractKbMcpToolCall } from "./kb-mcp-tools.js";
import {
  BOOTSTRAP_REMINDER,
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

export type HookResult = {
  continue: true;
  stopReason?: string;
  systemMessage?: string;
  suppressOutput?: boolean;
};

export type HookEnvironment = {
  pluginData?: string;
};

const editableTools = new Set(["Edit", "MultiEdit", "Write", "apply_patch"]);

function defaultResult(): HookResult {
  return { continue: true };
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

export async function runHook(
  rawInput: unknown,
  environment: HookEnvironment = {},
): Promise<HookResult> {
  const input = parseHookInput(rawInput);
  const pluginData = environment.pluginData ?? process.env.PLUGIN_DATA;

  switch (input.event) {
    case "SessionStart":
      if (!hasKibiConfig(input.cwd ?? process.cwd())) {
        return { continue: true, systemMessage: BOOTSTRAP_REMINDER };
      }
      return defaultResult();

    case "PreToolUse": {
      const explicitPaths = extractExplicitPathFields(input.toolInput);
      const hasDirectKbEdit =
        isEditLikeTool(input.toolName) && explicitPaths.some(isDirectKbPath);

      if (hasDirectKbEdit) {
        return { continue: true, systemMessage: DIRECT_KB_EDIT_WARNING };
      }

      return defaultResult();
    }

    case "PostToolUse": {
      const kbToolCall = extractKbMcpToolCall(input.toolName, input.toolInput);
      if (kbToolCall) {
        recordKbMcpTool(pluginData, kbToolCall.toolName, {
          impactCheckRun: kbToolCall.impactCheckRun,
          sourceFiles: kbToolCall.sourceFiles,
        });
      }

      const dirtyPaths = extractExplicitPathFields(input.toolInput).filter(
        isMeaningfulTrackedPath,
      );

      if (dirtyPaths.length > 0) {
        addDirtyPaths(pluginData, dirtyPaths);
      }

      return defaultResult();
    }

    case "Stop": {
      const state = loadHookState(pluginData);
      const uncheckedSourcePaths = state.dirtyPaths
        .filter(isSourceImpactRelevantPath)
        .filter((sourcePath) => !state.impactCheckedPaths.includes(sourcePath));
      if (uncheckedSourcePaths.length > 0) {
        clearDirtyPaths(pluginData);
        return {
          continue: true,
          systemMessage: impactCheckReminder(uncheckedSourcePaths),
        };
      }

      const freshnessPaths = state.dirtyPaths.filter(
        (dirtyPath) => !isSourceImpactRelevantPath(dirtyPath),
      );

      if (freshnessPaths.length > 0) {
        clearDirtyPaths(pluginData);
        return {
          continue: true,
          systemMessage: freshnessReminder(freshnessPaths),
        };
      }

      if (state.dirtyPaths.length > 0 || state.kbCheckRun) {
        clearDirtyPaths(pluginData);
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
