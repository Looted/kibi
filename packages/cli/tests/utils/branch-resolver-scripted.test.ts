import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type BranchResolverDeps,
  DETACHED_SNAPSHOT_KB_BRANCH,
  _setBranchResolverDepsForTests,
  copyCleanSnapshot,
  detachedHeadWriteRefusal,
  getBranchDiagnostic,
  getVolatileArtifactPatterns,
  isDetachedHead,
  isValidBranchName,
  resolveActiveBranch,
  resolveBranchAttachment,
  resolveDefaultBranch,
  resolveReadBranchAttachment,
  unreadableMigrationJournalError,
} from "../../src/utils/branch-resolver.js";
import {
  branchStorePath,
  ensureBranchStoreManifest,
  legacyBranchStorePath,
} from "../../src/utils/branch-store-locator.js";

/** Scripted git: each command line maps to its stdout, or to a thrown value. */
type Script = Record<string, string | { throws: unknown }>;
type Call = { command: string; options: unknown };

const base = mkdtempSync(path.join(os.tmpdir(), "kibi-branch-scripted-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let counter = 0;
const fresh = () => {
  const dir = path.join(base, `w${counter++}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};

let calls: Call[] = [];
let savedBranch: string | undefined;
beforeEach(() => {
  calls = [];
  savedBranch = process.env.KIBI_BRANCH;
  Reflect.deleteProperty(process.env, "KIBI_BRANCH");
});
afterEach(() => {
  _setBranchResolverDepsForTests({});
  if (savedBranch === undefined)
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  else process.env.KIBI_BRANCH = savedBranch;
});

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const VALID_REF = "git check-ref-format --branch";

function script(answers: Script): void {
  const answer = (command: string, options: unknown) => {
    calls.push({ command, options });
    if (command.startsWith(VALID_REF)) return "";
    const value = answers[command];
    if (value === undefined) throw new Error(`unexpected ${command}`);
    if (typeof value === "object") throw value.throws;
    return value;
  };
  _setBranchResolverDepsForTests({
    execSync: ((command: string, options: unknown) =>
      answer(command, options)) as BranchResolverDeps["execSync"],
    execFileSync: ((file: string, args: string[], options: unknown) =>
      answer(
        [file, ...args].join(" "),
        options,
      )) as BranchResolverDeps["execFileSync"],
  });
}

const SHOW = "git branch --show-current";
const ABBREV = "git rev-parse --abbrev-ref HEAD";
const POINTS = "git branch --points-at HEAD --format=%(refname:short)";
const VERIFY = "git rev-parse --verify HEAD";
const fail = (message: unknown) => ({ throws: message });
const diagnostic = (reason: string) => getBranchDiagnostic(undefined, reason);

describe("default dependencies", () => {
  // Runs before any scripted git replaces the defaults.
  test("validate names with the real git", () => {
    expect(isValidBranchName("main")).toBe(true);
  });
});

describe("getBranchDiagnostic and fixed values", () => {
  test("lists the resolution options", () => {
    expect(getBranchDiagnostic("dev", "why")).toBe(
      [
        "Branch Resolution Failed",
        "",
        "Reason: why",
        "Detected branch: dev",
        "",
        "Resolution options:",
        "1. Set KIBI_BRANCH environment variable to explicitly specify the branch:",
        "   export KIBI_BRANCH=main",
        "",
        "2. Ensure you are in a git repository with a valid checked-out branch",
        "",
        "3. If in detached HEAD state, create or checkout a branch:",
        "   git checkout -b my-branch",
        "",
        "4. For non-git workspaces, always use KIBI_BRANCH:",
        "   KIBI_BRANCH=feature-branch kibi sync",
      ].join("\n"),
    );
    expect(getBranchDiagnostic(undefined, "why").split("\n")[3]).toBe("");
    expect(DETACHED_SNAPSHOT_KB_BRANCH).toBe(
      "kibi-internal/detached-head-snapshot",
    );
    expect(unreadableMigrationJournalError("j.json")).toStrictEqual({
      error:
        "Unreadable branch migration journal 'j.json' blocks attachment; recover it explicitly before continuing.",
      code: "MIGRATION_RECOVERY_REQUIRED",
    });
  });
});

describe("isValidBranchName", () => {
  test("accepts ordinary names and asks git for the rest", () => {
    script({});
    for (const name of ["main", "feature/a-b_c", "a!b", "x".repeat(255)]) {
      expect(isValidBranchName(name)).toBe(true);
    }
    expect(calls.at(-1)).toStrictEqual({
      command: `${VALID_REF} ${"x".repeat(255)}`,
      options: { stdio: ["ignore", "ignore", "ignore"], timeout: 5000 },
    });
  });

  test("rejects unsafe or malformed names locally", () => {
    script({});
    for (const name of [
      "",
      "x".repeat(256),
      "a..b",
      "/abs",
      "a//b",
      "a/",
      "a.",
      "a\\b",
      "-a",
      "a@{1}",
      "a b",
      "a\u0001b",
      "a\u007fb",
      "a~b",
      "a^b",
      "a:b",
      "a?b",
      "a*b",
      "a[b",
      "a]b",
      ".hidden",
      "a/.hidden",
      "a.lock",
      "a.lock/b",
    ]) {
      expect(isValidBranchName(name)).toBe(false);
    }
    expect(calls).toStrictEqual([]);
    expect(isValidBranchName("lock.a/b-")).toBe(true);
    expect(isValidBranchName("a/b.c")).toBe(true);
  });

  test("a name git refuses is invalid", () => {
    _setBranchResolverDepsForTests({
      execFileSync: (() => {
        throw new Error("bad");
      }) as never,
    });
    expect(isValidBranchName("main")).toBe(false);
  });
});

describe("resolveActiveBranch", () => {
  const gitOptions = (cwd: string) => ({
    cwd,
    encoding: "utf8",
    timeout: 5000,
    stdio: ["pipe", "pipe", "pipe"],
  });

  test("KIBI_BRANCH wins and is validated", () => {
    script({});
    process.env.KIBI_BRANCH = "dev";
    expect(resolveActiveBranch("/w")).toStrictEqual({ branch: "dev" });
    process.env.KIBI_BRANCH = "bad name";
    expect(resolveActiveBranch("/w")).toStrictEqual({
      error:
        "Invalid branch name from KIBI_BRANCH environment variable: 'bad name'",
      code: "ENV_OVERRIDE",
    });
  });

  test("reads the current branch with pinned options", () => {
    script({ [SHOW]: " main \n" });
    expect(resolveActiveBranch("/w")).toStrictEqual({ branch: "main" });
    expect(calls[0]).toStrictEqual({
      command: SHOW,
      options: gitOptions("/w"),
    });
    script({ [SHOW]: "bad name" });
    expect(resolveActiveBranch("/w")).toStrictEqual({
      error: "Invalid branch name detected: 'bad name'",
      code: "UNKNOWN_ERROR",
    });
  });

  test("an empty current branch is a detached HEAD unless one branch is at HEAD", () => {
    script({ [SHOW]: "", [POINTS]: " (HEAD detached at 0123)\n main \n\n" });
    expect(resolveActiveBranch("/w")).toStrictEqual({ branch: "main" });
    expect(calls[1]).toStrictEqual({
      command: POINTS,
      options: gitOptions("/w"),
    });
    for (const points of ["", "a\nb\n", "bad name\n"]) {
      script({ [SHOW]: "", [POINTS]: points });
      expect(resolveActiveBranch("/w")).toStrictEqual({
        error: diagnostic("Git is in detached HEAD state"),
        code: "DETACHED_HEAD",
      });
    }
    script({ [SHOW]: "", [POINTS]: fail(new Error("x")) });
    expect(resolveActiveBranch("/w")).toStrictEqual({
      error: diagnostic("Git is in detached HEAD state"),
      code: "DETACHED_HEAD",
    });
  });

  test("falls back to rev-parse when --show-current fails", () => {
    script({ [SHOW]: fail(new Error("old git")), [ABBREV]: " dev \n" });
    expect(resolveActiveBranch("/w")).toStrictEqual({ branch: "dev" });
    expect(calls[1]).toStrictEqual({
      command: ABBREV,
      options: gitOptions("/w"),
    });
    script({
      [SHOW]: fail(new Error("old git")),
      [ABBREV]: "HEAD",
      [POINTS]: "x\n",
    });
    expect(resolveActiveBranch("/w")).toStrictEqual({ branch: "x" });
    script({
      [SHOW]: fail(new Error("old git")),
      [ABBREV]: "HEAD",
      [POINTS]: "",
    });
    expect(resolveActiveBranch("/w")).toStrictEqual({
      error: diagnostic("Git is in detached HEAD state"),
      code: "DETACHED_HEAD",
    });
    script({ [SHOW]: fail(new Error("old git")), [ABBREV]: "  " });
    expect(resolveActiveBranch("/w")).toStrictEqual({
      error: diagnostic("Unable to determine git branch"),
      code: "UNBORN_BRANCH",
    });
    script({ [SHOW]: fail(new Error("old git")), [ABBREV]: "a b" });
    expect(resolveActiveBranch("/w")).toStrictEqual({
      error: "Invalid branch name detected: 'a b'",
      code: "UNKNOWN_ERROR",
    });
  });

  test("classifies a failure of both commands by the first error", () => {
    const both = (first: unknown) => {
      script({ [SHOW]: fail(first), [ABBREV]: fail(new Error("second")) });
      return resolveActiveBranch("/w");
    };
    expect(both(new Error("fatal: not a git repository"))).toStrictEqual({
      error: diagnostic("Not a git repository"),
      code: "NOT_A_GIT_REPO",
    });
    for (const message of ["git: command not found", "spawn git ENOENT"]) {
      expect(both(new Error(message))).toStrictEqual({
        error: diagnostic("Git is not installed or not available in PATH"),
        code: "GIT_NOT_AVAILABLE",
      });
    }
    expect(both(new Error("boom"))).toStrictEqual({
      error: diagnostic("boom"),
      code: "UNKNOWN_ERROR",
    });
    expect(both("plain string")).toStrictEqual({
      error: diagnostic("plain string"),
      code: "UNKNOWN_ERROR",
    });
  });
});

describe("isDetachedHead and resolveDefaultBranch", () => {
  test("detached when rev-parse names HEAD or fails", () => {
    script({ [ABBREV]: " HEAD \n" });
    expect(isDetachedHead("/w")).toBe(true);
    expect(calls[0]?.options).toStrictEqual({
      cwd: "/w",
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    script({ [ABBREV]: "main" });
    expect(isDetachedHead("/w")).toBe(false);
    script({ [ABBREV]: fail(new Error("x")) });
    expect(isDetachedHead("/w")).toBe(true);
  });

  test("reads origin/HEAD for display only", () => {
    const SYMBOLIC = "git symbolic-ref refs/remotes/origin/HEAD";
    const none = {
      error:
        "No remote default branch is configured; provide explicit migration identities.",
      code: "NO_DEFAULT_BRANCH",
    };
    script({ [SYMBOLIC]: " refs/remotes/origin/trunk/x \n" });
    expect(resolveDefaultBranch("/w")).toStrictEqual({ branch: "trunk/x" });
    expect(calls[0]?.options).toStrictEqual({
      cwd: "/w",
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    for (const answer of [
      "xrefs/remotes/origin/main",
      "refs/remotes/origin/main\nother",
      "refs/remotes/origin/a b",
      "refs/heads/main",
    ]) {
      script({ [SYMBOLIC]: answer });
      expect(resolveDefaultBranch("/w")).toStrictEqual(none);
    }
    script({ [SYMBOLIC]: fail(new Error("no origin")) });
    expect(resolveDefaultBranch("/w")).toStrictEqual(none);
  });
});

describe("resolveBranchAttachment", () => {
  test("an exact or explicit attachment uses the hashed store", () => {
    const root = fresh();
    script({ [SHOW]: "main" });
    expect(resolveBranchAttachment(root)).toStrictEqual({
      gitBranch: "main",
      kbBranch: "main",
      storePath: branchStorePath(root, "main"),
      kind: "exact",
      migrationRequired: false,
    });
    process.env.KIBI_BRANCH = "main";
    ensureBranchStoreManifest(root, "main");
    expect(resolveBranchAttachment(root)).toStrictEqual({
      gitBranch: "main",
      kbBranch: "main",
      storePath: branchStorePath(root, "main"),
      kind: "explicit_override",
      migrationRequired: false,
    });
  });

  test("returns the branch error as is", () => {
    script({ [SHOW]: "bad name" });
    expect(resolveBranchAttachment(fresh())).toStrictEqual({
      error: "Invalid branch name detected: 'bad name'",
      code: "UNKNOWN_ERROR",
    });
  });

  test("a legacy store attaches for migration; both stores are ambiguous", () => {
    const root = fresh();
    script({ [SHOW]: "main" });
    const legacy = legacyBranchStorePath(root, "main");
    mkdirSync(legacy, { recursive: true });
    expect(resolveBranchAttachment(root)).toStrictEqual({
      gitBranch: "main",
      kbBranch: "main",
      storePath: legacy,
      kind: "legacy_compat",
      migrationRequired: true,
    });
    const exact = ensureBranchStoreManifest(root, "main");
    expect(resolveBranchAttachment(root)).toStrictEqual({
      error: `Ambiguous branch storage: both the hashed store ${exact} and legacy store ${legacy} exist for 'main'. Preview an explicit migration before continuing.`,
      code: "AMBIGUOUS_ATTACHMENT",
    });
  });

  test("a hashed store without a matching manifest is refused", () => {
    const root = fresh();
    script({ [SHOW]: "main" });
    const exact = branchStorePath(root, "main");
    mkdirSync(exact, { recursive: true });
    expect(resolveBranchAttachment(root)).toStrictEqual({
      error: `Branch store identity manifest mismatch at ${exact}; refusing to attach it to 'main'.`,
      code: "AMBIGUOUS_ATTACHMENT",
    });
  });

  test("an unfinished or unreadable migration journal blocks attachment", () => {
    const root = fresh();
    script({ [SHOW]: "main" });
    const journals = path.join(root, ".kb", "recovery", "branch-migrations");
    mkdirSync(journals, { recursive: true });
    writeFileSync(path.join(journals, "note.txt"), "ignored");
    writeFileSync(path.join(journals, "a.json"), '{"state":"committed"}');
    writeFileSync(path.join(journals, "b.json"), '{"state":"rolled_back"}');
    expect("error" in resolveBranchAttachment(root)).toBe(false);
    writeFileSync(path.join(journals, "c1.json"), '{"state":"applying"}');
    expect(resolveBranchAttachment(root)).toStrictEqual({
      error:
        "Incomplete branch migration journal 'c1' blocks attachment. Preview recovery with 'kibi branch migrate --recover-journal c1', then apply that exact recovery action.",
      code: "MIGRATION_RECOVERY_REQUIRED",
    });
    rmSync(path.join(journals, "c1.json"));
    writeFileSync(path.join(journals, "d.json"), "{");
    expect(resolveBranchAttachment(root)).toStrictEqual(
      unreadableMigrationJournalError("d.json"),
    );
  });
});

describe("resolveReadBranchAttachment and detachedHeadWriteRefusal", () => {
  const detached = (
    points: string,
    head: string | { throws: unknown } = HEAD,
  ) =>
    script({ [SHOW]: "", [POINTS]: points, [VERIFY]: `${head as string}\n` });

  test("a non-detached result passes through", () => {
    const root = fresh();
    script({ [SHOW]: "main", [POINTS]: "", [VERIFY]: HEAD });
    expect(resolveReadBranchAttachment(root)).toStrictEqual(
      resolveBranchAttachment(root),
    );
    script({ [SHOW]: "bad name", [POINTS]: "", [VERIFY]: HEAD });
    expect(resolveReadBranchAttachment(root)).toStrictEqual({
      error: "Invalid branch name detected: 'bad name'",
      code: "UNKNOWN_ERROR",
    });
  });

  test("a detached HEAD without a readable commit stays an error", () => {
    const root = fresh();
    for (const head of ["not-a-sha", `x${HEAD}`, `${HEAD}x`, "abc"]) {
      detached("", head);
      expect(resolveReadBranchAttachment(root)).toStrictEqual({
        error: diagnostic("Git is in detached HEAD state"),
        code: "DETACHED_HEAD",
      });
    }
    script({ [SHOW]: "", [POINTS]: "", [VERIFY]: fail(new Error("x")) });
    expect("error" in resolveReadBranchAttachment(root)).toBe(true);
    expect(calls.at(-1)?.options).toStrictEqual({
      cwd: root,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  });

  test("reads from the detached snapshot store", () => {
    const root = fresh();
    detached("a\nb\n");
    const storePath = branchStorePath(root, DETACHED_SNAPSHOT_KB_BRANCH);
    expect(resolveReadBranchAttachment(root)).toStrictEqual({
      gitBranch: "HEAD",
      kbBranch: DETACHED_SNAPSHOT_KB_BRANCH,
      storePath,
      kind: "detached_snapshot",
      migrationRequired: false,
      readOnly: {
        head: HEAD,
        branchesAtHead: ["a", "b"],
        notice: `Detached HEAD at 0123456789ab: 2 local branches point at it (a, b), so no single branch KB is implied. Read-only answers come from a snapshot compiled from this checkout's tracked sources (store ${storePath}); writes are refused until a branch is checked out.`,
      },
    });
    script({
      [SHOW]: "",
      [POINTS]: fail(new Error("x")),
      [VERIFY]: HEAD,
    });
    const failed = resolveReadBranchAttachment(root);
    expect(
      "readOnly" in failed && failed.readOnly?.branchesAtHead,
    ).toStrictEqual([]);
    ensureBranchStoreManifest(root, DETACHED_SNAPSHOT_KB_BRANCH);
    detached("");
    const attachment = resolveReadBranchAttachment(root);
    expect("readOnly" in attachment && attachment.readOnly?.notice).toBe(
      `Detached HEAD at 0123456789ab: no local branch points at it. Read-only answers come from a snapshot compiled from this checkout's tracked sources (store ${storePath}); writes are refused until a branch is checked out.`,
    );
  });

  test("a snapshot store with another identity is refused", () => {
    const root = fresh();
    const storePath = branchStorePath(root, DETACHED_SNAPSHOT_KB_BRANCH);
    mkdirSync(storePath, { recursive: true });
    detached("");
    expect(resolveReadBranchAttachment(root)).toStrictEqual({
      error: `Detached HEAD snapshot store identity mismatch at ${storePath}; refusing to read it.`,
      code: "AMBIGUOUS_ATTACHMENT",
    });
  });

  test("a write refusal names the commit and how to get a branch", () => {
    const tail =
      ", or set KIBI_BRANCH to name the branch explicitly. Read-only operations (search, query, status, check, coverage, graph) keep working on a detached HEAD from a read-only snapshot of the checkout.";
    script({ [POINTS]: "", [VERIFY]: fail(new Error("x")) });
    expect(detachedHeadWriteRefusal("kb_upsert", "/w")).toBe(
      `kb_upsert writes the branch KB, but HEAD is detached. Check out a branch first: 'git switch -c <branch>'${tail}`,
    );
    script({ [POINTS]: "b\na\n", [VERIFY]: HEAD });
    expect(detachedHeadWriteRefusal("kibi sync", "/w")).toBe(
      `kibi sync writes the branch KB, but HEAD is detached at 0123456789ab and 2 local branches point at it (a, b), so no single branch KB is implied. Check out a branch first: 'git switch a' (or another branch at HEAD)${tail}`,
    );
  });
});

