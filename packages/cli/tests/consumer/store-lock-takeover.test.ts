// implements REQ-core-journaled-engine-persistence
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  type ConsumerWorkspace,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * rdf_persistency locks the branch store with an OS advisory lock that dies
 * with its holder, so a killed engine never made the next attach fail with
 * `store_locked`. The only takeover record was written on that failure, and
 * the engine removed the dead holder's `rdf/lock` silently before attaching:
 * `store_lock_taken_over` never appeared. Killing a real engine must now
 * leave the takeover record that kb_status reports.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type Notice = { code: string; brokenPid?: number | null; blocking?: boolean };
type StatusData = {
  syncState: string;
  kbPath: string;
  notices?: Notice[];
};

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** The parent pid of a Linux process, from `/proc/<pid>/stat`. */
function parentPid(pid: number): number {
  const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
  // The command name is parenthesised and may contain spaces.
  const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
  return Number.parseInt(fields[1] ?? "", 10);
}

async function waitDead(pid: number): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (alive(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  expect(alive(pid)).toBe(false);
}

/**
 * SIGKILL the SWI-Prolog process holding `store` and the engine daemon that
 * hosts it (its parent): neither gets to detach or run its halt hooks, so
 * `rdf/lock` and the ownership journal stay behind. Returns the holder pid.
 */
async function killEngine(store: string): Promise<number> {
  const lockPath = path.join(store, "rdf", "lock");
  const journalPath = path.join(store, ".kibi-lock-owner.json");
  const holderPid = (
    JSON.parse(readFileSync(journalPath, "utf8")) as { pid: number }
  ).pid;
  const daemonPid = parentPid(holderPid);
  expect(holderPid).toBeGreaterThan(0);
  expect(readFileSync(`/proc/${daemonPid}/cmdline`, "utf8")).toContain(
    "engine-daemon",
  );
  expect(existsSync(lockPath)).toBe(true);
  process.kill(holderPid, "SIGKILL");
  process.kill(daemonPid, "SIGKILL");
  await waitDead(holderPid);
  await waitDead(daemonPid);
  expect(existsSync(lockPath)).toBe(true);
  expect(existsSync(journalPath)).toBe(true);
  expect(existsSync(path.join(store, ".kibi-lock-takeover.json"))).toBe(false);
  return holderPid;
}

describe.skipIf(process.platform !== "linux")(
  "a killed engine's branch-store lock",
  () => {
    test("the next attach takes the store over and kb_status reports it", async () => {
      const ws = createConsumerWorkspace("kibi-store-lock-takeover-");
      workspace = ws;
      ws.write(
        ".kb/requirements/REQ-demo-export.md",
        doc(
          "id: REQ-demo-export\ntitle: Users can export reports\nstatus: open",
          "## Context\n\nReports export as CSV.\n",
        ),
      );
      ws.sync();
      const first = (ws.json(["status"], {}) as { data: StatusData }).data;
      expect(first.notices ?? []).toEqual([]);
      const store = first.kbPath;
      const takeoverPath = path.join(store, ".kibi-lock-takeover.json");

      const holderPid = await killEngine(store);
      const after = (ws.json(["status"], {}) as { data: StatusData }).data;
      expect(existsSync(takeoverPath)).toBe(true);
      expect(after.notices?.[0]).toMatchObject({
        code: "store_lock_taken_over",
        brokenPid: holderPid,
        blocking: false,
      });
      // A takeover heals itself; it never makes the KB stale.
      expect(after.syncState).toBe("fresh");
    }, 300_000);

    test("kibi doctor reports the takeover on a store that is not compiled yet", async () => {
      const ws = createConsumerWorkspace("kibi-store-lock-takeover-doctor-");
      workspace = ws;
      ws.write(
        ".kb/requirements/REQ-demo-export.md",
        doc(
          "id: REQ-demo-export\ntitle: Users can export reports\nstatus: open",
          "## Context\n\nReports export as CSV.\n",
        ),
      );
      // A query attaches an engine to the empty store; nothing is compiled.
      ws.json(["query"], { type: "req" });
      const store = (ws.json(["status"], {}) as { data: StatusData }).data
        .kbPath;
      const holderPid = await killEngine(store);
      ws.json(["status"], {});

      const doctor = ws.kibi(["doctor", "--format", "json"]);
      const report = JSON.parse(doctor.stdout) as {
        checks: Array<{
          name: string;
          passed: boolean;
          message: string;
          details?: { lockTakeover?: Notice };
        }>;
      };
      const branchStore = report.checks.find(
        (check) => check.name === "Branch store",
      );
      expect(branchStore?.passed).toBe(false);
      expect(branchStore?.message).toContain(
        "Kibi broke a stale branch-store lock",
      );
      expect(branchStore?.details?.lockTakeover).toMatchObject({
        code: "store_lock_taken_over",
        brokenPid: holderPid,
      });
    }, 300_000);
  },
);
