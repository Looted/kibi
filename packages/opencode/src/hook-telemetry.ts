// implements REQ-opencode-kibi-plugin-v1, REQ-kibi-telemetry-acceptance-gate
import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendHookUsageRows,
  editTraces,
  hookTelemetryEnabled,
  kbUsageTrace,
  readPackageVersion,
} from "kibi-agent-core/hook-usage-log";
import {
  extractEditedPaths,
  toWorkspacePath,
} from "kibi-agent-core/path-policy";
import { getFileLinkedTargetsByType } from "./file-entity-links.js";

/** OpenCode's built-in file-editing tools. */
const EDIT_TOOLS = new Set(["edit", "write", "patch", "multiedit"]);

// implements REQ-opencode-kibi-plugin-v1, REQ-kibi-telemetry-acceptance-gate
export type OpencodeToolCall = {
  /** Kibi workspace root (the session's worktree). */
  worktree: string;
  tool: string | undefined;
  args: unknown;
  sessionId: string | undefined;
  startedAt: Date;
};

let cachedPackageVersion: string | null | undefined;

function packageVersion(): string | null {
  // dist/hook-telemetry.js sits one level below the package root.
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

// implements REQ-opencode-kibi-plugin-v1, REQ-kibi-telemetry-acceptance-gate
/**
 * Opt-in (`KIBI_DIAGNOSTIC_MODE`) hook rows for the lookup-before-first-edit
 * telemetry metric, written through the shared kibi-agent-core format: Kibi
 * lookups through MCP or the CLI, and edits with the requirements the edited
 * files implement (`implements` links in the configured symbols manifest).
 */
export function recordOpencodeToolTelemetry(
  call: OpencodeToolCall,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!hookTelemetryEnabled(env)) return;
  try {
    recordToolCall(call, env);
  } catch {
    // Telemetry is best effort and must never disturb the tool call.
  }
}

function recordToolCall(call: OpencodeToolCall, env: NodeJS.ProcessEnv): void {
  if (!existsSync(path.join(call.worktree, ".kb"))) return;
  const kbUsage = kbUsageTrace(call.tool, call.args);
  let traces = kbUsage ? [kbUsage] : [];
  if (!kbUsage && call.tool !== undefined && EDIT_TOOLS.has(call.tool)) {
    const relativePaths = extractEditedPaths(call.args)
      .map(
        (rawPath) =>
          toWorkspacePath(call.worktree, rawPath, call.worktree)?.relative,
      )
      .filter((relative): relative is string => relative !== undefined);
    traces = editTraces(relativePaths, (relativePath) =>
      getFileLinkedTargetsByType(
        call.worktree,
        path.join(call.worktree, relativePath),
        ["implements"],
      ),
    );
  }
  appendHookUsageRows(
    {
      host: "opencode",
      packageVersion: packageVersion(),
      workspaceRoot: call.worktree,
      event: "tool.execute.after",
      sessionId: call.sessionId,
      hostTool: call.tool,
      startedAt: call.startedAt,
    },
    traces,
    env,
  );
}
