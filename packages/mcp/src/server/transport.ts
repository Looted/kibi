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

import process from "node:process";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isMcpDebugEnabled } from "../env.js";
import { initiateGracefulShutdown } from "./session.js";

function debugLog(...args: Parameters<typeof console.error>): void {
  if (isMcpDebugEnabled()) {
    console.error(...args);
  }
}

export function setupTransportHandlers(
  _server: McpServer,
  transport: StdioServerTransport,
): void {
  transport.onerror = (error: Error) => {
    // Stdio transport surfaces JSON parse / schema validation failures via onerror.
    // Those errors should not crash the server: emit a JSON-RPC error (id omitted)
    // and continue reading subsequent messages.
    if (error.name === "SyntaxError") {
      debugLog("[KIBI-MCP] Parse error from stdin:", error.message);
      void transport
        .send({
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error" },
        })
        .catch((sendError) => {
          console.error(
            "[KIBI-MCP] Failed to send parse error response:",
            sendError,
          );
          initiateGracefulShutdown(1);
        });
      return;
    }

    if (error.name === "ZodError") {
      debugLog("[KIBI-MCP] Invalid JSON-RPC message:", error.message);
      void transport
        .send({
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request" },
        })
        .catch((sendError) => {
          console.error(
            "[KIBI-MCP] Failed to send invalid request response:",
            sendError,
          );
          initiateGracefulShutdown(1);
        });
      return;
    }

    console.error(`[KIBI-MCP] Transport error: ${error.message}`, error);
    debugLog("[KIBI-MCP] Transport error stack:", error.stack);
    initiateGracefulShutdown(1);
  };

  transport.onclose = () => {
    debugLog("[KIBI-MCP] Transport closed");
    initiateGracefulShutdown(0);
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      debugLog(`[KIBI-MCP] Received ${signal}, initiating graceful shutdown`);
      void initiateGracefulShutdown(0);
    });
  }
}

// implements REQ-002
// covered_by TEST-mcp-kb-freshness
export async function connectTransport(
  server: McpServer,
  transport: StdioServerTransport,
): Promise<void> {
  await server.connect(transport);
}
