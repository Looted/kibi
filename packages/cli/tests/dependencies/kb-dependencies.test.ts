import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type GitRunner,
  KB_DEPENDENCIES_LOCK_PATH,
  KB_DEPENDENCIES_PATH,
  KB_DEPENDENCY_CACHE_ENV,
  KbDependencyError,
  defaultGitRunner,
  gitFetchEnvironment,
  kbDependencyCacheRoot,
  kbDependencyCheckoutPath,
  kbDependencyStatus,
  lockKbDependencies,
  materializeKbDependency,
  readKbDependencies,
  readKbDependencyLock,
  resolveGitRef,
  resolveKbDependency,
} from "../../src/dependencies/kb-dependencies.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";

const base = mkdtempSync(path.join(os.tmpdir(), "kibi-kb-deps-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let counter = 0;
function dir(label: string): string {
  const target = path.join(base, `${label}-${counter++}`);
  mkdirSync(target, { recursive: true });
  return target;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@t",
    },
  }).trim();
}

/** A repository holding a Kibi workspace (at `directory`) of one schema. */
function providerRepo(
  options: { schema?: number; directory?: string; manifest?: string } = {},
): string {
  const repo = dir("provider");
  git(repo, "init", "-q", "-b", "main");
  const workspace = path.join(repo, options.directory ?? "");
  mkdirSync(path.join(workspace, ".kb"), { recursive: true });
  writeFileSync(
    path.join(workspace, ".kb", "manifest.json"),
    options.manifest ??
      `${JSON.stringify({ manifestVersion: 1, schemaVersion: options.schema ?? LATEST_KB_SCHEMA_VERSION })}\n`,
  );
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "kb");
  return repo;
}

function commitAgain(repo: string, file = "next.txt"): string {
  writeFileSync(path.join(repo, file), `${counter++}\n`);
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "next");
  return git(repo, "rev-parse", "HEAD");
}

function project(dependencies: unknown): string {
  const root = dir("project");
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  writeFileSync(
    path.join(root, KB_DEPENDENCIES_PATH),
    typeof dependencies === "string"
      ? dependencies
      : JSON.stringify({ version: 1, dependencies }),
  );
  return root;
}

function cacheEnv(): NodeJS.ProcessEnv {
  return { [KB_DEPENDENCY_CACHE_ENV]: dir("cache") };
}

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(KbDependencyError);
    return (error as KbDependencyError).code;
  }
  throw new Error("expected a KbDependencyError");
}

describe("dependency list", () => {
  test("a workspace without a dependency list has no dependencies", () => {
    expect(readKbDependencies(dir("empty"))).toEqual([]);
    expect(readKbDependencyLock(dir("empty"))).toEqual({});
  });

  test("reads, trims and sorts declared dependencies", () => {
    const root = project({
      zeta: { git: " https://example.com/zeta.git " },
      alpha: { git: "../alpha", ref: "v1", directory: "services/alpha/" },
      beta: { git: "../beta", directory: "." },
    });
    expect(readKbDependencies(root)).toEqual([
      {
        name: "alpha",
        git: "../alpha",
        ref: "v1",
        directory: "services/alpha",
      },
      { name: "beta", git: "../beta" },
      { name: "zeta", git: "https://example.com/zeta.git" },
    ]);
  });

  test.each([
    ["not json", "{"],
    ["wrong version", JSON.stringify({ version: 2, dependencies: {} })],
    ["no dependencies object", JSON.stringify({ version: 1 })],
    ["bad name", { "Bad Name": { git: "x" } }],
    ["entry not an object", { a: "x" }],
    ["missing git", { a: { ref: "v1" } }],
    ["empty ref", { a: { git: "x", ref: " " } }],
    ["absolute directory", { a: { git: "x", directory: "/etc" } }],
    ["escaping directory", { a: { git: "x", directory: "../up" } }],
    ["parent directory", { a: { git: "x", directory: ".." } }],
    [
      "a git url git would read as an option",
      { a: { git: "--upload-pack=x" } },
    ],
    ["a ref git would read as an option", { a: { git: "x", ref: "--foo" } }],
    ["a git url with a control character", { a: { git: "x\ny" } }],
  ])("rejects %s", (_label, dependencies) => {
    expect(codeOf(() => readKbDependencies(project(dependencies)))).toBe(
      "DEPENDENCIES_INVALID",
    );
  });

  test.each([
    ["not a lock", { dependencies: {} }],
    [
      "malformed entry",
      { lockVersion: 1, dependencies: { a: { git: "x", commit: "nope" } } },
    ],
    [
      "pinned to an option-like git url",
      {
        lockVersion: 1,
        dependencies: {
          a: { git: "--upload-pack=x", commit: "a".repeat(40), kbSchema: 14 },
        },
      },
    ],
    [
      "pinned to an option-like ref",
      {
        lockVersion: 1,
        dependencies: {
          a: { git: "x", ref: "-x", commit: "a".repeat(40), kbSchema: 14 },
        },
      },
    ],
  ])("rejects a lock that is %s", (_label, lock) => {
    const root = project({});
    writeFileSync(
      path.join(root, KB_DEPENDENCIES_LOCK_PATH),
      JSON.stringify(lock),
    );
    expect(codeOf(() => readKbDependencyLock(root))).toBe(
      "DEPENDENCIES_INVALID",
    );
  });
});

