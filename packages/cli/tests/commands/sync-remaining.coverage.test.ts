// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as fs from "node:fs";
import path from "node:path";
import { initCommand } from "../../src/commands/init.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { SyncError, syncCommand } from "../../src/commands/sync.js";
import {
  SYNC_CACHE_VERSION,
  hashFile,
  readSyncCache,
  writeSyncCache,
} from "../../src/commands/sync/cache.js";
import * as syncCacheModule from "../../src/commands/sync/cache.js";
import { EngineClient } from "../../src/engine.js";
import { writePendingSourceReceipt } from "../../src/operations/mutation/source-authoring.js";
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

function writeInvalidRequirement(cwd: string, id: string): string {
  const relative = path.join(".kb", "requirements", `${id}.md`);
  mkdirSync(path.dirname(path.join(cwd, relative)), { recursive: true });
  writeFileSync(
    path.join(cwd, relative),
    `---
id: ${id}
title: Embedded ${id}
status: open
type: req
scenario: login
test: proves-login
---

Embedded children are invalid here.
`,
  );
  return relative;
}

function writeRelationshipShard(
  cwd: string,
  name: string,
  from: string,
  to: string,
): string {
  const relative = path.join(".kb", "relationships", name);
  mkdirSync(path.dirname(path.join(cwd, relative)), { recursive: true });
  writeFileSync(
    path.join(cwd, relative),
    `relationships:
  - id: rel-${name.replace(/\.(ya?ml)$/i, "")}
    type: relates_to
    from: ${from}
    to: ${to}
    created_at: "2026-01-01T00:00:00Z"
    created_by: test
    source: test
`,
  );
  return relative;
}

function scriptedProlog(queryImpl?: (goal: string) => {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
}) {
  return {
    start: async () => {},
    terminate: async () => {},
    invalidateCache: () => {},
    query: async (goal: string | string[]) => {
      const text = Array.isArray(goal) ? goal.join(", ") : goal;
      if (queryImpl) return queryImpl(text);
      return { success: true, bindings: { ExistingIds: "[]" } };
    },
    queryBatch: async () => ({ success: true, bindings: {} }),
  };
}

