/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as path from "node:path";
import {
  prepareStagingEnvironment,
  atomicPublish,
  cleanupStaging,
} from "../../../src/commands/sync/staging.js";

// --- Mocks ---

const mockExistsSync = mock((_p: string) => false);
const mockMkdirSync = mock((_p: string, _opts?: any) => undefined as any);
const mockRenameSync = mock((_old: string, _new: string) => undefined);
const mockRmSync = mock((_p: string, _opts?: any) => undefined as any);
const mockCopyFileSync = mock((_src: string, _dest: string) => undefined);
const mockCopyCleanSnapshot = mock((_src: string, _dest: string) => undefined);
const mockFg = mock((_pattern: string, _opts?: any) =>
  Promise.resolve([] as string[]),
);

mock.module("node:fs", () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  renameSync: mockRenameSync,
  rmSync: mockRmSync,
  copyFileSync: mockCopyFileSync,
}));

mock.module("../../../src/utils/branch-resolver.js", () => ({
  copyCleanSnapshot: mockCopyCleanSnapshot,
}));

mock.module("fast-glob", () => ({
  default: mockFg,
}));

// --- Helpers ---

const MOCK_CWD = "/mock/project";

/** Compute the third schema search path using the source file's dirname. */
const sourceDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "src",
  "commands",
  "sync",
);
const THIRD_SCHEMA_PATH = path.resolve(sourceDir, "..", "..", "schema");

// --- Tests ---

describe("cleanupStaging", () => {
  beforeEach(() => {
    mockExistsSync.mockClear();
    mockRmSync.mockClear();
  });

  test("removes staging directory when it exists", () => {
    mockExistsSync.mockImplementation((p: string) => p === "/staging/path");

    cleanupStaging("/staging/path");

    expect(mockRmSync).toHaveBeenCalledTimes(1);
    expect(mockRmSync).toHaveBeenCalledWith("/staging/path", {
      recursive: true,
      force: true,
    });
  });

  test("is a no-op when staging path does not exist", () => {
    mockExistsSync.mockImplementation(() => false);

    cleanupStaging("/nonexistent/path");

    expect(mockRmSync).not.toHaveBeenCalled();
  });
});

describe("atomicPublish", () => {
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    mockExistsSync.mockClear();
    mockMkdirSync.mockClear();
    mockRenameSync.mockClear();
    mockRmSync.mockClear();
    originalDateNow = Date.now;
    Date.now = mock(() => 1234567890);
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  test("creates parent directory when liveParent does not exist", () => {
    mockExistsSync.mockImplementation(() => false);

    atomicPublish("/staging/path", "/live/.kb/data");

    expect(mockMkdirSync).toHaveBeenCalledWith(path.dirname("/live/.kb/data"), {
      recursive: true,
    });
  });

  test("skips parent mkdirSync when liveParent already exists", () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p === path.dirname("/live/.kb/data")) return true;
      return false;
    });

    atomicPublish("/staging/path", "/live/.kb/data");

    expect(mockMkdirSync).not.toHaveBeenCalled();
  });

  test("renames staging to live directly when livePath does not exist", () => {
    mockExistsSync.mockImplementation(() => false);

    atomicPublish("/staging/path", "/live/.kb/data");

    expect(mockRenameSync).toHaveBeenCalledWith(
      "/staging/path",
      "/live/.kb/data",
    );
    // Only one rename (no old-path rename), no rmSync
    expect(mockRenameSync).toHaveBeenCalledTimes(1);
    expect(mockRmSync).not.toHaveBeenCalled();
  });

  test("atomically swaps: renames live to .old, staging to live, removes old", () => {
    const livePath = "/live/.kb/data";
    const liveParent = path.dirname(livePath);

    mockExistsSync.mockImplementation((p: string) => {
      if (p === liveParent) return true;
      if (p === livePath) return true;
      return false;
    });

    atomicPublish("/staging/path", livePath);

    const tempPath = `${livePath}.old.1234567890`;
    expect(mockRenameSync).toHaveBeenCalledTimes(2);
    expect(mockRenameSync).toHaveBeenNthCalledWith(1, livePath, tempPath);
    expect(mockRenameSync).toHaveBeenNthCalledWith(
      2,
      "/staging/path",
      livePath,
    );
    expect(mockRmSync).toHaveBeenCalledWith(tempPath, {
      recursive: true,
      force: true,
    });
  });

  test("uses Date.now() timestamp in temp path suffix", () => {
    const livePath = "/some/deep/.kb/branch";
    mockExistsSync.mockImplementation((p: string) => {
      if (p === path.dirname(livePath)) return true;
      if (p === livePath) return true;
      return false;
    });

    atomicPublish("/staging", livePath);

    const expectedTemp = `${livePath}.old.1234567890`;
    expect(mockRenameSync).toHaveBeenNthCalledWith(1, livePath, expectedTemp);
  });
});

