import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  spyOn,
  test,
} from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { type GcGitRunner, gcCommand } from "../../src/commands/gc.js";
import * as resolver from "../../src/utils/branch-resolver.js";
import {
  branchStoreKey,
  expectedBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";
import {
  createGitWorkspace,
  createTempDir,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];
let logs: string[] = [];
let errors: string[] = [];
let root: string;
let previousExitCode: typeof process.exitCode;

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

beforeEach(() => {
  logs = [];
  errors = [];
  previousExitCode = process.exitCode;
  process.exitCode = 0;
  root = createTempDir("kibi-gc-mut-");
  track(
    spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    }),
  );
  track(
    spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.map(String).join(" "));
    }),
  );
  attachment({ kbBranch: "main", storePath: "/s" });
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  setSystemTime();
  removeTempDir(root);
  process.exitCode = previousExitCode;
});

function attachment(answer: unknown) {
  return track(
    spyOn(resolver, "resolveReadBranchAttachment").mockReturnValue(
      answer as never,
    ),
  );
}

const ok = (stdout: string) => ({ status: 0, stdout, stderr: "" });

/** A fake Git answering the branch and worktree listings. */
function fakeGit(
  branches: ReturnType<GcGitRunner>,
  worktrees: ReturnType<GcGitRunner> = ok(""),
  calls: unknown[][] = [],
): GcGitRunner {
  return (args, cwd) => {
    calls.push([args, cwd]);
    return args[0] === "branch" ? branches : worktrees;
  };
}

const branchesDir = () => path.join(root, ".kb", "branches");

function managedStore(branch: string, dirName = branchStoreKey(branch)) {
  const dir = path.join(branchesDir(), dirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "branch.json"),
    JSON.stringify(expectedBranchStoreManifest(branch)),
  );
  return dir;
}

function legacyStore(relative: string, marker: "kb.rdf" | "storage.json") {
  const dir = path.join(branchesDir(), relative);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, marker), "");
  return dir;
}

const gc = (options: Parameters<typeof gcCommand>[0], git: GcGitRunner) =>
  withCwd(root, () => gcCommand(options, git));

function staleLines(): string[] {
  return logs.slice(1).sort();
}

describe("gc without branch stores", () => {
  test("says there is nothing to collect", async () => {
    const calls: unknown[][] = [];
    await gc({}, fakeGit(ok("main\n"), ok(""), calls));
    expect(logs).toStrictEqual([
      "No branch KBs found (.kb/branches does not exist)",
    ]);
    expect(process.exitCode).toBe(0);
    expect(calls).toStrictEqual([]);
  });
});

