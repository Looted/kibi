import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runJanitor,
  sweepRuntimeSockets,
  sweepStoreLock,
  sweepStoreLockTakeoverRecords,
  sweepWorkspaceStoreLocks,
} from "../../src/prolog/janitor.js";
import {
  STORE_LOCK_TAKEOVER_FILE,
  STORE_LOCK_TAKEOVER_VISIBLE_MS,
} from "../../src/prolog/store-lock.js";

const roots: string[] = [];
const children: Array<ReturnType<typeof spawn>> = [];
afterEach(() => {
  for (const child of children.splice(0)) child.kill("SIGKILL");
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const DEAD_PID = 2_147_000_000;

function workspace(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "kibi-janitor-mut-")));
  roots.push(root);
  return root;
}

function store(
  root: string,
  name: string,
  journal: Record<string, unknown> | null,
  storageJson = true,
): string {
  const path = join(root, ".kb", "branches", name);
  mkdirSync(join(path, "rdf"), { recursive: true });
  if (storageJson) writeFileSync(join(path, "storage.json"), "{}");
  writeFileSync(join(path, "rdf", "lock"), "held");
  if (journal !== null)
    writeFileSync(join(path, ".kibi-lock-owner.json"), JSON.stringify(journal));
  return path;
}

function sleeper(): ReturnType<typeof spawn> {
  const child = spawn("sleep", ["30"], { stdio: "ignore" });
  children.push(child);
  return child;
}

describe("sweepStoreLock", () => {
  test("no journal, no finding", () => {
    expect(sweepStoreLock(store(workspace(), "a", null), true)).toBeNull();
  });

  test("a journal without optional fields reports only what it has", () => {
    const path = store(workspace(), "a", { pid: DEAD_PID });
    expect(sweepStoreLock(path, false)).toStrictEqual({
      kind: "store-lock",
      storePath: path,
      pid: DEAD_PID,
      holderState: "dead",
      workspaceExists: false,
      action: "clean",
    });
    const unknown = store(workspace(), "b", {
      startedAt: "2026-01-01T00:00:00Z",
    });
    expect(sweepStoreLock(unknown, true)).toStrictEqual({
      kind: "store-lock",
      storePath: unknown,
      startedAt: "2026-01-01T00:00:00Z",
      holderState: "unknown",
      workspaceExists: false,
      action: "keep",
    });
    expect(existsSync(join(unknown, "rdf", "lock"))).toBe(true);
  });

  test("this process with a removed workspace is reported for killing", () => {
    const root = workspace();
    const gone = join(root, "removed");
    const path = store(root, "a", {
      pid: process.pid,
      workspaceRoot: gone,
      startedAt: "s",
    });
    expect(sweepStoreLock(path, false)).toStrictEqual({
      kind: "store-lock",
      storePath: path,
      workspaceRoot: gone,
      pid: process.pid,
      startedAt: "s",
      holderState: "self",
      workspaceExists: false,
      action: "kill-and-clean",
    });
    expect(existsSync(join(path, "rdf", "lock"))).toBe(true);
  });

  test("a live holder of an existing workspace is kept", () => {
    const root = workspace();
    const path = store(root, "a", { pid: process.pid, workspaceRoot: root });
    expect(sweepStoreLock(path, true)?.action).toBe("keep");
    expect(sweepStoreLock(path, true)?.workspaceExists).toBe(true);
    expect(existsSync(join(path, "rdf", "lock"))).toBe(true);
  });

  test("a live holder of a removed workspace is stopped and cleaned", async () => {
    const root = workspace();
    const child = sleeper();
    const exited = new Promise((resolve) =>
      child.once("exit", (_code, signal) => resolve(signal)),
    );
    const path = store(root, "a", {
      pid: child.pid,
      workspaceRoot: join(root, "removed"),
    });
    const report = sweepStoreLock(path, false);
    expect(report?.holderState).toBe("alive");
    expect(report?.action).toBe("kill-and-clean");
    expect(existsSync(join(path, "rdf", "lock"))).toBe(true);
    expect(sweepStoreLock(path, true)?.action).toBe("kill-and-clean");
    expect(await exited).toBe("SIGTERM");
    expect(existsSync(join(path, "rdf", "lock"))).toBe(false);
  });

  test("a live holder or an unknown one without a removed workspace is kept", () => {
    const root = workspace();
    const self = store(root, "a", { pid: process.pid });
    expect(sweepStoreLock(self, false)?.action).toBe("keep");
    const unknown = store(root, "b", { workspaceRoot: join(root, "removed") });
    expect(sweepStoreLock(unknown, true)?.action).toBe("keep");
    expect(existsSync(join(unknown, "rdf", "lock"))).toBe(true);
  });

  // Boot ids are read from /proc on Linux only.
  test.skipIf(process.platform !== "linux")(
    "a holder from another boot is cleaned but never signalled",
    async () => {
      const root = workspace();
      const child = sleeper();
      const path = store(root, "a", {
        pid: child.pid,
        bootId: "boot-other-universe",
        workspaceRoot: join(root, "removed"),
      });
      const report = sweepStoreLock(path, true);
      expect(report?.holderState).toBe("dead");
      expect(report?.action).toBe("clean");
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(child.exitCode).toBeNull();
      expect(child.signalCode).toBeNull();
    },
  );

  test("a dead holder whose kill would fail is still cleaned", () => {
    const root = workspace();
    const path = store(root, "a", { pid: DEAD_PID });
    expect(sweepStoreLock(path, true)?.action).toBe("clean");
    expect(existsSync(join(path, "rdf", "lock"))).toBe(false);
  });
});

