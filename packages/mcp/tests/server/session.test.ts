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

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import process from "node:process";

const realFs = await import("node:fs");
const _realFs = { ...realFs, default: realFs.default };

const realModule = await import("node:module");
const _realModule = { ...realModule, default: realModule.default };

const realProlog = await import("kibi-cli/prolog");
const _realProlog = { ...realProlog };

const realBranchResolver = await import("kibi-cli/public/branch-resolver");
const _realBranchResolver = { ...realBranchResolver };

const realWorkspace = await import("../../src/workspace.js");
const _realWorkspace = { ...realWorkspace };

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

async function restoreRealModules() {
  await mock.module("node:fs", () => _realFs);
  await mock.module("node:module", () => _realModule);
  await mock.module("kibi-cli/prolog", () => _realProlog);
  await mock.module(
    "kibi-cli/public/branch-resolver",
    () => _realBranchResolver,
  );
  await mock.module("../workspace.js", () => _realWorkspace);
}

function resetMocks() {
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
    // Restore all module mocks to prevent pollution of other test files
    mock.restore();
    await restoreRealModules();
  });

  afterAll(async () => {
    await restoreRealModules();
  });

  // ==========================================================================
  // HELPER: Import fresh session module with mocks
  // ==========================================================================

  async function importSession() {
    await mock.module("node:fs", () => ({
      default: {
        existsSync: mockExistsSync,
        mkdirSync: mockMkdirSync,
        mkdtempSync: (prefix: string) => `${prefix}mock-temp-dir`,
        rmSync: () => {},
        readFileSync: () => "",
        writeFileSync: () => {},
      },
      existsSync: mockExistsSync,
      mkdirSync: mockMkdirSync,
      mkdtempSync: (prefix: string) => `${prefix}mock-temp-dir`,
      rmSync: () => {},
      readFileSync: () => "",
      writeFileSync: () => {},
    }));

    await mock.module("node:module", () => ({
      default: { createRequire: mockCreateRequire },
      createRequire: mockCreateRequire,
    }));

    await mock.module("kibi-cli/prolog", () => ({
      PrologProcess: function (this: Record<string, unknown>) {
        Object.assign(this, mockPrologProcessInstance);
        return this;
      },
    }));

    await mock.module("kibi-cli/public/branch-resolver", () => ({
      copyCleanSnapshot: mockCopyCleanSnapshot,
      getBranchDiagnostic: mockGetBranchDiagnostic,
      isValidBranchName: mockIsValidBranchName,
      resolveActiveBranch: mockResolveActiveBranch,
    }));

    await mock.module("../workspace.js", () => ({
      resolveKbPath: mockResolveKbPath,
      resolveWorkspaceRoot: mockResolveWorkspaceRoot,
    }));

    return import("../../src/server/session.js");
  }

  // ==========================================================================
  // MODULE EXPORTS TESTS
  // ==========================================================================

  describe("module exports", () => {
    test("should export prologProcess as mutable variable", async () => {
      const session = await importSession();
      expect(session.prologProcess).toBeDefined();
      expect(typeof session.prologProcess).toBe("object");
    });

    test("should export activeBranchName as mutable variable", async () => {
      const session = await importSession();
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
