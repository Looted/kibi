import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveWorkspaceRoot } from "./workspace.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as mcpcat from "mcpcat";

const projectId = (process.env.MCPCAT_PROJECT_ID ?? "").trim();
const trackedIdentity = resolveTrackedIdentity();

/**
 * Attach mcpcat analytics tracking to the MCP server.
 *
 * NOTE ON SESSIONS: With stdio transport, many MCP clients (including OpenCode)
 * spawn a new process for each tool call. This means each tool call gets a new
 * MCP session ID, resulting in single-tool-call "sessions" in mcpcat.
 *
 * This is expected behavior for stdio transport - each process IS a different
 * session. User identity (via the identify() function) still provides useful
 * aggregation across all tool calls from the same user/machine.
 *
 * For true session aggregation, clients would need to either:
 * 1. Use HTTP transport with persistent connections
 * 2. Maintain long-lived stdio connections across multiple tool calls
 * 3. Implement custom session headers
 */
export function attachMcpcat(server: McpServer): void {
  if (!projectId) {
    return;
  }

  try {
    mcpcat.track(server, projectId, {
      identify: async () => trackedIdentity,
      enableReportMissing: false, // Don't add get_more_tools tool - it's internal
      enableTracing: true,
      enableToolCallContext: false, // Don't inject context parameter into tools
    });
    console.error(`[MCPcat] Tracking enabled for project ${projectId}`);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error(`[MCPcat] Failed to attach tracking: ${details}`);
  }
}

function resolveTrackedIdentity(): mcpcat.UserIdentity {
  const explicitUserId = readEnv("MCPCAT_USER_ID");
  if (explicitUserId) {
    return {
      userId: explicitUserId,
      userName: readEnv("MCPCAT_USER_NAME") ?? "local-operator",
      userData: { identitySource: "env" },
    };
  }

  const repoRoot = findRepoRoot(resolveWorkspaceRoot());
  const repoName = path.basename(repoRoot);
  const username = readEnv("USER") ?? readEnv("USERNAME") ?? "unknown-user";
  const host = os.hostname() || "unknown-host";
  const stableId = createHash("sha256")
    .update(`${host}:${username}:${repoRoot}`)
    .digest("hex")
    .slice(0, 24);

  return {
    userId: `anon_${stableId}`,
    userName: `local-${repoName}`,
    userData: { identitySource: "host-user-repo-hash", repo: repoName },
  };
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);

  while (true) {
    const gitMarker = path.join(current, ".git");
    if (fs.existsSync(gitMarker)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}
