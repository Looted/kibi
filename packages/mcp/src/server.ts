/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { sessionBriefWith } from "kibi-agent-core/session-brief";
import { initializeDiagnosticMode } from "./diagnostics.js";
import { loadDefaultEnvFile } from "./env.js";
import { kibiReleaseForMcp, mcpServerTitle } from "./kibi-release.js";
import { setupDocsAndPrompts } from "./server/docs.js";
import { KIBI_ICONS } from "./server/icons.js";
import { registerAllTools } from "./server/tools.js";
import {
  connectTransport,
  keepStdoutForProtocol,
  setupTransportHandlers,
} from "./server/transport.js";
import {
  WorkspaceRouter,
  setWorkspaceRouter,
} from "./server/workspace-router.js";
import { startMcpTelemetry } from "./usage-telemetry.js";
import { resolveWorkspaceRoot } from "./workspace.js";

// Read version from package.json to prevent drift
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };
const VERSION = packageJson.version;

/**
 * The initialize instructions: the shared session brief every host adapter
 * opens with, then the MCP specifics. A host with no Kibi plugin (Gemini CLI,
 * any MCP client) gets the same policy from here.
 */
export const SERVER_INSTRUCTIONS = sessionBriefWith([
  "kb_search answers a question with the governing requirements, facts, ADRs and tests; kb_query looks up an exact id or sourceFile; kb_upsert writes; kb_check validates; kb_status reports freshness.",
  "Workflow guidance: kb_skills with action load and id kibi-usage. For first-time repository setup, use the kibi-bootstrap prompt.",
]);

export async function startServer(): Promise<void> {
  keepStdoutForProtocol();

  // Load environment configuration
  loadDefaultEnvFile();

  // Initialize diagnostic mode if --diagnostic-mode flag is present
  initializeDiagnosticMode();
  startMcpTelemetry();

  // Create MCP server
  const server = new McpServer(
    {
      name: "kibi-mcp",
      title: mcpServerTitle(kibiReleaseForMcp(VERSION)),
      description:
        "Agent-native requirements compiler: branch-local knowledge base for requirements, scenarios, tests, facts, and code-symbol traceability.",
      websiteUrl: "https://github.com/Looted/kibi",
      version: VERSION,
      icons: KIBI_ICONS,
    },
    { instructions: SERVER_INSTRUCTIONS },
  );

  // Answer each call from the caller's workspace (worktrees, parallel agents).
  setWorkspaceRouter(
    new WorkspaceRouter({ server, workspaceRoot: resolveWorkspaceRoot() }),
  );

  // Setup documentation resources and prompts
  setupDocsAndPrompts(server);

  // Register all KB tools
  registerAllTools(server);

  // Setup transport and connect
  const transport = new StdioServerTransport();
  setupTransportHandlers(server, transport);
  await connectTransport(server, transport);
}