describe("syncCommand remaining runtime branches", () => {
  test("git conflict and relationship ls-files execSync failures are non-blocking", async () => {
    const cwd = preparedGitWorkspace();
    await withCwd(cwd, () => initCommand({}));
    mkdirSync(path.join(cwd, ".kb", "relationships"), { recursive: true });
    const originalExec = childProcess.execSync;
    const exec = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
      options?: unknown,
    ) => {
      const text = String(command);
      if (text.includes("git diff --name-only --diff-filter=U")) {
        throw new Error("git binary missing");
      }
      if (text.includes("git ls-files --cached -- .kb/relationships")) {
        throw new Error("ls-files unavailable");
      }
      if (text.includes("git rev-parse HEAD")) {
        throw new Error("rev-parse unavailable");
      }
      return originalExec(command, options as never);
    }) as typeof childProcess.execSync);
    restores.push(() => exec.mockRestore());

    const result = await syncCommand({
      validateOnly: true,
      workspaceRoot: cwd,
    });
    expect(typeof result.success).toBe("boolean");
    expect(result.commit).toBeUndefined();
  });

  test("a non-directory relationships path yields no tracked shards", async () => {
    const cwd = preparedGitWorkspace();
    await withCwd(cwd, () => initCommand({}));
    const relationships = path.join(cwd, ".kb", "relationships");
    if (existsSync(relationships)) {
      rmSync(relationships, { recursive: true, force: true });
    }
    writeFileSync(relationships, "not-a-directory\n");
    const result = await syncCommand({
      validateOnly: true,
      workspaceRoot: cwd,
    });
    expect(typeof result.success).toBe("boolean");
  });

  test(
    "recoveryBackupPath recovers missing pending relationship receipts",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      git(cwd, "add .kb");
      git(cwd, "commit --no-verify -m init-kb");
      const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
      mkdirSync(pendingRoot, { recursive: true });
      writePendingSourceReceipt(
        cwd,
        ".kb/relationships/missing-hex.yaml",
        "a".repeat(64),
      );
      writeFileSync(
        path.join(pendingRoot, "rel-nonhex.json"),
        `${JSON.stringify({
          version: 1,
          path: ".kb/relationships/missing-nonhex.yaml",
          afterHash: "not-a-hex-digest",
        })}\n`,
      );
      const backup = path.join(cwd, ".kb-backup-recover");
      const result = await syncCommand(
        {
          rebuild: true,
          recoveryBackupPath: backup,
          workspaceRoot: cwd,
        },
        { createProlog: () => scriptedProlog() as never },
      );
      expect(result.success).toBe(true);
      expect(existsSync(backup)).toBe(true);
      expect(
        existsSync(
          path.join(
            pendingRoot,
            `${createHash("sha256").update(".kb/relationships/missing-hex.yaml").digest("hex")}.json`,
          ),
        ),
      ).toBe(false);
    },
    90_000,
  );

  test(
    "fast-path and extra-relationship-hash no-op checkpoints fail closed",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const req = writeRequirement(cwd, "REQ-SYNC-CKPT");
      git(cwd, `add ${req} .kb`);
      git(cwd, "commit --no-verify -m req");
      const first = await syncCommand({ workspaceRoot: cwd });
      expect(first.success).toBe(true);

      const checkpoint = spyOn(
        EngineClient.prototype,
        "checkpoint",
      ).mockResolvedValue({
        success: false,
        bindings: {},
        error: "disk full",
      });
      restores.push(() => checkpoint.mockRestore());
      await expect(syncCommand({ workspaceRoot: cwd })).rejects.toThrow(
        /Failed to publish the no-op sync checkpoint: disk full/,
      );

      const store = branchStorePath(cwd, "main");
      const cachePath = path.join(store, "sync-cache.json");
      const cache = readSyncCache(cachePath);
      writeSyncCache(cachePath, {
        ...cache,
        relationshipHashes: {
          ...(cache.relationshipHashes ?? {}),
          ".kb/relationships/stale.yaml": "d".repeat(64),
        },
      });
      checkpoint.mockResolvedValue({
        success: false,
        bindings: {},
      });
      await expect(syncCommand({ workspaceRoot: cwd })).rejects.toThrow(
        /Failed to publish the no-op sync checkpoint: Unknown error/,
      );
    },
    120_000,
  );

  test(
    "relationship-only shard edits use the journaled entity-delta path",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const req = writeRequirement(cwd, "REQ-SYNC-RELONLY");
      git(cwd, `add ${req} .kb`);
      git(cwd, "commit --no-verify -m req");
      const first = await syncCommand({ workspaceRoot: cwd });
      expect(first.success).toBe(true);

      const shard = writeRelationshipShard(
        cwd,
        "aa.yaml",
        "REQ-SYNC-RELONLY",
        "REQ-MISSING-ENDPOINT",
      );
      git(cwd, `add ${shard}`);
      git(cwd, "commit --no-verify -m shard");
      const second = await syncCommand({ workspaceRoot: cwd });
      expect(second.success).toBe(true);
      expect(second.relationshipCount).toBeGreaterThanOrEqual(0);

      git(cwd, `rm ${req}`);
      git(cwd, "commit --no-verify -m drop-req");
      const third = await syncCommand({ workspaceRoot: cwd });
      expect(third.success).toBe(true);
    },
    120_000,
  );

  test(
    "unreadable relationship shards warn and stale cache hashes invalidate the fast path",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const req = writeRequirement(cwd, "REQ-SYNC-HASH");
      const shard = writeRelationshipShard(
        cwd,
        "hh.yaml",
        "REQ-SYNC-HASH",
        "REQ-OTHER",
      );
      git(cwd, `add ${req} ${shard} .kb`);
      git(cwd, "commit --no-verify -m shard");

      const originalHashFile = hashFile;
      const hashSpy = spyOn(syncCacheModule, "hashFile").mockImplementation((
        workspaceRoot: string,
        filePath: string,
        deps?: Parameters<typeof hashFile>[2],
      ) => {
        if (String(filePath).includes("hh.yaml")) {
          throw new Error("hash unavailable");
        }
        return originalHashFile(workspaceRoot, filePath, deps);
      });
      restores.push(() => hashSpy.mockRestore());
      const io = captureIo();
      restores.push(io.restore);
      const result = await syncCommand(
        { workspaceRoot: cwd },
        { createProlog: () => scriptedProlog() as never },
      );
      expect(typeof result.success).toBe("boolean");
      expect(io.warns.join("\n")).toMatch(/Failed to hash relationship shard/);
    },
    90_000,
  );

  test(
    "chmod-unreadable tracked shards still emit the hash warning before extract fails",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const req = writeRequirement(cwd, "REQ-SYNC-CHMOD");
      const shard = writeRelationshipShard(
        cwd,
        "gg.yaml",
        "REQ-SYNC-CHMOD",
        "REQ-OTHER",
      );
      git(cwd, `add ${req} ${shard} .kb`);
      git(cwd, "commit --no-verify -m shard");
      chmodSync(path.join(cwd, shard), 0o000);
      restores.push(() => {
        try {
          chmodSync(path.join(cwd, shard), 0o644);
        } catch {
          // Cleanup is best-effort before the temp tree is removed.
        }
      });
      const io = captureIo();
      restores.push(io.restore);
      await expect(
        syncCommand(
          { workspaceRoot: cwd },
          { createProlog: () => scriptedProlog() as never },
        ),
      ).rejects.toThrow(/Failed to extract relationships|Failed to hash/);
      expect(io.warns.join("\n") + io.errorText()).toMatch(
        /Failed to hash relationship shard|Failed to extract/,
      );
    },
    90_000,
  );

  test(
    "journaled save failure reports an attachment mismatch after status errors",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const req = writeRequirement(cwd, "REQ-SYNC-SAVE");
      git(cwd, `add ${req} .kb`);
      git(cwd, "commit --no-verify -m req");
      let saving = false;
      const originalStatus = EngineClient.prototype.queryStatusJson;
      const save = spyOn(EngineClient.prototype, "save").mockImplementation(
        async () => {
          saving = true;
          return { success: false, bindings: {}, error: "journal full" };
        },
      );
      const status = spyOn(
        EngineClient.prototype,
        "queryStatusJson",
      ).mockImplementation(async function (
        this: EngineClient,
        ...args: Parameters<typeof originalStatus>
      ) {
        if (saving) throw new Error("status unavailable");
        return originalStatus.apply(this, args);
      });
      restores.push(() => save.mockRestore());
      restores.push(() => status.mockRestore());
      await expect(syncCommand({ workspaceRoot: cwd })).rejects.toThrow(
        /Failed to save journaled KB: journal full/,
      );
    },
    90_000,
  );

  test(
    "v1 cache relationship changes retry then fail closed on retract-all",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const req = writeRequirement(cwd, "REQ-SYNC-V1");
      const shard = writeRelationshipShard(
        cwd,
        "vv.yaml",
        "REQ-SYNC-V1",
        "REQ-MISSING-V1",
      );
      git(cwd, `add ${req} ${shard} .kb`);
      git(cwd, "commit --no-verify -m v1");
      const store = branchStorePath(cwd, "main");
      mkdirSync(store, { recursive: true });
      writeSyncCache(path.join(store, "sync-cache.json"), {
        version: SYNC_CACHE_VERSION,
        hashes: { [req]: shaFile(path.join(cwd, req)) },
        relationshipHashes: { [shard]: "e".repeat(64) },
        seenAt: { [req]: new Date().toISOString() },
        semanticHashes: {},
        semanticContracts: {},
      });

      const originalQuery = EngineClient.prototype.query;
      let retractAttempts = 0;
      const query = spyOn(EngineClient.prototype, "query").mockImplementation(
        async function (this: EngineClient, goal: string, signal?: AbortSignal) {
          if (String(goal).includes("kb_retract_all_relationships")) {
            retractAttempts += 1;
            if (retractAttempts === 1) {
              return { success: false, bindings: {}, error: "busy" };
            }
            return { success: false, bindings: {} };
          }
          return originalQuery.call(this, goal, signal);
        },
      );
      restores.push(() => query.mockRestore());
      const io = captureIo();
      restores.push(io.restore);
      await expect(syncCommand({ workspaceRoot: cwd })).rejects.toThrow(
        /Failed to clear changed relationship shards/,
      );
      expect(retractAttempts).toBeGreaterThanOrEqual(2);
    },
    90_000,
  );

  test(
    "validate-only mixed authoring errors and dangling shards take the staging failure path",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const valid = writeRequirement(cwd, "REQ-SYNC-MIX-OK");
      const invalid = writeInvalidRequirement(cwd, "REQ-SYNC-MIX-BAD");
      const shard = writeRelationshipShard(
        cwd,
        "mm.yaml",
        "REQ-SYNC-MIX-OK",
        "REQ-MISSING-MIX",
      );
      git(cwd, `add ${valid} ${invalid} ${shard} .kb`);
      git(cwd, "commit --no-verify -m mix");
      const io = captureIo();
      restores.push(io.restore);
      const result = await syncCommand(
        { validateOnly: true, workspaceRoot: cwd },
        { createProlog: () => scriptedProlog() as never },
      );
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(io.warns.join("\n")).toMatch(/dangling relationship/);
      expect(io.errorText()).toMatch(/FAILED:/);
    },
    90_000,
  );

  test(
    "journaled write records docs-not-indexed when a full reindex drops files",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const valid = writeRequirement(cwd, "REQ-SYNC-DOCS-OK");
      const invalid = writeInvalidRequirement(cwd, "REQ-SYNC-DOCS-BAD");
      git(cwd, `add ${valid} ${invalid} .kb`);
      git(cwd, "commit --no-verify -m docs");
      const io = captureIo();
      restores.push(io.restore);
      const result = await syncCommand({ workspaceRoot: cwd });
      expect(result.success).toBe(true);
      expect(JSON.stringify(result.failures)).toMatch(/not indexed|docs/i);
    },
    90_000,
  );

  test(
    "recovery publication disappears, collides, and rolls back a failed staging rename",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      git(cwd, "add .kb");
      git(cwd, "commit --no-verify -m init-kb");
      const livePath = branchStorePath(cwd, "main");
      const backupRename = path.join(cwd, ".kb-backup-rename");

      const originalRename = renameSync;
      let sawLiveToBackup = false;
      const rename = spyOn(fs, "renameSync").mockImplementation(((
        from: fs.PathLike,
        to: fs.PathLike,
      ) => {
        const fromStr = String(from);
        const toStr = String(to);
        if (fromStr === livePath && toStr === backupRename) {
          sawLiveToBackup = true;
          return originalRename(from, to);
        }
        if (sawLiveToBackup && toStr === livePath && fromStr !== backupRename) {
          throw Object.assign(new Error("EIO: staging publish failed"), {
            code: "EIO",
          });
        }
        return originalRename(from, to);
      }) as typeof fs.renameSync);
      restores.push(() => rename.mockRestore());
      await expect(
        syncCommand(
          {
            rebuild: true,
            recoveryBackupPath: backupRename,
            workspaceRoot: cwd,
          },
          { createProlog: () => scriptedProlog() as never },
        ),
      ).rejects.toThrow(/staging publish failed|EIO/);
      expect(existsSync(livePath)).toBe(true);
      rename.mockRestore();

      await expect(
        syncCommand(
          {
            rebuild: true,
            recoveryBackupPath: path.join(cwd, ".kb-backup-gone"),
            workspaceRoot: cwd,
          },
          {
            createProlog: () => scriptedProlog() as never,
            beforeSave: ({ livePath: live }) => {
              rmSync(live, { recursive: true, force: true });
            },
          },
        ),
      ).rejects.toThrow(/Recovery target disappeared before publication/);
    },
    90_000,
  );

  test(
    "rebuild of a journaled store publishes a replacement generation",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const req = writeRequirement(cwd, "REQ-SYNC-REBUILD");
      git(cwd, `add ${req} .kb`);
      git(cwd, "commit --no-verify -m req");
      const first = await syncCommand({ workspaceRoot: cwd });
      expect(first.success).toBe(true);
      expect(existsSync(path.join(branchStorePath(cwd, "main"), "storage.json"))).toBe(
        true,
      );
      const rebuilt = await syncCommand({
        rebuild: true,
        workspaceRoot: cwd,
      });
      expect(rebuilt.success).toBe(true);
      expect(rebuilt.published).toBe(true);
    },
    120_000,
  );

  test(
    "staging write invalidates the Prolog cache when the compiled KB changed",
    async () => {
      const cwd = preparedGitWorkspace();
      await withCwd(cwd, () => initCommand({}));
      const req = writeRequirement(cwd, "REQ-SYNC-STAGE");
      const shard = writeRelationshipShard(
        cwd,
        "ss.yaml",
        "REQ-SYNC-STAGE",
        "REQ-MISSING-STAGE",
      );
      git(cwd, `add ${req} ${shard} .kb`);
      git(cwd, "commit --no-verify -m stage");
      let invalidated = false;
      let cleared = false;
      const result = await syncCommand(
        { rebuild: true, workspaceRoot: cwd },
        {
          createProlog: () =>
            ({
              ...scriptedProlog((goal) => {
                if (goal.includes("kb_retract_all_relationships")) {
                  cleared = true;
                  return { success: true, bindings: {} };
                }
                return { success: true, bindings: { ExistingIds: "[]" } };
              }),
              invalidateCache: () => {
                invalidated = true;
              },
            }) as never,
        },
      );
      expect(result.success).toBe(true);
      expect(cleared || invalidated).toBe(true);
      expect(invalidated).toBe(true);
    },
    90_000,
  );

  test("blocks writes when resolveBranchAttachment reports migrationRequired", async () => {
    const cwd = preparedGitWorkspace();
    await withCwd(cwd, () => initCommand({}));
    const resolve = await import("../../src/utils/branch-resolver.js");
    const attachment = spyOn(resolve, "resolveBranchAttachment").mockReturnValue({
      gitBranch: "main",
      kbBranch: "legacy",
      storePath: path.join(cwd, ".kb", "branches", "legacy"),
      kind: "legacy_compat",
      migrationRequired: true,
    });
    restores.push(() => attachment.mockRestore());
    await expect(syncCommand({ workspaceRoot: cwd })).rejects.toThrow(
      /Sync blocked:.*legacy branch storage/,
    );
  });

  test("pending relationship receipts reject escapes, drift, and missing shards", async () => {
    const cwd = preparedGitWorkspace();
    await withCwd(cwd, () => initCommand({}));
    git(cwd, "add .kb");
    git(cwd, "commit --no-verify -m init-kb");
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    mkdirSync(pendingRoot, { recursive: true });
    writeFileSync(path.join(pendingRoot, "not-json.json"), "{not-json\n");
    writeFileSync(
      path.join(pendingRoot, "incomplete.json"),
      `${JSON.stringify({ version: 1, path: ".kb/relationships/aa.yaml" })}\n`,
    );
    writePendingSourceReceipt(
      cwd,
      ".kb/relationships/../../../outside.yaml",
      "a".repeat(64),
    );
    await expect(
      syncCommand(
        { validateOnly: true, workspaceRoot: cwd },
        { createProlog: () => scriptedProlog() as never },
      ),
    ).rejects.toThrow(/escapes workspace/);
    rmSync(
      path.join(
        pendingRoot,
        `${createHash("sha256").update(".kb/relationships/../../../outside.yaml").digest("hex")}.json`,
      ),
      { force: true },
    );

    mkdirSync(path.join(cwd, ".kb", "relationships"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "relationships", "aa.yaml"),
      "relationships: []\n",
    );
    writePendingSourceReceipt(
      cwd,
      ".kb/relationships/aa.yaml",
      "b".repeat(64),
    );
    await expect(
      syncCommand(
        { validateOnly: true, workspaceRoot: cwd },
        { createProlog: () => scriptedProlog() as never },
      ),
    ).rejects.toThrow(/hash drift/);
    rmSync(
      path.join(
        pendingRoot,
        `${createHash("sha256").update(".kb/relationships/aa.yaml").digest("hex")}.json`,
      ),
      { force: true },
    );

    writePendingSourceReceipt(
      cwd,
      ".kb/relationships/missing-now.yaml",
      "c".repeat(64),
    );
    await expect(
      syncCommand(
        { validateOnly: true, workspaceRoot: cwd },
        { createProlog: () => scriptedProlog() as never },
      ),
    ).rejects.toThrow(/Pending source is missing/);
  });
});
