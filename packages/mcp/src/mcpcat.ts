import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as mcpcat from "mcpcat";

const projectId = (process.env.MCPCAT_PROJECT_ID ?? "").trim();

export function attachMcpcat(server: McpServer): void {
  if (!projectId) {
    return;
  }

  try {
    mcpcat.track(server, projectId);
    console.error(`[MCPcat] Tracking enabled for project ${projectId}`);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error(`[MCPcat] Failed to attach tracking: ${details}`);
  }
}
