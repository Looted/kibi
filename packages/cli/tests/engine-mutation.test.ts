import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import * as childProcess from "node:child_process";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import * as net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ENGINE_IDLE_CHECK_INTERVAL_MS,
  ENGINE_IDLE_TIMEOUT_MS,
  ENGINE_PACKAGE_VERSIONS,
  ENGINE_PROLOG_EXIT_GRACE_MS,
  ENGINE_PROTOCOL_VERSION,
  EngineClient,
  EngineSession,
  acquireEnginePublicationLease,
  daemonNodePath,
  engineAttachmentsMatch,
  enginePackageVersions,
  enginePidPath,
  enginePublicationLockPath,
  engineSidecarPath,
  engineSocketPath,
  engineStartLockPath,
  engineSwiplIdentity,
  ensureJournaledBranchStoreAsync,
  formatEngineAttachmentMismatch,
  fsyncJournaledBranchStore,
  parseEngineAttachmentIdentity,
  readEngineAttachmentIdentity,
  readJournalGeneration,
  requestEngineSignalShutdown,
  runEngineDaemon,
  runtimeDirectory,
} from "../src/engine.js";
import * as perf from "../src/performance-trace.js";
import { PrologProcess } from "../src/prolog.js";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../src/utils/branch-store-locator.js";

// Every Prolog process here is a stub on PrologProcess.prototype, and every
// daemon runs in this process on a private Unix socket: no SWI-Prolog runs.

const ENV_KEYS = [
  "KIBI_RUNTIME_DIR",
  "XDG_RUNTIME_DIR",
  "KIBI_NODE_PATH",
  "KIBI_ENGINE_IDLE_TIMEOUT_MS",
  "KIBI_ENGINE_WORKSPACE_WATCHDOG_MS",
  "KIBI_ENGINE_READ_TIME_LIMIT_MS",
  "KIBI_ENGINE_READ_INFERENCE_LIMIT",
  "KIBI_PERF_TIMINGS",
  "NODE_ENV",
  "KIBI_KB_PL_PATH",
  "TMPDIR",
] as const;
const savedEnv: Record<string, string | undefined> = {};
const roots: string[] = [];
const cleanups: Array<() => Promise<void> | void> = [];
const baseSigterm = process.listeners("SIGTERM").slice();
const baseSigint = process.listeners("SIGINT").slice();
let runtime = "";

function tempDir(prefix = "kibi-engine-mut-"): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  for (const key of ENV_KEYS) Reflect.deleteProperty(process.env, key);
  runtime = tempDir("kibi-rt-");
  process.env.KIBI_RUNTIME_DIR = runtime;
});

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  mock.restore();
  process.removeAllListeners("SIGTERM");
  process.removeAllListeners("SIGINT");
  for (const listener of baseSigterm)
    process.on("SIGTERM", listener as (...args: unknown[]) => void);
  for (const listener of baseSigint)
    process.on("SIGINT", listener as (...args: unknown[]) => void);
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = savedEnv[key];
  }
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const JOURNAL_MARKER = '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n';
const SENTINEL = "KIBI_STORAGE_FORMAT=kibi.rdf-journal.v1\n";

describe("constants and identities", () => {
  test("publish the protocol constants", () => {
    expect([
      ENGINE_PROTOCOL_VERSION,
      ENGINE_IDLE_TIMEOUT_MS,
      ENGINE_IDLE_CHECK_INTERVAL_MS,
      ENGINE_PROLOG_EXIT_GRACE_MS,
    ]).toStrictEqual([1, 600_000, 30_000, 1000]);
    expect(ENGINE_PACKAGE_VERSIONS).toBe(enginePackageVersions());
    expect(engineSwiplIdentity()).toContain("@");
  });

  test("shut down on a signal without waiting", () => {
    let calls = 0;
    const handler = requestEngineSignalShutdown(() => {
      calls += 1;
      return new Promise(() => {});
    });
    expect(handler()).toBeUndefined();
    expect(calls).toBe(1);
  });

  test("choose the daemon's Node binary", () => {
    expect(daemonNodePath({ KIBI_NODE_PATH: "/opt/node" })).toBe("/opt/node");
    expect(daemonNodePath({ KIBI_NODE_PATH: "" })).toBe("node");
    expect(daemonNodePath({})).toBe("node");
    process.env.KIBI_NODE_PATH = "/env/node";
    expect(daemonNodePath()).toBe("/env/node");
  });
});

describe("attachment identity", () => {
  test("read the journal generation", () => {
    const store = tempDir();
    expect(readJournalGeneration(store)).toBe("");
    writeFileSync(path.join(store, "CURRENT"), "  generation-3:7 \n");
    expect(readJournalGeneration(store)).toBe("generation-3:7");
  });

  test("read the identity of a live branch store", () => {
    const store = tempDir();
    expect(readEngineAttachmentIdentity(path.join(store, "none"))).toBeNull();
    writeFileSync(path.join(store, "CURRENT"), "g-1\n");
    const stats = statSync(store);
    expect(readEngineAttachmentIdentity(store)).toStrictEqual({
      path: fs.realpathSync(store),
      generation: "g-1",
      dev: stats.dev,
      ino: stats.ino,
    });
    const alias = path.join(tempDir(), "alias");
    symlinkSync(store, alias);
    expect(readEngineAttachmentIdentity(alias)?.path).toBe(
      fs.realpathSync(store),
    );
  });

  test("keep the resolved path when realpath fails", () => {
    const store = tempDir();
    spyOn(fs, "realpathSync").mockImplementation((() => {
      throw new Error("gone");
    }) as never);
    expect(readEngineAttachmentIdentity(`${store}/.`)?.path).toBe(store);
  });

  test("parse a double-encoded status", () => {
    const encode = (value: unknown) => JSON.stringify(JSON.stringify(value));
    const full = {
      attachedPath: "/s",
      attachedGeneration: "g",
      attachedDev: 1,
      attachedIno: 2,
    };
    expect(parseEngineAttachmentIdentity(undefined)).toBeNull();
    expect(parseEngineAttachmentIdentity(encode(full))).toStrictEqual({
      path: "/s",
      generation: "g",
      dev: 1,
      ino: 2,
    });
    for (const broken of [
      { ...full, attachedPath: 1 },
      { ...full, attachedGeneration: 1 },
      { ...full, attachedDev: "1" },
      { ...full, attachedIno: "2" },
    ]) {
      expect(parseEngineAttachmentIdentity(encode(broken))).toBeNull();
    }
    expect(parseEngineAttachmentIdentity("{not json")).toBeNull();
  });

  test("match attachments by inode, else by generation", () => {
    const id = (over: Partial<Record<string, unknown>> = {}) => ({
      path: "/s",
      generation: "g",
      dev: 1,
      ino: 2,
      ...over,
    });
    expect(engineAttachmentsMatch(null, id() as never)).toBe(false);
    expect(engineAttachmentsMatch(id() as never, null)).toBe(false);
    expect(engineAttachmentsMatch(id() as never, id() as never)).toBe(true);
    expect(
      engineAttachmentsMatch(id() as never, id({ path: "/t" }) as never),
    ).toBe(false);
    expect(
      engineAttachmentsMatch(
        id() as never,
        id({ dev: 9, generation: "g" }) as never,
      ),
    ).toBe(false);
    expect(engineAttachmentsMatch(id() as never, id({ ino: 3 }) as never)).toBe(
      false,
    );
    expect(
      engineAttachmentsMatch(
        id({ ino: 0 }) as never,
        id({ dev: 9, ino: 7 }) as never,
      ),
    ).toBe(true);
    expect(
      engineAttachmentsMatch(
        id({ dev: 5 }) as never,
        id({ ino: 0, dev: 9 }) as never,
      ),
    ).toBe(true);
    expect(
      engineAttachmentsMatch(
        id({ ino: 0 }) as never,
        id({ ino: 0, generation: "h" }) as never,
      ),
    ).toBe(false);
    expect(
      engineAttachmentsMatch(
        id({ ino: 0, generation: "" }) as never,
        id({ ino: 0, generation: "" }) as never,
      ),
    ).toBe(false);
  });

  test("describe a mismatch", () => {
    expect(formatEngineAttachmentMismatch("op", null, null)).toBe(
      "operation=op branchStore=missing expectedGeneration=missing attachedPath=missing attachedGeneration=missing",
    );
    expect(
      formatEngineAttachmentMismatch(
        "op",
        { path: "/a", generation: "", dev: 0, ino: 0 },
        { path: "/b", generation: "g2", dev: 0, ino: 0 },
      ),
    ).toBe(
      "operation=op branchStore=/a expectedGeneration=missing attachedPath=/b attachedGeneration=g2",
    );
    expect(
      formatEngineAttachmentMismatch(
        "op",
        { path: "/a", generation: "g1", dev: 0, ino: 0 },
        { path: "/b", generation: "", dev: 0, ino: 0 },
      ),
    ).toBe(
      "operation=op branchStore=/a expectedGeneration=g1 attachedPath=/b attachedGeneration=missing",
    );
  });
});

function sha(value: string, length = 32): string {
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function fallbackFor(identity: string): string {
  const dir = path.join("/tmp", `kb-${process.geteuid?.()}-${sha(identity)}`);
  roots.push(dir);
  return dir;
}

function captureStderr(): string[] {
  const lines: string[] = [];
  spyOn(process.stderr, "write").mockImplementation(((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  }) as never);
  return lines;
}

describe("runtime directory", () => {
  test("use a private configured directory", () => {
    expect(runtimeDirectory()).toBe(fs.realpathSync(runtime));
    Reflect.deleteProperty(process.env, "KIBI_RUNTIME_DIR");
    const xdg = tempDir();
    process.env.XDG_RUNTIME_DIR = xdg;
    expect(runtimeDirectory()).toBe(fs.realpathSync(xdg));
    const created = path.join(xdg, "nested", "dir");
    process.env.XDG_RUNTIME_DIR = created;
    expect(runtimeDirectory()).toBe(fs.realpathSync(created));
    expect(statSync(created).mode & 0o777).toBe(0o700);
    expect(readdirSync(created)).toStrictEqual([]);
  });

  test("default to /tmp/kibi-runtime on Linux", () => {
    Reflect.deleteProperty(process.env, "KIBI_RUNTIME_DIR");
    Reflect.deleteProperty(process.env, "XDG_RUNTIME_DIR");
    process.env.TMPDIR = tempDir();
    const lstat = fs.lstatSync;
    spyOn(fs, "lstatSync").mockImplementation(((file: string) => {
      const stats = lstat(file);
      if (file !== "/tmp/kibi-runtime") return stats;
      return Object.assign(Object.create(stats), {
        isSymbolicLink: () => false,
        isDirectory: () => true,
        uid: process.geteuid?.(),
        mode: 0o40700,
      });
    }) as never);
    expect(runtimeDirectory()).toBe("/tmp/kibi-runtime");
  });

  test("fall back once, with a warning, from an unusable directory", () => {
    const lines = captureStderr();
    const target = tempDir();
    const link = path.join(tempDir(), "link");
    symlinkSync(target, link);
    process.env.KIBI_RUNTIME_DIR = link;
    const fallback = fallbackFor(fs.realpathSync(target));
    expect(runtimeDirectory()).toBe(fallback);
    expect(runtimeDirectory()).toBe(fallback);
    expect(lines).toStrictEqual([
      `kibi: ignoring KIBI_RUNTIME_DIR=${link} because it is a symbolic link; using a private directory under /tmp instead.\n`,
    ]);
  });

  test("name every reason a directory is refused", () => {
    const lines = captureStderr();
    const euid = process.geteuid?.() as number;
    const open = tempDir();
    chmodSync(open, 0o755);
    const file = path.join(tempDir(), "file");
    writeFileSync(file, "");
    const foreign = tempDir();
    const long = path.join(tempDir(), "x".repeat(100));
    const dangling = path.join(tempDir(), "dangling");
    symlinkSync(path.join(tempDir(), "missing"), dangling);
    const lstat = fs.lstatSync;
    spyOn(fs, "lstatSync").mockImplementation(((target: string) => {
      const stats = lstat(target);
      if (target !== foreign) return stats;
      return Object.assign(Object.create(stats), { uid: euid + 1 });
    }) as never);
    const cases: Array<[string, string, string]> = [
      [
        open,
        open,
        "its mode is 0755; it must be private to its owner (chmod 700)",
      ],
      [file, file, ""],
      [
        foreign,
        foreign,
        `it is owned by uid ${euid + 1}, not by the current user (uid ${euid})`,
      ],
      [long, long, "its path is too long for a Unix socket (at most 64 bytes)"],
      [dangling, dangling, "it is a symbolic link"],
    ];
    for (const [dir, identity, reason] of cases) {
      process.env.KIBI_RUNTIME_DIR = dir;
      expect(runtimeDirectory()).toBe(fallbackFor(identity));
      const line = lines.at(-1) as string;
      if (reason !== "")
        expect(line).toBe(
          `kibi: ignoring KIBI_RUNTIME_DIR=${dir} because ${reason}; using a private directory under /tmp instead.\n`,
        );
      else
        expect(
          line.startsWith(
            `kibi: ignoring KIBI_RUNTIME_DIR=${dir} because it is not usable (`,
          ),
        ).toBe(true);
    }
    expect(lines).toHaveLength(5);
  });

  test("refuse a directory whose status cannot be read", () => {
    const lines = captureStderr();
    const dir = tempDir();
    const lstat = fs.lstatSync;
    let first = true;
    spyOn(fs, "lstatSync").mockImplementation(((target: string) => {
      if (target === dir && first) {
        first = false;
        throw Object.assign(new Error("EACCES: denied"), { code: "EACCES" });
      }
      return lstat(target);
    }) as never);
    process.env.KIBI_RUNTIME_DIR = dir;
    expect(runtimeDirectory()).toBe(fallbackFor(dir));
    expect(lines).toStrictEqual([
      `kibi: ignoring KIBI_RUNTIME_DIR=${dir} because it is not usable (EACCES: denied); using a private directory under /tmp instead.\n`,
    ]);
  });

  test("accept a socket path of exactly the Unix limit", () => {
    const base = fs.realpathSync(tempDir());
    const fits = path.join(base, "y".repeat(64 - base.length - 1));
    process.env.KIBI_RUNTIME_DIR = fits;
    expect(runtimeDirectory()).toBe(fits);
    const lines = captureStderr();
    const over = path.join(base, "z".repeat(64 - base.length));
    process.env.KIBI_RUNTIME_DIR = over;
    expect(runtimeDirectory()).toBe(fallbackFor(over));
    expect(lines).toStrictEqual([
      `kibi: ignoring KIBI_RUNTIME_DIR=${over} because its path is too long for a Unix socket (at most 64 bytes); using a private directory under /tmp instead.\n`,
    ]);
  });

  test("refuse a directory that is not a directory", () => {
    const lines = captureStderr();
    const dir = tempDir();
    const lstat = fs.lstatSync;
    let calls = 0;
    spyOn(fs, "lstatSync").mockImplementation(((target: string) => {
      const stats = lstat(target);
      if (target !== dir) return stats;
      calls += 1;
      return Object.assign(Object.create(stats), {
        isDirectory: () => calls === 1,
      });
    }) as never);
    process.env.KIBI_RUNTIME_DIR = dir;
    expect(runtimeDirectory()).toBe(fallbackFor(dir));
    expect(lines).toStrictEqual([
      `kibi: ignoring KIBI_RUNTIME_DIR=${dir} because it is not a directory; using a private directory under /tmp instead.\n`,
    ]);
  });

  test("probe that the directory is writable", () => {
    const lines = captureStderr();
    const open = fs.openSync;
    const probes: string[] = [];
    spyOn(fs, "openSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      if (String(file).includes(".kibi-write-")) {
        probes.push(String(file));
        expect(rest).toStrictEqual(["wx", 0o600]);
        throw new Error("read-only");
      }
      return (open as (...args: unknown[]) => number)(file, ...rest);
    }) as never);
    expect(() => runtimeDirectory()).toThrow(
      "Unable to create a writable Kibi engine runtime directory",
    );
    fallbackFor(fs.realpathSync(runtime));
    expect(lines).toStrictEqual([
      `kibi: ignoring KIBI_RUNTIME_DIR=${runtime} because it is not usable (read-only); using a private directory under /tmp instead.\n`,
    ]);
    expect(probes).toHaveLength(2);
    expect(
      probes[0]?.startsWith(`${fs.realpathSync(runtime)}/.kibi-write-`),
    ).toBe(true);
  });

  test("leave a probe behind for no directory", () => {
    runtimeDirectory();
    expect(readdirSync(runtime)).toStrictEqual([]);
  });

  test("warn only about an explicit KIBI_RUNTIME_DIR", () => {
    const lines = captureStderr();
    Reflect.deleteProperty(process.env, "KIBI_RUNTIME_DIR");
    const open = tempDir();
    chmodSync(open, 0o755);
    process.env.XDG_RUNTIME_DIR = open;
    expect(runtimeDirectory()).toBe(fallbackFor(open));
    expect(lines).toStrictEqual([]);
  });

  test("need an effective user id", () => {
    const original = process.geteuid;
    Object.defineProperty(process, "geteuid", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      expect(() => runtimeDirectory()).toThrow(
        "Kibi engine runtime euid unavailable",
      );
    } finally {
      process.geteuid = original;
    }
  });
});

describe("engine paths", () => {
  test("derive every path from the workspace and branch", () => {
    const workspace = tempDir();
    const real = fs.realpathSync(workspace);
    const socket = path.join(
      fs.realpathSync(runtime),
      `kibi-${sha(`${real}\0main`)}.sock`,
    );
    expect(engineSocketPath(`${workspace}/.`, "main")).toBe(socket);
    expect(enginePidPath(workspace, "main")).toBe(`${socket}.pid`);
    expect(engineStartLockPath(workspace, "main")).toBe(`${socket}.start.lock`);
    expect(enginePublicationLockPath(workspace, "main")).toBe(
      `${socket}.publish.lock`,
    );
    expect(engineSocketPath(workspace, "dev")).not.toBe(socket);
  });

  test("keep a named pipe's files in the runtime directory", () => {
    expect(engineSidecarPath("/run/kibi-a.sock", ".error")).toBe(
      "/run/kibi-a.sock.error",
    );
    expect(engineSidecarPath("\\\\.\\pipe\\kibi-abc", ".error")).toBe(
      path.join(runtimeDirectory(), "kibi-abc.error"),
    );
    expect(engineSidecarPath("\\\\.\\pipe\\kibi-abc", ".publish.lock")).toBe(
      path.join(runtimeDirectory(), "kibi-abc.publish.lock"),
    );
  });
});

describe("durability barrier", () => {
  test("fsync journal files, metadata and directories leaves first", () => {
    const store = tempDir();
    mkdirSync(path.join(store, "rdf", "a", "b"), { recursive: true });
    writeFileSync(path.join(store, "rdf", "j1"), "x");
    writeFileSync(path.join(store, "rdf", "lock"), "x");
    writeFileSync(path.join(store, "rdf", "a", "b", "j2"), "x");
    symlinkSync(path.join(store, "rdf", "j1"), path.join(store, "rdf", "ln"));
    writeFileSync(path.join(store, "CURRENT"), "g");
    writeFileSync(path.join(store, "kb.rdf"), "s");
    const opened: string[] = [];
    const open = fs.openSync;
    spyOn(fs, "openSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      opened.push(String(file));
      return (open as (...args: unknown[]) => number)(file, ...rest);
    }) as never);
    const synced: number[] = [];
    const fsync = fs.fsyncSync;
    spyOn(fs, "fsyncSync").mockImplementation(((fd: number) => {
      synced.push(fd);
      fsync(fd);
    }) as never);
    const closed: number[] = [];
    const close = fs.closeSync;
    spyOn(fs, "closeSync").mockImplementation(((fd: number) => {
      closed.push(fd);
      close(fd);
    }) as never);
    fsyncJournaledBranchStore(store);
    // Journal files come in directory-listing order, which the filesystem
    // decides; everything after them has a fixed order.
    expect(opened.slice(0, 2).sort()).toStrictEqual(
      [
        path.join(store, "rdf", "j1"),
        path.join(store, "rdf", "a", "b", "j2"),
      ].sort(),
    );
    expect(opened.slice(2)).toStrictEqual([
      path.join(store, "CURRENT"),
      path.join(store, "kb.rdf"),
      path.join(store, "rdf", "a", "b"),
      path.join(store, "rdf", "a"),
      path.join(store, "rdf"),
      store,
    ]);
    expect(synced).toHaveLength(8);
    expect(closed).toStrictEqual(synced);
  });

  test("close a descriptor whose fsync failed", () => {
    const store = tempDir();
    writeFileSync(path.join(store, "CURRENT"), "g");
    spyOn(fs, "fsyncSync").mockImplementation((() => {
      throw new Error("EIO");
    }) as never);
    const closed: number[] = [];
    const close = fs.closeSync;
    spyOn(fs, "closeSync").mockImplementation(((fd: number) => {
      closed.push(fd);
      close(fd);
    }) as never);
    expect(() => fsyncJournaledBranchStore(store)).toThrow("EIO");
    expect(closed).toHaveLength(1);
    spyOn(fs, "openSync").mockImplementation((() => {
      throw new Error("EACCES");
    }) as never);
    expect(() => fsyncJournaledBranchStore(store)).toThrow("EACCES");
    expect(closed).toHaveLength(1);
  });

  test("sync only the branch directory without a journal, and nothing for a missing one", () => {
    const store = tempDir();
    const opened: string[] = [];
    const open = fs.openSync;
    spyOn(fs, "openSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      opened.push(String(file));
      return (open as (...args: unknown[]) => number)(file, ...rest);
    }) as never);
    fsyncJournaledBranchStore(store);
    fsyncJournaledBranchStore(path.join(store, "missing"));
    expect(opened).toStrictEqual([store]);
  });

  test("open files writable and skip directories on Windows", () => {
    const store = tempDir();
    mkdirSync(path.join(store, "rdf"), { recursive: true });
    writeFileSync(path.join(store, "rdf", "j1"), "x");
    writeFileSync(path.join(store, "CURRENT"), "g");
    const opened: Array<[string, unknown]> = [];
    const open = fs.openSync;
    spyOn(fs, "openSync").mockImplementation(((
      file: string,
      flags: unknown,
      ...rest: unknown[]
    ) => {
      opened.push([String(file), flags]);
      return (open as (...args: unknown[]) => number)(file, flags, ...rest);
    }) as never);
    fsyncJournaledBranchStore(store, "win32");
    expect(opened).toStrictEqual([
      [path.join(store, "rdf", "j1"), "r+"],
      [path.join(store, "CURRENT"), "r+"],
    ]);
    opened.length = 0;
    fsyncJournaledBranchStore(store, "linux");
    expect(opened.map(([, flags]) => flags)).toStrictEqual([
      "r",
      "r",
      "r",
      "r",
    ]);
  });
});

const DEAD_PID = 2_147_483_000;

function age(file: string, ms: number): void {
  const when = new Date(Date.now() - ms);
  utimesSync(file, when, when);
}

