import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as mcpcat from "mcpcat";

const projectId = (process.env.MCPCAT_PROJECT_ID ?? "").trim();
const trackedIdentity = resolveTrackedIdentity();

export function attachMcpcat(server: McpServer): void {
  if (!projectId) {
    return;
  }

  try {
    mcpcat.track(server, projectId, {
      identify: async () => trackedIdentity,
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

  const repoRoot = findRepoRoot(process.cwd());
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
