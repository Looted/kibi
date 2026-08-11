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

import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  type Hash,
  type HashOptions,
  createHash as realCreateHash,
} from "node:crypto";
import type { SyncCache } from "../../../src/commands/sync/cache.js";

// Import the real cache module FIRST to get actual implementations
// This must come before any mock.module calls to capture real functions
import * as cacheModule from "../../../src/commands/sync/cache.js";

const {
  SYNC_CACHE_TTL_MS,
  SYNC_CACHE_VERSION,
  copySyncCache,
  hashFile,
  readSyncCache,
  toCacheKey,
  writeSyncCache,
} = cacheModule;

type SyncCacheDeps = NonNullable<Parameters<typeof readSyncCache>[1]>;

type HashCreateMock = typeof realCreateHash & {
  mockReturnValue(value: Hash): HashCreateMock;
  mockImplementation(
    fn: (algorithm: string, options?: HashOptions) => Hash,
  ): HashCreateMock;
  mockClear(): HashCreateMock;
};

// --- Mocks ---

const mockCreateHash = mock(
  (_algorithm: string, _options?: HashOptions) => makeHashMock("deadbeef").hash,
) as HashCreateMock;

const mockExistsSync = mock((..._args: unknown[]): boolean => false);
const mockMkdirSync = mock((..._args: unknown[]): undefined => undefined);
const mockReadFileSync = mock(
  (..._args: unknown[]): string | Uint8Array => "" as string | Uint8Array,
);
const mockWriteFileSync = mock((..._args: unknown[]): undefined => undefined);

function makeHashMock(digestValue: string): {
  hash: Hash;
  update: ReturnType<typeof mock>;
  digest: ReturnType<typeof mock>;
} {
  const box = { hash: null as unknown as Hash };
  const digest = mock((_encoding: BufferEncoding = "hex") => digestValue);
  const update = mock((..._args: Parameters<Hash["update"]>) => box.hash);
  box.hash = Object.assign(realCreateHash("sha256"), {
    update,
    digest,
  }) as Hash;
  return { hash: box.hash, update, digest };
}

// Restore mocks after each test to prevent pollution
afterAll(() => {
  mock.restore();
});

const cacheDeps = (): SyncCacheDeps => ({
  createHash: mockCreateHash,
  existsSync: mockExistsSync as SyncCacheDeps["existsSync"],
  mkdirSync: mockMkdirSync as SyncCacheDeps["mkdirSync"],
  readFileSync: mockReadFileSync as unknown as SyncCacheDeps["readFileSync"],
  writeFileSync: mockWriteFileSync as SyncCacheDeps["writeFileSync"],
});

// --- Helpers ---

const defaultCache = (): SyncCache => ({
  version: SYNC_CACHE_VERSION,
  hashes: {},
  seenAt: {},
  semanticHashes: {},
  semanticContracts: {},
});

// --- Tests ---

describe("SYNC_CACHE_VERSION", () => {
  test("is 1", () => {
    expect(SYNC_CACHE_VERSION).toBe(1);
  });
});