describe("publication lease", () => {
  test("hold the publication and start locks until released", () => {
    const workspace = tempDir();
    const lockPath = enginePublicationLockPath(workspace, "main");
    const startPath = engineStartLockPath(workspace, "main");
    const now = Date.now();
    spyOn(Date, "now").mockReturnValue(now);
    const lease = acquireEnginePublicationLease(workspace, "main");
    expect(lease.path).toBe(lockPath);
    expect(readFileSync(lockPath, "utf8")).toBe(`${process.pid}:${now}\n`);
    expect(readFileSync(startPath, "utf8")).toBe(`${process.pid}:${now}\n`);
    expect(statSync(lockPath).mode & 0o777).toBe(0o600);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      `Kibi engine publication is already in progress: ${lockPath}`,
    );
    lease.release();
    expect([existsSync(lockPath), existsSync(startPath)]).toStrictEqual([
      false,
      false,
    ]);
    writeFileSync(lockPath, "other");
    lease.release();
    expect(existsSync(lockPath)).toBe(true);
  });

  test("create a missing runtime directory privately", () => {
    const workspace = tempDir();
    const nested = path.join(runtime, "deeper");
    process.env.KIBI_RUNTIME_DIR = nested;
    acquireEnginePublicationLease(workspace, "main").release();
    expect(statSync(nested).mode & 0o777).toBe(0o700);
  });

  test("replace only a stale publication lock", () => {
    const workspace = tempDir();
    const lockPath = enginePublicationLockPath(workspace, "main");
    mkdirSync(path.dirname(lockPath), { recursive: true });
    const attempt = (content: string, ms: number): string => {
      writeFileSync(lockPath, content);
      age(lockPath, ms);
      try {
        acquireEnginePublicationLease(workspace, "main").release();
        return "acquired";
      } catch (error) {
        return (error as Error).message;
      }
    };
    const busy = `Kibi engine publication is already in progress: ${lockPath}`;
    expect(attempt(`${DEAD_PID}:1\n`, 6000)).toBe("acquired");
    expect(attempt("garbage", 6000)).toBe("acquired");
    expect(attempt("1:1", 6000)).toBe("acquired");
    expect(attempt(`${DEAD_PID}:x`, 6000)).toBe("acquired");
    expect(attempt(`${DEAD_PID}:1\n`, 4000)).toBe(busy);
    expect(attempt(`${process.pid}:1\n`, 6000)).toBe(busy);
    expect(attempt(`${process.pid}:1\n`, 5000 + 50)).toBe(busy);
  });

  test("keep a lock it cannot inspect or remove", () => {
    const workspace = tempDir();
    const lockPath = enginePublicationLockPath(workspace, "main");
    mkdirSync(path.dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, `${DEAD_PID}:1\n`);
    age(lockPath, 6000);
    const busy = `Kibi engine publication is already in progress: ${lockPath}`;
    const stat = fs.statSync;
    const statSpy = spyOn(fs, "statSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      if (file === lockPath) throw new Error("EACCES");
      return (stat as (...args: unknown[]) => unknown)(file, ...rest);
    }) as never);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      busy,
    );
    statSpy.mockRestore();
    const unlink = fs.unlinkSync;
    const unlinkSpy = spyOn(fs, "unlinkSync").mockImplementation(((
      file: string,
    ) => {
      if (file === lockPath) throw new Error("EBUSY");
      unlink(file);
    }) as never);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      busy,
    );
    unlinkSpy.mockRestore();
    const open = fs.openSync;
    let opens = 0;
    spyOn(fs, "openSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      if (file === lockPath) opens += 1;
      if (file === lockPath && opens === 2) throw new Error("EEXIST");
      return (open as (...args: unknown[]) => number)(file, ...rest);
    }) as never);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      busy,
    );
    expect(existsSync(lockPath)).toBe(false);
  });

  test("give the lock back when it cannot be stamped", () => {
    const workspace = tempDir();
    const lockPath = enginePublicationLockPath(workspace, "main");
    const write = fs.writeFileSync;
    spyOn(fs, "writeFileSync").mockImplementation(((
      file: string | number,
      ...rest: unknown[]
    ) => {
      if (typeof file === "number") throw new Error("ENOSPC");
      return (write as (...args: unknown[]) => void)(file, ...rest);
    }) as never);
    const paths = new Map<number, string>();
    const open = fs.openSync;
    spyOn(fs, "openSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      const fd = (open as (...args: unknown[]) => number)(file, ...rest);
      paths.set(fd, String(file));
      return fd;
    }) as never);
    const closed: string[] = [];
    const close = fs.closeSync;
    spyOn(fs, "closeSync").mockImplementation(((fd: number) => {
      closed.push(paths.get(fd) as string);
      close(fd);
    }) as never);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      "ENOSPC",
    );
    expect(existsSync(lockPath)).toBe(false);
    expect(closed.filter((file) => file === lockPath)).toStrictEqual([
      lockPath,
    ]);
  });

  test("refuse the lease while a starter holds the start lock", () => {
    const workspace = tempDir();
    const lockPath = enginePublicationLockPath(workspace, "main");
    const startPath = engineStartLockPath(workspace, "main");
    mkdirSync(path.dirname(startPath), { recursive: true });
    const closed: number[] = [];
    const close = fs.closeSync;
    spyOn(fs, "closeSync").mockImplementation(((fd: number) => {
      closed.push(fd);
      close(fd);
    }) as never);
    const attempt = (content: string, ms: number): boolean => {
      writeFileSync(startPath, content);
      age(startPath, ms);
      try {
        acquireEnginePublicationLease(workspace, "main").release();
        return true;
      } catch (error) {
        expect((error as Error).message).toBe(
          `Kibi engine publication cannot acquire the engine start lease: ${startPath}`,
        );
        expect(existsSync(lockPath)).toBe(false);
        return false;
      }
    };
    // Each refusal leaves the start lock unless it was provably stale.
    expect([attempt("junk", 1000), existsSync(startPath)]).toStrictEqual([
      false,
      true,
    ]);
    expect([attempt("junk", 6000), existsSync(startPath)]).toStrictEqual([
      false,
      false,
    ]);
    expect([attempt(`${DEAD_PID}`, 6000), existsSync(startPath)]).toStrictEqual(
      [false, false],
    );
    expect([
      attempt(`${DEAD_PID}:${Date.now()}`, 6000),
      existsSync(startPath),
    ]).toStrictEqual([false, true]);
    expect([
      attempt(`${DEAD_PID}:${Date.now() - 6000}`, 0),
      existsSync(startPath),
    ]).toStrictEqual([false, false]);
    expect([
      attempt(`${process.pid}:${Date.now() - 6000}`, 6000),
      existsSync(startPath),
    ]).toStrictEqual([false, true]);
    expect([
      attempt(`0:${Date.now() - 6000}`, 0),
      existsSync(startPath),
    ]).toStrictEqual([false, false]);
    expect([
      attempt(`-5:${Date.now() - 6000}`, 0),
      existsSync(startPath),
    ]).toStrictEqual([false, false]);
    expect(closed.length).toBeGreaterThan(0);
  });

  test("treat an unreadable start lock age as fresh", () => {
    const workspace = tempDir();
    const startPath = engineStartLockPath(workspace, "main");
    mkdirSync(path.dirname(startPath), { recursive: true });
    writeFileSync(startPath, "junk");
    age(startPath, 60_000);
    const stat = fs.statSync;
    spyOn(fs, "statSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      if (file === startPath) throw new Error("EACCES");
      return (stat as (...args: unknown[]) => unknown)(file, ...rest);
    }) as never);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      "cannot acquire the engine start lease",
    );
    expect(existsSync(startPath)).toBe(true);
  });

  test("survive a start lock that vanishes while it is read", () => {
    const workspace = tempDir();
    const startPath = engineStartLockPath(workspace, "main");
    mkdirSync(path.dirname(startPath), { recursive: true });
    writeFileSync(startPath, "x");
    const read = fs.readFileSync;
    spyOn(fs, "readFileSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      if (file === startPath) throw new Error("ENOENT");
      return (read as (...args: unknown[]) => unknown)(file, ...rest);
    }) as never);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      "cannot acquire the engine start lease",
    );
  });

  test("release once even when the descriptor is already closed", () => {
    const workspace = tempDir();
    const lease = acquireEnginePublicationLease(workspace, "main");
    const startPath = engineStartLockPath(workspace, "main");
    spyOn(fs, "closeSync").mockImplementation((() => {
      throw new Error("EBADF");
    }) as never);
    const unlink = fs.unlinkSync;
    const unlinked: string[] = [];
    spyOn(fs, "unlinkSync").mockImplementation(((file: string) => {
      unlinked.push(String(file));
      unlink(file);
    }) as never);
    lease.release();
    lease.release();
    expect(unlinked).toStrictEqual([startPath, lease.path]);
  });
});

type Answer = {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
};
type Stub = {
  goals: string[];
  starts: number;
  terminations: Array<{ graceMs?: number } | undefined>;
  instances: PrologProcess[];
  lost: boolean;
  pid: number;
};

function stubProlog(
  answer: (goal: string) => Answer | Promise<Answer> = () => ({
    success: true,
    bindings: {},
  }),
): Stub {
  const stub: Stub = {
    goals: [],
    starts: 0,
    terminations: [],
    instances: [],
    lost: false,
    pid: 7,
  };
  const seen = (self: PrologProcess) => {
    if (!stub.instances.includes(self)) stub.instances.push(self);
  };
  spyOn(PrologProcess.prototype, "start").mockImplementation(async function (
    this: PrologProcess,
  ) {
    seen(this);
    stub.starts += 1;
    stub.lost = false;
  });
  spyOn(PrologProcess.prototype, "query").mockImplementation(async function (
    this: PrologProcess,
    goal: string | string[],
  ) {
    seen(this);
    stub.goals.push(String(goal));
    return answer(String(goal));
  } as never);
  spyOn(PrologProcess.prototype, "terminate").mockImplementation(
    async function (this: PrologProcess, options?: { graceMs?: number }) {
      seen(this);
      stub.terminations.push(options);
    },
  );
  spyOn(PrologProcess.prototype, "needsRestart").mockImplementation(
    () => stub.lost,
  );
  spyOn(PrologProcess.prototype, "getPid").mockImplementation(() => stub.pid);
  return stub;
}

function privateOf(prolog: PrologProcess): Record<string, unknown> {
  return prolog as unknown as Record<string, unknown>;
}

function journalStore(root = tempDir()): string {
  const store = path.join(root, "store");
  mkdirSync(path.join(store, "rdf"), { recursive: true });
  writeFileSync(path.join(store, "storage.json"), JOURNAL_MARKER);
  writeFileSync(path.join(store, "CURRENT"), "generation-2:4\n");
  return store;
}

function takeover(store: string): unknown {
  const file = path.join(store, ".kibi-lock-takeover.json");
  if (!existsSync(file)) return null;
  const record = JSON.parse(readFileSync(file, "utf8")) as Record<
    string,
    unknown
  >;
  return { brokenPid: record.brokenPid, reason: record.reason };
}

describe("journaled branch store", () => {
  test("create an empty journaled store", async () => {
    const store = path.join(tempDir(), "a", "b");
    await ensureJournaledBranchStoreAsync(store);
    expect(readdirSync(store).sort()).toStrictEqual([
      "CURRENT",
      "kb.rdf",
      "rdf",
      "storage.json",
    ]);
    expect(readFileSync(path.join(store, "storage.json"), "utf8")).toBe(
      JOURNAL_MARKER,
    );
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toBe(
      "generation-1:0\n",
    );
    expect(readFileSync(path.join(store, "kb.rdf"), "utf8")).toBe(SENTINEL);
    for (const file of ["storage.json", "CURRENT", "kb.rdf"]) {
      expect(statSync(path.join(store, file)).mode & 0o777).toBe(0o600);
    }
    expect(readdirSync(path.join(store, "rdf"))).toStrictEqual([]);
    await ensureJournaledBranchStoreAsync(store);
    expect(readdirSync(store).sort()).toStrictEqual([
      "CURRENT",
      "kb.rdf",
      "legacy",
      "rdf",
      "storage.json",
    ]);
    expect(statSync(path.join(store, "legacy")).mode & 0o777).toBe(0o700);
  });

  test("finish an interrupted migration of a complete store", async () => {
    const store = journalStore();
    writeFileSync(path.join(store, "kb.rdf"), "<rdf:RDF>old</rdf:RDF>");
    writeFileSync(path.join(store, "audit.log"), "a");
    mkdirSync(path.join(store, "legacy"));
    writeFileSync(path.join(store, "legacy", "kb.rdf"), "first");
    spyOn(Date, "now").mockReturnValue(1234);
    await ensureJournaledBranchStoreAsync(store);
    expect(readdirSync(path.join(store, "legacy")).sort()).toStrictEqual([
      "audit.log",
      "kb.rdf",
      "kb.rdf.recovery.1234",
    ]);
    expect(
      readFileSync(path.join(store, "legacy", "kb.rdf.recovery.1234"), "utf8"),
    ).toBe("<rdf:RDF>old</rdf:RDF>");
    expect(readFileSync(path.join(store, "kb.rdf"), "utf8")).toBe(SENTINEL);
    writeFileSync(path.join(store, "kb.rdf"), `x ${SENTINEL}`);
    await ensureJournaledBranchStoreAsync(store);
    expect(readFileSync(path.join(store, "kb.rdf"), "utf8")).toBe(
      `x ${SENTINEL}`,
    );
  });

  test("restore the newest old generation pair", async () => {
    const store = journalStore();
    rmSync(path.join(store, "rdf"), { recursive: true });
    writeFileSync(path.join(store, "CURRENT"), "torn\n");
    for (const n of ["1", "2"]) {
      mkdirSync(path.join(store, `rdf.old.${n}`));
      writeFileSync(path.join(store, `rdf.old.${n}`, "j"), n);
      writeFileSync(path.join(store, `CURRENT.old.${n}`), `gen-${n}\n`);
    }
    await ensureJournaledBranchStoreAsync(store);
    expect(readFileSync(path.join(store, "rdf", "j"), "utf8")).toBe("2");
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toBe("gen-2\n");
    expect(readFileSync(path.join(store, "kb.rdf"), "utf8")).toBe(SENTINEL);
    expect(existsSync(path.join(store, "legacy"))).toBe(true);
  });

  test("restore each half of a generation on its own", async () => {
    const store = journalStore();
    rmSync(path.join(store, "rdf"), { recursive: true });
    mkdirSync(path.join(store, "rdf.old.1"));
    writeFileSync(path.join(store, "kb.rdf"), SENTINEL);
    await ensureJournaledBranchStoreAsync(store);
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toBe(
      "generation-2:4\n",
    );
    expect(existsSync(path.join(store, "rdf"))).toBe(true);
    const other = journalStore();
    rmSync(path.join(other, "CURRENT"));
    writeFileSync(path.join(other, "CURRENT.old.1"), "old\n");
    await ensureJournaledBranchStoreAsync(other);
    expect(readFileSync(path.join(other, "CURRENT"), "utf8")).toBe("old\n");
    expect(readdirSync(path.join(other, "rdf"))).toStrictEqual([]);
  });

  test("fall back to single restores when the pair cannot move", async () => {
    const store = journalStore();
    rmSync(path.join(store, "rdf"), { recursive: true });
    rmSync(path.join(store, "CURRENT"));
    mkdirSync(path.join(store, "rdf.old.1"));
    writeFileSync(path.join(store, "CURRENT.old.1"), "old\n");
    const rename = fs.renameSync;
    let renames = 0;
    spyOn(fs, "renameSync").mockImplementation(((from: string, to: string) => {
      renames += 1;
      if (renames === 2) throw new Error("EXDEV");
      rename(from, to);
    }) as never);
    await ensureJournaledBranchStoreAsync(store);
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toBe("old\n");
    expect(renames).toBe(3);
  });

  test("leave the error to the caller when nothing can be restored", async () => {
    const store = journalStore();
    rmSync(path.join(store, "rdf"), { recursive: true });
    rmSync(path.join(store, "CURRENT"));
    mkdirSync(path.join(store, "rdf.old.1"));
    writeFileSync(path.join(store, "CURRENT.old.1"), "old\n");
    spyOn(fs, "renameSync").mockImplementation((() => {
      throw new Error("EXDEV");
    }) as never);
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      `Journaled branch store is incomplete at ${store}; restore the immutable legacy/ backup or remove the interrupted generation before retrying`,
    );
  });

  test("give up on an unreadable branch directory", async () => {
    const store = journalStore();
    rmSync(path.join(store, "rdf"), { recursive: true });
    mkdirSync(path.join(store, "rdf.old.1"));
    const readdir = fs.readdirSync;
    spyOn(fs, "readdirSync").mockImplementation(((
      dir: string,
      ...rest: unknown[]
    ) => {
      if (dir === store) throw new Error("EACCES");
      return (readdir as (...args: unknown[]) => unknown)(dir, ...rest);
    }) as never);
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      "Journaled branch store is incomplete",
    );
  });

  test("refuse an incomplete store without a legacy copy", async () => {
    const store = journalStore();
    rmSync(path.join(store, "CURRENT"));
    writeFileSync(path.join(store, "kb.rdf"), SENTINEL);
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      "Journaled branch store is incomplete",
    );
    expect(existsSync(path.join(store, "storage.json"))).toBe(true);
  });

  test("drop an incomplete publication beside a live legacy store", async () => {
    for (const legacy of [
      ["audit.log", "a"],
      ["kb.rdf", "<rdf:RDF>"],
    ]) {
      const store = journalStore();
      rmSync(path.join(store, "CURRENT"));
      mkdirSync(path.join(store, "rdf", "x"));
      writeFileSync(path.join(store, legacy[0] as string), legacy[1] as string);
      const stub = stubProlog();
      await ensureJournaledBranchStoreAsync(store);
      expect(stub.goals).toHaveLength(2);
      expect(readdirSync(store).sort()).toStrictEqual(["kb.rdf", "legacy"]);
      mock.restore();
    }
  });

  test("reject a corrupt legacy store", async () => {
    const store = tempDir();
    writeFileSync(path.join(store, "kb.rdf"), "<rdf:RDFx>");
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      `Legacy Kibi store is corrupt at ${path.join(store, "kb.rdf")}: expected RDF/XML root`,
    );
    writeFileSync(path.join(store, "kb.rdf"), "<rdf:RDF\nxmlns>");
    process.env.NODE_ENV = "test";
    const stub = stubProlog(() => ({ success: false, bindings: {} }));
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      "Legacy KB migration failed",
    );
    expect(stub.goals).toHaveLength(1);
  });
});

describe("legacy migration", () => {
  function legacyStore(): { store: string; parent: string } {
    const parent = tempDir();
    const store = path.join(parent, "it's");
    mkdirSync(store);
    writeFileSync(path.join(store, "kb.rdf"), "<rdf:RDF></rdf:RDF>");
    writeFileSync(path.join(store, "audit.log"), "log");
    return { store, parent };
  }

  function migrating(stagings: string[], failAt?: string): Stub {
    return stubProlog((goal) => {
      if (goal.includes("kb_migrate_legacy")) {
        const match = /,'((?:[^']|'')*)'\)\)?$/.exec(goal) as RegExpExecArray;
        const staging = (match[1] as string).replaceAll("''", "'");
        stagings.push(staging);
        mkdirSync(path.join(staging, "rdf"));
        writeFileSync(path.join(staging, "rdf", "j"), "journal");
        writeFileSync(path.join(staging, "storage.json"), JOURNAL_MARKER);
        if (failAt === "migrate")
          return { success: false, bindings: {}, error: "bad data" };
      }
      if (failAt === "attach" && goal.startsWith("kb_attach"))
        return { success: false, bindings: {}, error: "locked" };
      return { success: true, bindings: {} };
    });
  }

  test("migrate through one query under the Bun test runtime", async () => {
    process.env.NODE_ENV = "test";
    const { store, parent } = legacyStore();
    mkdirSync(path.join(store, "rdf"));
    writeFileSync(path.join(store, "rdf", "stale"), "x");
    const stagings: string[] = [];
    const stub = migrating(stagings);
    spyOn(Date, "now").mockReturnValue(4242);
    await ensureJournaledBranchStoreAsync(store);
    const staging = path.join(
      parent,
      `.${sha(path.resolve(store), 16)}.migration.${process.pid}.4242`,
    );
    expect(stagings).toStrictEqual([staging]);
    expect(stub.goals).toStrictEqual([
      `(kb_attach('${store.replaceAll("'", "''")}'), kb_migrate_legacy('${store.replaceAll("'", "''")}','${staging.replaceAll("'", "''")}'))`,
    ]);
    expect(stub.starts).toBe(0);
    expect(stub.terminations).toStrictEqual([undefined]);
    const options = privateOf(stub.instances[0] as PrologProcess);
    expect([options.timeout, options.useOneShotMode]).toStrictEqual([
      120_000,
      true,
    ]);
    expect(existsSync(staging)).toBe(false);
    expect(readdirSync(store).sort()).toStrictEqual([
      "kb.rdf",
      "legacy",
      "rdf",
      "storage.json",
    ]);
    expect(readdirSync(path.join(store, "rdf"))).toStrictEqual(["j"]);
    expect(readFileSync(path.join(store, "kb.rdf"), "utf8")).toBe(SENTINEL);
    expect(readdirSync(path.join(store, "legacy")).sort()).toStrictEqual([
      "audit.log",
      "kb.rdf",
    ]);
    expect(statSync(path.join(store, "kb.rdf")).mode & 0o777).toBe(0o600);
  });

  test("attach then migrate in an interactive process elsewhere", async () => {
    const { store } = legacyStore();
    const stagings: string[] = [];
    const stub = migrating(stagings);
    await ensureJournaledBranchStoreAsync(store);
    expect(stub.starts).toBe(1);
    expect(stub.goals).toHaveLength(2);
    expect(stub.goals[0]).toBe(`kb_attach('${store.replaceAll("'", "''")}')`);
    expect(
      stub.goals[1]?.startsWith(
        `kb_migrate_legacy('${store.replaceAll("'", "''")}','`,
      ),
    ).toBe(true);
    expect(privateOf(stub.instances[0] as PrologProcess).useOneShotMode).toBe(
      false,
    );
    process.env.NODE_ENV = "production";
    const next = legacyStore();
    mock.restore();
    const again = migrating([]);
    await ensureJournaledBranchStoreAsync(next.store);
    expect(again.starts).toBe(1);
  });

  test("clean up the staging directory after a failed migration", async () => {
    for (const [failAt, message] of [
      ["attach", "locked"],
      ["migrate", "bad data"],
    ] as const) {
      const { store, parent } = legacyStore();
      const stagings: string[] = [];
      const stub = migrating(stagings, failAt);
      await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
        message,
      );
      expect(readdirSync(parent)).toStrictEqual(["it's"]);
      expect(stub.terminations).toHaveLength(1);
      expect(readdirSync(store).sort()).toStrictEqual(["audit.log", "kb.rdf"]);
      mock.restore();
    }
    const { store } = legacyStore();
    stubProlog((goal) =>
      goal.startsWith("kb_attach")
        ? { success: false, bindings: {} }
        : { success: true, bindings: {} },
    );
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      "Failed to attach legacy KB",
    );
  });
});

describe("stale journal lock recovery", () => {
  function locked(content: string, root?: string): string {
    const store = journalStore(root);
    writeFileSync(path.join(store, "kb.rdf"), SENTINEL);
    writeFileSync(path.join(store, "rdf", "lock"), content);
    return store;
  }

  test("break the lock of a dead holder and record it", async () => {
    const store = locked(`pid(${DEAD_PID}).`);
    await ensureJournaledBranchStoreAsync(store);
    expect(existsSync(path.join(store, "rdf", "lock"))).toBe(false);
    expect(takeover(store)).toStrictEqual({
      brokenPid: DEAD_PID,
      reason: `recorded holder pid ${DEAD_PID} is no longer running`,
    });
  });

  test("keep a lock without a foreign holder", async () => {
    for (const content of ["no pid", `pid(${process.pid}).`]) {
      const store = locked(content);
      await ensureJournaledBranchStoreAsync(store);
      expect(existsSync(path.join(store, "rdf", "lock"))).toBe(true);
      expect(takeover(store)).toBeNull();
    }
    const live = process.ppid;
    for (const journal of [null, { pid: live + 1 }, { pid: live }]) {
      const store = locked(`pid(${live}).`);
      if (journal !== null)
        writeFileSync(
          path.join(store, ".kibi-lock-owner.json"),
          JSON.stringify(journal),
        );
      await ensureJournaledBranchStoreAsync(store);
      expect(existsSync(path.join(store, "rdf", "lock"))).toBe(true);
    }
  });

  test("break a live pid's lock copied from another workspace", async () => {
    const live = process.ppid;
    const workspace = tempDir();
    const branches = path.join(workspace, ".kb", "branches");
    mkdirSync(branches, { recursive: true });
    const store = locked(`pid(${live}).`, branches);
    const foreign = tempDir();
    writeFileSync(
      path.join(store, ".kibi-lock-owner.json"),
      JSON.stringify({ pid: live, workspaceRoot: foreign }),
    );
    const rm = fs.rmSync;
    const removed: string[] = [];
    spyOn(fs, "rmSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      removed.push(String(file));
      (rm as (...args: unknown[]) => void)(file, ...rest);
    }) as never);
    await ensureJournaledBranchStoreAsync(store);
    expect(takeover(store)).toStrictEqual({
      brokenPid: live,
      reason: `journal belongs to another workspace ${foreign}`,
    });
    expect(removed).toStrictEqual([path.join(store, "rdf", "lock")]);
    expect(existsSync(path.join(store, "rdf", "lock"))).toBe(false);
  });

  test("leave a lock it fails to remove to the attach", async () => {
    const store = locked(`pid(${DEAD_PID}).`);
    spyOn(fs, "rmSync").mockImplementation((() => {
      throw new Error("EBUSY");
    }) as never);
    await ensureJournaledBranchStoreAsync(store);
    expect(existsSync(path.join(store, "rdf", "lock"))).toBe(true);
  });

  test("recover the lock after restoring a generation", async () => {
    const store = locked(`pid(${DEAD_PID}).`);
    rmSync(path.join(store, "CURRENT"));
    writeFileSync(path.join(store, "CURRENT.old.1"), "old\n");
    rmSync(path.join(store, "kb.rdf"));
    await ensureJournaledBranchStoreAsync(store);
    expect(existsSync(path.join(store, "rdf", "lock"))).toBe(false);
  });
});

