import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync as nodeExecSync } from "node:child_process";
import {
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

// Fixture git config/env must be fully isolated: ambient global config (for
// example a global core.hooksPath or user identity) would change what the
// resolver reports. Every git invocation in this file goes through here.
let fixtureConfigCounter = 0;

function isolatedGitEnv(): NodeJS.ProcessEnv {
  const globalConfig = path.join(
    os.tmpdir(),
    `kibi-git-context-global-${process.pid}-${fixtureConfigCounter++}.config`,
  );
  writeFileSync(globalConfig, "", "utf8");
  return {
    ...process.env,
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_CONFIG_SYSTEM: os.platform() === "win32" ? "NUL" : "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
}

function git(cwd: string, args: string): void {
  nodeExecSync(`git ${args}`, { cwd, stdio: "ignore", env: isolatedGitEnv() });
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

describe("resolveGitRepository", () => {
  let tmpRoot: string;
  let envRestores: Array<() => void>;

  beforeEach(() => {
    tmpRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-git-context-"));
    envRestores = [];
    for (const key of [
      "GIT_CONFIG_GLOBAL",
      "GIT_CONFIG_SYSTEM",
      "GIT_CONFIG_NOSYSTEM",
    ]) {
      const previous = process.env[key];
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
    for (const restore of envRestores) restore();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

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
});
