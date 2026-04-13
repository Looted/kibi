/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const TRANSPORT_MODULE_URL = new URL(
  "../../src/server/transport.js",
  import.meta.url,
).href;

const mockInitiateGracefulShutdown = mock((_exitCode?: number) =>
  Promise.resolve(),
);
const realSession = await import("../../src/server/session.js");
const _realSession = { ...realSession };

async function restoreRealModules() {
  await mock.module("../../src/server/session.js", () => _realSession);
}

async function importTransportModule(tag: string) {
  await mock.module("../../src/server/session.js", () => ({
    initiateGracefulShutdown: mockInitiateGracefulShutdown,
  }));
  return import(`${TRANSPORT_MODULE_URL}?case=${tag}-${Math.random()}`);
}

function createMockTransport(): {
  transport: StdioServerTransport;
  sendMock: ReturnType<typeof mock>;
} {
  const sendMock = mock(() => Promise.resolve());
  const transport = {
    send: sendMock,
    onerror: undefined as ((error: Error) => void) | undefined,
    onclose: undefined as (() => void) | undefined,
  } as unknown as StdioServerTransport;
  return { transport, sendMock };
}

function createMockServer(): McpServer {
  return {
    connect: mock(() => Promise.resolve()),
  } as unknown as McpServer;
}

function requireOnError(
  transport: StdioServerTransport,
): (error: Error) => void {
  const onerror = transport.onerror;
  if (!onerror) {
    throw new Error("Expected transport.onerror to be defined");
  }
  return onerror;
}

function requireOnClose(transport: StdioServerTransport): () => void {
  const onclose = transport.onclose;
  if (!onclose) {
    throw new Error("Expected transport.onclose to be defined");
  }
  return onclose;
}

function requireSigtermHandler(handler: (() => void) | undefined): () => void {
  if (!handler) {
    throw new Error("Expected SIGTERM handler to be defined");
  }
  return handler;
}