const STATUS_GOAL = "status:kb_status_json(JsonString)";
const OK: Answer = { success: true, bindings: {} };

function statusAnswer(fields: Record<string, unknown> = {}): Answer {
  return {
    success: true,
    bindings: { JsonString: JSON.stringify(JSON.stringify(fields)) },
  };
}

function encodeFrame(value: unknown): Buffer {
  const payload = Buffer.from(JSON.stringify(value), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.byteLength, 0);
  return Buffer.concat([header, payload]);
}

type Response = {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
  serverPackageVersions?: string;
};

class Peer {
  private buffer = Buffer.alloc(0);
  private readonly waiting: Array<(value: Response) => void> = [];
  private readonly ready: Response[] = [];
  closed = false;

  constructor(readonly socket: net.Socket) {
    socket.on("data", (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      while (this.buffer.byteLength >= 4) {
        const length = this.buffer.readUInt32BE(0);
        if (this.buffer.byteLength < 4 + length) break;
        const value = JSON.parse(
          this.buffer.subarray(4, 4 + length).toString("utf8"),
        ) as Response;
        this.buffer = this.buffer.subarray(4 + length);
        const waiter = this.waiting.shift();
        if (waiter) waiter(value);
        else this.ready.push(value);
      }
    });
    socket.on("close", () => {
      this.closed = true;
    });
    socket.on("error", () => undefined);
  }

  static open(socketPath: string): Promise<Peer> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(socketPath);
      socket.once("connect", () => resolve(new Peer(socket)));
      socket.once("error", reject);
    });
  }

  send(value: unknown): void {
    this.socket.write(encodeFrame(value));
  }

  next(): Promise<Response> {
    const ready = this.ready.shift();
    if (ready) return Promise.resolve(ready);
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  close(): void {
    this.socket.destroy();
  }
}

async function until(check: () => boolean, ms = 5000): Promise<void> {
  for (let waited = 0; !check(); waited += 5) {
    if (waited > ms) throw new Error("condition never held");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

type Daemon = {
  workspace: string;
  branchPath: string;
  socketPath: string;
  run: Promise<void>;
  stub: Stub;
  exits: number[];
  done: () => boolean;
  request: (fields: Record<string, unknown>) => Promise<Response>;
  base: (fields?: Record<string, unknown>) => Record<string, unknown>;
  stop: () => Promise<void>;
};

let nextRequestId = 1;

async function startDaemon(
  answer: (goal: string) => Answer | Promise<Answer> = () => OK,
  extra: { maxOutputBytes?: number; workspace?: string } = {},
): Promise<Daemon> {
  const workspace = extra.workspace ?? tempDir("kibi-ws-");
  const stub = stubProlog((goal) =>
    goal === STATUS_GOAL ? statusAnswer() : answer(goal),
  );
  const exits: number[] = [];
  spyOn(process, "exit").mockImplementation(((code: number) => {
    exits.push(code);
  }) as never);
  const socketPath = engineSocketPath(workspace, "main");
  let finished = false;
  const run = runEngineDaemon({
    workspaceRoot: workspace,
    branch: "main",
    socketPath,
    ...(extra.maxOutputBytes === undefined
      ? {}
      : { maxOutputBytes: extra.maxOutputBytes }),
  }).finally(() => {
    finished = true;
  });
  run.catch(() => undefined);
  const real = fs.realpathSync(workspace);
  const base = (fields: Record<string, unknown> = {}) => ({
    id: nextRequestId++,
    protocolVersion: ENGINE_PROTOCOL_VERSION,
    packageVersions: enginePackageVersions(),
    prologIdentity: engineSwiplIdentity(),
    workspaceRoot: real,
    branch: "main",
    ...fields,
  });
  const peers: Peer[] = [];
  const daemon: Daemon = {
    workspace: real,
    branchPath: branchStorePath(real, "main"),
    socketPath,
    run,
    stub,
    exits,
    done: () => finished,
    base,
    request: async (fields) => {
      const peer = await Peer.open(socketPath);
      peers.push(peer);
      peer.send(base(fields));
      const response = await peer.next();
      peer.close();
      return response;
    },
    stop: async () => {
      if (!finished && existsSync(socketPath)) {
        await daemon.request({ method: "stop" }).catch(() => undefined);
      }
      await run.catch(() => undefined);
      // The daemon schedules its process exit 50 ms after the shutdown.
      await new Promise((resolve) => setTimeout(resolve, 80));
    },
  };
  cleanups.push(async () => {
    for (const peer of peers) peer.close();
    await daemon.stop();
  });
  await until(() => finished || existsSync(socketPath));
  return daemon;
}

describe("engine daemon", () => {
  test("boot the session, publish the pid and serve a private socket", async () => {
    const daemon = await startDaemon();
    const kbDir = path.dirname(
      (await import("../src/prolog.js")).resolveKbPlPath(),
    );
    expect(daemon.stub.starts).toBe(1);
    await until(() => daemon.stub.goals.length === 4);
    expect(daemon.stub.goals).toStrictEqual([
      `kb_attach('${daemon.branchPath}')`,
      `use_module('${path.join(kbDir, "status.pl")}')`,
      `use_module('${path.join(kbDir, "discovery.pl")}')`,
      "kb_storage_compact_if_needed",
    ]);
    const options = privateOf(daemon.stub.instances[0] as PrologProcess);
    expect([options.timeout, options.useOneShotMode]).toStrictEqual([
      120_000,
      false,
    ]);
    expect(readFileSync(enginePidPath(daemon.workspace, "main"), "utf8")).toBe(
      `${process.pid}\n`,
    );
    expect(statSync(enginePidPath(daemon.workspace, "main")).mode & 0o777).toBe(
      0o600,
    );
    expect(statSync(daemon.socketPath).mode & 0o777).toBe(0o600);
    expect(readFileSync(path.join(daemon.branchPath, "kb.rdf"), "utf8")).toBe(
      SENTINEL,
    );
    expect(await daemon.request({ method: "handshake" })).toStrictEqual({
      id: expect.any(Number),
      ok: true,
      result: {
        prologIdentity: engineSwiplIdentity(),
        packageVersions: enginePackageVersions(),
      },
      serverPackageVersions: enginePackageVersions(),
    });
    await daemon.stop();
    expect(existsSync(daemon.socketPath)).toBe(false);
    expect(existsSync(enginePidPath(daemon.workspace, "main"))).toBe(false);
    expect(daemon.exits).toStrictEqual([0]);
  });

  test("pass the output bound to the session", async () => {
    const daemon = await startDaemon(undefined, { maxOutputBytes: 4096 });
    expect(
      privateOf(daemon.stub.instances[0] as PrologProcess).maxOutputBytes,
    ).toBe(4096);
    const other = await startDaemon();
    expect(
      privateOf(other.stub.instances[0] as PrologProcess).maxOutputBytes,
    ).toBe(8 * 1024 * 1024);
  });
});

function err(response: Response): string | undefined {
  expect(response.ok).toBe(false);
  return response.error;
}

function result(response: Response): unknown {
  expect(response.error).toBeUndefined();
  expect(response.ok).toBe(true);
  return response.result;
}

function countFsyncs(branchPath: string): () => number {
  let count = 0;
  const open = fs.openSync;
  spyOn(fs, "openSync").mockImplementation(((
    file: string,
    ...rest: unknown[]
  ) => {
    if (file === branchPath) count += 1;
    return (open as (...args: unknown[]) => number)(file, ...rest);
  }) as never);
  return () => count;
}

function goalsSince(daemon: Daemon, mark: number): string[] {
  return daemon.stub.goals.slice(mark);
}

async function settled(daemon: Daemon): Promise<number> {
  await until(() => daemon.stub.goals.includes("kb_storage_compact_if_needed"));
  await new Promise((resolve) => setTimeout(resolve, 5));
  return daemon.stub.goals.length;
}

describe("engine request identity", () => {
  test("refuse another protocol, workspace or branch", async () => {
    const daemon = await startDaemon();
    expect(
      err(await daemon.request({ method: "handshake", protocolVersion: 2 })),
    ).toBe("Kibi engine protocol mismatch: client=2, server=1");
    expect(
      err(
        await daemon.request({
          method: "handshake",
          protocolVersion: undefined,
        }),
      ),
    ).toBe("Kibi engine protocol mismatch: client=missing, server=1");
    const mismatch = "Kibi engine workspace identity mismatch";
    expect(
      err(
        await daemon.request({ method: "handshake", workspaceRoot: tempDir() }),
      ),
    ).toBe(mismatch);
    expect(
      err(
        await daemon.request({ method: "handshake", workspaceRoot: undefined }),
      ),
    ).toBe(mismatch);
    expect(
      err(await daemon.request({ method: "handshake", branch: "dev" })),
    ).toBe(mismatch);
    expect(
      result(
        await daemon.request({
          method: "handshake",
          workspaceRoot: `${daemon.workspace}/.`,
        }),
      ),
    ).toStrictEqual({
      prologIdentity: engineSwiplIdentity(),
      packageVersions: enginePackageVersions(),
    });
  });

  test("serve only clients of this install and Prolog", async () => {
    const daemon = await startDaemon();
    const versions = enginePackageVersions();
    const identity = engineSwiplIdentity();
    expect(
      err(await daemon.request({ method: "status", packageVersions: "x@1" })),
    ).toBe(
      `Kibi engine package-version mismatch: client=x@1, server=${versions}`,
    );
    expect(
      err(
        await daemon.request({ method: "status", packageVersions: undefined }),
      ),
    ).toBe(
      `Kibi engine package-version mismatch: client=missing, server=${versions}`,
    );
    expect(
      err(await daemon.request({ method: "status", prologIdentity: "p@1" })),
    ).toBe(`Kibi engine SWI-Prolog mismatch: client=p@1, server=${identity}`);
    expect(
      err(
        await daemon.request({ method: "status", prologIdentity: undefined }),
      ),
    ).toBe(
      `Kibi engine SWI-Prolog mismatch: client=missing, server=${identity}`,
    );
    expect(
      (
        await daemon.request({
          method: "handshake",
          packageVersions: "x@1",
          prologIdentity: "p@1",
        })
      ).ok,
    ).toBe(true);
    const stop = await daemon.request({
      method: "stop",
      packageVersions: "x@1",
      prologIdentity: "p@1",
    });
    expect(result(stop)).toStrictEqual({ stopped: true });
    await daemon.run;
  });
});

describe("engine queries", () => {
  test("accept only typed Kibi goals", async () => {
    const daemon = await startDaemon();
    const refused =
      "Kibi engine accepts only typed Kibi predicates; arbitrary Prolog goals are not exposed";
    expect(err(await daemon.request({ method: "query", goal: 1 }))).toBe(
      "query.goal must be a string",
    );
    const mark = await settled(daemon);
    for (const goal of [
      "halt",
      "kb_x, halt()",
      "kb_x, shell ('ls')",
      "kb_x, open(f, write, S)",
      "kb_x, set_prolog_flag(a, b)",
      "assertz(x)",
      "write(hello)",
      "xkb_entity(X)",
      "",
    ]) {
      expect(err(await daemon.request({ method: "query", goal }))).toBe(
        refused,
      );
    }
    for (const goal of [
      "kb_entity(X)",
      " kb_entity(X)",
      "(kb_a)",
      "x:kb_a",
      "a,kb_b",
      "a kb_b",
      "checks:x",
      "status:x",
      "discovery:x",
      "requirement_proof:x",
      "code_certificates:x",
      "claim_obligations:x",
      "findall(X, a, L)",
      "aggregate_all(count, a, N)",
      "rdf_transaction(a)",
      "use_module('x')",
      "atom_json_dict(a, b, [])",
      "member(X, [1])",
      "once(a)",
      "true",
      "fail",
      "kb_note('halt(now)')",
      'kb_note("shell(x)")',
      "kb_note(`open(x)`)",
      "kb_note('it''s halt(x)')",
      "kb_note('a\\'halt(1)')",
      "kb_a % halt(1)\n",
      "kb_a /* halt(1) */",
      "kb_a /* \n halt(1) \n */",
    ]) {
      expect((await daemon.request({ method: "query", goal })).ok).toBe(true);
    }
    expect(goalsSince(daemon, mark)).toHaveLength(29);
    for (const goal of [
      "kb_a % c\nhalt(1)",
      "kb_a /* c */ halt(1)",
      "kb_note('x') , halt(1)",
      'kb_note("a""b"), halt(1)',
      "kb_note('a\\\\'), halt(1)",
      "kb_note('\\",
    ]) {
      expect((await daemon.request({ method: "query", goal })).ok).toBe(
        goal === "kb_note('\\",
      );
    }
  });

  test("cache deterministic reads until a write", async () => {
    let n = 0;
    const daemon = await startDaemon((goal) => ({
      success: true,
      bindings: { N: `${goal}#${++n}` },
    }));
    const mark = await settled(daemon);
    const ask = async (goal: string) =>
      result(await daemon.request({ method: "query", goal })) as Answer;
    const first = await ask("kb_entity(X)");
    expect(await ask("kb_entity(X)")).toStrictEqual(first);
    for (const goal of [
      "findall(X, a, L)",
      "kb_entities_by_source(a, L)",
      "kb_relationship(a, b, c)",
    ]) {
      expect(await ask(goal)).toStrictEqual(await ask(goal));
    }
    for (const goal of [
      "kb_entity_count(X)",
      "(kb_entity(X))",
      "kb_entity(X), kb_storage_status(S)",
      "status:x",
    ]) {
      expect(await ask(goal)).not.toStrictEqual(await ask(goal));
    }
    const writes = goalsSince(daemon, mark).length;
    await ask("kb_assert_entity(x)");
    expect(await ask("kb_entity(X)")).not.toStrictEqual(first);
    expect(goalsSince(daemon, mark).length).toBe(writes + 2);
  });

  test("invalidate the caches on every kind of write", async () => {
    let n = 0;
    const daemon = await startDaemon(() => ({
      success: true,
      bindings: { N: String(++n) },
    }));
    const ask = async (goal: string) =>
      result(await daemon.request({ method: "query", goal })) as Answer;
    for (const write of [
      "kb_assert_x(a)",
      "kb_retract_x(a)",
      "kb_commit_upsert(a)",
      "kb_save",
      "kb_delete_x(a)",
      "rdf_transaction(kb_a)",
      "kb_a, rdf_assert(a, b, c)",
      "kb_a, rdf_retract(a, b, c)",
    ]) {
      const before = await ask("kb_entity(A)");
      await ask(write);
      expect(await ask("kb_entity(A)")).not.toStrictEqual(before);
    }
    const before = await ask("kb_entity(A)");
    await ask("kb_log(a)");
    expect(await ask("kb_entity(A)")).toStrictEqual(before);
  });

  test("keep failed and oversized reads out of the cache", async () => {
    let n = 0;
    let big = false;
    const daemon = await startDaemon((goal) =>
      !goal.startsWith("kb_entity")
        ? OK
        : big
          ? { success: true, bindings: { X: "x".repeat(8 * 1024 * 1024) } }
          : { success: n++ % 2 !== 0, bindings: { N: String(n) } },
    );
    const mark = await settled(daemon);
    await daemon.request({ method: "query", goal: "kb_entity(A)" });
    await daemon.request({ method: "query", goal: "kb_entity(A)" });
    expect(goalsSince(daemon, mark)).toHaveLength(2);
    big = true;
    await daemon.request({ method: "query", goal: "kb_entity(B)" });
    await daemon.request({ method: "query", goal: "kb_entity(B)" });
    expect(goalsSince(daemon, mark)).toHaveLength(4);
  });

  test("evict the oldest cached read past 128 entries", async () => {
    const daemon = await startDaemon();
    const mark = await settled(daemon);
    for (let i = 0; i <= 128; i += 1)
      await daemon.request({ method: "query", goal: `kb_entity(${i})` });
    await daemon.request({ method: "query", goal: "kb_entity(1)" });
    expect(goalsSince(daemon, mark)).toHaveLength(129);
    await daemon.request({ method: "query", goal: "kb_entity(0)" });
    expect(goalsSince(daemon, mark)).toHaveLength(130);
  });

  test("hand cache hits to the trace writer", async () => {
    const events: Array<{ kind: string; durationMs: number }> = [];
    spyOn(perf, "writePerformanceTraceEvent").mockImplementation((event) => {
      events.push(event as { kind: string; durationMs: number });
    });
    let clock = 5000;
    spyOn(performance, "now").mockImplementation(() => {
      clock += 2;
      return clock;
    });
    const daemon = await startDaemon();
    await daemon.request({ method: "query", goal: "kb_entity(A)" });
    await daemon.request({ method: "kbStatus" });
    expect(events).toStrictEqual([]);
    await daemon.request({ method: "query", goal: "kb_entity(A)" });
    await daemon.request({ method: "kbStatus" });
    expect(events).toStrictEqual([
      { kind: "engine-query-cache-hit", durationMs: 2 },
      { kind: "engine-freshness-cache-hit", durationMs: 2 },
    ]);
  });

  test("make writes durable and bound only reads", async () => {
    const daemon = await startDaemon();
    const fsyncs = countFsyncs(daemon.branchPath);
    const limits = { limits: { timeMs: 1500 } };
    const mark = await settled(daemon);
    await daemon.request({ method: "query", goal: "kb_entity(X)", ...limits });
    await daemon.request({ method: "query", goal: "kb_entity(Y)", ...limits });
    await daemon.request({
      method: "query",
      goal: "kb_assert_x(a)",
      ...limits,
    });
    for (const goal of [
      "use_module('m')",
      "kb_note('consult(x)')",
      "kb_note('load_files(x)')",
      "ensure_loaded(x)",
      "kb_preview_upsert_contradiction(x)",
    ]) {
      await daemon.request({
        method: "query",
        goal: `kb_a, ${goal}`,
        ...limits,
      });
    }
    expect(
      goalsSince(daemon, mark).map((goal) => goal.slice(0, 40)),
    ).toStrictEqual([
      "(current_predicate(kibi_engine_bounded_r",
      "(kibi_engine_bounded_read((kb_entity(X))",
      "(kibi_engine_bounded_read((kb_entity(Y))",
      "kb_assert_x(a)",
      "kb_a, use_module('m')",
      "kb_a, kb_note('consult(x)')",
      "kb_a, kb_note('load_files(x)')",
      "kb_a, ensure_loaded(x)",
      "kb_a, kb_preview_upsert_contradiction(x)",
    ]);
    expect(fsyncs()).toBe(1);
  });

  test("define the bounded-read helper once per session", async () => {
    let defineOk = false;
    const daemon = await startDaemon((goal) =>
      goal.startsWith("(current_predicate")
        ? { success: defineOk, bindings: {}, ...(defineOk ? {} : {}) }
        : OK,
    );
    const limits = { limits: { inferences: 50 } };
    expect(
      err(await daemon.request({ method: "query", goal: "kb_a", ...limits })),
    ).toBe("Failed to define the bounded-read helper");
    defineOk = true;
    const mark = await settled(daemon);
    await daemon.request({ method: "query", goal: "kb_a", ...limits });
    await daemon.request({ method: "query", goal: "kb_b", ...limits });
    daemon.stub.pid = 8;
    await daemon.request({ method: "query", goal: "kb_c", ...limits });
    expect(
      goalsSince(daemon, mark).filter((goal) =>
        goal.startsWith("(current_predicate"),
      ),
    ).toHaveLength(2);
    expect(goalsSince(daemon, mark).at(-1)).toBe(
      "(kibi_engine_bounded_read((kb_c), none, 50, KibiReadOutcome))",
    );
  });

  test("report the helper's own definition error", async () => {
    const daemon = await startDaemon((goal) =>
      goal.startsWith("(current_predicate")
        ? { success: false, bindings: {}, error: "no assert" }
        : OK,
    );
    expect(
      err(
        await daemon.request({
          method: "query",
          goal: "kb_a",
          limits: { timeMs: 10 },
        }),
      ),
    ).toBe("no assert");
  });

  test("remember client module loads for a recycle", async () => {
    const daemon = await startDaemon((goal) =>
      goal === "use_module('bad')" ? { success: false, bindings: {} } : OK,
    );
    await daemon.request({ method: "query", goal: "use_module('m.pl')." });
    await daemon.request({ method: "query", goal: "use_module('m.pl')" });
    await daemon.request({ method: "query", goal: "use_module('bad')" });
    await daemon.request({ method: "query", goal: "use_module('a''b')" });
    await daemon.request({ method: "query", goal: "use_module(x)" });
    await daemon.request({ method: "query", goal: "kb_a, use_module('n')" });
    const mark = await settled(daemon);
    daemon.stub.lost = true;
    const errors: string[] = [];
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });
    await daemon.request({ method: "query", goal: "kb_x" });
    expect(errors).toStrictEqual([
      "[KIBI] engine Prolog session was lost (output overflow, timeout, or crash); restarting and reattaching the branch store",
    ]);
    expect(
      goalsSince(daemon, mark)
        .slice(1, -1)
        .map((goal) => goal.slice(0, 12)),
    ).toStrictEqual([
      "use_module('",
      "use_module('",
      "use_module('",
      "use_module('",
    ]);
    expect(goalsSince(daemon, mark).slice(3, 5)).toStrictEqual([
      "use_module('m.pl')",
      "use_module('a''b')",
    ]);
  });
});

