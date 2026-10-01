import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { currentBootId } from "../../src/prolog/store-lock.js";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";
import {
  inspectBranchStore,
  storeLockJournalReason,
} from "../../src/utils/branch-store.js";

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

  test("uses a mismatched boot id as stale evidence only when the host exposes one", async () => {
    const holder = Bun.spawn(
      [process.execPath, "-e", "setInterval(() => {}, 1000)"],
      {
        stdout: "ignore",
        stderr: "ignore",
      },
    );
    try {
      const store = makeStoreWithJournal({
        pid: holder.pid,
        bootId: "boot-other-universe",
      });
      // A live holder can be proven stale from a foreign boot only on a host
      // that provides boot identity. Without it, conservatively retain the lock.
      if (currentBootId() === null)
        expect(storeLockJournalReason(store)).toBeNull();
      else expect(storeLockJournalReason(store)?.code).toBe("store_lock_stale");
    } finally {
      holder.kill();
      await holder.exited;
    }
  });

  test("stays quiet while a live same-host holder is recorded", () => {
    const store = makeStoreWithJournal({ pid: process.pid });
    expect(storeLockJournalReason(store)).toBeNull();
  });
});
