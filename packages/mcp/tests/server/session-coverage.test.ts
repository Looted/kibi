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

type BranchResult = { branch: string } | { error: string };
type MockRequire = ((path: string) => unknown) & {
  resolve(path: string): string;
};

const SESSION_MODULE_URL = new URL(
  "../../src/server/session.js",
  import.meta.url,
).href;

const defaults = {
  existsSync: (_path: string) => false,
  mkdirSync: (_path: string, _options?: { recursive?: boolean }) => {},
  copyCleanSnapshot: (_src: string, _dest: string) => {},
  getBranchDiagnostic: (_cwd?: string, error?: string) =>
    `branch diagnostic: ${error ?? "unknown error"}`,
  isValidBranchName: (_branch: string) => true,
  resolveActiveBranch: (_workspaceRoot: string): BranchResult => ({
    branch: "develop",
  }),
  resolveKbPath: (_workspaceRoot: string, branch: string) =>
    `/mock/workspace/.kb/branches/${branch}`,
  resolveWorkspaceRoot: (_startDir?: string) => "/mock/workspace",
  createRequire: (): MockRequire => {
    const req = ((_path: string) => {
      return { version: "1.0.0" };
    }) as MockRequire;

    Object.assign(req, {
      resolve(_path: string) {
        return "/mock/node_modules/kibi-cli/prolog.js";
      },
    });

    return req;
  },
  prologQuery: async (_command: string) => ({ success: true }),
  prologTerminate: async () => {},
  prologIsRunning: () => true,
  prologGetPid: () => 12345,
  prologStart: async () => {},
};

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

const originalKibiBranch = process.env.KIBI_BRANCH;
const originalKibiMcpDebug = process.env.KIBI_MCP_DEBUG;

function restoreEnvVar(
  key: "KIBI_BRANCH" | "KIBI_MCP_DEBUG",
  value: string | undefined,
): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
    return;
  }

  process.env[key] = value;
}

