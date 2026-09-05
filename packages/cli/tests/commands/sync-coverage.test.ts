import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { initCommand } from "../../src/commands/init.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { SyncError, syncCommand } from "../../src/commands/sync.js";
import { writePendingSourceReceipt } from "../../src/operations/mutation/source-authoring.js";
import { engineSocketPath } from "../../src/engine.js";
import { SYNC_CACHE_VERSION, writeSyncCache } from "../../src/commands/sync/cache.js";
import { branchStorePath } from "../../src/utils/branch-store-locator.js";
import {
  captureIo,
  createGitWorkspace,
  git,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Fixtures that never started an engine, or already stopped one.
    }
    removeTempDir(root);
  }
});

function preparedGitWorkspace(): string {
  const restoreEnv = isolateKibiEnv();
  restores.push(restoreEnv);
  const cwd = createGitWorkspace();
  roots.push(cwd);
  return cwd;
}

function shaFile(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function writeRequirement(cwd: string, id: string): string {
  const relative = path.join(".kb", "requirements", `${id}.md`);
  mkdirSync(path.dirname(path.join(cwd, relative)), { recursive: true });
  writeFileSync(
    path.join(cwd, relative),
    `---
id: ${id}
title: Coverage ${id}
status: open
type: req
---

Must remain independently testable.
`,
  );
  return relative;
}

describe("syncCommand write, cache, and pending-receipt paths", () => {
  test(
    "write sync then a second call takes the no-op cache checkpoint",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const req = writeRequirement(cwd, "REQ-SYNC-NOOP");
      git(cwd, `add ${req} .kb`);
      git(cwd, "commit --no-verify -m req");
      const first = await syncCommand({ workspaceRoot: cwd });
      expect(first.success).toBe(true);
      const io = captureIo();
      restores.push(io.restore);
      const second = await syncCommand({ workspaceRoot: cwd });
      expect(second.success).toBe(true);
      expect(io.logText()).toMatch(/no changes/);
    },
    90_000,
  );

  test(
    "KIBI_DEBUG logs branch and source counts on validate-only",
    async () => {
      const cwd = preparedGitWorkspace();
      const previous = process.env.KIBI_DEBUG;
      process.env.KIBI_DEBUG = "1";
      restores.push(() => {
        if (previous === undefined) Reflect.deleteProperty(process.env, "KIBI_DEBUG");
        else process.env.KIBI_DEBUG = previous;
      });
      await withCwd(cwd, () => initCommand({}));
      const io = captureIo();
      restores.push(io.restore);
      const result = await syncCommand({
        validateOnly: true,
        workspaceRoot: cwd,
      });
      expect(typeof result.success).toBe("boolean");
      expect(io.logText()).toContain("[kibi-debug] currentBranch:");
      expect(io.logText()).toContain("[kibi-debug] markdownFiles:");
    },
    60_000,
  );

  test(
    "refreshSymbolCoordinates on a write sync after init",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      git(cwd, "add .kb");
      git(cwd, "commit --no-verify -m init-kb");
      const result = await syncCommand({
        refreshSymbolCoordinates: true,
        workspaceRoot: cwd,
      });
      expect(result.success).toBe(true);
    },
    90_000,
  );

  test(
    "rebuild with recoveryBackupPath publishes a recoverable backup",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      git(cwd, "add .kb");
      git(cwd, "commit --no-verify -m init-kb");
      const backup = path.join(cwd, ".kb-backup-store");
      const result = await syncCommand({
        rebuild: true,
        recoveryBackupPath: backup,
        workspaceRoot: cwd,
      });
      expect(result.success).toBe(true);
      expect(existsSync(backup)).toBe(true);
    },
    90_000,
  );

  test(
    "rebuild throws when a stale engine socket file is not reachable",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const socket = engineSocketPath(cwd, "main");
      mkdirSync(path.dirname(socket), { recursive: true });
      writeFileSync(socket, "not-a-socket");
      await expect(
        syncCommand({ rebuild: true, workspaceRoot: cwd }),
      ).rejects.toThrow(/not reachable/);
    },
    60_000,
  );

  test("pending relationship receipts skip malformed JSON and reject escaped paths", async () => {
    const cwd = preparedGitWorkspace();
    await withCwd(cwd, () => initCommand({}));
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    writeFileSync(path.join(pendingRoot, "ignore.txt"), "skip");
    writeFileSync(path.join(pendingRoot, "malformed.json"), "{not json");
    writeFileSync(
      path.join(pendingRoot, "incomplete.json"),
      `${JSON.stringify({ version: 1, path: ".kb/relationships/aa.yaml" })}\n`,
    );
    writePendingSourceReceipt(
      cwd,
      ".kb/relationships/../../../etc/passwd",
      "a".repeat(64),
    );
    await expect(syncCommand({ workspaceRoot: cwd })).rejects.toThrow(
      /escapes workspace/,
    );
  });

  test("pending relationship receipts reject a missing shard file", async () => {
    const cwd = preparedGitWorkspace();
    await withCwd(cwd, () => initCommand({}));
    writePendingSourceReceipt(
      cwd,
      ".kb/relationships/missing.yaml",
      "b".repeat(64),
    );
    await expect(syncCommand({ workspaceRoot: cwd })).rejects.toThrow(
      /Pending source is missing/,
    );
  });

  test("pending relationship receipts reject hash drift", async () => {
    const cwd = preparedGitWorkspace();
    await withCwd(cwd, () => initCommand({}));
    mkdirSync(path.join(cwd, ".kb", "relationships"), { recursive: true });
    const drifted = path.join(cwd, ".kb", "relationships", "dd.yaml");
    writeFileSync(
      drifted,
      "relationships:\n  - id: rel-1\n    type: relates_to\n    from: REQ-A\n    to: REQ-B\n    created_at: '2026-01-01T00:00:00Z'\n    created_by: test\n    source: test\n",
    );
    writePendingSourceReceipt(cwd, ".kb/relationships/dd.yaml", "c".repeat(64));
    await expect(syncCommand({ workspaceRoot: cwd })).rejects.toThrow(
      /hash drift/,
    );
  });

  test(
    "untracked pending relationship shards are compiled on write sync",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      git(cwd, "add .kb");
      git(cwd, "commit --no-verify -m init-kb");
      mkdirSync(path.join(cwd, ".kb", "relationships"), { recursive: true });
      const relative = ".kb/relationships/ee.yaml";
      const shardPath = path.join(cwd, relative);
      writeFileSync(
        shardPath,
        "relationships:\n  - id: rel-pending\n    type: relates_to\n    from: REQ-PEND\n    to: REQ-PEND-TO\n    created_at: '2026-01-01T00:00:00Z'\n    created_by: test\n    source: test\n",
      );
      writePendingSourceReceipt(cwd, relative, shaFile(shardPath));
      const result = await syncCommand({ workspaceRoot: cwd });
      expect(result.success).toBe(true);
    },
    90_000,
  );

  test(
    "planted cache with an invalid shard relationship key fails closed",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      git(cwd, "add .kb");
      git(cwd, "commit --no-verify -m init-kb");
      const store = branchStorePath(cwd, "main");
      mkdirSync(store, { recursive: true });
      writeSyncCache(path.join(store, "sync-cache.json"), {
        version: SYNC_CACHE_VERSION,
        hashes: { "gone.md": "a".repeat(64) },
        relationshipHashes: { ".kb/relationships/gone.yaml": "b".repeat(64) },
        entityHashes: {},
        sourceEntityIds: {},
        shardRelationships: {
          ".kb/relationships/gone.yaml": ["invalid-key-without-nul-parts"],
        },
        seenAt: { "gone.md": new Date().toISOString() },
        semanticHashes: {},
        semanticContracts: {},
      });
      await expect(syncCommand({ workspaceRoot: cwd })).rejects.toThrow(
        /Invalid cached relationship key/,
      );
    },
    60_000,
  );
});
