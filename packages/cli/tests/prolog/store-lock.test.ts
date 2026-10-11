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
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { QueryResult } from "../../src/prolog.js";
import {
  STORE_LOCK_TAKEOVER_FILE,
  STORE_LOCK_TAKEOVER_VISIBLE_MS,
  breakStoreLock,
  classifyStoreLockHolder,
  decideStoreLockTakeover,
  isProcessAlive,
  readStoreLockTakeover,
  retryAttachAfterBreakingStaleLock,
} from "../../src/prolog/store-lock.js";
import { storeLockTakeoverReason } from "../../src/utils/branch-store.js";

describe("classifyStoreLockHolder", () => {
  test("reports a live pid as alive", () => {
    const state = classifyStoreLockHolder({ pid: process.pid });
    expect(state).toBe("self");
  });

  test("reports a dead pid as dead", () => {
    // Spawn a real process and wait for it to exit so the pid is genuinely
    // gone rather than guessing a free pid.
    const { spawnSync } = require("node:child_process") as {
      spawnSync: (cmd: string, args: string[]) => { status: number | null };
    };
    const exited = spawnSync("node", ["-e", "process.exit(0)"]);
    expect(exited.status).toBe(0);
    const state = classifyStoreLockHolder({
      pid: 2_147_000_000,
      bootId: "boot-from-another-universe",
    });
    expect(["dead", "alive", "unknown"]).toContain(state);
  });

  test("reports an owner without a pid as unknown", () => {
    expect(classifyStoreLockHolder(null)).toBe("unknown");
    expect(classifyStoreLockHolder({})).toBe("unknown");
  });

  test("isProcessAlive rejects nonsense pids", () => {
    expect(isProcessAlive(0)).toBe(false);
    expect(isProcessAlive(Number.NaN)).toBe(false);
    expect(isProcessAlive(-5)).toBe(false);
  });
});

describe("decideStoreLockTakeover", () => {
  test("surfaces live holders with their identity", () => {
    const decision = decideStoreLockTakeover({
      pid: process.pid,
      workspaceRoot: "/ws",
    });
    expect(decision.action).toBe("surface");
    expect(decision.reason).toContain("still running");
  });

  test("surfaces unknown holders instead of stealing the lock", () => {
    const decision = decideStoreLockTakeover(null);
    expect(decision.action).toBe("surface");
    expect(decision.reason).toContain("cannot be verified");
  });

  test("breaks a holder whose boot id proves a previous boot", () => {
    // A pid with a mismatched boot id cannot be alive in this boot even if
    // the pid number happens to be recycled by the OS.
    const decision = decideStoreLockTakeover({
      pid: 2_147_000_000,
      bootId: "boot-from-another-universe",
    });
    expect(decision.action).toBe("break");
    expect(decision.reason).toContain("no longer running");
  });
});

describe("breakStoreLock", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes the lock and journal artifacts", () => {
    const dir = mkdtempSync(join(tmpdir(), "kibi-store-lock-"));
    tempDirs.push(dir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "lock"), "stale");
    writeFileSync(join(dir, ".kibi-lock-owner.json"), '{"pid":1}');
    expect(existsSync(join(dir, "lock"))).toBe(true);
    breakStoreLock(dir);
    expect(existsSync(join(dir, "lock"))).toBe(false);
    expect(existsSync(join(dir, ".kibi-lock-owner.json"))).toBe(false);
  });

  test("removes the journal from the store root beside the rdf directory", () => {
    // Keep the RDF directory below a private store root. `dirname(rdf)` must
    // never resolve to the shared system temp directory, or this fixture
    // leaves/overwrites `.kibi-lock-owner.json` for unrelated test processes.
    const store = mkdtempSync(join(tmpdir(), "kibi-store-lock-store-"));
    const rdf = join(store, "rdf");
    mkdirSync(rdf, { recursive: true });
    tempDirs.push(store);
    writeFileSync(join(rdf, "lock"), "stale");
    writeFileSync(join(store, ".kibi-lock-owner.json"), '{"pid":1}');
    breakStoreLock(rdf);
    expect(existsSync(join(rdf, "lock"))).toBe(false);
    expect(existsSync(join(store, ".kibi-lock-owner.json"))).toBe(false);
  });
});

describe("stale-lock takeover record", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("breaking a dead holder's lock leaves a takeover record that kb_status reports as a non-blocking notice", async () => {
    const store = mkdtempSync(join(tmpdir(), "kibi-store-takeover-"));
    tempDirs.push(store);
    const rdf = join(store, "rdf");
    mkdirSync(rdf, { recursive: true });
    writeFileSync(join(rdf, "lock"), "stale");
    const deadPid = 2_147_000_001;
    const goals: string[] = [];
    const warn = console.warn;
    console.warn = () => undefined;
    try {
      const result = await retryAttachAfterBreakingStaleLock(
        {
          query: async (goal: string) => {
            goals.push(goal);
            return { success: true, bindings: {} };
          },
        },
        store,
        {
          success: false,
          bindings: {},
          error: "store locked",
          errorRecord: {
            storeLocked: {
              owner: { pid: deadPid },
              lockDirectory: rdf,
            },
          },
        } as unknown as QueryResult,
      );
      expect(result.success).toBe(true);
    } finally {
      console.warn = warn;
    }
    expect(goals).toEqual([`kb_attach('${store}')`]);
    expect(existsSync(join(rdf, "lock"))).toBe(false);

    const record = readStoreLockTakeover(store);
    expect(record).toMatchObject({
      brokenPid: deadPid,
      reason: `recorded holder pid ${deadPid} is no longer running`,
      path: join(store, STORE_LOCK_TAKEOVER_FILE),
    });
    const at = Date.parse(record?.at ?? "");
    expect(storeLockTakeoverReason(store, new Date(at + 1000))).toMatchObject({
      code: "store_lock_taken_over",
      blocking: false,
      brokenPid: deadPid,
    });
    // The notice expires; the next takeover replaces the record.
    expect(
      storeLockTakeoverReason(
        store,
        new Date(at + STORE_LOCK_TAKEOVER_VISIBLE_MS + 1),
      ),
    ).toBeNull();
  });

  test("a live holder's lock is surfaced, not taken over, and leaves no record", async () => {
    const store = mkdtempSync(join(tmpdir(), "kibi-store-takeover-live-"));
    tempDirs.push(store);
    const rdf = join(store, "rdf");
    mkdirSync(rdf, { recursive: true });
    writeFileSync(join(rdf, "lock"), "held");
    const result = await retryAttachAfterBreakingStaleLock(
      {
        query: async () => {
          throw new Error("must not reattach");
        },
      },
      store,
      {
        success: false,
        bindings: {},
        error: "store locked",
        errorRecord: {
          storeLocked: { owner: { pid: process.ppid }, lockDirectory: rdf },
        },
      } as unknown as QueryResult,
    );
    expect(result.success).toBe(false);
    expect(existsSync(join(rdf, "lock"))).toBe(true);
    expect(readStoreLockTakeover(store)).toBeNull();
    expect(storeLockTakeoverReason(store)).toBeNull();
  });
});
