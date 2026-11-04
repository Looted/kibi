import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import {
  branchEnsureCommand,
  branchMigrateCommand,
  branchMigrationApprovalHash,
  branchRecoverCommand,
  branchRestoreCommand,
  completeBranchJournalPaths,
  isSupportedLegacyBranchMigration,
} from "../../src/commands/branch.js";
import * as syncModule from "../../src/commands/sync.js";
import {
  EngineClient,
  enginePublicationLockPath,
  engineSocketPath,
} from "../../src/engine.js";
import * as locator from "../../src/utils/branch-store-locator.js";
import {
  branchStorePath,
  expectedBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";
import {
  createGitWorkspace,
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

// Branch store commands against real temporary Git workspaces; the engine
// and sync are replaced through prototype and namespace spies.

let roots: string[];
let restores: Array<() => void>;
let logs: string[];
let errors: string[];

beforeEach(() => {
  roots = [];
  logs = [];
  errors = [];
  restores = [isolateKibiEnv()];
  const log = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  const error = spyOn(console, "error").mockImplementation(
    (...args: unknown[]) => {
      errors.push(args.join(" "));
    },
  );
  restores.push(
    () => log.mockRestore(),
    () => error.mockRestore(),
  );
});

afterEach(() => {
  for (const restore of restores.reverse()) restore();
  for (const root of roots) removeTempDir(root);
});

function workspace(branch = "main"): string {
  const cwd = createGitWorkspace(branch);
  roots.push(cwd);
  return cwd;
}

function legacyStore(cwd: string, branch = "main"): string {
  const source = path.join(cwd, ".kb", "branches", branch);
  mkdirSync(path.join(source, "nested"), { recursive: true });
  writeFileSync(path.join(source, "kb.rdf"), "legacy\n");
  writeFileSync(path.join(source, "nested", "facts.pl"), "fact.\n");
  return source;
}

function manifestStore(store: string, branch = "main"): void {
  mkdirSync(store, { recursive: true });
  writeFileSync(
    path.join(store, "branch.json"),
    `${JSON.stringify(expectedBranchStoreManifest(branch), null, 2)}\n`,
  );
}

function spy<T extends object, K extends keyof T>(
  target: T,
  key: K,
): ReturnType<typeof spyOn<T, K>> {
  const installed = spyOn(target, key);
  restores.push(() => installed.mockRestore());
  return installed;
}

const readJson = (file: string) => JSON.parse(readFileSync(file).toString());

describe("legacy store hashing", () => {
  function expectedSourceHash(entries: Array<[string, string]>): string {
    const hash = createHash("sha256");
    for (const [name, content] of entries) {
      hash.update(name);
      hash.update("\0");
      hash.update(content);
      hash.update("\0");
    }
    return hash.digest("hex");
  }

  test("hashes files depth first in name order, skipping links", () => {
    const root = createTempDir("kibi-branch-hash-");
    roots.push(root);
    const source = path.join(root, "source");
    mkdirSync(path.join(source, "b-dir", "inner"), { recursive: true });
    writeFileSync(path.join(source, "c.txt"), "C");
    writeFileSync(path.join(source, "a.txt"), "A");
    writeFileSync(path.join(source, "b-dir", "z.txt"), "Z");
    writeFileSync(path.join(source, "b-dir", "inner", "y.txt"), "Y");
    symlinkSync(path.join(source, "a.txt"), path.join(source, "link.txt"));
    const sourceHash = expectedSourceHash([
      ["a.txt", "A"],
      ["b-dir/inner/y.txt", "Y"],
      ["b-dir/z.txt", "Z"],
      ["c.txt", "C"],
    ]);
    const expected = createHash("sha256")
      .update(
        JSON.stringify({
          version: 2,
          from: "f",
          to: "t",
          sourcePath: source,
          targetPath: "/target",
          sourceHash,
          manifestVersion: expectedBranchStoreManifest("t").version,
        }),
      )
      .digest("hex");
    expect(branchMigrationApprovalHash("f", "t", source, "/target")).toBe(
      expected,
    );
  });

  test("only same-identity migrations are supported", () => {
    expect(isSupportedLegacyBranchMigration("main", "main")).toBe(true);
    expect(isSupportedLegacyBranchMigration("main", "dev")).toBe(false);
  });

  test("a complete journal needs all four paths", () => {
    expect(completeBranchJournalPaths(["a", "b", "c", "d"])).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    for (const paths of [
      ["", "b", "c", "d"],
      ["a", "", "c", "d"],
      ["a", "b", "", "d"],
      ["a", "b", "c"],
    ]) {
      expect(() => completeBranchJournalPaths(paths)).toThrow(
        "Branch migration journal is incomplete",
      );
    }
  });
});

describe("branch ensure", () => {
  test("explains an unresolvable branch", async () => {
    const root = createTempDir("kibi-branch-nogit-");
    roots.push(root);
    await expect(branchEnsureCommand({ workspaceRoot: root })).rejects.toThrow(
      "Failed to resolve active branch",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]?.length).toBeGreaterThan(0);
  });

  test("creates the store once", async () => {
    const cwd = workspace();
    await branchEnsureCommand({ workspaceRoot: cwd });
    await branchEnsureCommand({ workspaceRoot: cwd });
    expect(logs).toEqual([
      `Created branch KB: main (${branchStorePath(cwd, "main")})`,
      "Branch KB already exists: main",
    ]);
  });
});

describe("branch migrate", () => {
  test.each([
    [{}, "branch migrate requires a valid --from branch name"],
    [
      { from: "bad..name" },
      "branch migrate requires a valid --from branch name",
    ],
    [
      { from: "main" },
      "branch migrate requires an explicit valid --to branch name",
    ],
    [
      { from: "main", to: "bad..name" },
      "branch migrate requires an explicit valid --to branch name",
    ],
    [
      { from: "main", to: "dev" },
      "branch migrate --to 'dev' does not match the active Git branch 'main'",
    ],
    [
      { from: "dev", to: "main" },
      "branch migrate only supports a same-identity literal-to-hashed migration; every cross-branch move is refused",
    ],
  ])("refuses %p", async (options, message) => {
    const cwd = workspace();
    await expect(
      branchMigrateCommand({ workspaceRoot: cwd, ...options }),
    ).rejects.toThrow(message);
  });

  test("previews with the approval hash", async () => {
    const cwd = workspace();
    const source = legacyStore(cwd);
    const target = branchStorePath(cwd, "main");
    await branchMigrateCommand({
      workspaceRoot: cwd,
      from: "main",
      to: "main",
    });
    expect(logs).toEqual([
      "Branch KB migration preview: main -> main",
      `Source: ${source}`,
      `Target: ${target}`,
      `Approval hash: ${branchMigrationApprovalHash("main", "main", source, target)}`,
      "Preview only. Re-run with --apply to move the branch KB.",
    ]);
  });

  test("requires the matching approval hash", async () => {
    const cwd = workspace();
    const source = legacyStore(cwd);
    const hash = branchMigrationApprovalHash(
      "main",
      "main",
      source,
      branchStorePath(cwd, "main"),
    );
    const base = { workspaceRoot: cwd, from: "main", to: "main", apply: true };
    await expect(branchMigrateCommand(base)).rejects.toThrow(
      `branch migrate requires --approval-hash from the preview (${hash})`,
    );
    await expect(
      branchMigrateCommand({ ...base, approvalHash: "0".repeat(64) }),
    ).rejects.toThrow(
      `branch migrate approval hash mismatch; expected ${hash}`,
    );
  });

  function engineSpies(running: boolean) {
    const seen: { allow?: unknown } = {};
    const start = spy(EngineClient.prototype, "start").mockImplementation(
      async function (this: EngineClient) {
        seen.allow = (
          this as unknown as { allowPublicationLock: unknown }
        ).allowPublicationLock;
      } as never,
    );
    const stop = spy(EngineClient.prototype, "stop").mockResolvedValue(
      undefined as never,
    );
    const isRunning = spy(EngineClient.prototype, "isRunning").mockReturnValue(
      running,
    );
    const terminate = spy(
      EngineClient.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    return { seen, start, stop, isRunning, terminate };
  }

  async function applyMigration(cwd: string, branch = "main") {
    const source = path.join(cwd, ".kb", "branches", branch);
    const approvalHash = branchMigrationApprovalHash(
      branch,
      branch,
      source,
      branchStorePath(cwd, branch),
    );
    await branchMigrateCommand({
      workspaceRoot: cwd,
      from: branch,
      to: branch,
      apply: true,
      approvalHash,
    });
    return approvalHash;
  }

  test("moves the store, keeps a backup and commits the journal", async () => {
    const cwd = workspace("feat/x");
    legacyStore(cwd, "feat/x");
    const engine = engineSpies(false);
    const copy = spy(fs, "cpSync");
    const approvalHash = await applyMigration(cwd, "feat/x");
    expect(engine.start).not.toHaveBeenCalled();
    expect(engine.stop).not.toHaveBeenCalled();
    expect(engine.terminate).toHaveBeenCalledTimes(1);
    expect(copy.mock.calls[0]?.[2]).toEqual({
      recursive: true,
      errorOnExist: true,
    });

    const journalDir = path.join(cwd, ".kb", "recovery", "branch-migrations");
    const [backupName, journalName] = readdirSync(journalDir).sort();
    expect(journalName).toMatch(/^\d+-feat__x-feat__x\.json$/);
    expect(backupName).toBe(journalName?.replace(".json", "-legacy"));
    const journalPath = path.join(journalDir, journalName ?? "");
    const backupPath = path.join(journalDir, backupName ?? "");
    const target = branchStorePath(cwd, "feat/x");
    expect(readJson(journalPath)).toEqual({
      version: 2,
      from: "feat/x",
      to: "feat/x",
      sourcePath: ".kb/branches/feat/x",
      targetPath: path.relative(cwd, target),
      stagingPath: expect.stringMatching(
        new RegExp(
          `^${path.relative(cwd, target)}\\.staging-${process.pid}-\\d+$`,
        ),
      ),
      backupPath: path.relative(cwd, backupPath),
      approvalHash,
      state: "committed",
    });
    expect(statSync(journalPath).mode & 0o777).toBe(0o600);
    expect(statSync(path.join(target, "branch.json")).mode & 0o777).toBe(0o600);
    expect(readJson(path.join(target, "branch.json"))).toEqual(
      expectedBranchStoreManifest("feat/x"),
    );
    expect(
      readFileSync(path.join(target, "nested", "facts.pl")).toString(),
    ).toBe("fact.\n");
    expect(existsSync(path.join(cwd, ".kb", "branches", "feat/x"))).toBe(false);
    expect(readFileSync(path.join(backupPath, "kb.rdf")).toString()).toBe(
      "legacy\n",
    );
    expect(logs.slice(-3)).toEqual([
      "Migrated branch KB to exact Git branch 'feat/x'.",
      `Legacy store preserved at ${backupPath}.`,
      `Migration journal: ${journalPath}.`,
    ]);
    expect(existsSync(enginePublicationLockPath(cwd, "feat/x"))).toBe(false);
  });

  test("stops a running engine found through its socket", async () => {
    const cwd = workspace();
    legacyStore(cwd);
    const socket = engineSocketPath(cwd, "main");
    mkdirSync(path.dirname(socket), { recursive: true });
    writeFileSync(socket, "");
    const engine = engineSpies(true);
    await applyMigration(cwd);
    expect(engine.start).toHaveBeenCalledWith(false);
    expect(engine.seen.allow).toBe(true);
    expect(engine.stop).toHaveBeenCalledWith(false);
    expect(engine.terminate).toHaveBeenCalledTimes(1);
  });

  test("terminates the engine client when shutdown fails", async () => {
    const cwd = workspace();
    legacyStore(cwd);
    const socket = engineSocketPath(cwd, "main");
    mkdirSync(path.dirname(socket), { recursive: true });
    writeFileSync(socket, "");
    const engine = engineSpies(false);
    await expect(applyMigration(cwd)).rejects.toThrow(
      `Branch migration blocked: engine shutdown failed: Kibi engine socket remains present but is not reachable: ${socket}`,
    );
    expect(engine.terminate).toHaveBeenCalledTimes(1);
    expect(existsSync(enginePublicationLockPath(cwd, "main"))).toBe(false);
  });

  function journalOf(cwd: string) {
    const journalDir = path.join(cwd, ".kb", "recovery", "branch-migrations");
    const name = readdirSync(journalDir).find((entry) =>
      entry.endsWith(".json"),
    );
    return readJson(path.join(journalDir, name ?? ""));
  }

  test("keeps the prepared journal when the copy fails", async () => {
    const cwd = workspace();
    legacyStore(cwd);
    engineSpies(false);
    spy(fs, "cpSync").mockImplementation(() => {
      throw new Error("disk full");
    });
    await expect(applyMigration(cwd)).rejects.toThrow(
      /^Branch migration failed before authoritative completion; recover .*\.json: disk full$/,
    );
    expect(journalOf(cwd)).toMatchObject({
      version: 2,
      from: "main",
      to: "main",
      sourcePath: ".kb/branches/main",
      state: "prepared",
    });
    expect(existsSync(path.join(cwd, ".kb", "branches", "main"))).toBe(true);
  });

  test("records the quarantined legacy store when verification fails", async () => {
    const cwd = workspace();
    legacyStore(cwd);
    engineSpies(false);
    spy(locator, "branchStoreManifestMatches").mockReturnValue(false);
    await expect(applyMigration(cwd)).rejects.toThrow(
      "migrated branch store manifest verification failed",
    );
    expect(journalOf(cwd).state).toBe("legacy_quarantined");
  });

  test("records the published target before the commit", async () => {
    const cwd = workspace();
    legacyStore(cwd);
    engineSpies(false);
    const write = fs.writeFileSync;
    spy(fs, "writeFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      data: string,
      options?: fs.WriteFileOptions,
    ) => {
      if (String(data).includes('"state": "committed"')) {
        throw new Error("journal write failed");
      }
      write(file, data, options);
    }) as never);
    await expect(applyMigration(cwd)).rejects.toThrow("journal write failed");
    expect(journalOf(cwd).state).toBe("target_published");
  });
});

