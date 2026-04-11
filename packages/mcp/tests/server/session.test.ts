/**
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
import process from "node:process";

// ============================================================================
// MOCKED DEPENDENCIES
// ============================================================================

// Default implementations
const defaults = {
  existsSync: (_path: string) => false,
  mkdirSync: (_path: string, _options?: { recursive?: boolean }) => {},
  copyCleanSnapshot: (_src: string, _dest: string) => {},
  getBranchDiagnostic: (_error?: string) => "mock diagnostic",
  isValidBranchName: (_branch: string) => true,
  resolveActiveBranch: (_workspaceRoot: string) => ({ branch: "develop" }),
  resolveKbPath: (_workspaceRoot: string, _branch: string) => "/mock/kb/path",
  resolveWorkspaceRoot: (_startDir?: string) => "/mock/workspace",
  createRequire: () => {
    function req(_path: string) {
      return { version: "1.0.0" };
    }

    Object.assign(req, {
      resolve(_path: string) {
        return "/path/to/kibi-cli";
      },
    });

    return req;
  },
  prologQuery: async () => ({ success: true }),
  prologTerminate: async () => {},
  prologIsRunning: () => true,
  prologGetPid: () => 12345,
  prologStart: async () => {},
};

// Mock instances
const mockPrologProcessInstance = {
  query: mock(defaults.prologQuery),
  terminate: mock(defaults.prologTerminate),
  isRunning: mock(defaults.prologIsRunning),
  getPid: mock(defaults.prologGetPid),
  start: mock(defaults.prologStart),
};

const mockExistsSync = mock(defaults.existsSync);
const mockMkdirSync = mock(defaults.mkdirSync);
const mockCopyCleanSnapshot = mock(defaults.copyCleanSnapshot);
const mockGetBranchDiagnostic = mock(defaults.getBranchDiagnostic);
const mockIsValidBranchName = mock(defaults.isValidBranchName);
const mockResolveActiveBranch = mock(defaults.resolveActiveBranch);
const mockResolveKbPath = mock(defaults.resolveKbPath);
const mockResolveWorkspaceRoot = mock(defaults.resolveWorkspaceRoot);
const mockCreateRequire = mock(defaults.createRequire);

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function resetMocks() {
  mockExistsSync.mockClear();
  mockMkdirSync.mockClear();
  mockCopyCleanSnapshot.mockClear();
  mockGetBranchDiagnostic.mockClear();
  mockIsValidBranchName.mockClear();
  mockResolveActiveBranch.mockClear();
  mockResolveKbPath.mockClear();
  mockResolveWorkspaceRoot.mockClear();
  mockCreateRequire.mockClear();

  mockPrologProcessInstance.query.mockClear();
  mockPrologProcessInstance.terminate.mockClear();
  mockPrologProcessInstance.isRunning.mockClear();
  mockPrologProcessInstance.getPid.mockClear();
  mockPrologProcessInstance.start.mockClear();

  mockExistsSync.mockImplementation(defaults.existsSync);
  mockMkdirSync.mockImplementation(defaults.mkdirSync);
  mockCopyCleanSnapshot.mockImplementation(defaults.copyCleanSnapshot);
  mockGetBranchDiagnostic.mockImplementation(defaults.getBranchDiagnostic);
  mockIsValidBranchName.mockImplementation(defaults.isValidBranchName);
  mockResolveActiveBranch.mockImplementation(defaults.resolveActiveBranch);
  mockResolveKbPath.mockImplementation(defaults.resolveKbPath);
  mockResolveWorkspaceRoot.mockImplementation(defaults.resolveWorkspaceRoot);
  mockCreateRequire.mockImplementation(defaults.createRequire);

  mockPrologProcessInstance.query.mockImplementation(defaults.prologQuery);
  mockPrologProcessInstance.terminate.mockImplementation(
    defaults.prologTerminate,
  );
  mockPrologProcessInstance.isRunning.mockImplementation(
    defaults.prologIsRunning,
  );
  mockPrologProcessInstance.getPid.mockImplementation(defaults.prologGetPid);
  mockPrologProcessInstance.start.mockImplementation(defaults.prologStart);
}

function createMockSessionDeps() {
  return {
    PrologProcess: function (this: Record<string, unknown>) {
      Object.assign(this, mockPrologProcessInstance);
      return this;
    } as unknown as typeof import("kibi-cli/prolog").PrologProcess,
    copyCleanSnapshot: mockCopyCleanSnapshot,
    createRequire: mockCreateRequire,
    fs: {
      existsSync: mockExistsSync,
      mkdirSync: mockMkdirSync,
    },
    getBranchDiagnostic: mockGetBranchDiagnostic,
    isValidBranchName: mockIsValidBranchName,
    resolveActiveBranch: mockResolveActiveBranch,
    resolveKbPath: mockResolveKbPath,
    resolveWorkspaceRoot: mockResolveWorkspaceRoot,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe.serial("session module", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetMocks();
    // Reset environment
    process.env = {
      ...originalEnv,
      KIBI_BRANCH: undefined,
      KIBI_MCP_DEBUG: undefined,
    };
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    mock.restore();
  });

  // ==========================================================================
  // HELPER: Import fresh session module with mocks
  // ==========================================================================

  async function importSession() {
    const session = await import(
      `../../src/server/session.js?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
    session._resetSessionDepsForTests();
    session._setSessionDepsForTests(createMockSessionDeps());
    return session;
  }

  // ==========================================================================
  // MODULE EXPORTS TESTS
  // ==========================================================================

  describe("module exports", () => {
    test("should export prologProcess as mutable variable", async () => {
      const session = await importSession();
      session.resetSessionStateForTests();
      expect(session.prologProcess).toBeDefined();
      expect(typeof session.prologProcess).toBe("object");
    });

    test("should export activeBranchName as mutable variable", async () => {
      const session = await importSession();
      session.resetSessionStateForTests();
      expect(typeof session.activeBranchName).toBe("string");
    });

    test("should export isShuttingDown as mutable variable", async () => {
      const session = await importSession();
      expect(typeof session.isShuttingDown).toBe("boolean");
    });

    test("should export inFlightRequests as a Map", async () => {
      const session = await importSession();
      expect(session.inFlightRequests).toBeInstanceOf(Map);
    });

    test("should export ensureBranchKbExists function", async () => {
      const session = await importSession();
      expect(typeof session.ensureBranchKbExists).toBe("function");
    });

    test("should export initiateGracefulShutdown function", async () => {
      const session = await importSession();
      expect(typeof session.initiateGracefulShutdown).toBe("function");
    });

    test("should export ensureProlog function", async () => {
      const session = await importSession();
      expect(typeof session.ensureProlog).toBe("function");
    });
  });

  // ==========================================================================
  // ensureBranchKbExists TESTS
  // ==========================================================================

  describe("ensureBranchKbExists", () => {
    test("should throw error when branch name is invalid", async () => {
      const session = await importSession();
      mockIsValidBranchName.mockImplementation(() => false);

      expect(() =>
        session.ensureBranchKbExists("/workspace", "invalid/branch"),
      ).toThrow("Invalid branch name: invalid/branch");
    });

    test("should return early when branch path already exists", async () => {
      const session = await importSession();
      mockExistsSync.mockImplementation(() => true);

      session.ensureBranchKbExists("/workspace", "feature-test");

      expect(mockCopyCleanSnapshot).not.toHaveBeenCalled();
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    test("should create directory when branch path doesn't exist", async () => {
      const session = await importSession();
      mockExistsSync.mockImplementation(() => false);

      session.ensureBranchKbExists("/workspace", "feature");

      expect(mockMkdirSync).toHaveBeenCalled();
    });

    test("should call isValidBranchName with correct branch", async () => {
      const session = await importSession();
      mockExistsSync.mockImplementation(() => false);

      session.ensureBranchKbExists("/workspace", "my-branch");

      expect(mockIsValidBranchName).toHaveBeenCalledWith("my-branch");
    });

    test("should copy from the previous branch when it exists", async () => {
      process.env.KIBI_BRANCH = "feature-prev";
      mockResolveKbPath.mockImplementation(
        (_workspaceRoot, branch) => `/workspace/.kb/branches/${branch}`,
      );
      mockExistsSync.mockImplementation(
        (path) => path === "/workspace/.kb/branches/feature-prev",
      );

      const session = await importSession();
      await session.ensureProlog();

      mockCopyCleanSnapshot.mockClear();
      mockMkdirSync.mockClear();

      session.ensureBranchKbExists("/workspace", "feature-next");

      expect(mockCopyCleanSnapshot).toHaveBeenCalledWith(
        "/workspace/.kb/branches/feature-prev",
        "/workspace/.kb/branches/feature-next",
      );
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("initiateGracefulShutdown", () => {
    function resetShutdownState(
      session: Awaited<ReturnType<typeof importSession>>,
    ): void {
      // Reset module-level state for shutdown tests via the module's own API.
      // ESM `export let` bindings are read-only from outside, so we cannot
      // assign isShuttingDown directly — resetSessionStateForTests does it internally.
      session.resetSessionStateForTests();
    }

    test("should wait for in-flight requests and terminate Prolog before exiting", async () => {
      process.env.KIBI_BRANCH = "shutdown-branch";
      const session = await importSession();
      resetShutdownState(session);
      const originalExit = process.exit;
      const exitMock = mock(
        (_code?: number | string | null | undefined) => undefined,
      );
      process.exit = exitMock as unknown as typeof process.exit;

      try {
        await session.ensureProlog();
        expect(session.prologProcess).toBeDefined();

        const deferred = createDeferred<void>();
        session.inFlightRequests.set("req-1", deferred.promise);

        const shutdownPromise = session.initiateGracefulShutdown(7);
        await Promise.resolve();

        expect(exitMock).not.toHaveBeenCalled();

        deferred.resolve();
        await shutdownPromise;

        expect(mockPrologProcessInstance.terminate).toHaveBeenCalledTimes(1);
        expect(exitMock).toHaveBeenCalledWith(7);
      } finally {
        session.inFlightRequests.clear();
        process.exit = originalExit;
      }
    });

    test("should force exit when in-flight requests exceed the shutdown timeout", async () => {
      process.env.KIBI_BRANCH = "timeout-branch";
      const session = await importSession();
      resetShutdownState(session);
      const originalExit = process.exit;
      const originalSetTimeout = globalThis.setTimeout;
      const originalClearTimeout = globalThis.clearTimeout;
      const originalConsoleError = console.error;
      const exitMock = mock(
        (_code?: number | string | null | undefined) => undefined,
      );
      const clearTimeoutMock = mock(
        (_timer?: number | string | NodeJS.Timeout | undefined) => {},
      );
      const consoleErrorMock = mock(() => {});
      const timerHandle = {} as NodeJS.Timeout;

      process.exit = exitMock as unknown as typeof process.exit;
      console.error = consoleErrorMock as typeof console.error;
      globalThis.setTimeout = ((handler: TimerHandler, _timeout?: number) => {
        queueMicrotask(() => {
          if (typeof handler === "function") {
            handler();
          }
        });
        return timerHandle;
      }) as unknown as typeof setTimeout;
      globalThis.clearTimeout = clearTimeoutMock as typeof clearTimeout;

      try {
        await session.ensureProlog();
        expect(session.prologProcess).toBeDefined();

        session.inFlightRequests.set("req-timeout", new Promise(() => {}));

        await session.initiateGracefulShutdown(9);

        expect(consoleErrorMock).toHaveBeenCalledWith(
          "[KIBI-MCP] Shutdown timeout reached, forcing exit",
        );
        expect(clearTimeoutMock).toHaveBeenCalledWith(timerHandle);
        expect(mockPrologProcessInstance.terminate).toHaveBeenCalledTimes(1);
        expect(exitMock).toHaveBeenCalledWith(9);
      } finally {
        session.inFlightRequests.clear();
        process.exit = originalExit;
        console.error = originalConsoleError;
        globalThis.setTimeout = originalSetTimeout;
        globalThis.clearTimeout = originalClearTimeout;
      }
    });

    test("should return early when shutdown is already in progress", async () => {
      const session = await importSession();
      session.resetSessionStateForTests();

      const originalExit = process.exit;
      const exitMock = mock(
        (_code?: number | string | null | undefined) => undefined,
      );
      process.exit = exitMock as unknown as typeof process.exit;

      try {
        // First call sets isShuttingDown = true and calls process.exit(0) (mocked)
        await session.initiateGracefulShutdown(0);
        expect(exitMock).toHaveBeenCalledWith(0);

        // Clear mock to isolate the second call's behavior
        exitMock.mockClear();

        // Second call should return early — exit should NOT be called again
        await session.initiateGracefulShutdown(2);
        expect(exitMock).not.toHaveBeenCalled();
      } finally {
        process.exit = originalExit;
      }
    });
  });

  // ==========================================================================
  // ensureProlog TESTS (public wrapper)
  // Note: These tests verify the public API without testing internal state
  // ==========================================================================

  describe("ensureProlog", () => {
    test("should return a PrologProcess-like object on success", async () => {
      process.env = { ...process.env, KIBI_BRANCH: undefined };
      mockResolveActiveBranch.mockImplementation(() => ({
        branch: "develop",
      }));
      mockIsValidBranchName.mockImplementation(() => true);

      const session = await importSession();
      const result = await session.ensureProlog();

      expect(result).toBeDefined();
      expect(typeof result.query).toBe("function");
      expect(typeof result.start).toBe("function");
      expect(typeof result.terminate).toBe("function");
    });

    test("should use KIBI_BRANCH env var when set", async () => {
      process.env.KIBI_BRANCH = "feature-env";
      mockIsValidBranchName.mockImplementation(() => true);

      const session = await importSession();
      const result = await session.ensureProlog();

      // Should succeed with KIBI_BRANCH set
      expect(result).toBeDefined();
    });

    test("should throw error when KIBI_BRANCH is invalid", async () => {
      process.env.KIBI_BRANCH = "invalid/branch";
      mockIsValidBranchName.mockImplementation(() => false);

      const session = await importSession();

      await Promise.resolve(expect(session.ensureProlog()).rejects.toThrow());
    });

    test("should call isValidBranchName for KIBI_BRANCH", async () => {
      process.env.KIBI_BRANCH = "feature";
      mockIsValidBranchName.mockImplementation(() => true);

      const session = await importSession();
      await session.ensureProlog();

      expect(mockIsValidBranchName).toHaveBeenCalledWith("feature");
    });

    test("should call resolveActiveBranch when KIBI_BRANCH not set", async () => {
      process.env = { ...process.env, KIBI_BRANCH: undefined };
      mockResolveActiveBranch.mockImplementation(() => ({
        branch: "main",
      }));
      mockIsValidBranchName.mockImplementation(() => true);

      const session = await importSession();
      await session.ensureProlog();

      expect(mockResolveActiveBranch).toHaveBeenCalled();
    });

    test("should handle concurrent calls without error", async () => {
      process.env = { ...process.env, KIBI_BRANCH: undefined };
      mockResolveActiveBranch.mockImplementation(() => ({
        branch: "develop",
      }));
      mockIsValidBranchName.mockImplementation(() => true);

      const session = await importSession();

      // Two concurrent calls should both succeed (tail pattern)
      const [result1, result2] = await Promise.all([
        session.ensureProlog(),
        session.ensureProlog(),
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    test("should initialize with debug logging enabled", async () => {
      process.env.KIBI_BRANCH = "debug-branch";
      process.env.KIBI_MCP_DEBUG = "1";

      const originalConsoleError = console.error;
      const consoleErrorMock = mock(() => {});
      console.error = consoleErrorMock as typeof console.error;

      try {
        const session = await importSession();
        session.resetSessionStateForTests();
        const result = await session.ensureProlog();

        expect(result).toBeDefined();
        expect(mockPrologProcessInstance.start).toHaveBeenCalledTimes(1);
        expect(mockPrologProcessInstance.query).toHaveBeenCalledWith(
          "kb_attach('/mock/kb/path')",
        );
        expect(
          consoleErrorMock.mock.calls.some((call) =>
            call.some((arg) => String(arg).includes("debug-branch")),
          ),
        ).toBe(true);
        expect(consoleErrorMock.mock.calls.length).toBeGreaterThan(0);
      } finally {
        console.error = originalConsoleError;
      }
    });

    test("should switch branches by saving, detaching, and attaching the new KB", async () => {
      process.env.KIBI_BRANCH = "feature-a";
      mockResolveKbPath.mockImplementation(
        (_workspaceRoot, branch) => `/workspace/.kb/branches/${branch}`,
      );
      mockExistsSync.mockImplementation(
        (path) => path === "/workspace/.kb/branches/feature-a",
      );

      const session = await importSession();
      session.resetSessionStateForTests();
      await session.ensureProlog();

      mockPrologProcessInstance.query.mockClear();
      mockCopyCleanSnapshot.mockClear();

      process.env.KIBI_BRANCH = "feature-b";

      const result = await session.ensureProlog();

      expect(result).toBeDefined();
      expect(mockPrologProcessInstance.query).toHaveBeenNthCalledWith(
        1,
        "kb_save",
      );
      expect(mockPrologProcessInstance.query).toHaveBeenNthCalledWith(
        2,
        "kb_detach",
      );
      expect(mockPrologProcessInstance.query).toHaveBeenCalledWith(
        expect.stringContaining("feature-b"),
      );
    });

    test("should serialize initialization so the second call waits for the first", async () => {
      process.env.KIBI_BRANCH = "serial-branch";
      const startDeferred = createDeferred<void>();
      mockPrologProcessInstance.start.mockImplementation(
        () => startDeferred.promise,
      );

      const session = await importSession();
      session.resetSessionStateForTests();
      const firstPromise = session.ensureProlog();
      await Promise.resolve();

      const secondPromise = session.ensureProlog();
      await Promise.resolve();

      expect(mockPrologProcessInstance.start).toHaveBeenCalledTimes(1);
      expect(mockPrologProcessInstance.query).not.toHaveBeenCalled();

      startDeferred.resolve();

      const [firstResult, secondResult] = await Promise.all([
        firstPromise,
        secondPromise,
      ]);

      expect(firstResult).toBe(secondResult);
      expect(mockPrologProcessInstance.start).toHaveBeenCalledTimes(1);
      expect(mockPrologProcessInstance.query).toHaveBeenCalledTimes(1);
    });

    test("should release the ensureProlog tail after a failed initialization", async () => {
      process.env.KIBI_BRANCH = "invalid/branch";
      mockIsValidBranchName.mockImplementation(
        (branch) => branch !== "invalid/branch",
      );

      const session = await importSession();
      session.resetSessionStateForTests();

      const error: Error | null = await session.ensureProlog().then(
        () => null,
        (caught: unknown) => (caught instanceof Error ? caught : null),
      );

      expect(error).toBeInstanceOf(Error);
      if (error === null) {
        throw new Error("Expected ensureProlog to reject with Error");
      }
      expect(error.message).toBe(
        "Invalid branch name from KIBI_BRANCH: 'invalid/branch'",
      );

      process.env.KIBI_BRANCH = "recovered-branch";
      mockIsValidBranchName.mockImplementation(() => true);

      const result = await session.ensureProlog();

      expect(result).toBeDefined();
      expect(mockPrologProcessInstance.start).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // inFlightRequests TESTS
  // Note: The Map is shared module state, tests verify the exported instance
  // ==========================================================================

  describe("inFlightRequests", () => {
    test("should be a Map instance", async () => {
      const session = await importSession();
      expect(session.inFlightRequests).toBeInstanceOf(Map);
    });

    test("should be able to add and remove entries", async () => {
      const session = await importSession();
      const promise = Promise.resolve("test");

      session.inFlightRequests.set("key1", promise);
      expect(session.inFlightRequests.has("key1")).toBe(true);

      session.inFlightRequests.delete("key1");
      expect(session.inFlightRequests.has("key1")).toBe(false);
    });

    test("should maintain entries until deleted", async () => {
      const session = await importSession();
      const promise1 = Promise.resolve("result1");
      const promise2 = Promise.resolve("result2");

      session.inFlightRequests.set("req1", promise1);
      session.inFlightRequests.set("req2", promise2);

      expect(session.inFlightRequests.size).toBeGreaterThanOrEqual(2);
    });
  });
});