describe("engine read methods", () => {
  test("build an indexed entity query", async () => {
    const daemon = await startDaemon((goal) =>
      goal.includes("'bad'")
        ? { success: false, bindings: {}, error: "boom" }
        : goal.includes("'worse'")
          ? { success: false, bindings: {} }
          : OK,
    );
    const mark = await settled(daemon);
    await daemon.request({ method: "entities" });
    await daemon.request({
      method: "entities",
      type: "req",
      entityId: "it's",
      tags: ["a", "b'c"],
      sourceFile: "s.md",
      limit: 100_000,
      offset: 5,
    });
    await daemon.request({ method: "entities", limit: 0, offset: 0, tags: [] });
    expect(goalsSince(daemon, mark)).toStrictEqual([
      "kb_query_entities(none, none, [], none, 100, 0, Rows, Count)",
      "kb_query_entities('req', 'it''s', ['a','b''c'], 's.md', 100000, 5, Rows, Count)",
      "kb_query_entities(none, none, [], none, 0, 0, Rows, Count)",
    ]);
    const bounded = "entities.limit/offset must be bounded integers";
    for (const fields of [
      { limit: 1.5 },
      { offset: 0.5 },
      { limit: -1 },
      { offset: -1 },
      { limit: 100_001 },
    ]) {
      expect(err(await daemon.request({ method: "entities", ...fields }))).toBe(
        bounded,
      );
    }
    expect(err(await daemon.request({ method: "entities", type: "bad" }))).toBe(
      "boom",
    );
    expect(
      err(await daemon.request({ method: "entities", type: "worse" })),
    ).toBe("Indexed entity query failed");
  });

  test("build an indexed search query", async () => {
    const daemon = await startDaemon((goal) =>
      goal.includes("'bad'")
        ? { success: false, bindings: {}, error: "boom" }
        : goal.includes("'worse'")
          ? { success: false, bindings: {} }
          : OK,
    );
    const mark = await settled(daemon);
    await daemon.request({ method: "search", searchQuery: "it's" });
    await daemon.request({
      method: "search",
      searchQuery: "q",
      type: "t'",
      limit: 100_000,
      offset: 2,
    });
    expect(goalsSince(daemon, mark)).toStrictEqual([
      "kb_search_entities(none, 'it''s', 10000, 0, Rows, Count)",
      "kb_search_entities('t''', 'q', 100000, 2, Rows, Count)",
    ]);
    const nonEmpty = "search.searchQuery must be a non-empty string";
    expect(err(await daemon.request({ method: "search" }))).toBe(nonEmpty);
    expect(
      err(await daemon.request({ method: "search", searchQuery: 1 })),
    ).toBe(nonEmpty);
    expect(
      err(await daemon.request({ method: "search", searchQuery: "  " })),
    ).toBe(nonEmpty);
    const bounded = "search.limit/offset must be bounded integers";
    for (const fields of [
      { limit: 1.5 },
      { offset: 0.5 },
      { limit: -1 },
      { offset: -1 },
      { limit: 100_001 },
    ]) {
      expect(
        err(
          await daemon.request({
            method: "search",
            searchQuery: "q",
            ...fields,
          }),
        ),
      ).toBe(bounded);
    }
    expect(
      err(await daemon.request({ method: "search", searchQuery: "bad" })),
    ).toBe("boom");
    expect(
      err(await daemon.request({ method: "search", searchQuery: "worse" })),
    ).toBe("Indexed search candidate query failed");
  });

  test("return a limit hit instead of failing", async () => {
    const daemon = await startDaemon((goal) =>
      goal.startsWith("(kibi_engine_bounded_read")
        ? {
            success: true,
            bindings: { KibiReadOutcome: "kibi_read_outcome(time)" },
          }
        : OK,
    );
    const limits = { limits: { timeMs: 5 } };
    const hit = { kind: "time", limit: 5 };
    expect(
      (
        result(await daemon.request({ method: "entities", ...limits })) as {
          limitExceeded: unknown;
        }
      ).limitExceeded,
    ).toStrictEqual(hit);
    expect(
      (
        result(
          await daemon.request({
            method: "search",
            searchQuery: "q",
            ...limits,
          }),
        ) as { limitExceeded: unknown }
      ).limitExceeded,
    ).toStrictEqual(hit);
  });

  test("decorate the status with the branch and its attachment", async () => {
    let status: Answer = statusAnswer({ a: 1 });
    const daemon = await startDaemon();
    daemon.stub.goals.length = 0;
    spyOn(PrologProcess.prototype, "query").mockImplementation((async (
      goal: string,
    ) => {
      daemon.stub.goals.push(goal);
      return goal === STATUS_GOAL ? status : OK;
    }) as never);
    const identity = readEngineAttachmentIdentity(daemon.branchPath);
    const decoded = (response: Response) =>
      JSON.parse(
        JSON.parse(
          (result(response) as Answer).bindings.JsonString as string,
        ) as string,
      );
    expect(
      decoded(
        await daemon.request({
          method: "command",
          command: { version: 1, kind: "status" },
        }),
      ),
    ).toStrictEqual({
      a: 1,
      branch: "main",
      attachedPath: identity?.path,
      attachedGeneration: identity?.generation,
      attachedDev: identity?.dev,
      attachedIno: identity?.ino,
    });
    for (const odd of [
      { success: false, bindings: { JsonString: "x" } },
      { success: true, bindings: {} },
      { success: true, bindings: { JsonString: "not json" } },
    ] as Answer[]) {
      status = odd;
      expect(
        result(
          await daemon.request({
            method: "command",
            command: { version: 1, kind: "status" },
          }),
        ),
      ).toStrictEqual(odd);
    }
  });

  test("serve the freshness status from a 100 ms cache", async () => {
    let n = 0;
    let fail = false;
    const daemon = await startDaemon();
    await settled(daemon);
    let now = 1_000_000;
    spyOn(Date, "now").mockImplementation(() => now);
    spyOn(PrologProcess.prototype, "query").mockImplementation((async (
      goal: string,
    ) => {
      daemon.stub.goals.push(goal);
      if (goal !== STATUS_GOAL) return OK;
      n += 1;
      return fail ? { success: false, bindings: {} } : statusAnswer({ n });
    }) as never);
    const ask = async () =>
      result(await daemon.request({ method: "kbStatus" })) as Answer;
    fail = true;
    expect((await ask()).success).toBe(false);
    fail = false;
    const fresh = await ask();
    expect(n).toBe(2);
    now += 100;
    expect(await ask()).toStrictEqual(fresh);
    now += 1;
    expect(await ask()).not.toStrictEqual(fresh);
    const cached = await ask();
    await daemon.request({ method: "query", goal: "kb_assert_x(a)" });
    expect(await ask()).not.toStrictEqual(cached);
    expect(n).toBe(4);
  });
});

describe("engine commands", () => {
  const command = (fields: Record<string, unknown>) => ({
    method: "command",
    command: { version: 1, ...fields },
  });

  test("require version 1 and a known kind", async () => {
    const daemon = await startDaemon();
    expect(err(await daemon.request({ method: "command" }))).toBe(
      "engine.command must use version 1",
    );
    expect(
      err(
        await daemon.request({
          method: "command",
          command: { version: 2, kind: "status" },
        }),
      ),
    ).toBe("engine.command must use version 1");
    expect(err(await daemon.request(command({ kind: "nope" })))).toBe(
      "engine.command kind is unsupported",
    );
  });

  test("run persistence commands durably", async () => {
    let fail = false;
    const daemon = await startDaemon((goal) =>
      fail && goal !== "kb_storage_compact_if_needed"
        ? { success: false, bindings: {} }
        : OK,
    );
    const mark = await settled(daemon);
    const fsyncs = countFsyncs(daemon.branchPath);
    const target = path.join(tempDir(), "it's");
    const requests = [
      command({ kind: "checkpoint" }),
      command({ kind: "compact" }),
      command({ kind: "save" }),
      command({ kind: "persistence", action: "checkpoint" }),
      command({ kind: "persistence", action: "compact" }),
      command({ kind: "persistence", action: "save" }),
      command({
        kind: "persistence",
        action: "export",
        targetDirectory: target,
      }),
      { method: "checkpoint" },
      { method: "compact" },
    ];
    for (const request of requests) result(await daemon.request(request));
    expect(goalsSince(daemon, mark)).toStrictEqual([
      "kb_sync_checkpoint",
      "kb_storage_compact",
      "kb_save",
      "kb_sync_checkpoint",
      "kb_storage_compact",
      "kb_save",
      `kb_storage_export('${target.replaceAll("'", "''")}')`,
      "kb_sync_checkpoint",
      "kb_storage_compact",
    ]);
    expect(fsyncs()).toBe(9);
    fail = true;
    for (const request of requests) await daemon.request(request);
    expect(fsyncs()).toBe(9);
    expect(
      err(
        await daemon.request(
          command({ kind: "persistence", action: "export" }),
        ),
      ),
    ).toBe("engine.persistence.export requires targetDirectory");
    expect(
      err(
        await daemon.request(
          command({
            kind: "persistence",
            action: "export",
            targetDirectory: "",
          }),
        ),
      ),
    ).toBe("engine.persistence.export requires targetDirectory");
  });

  test("clear the read caches on a checkpoint", async () => {
    const daemon = await startDaemon();
    for (const checkpoint of [
      command({ kind: "checkpoint" }),
      { method: "checkpoint" },
    ]) {
      await daemon.request({ method: "query", goal: "kb_entity(A)" });
      await daemon.request({ method: "kbStatus" });
      const mark = daemon.stub.goals.length;
      await daemon.request(checkpoint);
      await daemon.request({ method: "query", goal: "kb_entity(A)" });
      await daemon.request({ method: "kbStatus" });
      expect(goalsSince(daemon, mark)).toStrictEqual([
        "kb_sync_checkpoint",
        "kb_entity(A)",
        STATUS_GOAL,
      ]);
    }
    for (const other of [command({ kind: "compact" }), { method: "compact" }]) {
      await daemon.request({ method: "query", goal: "kb_entity(A)" });
      const mark = daemon.stub.goals.length;
      await daemon.request(other);
      await daemon.request({ method: "query", goal: "kb_entity(A)" });
      expect(goalsSince(daemon, mark)).toStrictEqual(["kb_storage_compact"]);
    }
  });

  test("assert and retract a relationship", async () => {
    let fail = false;
    const daemon = await startDaemon((goal) =>
      fail ? { success: false, bindings: {} } : OK,
    );
    const mark = await settled(daemon);
    const fsyncs = countFsyncs(daemon.branchPath);
    const rel = { kind: "relationship", type: "t'", from: "a'", to: "b'" };
    await daemon.request({ method: "query", goal: "kb_entity(A)" });
    await daemon.request({ method: "kbStatus" });
    await daemon.request(command({ ...rel, action: "assert" }));
    await daemon.request(command({ ...rel, action: "retract" }));
    await daemon.request({ method: "query", goal: "kb_entity(A)" });
    await daemon.request({ method: "kbStatus" });
    expect(goalsSince(daemon, mark)).toStrictEqual([
      "kb_entity(A)",
      STATUS_GOAL,
      "kb_assert_relationship('t''', 'a''', 'b''', [])",
      "kb_retract_relationship('t''', 'a''', 'b''')",
      "kb_entity(A)",
      STATUS_GOAL,
    ]);
    expect(fsyncs()).toBe(2);
    fail = true;
    await daemon.request({ method: "kbStatus" });
    await daemon.request(command({ ...rel, action: "assert" }));
    expect(fsyncs()).toBe(2);
    for (const missing of ["type", "from", "to"]) {
      expect(
        err(
          await daemon.request(
            command({ ...rel, action: "assert", [missing]: "" }),
          ),
        ),
      ).toBe("engine.relationship requires type, from, and to");
    }
  });

  test("run the checks without a caller goal", async () => {
    const daemon = await startDaemon();
    const mark = await settled(daemon);
    for (const rule of [undefined, "a", "a_b9"]) {
      result(await daemon.request(command({ kind: "check", rule })));
    }
    for (const rule of ["A", "9a", "a-b", "a b", "", " a", "a "]) {
      expect(err(await daemon.request(command({ kind: "check", rule })))).toBe(
        "engine.check.rule must be a lowercase rule name",
      );
    }
    expect(goalsSince(daemon, mark)).toStrictEqual([
      "checks:check_all_json(JsonString)",
      "checks:check_all_json(JsonString)",
      "checks:check_all_json(JsonString)",
    ]);
  });

  test("validate and build typed entity and search commands", async () => {
    const daemon = await startDaemon();
    const mark = await settled(daemon);
    await daemon.request(command({ kind: "entities", limit: 0, offset: 0 }));
    await daemon.request(
      command({
        kind: "entities",
        type: "r'",
        id: "i'",
        tags: ["x'"],
        sourceFile: "f'",
        limit: 100_000,
        offset: 3,
      }),
    );
    await daemon.request(
      command({ kind: "search", query: "q'", limit: 1, offset: 0 }),
    );
    await daemon.request(
      command({
        kind: "search",
        query: "q",
        type: "t'",
        limit: 100_000,
        offset: 1,
      }),
    );
    expect(goalsSince(daemon, mark)).toStrictEqual([
      "kb_query_entities(none, none, [], none, 0, 0, Rows, Count)",
      "kb_query_entities('r''', 'i''', ['x'''], 'f''', 100000, 3, Rows, Count)",
      "kb_search_entities(none, 'q''', 1, 0, Rows, Count)",
      "kb_search_entities('t''', 'q', 100000, 1, Rows, Count)",
    ]);
    for (const fields of [
      { limit: 1.5, offset: 0 },
      { limit: 1, offset: 0.5 },
      { limit: -1, offset: 0 },
      { limit: 1, offset: -1 },
      { limit: 100_001, offset: 0 },
    ]) {
      expect(
        err(await daemon.request(command({ kind: "entities", ...fields }))),
      ).toBe("engine.entities.limit/offset must be bounded integers");
      expect(
        err(
          await daemon.request(
            command({ kind: "search", query: "q", ...fields }),
          ),
        ),
      ).toBe("engine.search.limit/offset must be bounded integers");
    }
    expect(
      err(
        await daemon.request(
          command({ kind: "search", query: " ", limit: 1, offset: 0 }),
        ),
      ),
    ).toBe("engine.search.query must be non-empty");
  });

  test("mark cancellations and stop through commands", async () => {
    const daemon = await startDaemon();
    expect(
      result(await daemon.request(command({ kind: "cancel", requestId: 9 }))),
    ).toStrictEqual({ cancelled: 9 });
    expect(
      result(
        await daemon.request(
          command({ kind: "lifecycle", action: "cancel", requestId: 4 }),
        ),
      ),
    ).toStrictEqual({ cancelled: 4 });
    for (const requestId of [undefined, 1.5]) {
      expect(
        err(
          await daemon.request(
            command({ kind: "lifecycle", action: "cancel", requestId }),
          ),
        ),
      ).toBe("engine.lifecycle.cancel requires requestId");
    }
    expect(
      result(await daemon.request({ method: "cancel", cancelOf: 3 })),
    ).toStrictEqual({ cancelled: 3 });
    expect(result(await daemon.request({ method: "cancel" }))).toStrictEqual({
      cancelled: null,
    });
    expect(
      result(
        await daemon.request(command({ kind: "lifecycle", action: "stop" })),
      ),
    ).toStrictEqual({ stopped: true });
    await daemon.run;
    const other = await startDaemon();
    expect(
      result(await other.request(command({ kind: "stop" }))),
    ).toStrictEqual({
      stopped: true,
    });
    await other.run;
  });

  test("report storage status and export", async () => {
    const daemon = await startDaemon();
    const mark = await settled(daemon);
    const target = "/tmp/it's";
    await daemon.request({ method: "status" });
    await daemon.request({ method: "export", targetDirectory: target });
    expect(err(await daemon.request({ method: "export" }))).toBe(
      "export.targetDirectory is required",
    );
    expect(goalsSince(daemon, mark)).toStrictEqual([
      "kb_storage_status(Status), with_output_to(string(Json), json:json_write_dict(current_output, Status, [width(0)]))",
      "kb_storage_export('/tmp/it''s')",
    ]);
  });

  test("answer an unknown method with nothing", async () => {
    const daemon = await startDaemon();
    expect(await daemon.request({ method: "mystery" })).toStrictEqual({
      id: expect.any(Number),
      ok: true,
      serverPackageVersions: enginePackageVersions(),
    });
  });
});

describe("engine session", () => {
  function session(
    answer: (goal: string) => Answer,
    store = journalStore(),
  ): { stub: Stub; session: EngineSession; store: string } {
    const stub = stubProlog(answer);
    const prolog = new PrologProcess({ oneShot: false });
    return { stub, session: new EngineSession(prolog, store), store };
  }

  test("attach the store and load the core modules", async () => {
    process.env.KIBI_KB_PL_PATH = "/core\\dir/src/kb.pl";
    const parent = tempDir();
    const store = journalStore(path.join(parent));
    const quoted = path.join(parent, "it's");
    fs.renameSync(store, quoted);
    const { stub, session: s } = session(() => OK, quoted);
    await s.boot();
    expect(stub.starts).toBe(1);
    expect(stub.goals).toStrictEqual([
      `kb_attach('${quoted.replaceAll("'", "''")}')`,
      "use_module('/core/dir/src/status.pl')",
      "use_module('/core/dir/src/discovery.pl')",
    ]);
  });

  test("escape backslashes in the attached store path", async () => {
    const parent = tempDir();
    const store = journalStore(path.join(parent));
    const windowsLike = path.join(parent, "a\\b");
    fs.renameSync(store, windowsLike);
    const { stub, session: s } = session(() => OK, windowsLike);
    await s.boot();
    expect(stub.goals[0]).toBe(
      `kb_attach('${windowsLike.replaceAll("\\", "\\\\")}')`,
    );
  });

  test("record a dead holder's takeover only after the attach", async () => {
    const store = journalStore();
    writeFileSync(path.join(store, "rdf", "lock"), `pid(${DEAD_PID}).`);
    let attach: Answer = { success: false, bindings: {}, error: "locked" };
    const { session: s } = session(
      (goal) => (goal.startsWith("kb_attach") ? attach : OK),
      store,
    );
    await expect(s.boot()).rejects.toThrow("locked");
    expect(takeover(store)).toBeNull();
    attach = OK;
    await s.boot();
    expect(takeover(store)).toStrictEqual({
      brokenPid: DEAD_PID,
      reason: `recorded holder pid ${DEAD_PID} is no longer running`,
    });
  });

  test("retry the attach after breaking a dead holder's lock", async () => {
    const store = journalStore();
    let attaches = 0;
    const { stub, session: s } = session((goal) => {
      if (!goal.startsWith("kb_attach")) return OK;
      attaches += 1;
      return attaches === 1
        ? ({
            success: false,
            bindings: {},
            error: "store locked",
            errorRecord: {
              storeLocked: { owner: { pid: DEAD_PID }, lockDirectory: "" },
            },
          } as Answer)
        : OK;
    }, store);
    await s.boot();
    expect(attaches).toBe(2);
    expect(stub.goals.slice(2)).toHaveLength(2);
    const failing = session(() => ({ success: false, bindings: {} }));
    await expect(failing.session.boot()).rejects.toThrow(
      "Failed to attach branch KB",
    );
  });

  test("name the module that failed to load", async () => {
    for (const [module, label] of [
      ["status.pl", "status"],
      ["discovery.pl", "discovery"],
    ]) {
      const { session: s } = session((goal) =>
        goal.includes(module) ? { success: false, bindings: {} } : OK,
      );
      await expect(s.boot()).rejects.toThrow(
        `Failed to load Kibi ${label} module`,
      );
      mock.restore();
    }
    const { session: s } = session((goal) =>
      goal.includes("status.pl")
        ? { success: false, bindings: {}, error: "syntax" }
        : OK,
    );
    await expect(s.boot()).rejects.toThrow("syntax");
  });

  test("restore client modules on a recycle", async () => {
    const { stub, session: s } = session(() => OK);
    s.recordModuleLoad(" use_module('a').. ", OK);
    s.recordModuleLoad("use_module('a')", OK);
    s.recordModuleLoad("use_module('b')", { success: false, bindings: {} });
    s.recordModuleLoad("use_module('c'), x", OK);
    s.recordModuleLoad("xuse_module('d')", OK);
    s.recordModuleLoad("use_module('e')x", OK);
    s.recordModuleLoad(" use_module('f')", OK);
    s.recordModuleLoad("use_module('g')..", OK);
    s.recordModuleLoad("use_module('h').", OK);
    expect(await s.ensureLive()).toBe(false);
    expect(s.needsRecycle()).toBe(false);
    stub.lost = true;
    expect(s.needsRecycle()).toBe(true);
    spyOn(console, "error").mockImplementation(() => undefined);
    expect(await s.ensureLive()).toBe(true);
    expect(stub.goals.slice(3)).toStrictEqual([
      "use_module('a')",
      "use_module('f')",
      "use_module('g')",
      "use_module('h')",
    ]);
  });

  test("stop the process after a failed recycle", async () => {
    const { stub, session: s } = session(() => ({
      success: false,
      bindings: {},
      error: "gone",
    }));
    stub.lost = true;
    spyOn(console, "error").mockImplementation(() => undefined);
    await expect(s.ensureLive()).rejects.toThrow(
      "Kibi engine failed to recycle its Prolog session: gone",
    );
    expect(stub.terminations).toStrictEqual([undefined]);
    spyOn(PrologProcess.prototype, "terminate").mockImplementation(async () => {
      throw new Error("already");
    });
    spyOn(PrologProcess.prototype, "start").mockImplementation(async () => {
      throw "not an error";
    });
    stub.lost = true;
    await expect(s.ensureLive()).rejects.toThrow(
      "Kibi engine failed to recycle its Prolog session: not an error",
    );
  });
});

describe("engine recycling", () => {
  test("recycle a lost session before ordinary requests only", async () => {
    let n = 0;
    const daemon = await startDaemon((goal) =>
      goal.startsWith("kb_entity")
        ? { success: true, bindings: { N: String(++n) } }
        : OK,
    );
    spyOn(console, "error").mockImplementation(() => undefined);
    const first = result(
      await daemon.request({ method: "query", goal: "kb_entity(A)" }),
    );
    await daemon.request({ method: "kbStatus" });
    const mark = await settled(daemon);
    daemon.stub.lost = true;
    for (const lifecycle of [
      { method: "handshake" },
      { method: "cancel", cancelOf: 1 },
      {
        method: "command",
        command: { version: 1, kind: "cancel", requestId: 1 },
      },
      {
        method: "command",
        command: {
          version: 1,
          kind: "lifecycle",
          action: "cancel",
          requestId: 1,
        },
      },
    ]) {
      result(await daemon.request(lifecycle));
    }
    expect(daemon.stub.starts).toBe(1);
    const writeFile = path.join(daemon.branchPath, "CURRENT");
    writeFileSync(writeFile, "generation-9:1\n");
    const second = result(
      await daemon.request({ method: "query", goal: "kb_entity(A)" }),
    );
    expect(daemon.stub.starts).toBe(2);
    expect(second).not.toStrictEqual(first);
    await daemon.request({ method: "kbStatus" });
    expect(goalsSince(daemon, mark).at(-1)).toBe(STATUS_GOAL);
    const status = result(
      await daemon.request({
        method: "command",
        command: { version: 1, kind: "status" },
      }),
    ) as Answer;
    expect(
      JSON.parse(JSON.parse(status.bindings.JsonString as string) as string)
        .attachedGeneration,
    ).toBe("generation-9:1");
  });

  test("stop the daemon without saving a lost session", async () => {
    const daemon = await startDaemon();
    await settled(daemon);
    const mark = daemon.stub.goals.length;
    daemon.stub.lost = true;
    await daemon.request({ method: "stop" });
    await daemon.run;
    expect(goalsSince(daemon, mark)).toStrictEqual([]);
    expect(daemon.stub.terminations.at(-1)).toStrictEqual({ graceMs: 1000 });
  });
});

function gate(): { wait: Promise<void>; open: () => void } {
  let open!: () => void;
  const wait = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { wait, open };
}

