// implements REQ-opencode-kibi-plugin-v1, REQ-kibi-telemetry-acceptance-gate-v2
import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendHookUsageRows,
  editTraces,
  finishHookTelemetry,
  hookTracesWanted,
  kbUsageTrace,
  readPackageVersion,
} from "kibi-agent-core/hook-usage-log";
import {
  extractEditedPaths,
  toWorkspacePath,
} from "kibi-agent-core/path-policy";
import { getFileLinkedTargetsByType } from "./file-entity-links.js";

/** OpenCode's built-in file-editing tools. */
const EDIT_TOOLS: ReadonlySet<string | undefined> = new Set([
  "edit",
  "write",
  "patch",
  "multiedit",
]);

// implements REQ-opencode-kibi-plugin-v1, REQ-kibi-telemetry-acceptance-gate-v2
export type OpencodeToolCall = {
  /** Kibi workspace root (the session's worktree). */
  worktree: string;
  tool: string | undefined;
  args: unknown;
  sessionId: string | undefined;
  startedAt: Date;
};

// dist/hook-telemetry.js sits one level below the package root. Read once at
// load: the version cannot change while the plugin runs.
const PACKAGE_VERSION = readPackageVersion(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
);

// implements REQ-opencode-kibi-plugin-v1, REQ-kibi-telemetry-acceptance-gate-v2
/**
 * Anonymous usage telemetry for each traced tool call and, when opted in
 * with `KIBI_DIAGNOSTIC_MODE`, hook rows for the lookup-before-first-edit
 * telemetry metric, written through the shared kibi-agent-core format: Kibi
 * lookups through MCP or the CLI, and edits with the requirements the edited
 * files implement (`implements` links in the configured symbols manifest).
 */
export function recordOpencodeToolTelemetry(
  call: OpencodeToolCall,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!hookTracesWanted(env)) return;
  try {
    recordToolCall(call, env);
  } catch {
    // Telemetry is best effort and must never disturb the tool call.
  }
  // The plugin lives as long as OpenCode: send the queue whenever it is due.
  void finishHookTelemetry(
    {
      // rationale: only "stop"/"sessionend" events force a send; any other
      // name, including an empty one, behaves the same.
      // Stryker disable next-line StringLiteral
      event: "tool.execute.after",
      workspaceRoot: existsSync(path.join(call.worktree, ".kb"))
        ? call.worktree
        : undefined,
      sessionId: call.sessionId,
    },
    env,
  );
}

function recordToolCall(call: OpencodeToolCall, env: NodeJS.ProcessEnv): void {
  if (!existsSync(path.join(call.worktree, ".kb"))) return;
  const kbUsage = kbUsageTrace(call.tool, call.args);
  if (!kbUsage && !EDIT_TOOLS.has(call.tool)) return;
  const traces = kbUsage
    ? [kbUsage]
    : editTraces(
        extractEditedPaths(call.args)
          .map(
            (rawPath) =>
              toWorkspacePath(call.worktree, rawPath, call.worktree)?.relative,
          )
          .filter((relative): relative is string => relative !== undefined),
        (relativePath) =>
          getFileLinkedTargetsByType(
            call.worktree,
            path.join(call.worktree, relativePath),
            ["implements"],
          ),
      );
  appendHookUsageRows(
    {
      host: "opencode",
      packageVersion: PACKAGE_VERSION,
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