describe("setupTransportHandlers", () => {
  let consoleErrorSpy: ReturnType<typeof mock>;
  let originalConsoleError: typeof console.error;
  let originalProcessOn: typeof process.on;
  let capturedSigtermHandler: (() => void) | undefined;
  let originalDebug: string | undefined;
  let setupTransportHandlers: typeof import(
    "../../src/server/transport.js",
  ).setupTransportHandlers;

  beforeEach(async () => {
    originalConsoleError = console.error;
    consoleErrorSpy = mock((..._args: unknown[]) => {});
    console.error = consoleErrorSpy as typeof console.error;

    // Capture SIGTERM handler by intercepting process.on
    originalProcessOn = process.on;
    capturedSigtermHandler = undefined;
    process.on = ((event: string, handler: (...args: unknown[]) => void) => {
      if (event === "SIGTERM") {
        capturedSigtermHandler = handler as () => void;
      }
      // Don't actually register to avoid side effects on test process
      return process;
    }) as typeof process.on;

    mockInitiateGracefulShutdown.mockClear();
    originalDebug = process.env.KIBI_MCP_DEBUG;

    ({ setupTransportHandlers } = await importTransportModule("transport"));
  });

  afterEach(async () => {
    console.error = originalConsoleError;
    process.on = originalProcessOn;
    process.env = { ...process.env, KIBI_MCP_DEBUG: originalDebug };
    // Restore all module mocks to prevent pollution of other test files
    mock.restore();
    await restoreRealModules();
  });

  test("attaches onerror and onclose handlers to transport", () => {
    const { transport } = createMockTransport();
    const server = createMockServer();

    setupTransportHandlers(server, transport);

    expect(transport.onerror).toBeDefined();
    expect(typeof transport.onerror).toBe("function");
    expect(transport.onclose).toBeDefined();
    expect(typeof transport.onclose).toBe("function");
  });

  test("registers SIGTERM handler on process", () => {
    const { transport } = createMockTransport();
    const server = createMockServer();

    setupTransportHandlers(server, transport);

    expect(capturedSigtermHandler).toBeDefined();
  });

  // --- SyntaxError branch ---

  describe("onerror with SyntaxError", () => {
    test("sends JSON-RPC parse error response (-32700)", () => {
      const { transport, sendMock } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      const error = new SyntaxError("Unexpected token");
      requireOnError(transport)(error);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
      });
    });

    test("does not call initiateGracefulShutdown on success", () => {
      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      requireOnError(transport)(new SyntaxError("bad json"));

      expect(mockInitiateGracefulShutdown).not.toHaveBeenCalled();
    });

    test("calls initiateGracefulShutdown(1) when transport.send rejects", async () => {
      const sendMock = mock(() => Promise.reject(new Error("write failed")));
      const transport = {
        send: sendMock,
        onerror: undefined as ((error: Error) => void) | undefined,
        onclose: undefined as (() => void) | undefined,
      } as unknown as StdioServerTransport;
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      requireOnError(transport)(new SyntaxError("bad"));

      // Allow microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(mockInitiateGracefulShutdown).toHaveBeenCalledWith(1);
    });

    test("logs debug message when KIBI_MCP_DEBUG is set", () => {
      process.env.KIBI_MCP_DEBUG = "1";

      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      requireOnError(transport)(new SyntaxError("unexpected"));

      // debugLog should have called console.error with debug prefix
      expect(consoleErrorSpy).toHaveBeenCalled();
      const calls = consoleErrorSpy.mock.calls as unknown[][];
      const hasDebugLog = calls.some((call) =>
        String(call[0]).includes("[KIBI-MCP] Parse error from stdin:"),
      );
      expect(hasDebugLog).toBe(true);
    });

    test("does not log debug message when KIBI_MCP_DEBUG is unset", () => {
      process.env = { ...process.env, KIBI_MCP_DEBUG: undefined };

      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      consoleErrorSpy.mockClear();
      requireOnError(transport)(new SyntaxError("unexpected"));

      const calls = consoleErrorSpy.mock.calls as unknown[][];
      const hasDebugLog = calls.some((call) =>
        String(call[0]).includes("[KIBI-MCP] Parse error from stdin:"),
      );
      expect(hasDebugLog).toBe(false);
    });
  });

  // --- ZodError branch ---

  describe("onerror with ZodError", () => {
    test("sends JSON-RPC invalid request response (-32600)", () => {
      const { transport, sendMock } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      const error = new Error("Validation failed");
      error.name = "ZodError";
      requireOnError(transport)(error);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request" },
      });
    });

    test("does not call initiateGracefulShutdown on success", () => {
      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      const error = new Error("schema mismatch");
      error.name = "ZodError";
      requireOnError(transport)(error);

      expect(mockInitiateGracefulShutdown).not.toHaveBeenCalled();
    });

    test("calls initiateGracefulShutdown(1) when transport.send rejects", async () => {
      const sendMock = mock(() => Promise.reject(new Error("pipe broken")));
      const transport = {
        send: sendMock,
        onerror: undefined as ((error: Error) => void) | undefined,
        onclose: undefined as (() => void) | undefined,
      } as unknown as StdioServerTransport;
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      const error = new Error("zod validation");
      error.name = "ZodError";
      requireOnError(transport)(error);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(mockInitiateGracefulShutdown).toHaveBeenCalledWith(1);
    });

    test("logs debug message when KIBI_MCP_DEBUG is set", () => {
      process.env.KIBI_MCP_DEBUG = "1";

      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      const error = new Error("invalid schema");
      error.name = "ZodError";
      requireOnError(transport)(error);

      const calls = consoleErrorSpy.mock.calls as unknown[][];
      const hasDebugLog = calls.some((call) =>
        String(call[0]).includes("[KIBI-MCP] Invalid JSON-RPC message:"),
      );
      expect(hasDebugLog).toBe(true);
    });
  });

  // --- Other error branch ---

  describe("onerror with other errors", () => {
    test("calls initiateGracefulShutdown(1)", () => {
      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      requireOnError(transport)(new Error("something broke"));

      expect(mockInitiateGracefulShutdown).toHaveBeenCalledWith(1);
    });

    test("logs error to console.error", () => {
      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      const err = new Error("transport crashed");
      requireOnError(transport)(err);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const calls = consoleErrorSpy.mock.calls as unknown[][];
      expect(String(calls[0]?.[0])).toContain("[KIBI-MCP] Transport error:");
    });

    test("logs debug stack trace when KIBI_MCP_DEBUG is set", () => {
      process.env.KIBI_MCP_DEBUG = "1";

      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      consoleErrorSpy.mockClear();
      requireOnError(transport)(new Error("crash"));

      // Should have both the main error log and the debug stack log
      expect(consoleErrorSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      const calls = consoleErrorSpy.mock.calls as unknown[][];
      const hasStackDebug = calls.some((call) =>
        String(call[0]).includes("[KIBI-MCP] Transport error stack:"),
      );
      expect(hasStackDebug).toBe(true);
    });

    test("does not send any JSON-RPC response for other errors", () => {
      const { transport, sendMock } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      requireOnError(transport)(new Error("unknown"));

      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  // --- onclose handler ---

  describe("onclose handler", () => {
    test("calls initiateGracefulShutdown with exitCode 0", () => {
      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      requireOnClose(transport)();

      expect(mockInitiateGracefulShutdown).toHaveBeenCalledWith(0);
    });

    test("logs debug message when KIBI_MCP_DEBUG is set", () => {
      process.env.KIBI_MCP_DEBUG = "1";

      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      consoleErrorSpy.mockClear();
      requireOnClose(transport)();

      const calls = consoleErrorSpy.mock.calls as unknown[][];
      const hasDebugLog = calls.some((call) =>
        String(call[0]).includes("[KIBI-MCP] Transport closed"),
      );
      expect(hasDebugLog).toBe(true);
    });

    test("does not log debug when KIBI_MCP_DEBUG is unset", () => {
      process.env = { ...process.env, KIBI_MCP_DEBUG: undefined };

      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      consoleErrorSpy.mockClear();
      requireOnClose(transport)();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  // --- SIGTERM handler ---

  describe("SIGTERM handler", () => {
    test("calls initiateGracefulShutdown(0) on SIGTERM", () => {
      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      expect(capturedSigtermHandler).toBeDefined();
      requireSigtermHandler(capturedSigtermHandler)();

      expect(mockInitiateGracefulShutdown).toHaveBeenCalledWith(0);
    });

    test("logs debug message when KIBI_MCP_DEBUG is set on SIGTERM", () => {
      process.env.KIBI_MCP_DEBUG = "1";

      const { transport } = createMockTransport();
      const server = createMockServer();
      setupTransportHandlers(server, transport);

      consoleErrorSpy.mockClear();
      requireSigtermHandler(capturedSigtermHandler)();

      const calls = consoleErrorSpy.mock.calls as unknown[][];
      const hasDebugLog = calls.some((call) =>
        String(call[0]).includes(
          "[KIBI-MCP] Received SIGTERM, initiating graceful shutdown",
        ),
      );
      expect(hasDebugLog).toBe(true);
    });
  });
});

describe("connectTransport", () => {
  let connectTransport: typeof import(
    "../../src/server/transport.js",
  ).connectTransport;

  beforeEach(async () => {
    ({ connectTransport } = await importTransportModule("connect-transport"));
  });

  afterEach(async () => {
    mock.restore();
    await restoreRealModules();
  });

  test("calls server.connect with transport and resolves on success", async () => {
    const connectMock = mock(() => Promise.resolve());
    const server = { connect: connectMock } as unknown as McpServer;
    const transport = {} as StdioServerTransport;

    await connectTransport(server, transport);

    expect(connectMock).toHaveBeenCalledWith(transport);
  });

  test("rejects when server.connect rejects", async () => {
    const connectError = new Error("connection refused");
    const connectMock = mock(() => Promise.reject(connectError));
    const server = { connect: connectMock } as unknown as McpServer;
    const transport = {} as StdioServerTransport;

    expect(connectTransport(server, transport)).rejects.toThrow(
      "connection refused",
    );
  });
});