describe("sweepWorkspaceStoreLocks", () => {
  test("a workspace without branch stores has no findings", () => {
    expect(
      sweepWorkspaceStoreLocks({
        workspaceRoot: workspace(),
        runtimeDirectory: "/x",
      }),
    ).toStrictEqual([]);
  });

  test("scans stores with storage.json and a journal, applying on request", () => {
    const root = workspace();
    const live = store(root, "a", { pid: DEAD_PID });
    store(root, "b", { pid: DEAD_PID }, false);
    store(root, "c", null);
    const options = { workspaceRoot: root, runtimeDirectory: "/x" };
    expect(
      sweepWorkspaceStoreLocks(options).map((finding) => finding.storePath),
    ).toStrictEqual([live]);
    expect(existsSync(join(live, "rdf", "lock"))).toBe(true);
    sweepWorkspaceStoreLocks({ ...options, apply: true });
    expect(existsSync(join(live, "rdf", "lock"))).toBe(false);
  });
});

describe("sweepStoreLockTakeoverRecords", () => {
  const NOW = new Date("2026-06-01T00:00:00.000Z");
  const at = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

  test("a workspace without branch stores has no findings", () => {
    expect(
      sweepStoreLockTakeoverRecords({
        workspaceRoot: workspace(),
        runtimeDirectory: "/x",
      }),
    ).toStrictEqual([]);
  });

  test("reports records older than the window, keeping the boundary", () => {
    const root = workspace();
    const old = store(root, "a", null);
    const edge = store(root, "b", null);
    store(root, "c", null);
    const record = (path: string, value: unknown) =>
      writeFileSync(
        join(path, STORE_LOCK_TAKEOVER_FILE),
        JSON.stringify(value),
      );
    record(old, {
      brokenPid: 42,
      reason: "r",
      at: at(STORE_LOCK_TAKEOVER_VISIBLE_MS + 1),
    });
    record(edge, {
      brokenPid: null,
      reason: "r",
      at: at(STORE_LOCK_TAKEOVER_VISIBLE_MS),
    });
    const options = { workspaceRoot: root, runtimeDirectory: "/x", now: NOW };
    expect(sweepStoreLockTakeoverRecords(options)).toStrictEqual([
      {
        kind: "takeover-record",
        storePath: old,
        recordPath: join(old, STORE_LOCK_TAKEOVER_FILE),
        at: at(STORE_LOCK_TAKEOVER_VISIBLE_MS + 1),
        brokenPid: 42,
        action: "clean",
      },
    ]);
    expect(existsSync(join(old, STORE_LOCK_TAKEOVER_FILE))).toBe(true);
    sweepStoreLockTakeoverRecords({ ...options, apply: true });
    expect(existsSync(join(old, STORE_LOCK_TAKEOVER_FILE))).toBe(false);
    expect(existsSync(join(edge, STORE_LOCK_TAKEOVER_FILE))).toBe(true);
  });

  test("an unreadable record is dated by its mtime and has no pid", () => {
    const root = workspace();
    const path = store(root, "a", null);
    const file = join(path, STORE_LOCK_TAKEOVER_FILE);
    writeFileSync(file, "{broken");
    const mtime = new Date(NOW.getTime() - 2 * STORE_LOCK_TAKEOVER_VISIBLE_MS);
    utimesSync(file, mtime, mtime);
    expect(
      sweepStoreLockTakeoverRecords({
        workspaceRoot: root,
        runtimeDirectory: "/x",
        now: NOW,
      }),
    ).toStrictEqual([
      {
        kind: "takeover-record",
        storePath: path,
        recordPath: file,
        at: mtime.toISOString(),
        action: "clean",
      },
    ]);
  });

  test("defaults to the current time", () => {
    const root = workspace();
    const path = store(root, "a", null);
    writeFileSync(
      join(path, STORE_LOCK_TAKEOVER_FILE),
      JSON.stringify({
        brokenPid: null,
        reason: "r",
        at: new Date().toISOString(),
      }),
    );
    expect(
      sweepStoreLockTakeoverRecords({
        workspaceRoot: root,
        runtimeDirectory: "/x",
      }),
    ).toStrictEqual([]);
  });
});