describe("SYNC_CACHE_TTL_MS", () => {
  test("is 30 days in milliseconds", () => {
    expect(SYNC_CACHE_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  test("equals 2_592_000_000 ms", () => {
    expect(SYNC_CACHE_TTL_MS).toBe(2_592_000_000);
  });
});

describe("SyncCache type", () => {
  test("has version, hashes, and seenAt fields", () => {
    const cache: SyncCache = {
      version: 1,
      hashes: { "foo.ts": "abc123" },
      seenAt: { "foo.ts": "2026-01-01T00:00:00Z" },
      semanticHashes: { "foo.ts": "semantic123" },
      semanticContracts: { "foo.ts": true },
    };
    expect(cache.version).toBe(1);
    expect(cache.hashes["foo.ts"]).toBe("abc123");
    expect(cache.seenAt["foo.ts"]).toBe("2026-01-01T00:00:00Z");
    expect(cache.semanticHashes["foo.ts"]).toBe("semantic123");
    expect(cache.semanticContracts["foo.ts"]).toBe(true);
  });
});

describe("toCacheKey", () => {
  test("normalizes path separators to forward slash", () => {
    // On POSIX, path.sep is '/', so join with '/' directly
    const result = toCacheKey("src/commands/sync/cache.ts");
    expect(result).toBe("src/commands/sync/cache.ts");
    expect(result).not.toContain("\\");
  });

  test("converts absolute path to relative using cwd", () => {
    const cwd = process.cwd();
    const absolutePath = `${cwd}/src/foo.ts`;
    const result = toCacheKey(absolutePath);
    expect(result).toBe("src/foo.ts");
  });

  test("handles empty string", () => {
    const result = toCacheKey("");
    expect(result).toBe("");
  });

  test("normalizes multiple separators", () => {
    // path.relative with segments already using / on posix just returns them
    // The key behavior is splitting by path.sep and joining with /
    const result = toCacheKey("a/b/c");
    expect(result).toBe("a/b/c");
  });

  test("returns relative path as-is when already relative", () => {
    const result = toCacheKey("docs/readme.md");
    expect(result).toBe("docs/readme.md");
  });
});

describe("hashFile", () => {
  test("reads file and returns sha256 hex digest", () => {
    mockReadFileSync.mockReturnValue(Buffer.from("hello world"));

    const {
      hash,
      update: mockUpdate,
      digest: mockDigest,
    } = makeHashMock("hashed_hex_value");
    mockCreateHash.mockReturnValue(hash);

    const result = hashFile("/some/file.ts", cacheDeps());

    expect(mockCreateHash).toHaveBeenCalledWith("sha256");
    expect(mockUpdate).toHaveBeenCalledWith(Buffer.from("hello world"));
    expect(mockDigest).toHaveBeenCalledWith("hex");
    expect(result).toBe("hashed_hex_value");
  });

  test("returns consistent hash for same content", () => {
    const content = Buffer.from("consistent content");
    mockReadFileSync.mockReturnValue(content);

    // Deterministic mock: same content always produces the same digest
    mockCreateHash.mockImplementation(() => {
      return makeHashMock(`hash_${content.toString()}`).hash;
    });

    const result1 = hashFile("/file1.ts", cacheDeps());
    const result2 = hashFile("/file2.ts", cacheDeps());

    // Same content must produce the same hash
    expect(result1).toBe(result2);
  });

  test("passes file path to readFileSync", () => {
    mockReadFileSync.mockReturnValue(Buffer.from("x"));
    mockCreateHash.mockReturnValue(makeHashMock("abc").hash);

    hashFile("/path/to/my/file.ts", cacheDeps());
    expect(mockReadFileSync).toHaveBeenCalledWith("/path/to/my/file.ts");
  });
});

describe("readSyncCache", () => {
  beforeEach(() => {
    mockExistsSync.mockClear();
    mockReadFileSync.mockClear();
    mockCreateHash.mockClear();
  });

  test("returns default empty cache when file does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    const result = readSyncCache("/no/such/cache.json", cacheDeps());

    expect(result).toEqual(defaultCache());
    expect(mockExistsSync).toHaveBeenCalledWith("/no/such/cache.json");
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  test("returns parsed cache when file exists with valid version", () => {
    const cached: SyncCache = {
      version: 1,
      hashes: { "foo.ts": "abc123" },
      seenAt: { "foo.ts": "2026-01-01T00:00:00Z" },
      semanticHashes: { "foo.ts": "semantic123" },
      semanticContracts: { "foo.ts": true },
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(cached));

    const result = readSyncCache("/cache/path.json", cacheDeps());

    expect(result).toEqual(cached);
    expect(result.version).toBe(1);
    expect(result.hashes).toEqual({ "foo.ts": "abc123" });
    expect(result.seenAt).toEqual({ "foo.ts": "2026-01-01T00:00:00Z" });
  });

  test("returns default cache when file has invalid version", () => {
    const cached = {
      version: 999,
      hashes: { "foo.ts": "abc123" },
      seenAt: { "foo.ts": "2026-01-01T00:00:00Z" },
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(cached));

    const result = readSyncCache("/cache/path.json", cacheDeps());

    expect(result).toEqual(defaultCache());
  });

  test("returns default cache when file has version 0", () => {
    const cached = { version: 0, hashes: {}, seenAt: {} };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(cached));

    const result = readSyncCache("/cache/path.json", cacheDeps());

    expect(result).toEqual(defaultCache());
  });

  test("returns default cache when JSON parse fails (corrupted file)", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("not valid json {{{");

    const result = readSyncCache("/cache/path.json", cacheDeps());

    expect(result).toEqual(defaultCache());
  });

  test("returns default cache when file is empty", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("");

    const result = readSyncCache("/cache/path.json", cacheDeps());

    expect(result).toEqual(defaultCache());
  });

  test("defaults hashes to empty object when missing", () => {
    const cached = { version: 1 };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(cached));

    const result = readSyncCache("/cache/path.json", cacheDeps());

    expect(result.version).toBe(1);
    expect(result.hashes).toEqual({});
    expect(result.seenAt).toEqual({});
  });

  test("defaults seenAt to empty object when missing", () => {
    const cached = { version: 1, hashes: { "a.ts": "hash1" } };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(cached));

    const result = readSyncCache("/cache/path.json", cacheDeps());

    expect(result.hashes).toEqual({ "a.ts": "hash1" });
    expect(result.seenAt).toEqual({});
  });

  test("defaults hashes and seenAt to empty when both missing", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ version: 1 }));

    const result = readSyncCache("/cache/path.json", cacheDeps());
    expect(result).toEqual({
      version: 1,
      hashes: {},
      seenAt: {},
      semanticHashes: {},
      semanticContracts: {},
    });
  });

  test("reads file with utf8 encoding", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ version: 1, hashes: {}, seenAt: {} }),
    );

    readSyncCache("/cache.json", cacheDeps());

    expect(mockReadFileSync).toHaveBeenCalledWith("/cache.json", "utf8");
  });
});