describe("ref resolution", () => {
  test("resolves branches, tags, annotated tags, full refs and HEAD", () => {
    const repo = providerRepo();
    const first = git(repo, "rev-parse", "HEAD");
    git(repo, "tag", "light");
    git(repo, "tag", "-a", "v1", "-m", "release");
    const second = commitAgain(repo);
    expect(resolveGitRef(repo, "light")).toBe(first);
    expect(resolveGitRef(repo, "v1")).toBe(first);
    expect(resolveGitRef(repo, "refs/tags/v1")).toBe(first);
    expect(resolveGitRef(repo, "main")).toBe(second);
    expect(resolveGitRef(repo, undefined)).toBe(second);
    expect(resolveGitRef(repo, first)).toBe(first);
  });

  test("reports a missing ref and an unreachable repository", () => {
    const repo = providerRepo();
    expect(codeOf(() => resolveGitRef(repo, "nope"))).toBe(
      "DEPENDENCY_REF_NOT_FOUND",
    );
    expect(
      codeOf(() => resolveGitRef(path.join(base, "missing-repo"), "main")),
    ).toBe("DEPENDENCY_FETCH_FAILED");
  });

  test("a git failure without stderr still reports its message", () => {
    const failing: GitRunner = () => {
      throw new Error("spawn failed");
    };
    expect(() => resolveGitRef("x", "main", failing)).toThrow("spawn failed");
  });
});

describe("git argument safety", () => {
  const forbidden: GitRunner = () => {
    throw new Error("git must not run");
  };

  test("a url or ref that git would read as an option never reaches git", () => {
    const marker = path.join(dir("marker"), "ran");
    const injection = `--upload-pack=touch ${marker};`;
    expect(codeOf(() => resolveGitRef(injection, "."))).toBe(
      "DEPENDENCIES_INVALID",
    );
    expect(codeOf(() => resolveGitRef(".", injection))).toBe(
      "DEPENDENCIES_INVALID",
    );
    expect(
      codeOf(() =>
        materializeKbDependency(injection, "a".repeat(40), { env: cacheEnv() }),
      ),
    ).toBe("DEPENDENCIES_INVALID");
    expect(existsSync(marker)).toBe(false);
  });

  test("a commit that is not a full commit id is refused before git runs", () => {
    expect(
      codeOf(() =>
        materializeKbDependency("x", "--upload-pack=x", {
          env: cacheEnv(),
          git: forbidden,
        }),
      ),
    ).toBe("DEPENDENCIES_INVALID");
  });

  test("a read of a lock pinned to an option-like url runs nothing", () => {
    const marker = path.join(dir("marker"), "ran");
    const injection = `--upload-pack=touch ${marker};`;
    const root = project({ lib: { git: injection } });
    writeFileSync(
      path.join(root, KB_DEPENDENCIES_LOCK_PATH),
      JSON.stringify({
        lockVersion: 1,
        dependencies: {
          lib: { git: injection, commit: "a".repeat(40), kbSchema: 14 },
        },
      }),
    );
    expect(
      codeOf(() => resolveKbDependency(root, "lib", { env: cacheEnv() })),
    ).toBe("DEPENDENCIES_INVALID");
    expect(codeOf(() => lockKbDependencies(root, { env: cacheEnv() }))).toBe(
      "DEPENDENCIES_INVALID",
    );
    expect(existsSync(marker)).toBe(false);
  });

  test("git receives the url after --end-of-options", () => {
    const calls: string[][] = [];
    const recording: GitRunner = (args, cwd) => {
      calls.push([...args]);
      return defaultGitRunner(args, cwd);
    };
    const repo = providerRepo();
    const commit = resolveGitRef(repo, "main", recording);
    materializeKbDependency(repo, commit, { env: cacheEnv(), git: recording });
    for (const call of calls.filter(
      (args) => args[0] === "ls-remote" || args[0] === "fetch",
    )) {
      expect(call.indexOf("--end-of-options")).toBe(call.indexOf(repo) - 1);
    }
    expect(calls.some((args) => args[0] === "ls-remote")).toBe(true);
    expect(calls.some((args) => args[0] === "fetch")).toBe(true);
  });

  test("fetches run with the ext transport off and no credential prompt", () => {
    expect(gitFetchEnvironment({ A: "1" })).toEqual({
      A: "1",
      GIT_TERMINAL_PROMPT: "0",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "protocol.ext.allow",
      GIT_CONFIG_VALUE_0: "never",
    });
    expect(
      gitFetchEnvironment({
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "protocol.ext.allow",
        GIT_CONFIG_VALUE_0: "always",
      }),
    ).toMatchObject({
      GIT_CONFIG_COUNT: "2",
      GIT_CONFIG_KEY_0: "protocol.ext.allow",
      GIT_CONFIG_VALUE_0: "always",
      GIT_CONFIG_KEY_1: "protocol.ext.allow",
      GIT_CONFIG_VALUE_1: "never",
    });
    expect(
      gitFetchEnvironment({ GIT_CONFIG_COUNT: "x" }).GIT_CONFIG_COUNT,
    ).toBe("1");
  });

  test("an ext transport url runs no command", () => {
    const marker = path.join(dir("marker"), "ran");
    expect(
      codeOf(() => resolveGitRef(`ext::sh -c touch% ${marker}`, "main")),
    ).toBe("DEPENDENCY_FETCH_FAILED");
    expect(existsSync(marker)).toBe(false);
  });
});

