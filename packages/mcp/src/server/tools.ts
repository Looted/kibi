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
import type { z } from "zod";
import {
  executeOperation,
  type RuntimeOperationSpec,
} from "kibi-cli/operations/runtime-types";
import { isMcpDebugEnabled } from "../env.js";
import {
  appendDiagnosticErrorUsage,
  appendDiagnosticSuccessUsage,
} from "./diagnostic-usage.js";
import { jsonSchemaToZod } from "./json-schema-to-zod.js";
import { registerConfiguredTools } from "./tool-registration.js";
import type {
  DefaultRuntimeProlog,
  ToolHandler,
  ToolHandlerArgs,
  ToolsRuntime,
} from "./tool-types.js";
import {
  DEFAULT_TOOLS_RUNTIME,
  _resetSessionModulePromise,
  _setToolsServerDepsForTests,
} from "./tools-runtime.js";

export type { ToolConfig, ToolHandler, ToolsRuntime } from "./tool-types.js";
export { jsonSchemaToZod } from "./json-schema-to-zod.js";
export { _resetSessionModulePromise, _setToolsServerDepsForTests };

const DEFAULT_TOOL_TIMEOUT_MS = 90_000;
const TOOL_TIMEOUT_ENV = "KIBI_MCP_TOOL_TIMEOUT_MS";

// implements REQ-008
function debugLog(...args: Parameters<typeof console.error>): void {
  if (isMcpDebugEnabled()) {
    console.error(...args);
  }
}

// implements REQ-002
function getToolTimeoutMs(): number {
  const raw = process.env[TOOL_TIMEOUT_ENV]?.trim();
  if (!raw) {
    return DEFAULT_TOOL_TIMEOUT_MS;
  }

  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_TOOL_TIMEOUT_MS;
}

// implements REQ-002
function createToolTimeoutError(toolName: string, timeoutMs: number): Error {
  return new Error(`Tool ${toolName} timed out after ${timeoutMs}ms`);
}

// implements REQ-002
async function withToolTimeout<T>(
  toolName: string,
  operation: Promise<T>,
  onTimeout: (error: Error, timeoutMs: number) => Promise<void>,
): Promise<T> {
  const timeoutMs = getToolTimeoutMs();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          const error = createToolTimeoutError(toolName, timeoutMs);
          reject(error);
          void onTimeout(error, timeoutMs);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

// implements REQ-002
export function addTool<TProlog>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: object,
  handler: ToolHandler,
  // INTENTIONAL: DEFAULT_TOOLS_RUNTIME is typed as ToolsRuntime<PrologProcess>; the
  // generic TProlog parameter exists so tests can inject a mock type. The cast is safe
  // because the runtime object satisfies the full ToolsRuntime contract at runtime.
  runtime: ToolsRuntime<TProlog> = DEFAULT_TOOLS_RUNTIME as unknown as ToolsRuntime<TProlog>,
  spec?: RuntimeOperationSpec<Record<string, unknown>, unknown>,
): void {
  const wrappedHandler: ToolHandler = async (args) => {
    const startedAt = new Date();
    const diagnosticModeEnabled = runtime.diagnosticModeEnabled();
    const { businessArgs, telemetry } = diagnosticModeEnabled
      ? runtime.extractToolCallPayload(args)
      : { businessArgs: args, telemetry: null };

    try {
      // Validate that args is a valid object
      if (typeof args !== "object" || args === null) {
        throw new Error(
          `Invalid arguments for tool ${name}: expected object, got ${typeof args}`,
        );
      }

      // Check if shutting down before processing
      if (await runtime.isShuttingDown()) {
        throw new Error(`Tool ${name} rejected: server is shutting down`);
      }

      // Extract or generate requestId from args
      const requestIdArg = (businessArgs as ToolHandlerArgs)._requestId;
      const requestId =
        typeof requestIdArg === "string"
          ? requestIdArg
          : `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      // Log tool call for debugging (to stderr to avoid breaking stdio protocol)
      if (isMcpDebugEnabled()) {
        console.error(
          `[KIBI-MCP] Tool called: ${name} (requestId: ${requestId}) with args:`,
          JSON.stringify(businessArgs),
        );
      }

      // Track the handler promise in inFlightRequests Map
      const trackedRequests = await runtime.inFlightRequests();
      const controller = new AbortController();
      const operationSpec: RuntimeOperationSpec<Record<string, unknown>, unknown> =
        spec ?? {
          name,
          effects: ["local-read"],
          requiresProlog: false,
          execute: async (input, _context) => handler(input),
        };
      const handlerPromise = executeOperation(
        runtime.operationRuntime,
        operationSpec,
        businessArgs,
        { signal: controller.signal },
      );
      trackedRequests.set(requestId, handlerPromise);
      let resetAttempted = false;
      let resetSucceeded = false;
      let resetError: string | null = null;

      try {
        // Execute handler
        const result = await withToolTimeout(name, handlerPromise, async (error) => {
          resetAttempted = true;
          controller.abort(error);
          try {
            await runtime.resetProlog(`tool timeout: ${name}`);
            resetSucceeded = true;
          } catch (error) {
            resetError = error instanceof Error ? error.message : String(error);
          }
        });

        // Log usage in diagnostic mode
        if (diagnosticModeEnabled) {
          await appendDiagnosticSuccessUsage({
            runtime,
            toolName: name,
            requestId,
            args,
            businessArgs,
            telemetry,
            startedAt,
            result,
          });
        }

        return result;
      } catch (error) {
        // Log error in diagnostic mode
        if (diagnosticModeEnabled) {
          await appendDiagnosticErrorUsage({
            runtime,
            toolName: name,
            requestId,
            args,
            businessArgs,
            telemetry,
            startedAt,
            error,
            resetState: { resetAttempted, resetSucceeded, resetError },
          });
        }
        throw error;
      } finally {
        // Always clean up from Map when done (success or failure)
        trackedRequests.delete(requestId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[KIBI-MCP] Error in tool ${name}:`, err.message);
      if (err.stack) {
        debugLog(`[KIBI-MCP] Tool ${name} stack:`, err.stack);
      }
      throw new Error(`Tool ${name} failed: ${err.message}`, { cause: err });
    }
  };

  (
    server as McpServer & {
      registerTool: (
        n: string,
        c: { description: string; inputSchema: z.ZodTypeAny },
        h: ToolHandler,
      ) => void;
    }
  ).registerTool(
    name,
    { description, inputSchema: jsonSchemaToZod(inputSchema) },
    wrappedHandler,
  );
}

// implements REQ-002, REQ-013
export function registerAllTools<TProlog>(
  server: McpServer,
  // INTENTIONAL: same generic bridge cast as addTool — see comment there.
  runtime: ToolsRuntime<TProlog> = DEFAULT_TOOLS_RUNTIME as unknown as ToolsRuntime<TProlog>,
): void {
  registerConfiguredTools(server, runtime, addTool);
}
