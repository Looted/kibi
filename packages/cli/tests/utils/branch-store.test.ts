import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";
import { inspectBranchStore, storeLockJournalReason } from "../../src/utils/branch-store.js";

describe("inspectBranchStore", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("distinguishes a missing exact store from a damaged journal pointer", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-branch-store-"));
    roots.push(root);

    expect(inspectBranchStore(root, "trunk")).toMatchObject({
      state: "missing",
      errorCode: "branch_store_missing",
      recoveryRequired: false,
    });

    const store = branchStorePath(root, "trunk");
    ensureBranchStoreManifest(root, "trunk");
    mkdirSync(path.join(store, "rdf"), { recursive: true });
    writeFileSync(path.join(store, "storage.json"), "{}\n");
    writeFileSync(path.join(store, "CURRENT"), "not-a-generation\n");

    expect(inspectBranchStore(root, "trunk")).toMatchObject({
      state: "unreadable",
      errorCode: "branch_store_invalid_current",
      recoveryRequired: true,
    });
  });
});

describe("storeLockJournalReason", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function makeStoreWithJournal(journal: Record<string, unknown>): string {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-lock-reason-"));
    roots.push(root);
    const store = path.join(root, ".kb", "branches", "abc123");
    mkdirSync(store, { recursive: true });
    writeFileSync(
      path.join(store, ".kibi-lock-owner.json"),
      JSON.stringify(journal),
    );
    return store;
  }

  test("reports a journal whose holder is no longer running", () => {
    const store = makeStoreWithJournal({
      pid: 2_147_000_000,
      bootId: "boot-1",
    });
    expect(storeLockJournalReason(store)).toMatchObject({
      code: "store_lock_stale",
      path: path.join(store, ".kibi-lock-owner.json"),
    });
  });

  test("treats a live pid recorded under a different boot id as stale", () => {
    const store = makeStoreWithJournal({
      pid: 1,
      bootId: "boot-other-universe",
    });
    // pid 1 is alive on every unix-like system; the mismatched boot id —
    // not pid liveness — is what proves the holder is stale.
    expect(storeLockJournalReason(store)?.code).toBe("store_lock_stale");
  });

  test("stays quiet while a live same-host holder is recorded", () => {
    const store = makeStoreWithJournal({ pid: process.pid });
    expect(storeLockJournalReason(store)).toBeNull();
  });
});