describe("cache", () => {
  test("the cache root honours the override, XDG and the home directory", () => {
    expect(kbDependencyCacheRoot({ [KB_DEPENDENCY_CACHE_ENV]: "/c" })).toBe(
      path.resolve("/c"),
    );
    expect(kbDependencyCacheRoot({ XDG_CACHE_HOME: "/x" })).toBe(
      path.join("/x", "kibi", "dependencies"),
    );
    expect(kbDependencyCacheRoot({})).toBe(
      path.join(os.homedir(), ".cache", "kibi", "dependencies"),
    );
  });

  test("checkout paths depend only on the URL and the commit", () => {
    const commit = "a".repeat(40);
    const one = kbDependencyCheckoutPath(
      "/c",
      "https://h/o/billing.git",
      commit,
    );
    expect(one).toBe(
      kbDependencyCheckoutPath("/c", "https://h/o/billing.git", commit),
    );
    expect(path.basename(path.dirname(one))).toMatch(/^billing-[0-9a-f]{12}$/);
    expect(one).not.toBe(
      kbDependencyCheckoutPath("/c", "https://h/p/billing.git", commit),
    );
    expect(
      path.basename(path.dirname(kbDependencyCheckoutPath("/c", "/", commit))),
    ).toMatch(/^repo-/);
  });

  test("fetches a commit once into a detached checkout with no branch", () => {
    const repo = providerRepo();
    const commit = git(repo, "rev-parse", "HEAD");
    const env = cacheEnv();
    const calls: string[][] = [];
    const recording: GitRunner = (args, cwd) => {
      calls.push([...args]);
      return defaultGitRunner(args, cwd);
    };
    const checkout = materializeKbDependency(repo, commit, {
      env,
      git: recording,
    });
    expect(git(checkout, "rev-parse", "HEAD")).toBe(commit);
    expect(git(checkout, "for-each-ref", "refs/heads")).toBe("");
    expect(git(checkout, "status", "--porcelain")).toBe("");
    const before = calls.length;
    expect(materializeKbDependency(repo, commit, { env, git: recording })).toBe(
      checkout,
    );
    expect(calls.length).toBe(before);
  });

  test("falls back to fetching all refs when a fetch by commit is refused", () => {
    const repo = providerRepo();
    const commit = git(repo, "rev-parse", "HEAD");
    const refusing: GitRunner = (args, cwd) => {
      if (args[0] === "fetch" && args.includes(commit)) {
        throw new Error(
          "server does not allow request for unadvertised object",
        );
      }
      return defaultGitRunner(args, cwd);
    };
    const checkout = materializeKbDependency(repo, commit, {
      env: cacheEnv(),
      git: refusing,
    });
    expect(git(checkout, "rev-parse", "HEAD")).toBe(commit);
  });

  test("reports a repository that cannot be fetched or lacks the commit", () => {
    const repo = providerRepo();
    expect(
      codeOf(() =>
        materializeKbDependency(path.join(base, "gone"), "b".repeat(40), {
          env: cacheEnv(),
        }),
      ),
    ).toBe("DEPENDENCY_FETCH_FAILED");
    const unknownCommit: GitRunner = (args, cwd) => {
      if (args[0] === "fetch" && args.includes("c".repeat(40))) {
        throw new Error("not our ref");
      }
      return defaultGitRunner(args, cwd);
    };
    expect(
      codeOf(() =>
        materializeKbDependency(repo, "c".repeat(40), {
          env: cacheEnv(),
          git: unknownCommit,
        }),
      ),
    ).toBe("DEPENDENCY_FETCH_FAILED");
  });

  test("keeps a checkout another process completed first", () => {
    const repo = providerRepo();
    const commit = git(repo, "rev-parse", "HEAD");
    const env = cacheEnv();
    const winner = materializeKbDependency(repo, commit, { env });
    const markerPath = path.join(winner, ".git", "kibi-dependency.json");
    const marker = readFileSync(markerPath, "utf8");
    // This process sees no finished checkout and builds its own copy; the
    // other process completes first, so the rename into place loses.
    rmSync(markerPath);
    const racing: GitRunner = (args, cwd) => {
      if (args.includes("checkout")) writeFileSync(markerPath, marker);
      return defaultGitRunner(args, cwd);
    };
    expect(materializeKbDependency(repo, commit, { env, git: racing })).toBe(
      winner,
    );
  });

  test("a failed rename into place is reported when no checkout won", () => {
    const repo = providerRepo();
    const commit = git(repo, "rev-parse", "HEAD");
    const env = cacheEnv();
    const blocked = kbDependencyCheckoutPath(
      kbDependencyCacheRoot(env),
      repo,
      commit,
    );
    mkdirSync(path.join(blocked, "occupied"), { recursive: true });
    expect(() => materializeKbDependency(repo, commit, { env })).toThrow();
  });

  test("a git failure that is not an Error is still reported", () => {
    const throwing: GitRunner = () => {
      throw "plain failure";
    };
    expect(() =>
      materializeKbDependency("x", "d".repeat(40), {
        env: cacheEnv(),
        git: (args, cwd) =>
          args[0] === "init" ? defaultGitRunner(args, cwd) : throwing(args),
      }),
    ).toThrow("plain failure");
  });
});

