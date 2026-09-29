import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  SYNC_CACHE_VERSION,
  SYNC_COMPILER_FINGERPRINT,
  compilerFingerprintReason,
  readSyncCache,
} from "../../../src/commands/sync/cache.js";

const stores: string[] = [];

afterEach(() => {
  for (const store of stores.splice(0))
    rmSync(store, { recursive: true, force: true });
});

function storeWithCache(compilerFingerprint?: string): string {
  const store = mkdtempSync(path.join(tmpdir(), "kibi-compiler-fp-"));
  stores.push(store);
  writeFileSync(
    path.join(store, "sync-cache.json"),
    JSON.stringify({
      version: SYNC_CACHE_VERSION,
      hashes: { ".kb/requirements/REQ-a.md": "abc" },
      seenAt: {},
      semanticHashes: {},
      semanticContracts: {},
      ...(compilerFingerprint === undefined ? {} : { compilerFingerprint }),
    }),
  );
  return store;
}

describe("sync compiler fingerprint", () => {
  test("a cache from a different compiler contract is discarded, forcing a full re-import", () => {
    const store = storeWithCache("an-older-contract");
    const cache = readSyncCache(
      path.join(store, "sync-cache.json"),
      undefined,
      {
        compilerFingerprint: SYNC_COMPILER_FINGERPRINT,
      },
    );
    expect(cache.hashes).toEqual({});
  });

  test("an unstamped cache is discarded once the fingerprint is required", () => {
    const store = storeWithCache();
    const cache = readSyncCache(
      path.join(store, "sync-cache.json"),
      undefined,
      {
        compilerFingerprint: SYNC_COMPILER_FINGERPRINT,
      },
    );
    expect(cache.hashes).toEqual({});
  });

  test("a cache from the same compiler contract keeps its source hashes", () => {
    const store = storeWithCache(SYNC_COMPILER_FINGERPRINT);
    const cache = readSyncCache(
      path.join(store, "sync-cache.json"),
      undefined,
      {
        compilerFingerprint: SYNC_COMPILER_FINGERPRINT,
      },
    );
    expect(cache.hashes).toEqual({ ".kb/requirements/REQ-a.md": "abc" });
    expect(cache.compilerFingerprint).toBe(SYNC_COMPILER_FINGERPRINT);
  });

  test("status reports a store compiled under another contract as stale", () => {
    const store = storeWithCache("an-older-contract");
    expect(compilerFingerprintReason(store)).toMatchObject({
      code: "compiler_changed",
      path: path.join(store, "sync-cache.json"),
      remediation: { command_argv: ["kibi", "sync"] },
    });
    expect(compilerFingerprintReason(storeWithCache())).toMatchObject({
      code: "compiler_changed",
    });
  });

  test("status has no compiler reason for a matching or never-synced store", () => {
    expect(
      compilerFingerprintReason(storeWithCache(SYNC_COMPILER_FINGERPRINT)),
    ).toBeNull();
    const empty = mkdtempSync(path.join(tmpdir(), "kibi-compiler-fp-"));
    stores.push(empty);
    expect(compilerFingerprintReason(empty)).toBeNull();
  });
});
