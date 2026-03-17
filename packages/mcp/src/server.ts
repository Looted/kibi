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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadDefaultEnvFile } from "./env.js";
import { setupDocsAndPrompts } from "./server/docs.js";
import { registerAllTools } from "./server/tools.js";
import {
  connectTransport,
  setupTransportHandlers,
} from "./server/transport.js";

export async function startServer(): Promise<void> {
  // Load environment configuration
  loadDefaultEnvFile();

  // Create MCP server
  const server = new McpServer({ name: "kibi-mcp", version: "0.2.1" });

  // Setup documentation resources and prompts
  setupDocsAndPrompts(server);

  // Register all KB tools
  registerAllTools(server);

  // Setup transport and connect
  const transport = new StdioServerTransport();
  setupTransportHandlers(server, transport);
  await connectTransport(server, transport);
}
