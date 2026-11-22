/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { engineSocketPath } from "../../src/engine.js";
import {
  runJanitor,
  sweepRuntimeSockets,
  sweepStoreLock,
  sweepStoreLockTakeoverRecords,
} from "../../src/prolog/janitor.js";
import {
  STORE_LOCK_TAKEOVER_FILE,
  recordStoreLockTakeover,
} from "../../src/prolog/store-lock.js";
import { DETACHED_SNAPSHOT_KB_BRANCH } from "../../src/utils/branch-resolver.js";
import { ensureBranchStoreManifest } from "../../src/utils/branch-store-locator.js";

function makeStore(options: {
  holderPid?: number;
  holderWorkspace?: string;
  withLock?: boolean;
  legacyJournal?: boolean;
}): { root: string; store: string } {
  const root = mkdtempSync(join(tmpdir(), "kibi-janitor-"));
  const store = join(root, ".kb", "branches", "abc123");
  mkdirSync(join(store, "rdf"), { recursive: true });
  writeFileSync(join(store, "storage.json"), "{}");
  const journal: Record<string, unknown> = {};
  if (options.holderPid !== undefined) journal.pid = options.holderPid;
  if (options.holderWorkspace !== undefined) {
    journal.workspaceRoot = options.holderWorkspace;
  }
  journal.bootId = "boot-other-universe";
  journal.startedAt = "2026-09-14T00:00:00Z";
  const journalPath = options.legacyJournal
    ? join(store, "rdf", ".kibi-lock-owner.json")
    : join(store, ".kibi-lock-owner.json");
  writeFileSync(journalPath, JSON.stringify(journal));
  if (options.withLock !== false) {
    writeFileSync(join(store, "rdf", "lock"), "held");
  }
  return { root, store };
}

describe("sweepStoreLock", () => {
  test("reports a provably dead holder and cleans artifacts on apply", () => {
    const { root, store } = makeStore({ holderPid: 2_147_000_000 });
    const report = sweepStoreLock(store, false);
    expect(report?.action).toBe("clean");
    expect(existsSync(join(store, "rdf", "lock"))).toBe(true);
    const applied = sweepStoreLock(store, true);
    expect(applied?.action).toBe("clean");
    expect(existsSync(join(store, "rdf", "lock"))).toBe(false);
    expect(existsSync(join(store, ".kibi-lock-owner.json"))).toBe(false);
    expect(existsSync(root)).toBe(true);
  });

  test("keeps a live holder whose workspace still exists", () => {
    const workspace = mkdtempSync(join(tmpdir(), "kibi-janitor-ws-"));
    const { root, store } = makeStore({
      holderPid: process.pid,
      holderWorkspace: workspace,
    });
    const report = sweepStoreLock(store, true);
    expect(report?.action).toBe("keep");
    expect(existsSync(join(store, "rdf", "lock"))).toBe(true);
    expect(existsSync(join(store, ".kibi-lock-owner.json"))).toBe(true);
  });

  test("flags a live holder whose workspace vanished for kill-and-clean", () => {
    const { store } = makeStore({
      holderPid: process.pid,
      holderWorkspace: "/nonexistent/workspace/xyz",
    });
    // A SIGTERM to the current process would abort the test run, so only the
    // classification is exercised here: the finding must request cleanup.
    const report = sweepStoreLock(store, false);
    expect(report?.action).toBe("kill-and-clean");
    expect(report?.workspaceExists).toBe(false);
  });

  test("keeps a live holder when the journal lacks a workspace", () => {
    const { store } = makeStore({ holderPid: process.pid });
    // Missing workspace evidence must stay hands-off even with --apply:
    // the janitor must not signal a live daemon on absent metadata.
    const report = sweepStoreLock(store, true);
    expect(report?.action).toBe("keep");
    expect(report?.workspaceExists).toBe(false);
    expect(existsSync(join(store, "rdf", "lock"))).toBe(true);
  });

  test("sweeps a legacy journal kept beside the rdf lock", () => {
    const { store } = makeStore({
      holderPid: 2_147_000_000,
      legacyJournal: true,
    });
    const report = sweepStoreLock(store, false);
    expect(report?.action).toBe("clean");
    const applied = sweepStoreLock(store, true);
    expect(applied?.action).toBe("clean");
    expect(existsSync(join(store, "rdf", ".kibi-lock-owner.json"))).toBe(false);
    expect(existsSync(join(store, "rdf", "lock"))).toBe(false);
  });

  test("returns null for stores without a lock journal", () => {
    const { store } = makeStore({});
    rmSync(join(store, ".kibi-lock-owner.json"));
    expect(sweepStoreLock(store, true)).toBeNull();
  });
});