describe("migration journal recovery", () => {
  function journal(
    cwd: string,
    id: string,
    state: string,
    paths: { source: string; target: string; staging: string; backup: string },
  ): string {
    const dir = path.join(cwd, ".kb", "recovery", "branch-migrations");
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}.json`);
    writeFileSync(
      file,
      JSON.stringify({
        version: 2,
        to: "main",
        state,
        sourcePath: path.relative(cwd, paths.source),
        targetPath: path.relative(cwd, paths.target),
        stagingPath: path.relative(cwd, paths.staging),
        backupPath: path.relative(cwd, paths.backup),
      }),
    );
    return file;
  }

  function layout(cwd: string) {
    const target = branchStorePath(cwd, "main");
    return {
      source: path.join(cwd, ".kb", "branches", "main"),
      target,
      staging: `${target}.staging-1`,
      backup: path.join(
        cwd,
        ".kb",
        "recovery",
        "branch-migrations",
        "j-legacy",
      ),
    };
  }

  const recover = (cwd: string, apply = true) =>
    branchMigrateCommand({ workspaceRoot: cwd, recoverJournal: "j", apply });

  test("previews a journal without touching it", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    journal(cwd, "j", "prepared", paths);
    await recover(cwd, false);
    expect(logs).toEqual([
      "Branch migration recovery preview: j",
      "State: prepared",
      `Source: ${paths.source}`,
      `Target: ${paths.target}`,
      `Backup: ${paths.backup}`,
      "Preview only. Re-run with --apply to recover this journal.",
    ]);
  });

  test("finishes a prepared journal and commits it", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    mkdirSync(paths.source, { recursive: true });
    manifestStore(paths.staging);
    const file = journal(cwd, "j", "prepared", paths);
    await recover(cwd);
    expect(readJson(file).state).toBe("committed");
    expect(existsSync(paths.source)).toBe(false);
    expect(existsSync(paths.backup)).toBe(true);
    expect(existsSync(paths.staging)).toBe(false);
  });

  test("records the quarantine when the published identity is wrong", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    mkdirSync(paths.source, { recursive: true });
    manifestStore(paths.staging, "other");
    const file = journal(cwd, "j", "prepared", paths);
    await expect(recover(cwd)).rejects.toThrow(
      "Recovered target manifest does not match the exact branch identity",
    );
    expect(readJson(file)).toMatchObject({
      state: "legacy_quarantined",
      to: "main",
    });
  });

  test("records the published target when the final check fails", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    manifestStore(paths.backup);
    writeFileSync(path.join(paths.backup, "kb.rdf"), "backup\n");
    manifestStore(paths.staging);
    const file = journal(cwd, "j", "legacy_quarantined", paths);
    spy(locator, "branchStoreManifestMatches")
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    await expect(recover(cwd)).rejects.toThrow(
      /^Invalid target moved to .*\.corrupt-\d+; verified legacy backup restored$/,
    );
    expect(readJson(file).state).toBe("target_published");
    expect(readFileSync(path.join(paths.target, "kb.rdf")).toString()).toBe(
      "backup\n",
    );
    expect(existsSync(paths.backup)).toBe(false);
  });

  test("leaves a quarantined source alone while publishing staging", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    mkdirSync(paths.source, { recursive: true });
    manifestStore(paths.backup);
    writeFileSync(path.join(paths.backup, "kb.rdf"), "backup\n");
    manifestStore(paths.staging);
    const file = journal(cwd, "j", "legacy_quarantined", paths);
    await recover(cwd);
    expect(readJson(file).state).toBe("committed");
    expect(existsSync(paths.source)).toBe(true);
  });

  test("commits a prepared journal whose target was already published", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    manifestStore(paths.backup);
    manifestStore(paths.target);
    const file = journal(cwd, "j", "prepared", paths);
    await recover(cwd);
    expect(readJson(file).state).toBe("committed");
  });

  test("refuses to choose between a source and a target", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    mkdirSync(paths.source, { recursive: true });
    manifestStore(paths.target);
    journal(cwd, "j", "prepared", paths);
    await expect(recover(cwd)).rejects.toThrow(
      "Recovery found both legacy source and target; refusing to choose a winner",
    );
  });

  test("keeps a prepared source without staging and reports it incomplete", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    mkdirSync(paths.source, { recursive: true });
    journal(cwd, "j", "prepared", paths);
    await expect(recover(cwd)).rejects.toThrow(
      "Migration journal j remains incomplete; rerun its recovery preview",
    );
    expect(existsSync(paths.source)).toBe(true);
    expect(existsSync(paths.backup)).toBe(false);
  });

  test("reports a backup without staging or target as incomplete", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    manifestStore(paths.backup);
    journal(cwd, "j", "legacy_quarantined", paths);
    await expect(recover(cwd)).rejects.toThrow(
      "Migration journal j remains incomplete",
    );
  });

  test("reports a target without a backup as incomplete", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    manifestStore(paths.target);
    const file = journal(cwd, "j", "target_published", paths);
    await expect(recover(cwd)).rejects.toThrow(
      "Migration journal j remains incomplete",
    );
    expect(readJson(file).state).toBe("target_published");
  });

  test("does nothing for a committed journal", async () => {
    const cwd = workspace();
    const paths = layout(cwd);
    const file = journal(cwd, "j", "committed", paths);
    const before = readFileSync(file).toString();
    await recover(cwd);
    expect(readFileSync(file).toString()).toBe(before);
  });
});

describe("branch recover", () => {
  test("previews a corrupt store with its error code", async () => {
    const cwd = workspace();
    await branchEnsureCommand({ workspaceRoot: cwd });
    const store = branchStorePath(cwd, "main");
    writeFileSync(path.join(store, "kb.rdf"), "not rdf\n");
    logs.length = 0;
    await branchRecoverCommand({ workspaceRoot: cwd });
    expect(logs[0]).toBe("Branch KB recovery preview: main");
    expect(logs[1]).toBe(`Store: ${store}`);
    expect(logs[2]).toBe("State: unreadable (branch_store_invalid_legacy_rdf)");
    expect(logs[3]).toMatch(
      new RegExp(
        `^Backup: ${path.join(cwd, ".kb", "recovery", "main")}/\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}\\.\\d{3}Z$`,
      ),
    );
    expect(logs.slice(4)).toEqual([
      "Strategy: rebuild a clean journaled store from current authored sources.",
      "Git branch remains unchanged; no branch rename will be performed.",
      "Preview only. Re-run with --apply to create the backup and publish the rebuilt store.",
    ]);
  });

  test("previews a store without an error code", async () => {
    const cwd = workspace();
    await branchEnsureCommand({ workspaceRoot: cwd });
    const store = branchStorePath(cwd, "main");
    writeFileSync(path.join(store, "kb.rdf"), "<rdf:RDF>\n");
    logs.length = 0;
    await branchRecoverCommand({ workspaceRoot: cwd });
    expect(logs[2]).toBe("State: healthy");
  });

  test("rebuilds, re-syncs and writes the audit", async () => {
    const cwd = workspace("feat/x");
    await branchEnsureCommand({ workspaceRoot: cwd });
    writeFileSync(
      path.join(branchStorePath(cwd, "feat/x"), "kb.rdf"),
      "<rdf:RDF>\n",
    );
    mkdirSync(path.join(cwd, ".kb", "migrations"), { recursive: true });
    const sync = spy(syncModule, "syncCommand").mockResolvedValue({
      success: true,
    } as never);
    logs.length = 0;
    await branchRecoverCommand({ workspaceRoot: cwd, apply: true });
    const backupPath = logs[3]?.replace("Backup: ", "") ?? "";
    expect(sync.mock.calls).toEqual([
      [{ rebuild: true, recoveryBackupPath: backupPath, workspaceRoot: cwd }],
      [{ workspaceRoot: cwd }],
    ]);
    const auditPath = path.join(
      cwd,
      ".kb",
      "migrations",
      "feat__x.recovery.json",
    );
    const audit = readJson(auditPath);
    expect(audit).toEqual({
      version: 1,
      branch: "feat/x",
      recoveredAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      priorState: "healthy",
      priorErrorCode: null,
      backupPath: path.relative(cwd, backupPath),
      strategy: "rebuild_from_authored_sources",
    });
    expect(readFileSync(auditPath).toString()).toBe(
      `${JSON.stringify(audit, null, 2)}\n`,
    );
    expect(logs.slice(-3)).toEqual([
      "Recovered exact branch KB 'feat/x'.",
      `Original bytes preserved at ${backupPath}.`,
      `Recovery audit: ${auditPath}`,
    ]);
  });

  test("audits the prior error code", async () => {
    const cwd = workspace();
    await branchEnsureCommand({ workspaceRoot: cwd });
    writeFileSync(path.join(branchStorePath(cwd, "main"), "kb.rdf"), "x\n");
    spy(syncModule, "syncCommand").mockResolvedValue({
      success: true,
    } as never);
    await branchRecoverCommand({ workspaceRoot: cwd, apply: true });
    const audit = readJson(
      path.join(cwd, ".kb", "migrations", "main.recovery.json"),
    );
    expect(audit).toMatchObject({
      priorState: "unreadable",
      priorErrorCode: "branch_store_invalid_legacy_rdf",
    });
  });
});

describe("branch restore", () => {
  function quarantine(cwd: string, name: string, metadata: string): string {
    const keyRoot = path.join(
      cwd,
      ".kb",
      "quarantine",
      "branches",
      path.basename(branchStorePath(cwd, "main")),
    );
    const entry = path.join(keyRoot, name);
    manifestStore(entry);
    writeFileSync(path.join(entry, "quarantine.json"), metadata);
    return entry;
  }

  test("refuses an invalid branch name", async () => {
    const cwd = workspace();
    await expect(
      branchRestoreCommand({ workspaceRoot: cwd, branch: "bad..name" }),
    ).rejects.toThrow("branch restore requires a valid --branch identity");
  });

  test("refuses an existing target", async () => {
    const cwd = workspace();
    await branchEnsureCommand({ workspaceRoot: cwd });
    await expect(
      branchRestoreCommand({ workspaceRoot: cwd, branch: "main" }),
    ).rejects.toThrow(
      `Target branch store already exists: ${branchStorePath(cwd, "main")}`,
    );
  });

  test("picks the newest entry that names the branch", async () => {
    const cwd = workspace();
    const older = quarantine(
      cwd,
      "2026-01",
      JSON.stringify({ branch: "main" }),
    );
    quarantine(cwd, "2026-02", JSON.stringify({ branch: "other" }));
    quarantine(cwd, "2026-03", "null");
    quarantine(cwd, "2026-04", "{broken");
    const newest = quarantine(
      cwd,
      "2026-05",
      JSON.stringify({ branch: "main" }),
    );
    quarantine(cwd, "2026-06", JSON.stringify({}));
    await branchRestoreCommand({ workspaceRoot: cwd, branch: "main" });
    expect(logs).toEqual([
      "Branch restore preview: main",
      `Source: ${newest}`,
      `Target: ${branchStorePath(cwd, "main")}`,
      "Preview only. Re-run with --apply to restore the store.",
    ]);
    expect(existsSync(older)).toBe(true);
  });

  test("ignores entries that are not directories", async () => {
    const cwd = workspace();
    const entry = quarantine(
      cwd,
      "2026-01",
      JSON.stringify({ branch: "main" }),
    );
    writeFileSync(path.join(path.dirname(entry), "2026-09"), "file\n");
    await branchRestoreCommand({ workspaceRoot: cwd, branch: "main" });
    expect(logs[1]).toBe(`Source: ${entry}`);
  });

  test("restores into an existing branches directory", async () => {
    const cwd = workspace();
    mkdirSync(path.join(cwd, ".kb", "branches"), { recursive: true });
    const entry = quarantine(
      cwd,
      "2026-01",
      JSON.stringify({ branch: "main" }),
    );
    await branchRestoreCommand({
      workspaceRoot: cwd,
      branch: "main",
      apply: true,
    });
    expect(existsSync(entry)).toBe(false);
    expect(
      readJson(path.join(branchStorePath(cwd, "main"), "branch.json")),
    ).toEqual(expectedBranchStoreManifest("main"));
    expect(logs.at(-1)).toBe("Restored exact branch store for 'main'.");
  });

  test("restores when no branches directory exists yet", async () => {
    const cwd = workspace();
    quarantine(cwd, "2026-01", JSON.stringify({ branch: "main" }));
    await branchRestoreCommand({
      workspaceRoot: cwd,
      branch: "main",
      apply: true,
    });
    expect(existsSync(branchStorePath(cwd, "main"))).toBe(true);
  });

  test("refuses a quarantined store without a manifest", async () => {
    const cwd = workspace();
    const entry = quarantine(
      cwd,
      "2026-01",
      JSON.stringify({ branch: "main" }),
    );
    fs.rmSync(path.join(entry, "branch.json"));
    await expect(
      branchRestoreCommand({ workspaceRoot: cwd, branch: "main", apply: true }),
    ).rejects.toThrow("Quarantined store identity mismatch for 'main'.");
  });

  test("refuses a manifest naming another branch under the same key", async () => {
    const cwd = workspace();
    const entry = quarantine(
      cwd,
      "2026-01",
      JSON.stringify({ branch: "main" }),
    );
    writeFileSync(
      path.join(entry, "branch.json"),
      JSON.stringify({
        ...expectedBranchStoreManifest("main"),
        branch: "other",
      }),
    );
    await expect(
      branchRestoreCommand({ workspaceRoot: cwd, branch: "main", apply: true }),
    ).rejects.toThrow("Quarantined store identity mismatch for 'main'.");
  });

  test("refuses a manifest whose key belongs to another branch", async () => {
    const cwd = workspace();
    const entry = quarantine(
      cwd,
      "2026-01",
      JSON.stringify({ branch: "main" }),
    );
    writeFileSync(
      path.join(entry, "branch.json"),
      JSON.stringify({
        ...expectedBranchStoreManifest("main"),
        key: expectedBranchStoreManifest("other").key,
      }),
    );
    await expect(
      branchRestoreCommand({ workspaceRoot: cwd, branch: "main", apply: true }),
    ).rejects.toThrow("Quarantined store identity mismatch for 'main'.");
  });

  test("refuses a quarantined store with another identity", async () => {
    const cwd = workspace();
    const entry = quarantine(
      cwd,
      "2026-01",
      JSON.stringify({ branch: "main" }),
    );
    writeFileSync(
      path.join(entry, "branch.json"),
      JSON.stringify(expectedBranchStoreManifest("other")),
    );
    await expect(
      branchRestoreCommand({ workspaceRoot: cwd, branch: "main", apply: true }),
    ).rejects.toThrow("Quarantined store identity mismatch for 'main'.");
    expect(existsSync(entry)).toBe(true);
  });
});
