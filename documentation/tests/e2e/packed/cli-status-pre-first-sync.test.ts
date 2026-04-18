import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * CLI Status Pre-First-Sync E2E Regression Tests
 *
 * These tests verify that `kibi status` correctly reports state before
 * the first sync and transitions to a fresh state after sync.
 */

if (RUN_NODE_TEST_SUITE) {
  describe("CLI Status Pre-First-Sync Regression", { timeout: 180000 }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) {
          console.warn(
            "⚠️  SWI-Prolog not available, skipping CLI status pre-first-sync E2E",
          );
          return;
        }

        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
      },
      { timeout: 120000 },
    );

    after(
      async () => {
        if (sandbox) {
          await sandbox.cleanup();
        }
      },
      { timeout: 60000 },
    );

    it("reports correct pre-sync state immediately after init", {
      timeout: 60000,
    }, async () => {
      if (!hasProlog) return;

      // Initialize kibi
      const initResult = await kibi(sandbox, ["init"]);
      assert.strictEqual(
        initResult.exitCode,
        0,
        `kibi init should succeed: ${initResult.stderr}`,
      );

      // Check status immediately after init (before any sync)
      const statusResult = await kibi(sandbox, ["status", "--format", "json"]);
      assert.strictEqual(
        statusResult.exitCode,
        0,
        `kibi status should succeed: ${statusResult.stderr}`,
      );

      const statusJson = JSON.parse(statusResult.stdout) as {
        branch: string;
        snapshotId: string;
        syncedAt: string | null;
        dirty: boolean;
        syncState: string;
      };

      // Assert pre-sync contract
      assert.strictEqual(
        statusJson.branch,
        "develop",
        "Branch should be 'develop' (initialized by initGitRepo)",
      );
      assert.strictEqual(
        statusJson.snapshotId,
        "missing",
        "Snapshot ID should be 'missing' before first sync",
      );
      assert.strictEqual(
        statusJson.syncedAt,
        null,
        "SyncedAt should be null before first sync",
      );
      assert.strictEqual(
        statusJson.dirty,
        true,
        "Dirty should be true before first sync (no data yet)",
      );
      assert.strictEqual(
        statusJson.syncState,
        "unknown",
        "Sync state should be 'unknown' before first sync",
      );
    });

    it("transitions to fresh state with syncedAt after first sync", {
      timeout: 60000,
    }, async () => {
      if (!hasProlog) return;

      // Initialize kibi
      const initResult = await kibi(sandbox, ["init"]);
      assert.strictEqual(
        initResult.exitCode,
        0,
        `kibi init should succeed: ${initResult.stderr}`,
      );

      // Write a minimal requirement file
      const docsDir = join(sandbox.repoDir, "documentation", "requirements");
      mkdirSync(docsDir, { recursive: true });
      writeFileSync(
        join(docsDir, "REQ-STATUS-001.md"),
        `---
id: REQ-STATUS-001
title: Status test requirement
status: open
---

Test requirement for CLI status pre-first-sync regression.
`,
        "utf8",
      );

      // Run sync
      const syncResult = await kibi(sandbox, ["sync"]);
      assert.strictEqual(
        syncResult.exitCode,
        0,
        `kibi sync should succeed: ${syncResult.stderr}`,
      );

      // Check status after sync
      const statusResult = await kibi(sandbox, ["status", "--format", "json"]);
      assert.strictEqual(
        statusResult.exitCode,
        0,
        `kibi status should succeed: ${statusResult.stderr}`,
      );

      const statusJson = JSON.parse(statusResult.stdout) as {
        branch: string;
        snapshotId: string;
        syncedAt: string | null;
        dirty: boolean;
        syncState: string;
      };

      // Assert post-sync contract
      assert.strictEqual(
        statusJson.branch,
        "develop",
        "Branch should still be 'develop' after sync",
      );
      assert.notStrictEqual(
        statusJson.snapshotId,
        "missing",
        "Snapshot ID should not be 'missing' after sync",
      );
      assert.strictEqual(
        typeof statusJson.snapshotId,
        "string",
        "Snapshot ID should be a string after sync",
      );
      assert.notStrictEqual(
        statusJson.syncedAt,
        null,
        "SyncedAt should not be null after sync",
      );
      assert.strictEqual(
        typeof statusJson.syncedAt,
        "string",
        "SyncedAt should be a string after sync",
      );
      assert.ok(
        statusJson.syncedAt != null && statusJson.syncedAt.length > 0,
        "SyncedAt should be a non-empty string after sync",
      );
      assert.strictEqual(
        statusJson.dirty,
        false,
        "Dirty should be false after successful sync",
      );
      assert.strictEqual(
        statusJson.syncState,
        "fresh",
        "Sync state should be 'fresh' after successful sync",
      );
    });
  });
}