describe("engine connections", () => {
  test("answer split and batched frames in order", async () => {
    const daemon = await startDaemon();
    const peer = await Peer.open(daemon.socketPath);
    cleanups.push(() => peer.close());
    const a = encodeFrame(daemon.base({ method: "handshake" }));
    const b = encodeFrame(daemon.base({ method: "cancel", cancelOf: 77 }));
    const both = Buffer.concat([a, b]);
    peer.socket.write(both.subarray(0, 3));
    await new Promise((resolve) => setTimeout(resolve, 10));
    peer.socket.write(both.subarray(3, a.byteLength - 2));
    await new Promise((resolve) => setTimeout(resolve, 10));
    peer.socket.write(both.subarray(a.byteLength - 2, a.byteLength + 6));
    await new Promise((resolve) => setTimeout(resolve, 10));
    peer.socket.write(both.subarray(a.byteLength + 6));
    expect((await peer.next()).result).toStrictEqual({
      prologIdentity: engineSwiplIdentity(),
      packageVersions: enginePackageVersions(),
    });
    expect((await peer.next()).result).toStrictEqual({ cancelled: 77 });
  });

  test("drop a connection that sends an oversized or broken frame", async () => {
    const daemon = await startDaemon();
    for (const bytes of [
      (() => {
        const header = Buffer.alloc(4);
        header.writeUInt32BE(64 * 1024 * 1024 + 1, 0);
        return header;
      })(),
      Buffer.concat([
        (() => {
          const header = Buffer.alloc(4);
          header.writeUInt32BE(3, 0);
          return header;
        })(),
        Buffer.from("{x}"),
      ]),
    ]) {
      const peer = await Peer.open(daemon.socketPath);
      peer.socket.write(bytes);
      await until(() => peer.closed);
    }
    const header = Buffer.alloc(4);
    header.writeUInt32BE(64 * 1024 * 1024, 0);
    const peer = await Peer.open(daemon.socketPath);
    cleanups.push(() => peer.close());
    peer.socket.write(header);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(peer.closed).toBe(false);
  });

  test("skip a queued request cancelled on its own connection", async () => {
    const hold = gate();
    const daemon = await startDaemon((goal) =>
      goal === "kb_slow" ? hold.wait.then(() => OK) : OK,
    );
    await settled(daemon);
    const peer = await Peer.open(daemon.socketPath);
    const other = await Peer.open(daemon.socketPath);
    cleanups.push(() => {
      peer.close();
      other.close();
    });
    const slow = daemon.base({ method: "query", goal: "kb_slow" });
    const queued = daemon.base({ method: "query", goal: "kb_queued" });
    const foreign = { ...daemon.base({ method: "query", goal: "kb_other" }) };
    peer.send(slow);
    peer.send(queued);
    other.send({ ...foreign, id: queued.id });
    peer.send(daemon.base({ method: "cancel", cancelOf: queued.id }));
    other.send(daemon.base({ method: "cancel", cancelOf: "x" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    hold.open();
    expect((await peer.next()).ok).toBe(true);
    expect(await peer.next()).toStrictEqual({
      id: queued.id as number,
      ok: false,
      error: "Kibi engine request cancelled",
      serverPackageVersions: enginePackageVersions(),
    });
    expect((await peer.next()).result).toStrictEqual({ cancelled: queued.id });
    expect((await other.next()).ok).toBe(true);
    expect(daemon.stub.goals).toContain("kb_other");
    expect(daemon.stub.goals).not.toContain("kb_queued");
  });

  test("forget a cancel mark once its request has run", async () => {
    const hold = gate();
    const daemon = await startDaemon((goal) =>
      goal === "kb_slow" ? hold.wait.then(() => OK) : OK,
    );
    await settled(daemon);
    const peer = await Peer.open(daemon.socketPath);
    cleanups.push(() => peer.close());
    const slow = daemon.base({ method: "query", goal: "kb_slow" });
    peer.send(slow);
    await new Promise((resolve) => setTimeout(resolve, 20));
    peer.send({
      ...daemon.base({ method: "query", goal: "kb_again" }),
      id: slow.id,
    });
    peer.send(daemon.base({ method: "cancel", cancelOf: slow.id }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    hold.open();
    expect((await peer.next()).ok).toBe(true);
    expect((await peer.next()).ok).toBe(true);
    expect(daemon.stub.goals).toContain("kb_again");
  });

  test("refuse requests that arrive while shutting down", async () => {
    const hold = gate();
    const daemon = await startDaemon((goal) =>
      goal === "kb_save" ? hold.wait.then(() => OK) : OK,
    );
    await settled(daemon);
    const peer = await Peer.open(daemon.socketPath);
    cleanups.push(() => peer.close());
    peer.send(daemon.base({ method: "stop" }));
    expect((await peer.next()).result).toStrictEqual({ stopped: true });
    await until(() => daemon.stub.goals.includes("kb_save"));
    const late = daemon.base({ method: "handshake" });
    peer.send(late);
    expect(await peer.next()).toStrictEqual({
      id: late.id as number,
      ok: false,
      error: "Kibi engine is shutting down; request was not executed",
      serverPackageVersions: enginePackageVersions(),
    });
    hold.open();
    await daemon.run;
    await until(() => peer.closed);
  });

  test("survive a peer that leaves before its answer", async () => {
    const hold = gate();
    const daemon = await startDaemon((goal) =>
      goal === "kb_slow" ? hold.wait.then(() => OK) : OK,
    );
    const peer = await Peer.open(daemon.socketPath);
    peer.send(daemon.base({ method: "query", goal: "kb_slow" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    peer.close();
    await new Promise((resolve) => setTimeout(resolve, 10));
    hold.open();
    expect(result(await daemon.request({ method: "handshake" }))).toBeDefined();
  });
});

describe("engine lifecycle", () => {
  test("refuse an invalid branch name", async () => {
    await expect(
      runEngineDaemon({
        workspaceRoot: tempDir(),
        branch: "../x",
        socketPath: path.join(runtime, "x.sock"),
      }),
    ).rejects.toThrow("Invalid Kibi engine branch name: ../x");
  });

  test("stop the session when the boot fails", async () => {
    const stub = stubProlog((goal) =>
      goal.startsWith("kb_attach")
        ? { success: false, bindings: {}, error: "store_locked" }
        : OK,
    );
    const workspace = tempDir();
    await expect(
      runEngineDaemon({
        workspaceRoot: workspace,
        branch: "main",
        socketPath: engineSocketPath(workspace, "main"),
      }),
    ).rejects.toThrow("store_locked");
    expect(stub.terminations).toStrictEqual([undefined]);
    spyOn(PrologProcess.prototype, "terminate").mockImplementation(async () => {
      throw new Error("late");
    });
    await expect(
      runEngineDaemon({
        workspaceRoot: workspace,
        branch: "main",
        socketPath: engineSocketPath(workspace, "main"),
      }),
    ).rejects.toThrow("store_locked");
  });

  test("refuse to start beside a live engine", async () => {
    const daemon = await startDaemon();
    const before = daemon.stub.terminations.length;
    await expect(
      runEngineDaemon({
        workspaceRoot: daemon.workspace,
        branch: "main",
        socketPath: daemon.socketPath,
      }),
    ).rejects.toThrow(
      `A Kibi engine is already listening at ${daemon.socketPath}`,
    );
    expect(daemon.stub.terminations.length).toBe(before + 1);
    expect(result(await daemon.request({ method: "handshake" }))).toBeDefined();
  });

  test("treat a broken pipe from the probe as a live engine", async () => {
    for (const failure of [
      Object.assign(new Error("x"), { code: "EPIPE" }),
      Object.assign(new Error("x"), { code: "ECONNRESET" }),
      Object.assign(new Error("x"), { errno: -32 }),
      new Error("write EPIPE"),
      new Error("read ECONNRESET"),
      new Error("Broken pipe"),
    ]) {
      const workspace = tempDir();
      stubProlog();
      const socketPath = engineSocketPath(workspace, "main");
      writeFileSync(socketPath, "");
      spyOn(net, "createConnection").mockImplementation((() => {
        const fake = new EventEmitter() as EventEmitter & {
          destroy: () => void;
        };
        fake.destroy = () => undefined;
        queueMicrotask(() => fake.emit("error", failure));
        return fake;
      }) as never);
      await expect(
        runEngineDaemon({
          workspaceRoot: workspace,
          branch: "main",
          socketPath,
        }),
      ).rejects.toThrow(`A Kibi engine is already listening at ${socketPath}`);
      mock.restore();
    }
  });

  test("replace a stale socket file", async () => {
    const workspace = tempDir();
    const socketPath = engineSocketPath(workspace, "main");
    writeFileSync(socketPath, "");
    for (const failure of [
      Object.assign(new Error("refused"), {
        code: "ECONNREFUSED",
        errno: -111,
      }),
      "plain",
    ]) {
      writeFileSync(socketPath, "");
      const real = net.createConnection;
      let calls = 0;
      spyOn(net, "createConnection").mockImplementation(((
        ...args: unknown[]
      ) => {
        calls += 1;
        if (calls > 1)
          return (real as (...a: unknown[]) => net.Socket)(...args);
        const fake = new EventEmitter() as EventEmitter & {
          destroy: () => void;
        };
        fake.destroy = () => undefined;
        queueMicrotask(() => fake.emit("error", failure));
        return fake;
      }) as never);
      const daemon = await startDaemon(undefined, { workspace });
      await settled(daemon);
      expect(
        result(await daemon.request({ method: "handshake" })),
      ).toBeDefined();
      await daemon.stop();
      mock.restore();
    }
  });

  test("keep going when a stale socket cannot be removed", async () => {
    const workspace = tempDir();
    const socketPath = engineSocketPath(workspace, "main");
    mkdirSync(socketPath);
    writeFileSync(path.join(socketPath, "x"), "");
    stubProlog();
    spyOn(process, "exit").mockImplementation((() => undefined) as never);
    const rm = fs.rmSync;
    spyOn(fs, "rmSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      if (file === socketPath) throw new Error("EISDIR");
      (rm as (...a: unknown[]) => void)(file, ...rest);
    }) as never);
    await expect(
      runEngineDaemon({ workspaceRoot: workspace, branch: "main", socketPath }),
    ).rejects.toThrow();
    expect(existsSync(path.join(socketPath, "x"))).toBe(true);
  });

  test("save, detach and stop at once on shutdown", async () => {
    const daemon = await startDaemon();
    await settled(daemon);
    const fsyncs = countFsyncs(daemon.branchPath);
    const peer = await Peer.open(daemon.socketPath);
    const mark = daemon.stub.goals.length;
    await daemon.request({ method: "stop" });
    await daemon.run;
    await until(() => peer.closed);
    expect(goalsSince(daemon, mark)).toStrictEqual(["kb_save", "kb_detach"]);
    expect(daemon.stub.terminations.at(-1)).toStrictEqual({ graceMs: 0 });
    expect(fsyncs()).toBe(1);
    expect(process.listeners("SIGTERM")).toStrictEqual(baseSigterm);
    expect(process.listeners("SIGINT")).toStrictEqual(baseSigint);
  });

  test("wait for SWI to halt when the store was not released", async () => {
    for (const [answer, goals] of [
      [
        (goal: string) =>
          goal === "kb_save" ? { success: false, bindings: {} } : OK,
        ["kb_save"],
      ],
      [
        (goal: string) => {
          if (goal === "kb_save") throw new Error("down");
          return OK;
        },
        ["kb_save"],
      ],
      [
        (goal: string) =>
          goal === "kb_detach" ? { success: false, bindings: {} } : OK,
        ["kb_save", "kb_detach"],
      ],
      [
        (goal: string) => {
          if (goal === "kb_detach") throw new Error("down");
          return OK;
        },
        ["kb_save", "kb_detach"],
      ],
    ] as const) {
      const daemon = await startDaemon(answer as (goal: string) => Answer);
      await settled(daemon);
      const mark = daemon.stub.goals.length;
      await daemon.stop();
      expect(goalsSince(daemon, mark)).toStrictEqual([...goals]);
      expect(daemon.stub.terminations.at(-1)).toStrictEqual({ graceMs: 1000 });
      mock.restore();
    }
  });

  test("finish the shutdown when fsync or terminate fail", async () => {
    const daemon = await startDaemon();
    await settled(daemon);
    spyOn(fs, "fsyncSync").mockImplementation((() => {
      throw new Error("EIO");
    }) as never);
    spyOn(PrologProcess.prototype, "terminate").mockImplementation(async () => {
      throw new Error("gone");
    });
    await daemon.stop();
    expect(existsSync(daemon.socketPath)).toBe(false);
  });

  test("tolerate files that vanish during cleanup", async () => {
    const daemon = await startDaemon();
    rmSync(daemon.socketPath);
    rmSync(enginePidPath(daemon.workspace, "main"));
    const peer = await Peer.open(daemon.socketPath).catch(() => null);
    expect(peer).toBeNull();
    process.emit("SIGTERM" as never);
    await daemon.run;
    const other = await startDaemon();
    const rm = fs.rmSync;
    spyOn(fs, "rmSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      if (file === enginePidPath(other.workspace, "main"))
        throw new Error("EBUSY");
      (rm as (...a: unknown[]) => void)(file, ...rest);
    }) as never);
    await other.request({ method: "stop" });
    await other.run;
    expect(existsSync(enginePidPath(other.workspace, "main"))).toBe(true);
  });

  test("shut down once on SIGTERM or SIGINT", async () => {
    for (const signal of ["SIGTERM", "SIGINT"] as const) {
      const daemon = await startDaemon();
      await settled(daemon);
      const mark = daemon.stub.goals.length;
      process.emit(signal as never);
      process.emit(signal as never);
      await daemon.run;
      expect(goalsSince(daemon, mark)).toStrictEqual(["kb_save", "kb_detach"]);
      await new Promise((resolve) => setTimeout(resolve, 80));
      mock.restore();
    }
  });

  test("exit after an idle period without clients", async () => {
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "100";
    const intervals: number[] = [];
    const real = globalThis.setInterval;
    spyOn(globalThis, "setInterval").mockImplementation(((
      handler: () => void,
      ms?: number,
    ) => {
      intervals.push(ms as number);
      return real(handler, ms);
    }) as never);
    const daemon = await startDaemon();
    const peer = await Peer.open(daemon.socketPath);
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(daemon.done()).toBe(false);
    peer.close();
    await until(() => daemon.done(), 2000);
    expect(intervals).toStrictEqual([30_000, 100]);
  });

  test("fall back to the default idle and watchdog periods", async () => {
    for (const value of ["99", "abc", ""]) {
      process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = value;
      process.env.KIBI_ENGINE_WORKSPACE_WATCHDOG_MS = value;
      const intervals: number[] = [];
      const real = globalThis.setInterval;
      spyOn(globalThis, "setInterval").mockImplementation(((
        handler: () => void,
        ms?: number,
      ) => {
        intervals.push(ms as number);
        return real(handler, ms);
      }) as never);
      const daemon = await startDaemon();
      await daemon.stop();
      expect(intervals).toStrictEqual([30_000, 30_000]);
      mock.restore();
    }
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "100000";
    process.env.KIBI_ENGINE_WORKSPACE_WATCHDOG_MS = "100";
    const intervals: number[] = [];
    const real = globalThis.setInterval;
    spyOn(globalThis, "setInterval").mockImplementation(((
      handler: () => void,
      ms?: number,
    ) => {
      intervals.push(ms as number);
      return real(handler, ms);
    }) as never);
    const daemon = await startDaemon();
    await daemon.stop();
    expect(intervals).toStrictEqual([100, 30_000]);
  });

  test("measure idleness by the wall clock", async () => {
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "100";
    let now = 10_000;
    const daemon = await startDaemon();
    spyOn(Date, "now").mockImplementation(() => now);
    await daemon.request({ method: "handshake" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    now += 99;
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(daemon.done()).toBe(false);
    now += 1;
    await until(() => daemon.done(), 2000);
  });

  test("compact once while idle and never for a lost session", async () => {
    const daemon = await startDaemon();
    await settled(daemon);
    for (let i = 0; i < 3; i += 1) {
      await daemon.request({ method: "handshake" });
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      daemon.stub.goals.filter(
        (goal) => goal === "kb_storage_compact_if_needed",
      ).length,
    ).toBe(4);
    daemon.stub.lost = true;
    const mark = daemon.stub.goals.length;
    await daemon.request({ method: "handshake" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(goalsSince(daemon, mark)).toStrictEqual([]);
    daemon.stub.lost = false;
    const hold = gate();
    spyOn(PrologProcess.prototype, "query").mockImplementation((async (
      goal: string,
    ) => {
      daemon.stub.goals.push(goal);
      if (goal === "kb_storage_compact_if_needed") {
        await hold.wait;
        throw new Error("compaction failed");
      }
      return OK;
    }) as never);
    const busy = daemon.stub.goals.length;
    await daemon.request({ method: "handshake" });
    await daemon.request({ method: "handshake" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(goalsSince(daemon, busy)).toStrictEqual([
      "kb_storage_compact_if_needed",
    ]);
    hold.open();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await daemon.request({ method: "handshake" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(goalsSince(daemon, busy)).toStrictEqual([
      "kb_storage_compact_if_needed",
      "kb_storage_compact_if_needed",
    ]);
  });

  test("stop when the workspace disappears for two checks", async () => {
    process.env.KIBI_ENGINE_WORKSPACE_WATCHDOG_MS = "100";
    const errors: string[] = [];
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });
    // Drive the watchdog by hand so a loaded machine cannot fit two checks
    // into one window.
    const ticks: Array<() => void> = [];
    const realSetInterval = globalThis.setInterval;
    spyOn(globalThis, "setInterval").mockImplementation(((
      callback: () => void,
      ms: number,
      ...rest: unknown[]
    ) => {
      if (ms !== 100)
        return (realSetInterval as (...args: unknown[]) => unknown)(
          callback,
          ms,
          ...rest,
        );
      ticks.push(callback);
      return realSetInterval(() => undefined, 1 << 30);
    }) as never);
    const workspace = tempDir("kibi-ws-");
    const daemon = await startDaemon(undefined, { workspace });
    expect(ticks).toHaveLength(1);
    const tick = ticks[0] as () => void;
    const moved = `${workspace}.away`;
    roots.push(moved);
    fs.renameSync(workspace, moved);
    tick();
    fs.renameSync(moved, workspace);
    tick();
    fs.renameSync(workspace, moved);
    tick();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(daemon.done()).toBe(false);
    expect(errors).toStrictEqual([]);
    tick();
    await until(() => daemon.done(), 2000);
    expect(errors).toStrictEqual([
      `[KIBI] workspace ${daemon.workspace} no longer exists; stopping engine`,
    ]);
    fs.renameSync(moved, workspace);
  });
});

type Request = Record<string, unknown> & {
  id: number;
  method: string;
  command?: { kind: string };
};
type Reply = Record<string, unknown> | "silent" | "close" | "garbage" | Buffer;

type FakeEngine = {
  socketPath: string;
  requests: Request[];
  server: net.Server;
  sockets: net.Socket[];
  close: () => Promise<void>;
};

function liveIdentity(workspace: string): Record<string, unknown> {
  const store = branchStorePath(fs.realpathSync(workspace), "main");
  const identity = readEngineAttachmentIdentity(store);
  return identity === null
    ? {}
    : {
        attachedPath: identity.path,
        attachedGeneration: identity.generation,
        attachedDev: identity.dev,
        attachedIno: identity.ino,
      };
}

function prepareStore(workspace: string): string {
  const store = ensureBranchStoreManifest(fs.realpathSync(workspace), "main");
  writeFileSync(path.join(store, "CURRENT"), "generation-1:0\n");
  return store;
}

function defaultReply(workspace: string, request: Request): Reply {
  if (request.method === "handshake")
    return {
      ok: true,
      result: {
        prologIdentity: engineSwiplIdentity(),
        packageVersions: enginePackageVersions(),
      },
    };
  if (request.method === "command" && request.command?.kind === "status")
    return { ok: true, result: statusAnswer(liveIdentity(workspace)) };
  return { ok: true, result: { success: true, bindings: {} } };
}

async function fakeEngine(
  workspace: string,
  reply: (request: Request, socket: net.Socket) => Reply | undefined = () =>
    undefined,
  socketPath = engineSocketPath(workspace, "main"),
): Promise<FakeEngine> {
  const requests: Request[] = [];
  const sockets: net.Socket[] = [];
  const server = net.createServer((socket) => {
    sockets.push(socket);
    socket.on("error", () => undefined);
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.byteLength >= 4) {
        const length = buffer.readUInt32BE(0);
        if (buffer.byteLength < 4 + length) break;
        const request = JSON.parse(
          buffer.subarray(4, 4 + length).toString("utf8"),
        ) as Request;
        buffer = buffer.subarray(4 + length);
        requests.push(request);
        const answer =
          reply(request, socket) ?? defaultReply(workspace, request);
        if (answer === "silent") continue;
        if (answer === "close") {
          socket.destroy();
          return;
        }
        if (answer === "garbage") {
          const header = Buffer.alloc(4);
          header.writeUInt32BE(64 * 1024 * 1024 + 1, 0);
          socket.write(header);
          continue;
        }
        if (Buffer.isBuffer(answer)) {
          socket.write(answer);
          continue;
        }
        socket.write(encodeFrame({ id: request.id, ...answer }));
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(socketPath, resolve));
  const engine: FakeEngine = {
    socketPath,
    requests,
    server,
    sockets,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
  cleanups.push(async () => {
    if (server.listening) await engine.close();
  });
  return engine;
}

function client(
  workspace: string,
  options: Partial<ConstructorParameters<typeof EngineClient>[0]> = {},
): EngineClient {
  const created = new EngineClient({
    workspaceRoot: workspace,
    branch: "main",
    readLimits: null,
    ...options,
  });
  cleanups.push(() => created.terminate());
  return created;
}

function clientPrivates(created: EngineClient): Record<string, unknown> {
  return created as unknown as Record<string, unknown>;
}

describe("engine client basics", () => {
  test("validate and default its options", () => {
    const workspace = tempDir();
    expect(
      () => new EngineClient({ workspaceRoot: workspace, branch: "../x" }),
    ).toThrow("Invalid Kibi engine branch name: ../x");
    process.env.KIBI_ENGINE_READ_TIME_LIMIT_MS = "250";
    const defaults = clientPrivates(
      new EngineClient({ workspaceRoot: `${workspace}/.`, branch: "main" }),
    );
    expect([
      defaults.workspaceRoot,
      defaults.branch,
      defaults.timeout,
      defaults.allowPublicationLock,
      defaults.readLimits,
    ]).toStrictEqual([
      fs.realpathSync(workspace),
      "main",
      120_000,
      false,
      { timeMs: 250 },
    ]);
    const explicit = clientPrivates(
      new EngineClient({
        workspaceRoot: workspace,
        branch: "main",
        timeout: 5,
        allowPublicationLock: true,
        readLimits: { inferences: 9 },
      }),
    );
    expect([
      explicit.timeout,
      explicit.allowPublicationLock,
      explicit.readLimits,
    ]).toStrictEqual([5, true, { inferences: 9 }]);
    expect(
      clientPrivates(
        new EngineClient({
          workspaceRoot: workspace,
          branch: "main",
          readLimits: null,
        }),
      ).readLimits,
    ).toBeUndefined();
  });

  test("send typed requests with the client identity", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const engine = await fakeEngine(workspace);
    const c = client(workspace, { readLimits: { timeMs: 100 } });
    expect(c.isRunning()).toBe(false);
    expect(await c.query("kb_a")).toStrictEqual({
      success: true,
      bindings: {},
    });
    expect(c.isRunning()).toBe(true);
    expect(await c.nextSolution()).toStrictEqual({
      success: true,
      bindings: {},
    });
    expect(await c.nextSolution()).toBeNull();
    await c.query("kb_b");
    c.invalidateCache();
    expect(await c.nextSolution()).toBeNull();
    await c.queryBatch([" kb_x(a).. ", "kb_y('a.b')."]);
    await c.save();
    await c.storageStatus();
    await c.checkpoint();
    await c.queryStatusJson();
    await c.compact();
    await c.exportStorage("/out");
    await c.command({ version: 1, kind: "save" });
    const real = fs.realpathSync(workspace);
    const sent = engine.requests.slice(2);
    for (const request of sent) {
      expect([
        request.protocolVersion,
        request.packageVersions,
        request.prologIdentity,
        request.workspaceRoot,
        request.branch,
      ]).toStrictEqual([
        1,
        enginePackageVersions(),
        engineSwiplIdentity(),
        real,
        "main",
      ]);
    }
    expect(
      sent.map(({ method, goal, command, targetDirectory, limits }) => ({
        method,
        goal,
        command,
        targetDirectory,
        limits,
      })) as unknown[],
    ).toStrictEqual([
      {
        method: "query",
        goal: "kb_a",
        command: undefined,
        targetDirectory: undefined,
        limits: { timeMs: 100 },
      },
      {
        method: "query",
        goal: "kb_b",
        command: undefined,
        targetDirectory: undefined,
        limits: { timeMs: 100 },
      },
      {
        method: "query",
        goal: "rdf_transaction((kb_x(a), kb_y('a.b')))",
        command: undefined,
        targetDirectory: undefined,
        limits: { timeMs: 100 },
      },
      {
        method: "query",
        goal: "kb_save",
        command: undefined,
        targetDirectory: undefined,
        limits: { timeMs: 100 },
      },
      {
        method: "status",
        goal: undefined,
        command: undefined,
        targetDirectory: undefined,
        limits: undefined,
      },
      {
        method: "command",
        goal: undefined,
        command: { version: 1, kind: "checkpoint" },
        targetDirectory: undefined,
        limits: { timeMs: 100 },
      },
      {
        method: "command",
        goal: undefined,
        command: { version: 1, kind: "status" },
        targetDirectory: undefined,
        limits: { timeMs: 100 },
      },
      {
        method: "command",
        goal: undefined,
        command: { version: 1, kind: "compact" },
        targetDirectory: undefined,
        limits: { timeMs: 100 },
      },
      {
        method: "export",
        goal: undefined,
        command: undefined,
        targetDirectory: "/out",
        limits: undefined,
      },
      {
        method: "command",
        goal: undefined,
        command: { version: 1, kind: "save" },
        targetDirectory: undefined,
        limits: { timeMs: 100 },
      },
    ]);
    const ids = engine.requests.map((request) => request.id);
    expect(ids).toStrictEqual(ids.map((_, index) => index + 1));
    expect(engine.requests.slice(0, 2).map((r) => r.limits)).toStrictEqual([
      undefined,
      { timeMs: 100 },
    ]);
  });

  test("page indexed entities and search candidates", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const row =
      "[['REQ-1', 'req', 'T', 'active', [], [], '', 's.md', '', [], '', '']]";
    let mode = "rows";
    const engine = await fakeEngine(workspace, (request) => {
      if (request.method !== "command") return undefined;
      const kind = request.command?.kind;
      if (kind !== "entities" && kind !== "search") return undefined;
      if (mode === "fail")
        return {
          ok: true,
          result: { success: false, bindings: {}, error: "x" },
        };
      if (mode === "bare")
        return { ok: true, result: { success: false, bindings: {} } };
      if (mode === "empty")
        return {
          ok: true,
          result: { success: true, bindings: { Count: "z" } },
        };
      return {
        ok: true,
        result: { success: true, bindings: { Rows: row, Count: "7" } },
      };
    });
    const loaded = (await import("../src/engine.js")).EngineClient;
    expect(loaded).toBe(EngineClient);
    const c = client(workspace);
    const page = await c.queryEntities({
      type: "req",
      id: "REQ-1",
      tags: ["t"],
      sourceFile: "s.md",
      limit: 1,
      offset: 0,
    });
    await c.queryEntities({ limit: 2, offset: 3 });
    await c.searchEntities({ query: "z", limit: 4, offset: 5 });
    expect(
      engine.requests
        .filter(
          (request) =>
            request.method === "command" && request.command?.kind !== "status",
        )
        .map((request) => request.command as unknown),
    ).toStrictEqual([
      {
        version: 1,
        kind: "entities",
        type: "req",
        id: "REQ-1",
        tags: ["t"],
        sourceFile: "s.md",
        limit: 1,
        offset: 0,
      },
      { version: 1, kind: "entities", limit: 2, offset: 3 },
      { version: 1, kind: "search", query: "z", limit: 4, offset: 5 },
    ]);
    expect(page.count).toBe(7);
    expect(page.entities).toHaveLength(1);
    const found = await c.searchEntities({
      query: "q",
      type: "req",
      limit: 1,
      offset: 0,
    });
    expect(engine.requests.at(-1)?.command as unknown).toStrictEqual({
      version: 1,
      kind: "search",
      query: "q",
      type: "req",
      limit: 1,
      offset: 0,
    });
    expect([found.count, found.entities.length]).toStrictEqual([7, 1]);
    mode = "empty";
    expect(await c.queryEntities({ limit: 1, offset: 0 })).toStrictEqual({
      entities: [],
      count: 0,
    });
    expect(
      await c.searchEntities({ query: "q", limit: 1, offset: 0 }),
    ).toStrictEqual({
      entities: [],
      count: 0,
    });
    mode = "fail";
    await expect(c.queryEntities({ limit: 1, offset: 0 })).rejects.toThrow("x");
    await expect(
      c.searchEntities({ query: "q", limit: 1, offset: 0 }),
    ).rejects.toThrow("x");
    mode = "bare";
    await expect(c.queryEntities({ limit: 1, offset: 0 })).rejects.toThrow(
      "Indexed entity query failed",
    );
    await expect(
      c.searchEntities({ query: "q", limit: 1, offset: 0 }),
    ).rejects.toThrow("Indexed search candidate query failed");
  });
});

describe("engine client responses", () => {
  test("reject failed answers and ignore stray frames", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    await fakeEngine(workspace, (request) => {
      if (request.goal === "kb_err") return { ok: false, error: "nope" };
      if (request.goal === "kb_bare") return { ok: false };
      if (request.goal === "kb_stray")
        return Buffer.concat([
          encodeFrame(null),
          encodeFrame(5),
          encodeFrame({ id: "x" }),
          encodeFrame({ id: 999, ok: true }),
          encodeFrame({ id: request.id, ok: true, result: "late" }),
          encodeFrame({ id: request.id, ok: true, result: "again" }),
        ]);
      return undefined;
    });
    const c = client(workspace);
    await expect(c.query("kb_err")).rejects.toThrow("nope");
    await expect(c.query("kb_bare")).rejects.toThrow(
      "Kibi engine request failed",
    );
    expect(await c.query("kb_stray")).toBe("late" as never);
    expect(await c.query("kb_ok")).toStrictEqual({
      success: true,
      bindings: {},
    });
  });

  test("raise a read that stopped at its limit", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    await fakeEngine(workspace, (request) =>
      request.goal === "kb_slow"
        ? {
            ok: true,
            result: {
              success: false,
              bindings: {},
              limitExceeded: { kind: "time", limit: 5 },
            },
          }
        : undefined,
    );
    const c = client(workspace);
    await expect(c.query("kb_slow")).rejects.toThrow();
    expect(
      await c.query("kb_slow").catch((error: Error) => error.constructor.name),
    ).toBe("EngineQueryLimitError");
  });

  test("fail pending requests when the connection drops", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    await fakeEngine(workspace, (request) =>
      request.goal === "kb_drop"
        ? "close"
        : request.goal === "kb_garbage"
          ? "garbage"
          : undefined,
    );
    const c = client(workspace);
    await c.query("kb_ok");
    await expect(c.query("kb_drop")).rejects.toThrow(
      "Kibi engine connection closed",
    );
    expect(c.isRunning()).toBe(false);
    await expect(c.query("kb_garbage")).rejects.toThrow(
      "Kibi engine frame exceeds 64 MiB limit",
    );
    expect(await c.query("kb_ok")).toStrictEqual({
      success: true,
      bindings: {},
    });
  });

  test("cancel a request through its signal", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const engine = await fakeEngine(workspace, (request) =>
      request.goal === "kb_slow" ? "silent" : undefined,
    );
    const c = client(workspace);
    await c.query("kb_ok");
    const aborted = new AbortController();
    aborted.abort();
    await expect(c.query("kb_slow", aborted.signal)).rejects.toThrow(
      "Kibi engine request cancelled",
    );
    const later = new AbortController();
    const pending = c.query("kb_slow", later.signal);
    await until(() => engine.requests.length === 6);
    later.abort();
    await expect(pending).rejects.toThrow("Kibi engine request cancelled");
    await until(() => engine.requests.length === 7);
    const cancels = engine.requests.filter((r) => r.method === "cancel");
    expect(
      cancels.map((r) => [r.cancelOf, r.protocolVersion, r.branch]),
    ).toStrictEqual([
      [4, 1, "main"],
      [6, 1, "main"],
    ]);
    expect(cancels[0]?.packageVersions).toBe(enginePackageVersions());
    expect(cancels[0]?.prologIdentity).toBe(engineSwiplIdentity());
    expect(cancels[0]?.workspaceRoot).toBe(fs.realpathSync(workspace));
    const done = new AbortController();
    await c.query("kb_ok", done.signal);
    done.abort();
    expect(engine.requests).toHaveLength(8);
    c.cancel(1);
    await until(() => engine.requests.length === 9);
    expect(engine.requests.at(-1)?.cancelOf).toBe(1);
    await c.terminate();
    c.cancel(2);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(engine.requests).toHaveLength(9);
  });

  test("hold the process open only while a reply is pending", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    await fakeEngine(workspace);
    const c = client(workspace);
    const refs: string[] = [];
    const proto = net.Socket.prototype;
    const ref = proto.ref;
    const unref = proto.unref;
    spyOn(proto, "ref").mockImplementation(function (this: net.Socket) {
      refs.push("ref");
      return ref.call(this);
    });
    spyOn(proto, "unref").mockImplementation(function (this: net.Socket) {
      refs.push("unref");
      return unref.call(this);
    });
    await c.query("kb_a");
    expect(refs.slice(-2)).toStrictEqual(["ref", "unref"]);
    const [a, b] = await Promise.all([c.query("kb_b"), c.query("kb_c")]);
    expect([a, b]).toStrictEqual([
      { success: true, bindings: {} },
      { success: true, bindings: {} },
    ]);
    expect(refs.at(-1)).toBe("unref");
  });

  test("refuse to write on a destroyed socket", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    await fakeEngine(workspace);
    const c = client(workspace);
    await c.query("kb_a");
    const socket = clientPrivates(c).socket as net.Socket;
    spyOn(socket, "write").mockImplementation((() => {
      throw new Error("EPIPE");
    }) as never);
    await expect(c.query("kb_b")).rejects.toThrow("EPIPE");
    spyOn(socket, "write").mockImplementation((() => {
      throw "plain";
    }) as never);
    await expect(c.query("kb_b")).rejects.toThrow("plain");
    expect((clientPrivates(c).pending as Map<number, unknown>).size).toBe(0);
  });

  test("retry the handshakes once on a draining listener", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    let closes = 1;
    const engine = await fakeEngine(workspace, (request) =>
      request.method === "handshake" && closes-- > 0 ? "close" : undefined,
    );
    const c = client(workspace);
    await c.query("kb_a");
    expect(engine.requests.map((r) => r.method)).toStrictEqual([
      "handshake",
      "handshake",
      "command",
      "query",
    ]);
    closes = 2;
    const other = client(workspace);
    await expect(other.query("kb_a")).rejects.toThrow(
      "Kibi engine connection closed",
    );
    closes = 1;
    const quiet = client(workspace);
    await expect(quiet.start(false)).rejects.toThrow(
      "Kibi engine connection closed",
    );
  });
});

type SpawnCall = {
  bin: string;
  args: string[];
  options: Record<string, unknown>;
};

function fakeSpawn(
  onSpawn: (args: string[]) => Promise<unknown> | unknown = () => undefined,
  failure?: unknown,
): SpawnCall[] {
  const calls: SpawnCall[] = [];
  spyOn(childProcess, "spawn").mockImplementation(((
    bin: string,
    args: string[],
    options: Record<string, unknown>,
  ) => {
    calls.push({ bin, args, options });
    if (failure === "throw") throw new Error("spawn EACCES");
    if (failure === "throw-plain") throw "spawn refused";
    const child = Object.assign(new EventEmitter(), {
      unrefs: 0,
      unref() {
        child.unrefs += 1;
      },
    });
    queueMicrotask(async () => {
      if (failure !== undefined) {
        child.emit("error", failure);
        return;
      }
      await onSpawn(args);
      child.emit("spawn");
    });
    return child;
  }) as never);
  return calls;
}

function onlyEntry(candidate: string | null): void {
  const exists = fs.existsSync;
  spyOn(fs, "existsSync").mockImplementation(((file: string) => {
    if (String(file).endsWith("engine-daemon.js")) return file === candidate;
    return exists(file);
  }) as never);
}

const SRC_DIR = path.resolve(import.meta.dir, "..", "src");

describe("engine client start", () => {
  test("spawn a detached daemon when no engine answers", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const real = fs.realpathSync(workspace);
    const socketPath = engineSocketPath(workspace, "main");
    writeFileSync(`${socketPath}.error`, "");
    const entry = path.join(SRC_DIR, "engine-daemon.js");
    onlyEntry(entry);
    const calls = fakeSpawn(async () => {
      expect(existsSync(`${socketPath}.error`)).toBe(false);
      expect(existsSync(engineStartLockPath(workspace, "main"))).toBe(true);
      await fakeEngine(workspace);
    });
    const c = client(workspace);
    await c.start();
    expect(calls).toHaveLength(1);
    const [call] = calls as [SpawnCall];
    expect([call.bin, call.args]).toStrictEqual([
      "node",
      [entry, "--workspace", real, "--branch", "main", "--socket", socketPath],
    ]);
    const env = call.options.env as Record<string, string>;
    expect([
      call.options.detached,
      call.options.stdio,
      env.KIBI_ENGINE_PROTOCOL,
      env.KIBI_PACKAGE_VERSIONS,
      env.KIBI_RUNTIME_DIR,
    ]).toStrictEqual([true, "ignore", "1", enginePackageVersions(), runtime]);
    expect(existsSync(engineStartLockPath(workspace, "main"))).toBe(false);
    expect((clientPrivates(c).daemon as { unrefs: number }).unrefs).toBe(1);
    expect(c.isRunning()).toBe(true);
    await c.start();
    expect(calls).toHaveLength(1);
  });

  test("find the daemon entry beside the module, in dist or a host bundle", async () => {
    const candidates = [
      path.join(SRC_DIR, "engine-daemon.js"),
      path.join(SRC_DIR, "..", "dist", "engine-daemon.js"),
      path.join(
        SRC_DIR,
        "..",
        "node_modules",
        "kibi-cli",
        "dist",
        "engine-daemon.js",
      ),
    ];
    for (const candidate of candidates) {
      const workspace = tempDir();
      prepareStore(workspace);
      onlyEntry(candidate);
      const calls = fakeSpawn(() => fakeEngine(workspace));
      await client(workspace).start();
      expect(calls[0]?.args[0]).toBe(candidate);
      mock.restore();
    }
    const workspace = tempDir();
    onlyEntry(null);
    fakeSpawn();
    await expect(client(workspace).start()).rejects.toThrow(
      "The Kibi engine is not built. Run `npm run build:cli` before using the CLI engine.",
    );
  });

  test("explain a daemon that could not be started", async () => {
    for (const [failure, detail] of [
      [new Error("spawn ENOENT"), "spawn ENOENT"],
      ["throw", "spawn EACCES"],
      ["throw-plain", "spawn refused"],
      ["odd", "odd"],
    ] as const) {
      const workspace = tempDir();
      process.env.KIBI_NODE_PATH = "/opt/node";
      onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
      fakeSpawn(undefined, failure);
      await expect(client(workspace).start()).rejects.toThrow(
        `Kibi engine requires Node.js >=18 to host the daemon; failed to start '/opt/node': ${detail}`,
      );
      expect(existsSync(engineStartLockPath(workspace, "main"))).toBe(false);
      mock.restore();
    }
  });

  test("report the diagnostic a failed daemon left", async () => {
    const workspace = tempDir();
    const socketPath = engineSocketPath(workspace, "main");
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn(() => writeFileSync(`${socketPath}.error`, "  store_locked \n"));
    const error = await client(workspace)
      .start()
      .catch((e: Error & { code?: string }) => e);
    expect([
      (error as Error).message,
      (error as { code?: string }).code,
    ]).toStrictEqual([
      "Kibi engine failed to start: store_locked",
      "ENGINE_START_FAILED",
    ]);
    mock.restore();
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn(() => mkdirSync(`${socketPath}.error`));
    expect(
      await client(workspace)
        .start()
        .catch((e: Error) => e.message),
    ).toStartWith("Kibi engine failed to start: EISDIR");
  });

  test("keep waiting past an empty diagnostic", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const socketPath = engineSocketPath(workspace, "main");
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn(() => {
      writeFileSync(`${socketPath}.error`, " \n");
      setTimeout(() => void fakeEngine(workspace), 60);
    });
    const c = client(workspace);
    await c.start();
    expect(c.isRunning()).toBe(true);
  });

  test("give up on a daemon that never listens", async () => {
    const workspace = tempDir();
    const socketPath = engineSocketPath(workspace, "main");
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn();
    await expect(client(workspace, { timeout: 120 }).start()).rejects.toThrow(
      `Unable to connect to Kibi engine at ${socketPath}: undefined`,
    );
    mock.restore();
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn(() => writeFileSync(socketPath, ""));
    expect(
      await client(workspace, { timeout: 200 })
        .start()
        .catch((e: Error) => e.message),
    ).toStartWith(`Unable to connect to Kibi engine at ${socketPath}: `);
  });

  test("report a spawned daemon that exits without listening", async () => {
    const workspace = tempDir();
    const socketPath = engineSocketPath(workspace, "main");
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    const children: EventEmitter[] = [];
    fakeSpawn();
    const spawnSpy = childProcess.spawn as unknown as {
      mockImplementation(fn: unknown): void;
      getMockImplementation(): (...args: unknown[]) => EventEmitter;
    };
    const fake = spawnSpy.getMockImplementation();
    spawnSpy.mockImplementation((...args: unknown[]) => {
      const child = fake(...args);
      children.push(child);
      child.once("spawn", () =>
        setTimeout(() => child.emit("exit", 3, null), 10),
      );
      return child;
    });
    const startedAt = Date.now();
    const error = (await client(workspace, { timeout: 60_000 })
      .start()
      .catch((e: unknown) => e)) as Error & { code?: string };
    const elapsed = Date.now() - startedAt;
    expect(error.message).toBe(
      `Kibi engine exited (exit code 3) before it accepted connections at ${socketPath}`,
    );
    expect(error.code).toBe("ENGINE_START_FAILED");
    expect(children).toHaveLength(1);
    expect(elapsed).toBeGreaterThanOrEqual(1000);
    expect(elapsed).toBeLessThan(5000);
  });

  test("name the signal that ended a spawned daemon", async () => {
    const workspace = tempDir();
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn();
    const spawnSpy = childProcess.spawn as unknown as {
      mockImplementation(fn: unknown): void;
      getMockImplementation(): (...args: unknown[]) => EventEmitter;
    };
    const fake = spawnSpy.getMockImplementation();
    spawnSpy.mockImplementation((...args: unknown[]) => {
      const child = fake(...args);
      child.once("spawn", () => child.emit("exit", null, "SIGKILL"));
      return child;
    });
    expect(
      await client(workspace, { timeout: 60_000 })
        .start()
        .catch((e: Error) => e.message),
    ).toStartWith("Kibi engine exited (SIGKILL) before");
  });

  test("a daemon that loses the start race still connects to the winner", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn();
    const spawnSpy = childProcess.spawn as unknown as {
      mockImplementation(fn: unknown): void;
      getMockImplementation(): (...args: unknown[]) => EventEmitter;
    };
    const fake = spawnSpy.getMockImplementation();
    spawnSpy.mockImplementation((...args: unknown[]) => {
      const child = fake(...args);
      child.once("spawn", () => {
        child.emit("exit", 0, null);
        setTimeout(() => void fakeEngine(workspace), 300);
      });
      return child;
    });
    const c = client(workspace, { timeout: 60_000 });
    await c.start();
    expect(c.isRunning()).toBe(true);
  });

  test("a start that times out carries a code", async () => {
    const workspace = tempDir();
    const socketPath = engineSocketPath(workspace, "main");
    const lockPath = engineStartLockPath(workspace, "main");
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn();
    const never = (await client(workspace, { timeout: 120 })
      .start()
      .catch((e: unknown) => e)) as { code?: string };
    expect(never.code).toBe("ENGINE_CONNECT_TIMEOUT");
    mock.restore();
    writeFileSync(lockPath, `${process.pid}:${Date.now()}\n`);
    fakeSpawn();
    const locked = (await client(workspace, { timeout: 120 })
      .start()
      .catch((e: unknown) => e)) as { code?: string; message: string };
    expect(locked.message).toContain(socketPath);
    expect(locked.code).toBe("ENGINE_CONNECT_TIMEOUT");
  });

  test("time out a connection that never completes", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const socketPath = engineSocketPath(workspace, "main");
    writeFileSync(socketPath, "");
    const destroyed: number[] = [];
    spyOn(net, "createConnection").mockImplementation((() => {
      const fake = Object.assign(new EventEmitter(), {
        destroy() {
          destroyed.push(1);
          queueMicrotask(() => fake.emit("error", new Error("late")));
        },
      });
      return fake;
    }) as never);
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn();
    expect(
      await client(workspace, { timeout: 300 })
        .start()
        .catch((e: Error) => e.message),
    ).toBe(
      `Unable to connect to Kibi engine at ${socketPath}: Timed out connecting to Kibi engine at ${socketPath}`,
    );
    expect(destroyed.length).toBeGreaterThan(1);
  });

  test("connect once the starter that owns the lock is listening", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const lockPath = engineStartLockPath(workspace, "main");
    writeFileSync(lockPath, `${process.pid}:${Date.now()}\n`);
    const calls = fakeSpawn();
    setTimeout(() => void fakeEngine(workspace), 80);
    const c = client(workspace, { timeout: 2000 });
    await c.start();
    expect(calls).toHaveLength(0);
    expect(c.isRunning()).toBe(true);
    expect(existsSync(lockPath)).toBe(true);
  });

  test("refuse to start beside a starter that keeps its lock", async () => {
    const workspace = tempDir();
    const socketPath = engineSocketPath(workspace, "main");
    const lockPath = engineStartLockPath(workspace, "main");
    writeFileSync(lockPath, `${process.pid}:${Date.now()}\n`);
    const calls = fakeSpawn();
    await expect(client(workspace, { timeout: 120 }).start()).rejects.toThrow(
      `Unable to connect to Kibi engine at ${socketPath} while another starter owns ${lockPath}`,
    );
    expect(calls).toHaveLength(0);
  });

  test("wait for a draining daemon to finish", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const pidPath = enginePidPath(workspace, "main");
    writeFileSync(pidPath, `${process.pid}\n`);
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    const calls = fakeSpawn(() => fakeEngine(workspace));
    setTimeout(() => rmSync(pidPath), 120);
    const started = performance.now();
    await client(workspace, { timeout: 3000 }).start();
    expect(performance.now() - started).toBeGreaterThanOrEqual(100);
    expect(calls).toHaveLength(1);
    mock.restore();
    writeFileSync(pidPath, `${DEAD_PID}\n`);
    const other = tempDir();
    prepareStore(other);
    const otherPid = enginePidPath(other, "main");
    writeFileSync(otherPid, `${DEAD_PID}\n`);
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    const again = fakeSpawn(() => fakeEngine(other));
    await client(other, { timeout: 3000 }).start();
    expect(again).toHaveLength(1);
  });

  test("never start while a publication holds its lease", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const lease = acquireEnginePublicationLease(workspace, "main");
    cleanups.push(() => lease.release());
    const calls = fakeSpawn();
    await expect(client(workspace).start()).rejects.toThrow(
      `Kibi engine publication is in progress: ${lease.path}`,
    );
    await fakeEngine(workspace);
    const allowed = client(workspace, { allowPublicationLock: true });
    await allowed.start();
    expect(allowed.isRunning()).toBe(true);
    expect(calls).toHaveLength(0);
  });

  test("ignore a stale publication lock", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const lockPath = enginePublicationLockPath(workspace, "main");
    writeFileSync(lockPath, `${DEAD_PID}:1\n`);
    age(lockPath, 6000);
    await fakeEngine(workspace);
    const c = client(workspace);
    await c.start();
    expect(existsSync(lockPath)).toBe(false);
  });

  test("stay disconnected without permission to spawn", async () => {
    const workspace = tempDir();
    const calls = fakeSpawn();
    const c = client(workspace);
    await c.start(false);
    expect(c.isRunning()).toBe(false);
    expect(calls).toHaveLength(0);
    expect(await c.inspectLiveDaemon()).toBeNull();
  });
});

