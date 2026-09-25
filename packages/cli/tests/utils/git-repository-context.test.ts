import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync as nodeExecSync } from "node:child_process";
import { resolveGitRepositoryContext } from "../../src/utils/git-repository-context.js";

// executable_for TEST-git-hook-effective-install
function git(cwd: string, args: string): void {
  nodeExecSync(`git ${args}`, { cwd, stdio: "ignore" });
}

function makeRepo(addCommit = true): string {
  const repo = mkdtempSync(path.join(os.tmpdir(), "kibi-git-context-"));
  git(repo, "init -q -b main");
  git(repo, "config user.email test@test.com");
  git(repo, "config user.name Test User");
  if (addCommit) {
    writeFileSync(path.join(repo, "README.md"), "# test\n");
    git(repo, "add README.md");
    git(repo, "commit -qm init");
  }
  return repo;
}

describe("resolveGitRepositoryContext", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-git-context-root-"));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("returns null outside a repository", () => {
    expect(resolveGitRepositoryContext(tmpRoot)).toBeNull();
  });

  test("resolves a normal repository", () => {
    const repo = makeRepo();
    const context = resolveGitRepositoryContext(repo);
    expect(context).not.toBeNull();
    expect(context?.worktreeRoot).toBe(repo);
    expect(context?.commonGitDir).toBe(path.join(repo, ".git"));
    expect(context?.effectiveHooksDir).toBe(path.join(repo, ".git", "hooks"));
    expect(context?.isLinkedWorktree).toBe(false);
    expect(context?.primaryWorktreeRoot).toBe(repo);
    expect(context?.hooksPathConfig).toBeNull();
  });

  test("resolves identically from a subdirectory", () => {
    const repo = makeRepo();
    const sub = path.join(repo, "sub", "deep");
    mkdirSync(sub, { recursive: true });
    const context = resolveGitRepositoryContext(sub);
    expect(context?.worktreeRoot).toBe(repo);
    expect(context?.effectiveHooksDir).toBe(path.join(repo, ".git", "hooks"));
  });

  test("resolves a linked worktree to the common hooks directory", () => {
    const primary = makeRepo();
    const linked = path.join(tmpRoot, "linked");
    git(primary, `worktree add -q -b feature ${JSON.stringify(linked)}`);
    const context = resolveGitRepositoryContext(linked);
    expect(context?.worktreeRoot).toBe(linked);
    expect(context?.isLinkedWorktree).toBe(true);
    expect(context?.commonGitDir).toBe(path.join(primary, ".git"));
    expect(context?.effectiveHooksDir).toBe(
      path.join(primary, ".git", "hooks"),
    );
    expect(context?.primaryWorktreeRoot).toBe(primary);
  });

  test("reports the effective hooks dir for a configured core.hooksPath", () => {
    const repo = makeRepo();
    git(repo, "config core.hooksPath .githooks");
    const context = resolveGitRepositoryContext(repo);
    expect(context?.hooksPathConfig).toBe(".githooks");
    expect(context?.hooksPathOrigin).toContain("config");
    expect(context?.effectiveHooksDir).toBe(path.join(repo, ".githooks"));
  });

  test("does not derive a primary checkout for a bare repository", () => {
    const bare = path.join(tmpRoot, "bare.git");
    git(tmpRoot, `init -q --bare ${JSON.stringify(bare)}`);
    const context = resolveGitRepositoryContext(bare);
    // A bare repo has no working tree; --show-toplevel is empty and we must
    // reject it instead of guessing paths.
    expect(context).toBeNull();
  });

  test("handles spaces in repository paths", () => {
    const spaced = path.join(tmpRoot, "spa ce");
    mkdirSync(spaced, { recursive: true });
    const repo = path.join(spaced, "repo");
    git(spaced, `init -q -b main ${JSON.stringify(repo)}`);
    git(repo, "config user.email test@test.com");
    git(repo, "config user.name Test User");
    const context = resolveGitRepositoryContext(repo);
    expect(context?.worktreeRoot).toBe(repo);
    expect(context?.effectiveHooksDir).toBe(path.join(repo, ".git", "hooks"));
    expect(existsSync(repo)).toBe(true);
  });
});
