#!/usr/bin/env node
// implements REQ-codex-kibi-plugin-v1
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseHookInput, parseStdinJson, readStdin } from "./hook-input.js";
import { addDirtyPaths, loadHookState } from "./hook-state.js";
import {
  BOOTSTRAP_REMINDER,
  DIRECT_KB_EDIT_WARNING,
  freshnessReminder,
} from "./messages.js";
import {
  extractExplicitPathFields,
  isDirectKbPath,
  isMeaningfulTrackedPath,
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

  return fs.existsSync(path.join(cwd, ".kb", "config.json"));
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
      if (state.dirtyPaths.length > 0) {
        return {
          continue: true,
          systemMessage: freshnessReminder(state.dirtyPaths),
        };
      }

      return defaultResult();
    }

    default:
      return defaultResult();
  }
}

async function main(): Promise<void> {
  const result = await runHook(parseStdinJson(await readStdin()));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown hook error";
    process.stdout.write(
      `${JSON.stringify({ continue: true, systemMessage: `Kibi hook runner error: ${message}` })}\n`,
    );
  });
}

export const hookRunnerPath = fileURLToPath(import.meta.url);