describe("sweepRuntimeSockets", () => {
  function runtime(entries: Record<string, string | null>): string {
    const directory = workspace();
    for (const [name, pid] of Object.entries(entries)) {
      writeFileSync(join(directory, name), "");
      if (pid !== null) writeFileSync(join(directory, `${name}.pid`), pid);
    }
    return directory;
  }

  test("does nothing unless asked for all sockets or with no directory", () => {
    const directory = runtime({ "a.sock": String(DEAD_PID) });
    expect(
      sweepRuntimeSockets({ workspaceRoot: "/x", runtimeDirectory: directory }),
    ).toStrictEqual([]);
    expect(
      sweepRuntimeSockets({
        workspaceRoot: "/x",
        runtimeDirectory: join(directory, "missing"),
        all: true,
      }),
    ).toStrictEqual([]);
  });

  test("classifies each socket by its pid file", () => {
    const directory = runtime({
      "dead.sock": ` ${DEAD_PID}\n`,
      "live.sock": String(process.pid),
      "none.sock": null,
      "junk.sock": "abc",
      "zero.sock": "0",
      "negative.sock": "-5",
      "other.txt": String(DEAD_PID),
    });
    const findings = sweepRuntimeSockets({
      workspaceRoot: "/x",
      runtimeDirectory: directory,
      all: true,
    });
    const socket = (name: string) => join(directory, name);
    expect(
      [...findings].sort((a, b) => a.socketPath.localeCompare(b.socketPath)),
    ).toStrictEqual([
      {
        kind: "socket",
        socketPath: socket("dead.sock"),
        pid: DEAD_PID,
        holderState: "dead",
        action: "clean",
      },
      {
        kind: "socket",
        socketPath: socket("junk.sock"),
        holderState: "unknown",
        action: "keep",
      },
      {
        kind: "socket",
        socketPath: socket("live.sock"),
        pid: process.pid,
        holderState: "alive",
        action: "keep",
      },
      {
        kind: "socket",
        socketPath: socket("negative.sock"),
        holderState: "unknown",
        action: "keep",
      },
      {
        kind: "socket",
        socketPath: socket("none.sock"),
        holderState: "unknown",
        action: "keep",
      },
      {
        kind: "socket",
        socketPath: socket("zero.sock"),
        holderState: "unknown",
        action: "keep",
      },
    ]);
    expect(existsSync(socket("dead.sock"))).toBe(true);
    sweepRuntimeSockets({
      workspaceRoot: "/x",
      runtimeDirectory: directory,
      all: true,
      apply: true,
    });
    expect(existsSync(socket("dead.sock"))).toBe(false);
    expect(existsSync(socket("dead.sock.pid"))).toBe(false);
    expect(existsSync(socket("live.sock"))).toBe(true);
    expect(existsSync(socket("live.sock.pid"))).toBe(true);
  });
});

describe("runJanitor", () => {
  test("concatenates store, takeover and socket findings in order", () => {
    const root = workspace();
    const path = store(root, "a", { pid: DEAD_PID });
    writeFileSync(
      join(path, STORE_LOCK_TAKEOVER_FILE),
      JSON.stringify({
        brokenPid: 1,
        reason: "r",
        at: "2000-01-01T00:00:00.000Z",
      }),
    );
    const directory = workspace();
    writeFileSync(join(directory, "x.sock"), "");
    expect(
      runJanitor({
        workspaceRoot: root,
        runtimeDirectory: directory,
        all: true,
      }).map((finding) => finding.kind),
    ).toStrictEqual(["store-lock", "takeover-record", "socket"]);
  });
});