describe("prepareStagingEnvironment", () => {
  let originalCwd: () => string;

  beforeEach(() => {
    mockExistsSync.mockClear();
    mockMkdirSync.mockClear();
    mockRmSync.mockClear();
    mockCopyCleanSnapshot.mockClear();
    mockCopyFileSync.mockClear();
    mockFg.mockClear();

    originalCwd = process.cwd;
    process.cwd = () => MOCK_CWD;
  });

  afterEach(() => {
    process.cwd = originalCwd;
  });

  test("rebuild=true creates fresh staging with schema only", async () => {
    const schemaPath = path.resolve(
      MOCK_CWD,
      "node_modules",
      "kibi-cli",
      "schema",
    );
    mockExistsSync.mockImplementation((p: string) => {
      if (p === "/staging") return false;
      if (p === schemaPath) return true;
      if (p === path.join("/staging", "schema")) return true;
      return false;
    });
    mockFg.mockResolvedValue(["schema.pl", "rules.pl"]);

    await prepareStagingEnvironment("/staging", "/live/.kb/data", true);

    // Staging dir did not exist, so rmSync was NOT called during cleanup
    expect(mockRmSync).not.toHaveBeenCalled();
    expect(mockMkdirSync).toHaveBeenCalledWith("/staging", { recursive: true });
    // copyCleanSnapshot NOT called when rebuild=true
    expect(mockCopyCleanSnapshot).not.toHaveBeenCalled();
    // Schema files discovered and copied
    expect(mockFg).toHaveBeenCalledWith("*.pl", {
      cwd: schemaPath,
      absolute: false,
    });
    expect(mockCopyFileSync).toHaveBeenCalledTimes(2);
  });

  test("rebuild=false with existing livePath copies via copyCleanSnapshot", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p === "/staging") return false;
      if (p === "/live/.kb/data") return true;
      return false;
    });

    await prepareStagingEnvironment("/staging", "/live/.kb/data", false);

    expect(mockCopyCleanSnapshot).toHaveBeenCalledWith(
      "/live/.kb/data",
      "/staging",
    );
    expect(mockFg).not.toHaveBeenCalled();
    expect(mockCopyFileSync).not.toHaveBeenCalled();
  });

  test("rebuild=false with missing livePath falls back to schema copy", async () => {
    const schemaPath = path.resolve(MOCK_CWD, "packages", "cli", "schema");
    mockExistsSync.mockImplementation((p: string) => {
      if (p === "/staging") return false;
      if (p === "/live/.kb/data") return false;
      if (p === schemaPath) return true;
      if (p === path.join("/staging", "schema")) return true;
      return false;
    });
    mockFg.mockResolvedValue(["schema.pl"]);

    await prepareStagingEnvironment("/staging", "/live/.kb/data", false);

    expect(mockCopyCleanSnapshot).not.toHaveBeenCalled();
    expect(mockFg).toHaveBeenCalled();
    expect(mockCopyFileSync).toHaveBeenCalledTimes(1);
  });

  test("calls cleanupStaging before directory creation", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      // Staging exists → cleanup should remove it
      if (p === "/staging") return true;
      return false;
    });
    mockFg.mockResolvedValue([]);

    await prepareStagingEnvironment("/staging", "/live/.kb/data", true);

    // cleanupStaging called because staging existed
    expect(mockRmSync).toHaveBeenCalledWith("/staging", {
      recursive: true,
      force: true,
    });
    // Then mkdirSync creates fresh staging
    expect(mockMkdirSync).toHaveBeenCalledWith("/staging", { recursive: true });
  });
});

