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

import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  runJanitor,
  sweepRuntimeSockets,
  sweepStoreLock,
} from "../../src/prolog/janitor.js";

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
    require("node:fs").rmSync(join(store, ".kibi-lock-owner.json"));
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

describe("sweepRuntimeSockets", () => {
  test("cleans sockets whose recorded pid is dead", () => {
    const runtime = mkdtempSync(join(tmpdir(), "kibi-janitor-runtime-"));
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
    const runtime = mkdtempSync(join(tmpdir(), "kibi-janitor-runtime-"));
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

  test("is inert without --all", () => {
    const runtime = mkdtempSync(join(tmpdir(), "kibi-janitor-runtime-"));
    const socket = join(runtime, "kibi-dead.sock");
    writeFileSync(socket, "");
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