describe("lock", () => {
  test("pins, keeps, updates and drops dependencies", () => {
    const repo = providerRepo();
    const first = git(repo, "rev-parse", "HEAD");
    const env = cacheEnv();
    const root = project({ provider: { git: repo, ref: "main" } });

    expect(lockKbDependencies(root, { env })).toEqual([
      {
        name: "provider",
        status: "locked",
        commit: first,
        kbSchema: LATEST_KB_SCHEMA_VERSION,
      },
    ]);
    expect(readKbDependencyLock(root)).toEqual({
      provider: {
        git: repo,
        ref: "main",
        commit: first,
        kbSchema: LATEST_KB_SCHEMA_VERSION,
      },
    });

    const second = commitAgain(repo);
    expect(lockKbDependencies(root, { env })[0]?.status).toBe("kept");
    expect(lockKbDependencies(root, { env, update: ["provider"] })).toEqual([
      {
        name: "provider",
        status: "updated",
        commit: second,
        kbSchema: LATEST_KB_SCHEMA_VERSION,
        previousCommit: first,
      },
    ]);
    expect(lockKbDependencies(root, { env, update: true })[0]).toEqual({
      name: "provider",
      status: "updated",
      commit: second,
      kbSchema: LATEST_KB_SCHEMA_VERSION,
    });

    writeFileSync(
      path.join(root, KB_DEPENDENCIES_PATH),
      JSON.stringify({ version: 1, dependencies: {} }),
    );
    expect(lockKbDependencies(root)).toEqual([]);
    expect(readKbDependencyLock(root)).toEqual({});
  });

  test("an update names only declared dependencies", () => {
    const root = project({});
    expect(
      codeOf(() => lockKbDependencies(root, { update: ["missing"] })),
    ).toBe("DEPENDENCY_UNKNOWN");
  });

  test("a dependency in a subdirectory is read from there", () => {
    const repo = providerRepo({ directory: "services/billing" });
    const env = cacheEnv();
    const root = project({
      billing: { git: repo, directory: "services/billing" },
    });
    lockKbDependencies(root, { env });
    const resolved = resolveKbDependency(root, "billing", { env });
    expect(
      resolved.workspaceRoot.endsWith(path.join("services", "billing")),
    ).toBe(true);
    expect(readKbDependencyLock(root).billing?.directory).toBe(
      "services/billing",
    );
  });

  test.each([
    ["older than schema 6", { schema: 5 }, "DEPENDENCY_SCHEMA_UNSUPPORTED"],
    [
      "newer than this Kibi",
      { schema: LATEST_KB_SCHEMA_VERSION + 1 },
      "DEPENDENCY_SCHEMA_UNSUPPORTED",
    ],
    ["not a Kibi workspace", { directory: "elsewhere" }, "DEPENDENCY_NOT_A_KB"],
    ["missing a schema", { manifest: "{}" }, "DEPENDENCY_NOT_A_KB"],
  ])("refuses a dependency %s", (_label, options, code) => {
    const repo = providerRepo(options);
    const root = project({ provider: { git: repo } });
    expect(codeOf(() => lockKbDependencies(root, { env: cacheEnv() }))).toBe(
      code,
    );
  });
});

