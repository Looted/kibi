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

// implements REQ-core-journaled-engine-persistence
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EngineSession,
  ensureJournaledBranchStoreAsync,
} from "../../src/engine.js";
import { PrologProcess } from "../../src/prolog.js";
import {
  isProcessAlive,
  readStoreLockTakeover,
} from "../../src/prolog/store-lock.js";
import { ensureBranchStoreManifest } from "../../src/utils/branch-store-locator.js";
import { storeLockTakeoverReason } from "../../src/utils/branch-store.js";

/**
 * A killed holder's OS lock dies with it, so the next `kb_attach` succeeds
 * instead of failing with `store_locked`. The takeover is recorded from the
 * `rdf/lock` file the killed holder left behind, through the real attach.
 */

const roots: string[] = [];
const prologs: PrologProcess[] = [];

afterEach(async () => {
  for (const prolog of prologs.splice(0)) {
    await prolog.query("kb_detach").catch(() => undefined);
    await prolog.terminate().catch(() => undefined);
  }
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

async function journaledStore(): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), "kibi-attach-takeover-"));
  roots.push(root);
  const branchPath = ensureBranchStoreManifest(root, "main");
  await ensureJournaledBranchStoreAsync(branchPath);
  return branchPath;
}

async function attach(branchPath: string): Promise<PrologProcess> {
  const prolog = new PrologProcess({ timeout: 60_000, oneShot: false });
  prologs.push(prolog);
  await new EngineSession(prolog, branchPath).boot();
  return prolog;
}

function holderPid(branchPath: string): number {
  return (
    JSON.parse(
      readFileSync(join(branchPath, ".kibi-lock-owner.json"), "utf8"),
    ) as { pid: number }
  ).pid;
}

async function waitDead(pid: number): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (isProcessAlive(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  expect(isProcessAlive(pid)).toBe(false);
}

describe.skipIf(process.platform === "win32")(
  "attaching a store a killed holder left locked",
  () => {
    test("records the takeover that kb_status reports", async () => {
      const branchPath = await journaledStore();
      const killed = await attach(branchPath);
      const pid = holderPid(branchPath);
      process.kill(pid, "SIGKILL");
      await waitDead(pid);
      await killed.terminate();
      expect(existsSync(join(branchPath, "rdf", "lock"))).toBe(true);
      expect(readStoreLockTakeover(branchPath)).toBeNull();

      await attach(branchPath);
      expect(readStoreLockTakeover(branchPath)).toMatchObject({
        brokenPid: pid,
        reason: `recorded holder pid ${pid} is no longer running`,
      });
      expect(storeLockTakeoverReason(branchPath)).toMatchObject({
        code: "store_lock_taken_over",
        brokenPid: pid,
        blocking: false,
      });
    }, 120_000);

    test("a holder that detached leaves nothing to take over", async () => {
      const branchPath = await journaledStore();
      const first = await attach(branchPath);
      expect((await first.query("kb_detach")).success).toBe(true);
      await first.terminate();
      expect(existsSync(join(branchPath, "rdf", "lock"))).toBe(false);

      await attach(branchPath);
      expect(readStoreLockTakeover(branchPath)).toBeNull();
    }, 120_000);
  },
);