describe("writeSyncCache", () => {
  beforeEach(() => {
    mockExistsSync.mockClear();
    mockMkdirSync.mockClear();
    mockWriteFileSync.mockClear();
  });

  test("creates directory when it does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    writeSyncCache("/deep/nested/dir/cache.json", defaultCache(), cacheDeps());

    expect(mockMkdirSync).toHaveBeenCalledWith("/deep/nested/dir", {
      recursive: true,
    });
  });

  test("skips mkdir when directory already exists", () => {
    mockExistsSync.mockReturnValue(true);

    writeSyncCache("/existing/dir/cache.json", defaultCache(), cacheDeps());

    expect(mockMkdirSync).not.toHaveBeenCalled();
  });

  test("writes cache as JSON with 2-space indentation and trailing newline", () => {
    mockExistsSync.mockReturnValue(true);
    const cache: SyncCache = {
      version: 1,
      hashes: { "foo.ts": "abc" },
      seenAt: { "foo.ts": "2026-01-01" },
      semanticHashes: { "foo.ts": "semantic" },
      semanticContracts: { "foo.ts": true },
    };

    writeSyncCache("/dir/cache.json", cache, cacheDeps());

    const expectedContent = `${JSON.stringify(cache, null, 2)}\n`;
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/dir/cache.json",
      expectedContent,
      "utf8",
    );
  });

  test("overwrites existing file", () => {
    mockExistsSync.mockReturnValue(true);

    const cache1: SyncCache = {
      version: 1,
      hashes: { "a.ts": "h1" },
      seenAt: {},
      semanticHashes: {},
      semanticContracts: {},
    };
    const cache2: SyncCache = {
      version: 1,
      hashes: { "b.ts": "h2" },
      seenAt: {},
      semanticHashes: {},
      semanticContracts: {},
    };

    writeSyncCache("/cache.json", cache1, cacheDeps());
    writeSyncCache("/cache.json", cache2, cacheDeps());

    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    // Last call should have cache2
    const lastCall =
      mockWriteFileSync.mock.calls[mockWriteFileSync.mock.calls.length - 1];
    expect(lastCall[0]).toBe("/cache.json");
    expect(lastCall[1]).toBe(`${JSON.stringify(cache2, null, 2)}\n`);
  });

  test("writes empty cache correctly", () => {
    mockExistsSync.mockReturnValue(true);

    writeSyncCache("/cache.json", defaultCache(), cacheDeps());

    const expected = `${JSON.stringify(defaultCache(), null, 2)}\n`;
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/cache.json",
      expected,
      "utf8",
    );
  });
});

describe("copySyncCache", () => {
  beforeEach(() => {
    mockExistsSync.mockClear();
    mockReadFileSync.mockClear();
    mockWriteFileSync.mockClear();
  });

  test("copies live cache to staging when live cache exists", () => {
    mockExistsSync.mockReturnValue(true);
    const cacheContent = JSON.stringify({
      version: 1,
      hashes: { "a.ts": "h1" },
      seenAt: {},
    });
    mockReadFileSync.mockReturnValue(cacheContent);

    copySyncCache("/live/.kb", "/staging/.kb", cacheDeps());

    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/live/.kb/sync-cache.json",
      "utf8",
    );
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/staging/.kb/sync-cache.json",
      cacheContent,
      "utf8",
    );
  });

  test("does nothing when live cache does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    copySyncCache("/live/.kb", "/staging/.kb", cacheDeps());

    expect(mockReadFileSync).not.toHaveBeenCalled();
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  test("copies file content exactly without modification", () => {
    mockExistsSync.mockReturnValue(true);
    const originalContent =
      '{\n  "version": 1,\n  "hashes": {},\n  "seenAt": {}\n}';
    mockReadFileSync.mockReturnValue(originalContent);

    copySyncCache("/live", "/staging", cacheDeps());

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/staging/sync-cache.json",
      originalContent,
      "utf8",
    );
  });

  test("uses correct file name (sync-cache.json) in paths", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("{}");

    copySyncCache("/a/b", "/c/d", cacheDeps());

    expect(mockExistsSync).toHaveBeenCalledWith("/a/b/sync-cache.json");
    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/a/b/sync-cache.json",
      "utf8",
    );
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/c/d/sync-cache.json",
      "{}",
      "utf8",
    );
  });
});