describe("gc dry run", () => {
  test("lists managed and legacy stores of branches that are gone", async () => {
    mkdirSync(branchesDir(), { recursive: true });
    const gone = managedStore("gone");
    managedStore("main");
    managedStore("spaced");
    managedStore("wt");
    managedStore("bad-wt");
    managedStore("indented");
    const legacyRdf = legacyStore("feature/old", "kb.rdf");
    const legacyJson = legacyStore("legacy", "storage.json");
    legacyStore("feature/live", "kb.rdf");
    writeFileSync(path.join(branchesDir(), "notes.txt"), "");
    mkdirSync(path.join(branchesDir(), "empty", "deeper"), { recursive: true });
    const calls: unknown[][] = [];
    await gc(
      { dryRun: true },
      fakeGit(
        ok("main\n  spaced  \n\nfeature/live\n"),
        ok(
          "worktree /x\nbranch refs/heads/wt\nxbranch refs/heads/bad-wt\n  branch refs/heads/indented\nbranch refs/heads/\n",
        ),
        calls,
      ),
    );
    expect(calls).toStrictEqual([
      [["branch", "--format=%(refname:short)"], root],
      [["worktree", "list", "--porcelain"], root],
    ]);
    expect(logs[0]).toBe(
      "Found 5 stale branch KB(s) (dry run - not quarantined)",
    );
    expect(staleLines()).toStrictEqual(
      [
        `  - gone: ${gone}`,
        `  - bad-wt: ${path.join(branchesDir(), branchStoreKey("bad-wt"))}`,
        `  - indented: ${path.join(branchesDir(), branchStoreKey("indented"))}`,
        `  - feature/old: ${legacyRdf}`,
        `  - legacy: ${legacyJson}`,
      ].sort(),
    );
    expect(process.exitCode).toBe(0);
    expect(existsSync(gone)).toBe(true);
  });

  test("ignores worktrees when Git cannot list them", async () => {
    managedStore("wt");
    await gc(
      {},
      fakeGit(ok(""), {
        status: 1,
        stdout: "branch refs/heads/wt\n",
        stderr: "",
      }),
    );
    expect(logs[0]).toBe(
      "Found 1 stale branch KB(s) (dry run - not quarantined)",
    );
  });

  test("keeps the detached snapshot live only while detached", async () => {
    managedStore(resolver.DETACHED_SNAPSHOT_KB_BRANCH);
    const spy = attachment({
      kbBranch: "x",
      storePath: "/s",
      readOnly: { notice: "n" },
    });
    await gc({}, fakeGit(ok("")));
    spy.mockReturnValue({
      error: "detached",
      readOnly: { notice: "n" },
    } as never);
    await gc({}, fakeGit(ok("")));
    spy.mockReturnValue({ kbBranch: "x", storePath: "/s" } as never);
    await gc({}, fakeGit(ok("")));
    expect(logs.filter((line) => line.startsWith("Found"))).toStrictEqual([
      "Found 0 stale branch KB(s) (dry run - not quarantined)",
      "Found 1 stale branch KB(s) (dry run - not quarantined)",
      "Found 1 stale branch KB(s) (dry run - not quarantined)",
    ]);
  });

  test("reports a Git failure with its message or a default", async () => {
    managedStore("main");
    for (const stderr of ["  fatal: no repo \n", "", null]) {
      await gc({}, fakeGit({ status: 128, stdout: "", stderr }));
    }
    await gc({}, fakeGit({ status: null, stdout: "", stderr: null }));
    expect(errors).toStrictEqual([
      "Branch GC failed: fatal: no repo",
      "Branch GC failed: unable to list local Git branches",
      "Branch GC failed: unable to list local Git branches",
      "Branch GC failed: unable to list local Git branches",
    ]);
    expect(process.exitCode).toBe(1);
  });

  test("uses the real Git by default", async () => {
    const repo = createGitWorkspace("main");
    restores.push(() => removeTempDir(repo));
    mkdirSync(path.join(repo, ".kb", "branches", branchStoreKey("main")), {
      recursive: true,
    });
    writeFileSync(
      path.join(repo, ".kb", "branches", branchStoreKey("main"), "branch.json"),
      JSON.stringify(expectedBranchStoreManifest("main")),
    );
    await withCwd(repo, () => gcCommand());
    expect(logs).toStrictEqual([
      "Found 0 stale branch KB(s) (dry run - not quarantined)",
    ]);
  });
});

describe("gc --force", () => {
  test("quarantines each stale store with a private journal", async () => {
    setSystemTime(new Date("2026-03-04T05:06:07.008Z"));
    const gone = managedStore("gone");
    const legacy = legacyStore("feature/old", "kb.rdf");
    managedStore("main");
    await gc({ force: true }, fakeGit(ok("main\n")));
    const destination = (branch: string) =>
      path.join(
        root,
        ".kb",
        "quarantine",
        "branches",
        branchStoreKey(branch),
        "2026-03-04T05-06-07.008Z",
      );
    expect(logs.sort()).toStrictEqual(
      [
        `Quarantined gone: ${destination("gone")}`,
        `Quarantined feature/old: ${destination("feature/old")}`,
      ].sort(),
    );
    expect(existsSync(gone)).toBe(false);
    expect(existsSync(legacy)).toBe(false);
    expect(existsSync(path.join(destination("gone"), "branch.json"))).toBe(
      true,
    );
    const journal = path.join(destination("feature/old"), "quarantine.json");
    expect(readFileSync(journal, "utf8")).toBe(
      `${JSON.stringify(
        {
          version: 1,
          branch: "feature/old",
          key: branchStoreKey("feature/old"),
          quarantinedAt: "2026-03-04T05:06:07.008Z",
          sourcePath: path.join(".kb", "branches", "feature", "old"),
        },
        null,
        2,
      )}\n`,
    );
    expect(statSync(journal).mode & 0o777).toBe(0o600);
    expect(process.exitCode).toBe(0);
  });

  test("with --purge only purges", async () => {
    const gone = managedStore("gone");
    await gc({ force: true, purge: true }, fakeGit(ok("")));
    expect(logs).toStrictEqual([
      "Purged 0 quarantined branch store(s) older than 30 day(s)",
    ]);
    expect(existsSync(gone)).toBe(true);
  });
});

