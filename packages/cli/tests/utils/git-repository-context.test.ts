import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync as nodeExecSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  type GitRepositoryContext,
  resolveGitRepository,
} from "../../src/utils/git-repository-context.js";

// executable_for TEST-git-hook-effective-install

// Fixture git config/env must be fully isolated for the WHOLE lifecycle, not
// just fixture setup: resolveGitRepository spawns git with the ambient
// process.env, so an ambient global core.hooksPath (or user identity) would
// change what the resolver reports. beforeEach points the ambient env at an
// empty private config; afterEach restores the prior values and deletes the
// config files.
describe("resolveGitRepository", () => {
  let tmpRoot: string;
  let envRestores: Array<() => void>;
  let globalConfigPath: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-git-context-"));
    envRestores = [];
    globalConfigPath = path.join(
      os.tmpdir(),
      `kibi-git-context-global-${process.pid}-${Date.now()}.config`,
    );
    writeFileSync(globalConfigPath, "", "utf8");
    for (const [key, value] of [
      ["GIT_CONFIG_GLOBAL", globalConfigPath],
      ["GIT_CONFIG_SYSTEM", os.platform() === "win32" ? "NUL" : "/dev/null"],
      ["GIT_CONFIG_NOSYSTEM", "1"],
    ] as const) {
      const previous = process.env[key];
      process.env[key] = value;
      envRestores.push(() => {
        if (previous === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previous;
        }
      });
    }
  });

  afterEach(() => {
    for (const restore of envRestores.reverse()) restore();
    rmSync(globalConfigPath, { force: true });
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  // Fixture git commands inherit the same isolated config the resolver sees.
  function git(cwd: string, args: string): void {
    nodeExecSync(`git ${args}`, { cwd, stdio: "ignore" });
  }

  function contextOf(cwd: string): GitRepositoryContext {
    const resolution = resolveGitRepository(cwd);
    if (resolution.status !== "ok") {
      throw new Error(`expected ok resolution, got ${resolution.status}`);
    }
    return resolution.context;
  }

  function makeRepo(root: string, name: string, addCommit = true): string {
    const repo = path.join(root, name);
    git(root, `init -q -b main ${JSON.stringify(repo)}`);
    git(repo, "config user.email test@test.com");
    git(repo, "config user.name Test User");
    if (addCommit) {
      writeFileSync(path.join(repo, "README.md"), "# test\n");
      git(repo, "add README.md");
      git(repo, "commit -qm init");
    }
    return repo;
  }

  test("reports not-a-repository outside a repository", () => {
    const probe = path.join(tmpRoot, "empty");
    mkdirSync(probe, { recursive: true });
    expect(resolveGitRepository(probe)).toEqual({
      status: "not-a-repository",
    });
  });

  test("reports bare repositories as unsupported instead of no-repository", () => {
    const bare = path.join(tmpRoot, "holder.git");
    git(tmpRoot, `init -q --bare -b main ${JSON.stringify(bare)}`);
    const resolution = resolveGitRepository(bare);
    expect(resolution.status).toBe("unsupported");
  });

  test("resolves a normal repository", () => {
    const repo = makeRepo(tmpRoot, "repo");
    const context = contextOf(repo);
    expect(context.worktreeRoot).toBe(repo);
    expect(context.commonGitDir).toBe(path.join(repo, ".git"));
    expect(context.effectiveHooksDir).toBe(path.join(repo, ".git", "hooks"));
    expect(context.isLinkedWorktree).toBe(false);
    expect(context.primaryWorktreeRoot).toBe(repo);
    expect(context.hooksPathConfig).toBeNull();
  });

  test("resolves identically from a subdirectory", () => {
    const repo = makeRepo(tmpRoot, "repo");
    const sub = path.join(repo, "sub", "deep");
    mkdirSync(sub, { recursive: true });
    const context = contextOf(sub);
    expect(context.worktreeRoot).toBe(repo);
    expect(context.effectiveHooksDir).toBe(path.join(repo, ".git", "hooks"));
  });

  test("resolves a linked worktree to the common hooks directory", () => {
    const primary = makeRepo(tmpRoot, "primary");
    const linked = path.join(tmpRoot, "linked");
    git(primary, `worktree add -q -b feature ${JSON.stringify(linked)}`);
    const context = contextOf(linked);
    expect(context.worktreeRoot).toBe(linked);
    expect(context.isLinkedWorktree).toBe(true);
    expect(context.commonGitDir).toBe(path.join(primary, ".git"));
    expect(context.effectiveHooksDir).toBe(path.join(primary, ".git", "hooks"));
    expect(context.primaryWorktreeRoot).toBe(primary);
  });

  test("does not derive a primary checkout for a worktree of a bare repository", () => {
    const bare = path.join(tmpRoot, "holder.git");
    git(tmpRoot, `init -q --bare -b main ${JSON.stringify(bare)}`);
    const seed = makeRepo(tmpRoot, "seed");
    git(seed, `remote add origin ${JSON.stringify(bare)}`);
    git(seed, "push -q origin main");
    const linked = path.join(tmpRoot, "from-bare");
    git(bare, `worktree add -q -b feature ${JSON.stringify(linked)}`);
    const context = contextOf(linked);
    expect(context.isLinkedWorktree).toBe(true);
    expect(context.commonGitDir).toBe(bare);
    // dirname(bare) is a holder directory, not a checkout.
    expect(context.primaryWorktreeRoot).toBeNull();
  });

  test("reports the effective hooks dir for a configured core.hooksPath", () => {
    const repo = makeRepo(tmpRoot, "repo");
    git(repo, "config core.hooksPath .githooks");
    const context = contextOf(repo);
    expect(context.hooksPathConfig).toBe(".githooks");
    expect(context.hooksPathOrigin).toContain("config");
    expect(context.effectiveHooksDir).toBe(path.join(repo, ".githooks"));
  });

  test("sees a changed core.hooksPath in the same process", () => {
    const repo = makeRepo(tmpRoot, "repo");
    expect(contextOf(repo).hooksPathConfig).toBeNull();
    git(repo, "config core.hooksPath .githooks");
    const refreshed = contextOf(repo);
    expect(refreshed.hooksPathConfig).toBe(".githooks");
    expect(refreshed.effectiveHooksDir).toBe(path.join(repo, ".githooks"));
  });

  test("handles spaces in repository paths", () => {
    const spaced = path.join(tmpRoot, "spa ce");
    mkdirSync(spaced, { recursive: true });
    const repo = makeRepo(spaced, "repo");
    const context = contextOf(repo);
    expect(context.worktreeRoot).toBe(repo);
    expect(context.effectiveHooksDir).toBe(path.join(repo, ".git", "hooks"));
    expect(existsSync(repo)).toBe(true);
  });

  test("reports an unrelated global core.hooksPath from the ambient config", () => {
    // Proves the lifecycle isolation binds the resolver: the ambient global
    // config set by beforeEach is what the resolver reads, so writing an
    // unrelated hooksPath into it must surface in the resolution.
    writeFileSync(
      globalConfigPath,
      "[core]\n\thooksPath = /kibi-unrelated-global-hooks\n",
      "utf8",
    );
    const repo = makeRepo(tmpRoot, "repo");
    const context = contextOf(repo);
    expect(context.hooksPathConfig).toBe("/kibi-unrelated-global-hooks");
    expect(context.effectiveHooksDir).toBe("/kibi-unrelated-global-hooks");
    expect(context.hooksPathOrigin).toContain(
      path.basename(globalConfigPath),
    );
  });

  test("reports git-refused when the .git directory is unreadable", () => {
    const repo = makeRepo(tmpRoot, "locked");
    chmodSync(path.join(repo, ".git"), 0o000);
    try {
      const resolution = resolveGitRepository(repo);
      // Git's generic "not a git repository" fatal for an unreadable .git
      // must become a refusal, not a standalone-directory verdict.
      expect(resolution.status).toBe("git-refused");
      if (resolution.status === "git-refused") {
        expect(resolution.reason).toContain("cannot be read");
        expect(resolution.reason).toContain(path.join(repo, ".git"));
      }
    } finally {
      chmodSync(path.join(repo, ".git"), 0o755);
    }
  });

  test("reports git-refused for dubious ownership instead of no-repository", () => {
    // A PATH shim stands in for a git that refuses the repository the way
    // ownership checks do; the resolver must refuse, not fall back.
    const shimDir = mkdtempSync(path.join(os.tmpdir(), "kibi-git-shim-"));
    writeFileSync(
      path.join(shimDir, "git"),
      '#!/bin/sh\nif [ "$1" = "--version" ]; then echo "git version 2.45.0"; exit 0; fi\n'
        + 'echo "fatal: detected dubious ownership in repository at \'$PWD\'" >&2\nexit 128\n',
      { mode: 0o755 },
    );
    const previousPath = process.env.PATH;
    process.env.PATH = `${shimDir}${path.delimiter}${previousPath ?? ""}`;
    envRestores.push(() => {
      if (previousPath === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = previousPath;
      }
    });
    try {
      const probe = mkdirSync(path.join(tmpRoot, "owned-by-other"), {
        recursive: true,
      });
      const resolution = resolveGitRepository(probe);
      expect(resolution.status).toBe("git-refused");
      if (resolution.status === "git-refused") {
        expect(resolution.reason).toContain("dubious ownership");
      }
    } finally {
      rmSync(shimDir, { recursive: true, force: true });
    }
  });
});