describe("copyCleanSnapshot", () => {
  test("lists the volatile patterns", () => {
    expect(getVolatileArtifactPatterns()).toStrictEqual([
      "sync-cache.json",
      "source-analysis-cache.json",
      "journal.log",
      "audit.log",
      "lock",
      "lockfile",
      ".lock",
      "*.lock",
      "*.tmp",
      "*.temp",
      "*.pid",
      "journal-*.log",
    ]);
  });

  test("copies everything except volatile artifacts, into nested and existing targets", () => {
    const source = fresh();
    const keep = [
      "kb.rdf",
      "journal-1.txt",
      "x.log",
      "notes.LOCKX",
      "sub/inner.rdf",
    ];
    const drop = [
      "sync-cache.json",
      "source-analysis-cache.json",
      "journal.log",
      "audit.log",
      "lock",
      "lockfile",
      ".lock",
      "a.LOCK",
      "a.tmp",
      "a.temp",
      "a.pid",
      "journal-2.log",
      "sub/x.tmp",
    ];
    for (const file of [...keep, ...drop]) {
      mkdirSync(path.dirname(path.join(source, file)), { recursive: true });
      writeFileSync(path.join(source, file), file);
    }
    const target = path.join(fresh(), "a", "b");
    copyCleanSnapshot(source, target);
    const listed = (dir: string): string[] =>
      readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) =>
          path.relative(dir, path.join(entry.parentPath, entry.name)),
        )
        .sort();
    expect(listed(target)).toStrictEqual([...keep].sort());
    expect(readFileSync(path.join(target, "sub", "inner.rdf"), "utf8")).toBe(
      "sub/inner.rdf",
    );
    copyCleanSnapshot(source, target);
    expect(listed(target)).toStrictEqual([...keep].sort());
  });

  test("a missing source is an error", () => {
    const missing = path.join(fresh(), "missing");
    expect(() => copyCleanSnapshot(missing, path.join(fresh(), "t"))).toThrow(
      `Source branch KB does not exist: ${missing}`,
    );
    expect(existsSync(missing)).toBe(false);
  });
});