function stoppable(
  workspace: string,
  identity: Record<string, unknown>,
  extra: (request: Request) => Reply | undefined = () => undefined,
): Promise<FakeEngine> {
  let engine: FakeEngine;
  const pidPath = enginePidPath(workspace, "main");
  writeFileSync(pidPath, `${process.pid}\n`);
  return fakeEngine(workspace, (request) => {
    if (request.method === "handshake") return { ok: true, result: identity };
    if (request.method === "stop") {
      setTimeout(() => {
        void engine.close();
        rmSync(pidPath, { force: true });
      }, 5);
      return { ok: true, result: { stopped: true } };
    }
    return extra(request);
  }).then((created) => {
    engine = created;
    return created;
  });
}

const GOOD = () => ({
  prologIdentity: engineSwiplIdentity(),
  packageVersions: enginePackageVersions(),
});

describe("engine client replacement", () => {
  test("replace a daemon from another install or Prolog", async () => {
    for (const [identity, message] of [
      [
        { ...GOOD(), packageVersions: "old@1" },
        `Kibi engine is running other package versions (old@1) than this client (${enginePackageVersions()})`,
      ],
      [
        { prologIdentity: engineSwiplIdentity() },
        `Kibi engine is running other package versions (not reported) than this client (${enginePackageVersions()})`,
      ],
      [
        { ...GOOD(), prologIdentity: "swipl@0" },
        `Kibi engine is running a different SWI-Prolog than this client resolved (${engineSwiplIdentity()})`,
      ],
      [{ packageVersions: enginePackageVersions(), prologIdentity: 5 }, "SWI"],
    ] as const) {
      const workspace = tempDir();
      prepareStore(workspace);
      const stale = await stoppable(workspace, identity);
      onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
      const calls = fakeSpawn(() => fakeEngine(workspace));
      const c = client(workspace);
      await c.query("kb_a");
      expect(stale.requests.map((r) => r.method)).toStrictEqual([
        "handshake",
        "stop",
      ]);
      expect(calls).toHaveLength(1);
      expect(message.length).toBeGreaterThan(0);
      mock.restore();
      const still = tempDir();
      prepareStore(still);
      await stoppable(still, identity);
      onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
      fakeSpawn(() => stoppable(still, identity));
      const failing = client(still);
      const text = await failing.query("kb_a").catch((e: Error) => e.message);
      if (message !== "SWI")
        expect(text).toBe(
          `${message} after replacing it; run 'kibi engine stop' and retry`,
        );
      else expect(text).toContain("different SWI-Prolog");
      mock.restore();
    }
  });

  test("replace a daemon attached to another generation", async () => {
    const workspace = tempDir();
    const store = prepareStore(workspace);
    const stale = await stoppable(workspace, GOOD(), (request) =>
      request.method === "command"
        ? {
            ok: true,
            result: statusAnswer({
              ...liveIdentity(workspace),
              attachedIno: 1,
              attachedDev: 1,
            }),
          }
        : undefined,
    );
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn(() => fakeEngine(workspace));
    await client(workspace).query("kb_a");
    expect(stale.requests.map((r) => r.method)).toStrictEqual([
      "handshake",
      "command",
      "stop",
    ]);
    mock.restore();
    const bad = statusAnswer({
      attachedPath: "/x",
      attachedGeneration: "g",
      attachedDev: 1,
      attachedIno: 1,
    });
    const other = tempDir();
    const otherStore = prepareStore(other);
    const stuck = (request: Request) =>
      request.method === "command" ? { ok: true, result: bad } : undefined;
    await stoppable(other, GOOD(), stuck);
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn(() => stoppable(other, GOOD(), stuck));
    const live = readEngineAttachmentIdentity(otherStore);
    expect(
      await client(other)
        .query("kb_a")
        .catch((e: Error) => e.message),
    ).toBe(
      `Kibi engine is attached to a stale branch generation: operation=attachment-handshake branchStore=${live?.path} expectedGeneration=generation-1:0 attachedPath=/x attachedGeneration=g`,
    );
    expect(store).not.toBe(otherStore);
  });

  test("treat a failed status as a stale attachment", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const stale = await stoppable(workspace, GOOD(), (request) =>
      request.method === "command"
        ? { ok: true, result: { success: false, bindings: {} } }
        : undefined,
    );
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    const calls = fakeSpawn(() => fakeEngine(workspace));
    await client(workspace).query("kb_a");
    expect(stale.requests.at(-1)?.method).toBe("stop");
    expect(calls).toHaveLength(1);
  });

  test("report a daemon that does not stop", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    writeFileSync(enginePidPath(workspace, "main"), `${process.pid}\n`);
    let fast = false;
    await fakeEngine(workspace, (request) => {
      if (request.method === "handshake")
        return { ok: true, result: { ...GOOD(), packageVersions: "old" } };
      if (request.method !== "stop") return undefined;
      fast = true;
      return { ok: false, error: "busy" };
    });
    const realNow = Date.now;
    let offset = 0;
    spyOn(Date, "now").mockImplementation(() => {
      if (fast) offset += 1000;
      return realNow() + offset;
    });
    expect(
      await client(workspace)
        .query("kb_a")
        .catch((e: Error) => e.message),
    ).toBe("Kibi engine did not stop within 5 seconds: busy");
  });

  test("report a socket left behind without its daemon", async () => {
    const workspace = tempDir();
    const socketPath = engineSocketPath(workspace, "main");
    writeFileSync(socketPath, "");
    const c = client(workspace);
    await expect(c.stop(false)).rejects.toThrow(
      `Kibi engine socket remains present but is not reachable: ${socketPath}`,
    );
  });
});