function setEnvVar(
  key: "KIBI_BRANCH" | "KIBI_MCP_DEBUG",
  value: string | undefined,
): void {
  restoreEnvVar(key, value);
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createMockRequire(options?: {
  resolveError?: string;
  packageValue?: unknown;
  packageError?: string;
}): MockRequire {
  const req = ((_path: string) => {
    if (options?.packageError) {
      throw new Error(options.packageError);
    }

    return options?.packageValue ?? { version: "1.0.0" };
  }) as MockRequire;

  Object.assign(req, {
    resolve(_path: string) {
      if (options?.resolveError) {
        throw new Error(options.resolveError);
      }

      return "/mock/node_modules/kibi-cli/prolog.js";
    },
  });

  return req;
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

async function importSessionModule(tag: string) {
  const session = await import(
    `${SESSION_MODULE_URL}?case=${tag}-${Math.random()}`
  );
  session._resetSessionDepsForTests();
  session._setSessionDepsForTests({
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
  });
  return session;
}

function includesLog(
  calls: Array<readonly unknown[]>,
  expectedSubstring: string,
): boolean {
  return calls.some((call) =>
    call.some((arg) => String(arg).includes(expectedSubstring)),
  );
}

describe.serial("session uncovered branch coverage", () => {
  beforeEach(() => {
    resetMocks();
    setEnvVar("KIBI_BRANCH", undefined);
    setEnvVar("KIBI_MCP_DEBUG", undefined);
  });

  afterEach(async () => {
    restoreEnvVar("KIBI_BRANCH", originalKibiBranch);
    restoreEnvVar("KIBI_MCP_DEBUG", originalKibiMcpDebug);
  });

  test("resetSessionStateForTests clears an active shutdown timeout", async () => {
    const session = await importSessionModule("reset-shutdown-timeout");
    session.resetSessionStateForTests();
    const deferred = createDeferred<void>();
    const originalExit = process.exit;
    const exitMock = mock(
      (_code?: number | string | null | undefined) => undefined,
    );

    process.exit = exitMock as unknown as typeof process.exit;

    try {
      session.inFlightRequests.set("pending", deferred.promise);

      const shutdownPromise = session.initiateGracefulShutdown(0);
      await Promise.resolve();

      session.resetSessionStateForTests();
      expect(session.inFlightRequests.size).toBe(0);

      deferred.resolve();
      await shutdownPromise;

      expect(exitMock).toHaveBeenCalledWith(0);
    } finally {
      process.exit = originalExit;
    }
  });

  test("logs errors when Prolog termination fails during shutdown", async () => {
    setEnvVar("KIBI_BRANCH", "terminate-error-branch");

    const session = await importSessionModule("terminate-error");
    session.resetSessionStateForTests();
    const terminateError = new Error("terminate failed");
    const originalExit = process.exit;
    const originalConsoleError = console.error;
    const exitMock = mock(
      (_code?: number | string | null | undefined) => undefined,
    );
    const consoleErrorMock = mock((_message?: unknown, _error?: unknown) => {});

    process.exit = exitMock as unknown as typeof process.exit;
    console.error = consoleErrorMock as typeof console.error;

    try {
      await session.ensureProlog();
      mockPrologProcessInstance.terminate.mockImplementation(() =>
        Promise.reject(terminateError),
      );

      await session.initiateGracefulShutdown(5);

      expect(consoleErrorMock).toHaveBeenCalledWith(
        "[KIBI-MCP] Error terminating Prolog:",
        terminateError,
      );
      expect(exitMock).toHaveBeenCalledWith(5);
    } finally {
      process.exit = originalExit;
      console.error = originalConsoleError;
    }
  });

  test("surfaces branch resolution diagnostics when git branch lookup fails", async () => {
    mockResolveActiveBranch.mockImplementation(
      (): BranchResult => ({ error: "detached HEAD" }),
    );
    mockGetBranchDiagnostic.mockImplementation(
      (_cwd?: string, error?: string) => `diagnostic for ${error}`,
    );

    const session = await importSessionModule("branch-resolution-error");
    session.resetSessionStateForTests();
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((_message?: unknown) => {});
    console.error = consoleErrorMock as typeof console.error;

    try {
      await expect(session.ensureProlog()).rejects.toThrow(
        "Failed to resolve active branch: detached HEAD",
      );

      expect(consoleErrorMock).toHaveBeenCalledWith(
        "[KIBI-MCP] diagnostic for detached HEAD",
      );
      expect(mockPrologProcessInstance.start).not.toHaveBeenCalled();
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("fails branch switching when kb_save fails before detach", async () => {
    setEnvVar("KIBI_BRANCH", "feature-save-a");

    const session = await importSessionModule("branch-save-failure");
    session.resetSessionStateForTests();
    await session.ensureProlog();

    mockPrologProcessInstance.query.mockClear();
    mockPrologProcessInstance.query.mockImplementation(async (command) => {
      if (command === "kb_save") {
        return { success: false, error: "save failed" };
      }

      return { success: true };
    });

    setEnvVar("KIBI_BRANCH", "feature-save-b");

    await expect(session.ensureProlog()).rejects.toThrow(
      "Failed to save old KB before detach: save failed",
    );
    expect(mockPrologProcessInstance.query).toHaveBeenCalledTimes(1);
    expect(mockPrologProcessInstance.query).toHaveBeenCalledWith("kb_save");
  });

  test("logs a detach warning in debug mode and still attaches the new branch", async () => {
    setEnvVar("KIBI_BRANCH", "feature-detach-a");
    setEnvVar("KIBI_MCP_DEBUG", "1");

    const session = await importSessionModule("detach-warning");
    session.resetSessionStateForTests();
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((..._args: unknown[]) => {});
    console.error = consoleErrorMock as typeof console.error;

    try {
      await session.ensureProlog();

      mockPrologProcessInstance.query.mockClear();
      consoleErrorMock.mockClear();
      mockPrologProcessInstance.query.mockImplementation(async (command) => {
        if (command === "kb_save") {
          return { success: true };
        }

        if (command === "kb_detach") {
          return { success: false, error: "detach failed" };
        }

        if (command.startsWith("kb_attach(")) {
          return { success: true };
        }

        return { success: true };
      });

      setEnvVar("KIBI_BRANCH", "feature-detach-b");

      const result = await session.ensureProlog();

      expect(result).toBeDefined();
      expect(includesLog(consoleErrorMock.mock.calls, "detach failed")).toBe(
        true,
      );
      expect(mockPrologProcessInstance.query).toHaveBeenCalledWith(
        expect.stringContaining("feature-detach-b"),
      );
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("fails branch switching when attaching the new branch KB fails", async () => {
    setEnvVar("KIBI_BRANCH", "feature-attach-a");

    const session = await importSessionModule("branch-attach-failure");
    session.resetSessionStateForTests();
    await session.ensureProlog();

    mockPrologProcessInstance.query.mockClear();
    mockPrologProcessInstance.query.mockImplementation(async (command) => {
      if (command === "kb_save" || command === "kb_detach") {
        return { success: true };
      }

      if (command.startsWith("kb_attach(")) {
        return { success: false, error: "attach failed" };
      }

      return { success: true };
    });

    setEnvVar("KIBI_BRANCH", "feature-attach-b");

    await expect(session.ensureProlog()).rejects.toThrow(
      "Failed to attach to new branch KB: attach failed",
    );
  });

  test("logs require.resolve failures during debug initialization", async () => {
    setEnvVar("KIBI_BRANCH", "debug-resolve-branch");
    setEnvVar("KIBI_MCP_DEBUG", "1");
    mockCreateRequire.mockImplementation(() =>
      createMockRequire({ resolveError: "resolve blocked" }),
    );

    const session = await importSessionModule("debug-require-resolve-failure");
    session.resetSessionStateForTests();
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((..._args: unknown[]) => {});
    console.error = consoleErrorMock as typeof console.error;

    try {
      await session.ensureProlog();

      expect(
        includesLog(
          consoleErrorMock.mock.calls,
          "require.resolve('kibi-cli/prolog') failed:",
        ),
      ).toBe(true);
      expect(includesLog(consoleErrorMock.mock.calls, "resolve blocked")).toBe(
        true,
      );
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("logs when kibi-cli package.json has no version in debug mode", async () => {
    setEnvVar("KIBI_BRANCH", "debug-no-version-branch");
    setEnvVar("KIBI_MCP_DEBUG", "1");
    mockCreateRequire.mockImplementation(() =>
      createMockRequire({ packageValue: { name: "kibi-cli" } }),
    );

    const session = await importSessionModule("debug-no-version");
    session.resetSessionStateForTests();
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((..._args: unknown[]) => {});
    console.error = consoleErrorMock as typeof console.error;

    try {
      await session.ensureProlog();

      expect(
        includesLog(
          consoleErrorMock.mock.calls,
          "kibi-cli package.json read but no version field",
        ),
      ).toBe(true);
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("logs package.json read failures in debug mode", async () => {
    setEnvVar("KIBI_BRANCH", "debug-package-error-branch");
    setEnvVar("KIBI_MCP_DEBUG", "1");
    mockCreateRequire.mockImplementation(() =>
      createMockRequire({ packageError: "exports blocked" }),
    );

    const session = await importSessionModule("debug-package-error");
    session.resetSessionStateForTests();
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((..._args: unknown[]) => {});
    console.error = consoleErrorMock as typeof console.error;

    try {
      await session.ensureProlog();

      expect(
        includesLog(
          consoleErrorMock.mock.calls,
          "Failed to read kibi-cli package.json (exports may restrict access):",
        ),
      ).toBe(true);
      expect(includesLog(consoleErrorMock.mock.calls, "exports blocked")).toBe(
        true,
      );
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("logs createRequire failures in debug mode", async () => {
    setEnvVar("KIBI_BRANCH", "debug-create-require-branch");
    setEnvVar("KIBI_MCP_DEBUG", "1");
    mockCreateRequire.mockImplementation(() => {
      throw new Error("createRequire unavailable");
    });

    const session = await importSessionModule("debug-create-require-error");
    session.resetSessionStateForTests();
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((..._args: unknown[]) => {});
    console.error = consoleErrorMock as typeof console.error;

    try {
      await session.ensureProlog();

      expect(
        includesLog(
          consoleErrorMock.mock.calls,
          "Failed to create require() for debug lookup:",
        ),
      ).toBe(true);
      expect(
        includesLog(consoleErrorMock.mock.calls, "createRequire unavailable"),
      ).toBe(true);
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("fails the first initialization when kb_attach does not succeed", async () => {
    setEnvVar("KIBI_BRANCH", "initial-attach-error-branch");
    mockPrologProcessInstance.query.mockImplementation(async (command) => {
      if (command.startsWith("kb_attach(")) {
        return { success: false, error: "attach failed" };
      }

      return { success: true };
    });

    const session = await importSessionModule("initial-attach-failure");
    session.resetSessionStateForTests();

    await expect(session.ensureProlog()).rejects.toThrow(
      "Failed to attach KB: attach failed",
    );
    expect(mockPrologProcessInstance.start).toHaveBeenCalledTimes(1);
  });
});