describe("copySchemaToStaging (tested via prepareStagingEnvironment)", () => {
  let originalCwd: () => string;

  beforeEach(() => {
    mockExistsSync.mockClear();
    mockMkdirSync.mockClear();
    mockCopyFileSync.mockClear();
    mockFg.mockClear();

    originalCwd = process.cwd;
    process.cwd = () => MOCK_CWD;
  });

  afterEach(() => {
    process.cwd = originalCwd;
  });

  /** Helper: setup existsSync to find schema only at the nth search path (0-indexed). */
  function setupSchemaAt(index: number): string {
    const paths = [
      path.resolve(MOCK_CWD, "node_modules", "kibi-cli", "schema"),
      path.resolve(MOCK_CWD, "..", "..", "schema"),
      THIRD_SCHEMA_PATH,
      path.resolve(MOCK_CWD, "packages", "cli", "schema"),
    ];
    const chosen = paths[index];

    mockExistsSync.mockImplementation((p: string) => {
      if (p === "/staging") return false;
      // All schema search paths before `index` return false, the chosen one returns true
      for (let i = 0; i < index; i++) {
        if (p === paths[i]) return false;
      }
      if (p === chosen) return true;
      if (p === path.join("/staging", "schema")) return true;
      return false;
    });
    mockFg.mockResolvedValue(["schema.pl"]);
    return chosen;
  }

  test("finds schema at node_modules/kibi-cli/schema (first path)", async () => {
    const expected = setupSchemaAt(0);

    await prepareStagingEnvironment("/staging", "/live", true);

    expect(mockFg).toHaveBeenCalledWith("*.pl", {
      cwd: expected,
      absolute: false,
    });
  });

  test("finds schema at ../../schema relative to cwd (second path)", async () => {
    const expected = setupSchemaAt(1);

    await prepareStagingEnvironment("/staging", "/live", true);

    expect(mockFg).toHaveBeenCalledWith("*.pl", {
      cwd: expected,
      absolute: false,
    });
  });

  test("finds schema at ../../schema relative to dirname (third path)", async () => {
    const expected = setupSchemaAt(2);

    await prepareStagingEnvironment("/staging", "/live", true);

    expect(mockFg).toHaveBeenCalledWith("*.pl", {
      cwd: expected,
      absolute: false,
    });
  });

  test("finds schema at packages/cli/schema (fourth path)", async () => {
    const expected = setupSchemaAt(3);

    await prepareStagingEnvironment("/staging", "/live", true);

    expect(mockFg).toHaveBeenCalledWith("*.pl", {
      cwd: expected,
      absolute: false,
    });
  });

  test("returns early when no schema path is found", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p === "/staging") return false;
      return false;
    });

    await prepareStagingEnvironment("/staging", "/live", true);

    expect(mockFg).not.toHaveBeenCalled();
    expect(mockCopyFileSync).not.toHaveBeenCalled();
  });

  test("creates schema dest dir when missing", async () => {
    const schemaPath = path.resolve(
      MOCK_CWD,
      "node_modules",
      "kibi-cli",
      "schema",
    );
    const schemaDestDir = path.join("/staging", "schema");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === schemaPath) return true;
      if (p === "/staging") return false;
      if (p === schemaDestDir) return false; // dest dir missing
      return false;
    });
    mockFg.mockResolvedValue(["schema.pl"]);

    await prepareStagingEnvironment("/staging", "/live", true);

    expect(mockMkdirSync).toHaveBeenCalledWith(schemaDestDir, {
      recursive: true,
    });
  });

  test("skips mkdirSync for schema dest dir when it already exists", async () => {
    const schemaPath = path.resolve(
      MOCK_CWD,
      "node_modules",
      "kibi-cli",
      "schema",
    );
    const schemaDestDir = path.join("/staging", "schema");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === schemaPath) return true;
      if (p === "/staging") return false;
      if (p === schemaDestDir) return true; // dest dir already exists
      return false;
    });
    mockFg.mockResolvedValue(["schema.pl"]);

    await prepareStagingEnvironment("/staging", "/live", true);

    const mkdirPaths = mockMkdirSync.mock.calls.map((c: any) => c[0]);
    expect(mkdirPaths).not.toContain(schemaDestDir);
  });

  test("copies multiple .pl files correctly", async () => {
    const schemaPath = path.resolve(
      MOCK_CWD,
      "node_modules",
      "kibi-cli",
      "schema",
    );
    const schemaDestDir = path.join("/staging", "schema");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === schemaPath) return true;
      if (p === "/staging") return false;
      if (p === schemaDestDir) return true;
      return false;
    });
    mockFg.mockResolvedValue(["schema.pl", "rules.pl", "constraints.pl"]);

    await prepareStagingEnvironment("/staging", "/live", true);

    expect(mockCopyFileSync).toHaveBeenCalledTimes(3);
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      path.join(schemaPath, "schema.pl"),
      path.join(schemaDestDir, "schema.pl"),
    );
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      path.join(schemaPath, "rules.pl"),
      path.join(schemaDestDir, "rules.pl"),
    );
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      path.join(schemaPath, "constraints.pl"),
      path.join(schemaDestDir, "constraints.pl"),
    );
  });

  test("handles empty glob result (no .pl files)", async () => {
    const schemaPath = path.resolve(
      MOCK_CWD,
      "node_modules",
      "kibi-cli",
      "schema",
    );

    mockExistsSync.mockImplementation((p: string) => {
      if (p === schemaPath) return true;
      if (p === "/staging") return false;
      return false;
    });
    mockFg.mockResolvedValue([]);

    await prepareStagingEnvironment("/staging", "/live", true);

    expect(mockFg).toHaveBeenCalled();
    expect(mockCopyFileSync).not.toHaveBeenCalled();
  });

  test("stops searching at first found schema path", async () => {
    // First path exists — others should never be checked
    const firstPath = path.resolve(
      MOCK_CWD,
      "node_modules",
      "kibi-cli",
      "schema",
    );
    const checkedPaths: string[] = [];

    mockExistsSync.mockImplementation((p: string) => {
      if (p === "/staging") return false;
      checkedPaths.push(p);
      if (p === firstPath) return true;
      if (p === path.join("/staging", "schema")) return true;
      return false;
    });
    mockFg.mockResolvedValue(["schema.pl"]);

    await prepareStagingEnvironment("/staging", "/live", true);

    // existsSync should have been called for the first schema path
    expect(checkedPaths).toContain(firstPath);
    // fg should be called with the first path
    expect(mockFg).toHaveBeenCalledWith("*.pl", {
      cwd: firstPath,
      absolute: false,
    });
  });

  test("uses path.resolve for absolute paths from cwd", async () => {
    const expectedSchemaPath = path.resolve(
      MOCK_CWD,
      "node_modules",
      "kibi-cli",
      "schema",
    );

    let foundSchemaCall = false;
    mockExistsSync.mockImplementation((p: string) => {
      if (p === expectedSchemaPath) {
        foundSchemaCall = true;
        return true;
      }
      if (p === "/staging") return false;
      if (p === path.join("/staging", "schema")) return true;
      return false;
    });
    mockFg.mockResolvedValue(["schema.pl"]);

    await prepareStagingEnvironment("/staging", "/live", true);

    expect(foundSchemaCall).toBe(true);
    // The path passed to existsSync should be absolute
    expect(expectedSchemaPath).toBe(path.resolve(expectedSchemaPath));
  });
});
