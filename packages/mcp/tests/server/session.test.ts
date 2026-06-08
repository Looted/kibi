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
import * as coveredSession from "../../src/server/session.js";

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
  prologInvalidateCache: () => {},
};

// Mock instances
const mockPrologProcessInstance = {
  query: mock(defaults.prologQuery),
  terminate: mock(defaults.prologTerminate),
  isRunning: mock(defaults.prologIsRunning),
  getPid: mock(defaults.prologGetPid),
  start: mock(defaults.prologStart),
  invalidateCache: mock(defaults.prologInvalidateCache),
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
  mockPrologProcessInstance.invalidateCache.mockClear();

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
  mockPrologProcessInstance.invalidateCache.mockImplementation(
    defaults.prologInvalidateCache,
  );
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

    test("should export resetProlog function", async () => {
      const session = await importSession();
      expect(typeof session.resetProlog).toBe("function");
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

    test("resetProlog terminates the current worker and lets ensureProlog create a fresh one", async () => {
      process.env.KIBI_BRANCH = "reset-branch";
      const instances: (typeof mockPrologProcessInstance)[] = [];
      const session = await importSession();
      session._setSessionDepsForTests({
        PrologProcess: function (this: Record<string, unknown>) {
          const instance = {
            query: mock(defaults.prologQuery),
            terminate: mock(defaults.prologTerminate),
            isRunning: mock(defaults.prologIsRunning),
            getPid: mock(defaults.prologGetPid),
            start: mock(defaults.prologStart),
            invalidateCache: mock(defaults.prologInvalidateCache),
          };
          instances.push(instance);
          Object.assign(this, instance);
          return this;
        } as unknown as typeof import("kibi-cli/prolog").PrologProcess,
      });

      const first = await session.ensureProlog();

      await session.resetProlog("test reason");

      expect(instances).toHaveLength(1);
      expect(instances[0]?.terminate).toHaveBeenCalledTimes(1);
      expect(session.prologProcess).toBeNull();

      const second = await session.ensureProlog();

      expect(instances).toHaveLength(2);
      expect(second).not.toBe(first);
      expect(instances[1]?.start).toHaveBeenCalledTimes(1);
      expect(instances[1]?.query).toHaveBeenCalledWith(
        "kb_attach('/mock/kb/path')",
      );
    });

    describe("same-branch KB freshness", () => {
      const branchName = "fresh-branch";
      const branchPath = `/workspace/.kb/branches/${branchName}`;

      function useSameBranchWorkspace(prologCalls: string[]): void {
        process.env.KIBI_BRANCH = branchName;
        mockResolveWorkspaceRoot.mockImplementation(() => "/workspace");
        mockResolveKbPath.mockImplementation(
          (_workspaceRoot, branch) => `/workspace/.kb/branches/${branch}`,
        );
        mockExistsSync.mockImplementation((path) => path === branchPath);
        mockPrologProcessInstance.invalidateCache.mockImplementation(() => {
          prologCalls.push("invalidateCache");
        });
        mockPrologProcessInstance.query.mockImplementation((async (
          command: string,
        ) => {
          prologCalls.push(command);
          return { success: true, data: [{ fresh: true }] };
        }) as unknown as typeof defaults.prologQuery);
      }

      test("refreshes same-branch KB before query", async () => {
        const prologCalls: string[] = [];
        useSameBranchWorkspace(prologCalls);

        const session = await importSession();
        session.resetSessionStateForTests();
        await session.ensureProlog();
        prologCalls.length = 0;

        // External same-branch KB replacement occurs here: branch identity and path
        // remain stable, but the already-attached Prolog RDF graph is stale.
        const prolog = await session.ensureProlog();
        const result = await prolog.query("kb_query(req, _{})");

        expect(result.success).toBe(true);
        expect(prologCalls.slice(0, 4)).toEqual([
          "invalidateCache",
          "kb_detach",
          `kb_attach('${branchPath}')`,
          "kb_query(req, _{})",
        ]);
      });

      test("refreshes same-branch KB before mutation", async () => {
        const prologCalls: string[] = [];
        useSameBranchWorkspace(prologCalls);

        const session = await importSession();
        session.resetSessionStateForTests();
        await session.ensureProlog();
        prologCalls.length = 0;

        // The mutation must not save stale in-memory RDF over an externally
        // replaced same-branch KB; refresh must happen before the save.
        const prolog = await session.ensureProlog();
        const result = await prolog.query("kb_save");

        expect(result.success).toBe(true);
        expect(prologCalls.slice(0, 4)).toEqual([
          "invalidateCache",
          "kb_detach",
          `kb_attach('${branchPath}')`,
          "kb_save",
        ]);
      });

      test("serializes concurrent refresh and query", async () => {
        const prologCalls: string[] = [];
        useSameBranchWorkspace(prologCalls);

        const session = await importSession();
        session.resetSessionStateForTests();
        await session.ensureProlog();
        prologCalls.length = 0;

        const first = async () => {
          const prolog = await session.ensureProlog();
          return prolog.query("kb_query(req, first)");
        };
        const second = async () => {
          const prolog = await session.ensureProlog();
          return prolog.query("kb_query(req, second)");
        };

        const [firstResult, secondResult] = await Promise.all([
          first(),
          second(),
        ]);

        expect(firstResult.success).toBe(true);
        expect(secondResult.success).toBe(true);
        expect(
          prologCalls.filter((call) => call === "invalidateCache"),
        ).toHaveLength(1);
        expect(prologCalls.slice(0, 5)).toEqual([
          "invalidateCache",
          "kb_detach",
          `kb_attach('${branchPath}')`,
          "kb_query(req, first)",
          "kb_query(req, second)",
        ]);
      });

      test("fails closed when same-branch KB refresh cannot attach", async () => {
        const prologCalls: string[] = [];
        useSameBranchWorkspace(prologCalls);
        let failRefreshAttach = false;
        mockPrologProcessInstance.query.mockImplementation((async (
          command: string,
        ) => {
          prologCalls.push(command);
          if (failRefreshAttach && command.startsWith("kb_attach(")) {
            return { success: false, error: "replacement attach denied" };
          }
          return { success: true, data: [{ stale: command === "stale_query" }] };
        }) as unknown as typeof defaults.prologQuery);

        const session = await importSession();
        session.resetSessionStateForTests();
        await session.ensureProlog();
        prologCalls.length = 0;
        failRefreshAttach = true;

        const caught = await (async () => {
          try {
            const prolog = await session.ensureProlog();
            await prolog.query("stale_query");
            return null;
          } catch (error) {
            return error;
          }
        })();

        expect(caught).toBeInstanceOf(Error);
        expect((caught as Error).name).toBe("KbRefreshError");
        expect((caught as Error).message).toContain("replacement attach denied");
        expect(prologCalls).not.toContain("stale_query");
        expect(prologCalls.slice(0, 3)).toEqual([
          "invalidateCache",
          "kb_detach",
          `kb_attach('${branchPath}')`,
        ]);
      });
    });
  });

  describe("additional session.ts line coverage", () => {
    async function importCoveredSession() {
      const session = coveredSession;
      session._resetSessionDepsForTests();
      session._setSessionDepsForTests(
        createMockSessionDeps() as unknown as Parameters<
          typeof session._setSessionDepsForTests
        >[0],
      );
      session.resetSessionStateForTests();
      return session;
    }

    function containsConsoleArg(
      calls: Array<readonly unknown[]>,
      expected: string,
    ): boolean {
      return calls.some((call) =>
        call.some((arg) => String(arg).includes(expected)),
      );
    }

    test("ensureBranchKbExists creates an empty KB when the previous branch is develop", async () => {
      const session = await importCoveredSession();
      mockResolveKbPath.mockImplementation(
        (_workspaceRoot, branch) => `/workspace/.kb/branches/${branch}`,
      );
      mockExistsSync.mockImplementation(() => false);

      session.ensureBranchKbExists("/workspace", "brand-new");

      expect(mockMkdirSync).toHaveBeenCalledWith(
        "/workspace/.kb/branches/brand-new",
        { recursive: true },
      );
      expect(mockCopyCleanSnapshot).not.toHaveBeenCalled();
    });

    test("ensureBranchKbExists rejects invalid branch names before path resolution", async () => {
      const session = await importCoveredSession();
      mockIsValidBranchName.mockImplementation(() => false);

      expect(() =>
        session.ensureBranchKbExists("/workspace", "bad/name"),
      ).toThrow("Invalid branch name: bad/name");
      expect(mockResolveKbPath).not.toHaveBeenCalled();
    });

    test("ensureBranchKbExists returns without copying or creating when branch KB exists", async () => {
      const session = await importCoveredSession();
      mockResolveKbPath.mockImplementation(
        (_workspaceRoot, branch) => `/workspace/.kb/branches/${branch}`,
      );
      mockExistsSync.mockImplementation(
        (path) => path === "/workspace/.kb/branches/existing-branch",
      );

      session.ensureBranchKbExists("/workspace", "existing-branch");

      expect(mockCopyCleanSnapshot).not.toHaveBeenCalled();
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    test("ensureBranchKbExists copies the previous non-develop branch when available", async () => {
      process.env.KIBI_BRANCH = "previous-copy-branch";
      const session = await importCoveredSession();
      mockResolveKbPath.mockImplementation(
        (_workspaceRoot, branch) => `/workspace/.kb/branches/${branch}`,
      );
      mockExistsSync.mockImplementation(
        (path) => path === "/workspace/.kb/branches/previous-copy-branch",
      );
      await session.ensureProlog();
      mockCopyCleanSnapshot.mockClear();
      mockMkdirSync.mockClear();

      session.ensureBranchKbExists("/workspace", "copied-branch");

      expect(mockCopyCleanSnapshot).toHaveBeenCalledWith(
        "/workspace/.kb/branches/previous-copy-branch",
        "/workspace/.kb/branches/copied-branch",
      );
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    test("initiateGracefulShutdown returns early when already shutting down", async () => {
      const session = await importCoveredSession();
      const originalExit = process.exit;
      const exitMock = mock(
        (_code?: number | string | null | undefined) => undefined,
      );
      process.exit = exitMock as unknown as typeof process.exit;

      try {
        await session.initiateGracefulShutdown(0);
        exitMock.mockClear();

        await session.initiateGracefulShutdown(3);

        expect(exitMock).not.toHaveBeenCalled();
      } finally {
        process.exit = originalExit;
      }
    });

    test("initiateGracefulShutdown waits for in-flight requests and terminates Prolog", async () => {
      process.env.KIBI_BRANCH = "covered-shutdown-branch";
      const session = await importCoveredSession();
      const originalExit = process.exit;
      const exitMock = mock(
        (_code?: number | string | null | undefined) => undefined,
      );
      process.exit = exitMock as unknown as typeof process.exit;

      try {
        await session.ensureProlog();
        const deferred = createDeferred<void>();
        session.inFlightRequests.set("covered-request", deferred.promise);

        const shutdownPromise = session.initiateGracefulShutdown(6);
        await Promise.resolve();
        expect(exitMock).not.toHaveBeenCalled();

        deferred.resolve();
        await shutdownPromise;

        expect(mockPrologProcessInstance.terminate).toHaveBeenCalledTimes(1);
        expect(exitMock).toHaveBeenCalledWith(6);
      } finally {
        process.exit = originalExit;
        session.inFlightRequests.clear();
      }
    });

    test("initiateGracefulShutdown logs timeout and termination failures", async () => {
      process.env.KIBI_BRANCH = "covered-timeout-branch";
      const session = await importCoveredSession();
      const originalExit = process.exit;
      const originalSetTimeout = globalThis.setTimeout;
      const originalClearTimeout = globalThis.clearTimeout;
      const originalConsoleError = console.error;
      const exitMock = mock(
        (_code?: number | string | null | undefined) => undefined,
      );
      const timerHandle = {} as NodeJS.Timeout;
      const clearTimeoutMock = mock(
        (_timer?: number | string | NodeJS.Timeout | undefined) => {},
      );
      const consoleErrorMock = mock(
        (_message?: unknown, _error?: unknown) => {},
      );
      const terminateError = new Error("shutdown terminate failure");

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
        mockPrologProcessInstance.terminate.mockImplementation(() =>
          Promise.reject(terminateError),
        );
        session.inFlightRequests.set("covered-timeout", new Promise(() => {}));

        await session.initiateGracefulShutdown(8);

        expect(consoleErrorMock).toHaveBeenCalledWith(
          "[KIBI-MCP] Shutdown timeout reached, forcing exit",
        );
        expect(consoleErrorMock).toHaveBeenCalledWith(
          "[KIBI-MCP] Error terminating Prolog:",
          terminateError,
        );
        expect(clearTimeoutMock).toHaveBeenCalledWith(timerHandle);
        expect(exitMock).toHaveBeenCalledWith(8);
      } finally {
        process.exit = originalExit;
        console.error = originalConsoleError;
        globalThis.setTimeout = originalSetTimeout;
        globalThis.clearTimeout = originalClearTimeout;
        session.inFlightRequests.clear();
      }
    });

    test("resetProlog logs and clears state when terminating the current worker fails", async () => {
      process.env.KIBI_BRANCH = "reset-error-branch";
      const session = await importCoveredSession();
      const originalConsoleError = console.error;
      const terminateError = new Error("terminate exploded");
      const consoleErrorMock = mock(
        (_message?: unknown, _error?: unknown) => {},
      );

      console.error = consoleErrorMock as typeof console.error;

      try {
        await session.ensureProlog();
        mockPrologProcessInstance.terminate.mockImplementation(() =>
          Promise.reject(terminateError),
        );

        await session.resetProlog("cover terminate failure");

        expect(session.prologProcess).toBeNull();
        expect(consoleErrorMock).toHaveBeenCalledWith(
          "[KIBI-MCP] Error resetting Prolog worker:",
          terminateError,
        );
      } finally {
        console.error = originalConsoleError;
      }
    });

    test("ensureProlog uses KIBI_BRANCH without resolving git branch", async () => {
      process.env.KIBI_BRANCH = "override-only";
      const session = await importCoveredSession();

      await session.ensureProlog();

      expect(mockIsValidBranchName).toHaveBeenCalledWith("override-only");
      expect(mockResolveActiveBranch).not.toHaveBeenCalled();
      expect(session.activeBranchName).toBe("override-only");
    });

    test("ensureProlog reports branch resolution diagnostics when active branch lookup fails", async () => {
      process.env = { ...process.env, KIBI_BRANCH: undefined };
      mockResolveActiveBranch.mockImplementation((() => ({
        error: "detached HEAD",
      })) as unknown as typeof defaults.resolveActiveBranch);
      mockGetBranchDiagnostic.mockImplementation(
        (_cwd?: string, error?: string) => `diagnostic: ${error}`,
      );
      const originalConsoleError = console.error;
      const consoleErrorMock = mock((_message?: unknown) => {});
      console.error = consoleErrorMock as typeof console.error;

      try {
        const session = await importCoveredSession();

        await expect(session.ensureProlog()).rejects.toThrow(
          "Failed to resolve active branch: detached HEAD",
        );
        expect(consoleErrorMock).toHaveBeenCalledWith(
          "[KIBI-MCP] diagnostic: detached HEAD",
        );
        expect(mockPrologProcessInstance.start).not.toHaveBeenCalled();
      } finally {
        console.error = originalConsoleError;
      }
    });

    test("ensureProlog returns the existing worker when the branch has not changed", async () => {
      process.env.KIBI_BRANCH = "stable-branch";
      const session = await importCoveredSession();

      const first = await session.ensureProlog();
      mockPrologProcessInstance.query.mockClear();

      const second = await session.ensureProlog();

      expect(second).toBe(first);
      expect(mockPrologProcessInstance.query).not.toHaveBeenCalled();
    });

    test("ensureProlog fails branch switching when saving the previous branch fails", async () => {
      process.env.KIBI_BRANCH = "save-fail-a";
      const session = await importCoveredSession();
      await session.ensureProlog();
      mockPrologProcessInstance.query.mockClear();
      mockPrologProcessInstance.query.mockImplementation((async (
        command: string,
      ) => {
        if (command === "kb_save") {
          return { success: false, error: "save denied" };
        }
        return { success: true };
      }) as unknown as typeof defaults.prologQuery);

      process.env.KIBI_BRANCH = "save-fail-b";

      await expect(session.ensureProlog()).rejects.toThrow(
        "Failed to save old KB before detach: save denied",
      );
      expect(mockPrologProcessInstance.query).toHaveBeenCalledTimes(1);
      expect(mockPrologProcessInstance.query).toHaveBeenCalledWith("kb_save");
    });

    test("ensureProlog logs detach failures in debug mode and still attaches the new branch", async () => {
      process.env.KIBI_BRANCH = "detach-warning-a";
      process.env.KIBI_MCP_DEBUG = "1";
      const originalConsoleError = console.error;
      const consoleErrorMock = mock((..._args: unknown[]) => {});
      console.error = consoleErrorMock as typeof console.error;

      try {
        const session = await importCoveredSession();
        await session.ensureProlog();
        mockPrologProcessInstance.query.mockClear();
        consoleErrorMock.mockClear();
        mockPrologProcessInstance.query.mockImplementation((async (
          command: string,
        ) => {
          if (command === "kb_detach") {
            return { success: false, error: "detach refused" };
          }
          return { success: true };
        }) as unknown as typeof defaults.prologQuery);

        process.env.KIBI_BRANCH = "detach-warning-b";

        await session.ensureProlog();

        expect(
          containsConsoleArg(consoleErrorMock.mock.calls, "detach refused"),
        ).toBe(true);
        expect(mockPrologProcessInstance.query).toHaveBeenCalledWith(
          "kb_attach('/mock/kb/path')",
        );
        expect(session.activeBranchName).toBe("detach-warning-b");
      } finally {
        console.error = originalConsoleError;
      }
    });

    test("ensureProlog fails branch switching when attaching the new branch fails", async () => {
      process.env.KIBI_BRANCH = "attach-fail-a";
      const session = await importCoveredSession();
      await session.ensureProlog();
      mockPrologProcessInstance.query.mockClear();
      mockPrologProcessInstance.query.mockImplementation((async (
        command: string,
      ) => {
        if (command.startsWith("kb_attach(")) {
          return { success: false, error: "attach denied" };
        }
        return { success: true };
      }) as unknown as typeof defaults.prologQuery);

      process.env.KIBI_BRANCH = "attach-fail-b";

      await expect(session.ensureProlog()).rejects.toThrow(
        "Failed to attach to new branch KB: attach denied",
      );
    });

    test("ensureProlog debug initialization logs createRequire success details", async () => {
      process.env.KIBI_BRANCH = "debug-success-branch";
      process.env.KIBI_MCP_DEBUG = "1";
      const originalConsoleError = console.error;
      const consoleErrorMock = mock((..._args: unknown[]) => {});
      console.error = consoleErrorMock as typeof console.error;

      try {
        const session = await importCoveredSession();

        await session.ensureProlog();

        expect(mockCreateRequire).toHaveBeenCalled();
        expect(
          containsConsoleArg(
            consoleErrorMock.mock.calls,
            "require.resolve('kibi-cli/prolog') -> /path/to/kibi-cli",
          ),
        ).toBe(true);
        expect(
          containsConsoleArg(
            consoleErrorMock.mock.calls,
            "kibi-cli version: 1.0.0",
          ),
        ).toBe(true);
        expect(
          containsConsoleArg(consoleErrorMock.mock.calls, "PID: 12345"),
        ).toBe(true);
      } finally {
        console.error = originalConsoleError;
      }
    });

    test("ensureProlog releases the sequencing tail after a rejected call", async () => {
      process.env.KIBI_BRANCH = "tail-invalid/branch";
      mockIsValidBranchName.mockImplementation(
        (branch) => branch !== "tail-invalid/branch",
      );
      const session = await importCoveredSession();

      await expect(session.ensureProlog()).rejects.toThrow(
        "Invalid branch name from KIBI_BRANCH: 'tail-invalid/branch'",
      );

      process.env.KIBI_BRANCH = "tail-valid-branch";
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