describe("runJanitor", () => {
  test("scans branch stores under the workspace", () => {
    const { root, store } = makeStore({ holderPid: 2_147_000_000 });
    const findings = runJanitor({
      workspaceRoot: root,
      runtimeDirectory: join(tmpdir(), "kibi-janitor-runtime-missing"),
      apply: false,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      kind: "store-lock",
      storePath: store,
      action: "clean",
    });
  });
});

describe("sweepStoreLockTakeoverRecords", () => {
  const HOUR = 60 * 60 * 1000;
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function storeWithTakeover(ageMs: number): {
    root: string;
    store: string;
    record: string;
    now: Date;
  } {
    const root = mkdtempSync(join(tmpdir(), "kibi-janitor-takeover-"));
    roots.push(root);
    const store = join(root, ".kb", "branches", "abc123");
    mkdirSync(join(store, "rdf"), { recursive: true });
    writeFileSync(join(store, "storage.json"), "{}");
    const now = new Date("2026-10-12T12:00:00.000Z");
    recordStoreLockTakeover(
      store,
      4242,
      "recorded holder pid 4242 is no longer running",
      new Date(now.getTime() - ageMs),
    );
    return { root, store, record: join(store, STORE_LOCK_TAKEOVER_FILE), now };
  }

  test("reports a takeover record older than 24h and keeps it without --apply", () => {
    const { root, store, record, now } = storeWithTakeover(25 * HOUR);
    const findings = sweepStoreLockTakeoverRecords({
      workspaceRoot: root,
      runtimeDirectory: join(root, "runtime"),
      now,
    });
    expect(findings).toEqual([
      {
        kind: "takeover-record",
        storePath: store,
        recordPath: record,
        at: "2026-10-11T11:00:00.000Z",
        brokenPid: 4242,
        action: "clean",
      },
    ]);
    expect(existsSync(record)).toBe(true);
  });

  test("deletes a takeover record older than 24h with --apply", () => {
    const { root, record, now } = storeWithTakeover(25 * HOUR);
    const findings = runJanitor({
      workspaceRoot: root,
      runtimeDirectory: join(root, "runtime"),
      apply: true,
      now,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      kind: "takeover-record",
      action: "clean",
    });
    expect(existsSync(record)).toBe(false);
  });

  test("keeps a fresh takeover record and does not report it", () => {
    const { root, record, now } = storeWithTakeover(1 * HOUR);
    const findings = runJanitor({
      workspaceRoot: root,
      runtimeDirectory: join(root, "runtime"),
      apply: true,
      now,
    });
    expect(findings).toEqual([]);
    expect(existsSync(record)).toBe(true);
  });
});