describe("resolution and status", () => {
  const savedCache = process.env[KB_DEPENDENCY_CACHE_ENV];
  afterEach(() => {
    if (savedCache === undefined) delete process.env[KB_DEPENDENCY_CACHE_ENV];
    else process.env[KB_DEPENDENCY_CACHE_ENV] = savedCache;
  });

  test("resolves a locked dependency, fetching it on first use", () => {
    const repo = providerRepo();
    const root = project({ provider: { git: repo, ref: "main" } });
    const lockEnv = cacheEnv();
    lockKbDependencies(root, { env: lockEnv });
    // A fresh cache, as on another machine that only has the lock.
    const env = cacheEnv();
    expect(kbDependencyStatus(root, { env })[0]?.state).toBe("not_fetched");
    const resolved = resolveKbDependency(root, "provider", { env });
    expect(resolved).toEqual({
      name: "provider",
      git: repo,
      ref: "main",
      commit: git(repo, "rev-parse", "HEAD"),
      kbSchema: LATEST_KB_SCHEMA_VERSION,
      workspaceRoot: resolved.workspaceRoot,
    });
    expect(existsSync(path.join(resolved.workspaceRoot, ".kb"))).toBe(true);
    expect(kbDependencyStatus(root, { env })).toEqual([
      {
        name: "provider",
        git: repo,
        ref: "main",
        commit: resolved.commit,
        kbSchema: LATEST_KB_SCHEMA_VERSION,
        state: "fetched",
        checkout: resolved.workspaceRoot,
      },
    ]);
  });

  test("reports unknown, unpinned and stale dependencies", () => {
    const repo = providerRepo();
    expect(codeOf(() => resolveKbDependency(project({}), "x"))).toBe(
      "DEPENDENCY_UNKNOWN",
    );
    const root = project({
      provider: { git: repo, ref: "main", directory: "." },
    });
    expect(codeOf(() => resolveKbDependency(root, "nope"))).toBe(
      "DEPENDENCY_UNKNOWN",
    );
    expect(codeOf(() => resolveKbDependency(root, "provider"))).toBe(
      "DEPENDENCY_NOT_LOCKED",
    );
    expect(kbDependencyStatus(root)[0]).toEqual({
      name: "provider",
      git: repo,
      ref: "main",
      commit: null,
      kbSchema: null,
      state: "not_locked",
      checkout: null,
    });
    lockKbDependencies(root, { env: cacheEnv() });
    writeFileSync(
      path.join(root, KB_DEPENDENCIES_PATH),
      JSON.stringify({
        version: 1,
        dependencies: { provider: { git: repo, ref: "v2", directory: "sub" } },
      }),
    );
    expect(codeOf(() => resolveKbDependency(root, "provider"))).toBe(
      "DEPENDENCY_LOCK_STALE",
    );
    expect(kbDependencyStatus(root)[0]).toMatchObject({
      directory: "sub",
      state: "lock_stale",
      checkout: null,
    });
  });
});