describe("engine client stop and inspect", () => {
  test("stop a live daemon and wait for its files", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const engine = await stoppable(workspace, GOOD());
    const c = client(workspace);
    await c.start();
    expect(c.getPid()).toBe(process.pid);
    expect(await c.stop()).toBe(true);
    expect(engine.requests.at(-1)?.method).toBe("stop");
    expect(c.isRunning()).toBe(false);
    expect(existsSync(enginePidPath(workspace, "main"))).toBe(false);
    expect(c.getPid()).toBe(0);
  });

  test("answer false when nothing runs and nothing may start", async () => {
    const workspace = tempDir();
    const c = client(workspace);
    expect(await c.stop(false)).toBe(false);
    writeFileSync(enginePidPath(workspace, "main"), "junk\n");
    expect(c.getPid()).toBe(0);
    expect(await c.stop(false)).toBe(false);
    writeFileSync(enginePidPath(workspace, "main"), `${DEAD_PID}\n`);
    expect(await c.stop(false)).toBe(false);
  });

  test("wait for a draining daemon that has no listener", async () => {
    const workspace = tempDir();
    const pidPath = enginePidPath(workspace, "main");
    writeFileSync(pidPath, `${process.pid}\n`);
    setTimeout(() => rmSync(pidPath), 60);
    expect(await client(workspace).stop(false)).toBe(true);
    expect(existsSync(pidPath)).toBe(false);
  });

  test("explain a stop that could not start an engine", async () => {
    const workspace = tempDir();
    onlyEntry(null);
    await expect(client(workspace).stop()).rejects.toThrow(
      "Unable to start Kibi engine for stop request",
    );
  });

  test("inspect a live daemon without keeping the connection", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    let identity: Record<string, unknown> = GOOD();
    await fakeEngine(workspace, (request) =>
      request.method === "handshake"
        ? { ok: true, result: identity }
        : undefined,
    );
    const c = client(workspace);
    expect(await c.inspectLiveDaemon()).toStrictEqual(GOOD());
    expect(c.isRunning()).toBe(false);
    identity = { prologIdentity: 1, packageVersions: null };
    expect(await c.inspectLiveDaemon()).toStrictEqual({
      prologIdentity: null,
      packageVersions: null,
    });
    identity = GOOD();
    await c.start();
    expect(await c.inspectLiveDaemon()).toStrictEqual(GOOD());
    expect(c.isRunning()).toBe(true);
    await c.terminate();
    expect([c.isRunning(), await c.nextSolution()]).toStrictEqual([
      false,
      null,
    ]);
    expect(clientPrivates(c).daemon).toBeNull();
  });

  test("read a missing handshake reply as unknown", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    await fakeEngine(workspace, (request) =>
      request.method === "handshake" ? { ok: true } : undefined,
    );
    expect(await client(workspace).inspectLiveDaemon()).toStrictEqual({
      prologIdentity: null,
      packageVersions: null,
    });
  });
});

describe("engine edge paths", () => {
  test("release locks another process already removed", () => {
    const workspace = tempDir();
    const lease = acquireEnginePublicationLease(workspace, "main");
    rmSync(lease.path);
    rmSync(engineStartLockPath(workspace, "main"));
    expect(() => lease.release()).not.toThrow();
  });

  test("read an unreadable publication lock as ownerless", () => {
    const workspace = tempDir();
    const lockPath = enginePublicationLockPath(workspace, "main");
    mkdirSync(path.dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, `${process.pid}:1\n`);
    age(lockPath, 6000);
    const read = fs.readFileSync;
    spyOn(fs, "readFileSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      if (file === lockPath) throw new Error("EACCES");
      return (read as (...a: unknown[]) => unknown)(file, ...rest);
    }) as never);
    acquireEnginePublicationLease(workspace, "main").release();
  });

  test("refuse a request after its connection closed in the queue", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    await fakeEngine(workspace, (request) =>
      request.goal === "kb_drop" ? "close" : undefined,
    );
    const c = client(workspace);
    await c.start();
    const [first, second] = await Promise.allSettled([
      c.query("kb_drop"),
      c.query("kb_next"),
    ]);
    expect([
      (first as PromiseRejectedResult).reason.message,
      (second as PromiseRejectedResult).reason.message,
    ]).toStrictEqual([
      "Kibi engine connection closed",
      "Kibi engine is not connected",
    ]);
  });

  test("refuse to replace a daemon whose socket stopped answering", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const socketPath = engineSocketPath(workspace, "main");
    await fakeEngine(workspace, (request, socket) => {
      if (request.method !== "handshake") return undefined;
      setTimeout(() => socket.destroy(), 5);
      return { ok: true, result: { ...GOOD(), packageVersions: "old" } };
    });
    const c = client(workspace);
    const realHandshake = (
      c as unknown as { daemonHandshake: () => Promise<unknown> }
    ).daemonHandshake.bind(c);
    (
      c as unknown as { daemonHandshake: () => Promise<unknown> }
    ).daemonHandshake = async () => {
      const reply = await realHandshake();
      await until(() => !c.isRunning());
      return reply;
    };
    await expect(c.start()).rejects.toThrow(
      `Kibi engine socket remains present but is not reachable: ${socketPath}`,
    );
  });

  test("drop a frame that cannot be written to a peer", async () => {
    const daemon = await startDaemon();
    const peer = await Peer.open(daemon.socketPath);
    cleanups.push(() => peer.close());
    const write = net.Socket.prototype.write;
    let fail = true;
    spyOn(net.Socket.prototype, "write").mockImplementation(function (
      this: net.Socket,
      ...args: unknown[]
    ) {
      if (fail && this !== peer.socket) throw new Error("EPIPE");
      return (write as (...a: unknown[]) => boolean).apply(this, args);
    } as never);
    peer.send(daemon.base({ method: "handshake" }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    fail = false;
    peer.send(daemon.base({ method: "cancel", cancelOf: 1 }));
    expect((await peer.next()).result).toStrictEqual({ cancelled: 1 });
  });

  test("remove a socket file the listener left behind", async () => {
    const daemon = await startDaemon();
    const exists = fs.existsSync;
    let shutting = false;
    spyOn(fs, "existsSync").mockImplementation(((file: string) =>
      shutting && file === daemon.socketPath ? true : exists(file)) as never);
    const rm = fs.rmSync;
    const removed: string[] = [];
    spyOn(fs, "rmSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      removed.push(String(file));
      (rm as (...a: unknown[]) => void)(file, ...rest);
    }) as never);
    shutting = true;
    await daemon.request({ method: "stop" });
    await daemon.run;
    expect(removed).toStrictEqual([
      daemon.socketPath,
      enginePidPath(daemon.workspace, "main"),
    ]);
  });

  test("turn away a connection that arrives during shutdown", async () => {
    let server: net.Server | null = null;
    const create = net.createServer;
    spyOn(net, "createServer").mockImplementation(((...args: unknown[]) => {
      server = (create as (...a: unknown[]) => net.Server)(...args);
      return server;
    }) as never);
    const hold = gate();
    const daemon = await startDaemon((goal) =>
      goal === "kb_save" ? hold.wait.then(() => OK) : OK,
    );
    await settled(daemon);
    await daemon.request({ method: "stop" });
    await until(() => daemon.stub.goals.includes("kb_save"));
    const late = Object.assign(new EventEmitter(), {
      destroyed: 0,
      destroy() {
        late.destroyed += 1;
      },
    });
    (server as unknown as net.Server).emit("connection", late);
    expect(late.destroyed).toBe(1);
    expect(late.listenerCount("error")).toBe(1);
    late.emit("error", new Error("reset"));
    hold.open();
    await daemon.run;
  });

  test("keep a socket whose mode cannot be changed", async () => {
    spyOn(fs, "chmodSync").mockImplementation((() => {
      throw new Error("EPERM");
    }) as never);
    const daemon = await startDaemon();
    await settled(daemon);
    expect(result(await daemon.request({ method: "handshake" }))).toBeDefined();
  });

  test("restore a generation pair over a torn database", async () => {
    const store = journalStore();
    rmSync(path.join(store, "CURRENT"));
    writeFileSync(path.join(store, "rdf", "new"), "torn");
    mkdirSync(path.join(store, "rdf.old.1"));
    writeFileSync(path.join(store, "rdf.old.1", "old"), "kept");
    writeFileSync(path.join(store, "CURRENT.old.1"), "old\n");
    await ensureJournaledBranchStoreAsync(store);
    expect(readdirSync(path.join(store, "rdf"))).toStrictEqual(["old"]);
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toBe("old\n");
  });
});

function onPlatform(platform: NodeJS.Platform): void {
  const original = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", {
    value: platform,
    configurable: true,
  });
  cleanups.push(() => {
    if (original) Object.defineProperty(process, "platform", original);
  });
}

describe("other platforms", () => {
  test("follow TMPDIR and the shorter socket budget on macOS", () => {
    const tmp = tempDir();
    const long = path.join(tempDir(), "y".repeat(50));
    mkdirSync(long, { mode: 0o700 });
    const lines = captureStderr();
    Reflect.deleteProperty(process.env, "KIBI_RUNTIME_DIR");
    process.env.TMPDIR = tmp;
    onPlatform("darwin");
    expect(runtimeDirectory()).toBe(path.join(tmp, "kibi-runtime"));
    process.env.KIBI_RUNTIME_DIR = long;
    expect(runtimeDirectory()).toBe(fallbackFor(long));
    expect(lines).toStrictEqual([
      `kibi: ignoring KIBI_RUNTIME_DIR=${long} because its path is too long for a Unix socket (at most 60 bytes); using a private directory under /tmp instead.\n`,
    ]);
  });

  test("keep Windows runtime files in a writable directory", () => {
    const tmp = tempDir();
    process.env.TMPDIR = tmp;
    const configured = path.join(runtime, "win");
    process.env.KIBI_RUNTIME_DIR = configured;
    onPlatform("win32");
    const written: string[] = [];
    const open = fs.openSync;
    let failFirst = false;
    spyOn(fs, "openSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      written.push(String(file));
      expect(rest).toStrictEqual(["wx", 0o600]);
      if (failFirst && String(file).startsWith(configured))
        throw new Error("EROFS");
      return (open as (...a: unknown[]) => number)(file, ...rest);
    }) as never);
    expect(runtimeDirectory()).toBe(configured);
    expect(written).toStrictEqual([
      path.join(configured, `.kibi-write-${process.pid}`),
    ]);
    expect(readdirSync(configured)).toStrictEqual([]);
    expect(statSync(configured).mode & 0o777).toBe(0o700);
    failFirst = true;
    expect(runtimeDirectory()).toBe(path.join(tmp, "kibi-runtime"));
    spyOn(fs, "mkdirSync").mockImplementation((() => {
      throw new Error("EACCES");
    }) as never);
    expect(() => runtimeDirectory()).toThrow(
      "Unable to create a writable Kibi engine runtime directory",
    );
  });

  test("name Windows pipes and runtime files", () => {
    const workspace = tempDir();
    const real = fs.realpathSync(workspace);
    onPlatform("win32");
    const key = createHash("sha256")
      .update(`${path.resolve(workspace)}\0main`)
      .digest("hex");
    expect(engineSocketPath(workspace, "main")).toBe(
      `\\\\.\\pipe\\kibi-${sha(`${real}\0main`)}`,
    );
    expect(enginePidPath(workspace, "main")).toBe(
      path.join(runtime, `kibi-${key}.pid`),
    );
    expect(engineStartLockPath(workspace, "main")).toBe(
      path.join(runtime, `kibi-${key}.start.lock`),
    );
  });

  test("sync no directories on Windows", () => {
    const store = tempDir();
    mkdirSync(path.join(store, "rdf"));
    writeFileSync(path.join(store, "CURRENT"), "g");
    onPlatform("win32");
    const opened: string[] = [];
    const open = fs.openSync;
    spyOn(fs, "openSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      opened.push(String(file));
      return (open as (...a: unknown[]) => number)(file, ...rest);
    }) as never);
    fsyncJournaledBranchStore(store);
    expect(opened).toStrictEqual([path.join(store, "CURRENT")]);
  });

  test("dial a Windows pipe without waiting for a file", async () => {
    const workspace = tempDir();
    onPlatform("win32");
    const socketPath = engineSocketPath(workspace, "main");
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    fakeSpawn();
    const message = (await client(workspace, { timeout: 150 })
      .start()
      .catch((e: Error) => e.message)) as string;
    expect(
      message.startsWith(`Unable to connect to Kibi engine at ${socketPath}: `),
    ).toBe(true);
    expect(message).not.toBe(
      `Unable to connect to Kibi engine at ${socketPath}: undefined`,
    );
  });

  test("leave the socket mode alone on Windows", async () => {
    const chmods: string[] = [];
    const chmod = fs.chmodSync;
    spyOn(fs, "chmodSync").mockImplementation(((file: string, mode: number) => {
      chmods.push(String(file));
      chmod(file, mode);
    }) as never);
    const workspace = tempDir("kibi-ws-");
    const socketPath = engineSocketPath(workspace, "main");
    stubProlog((goal) => (goal === STATUS_GOAL ? statusAnswer() : OK));
    spyOn(process, "exit").mockImplementation((() => undefined) as never);
    onPlatform("win32");
    const run = runEngineDaemon({
      workspaceRoot: workspace,
      branch: "main",
      socketPath,
    });
    await until(() => existsSync(socketPath));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(chmods).toStrictEqual([]);
    const peer = await Peer.open(socketPath);
    peer.send({
      id: 1,
      method: "stop",
      protocolVersion: 1,
      workspaceRoot: fs.realpathSync(workspace),
      branch: "main",
    });
    await peer.next();
    peer.close();
    await run;
    await new Promise((resolve) => setTimeout(resolve, 80));
  });
});

describe("engine goal safety", () => {
  test("mask comments and quoted data before the safety check", async () => {
    const daemon = await startDaemon();
    const refused =
      "Kibi engine accepts only typed Kibi predicates; arbitrary Prolog goals are not exposed";
    const verdicts: Array<[string, string]> = [];
    for (const goal of [
      "kb_x, 'shell(",
      'kb_x, "shell(',
      "kb_x, `shell(",
      "kb_x, /* shell(",
      "kb_x, % shell(",
      "kb_x('a\\ shell(x)')",
      "kb_x('a\\'shell(x)')",
      'kb_x("a\\ shell(x)")',
      'kb_x("a\\"shell(x)")',
      "kb_x(`a\\ shell(x)`)",
      "kb_x(`a\\`shell(x)`)",
      "kb_x('a''shell(x)')",
      "kb_x, sys'q'tem(1)",
      "kb_x, 'a'halt(1)",
      "kb_x('it\\",
      'kb_x("\\a"), shell(1)',
      "kb_x(`\\a`), shell(1)",
      "kb_x, shell(1)",
    ]) {
      const response = await daemon.request({ method: "query", goal });
      verdicts.push([
        goal,
        response.ok ? "accepted" : (response.error as string),
      ]);
    }
    const accepted = (goal: string): [string, string] => [goal, "accepted"];
    expect(verdicts).toStrictEqual([
      accepted("kb_x, 'shell("),
      accepted('kb_x, "shell('),
      accepted("kb_x, `shell("),
      accepted("kb_x, /* shell("),
      accepted("kb_x, % shell("),
      accepted("kb_x('a\\ shell(x)')"),
      accepted("kb_x('a\\'shell(x)')"),
      accepted('kb_x("a\\ shell(x)")'),
      accepted('kb_x("a\\"shell(x)")'),
      accepted("kb_x(`a\\ shell(x)`)"),
      accepted("kb_x(`a\\`shell(x)`)"),
      accepted("kb_x('a''shell(x)')"),
      accepted("kb_x, sys'q'tem(1)"),
      ["kb_x, 'a'halt(1)", refused],
      accepted("kb_x('it\\"),
      ['kb_x("\\a"), shell(1)', refused],
      ["kb_x(`\\a`), shell(1)", refused],
      ["kb_x, shell(1)", refused],
    ]);
  });

  test("cache only goals that start with a cacheable read", async () => {
    const daemon = await startDaemon();
    const mark = await settled(daemon);
    for (let round = 0; round < 2; round += 1) {
      await daemon.request({ method: "query", goal: " kb_entity(X)" });
      await daemon.request({ method: "query", goal: "kb_entity(Y)" });
    }
    expect(
      goalsSince(daemon, mark).filter((goal) => goal.includes("kb_entity")),
    ).toStrictEqual([" kb_entity(X)", "kb_entity(Y)", " kb_entity(X)"]);
  });
});

describe("engine cancel marks", () => {
  test("mark only numeric cancels, from cancel frames and cancel commands", async () => {
    const daemon = await startDaemon();
    const peer = await Peer.open(daemon.socketPath);
    cleanups.push(() => peer.close());
    const send = async (fields: Record<string, unknown>) => {
      peer.send({ ...daemon.base(), ...fields });
      return peer.next();
    };
    expect(
      (await send({ id: 501, method: "query", goal: "kb_a", cancelOf: 502 }))
        .ok,
    ).toBe(true);
    expect((await send({ id: 502, method: "query", goal: "kb_a" })).ok).toBe(
      true,
    );
    expect(
      (await send({ id: 503, method: "cancel", cancelOf: "504" })).result,
    ).toStrictEqual({ cancelled: "504" });
    expect((await send({ id: 504, method: "query", goal: "kb_a" })).ok).toBe(
      true,
    );
    expect(
      (
        await send({
          id: 505,
          method: "command",
          command: { version: 1, kind: "cancel", requestId: 506 },
        })
      ).result,
    ).toStrictEqual({ cancelled: 506 });
    expect((await send({ id: 506, method: "query", goal: "kb_a" })).error).toBe(
      "Kibi engine request cancelled",
    );
    expect(
      (
        await send({
          id: 507,
          method: "command",
          command: {
            version: 1,
            kind: "lifecycle",
            action: "cancel",
            requestId: 508,
          },
        })
      ).result,
    ).toStrictEqual({ cancelled: 508 });
    expect((await send({ id: 508, method: "query", goal: "kb_a" })).error).toBe(
      "Kibi engine request cancelled",
    );
  });
});

/** Track which lock files each closed descriptor belonged to. */
function trackCloses(): string[] {
  const paths = new Map<number, string>();
  const open = fs.openSync;
  spyOn(fs, "openSync").mockImplementation(((
    file: string,
    ...rest: unknown[]
  ) => {
    const fd = (open as (...args: unknown[]) => number)(file, ...rest);
    paths.set(fd, String(file));
    return fd;
  }) as never);
  const closed: string[] = [];
  const close = fs.closeSync;
  spyOn(fs, "closeSync").mockImplementation(((fd: number) => {
    closed.push(paths.get(fd) as string);
    close(fd);
  }) as never);
  return closed;
}

/** Advance Date.now by every 25 ms and 50 ms poll, and run the poll at once. */
function fakePolls(start = 1_000_000): number[] {
  let now = start;
  spyOn(Date, "now").mockImplementation(() => now);
  const polls: number[] = [];
  const real = globalThis.setTimeout;
  spyOn(globalThis, "setTimeout").mockImplementation(((
    callback: () => void,
    ms?: number,
    ...rest: unknown[]
  ) => {
    if (ms === 25 || ms === 50) {
      polls.push(ms);
      now += ms;
      return real(callback, 0);
    }
    return (real as (...args: unknown[]) => unknown)(callback, ms, ...rest);
  }) as never);
  return polls;
}

describe("lock guards", () => {
  test("judge a publication lock stale only past five seconds", () => {
    const workspace = tempDir();
    const lockPath = enginePublicationLockPath(workspace, "main");
    mkdirSync(path.dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, `${DEAD_PID}:1\n`);
    utimesSync(lockPath, 1000, 1000);
    const now = spyOn(Date, "now").mockReturnValue(1_005_000);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      `Kibi engine publication is already in progress: ${lockPath}`,
    );
    now.mockReturnValue(1_005_001);
    acquireEnginePublicationLease(workspace, "main").release();
    expect(existsSync(lockPath)).toBe(false);
  });

  test("stay busy when the lock it could not create is gone when inspected", () => {
    const workspace = tempDir();
    const lockPath = enginePublicationLockPath(workspace, "main");
    const open = fs.openSync;
    let refused = false;
    spyOn(fs, "openSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      if (file === lockPath && !refused) {
        refused = true;
        throw new Error("EEXIST");
      }
      return (open as (...args: unknown[]) => number)(file, ...rest);
    }) as never);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      `Kibi engine publication is already in progress: ${lockPath}`,
    );
  });

  test("respect an old publication lock its live holder still holds", async () => {
    const workspace = tempDir();
    const lockPath = enginePublicationLockPath(workspace, "main");
    writeFileSync(lockPath, `${process.pid}:1\n`);
    age(lockPath, 6000);
    await expect(client(workspace).start()).rejects.toThrow(
      `Kibi engine publication is in progress: ${lockPath}`,
    );
    expect(existsSync(lockPath)).toBe(true);
  });

  test("close each descriptor a lease gives back", () => {
    const workspace = tempDir();
    const lockPath = enginePublicationLockPath(workspace, "main");
    const startPath = engineStartLockPath(workspace, "main");
    const closed = trackCloses();
    const locks = () =>
      closed.filter((file) => file === lockPath || file === startPath);
    acquireEnginePublicationLease(workspace, "main").release();
    expect(locks()).toStrictEqual([lockPath, startPath]);
    closed.length = 0;
    writeFileSync(startPath, "junk");
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      `Kibi engine publication cannot acquire the engine start lease: ${startPath}`,
    );
    expect(locks()).toStrictEqual([lockPath]);
  });

  test("judge a start lock stale only past five seconds", () => {
    const workspace = tempDir();
    const startPath = engineStartLockPath(workspace, "main");
    mkdirSync(path.dirname(startPath), { recursive: true });
    spyOn(Date, "now").mockReturnValue(100_000);
    const refusal = `Kibi engine publication cannot acquire the engine start lease: ${startPath}`;
    writeFileSync(startPath, `${DEAD_PID}:95000`);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      refusal,
    );
    expect(existsSync(startPath)).toBe(true);
    writeFileSync(startPath, `${DEAD_PID}:94999`);
    expect(() => acquireEnginePublicationLease(workspace, "main")).toThrow(
      refusal,
    );
    expect(existsSync(startPath)).toBe(false);
  });

  test("never break a journal lock this process holds", async () => {
    const workspace = tempDir();
    const branches = path.join(workspace, ".kb", "branches");
    mkdirSync(branches, { recursive: true });
    const store = journalStore(branches);
    writeFileSync(path.join(store, "kb.rdf"), SENTINEL);
    writeFileSync(path.join(store, "rdf", "lock"), `pid(${process.pid}).`);
    writeFileSync(
      path.join(store, ".kibi-lock-owner.json"),
      JSON.stringify({ pid: process.pid, workspaceRoot: tempDir() }),
    );
    await ensureJournaledBranchStoreAsync(store);
    expect(existsSync(path.join(store, "rdf", "lock"))).toBe(true);
    expect(takeover(store)).toBeNull();
  });
});