describe("sweepRuntimeSockets", () => {
  const temps: string[] = [];

  afterEach(() => {
    for (const dir of temps.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function tempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    temps.push(dir);
    return dir;
  }

  function workspaceSocketIn(
    runtime: string,
    workspaceRoot: string,
    branch: string,
    pid: number,
  ): string {
    const previous = process.env.KIBI_RUNTIME_DIR;
    process.env.KIBI_RUNTIME_DIR = runtime;
    let filename: string;
    try {
      filename = basename(engineSocketPath(workspaceRoot, branch));
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_RUNTIME_DIR");
      } else {
        process.env.KIBI_RUNTIME_DIR = previous;
      }
    }
    const socket = join(runtime, filename);
    writeFileSync(socket, "");
    writeFileSync(`${socket}.pid`, `${pid}\n`);
    return socket;
  }

  test("cleans sockets whose recorded pid is dead", () => {
    const runtime = tempDir("kibi-janitor-runtime-");
    const socket = join(runtime, "kibi-dead.sock");
    writeFileSync(socket, "");
    writeFileSync(`${socket}.pid`, "2147000000\n");
    const findings = sweepRuntimeSockets({
      workspaceRoot: runtime,
      runtimeDirectory: runtime,
      all: true,
      apply: true,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.action).toBe("clean");
    expect(existsSync(socket)).toBe(false);
    expect(existsSync(`${socket}.pid`)).toBe(false);
  });

  test("keeps scanning when a pid file vanishes mid-scan", () => {
    const runtime = tempDir("kibi-janitor-runtime-");
    const socket = join(runtime, "kibi-raced.sock");
    writeFileSync(socket, "");
    // A directory where the pid file belongs makes the read fail the way a
    // daemon exiting between existsSync and readFileSync does.
    mkdirSync(`${socket}.pid`);
    const findings = sweepRuntimeSockets({
      workspaceRoot: runtime,
      runtimeDirectory: runtime,
      all: true,
      apply: true,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      holderState: "unknown",
      action: "keep",
    });
    expect(existsSync(socket)).toBe(true);
  });

  test("sweeps current workspace dead sockets by default while leaving other workspaces untouched", () => {
    const runtime = tempDir("kibi-janitor-runtime-");
    const currentWs = tempDir("kibi-janitor-ws-a-");
    const otherWs = tempDir("kibi-janitor-ws-b-");
    ensureBranchStoreManifest(currentWs, "develop");
    ensureBranchStoreManifest(currentWs, "feature/auth");
    ensureBranchStoreManifest(otherWs, "develop");

    const deadDevelop = workspaceSocketIn(
      runtime,
      currentWs,
      "develop",
      2_147_000_000,
    );
    const deadFeature = workspaceSocketIn(
      runtime,
      currentWs,
      "feature/auth",
      2_147_000_001,
    );
    const otherDead = workspaceSocketIn(
      runtime,
      otherWs,
      "develop",
      2_147_000_002,
    );

    // Dry run reports both current workspace dead sockets without deleting.
    const dryRun = sweepRuntimeSockets({
      workspaceRoot: currentWs,
      runtimeDirectory: runtime,
      apply: false,
    });
    expect(dryRun.map((finding) => finding.socketPath).sort()).toStrictEqual(
      [deadDevelop, deadFeature].sort(),
    );
    expect(dryRun.every((finding) => finding.action === "clean")).toBe(true);
    expect(existsSync(deadDevelop)).toBe(true);
    expect(existsSync(deadFeature)).toBe(true);
    expect(existsSync(otherDead)).toBe(true);

    // Applying without --all removes only current workspace dead sockets.
    const applied = sweepRuntimeSockets({
      workspaceRoot: currentWs,
      runtimeDirectory: runtime,
      all: false,
      apply: true,
    });
    expect(applied.map((finding) => finding.socketPath).sort()).toStrictEqual(
      [deadDevelop, deadFeature].sort(),
    );
    expect(existsSync(deadDevelop)).toBe(false);
    expect(existsSync(`${deadDevelop}.pid`)).toBe(false);
    expect(existsSync(deadFeature)).toBe(false);
    expect(existsSync(`${deadFeature}.pid`)).toBe(false);
    expect(existsSync(otherDead)).toBe(true);
    expect(existsSync(`${otherDead}.pid`)).toBe(true);
  });

  test("sweeps both current and other workspaces dead sockets with --all", () => {
    const runtime = tempDir("kibi-janitor-runtime-");
    const currentWs = tempDir("kibi-janitor-ws-a-");
    const otherWs = tempDir("kibi-janitor-ws-b-");
    ensureBranchStoreManifest(currentWs, "develop");
    ensureBranchStoreManifest(otherWs, "develop");

    const currentDead = workspaceSocketIn(
      runtime,
      currentWs,
      "develop",
      2_147_000_000,
    );
    const otherDead = workspaceSocketIn(
      runtime,
      otherWs,
      "develop",
      2_147_000_001,
    );

    const findings = sweepRuntimeSockets({
      workspaceRoot: currentWs,
      runtimeDirectory: runtime,
      all: true,
      apply: true,
    });
    expect(findings.map((finding) => finding.socketPath).sort()).toStrictEqual(
      [currentDead, otherDead].sort(),
    );
    expect(existsSync(currentDead)).toBe(false);
    expect(existsSync(`${currentDead}.pid`)).toBe(false);
    expect(existsSync(otherDead)).toBe(false);
    expect(existsSync(`${otherDead}.pid`)).toBe(false);
  });

  test("keeps a live socket for the current workspace", () => {
    const runtime = tempDir("kibi-janitor-runtime-");
    const currentWs = tempDir("kibi-janitor-ws-live-");
    ensureBranchStoreManifest(currentWs, "develop");

    const liveSocket = workspaceSocketIn(
      runtime,
      currentWs,
      "develop",
      process.pid,
    );
    const findings = sweepRuntimeSockets({
      workspaceRoot: currentWs,
      runtimeDirectory: runtime,
      apply: true,
    });
    expect(findings).toStrictEqual([
      {
        kind: "socket",
        socketPath: liveSocket,
        pid: process.pid,
        holderState: "alive",
        action: "keep",
      },
    ]);
    expect(existsSync(liveSocket)).toBe(true);
    expect(existsSync(`${liveSocket}.pid`)).toBe(true);
  });

  test("sweeps dead sockets for git branches and detached snapshots without branch manifests", () => {
    const runtime = tempDir("kibi-janitor-runtime-");
    const repo = tempDir("kibi-janitor-git-");
    execFileSync("git", ["init", "-b", "main"], { cwd: repo, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], {
      cwd: repo,
      stdio: "ignore",
    });
    execFileSync("git", ["config", "user.name", "Test"], {
      cwd: repo,
      stdio: "ignore",
    });
    writeFileSync(join(repo, "README.md"), "hi\n");
    execFileSync("git", ["add", "README.md"], { cwd: repo, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "init"], {
      cwd: repo,
      stdio: "ignore",
    });
    execFileSync("git", ["branch", "feat/old"], {
      cwd: repo,
      stdio: "ignore",
    });

    const symlinkParent = tempDir("kibi-janitor-link-");
    const linkedRepo = join(symlinkParent, "repo-link");
    symlinkSync(repo, linkedRepo);

    const mainDead = workspaceSocketIn(runtime, repo, "main", 2_147_000_000);
    const oldDead = workspaceSocketIn(runtime, repo, "feat/old", 2_147_000_001);
    const detachedDead = workspaceSocketIn(
      runtime,
      repo,
      DETACHED_SNAPSHOT_KB_BRANCH,
      2_147_000_002,
    );

    const findings = runJanitor({
      workspaceRoot: linkedRepo,
      runtimeDirectory: runtime,
      apply: true,
    });
    expect(
      findings
        .filter((finding) => finding.kind === "socket")
        .map((finding) => finding.socketPath)
        .sort(),
    ).toStrictEqual([mainDead, oldDead, detachedDead].sort());
    expect(existsSync(mainDead)).toBe(false);
    expect(existsSync(oldDead)).toBe(false);
    expect(existsSync(detachedDead)).toBe(false);
  });

  test("leaves unrelated sockets untouched without --all", () => {
    const runtime = tempDir("kibi-janitor-runtime-");
    const socket = join(runtime, "kibi-dead.sock");
    writeFileSync(socket, "");
    writeFileSync(`${socket}.pid`, "2147000000\n");
    const findings = sweepRuntimeSockets({
      workspaceRoot: runtime,
      runtimeDirectory: runtime,
      all: false,
      apply: true,
    });
    expect(findings).toHaveLength(0);
    expect(existsSync(socket)).toBe(true);
  });
});
