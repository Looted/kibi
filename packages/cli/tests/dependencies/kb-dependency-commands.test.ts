import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { InputError } from "../../src/cli-errors.js";
import {
  depsFetchCommand,
  depsLockCommand,
  depsStatusCommand,
} from "../../src/commands/deps.js";
import * as dependenciesEntry from "../../src/dependencies/index.js";
import {
  KB_DEPENDENCIES_LOCK_PATH,
  KB_DEPENDENCIES_PATH,
  KB_DEPENDENCY_CACHE_ENV,
  kbDependencyCheckoutPath,
  lockKbDependencies,
  resolveKbDependency,
} from "../../src/dependencies/kb-dependencies.js";
import {
  applyKbOption,
  scopeJsonInputToKbDependency,
} from "../../src/dependencies/kb-dependency-cli.js";
import {
  KB_DEPENDENCY_ENV,
  KB_DEPENDENCY_INPUT_SCHEMA,
  enterKbDependency,
  kbDependencyArgument,
  kbDependencyLabel,
  withoutKbDependencyArgument,
} from "../../src/dependencies/kb-dependency-scope.js";
import { resolveReadBranchAttachment } from "../../src/utils/branch-resolver.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";

const base = mkdtempSync(path.join(os.tmpdir(), "kibi-kb-deps-cmd-"));
const originalCwd = process.cwd();
const savedEnv = {
  cache: process.env[KB_DEPENDENCY_CACHE_ENV],
  dependency: process.env[KB_DEPENDENCY_ENV],
};
const savedExitCode = process.exitCode;
afterAll(() => rmSync(base, { recursive: true, force: true }));
afterEach(() => {
  process.chdir(originalCwd);
  for (const [key, value] of [
    [KB_DEPENDENCY_CACHE_ENV, savedEnv.cache],
    [KB_DEPENDENCY_ENV, savedEnv.dependency],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  process.exitCode = savedExitCode ?? 0;
});

let counter = 0;
function dir(label: string): string {
  const target = path.join(base, `${label}-${counter++}`);
  mkdirSync(target, { recursive: true });
  return realpathSync(target);
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

function providerRepo(): string {
  const repo = dir("provider");
  git(repo, "init", "-q", "-b", "main");
  mkdirSync(path.join(repo, ".kb"), { recursive: true });
  writeFileSync(
    path.join(repo, ".kb", "manifest.json"),
    JSON.stringify({
      manifestVersion: 1,
      schemaVersion: LATEST_KB_SCHEMA_VERSION,
    }),
  );
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "kb");
  git(repo, "tag", "v1");
  return repo;
}

function project(dependencies: Record<string, unknown>): string {
  const root = dir("project");
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  writeFileSync(
    path.join(root, KB_DEPENDENCIES_PATH),
    JSON.stringify({ version: 1, dependencies }),
  );
  return root;
}

function capture(): { out: string[]; err: string[]; restore: () => void } {
  const out: string[] = [];
  const err: string[] = [];
  const log = spyOn(console, "log").mockImplementation((...args) => {
    out.push(args.join(" "));
  });
  const error = spyOn(console, "error").mockImplementation((...args) => {
    err.push(args.join(" "));
  });
  const write = spyOn(process.stderr, "write").mockImplementation(
    (chunk: string | Uint8Array) => {
      err.push(String(chunk));
      return true;
    },
  );
  return {
    out,
    err,
    restore: () => {
      log.mockRestore();
      error.mockRestore();
      write.mockRestore();
    },
  };
}

describe("kibi deps commands", () => {
  test("lock, status and fetch report each dependency", async () => {
    const repo = providerRepo();
    const commit = git(repo, "rev-parse", "HEAD");
    const root = project({ provider: { git: repo, ref: "v1" } });
    const dependencyOptions = {
      env: { [KB_DEPENDENCY_CACHE_ENV]: dir("cache") },
    };
    const io = capture();
    try {
      expect(
        (await depsStatusCommand({ workspaceRoot: root, dependencyOptions }))
          .exitCode,
      ).toBe(1);
      expect(io.out.join("\n")).toContain("not locked");
      expect(io.out.join("\n")).toContain(
        "Run 'kibi deps lock' to pin: provider.",
      );

      expect(
        (await depsLockCommand([], { workspaceRoot: root, dependencyOptions }))
          .exitCode,
      ).toBe(0);
      expect(io.out.join("\n")).toContain(
        `locked  provider @ ${commit.slice(0, 12)}, KB schema ${LATEST_KB_SCHEMA_VERSION}`,
      );
      expect(
        (await depsStatusCommand({ workspaceRoot: root, dependencyOptions }))
          .exitCode,
      ).toBe(0);
      expect(io.out.at(-1)).toBe(
        `provider: ${repo} (v1) @ ${commit.slice(0, 12)}, fetched, KB schema ${LATEST_KB_SCHEMA_VERSION}`,
      );

      writeFileSync(path.join(repo, "next.txt"), "x");
      git(repo, "add", "-A");
      git(repo, "commit", "-q", "-m", "next");
      git(repo, "tag", "-f", "v1");
      const moved = git(repo, "rev-parse", "HEAD");
      await depsLockCommand(["provider"], {
        workspaceRoot: root,
        dependencyOptions,
      });
      expect(io.out.join("\n")).toContain(
        `updated provider @ ${moved.slice(0, 12)} (was ${commit.slice(0, 12)})`,
      );

      io.out.length = 0;
      await depsLockCommand([], {
        workspaceRoot: root,
        dependencyOptions,
        update: true,
        format: "json",
      });
      expect(JSON.parse(io.out.join("\n")).dependencies[0].commit).toBe(moved);

      io.out.length = 0;
      expect(
        (
          await depsFetchCommand({
            workspaceRoot: root,
            dependencyOptions: {
              env: { [KB_DEPENDENCY_CACHE_ENV]: dir("cache") },
            },
          })
        ).exitCode,
      ).toBe(0);
      expect(io.out[0]).toMatch(
        new RegExp(`^fetched provider @ ${moved.slice(0, 12)} -> `),
      );

      io.out.length = 0;
      await depsFetchCommand({
        workspaceRoot: root,
        dependencyOptions,
        format: "json",
      });
      expect(JSON.parse(io.out.join("\n")).dependencies[0].commit).toBe(moved);
      io.out.length = 0;
      await depsStatusCommand({
        workspaceRoot: root,
        dependencyOptions,
        format: "json",
      });
      expect(JSON.parse(io.out.join("\n")).dependencies[0].state).toBe(
        "fetched",
      );
    } finally {
      io.restore();
    }
  });

  test("commands with no dependencies say so", async () => {
    const root = dir("bare");
    const io = capture();
    try {
      expect(
        (await depsLockCommand([], { workspaceRoot: root })).exitCode,
      ).toBe(0);
      expect((await depsFetchCommand({ workspaceRoot: root })).exitCode).toBe(
        0,
      );
      expect((await depsStatusCommand({ workspaceRoot: root })).exitCode).toBe(
        0,
      );
    } finally {
      io.restore();
    }
    expect(io.out).toEqual([
      `No KB dependencies declared in ${KB_DEPENDENCIES_PATH}; wrote an empty ${KB_DEPENDENCIES_LOCK_PATH}.`,
      `No KB dependencies declared in ${KB_DEPENDENCIES_PATH}.`,
      `No KB dependencies declared in ${KB_DEPENDENCIES_PATH}.`,
    ]);
  });

  test("commands report dependency errors with their code", async () => {
    const root = dir("broken");
    mkdirSync(path.join(root, ".kb"));
    writeFileSync(path.join(root, KB_DEPENDENCIES_PATH), "{");
    const io = capture();
    try {
      expect(
        (await depsLockCommand([], { workspaceRoot: root })).exitCode,
      ).toBe(1);
      expect((await depsFetchCommand({ workspaceRoot: root })).exitCode).toBe(
        1,
      );
      expect((await depsStatusCommand({ workspaceRoot: root })).exitCode).toBe(
        1,
      );
    } finally {
      io.restore();
    }
    expect(io.err).toHaveLength(3);
    for (const line of io.err)
      expect(line).toStartWith("Error [DEPENDENCIES_INVALID]");
  });

  test("other failures are not swallowed", async () => {
    const root = path.join(dir("file"), "not-a-dir");
    writeFileSync(root, "");
    const io = capture();
    try {
      await expect(
        depsLockCommand([], { workspaceRoot: root }),
      ).rejects.toThrow();
    } finally {
      io.restore();
    }
  });
});

describe("dependency scope", () => {
  test("the kibi-cli/dependencies entry re-exports both modules", () => {
    expect(dependenciesEntry.resolveKbDependency).toBe(resolveKbDependency);
    expect(dependenciesEntry.kbDependencyLabel).toBe(kbDependencyLabel);
  });

  test("reads, strips and labels the kb argument", () => {
    expect(kbDependencyArgument({ kb: " billing " })).toBe("billing");
    expect(kbDependencyArgument({ kb: "  " })).toBeUndefined();
    expect(kbDependencyArgument({ kb: 1 })).toBeUndefined();
    expect(kbDependencyArgument(null)).toBeUndefined();
    expect(kbDependencyArgument("kb")).toBeUndefined();
    expect(
      withoutKbDependencyArgument<Record<string, unknown>>({
        kb: "x",
        query: "q",
      }),
    ).toEqual({
      query: "q",
    });
    expect(withoutKbDependencyArgument(null)).toBeNull();
    expect(
      kbDependencyLabel({
        name: "billing",
        git: "g",
        commit: "c",
        kbSchema: 13,
        workspaceRoot: "/w",
      }),
    ).toBe("billing@c");
    expect(
      new RegExp(KB_DEPENDENCY_INPUT_SCHEMA.pattern).test("billing-service"),
    ).toBe(true);
  });

  test("entering a dependency moves the process into its checkout", () => {
    const repo = providerRepo();
    const root = project({ provider: { git: repo } });
    process.env[KB_DEPENDENCY_CACHE_ENV] = dir("cache");
    const io = capture();
    try {
      expect(applyKbOption({})).toBe(true);
      process.chdir(root);
      expect(applyKbOption({ kb: "provider" })).toBe(false);
      expect(process.exitCode).toBe(2);
      expect(io.err.join("")).toContain("Error [DEPENDENCY_NOT_LOCKED]");
    } finally {
      io.restore();
    }
    const commit = git(repo, "rev-parse", "HEAD");
    lockKbDependencies(root);
    // This project's branch override must not follow the read into the
    // dependency's detached checkout.
    const projectBranch = process.env.KIBI_BRANCH;
    process.env.KIBI_BRANCH = "feature/project-branch";
    expect(applyKbOption({ kb: "provider" })).toBe(true);
    expect(process.env.KIBI_BRANCH).toBeUndefined();
    expect(process.env[KB_DEPENDENCY_ENV]).toBe(`provider@${commit}`);
    expect(process.cwd()).not.toBe(root);
    expect(git(process.cwd(), "rev-parse", "HEAD")).toBe(commit);

    // The checkout is a detached HEAD, read through a snapshot whose notice
    // names the dependency.
    const attachment = resolveReadBranchAttachment(process.cwd());
    expect("error" in attachment).toBe(false);
    expect(
      (attachment as { readOnly?: { notice: string } }).readOnly?.notice,
    ).toStartWith(`KB dependency provider@${commit}: read-only answers`);

    process.chdir(root);
    expect(enterKbDependency("provider", root).commit).toBe(commit);
    if (projectBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = projectBranch;
    }
  });

  test("a JSON route is scoped only when its operation takes kb", () => {
    const repo = providerRepo();
    const root = project({ provider: { git: repo } });
    process.env[KB_DEPENDENCY_CACHE_ENV] = dir("cache");
    process.chdir(root);
    const withKb = { properties: { kb: KB_DEPENDENCY_INPUT_SCHEMA } };
    expect(scopeJsonInputToKbDependency({ kb: "provider" }, {})).toEqual({
      kb: "provider",
    });
    expect(scopeJsonInputToKbDependency({ kb: "provider" }, undefined)).toEqual(
      {
        kb: "provider",
      },
    );
    expect(scopeJsonInputToKbDependency({ kb: " ", q: 1 }, withKb)).toEqual({
      q: 1,
    });
    expect(() => scopeJsonInputToKbDependency({ kb: "nope" }, withKb)).toThrow(
      InputError,
    );
    lockKbDependencies(root);
    expect(
      scopeJsonInputToKbDependency({ kb: "provider", q: 1 }, withKb),
    ).toEqual({
      q: 1,
    });
    expect(process.cwd()).not.toBe(root);
  });

  test("unexpected failures while entering a dependency propagate", () => {
    const repo = providerRepo();
    const root = project({ provider: { git: repo } });
    lockKbDependencies(root, {
      env: { [KB_DEPENDENCY_CACHE_ENV]: dir("cache") },
    });
    // In a fresh cache whose checkout slot is taken by something that is not
    // a finished checkout, the rename into place fails with a plain error.
    const cache = dir("cache");
    process.env[KB_DEPENDENCY_CACHE_ENV] = cache;
    const commit = git(repo, "rev-parse", "HEAD");
    mkdirSync(path.join(kbDependencyCheckoutPath(cache, repo, commit), "x"), {
      recursive: true,
    });
    process.chdir(root);
    expect(() => applyKbOption({ kb: "provider" })).toThrow(/ENOTEMPTY|EEXIST/);
  });
});
