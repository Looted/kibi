#!/usr/bin/env node
// implements REQ-cursor-kibi-plugin-v1
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readGuidance, writeGuidance } from "./guidance.js";
import { parseHookInput, parseStdinJson, readStdin } from "./hook-input.js";
import {
  addDirtyPaths,
  clearDirtyPaths,
  hasGuidedPath,
  loadHookState,
  rememberGuidedPath,
  resolveStateDir,
} from "./hook-state.js";
import {
  BOOTSTRAP_REMINDER,
  DIRECT_KB_EDIT_WARNING,
  freshnessReminder,
} from "./messages.js";
import {
  extractExplicitPathFields,
  isDirectKbPath,
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
};

const editableTools = new Set([
  "Edit",
  "MultiEdit",
  "Write",
  "StrReplace",
  "apply_patch",
]);

const readTools = new Set(["Read", "TabRead"]);

function emptyResult(): CursorHookResult {
  return {};
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

function isReadLikeTool(toolName: string | undefined): boolean {
  return toolName === undefined || readTools.has(toolName);
}

function resolveWorkspaceRoot(input: ReturnType<typeof parseHookInput>): string {
  return input.cwd ?? process.cwd();
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

  switch (input.event) {
    case "sessionStart":
      if (!kibiReady) {
        return { additional_context: BOOTSTRAP_REMINDER };
      }
      return emptyResult();

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

      const guidance = readGuidance(primaryPath, cwd, kibiReady);
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
      const explicitPaths = extractExplicitPathFields(input.toolInput);
      const dirtyPaths = explicitPaths
        .map((candidate) => toRepoRelativePath(candidate, cwd))
        .filter(isMeaningfulTrackedPath);

      if (dirtyPaths.length > 0) {
        addDirtyPaths(stateDir, dirtyPaths);
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

        const guidance = readGuidance(primaryPath, cwd, kibiReady);
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

        const guidance = writeGuidance(primaryPath, cwd, kibiReady);
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
      if (state.dirtyPaths.length > 0) {
        clearDirtyPaths(stateDir);
        return {
          followup_message: freshnessReminder(state.dirtyPaths),
        };
      }

      return emptyResult();
    }

    default:
      return emptyResult();
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
      `${JSON.stringify({
        additional_context: `Kibi hook runner error: ${message}`,
      })}\n`,
    );
  });
}

export const hookRunnerPath = fileURLToPath(import.meta.url);