describe("client connection guards", () => {
  test("clear the connect timer once connected", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    await fakeEngine(workspace);
    const timers: unknown[] = [];
    const realSet = globalThis.setTimeout;
    spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: () => void,
      ms?: number,
      ...rest: unknown[]
    ) => {
      const handle = (realSet as (...args: unknown[]) => unknown)(
        callback,
        ms,
        ...rest,
      );
      if (ms === 250) timers.push(handle);
      return handle;
    }) as never);
    const cleared: unknown[] = [];
    const realClear = globalThis.clearTimeout;
    spyOn(globalThis, "clearTimeout").mockImplementation(((
      handle: Parameters<typeof clearTimeout>[0],
    ) => {
      cleared.push(handle);
      realClear(handle);
    }) as never);
    await client(workspace).start();
    expect(timers).toHaveLength(1);
    expect(cleared).toContain(timers[0]);
  });

  test("retry a refused socket until the deadline only", async () => {
    const workspace = tempDir();
    writeFileSync(engineSocketPath(workspace, "main"), "");
    const polls = fakePolls();
    const c = client(workspace);
    await c.start(false);
    expect(c.isRunning()).toBe(false);
    expect(polls).toStrictEqual([25, 25, 25, 25, 25, 25]);
  });

  test("start a daemon without polling for an absent socket", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const delays: Array<number | undefined> = [];
    const realSet = globalThis.setTimeout;
    spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: () => void,
      ms?: number,
      ...rest: unknown[]
    ) => {
      delays.push(ms);
      return (realSet as (...args: unknown[]) => unknown)(
        callback,
        ms,
        ...rest,
      );
    }) as never);
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    let before: Array<number | undefined> = [];
    fakeSpawn(async () => {
      before = delays.slice();
      await fakeEngine(workspace);
    });
    await client(workspace).start();
    expect(before).toStrictEqual([]);
  });

  test("give up at once when the start deadline has passed", async () => {
    const workspace = tempDir();
    spyOn(Date, "now").mockReturnValue(5);
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    const calls = fakeSpawn();
    const socketPath = engineSocketPath(workspace, "main");
    await expect(client(workspace, { timeout: 0 }).start()).rejects.toThrow(
      `Unable to connect to Kibi engine at ${socketPath} while another starter owns ${engineStartLockPath(workspace, "main")}`,
    );
    expect(calls).toHaveLength(0);
  });

  test("reconcile only a fresh connection", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const engine = await fakeEngine(workspace);
    const c = client(workspace);
    await c.start();
    const sent = engine.requests.length;
    await c.start();
    expect(engine.requests).toHaveLength(sent);
  });

  test("let an idle connection go before its first request", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    await fakeEngine(workspace);
    const refs: string[] = [];
    const proto = net.Socket.prototype;
    const ref = proto.ref;
    const unref = proto.unref;
    spyOn(proto, "ref").mockImplementation(function (this: net.Socket) {
      refs.push("ref");
      return ref.call(this);
    });
    spyOn(proto, "unref").mockImplementation(function (this: net.Socket) {
      refs.push("unref");
      return unref.call(this);
    });
    await client(workspace).start();
    expect(refs.slice(0, 3)).toStrictEqual(["unref", "ref", "unref"]);
  });

  test("ignore every event of a connection it has replaced", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const engine = await fakeEngine(workspace, (request) =>
      request.goal === "kb_drop"
        ? "close"
        : request.goal === "kb_wait"
          ? "silent"
          : undefined,
    );
    const c = client(workspace);
    await c.query("kb_ok");
    const old = clientPrivates(c).socket as net.Socket;
    await expect(c.query("kb_drop")).rejects.toThrow(
      "Kibi engine connection closed",
    );
    expect((clientPrivates(c).pending as Map<number, unknown>).size).toBe(0);
    const pending = c.query("kb_wait");
    await until(() => engine.requests.some((r) => r.goal === "kb_wait"));
    const waiting = engine.requests.find((r) => r.goal === "kb_wait")?.id;
    old.emit("data", encodeFrame({ id: waiting, ok: true, result: "stale" }));
    old.emit("error", new Error("stale"));
    old.emit("close");
    expect(c.isRunning()).toBe(true);
    (engine.sockets.at(-1) as net.Socket).write(
      encodeFrame({ id: waiting, ok: true, result: "fresh" }),
    );
    expect(await pending).toBe("fresh" as never);
  });

  test("forget an aborted request and listen for its abort once", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    await fakeEngine(workspace, (request) =>
      request.goal === "kb_slow" ? "silent" : undefined,
    );
    const c = client(workspace);
    await c.start();
    const controller = new AbortController();
    const listen = spyOn(controller.signal, "addEventListener");
    const pending = c.query("kb_slow", controller.signal);
    await until(() => listen.mock.calls.length === 1);
    expect(listen.mock.calls[0]?.[0]).toBe("abort");
    expect(listen.mock.calls[0]?.[2]).toStrictEqual({ once: true });
    controller.abort();
    await expect(pending).rejects.toThrow("Kibi engine request cancelled");
    expect((clientPrivates(c).pending as Map<number, unknown>).size).toBe(0);
  });

  test("count a page by its rows when the count is missing", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const row =
      "[['REQ-1', 'req', 'T', 'active', [], [], '', 's.md', '', [], '', '']]";
    await fakeEngine(workspace, (request) =>
      request.method === "command" &&
      (request.command?.kind === "entities" ||
        request.command?.kind === "search")
        ? { ok: true, result: { success: true, bindings: { Rows: row } } }
        : undefined,
    );
    const c = client(workspace);
    expect((await c.queryEntities({ limit: 1, offset: 0 })).count).toBe(1);
    expect(
      (await c.searchEntities({ query: "q", limit: 1, offset: 0 })).count,
    ).toBe(1);
  });
});

describe("client stop guards", () => {
  function engineFiles(workspace: string): {
    socketPath: string;
    pidPath: string;
  } {
    const pidPath = enginePidPath(workspace, "main");
    writeFileSync(pidPath, `${process.pid}\n`);
    return { socketPath: engineSocketPath(workspace, "main"), pidPath };
  }

  test("wait at most five seconds for the daemon's files", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    engineFiles(workspace);
    await fakeEngine(workspace, (request) =>
      request.method === "stop"
        ? { ok: true, result: { stopped: true } }
        : undefined,
    );
    const c = client(workspace);
    await c.start();
    const polls = fakePolls();
    expect(await c.stop().catch((error: Error) => error.message)).toBe(
      "Kibi engine did not stop within 5 seconds",
    );
    expect(polls.filter((ms) => ms === 25)).toHaveLength(200);
  });

  test("refuse a stop whose daemon keeps its pid file", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    engineFiles(workspace);
    let engine: FakeEngine | null = null;
    engine = await fakeEngine(workspace, (request) => {
      if (request.method !== "stop") return undefined;
      setTimeout(() => void engine?.close(), 5);
      return { ok: true, result: { stopped: true } };
    });
    const c = client(workspace);
    await c.start();
    fakePolls();
    expect(await c.stop().catch((error: Error) => error.message)).toBe(
      "Kibi engine did not stop within 5 seconds",
    );
  });

  test("wait for the pid file after the socket is gone", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const { pidPath } = engineFiles(workspace);
    let engine: FakeEngine | null = null;
    engine = await fakeEngine(workspace, (request) => {
      if (request.method !== "stop") return undefined;
      setTimeout(() => void engine?.close(), 5);
      setTimeout(() => rmSync(pidPath, { force: true }), 80);
      return { ok: true, result: { stopped: true } };
    });
    const c = client(workspace);
    await c.start();
    expect(await c.stop()).toBe(true);
    expect(existsSync(pidPath)).toBe(false);
  });

  test("stop a daemon that drops the connection instead of answering", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    const { pidPath } = engineFiles(workspace);
    let engine: FakeEngine | null = null;
    engine = await fakeEngine(workspace, (request) => {
      if (request.method !== "stop") return undefined;
      setTimeout(() => {
        void engine?.close();
        rmSync(pidPath, { force: true });
      }, 5);
      return "close";
    });
    const c = client(workspace);
    await c.start();
    expect(await c.stop()).toBe(true);
  });

  test("answer false for a stop that may not start during a publication", async () => {
    const workspace = tempDir();
    const lease = acquireEnginePublicationLease(workspace, "main");
    cleanups.push(() => lease.release());
    expect(await client(workspace).stop(false)).toBe(false);
    await expect(client(workspace).stop()).rejects.toThrow(
      "Unable to start Kibi engine for stop request",
    );
  });

  test("start a daemon to stop by default", async () => {
    const workspace = tempDir();
    prepareStore(workspace);
    onlyEntry(path.join(SRC_DIR, "engine-daemon.js"));
    const calls = fakeSpawn(() => stoppable(workspace, GOOD()));
    expect(await client(workspace).stop()).toBe(true);
    expect(calls).toHaveLength(1);
  });
});

describe("daemon guards", () => {
  test("recycle before every command but a lifecycle one", async () => {
    const daemon = await startDaemon();
    spyOn(console, "error").mockImplementation(() => undefined);
    await settled(daemon);
    daemon.stub.lost = true;
    result(
      await daemon.request({
        method: "command",
        command: { version: 1, kind: "status" },
      }),
    );
    expect(daemon.stub.starts).toBe(2);
    daemon.stub.lost = true;
    await daemon.request({
      method: "command",
      command: { version: 1, kind: "stop" },
    });
    await daemon.run;
    expect(daemon.stub.starts).toBe(2);
  });

  test("name a client module that fails to reload", async () => {
    const stub = stubProlog((goal) =>
      goal === "use_module('a')" ? { success: false, bindings: {} } : OK,
    );
    const s = new EngineSession(
      new PrologProcess({ oneShot: false }),
      journalStore(),
    );
    s.recordModuleLoad("use_module('a')", OK);
    stub.lost = true;
    spyOn(console, "error").mockImplementation(() => undefined);
    await expect(s.ensureLive()).rejects.toThrow(
      "Kibi engine failed to recycle its Prolog session: Failed to load Kibi client-loaded module",
    );
  });

  test("close the probe of a live engine and keep its error sink", async () => {
    const daemon = await startDaemon();
    const made: net.Socket[] = [];
    const create = net.createConnection;
    spyOn(net, "createConnection").mockImplementation(((...args: unknown[]) => {
      const socket = (create as (...a: unknown[]) => net.Socket)(...args);
      made.push(socket);
      return socket;
    }) as never);
    await expect(
      runEngineDaemon({
        workspaceRoot: daemon.workspace,
        branch: "main",
        socketPath: daemon.socketPath,
      }),
    ).rejects.toThrow(
      `A Kibi engine is already listening at ${daemon.socketPath}`,
    );
    expect(made).toHaveLength(1);
    const probe = made[0] as net.Socket;
    expect([probe.listenerCount("error"), probe.destroyed]).toStrictEqual([
      2,
      true,
    ]);
  });

  test("let its timers go and clear them on shutdown", async () => {
    process.env.KIBI_ENGINE_WORKSPACE_WATCHDOG_MS = "100";
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "60000";
    const intervals: Array<{ ms: number; unrefs: number; handle: unknown }> =
      [];
    const realSetInterval = globalThis.setInterval;
    spyOn(globalThis, "setInterval").mockImplementation(((
      callback: () => void,
      ms: number,
      ...rest: unknown[]
    ) => {
      const handle = (
        realSetInterval as unknown as (...a: unknown[]) => NodeJS.Timeout
      )(callback, ms, ...rest);
      const entry = { ms, unrefs: 0, handle };
      intervals.push(entry);
      const unref = handle.unref.bind(handle);
      handle.unref = () => {
        entry.unrefs += 1;
        return unref();
      };
      return handle;
    }) as never);
    const cleared: unknown[] = [];
    const realClear = globalThis.clearInterval;
    spyOn(globalThis, "clearInterval").mockImplementation(((
      handle: Parameters<typeof clearInterval>[0],
    ) => {
      cleared.push(handle);
      realClear(handle);
    }) as never);
    const serverUnref = spyOn(net.Server.prototype, "unref");
    const daemon = await startDaemon();
    expect(intervals.map(({ ms, unrefs }) => [ms, unrefs])).toStrictEqual([
      [100, 1],
      [30_000, 1],
    ]);
    await daemon.request({ method: "stop" });
    await daemon.run;
    for (const { handle } of intervals) expect(cleared).toContain(handle);
    expect(serverUnref).toHaveBeenCalledTimes(1);
  });

  test("ignore the watchdog once shutting down", async () => {
    process.env.KIBI_ENGINE_WORKSPACE_WATCHDOG_MS = "100";
    const errors: string[] = [];
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });
    const ticks: Array<() => void> = [];
    const realSetInterval = globalThis.setInterval;
    spyOn(globalThis, "setInterval").mockImplementation(((
      callback: () => void,
      ms: number,
      ...rest: unknown[]
    ) => {
      if (ms === 100) ticks.push(callback);
      return (realSetInterval as (...args: unknown[]) => unknown)(
        ms === 100 ? () => undefined : callback,
        ms === 100 ? 1 << 30 : ms,
        ...rest,
      );
    }) as never);
    const workspace = tempDir("kibi-ws-");
    const daemon = await startDaemon(undefined, { workspace });
    await daemon.request({ method: "stop" });
    await daemon.run;
    const moved = `${workspace}.away`;
    roots.push(moved);
    fs.renameSync(workspace, moved);
    const tick = ticks[0] as () => void;
    tick();
    tick();
    fs.renameSync(moved, workspace);
    expect(errors).toStrictEqual([]);
  });

  test("skip idle compaction once a client is back", async () => {
    const hold = gate();
    const daemon = await startDaemon((goal) =>
      goal === "kb_slow" ? hold.wait.then(() => OK) : OK,
    );
    await settled(daemon);
    const mark = daemon.stub.goals.length;
    const first = await Peer.open(daemon.socketPath);
    first.send(daemon.base({ method: "query", goal: "kb_slow" }));
    await until(() => daemon.stub.goals.includes("kb_slow"));
    first.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const second = await Peer.open(daemon.socketPath);
    await new Promise((resolve) => setTimeout(resolve, 20));
    hold.open();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(goalsSince(daemon, mark)).toStrictEqual(["kb_slow"]);
    second.close();
  });

  test("queue one idle compaction for several idle moments", async () => {
    const hold = gate();
    const daemon = await startDaemon((goal) =>
      goal === "kb_slow" ? hold.wait.then(() => OK) : OK,
    );
    await settled(daemon);
    const mark = daemon.stub.goals.length;
    const first = await Peer.open(daemon.socketPath);
    first.send(daemon.base({ method: "query", goal: "kb_slow" }));
    await until(() => daemon.stub.goals.includes("kb_slow"));
    first.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const second = await Peer.open(daemon.socketPath);
    second.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    hold.open();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(goalsSince(daemon, mark)).toStrictEqual([
      "kb_slow",
      "kb_storage_compact_if_needed",
    ]);
  });

  test("remove the pid file when the socket is already gone", async () => {
    const daemon = await startDaemon();
    await settled(daemon);
    rmSync(daemon.socketPath);
    process.emit("SIGTERM" as never);
    await daemon.run;
    expect(existsSync(enginePidPath(daemon.workspace, "main"))).toBe(false);
  });

  test("shut down once for two stops in one frame batch", async () => {
    const daemon = await startDaemon();
    const mark = await settled(daemon);
    const peer = await Peer.open(daemon.socketPath);
    peer.socket.write(
      Buffer.concat([
        encodeFrame(daemon.base({ method: "stop" })),
        encodeFrame(daemon.base({ method: "stop" })),
      ]),
    );
    await daemon.run;
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(goalsSince(daemon, mark)).toStrictEqual(["kb_save", "kb_detach"]);
  });

  test("decorate the status with the branch alone without an attachment", async () => {
    const daemon = await startDaemon();
    spyOn(console, "error").mockImplementation(() => undefined);
    await settled(daemon);
    const moved = `${daemon.branchPath}.away`;
    fs.renameSync(daemon.branchPath, moved);
    daemon.stub.lost = true;
    const response = await daemon.request({
      method: "command",
      command: { version: 1, kind: "status" },
    });
    fs.renameSync(moved, daemon.branchPath);
    const answer = result(response) as Answer;
    expect(
      JSON.parse(JSON.parse(answer.bindings.JsonString as string) as string),
    ).toStrictEqual({
      ...JSON.parse(
        JSON.parse(statusAnswer().bindings.JsonString as string) as string,
      ),
      branch: "main",
    });
  });

  test("run a spaced module or preview call to completion", async () => {
    const daemon = await startDaemon();
    const mark = await settled(daemon);
    await daemon.request({
      method: "query",
      goal: "kb_a, kb_preview_upsert_contradiction (x)",
      limits: { timeMs: 1500 },
    });
    expect(goalsSince(daemon, mark)).toStrictEqual([
      "kb_a, kb_preview_upsert_contradiction (x)",
    ]);
  });

  test("cache a read whose answer is exactly the size limit", async () => {
    const base = JSON.stringify({ success: true, bindings: { X: "" } }).length;
    const big: Answer = {
      success: true,
      bindings: { X: "a".repeat(8 * 1024 * 1024 - base) },
    };
    const daemon = await startDaemon((goal) =>
      goal === "kb_entity(big)" ? big : OK,
    );
    const mark = await settled(daemon);
    await daemon.request({ method: "query", goal: "kb_entity(big)" });
    await daemon.request({ method: "query", goal: "kb_entity(big)" });
    expect(goalsSince(daemon, mark)).toStrictEqual(["kb_entity(big)"]);
  });

  test("accept an empty page and list every tag", async () => {
    const daemon = await startDaemon();
    const mark = await settled(daemon);
    await daemon.request({ method: "entities", limit: 0 });
    await daemon.request({ method: "search", searchQuery: "q", limit: 0 });
    await daemon.request({
      method: "command",
      command: { version: 1, kind: "search", query: "q", limit: 0, offset: 0 },
    });
    await daemon.request({
      method: "command",
      command: {
        version: 1,
        kind: "entities",
        tags: ["a", "b"],
        limit: 1,
        offset: 0,
      },
    });
    expect(goalsSince(daemon, mark)).toStrictEqual([
      "kb_query_entities(none, none, [], none, 0, 0, Rows, Count)",
      "kb_search_entities(none, 'q', 0, 0, Rows, Count)",
      "kb_search_entities(none, 'q', 0, 0, Rows, Count)",
      "kb_query_entities(none, none, ['a','b'], none, 1, 0, Rows, Count)",
    ]);
  });
});

describe("journal store guards", () => {
  test("write a missing sentinel privately", async () => {
    const store = journalStore();
    await ensureJournaledBranchStoreAsync(store);
    expect(readFileSync(path.join(store, "kb.rdf"), "utf8")).toBe(SENTINEL);
    expect(statSync(path.join(store, "kb.rdf")).mode & 0o777).toBe(0o600);
  });

  test("leave a healthy store alone despite old generations", async () => {
    const store = journalStore();
    writeFileSync(path.join(store, "rdf", "j"), "live");
    mkdirSync(path.join(store, "rdf.old.1"));
    writeFileSync(path.join(store, "rdf.old.1", "j"), "old");
    writeFileSync(path.join(store, "CURRENT.old.1"), "old\n");
    await ensureJournaledBranchStoreAsync(store);
    expect(readFileSync(path.join(store, "rdf", "j"), "utf8")).toBe("live");
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toBe(
      "generation-2:4\n",
    );
  });

  test("pick the newest old generation whatever the listing order", async () => {
    const store = journalStore();
    rmSync(path.join(store, "rdf"), { recursive: true });
    rmSync(path.join(store, "CURRENT"));
    for (const n of ["1", "2", "3"]) {
      mkdirSync(path.join(store, `rdf.old.${n}`));
      writeFileSync(path.join(store, `rdf.old.${n}`, "j"), n);
      writeFileSync(path.join(store, `CURRENT.old.${n}`), `gen-${n}\n`);
    }
    // Listed as 2, 3, 1: neither the listing nor its reverse is newest first.
    const rank = (entry: string) => ["2", "3", "1"].indexOf(entry.at(-1) ?? "");
    const readdir = fs.readdirSync;
    spyOn(fs, "readdirSync").mockImplementation(((
      dir: string,
      ...rest: unknown[]
    ) => {
      const entries = (readdir as (...args: unknown[]) => string[])(
        dir,
        ...rest,
      );
      return dir === store
        ? entries.sort((a, b) => rank(a) - rank(b))
        : entries;
    }) as never);
    await ensureJournaledBranchStoreAsync(store);
    expect(readFileSync(path.join(store, "rdf", "j"), "utf8")).toBe("3");
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toBe("gen-3\n");
  });

  test("replace a surviving database half with the old pair", async () => {
    const store = journalStore();
    rmSync(path.join(store, "CURRENT"));
    writeFileSync(path.join(store, "rdf", "j"), "new");
    mkdirSync(path.join(store, "rdf.old.1"));
    writeFileSync(path.join(store, "rdf.old.1", "j"), "old");
    writeFileSync(path.join(store, "CURRENT.old.1"), "gen-1\n");
    await ensureJournaledBranchStoreAsync(store);
    expect(readFileSync(path.join(store, "rdf", "j"), "utf8")).toBe("old");
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toBe("gen-1\n");
  });

  test("keep a pointer that is present without an old database", async () => {
    const store = journalStore();
    rmSync(path.join(store, "rdf"), { recursive: true });
    writeFileSync(path.join(store, "CURRENT.old.1"), "old\n");
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      "Journaled branch store is incomplete",
    );
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toBe(
      "generation-2:4\n",
    );
  });

  test("drop a publication that lost its database beside a legacy store", async () => {
    const store = journalStore();
    rmSync(path.join(store, "rdf"), { recursive: true });
    writeFileSync(path.join(store, "audit.log"), "a");
    stubProlog();
    await ensureJournaledBranchStoreAsync(store);
    expect(readdirSync(store).sort()).toStrictEqual(["kb.rdf", "legacy"]);
  });

  test("replace a store whose marker is not the journal format", async () => {
    const store = journalStore();
    writeFileSync(path.join(store, "storage.json"), "{}");
    writeFileSync(path.join(store, "CURRENT"), "generation-5:9\n");
    await ensureJournaledBranchStoreAsync(store);
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toBe(
      "generation-1:0\n",
    );
    expect(readFileSync(path.join(store, "storage.json"), "utf8")).toBe(
      JOURNAL_MARKER,
    );
  });

  test("create a store beside an empty database directory", async () => {
    const store = tempDir();
    mkdirSync(path.join(store, "rdf"));
    await ensureJournaledBranchStoreAsync(store);
    expect(readdirSync(store).sort()).toStrictEqual([
      "CURRENT",
      "kb.rdf",
      "rdf",
      "storage.json",
    ]);
  });

  test("migrate in a private staging directory and sync both copies", async () => {
    process.env.NODE_ENV = "test";
    const parent = tempDir();
    const store = path.join(parent, "store");
    mkdirSync(store);
    writeFileSync(path.join(store, "kb.rdf"), "<rdf:RDF></rdf:RDF>");
    let staging = "";
    let mode = 0;
    stubProlog((goal) => {
      const match = /,'([^']*)'\)\)$/.exec(goal);
      if (match !== null) {
        staging = match[1] as string;
        mode = statSync(staging).mode & 0o777;
        mkdirSync(path.join(staging, "rdf"));
        writeFileSync(path.join(staging, "storage.json"), JOURNAL_MARKER);
      }
      return OK;
    });
    const opened: string[] = [];
    const open = fs.openSync;
    spyOn(fs, "openSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      opened.push(String(file));
      return (open as (...args: unknown[]) => number)(file, ...rest);
    }) as never);
    await ensureJournaledBranchStoreAsync(store);
    expect(mode).toBe(0o700);
    expect([opened.includes(staging), opened.includes(store)]).toStrictEqual([
      true,
      true,
    ]);
  });
});