describe("gc --purge", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.parse("2026-06-01T00:00:00.000Z");
  const quarantine = () => path.join(root, ".kb", "quarantine", "branches");

  function entry(key: string, name: string, journal?: unknown, mtime?: number) {
    const dir = path.join(quarantine(), key, name);
    mkdirSync(dir, { recursive: true });
    if (journal !== undefined)
      writeFileSync(
        path.join(dir, "quarantine.json"),
        typeof journal === "string" ? journal : JSON.stringify(journal),
      );
    if (mtime !== undefined) utimesSync(dir, mtime / 1000, mtime / 1000);
    return dir;
  }

  const at = (offsetDays: number) => ({
    quarantinedAt: new Date(now - offsetDays * DAY).toISOString(),
  });

  test("purges entries past the retention by journal time or mtime", async () => {
    managedStore("main");
    setSystemTime(new Date(now));
    const old = entry("k1", "old", at(31));
    const fresh = entry("k1", "fresh", at(29));
    const edge = entry("k2", "edge", at(30));
    const mtimeOld = entry("k3", "mtime-old", undefined, now - 40 * DAY);
    const mtimeFresh = entry("k3", "mtime-fresh", "not json", now - 1 * DAY);
    const blank = entry("k4", "blank", { quarantinedAt: "" }, now - 1 * DAY);
    const invalid = entry(
      "k4",
      "invalid",
      { quarantinedAt: "soon" },
      now - 1 * DAY,
    );
    const journalWins = entry("k5", "journal", at(31), now);
    const stray = path.join(quarantine(), "k5", "stray.txt");
    writeFileSync(stray, "");
    utimesSync(stray, (now - 40 * DAY) / 1000, (now - 40 * DAY) / 1000);
    writeFileSync(path.join(quarantine(), "stray.txt"), "");
    await gc({ purge: true }, fakeGit(ok("main\n")));
    expect(logs).toStrictEqual([
      "Purged 4 quarantined branch store(s) older than 30 day(s)",
    ]);
    expect(
      [old, fresh, edge, mtimeOld, mtimeFresh, blank, invalid, journalWins].map(
        existsSync,
      ),
    ).toStrictEqual([false, true, false, false, true, true, true, false]);
    expect(existsSync(path.join(quarantine(), "k2"))).toBe(false);
    expect(existsSync(path.join(quarantine(), "k1"))).toBe(true);
    expect(readdirSync(path.join(quarantine(), "k5"))).toStrictEqual([
      "stray.txt",
    ]);
  });

  test("a zero retention purges everything, future entries included", async () => {
    managedStore("main");
    setSystemTime(new Date(now));
    entry("k1", "future", at(-5));
    entry("k1", "past", at(1));
    await gc({ purge: true, retentionDays: 0 }, fakeGit(ok("main\n")));
    expect(logs).toStrictEqual([
      "Purged 2 quarantined branch store(s) older than 0 day(s)",
    ]);
    expect(existsSync(path.join(quarantine(), "k1"))).toBe(false);
  });

  test("floors the retention and defaults invalid values to 30 days", async () => {
    managedStore("main");
    setSystemTime(new Date(now));
    entry("k1", "a", at(2.5));
    entry("k1", "b", at(1.5));
    for (const retentionDays of [
      Number.NaN,
      -1,
      Number.POSITIVE_INFINITY,
      undefined,
    ]) {
      await gc({ purge: true, retentionDays }, fakeGit(ok("main\n")));
    }
    await gc({ purge: true, retentionDays: 2.9 }, fakeGit(ok("main\n")));
    expect(logs).toStrictEqual([
      ...Array(4).fill(
        "Purged 0 quarantined branch store(s) older than 30 day(s)",
      ),
      "Purged 1 quarantined branch store(s) older than 2 day(s)",
    ]);
    expect(readdirSync(path.join(quarantine(), "k1"))).toStrictEqual(["b"]);
  });
});
