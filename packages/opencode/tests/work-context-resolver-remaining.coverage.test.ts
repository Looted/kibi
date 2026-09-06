import { afterEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ancestorKbRoots,
  authorityRootFromLinkedGitDir,
  nextAncestorDirectory,
  resolveBranch,
  resolveWorkContext,
} from "../src/work-context-resolver.js";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  if (process.exitCode === 1) process.exitCode = 0;
});

function git(cwd: string, command: string): void {
  execSync(`git ${command}`, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

describe("work-context-resolver remaining git walks and detached HEAD", () => {
  test("returns a non-git directory without walking forever", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-work-nongit-"));
    dirs.push(root);
    const context = resolveWorkContext({
      inputDirectory: root,
      inputWorktree: root,
    });
    expect(context.worktreeRoot).toBe(root);
  });

  test("treats a SHA HEAD as detached", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-work-detached-"));
    dirs.push(root);
    git(root, "init -b main");
    git(root, "config user.email kibi-test@example.com");
    git(root, "config user.name Kibi Test");
    writeFileSync(join(root, "README.md"), "ok\n");
    git(root, "add README.md");
    git(root, "commit -m init");
    writeFileSync(
      join(root, ".git", "HEAD"),
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
    );
    const context = resolveWorkContext({
      inputDirectory: root,
      inputWorktree: root,
    });
    expect(context.branch).toBe("HEAD");
  });

  test("walks a nested file in a non-git tree and treats empty HEAD as unknown", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-work-nested-"));
    dirs.push(root);
    mkdirSync(join(root, "nested"), { recursive: true });
    writeFileSync(join(root, "nested", "file.ts"), "export const x = 1;\n");
    const nested = resolveWorkContext({
      inputDirectory: root,
      inputWorktree: root,
      filePath: join(root, "nested", "file.ts"),
    });
    expect(nested.worktreeRoot).toBe(root);

    git(root, "init -b main");
    git(root, "config user.email kibi-test@example.com");
    git(root, "config user.name Kibi Test");
    writeFileSync(join(root, "README.md"), "ok\n");
    git(root, "add README.md");
    git(root, "commit -m init");
    writeFileSync(join(root, ".git", "HEAD"), "\n");
    const emptyHead = resolveWorkContext({
      inputDirectory: root,
      inputWorktree: root,
    });
    expect(emptyHead.branch).toBe("unknown");
  });

  test("authorityRootFromLinkedGitDir, ancestorKbRoots, and resolveBranch leftovers", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-work-helpers-"));
    dirs.push(root);
    mkdirSync(join(root, ".kb"), { recursive: true });
    writeFileSync(join(root, ".kb", "manifest.json"), "{}\n");
    expect(authorityRootFromLinkedGitDir(join(root, "custom-git"))).toBeNull();
    expect(
      authorityRootFromLinkedGitDir(
        join(root, ".git", "worktrees", "feature"),
      ),
    ).toBe(root);
    expect(ancestorKbRoots(join(root, "nested", "deeper"))).toContain(root);
    expect(nextAncestorDirectory("/")).toBeUndefined();
    expect(nextAncestorDirectory(join(root, "nested"))).toBe(root);
    expect(resolveBranch(null)).toBe("unknown");
    expect(
      resolveBranch({
        worktreeRoot: root,
        gitDir: join(root, "missing-git"),
        commonGitDir: join(root, "missing-git"),
        isLinkedWorktree: false,
      }),
    ).toBe("unknown");
  });
});
