import { execSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { describe, expect, it } from "bun:test";

import { resolveWorkContext } from "../src/work-context-resolver";

interface TempGitRepo {
  root: string;
  cleanup(): void;
}

function shellQuote(value: string): string {
  return JSON.stringify(value);
}

function git(cwd: string, command: string): string {
  return execSync(`git ${command}`, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function createTempGitRepo(): TempGitRepo {
  const tempRoot = mkdtempSync(join(tmpdir(), "kibi-work-context-"));
  const root = join(tempRoot, "authority");
  mkdirSync(root, { recursive: true });

  git(root, "init -b main");
  git(root, "config user.email kibi-test@example.com");
  git(root, "config user.name Kibi Test");

  writeFileSync(join(root, "README.md"), "# fixture\n");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "src", "tracked.ts"),
    "export const tracked = true;\n",
  );
  git(root, "add README.md src/tracked.ts");
  git(root, "commit -m initial");

  return {
    root,
    cleanup() {
      rmSync(tempRoot, { recursive: true, force: true });
    },
  };
}

function createAuthoritativeKb(root: string): void {
  mkdirSync(join(root, ".kb"), { recursive: true });
  writeFileSync(join(root, ".kb", "config.json"), "{}\n");

  for (const dir of [
    "requirements",
    "scenarios",
    "tests",
    "adr",
    "flags",
    "events",
    "facts",
  ]) {
    mkdirSync(join(root, "documentation", dir), { recursive: true });
  }
  writeFileSync(join(root, "documentation", "symbols.yaml"), "[]\n");
}

function createLinkedWorktree(
  root: string,
  branchName: string,
  target: string,
): void {
  git(root, `worktree add -b ${branchName} ${shellQuote(target)}`);
  expect(statSync(join(target, ".git")).isFile()).toBe(true);
  expect(readFileSync(join(target, ".git"), "utf8").startsWith("gitdir:")).toBe(
    true,
  );
}

describe("resolveWorkContext", () => {
  it("returns authoritative context for a main repository with root Kibi config", () => {
    const repo = createTempGitRepo();
    try {
      createAuthoritativeKb(repo.root);

      const context = resolveWorkContext({
        inputDirectory: repo.root,
        inputWorktree: repo.root,
        sessionId: "session-main",
        agentIdentity: "sisyphus-junior",
      });

      expect(context).toMatchObject({
        worktreeRoot: repo.root,
        kibiAuthorityRoot: repo.root,
        branch: "main",
        repoRelativePath: ".",
        posture: "root_active",
        isAuthoritative: true,
        isLinkedWorktree: false,
        sessionId: "session-main",
        agentIdentity: "sisyphus-junior",
      });
    } finally {
      repo.cleanup();
    }
  });

  it("maps linked git worktrees back to the authoritative Kibi root", () => {
    const repo = createTempGitRepo();
    try {
      createAuthoritativeKb(repo.root);
      const linkedWorktree = join(repo.root, "..", "linked-feature");
      createLinkedWorktree(repo.root, "linked-feature", linkedWorktree);

      const context = resolveWorkContext({
        inputDirectory: repo.root,
        inputWorktree: linkedWorktree,
        filePath: join(linkedWorktree, "src", "tracked.ts"),
      });

      expect(context).toMatchObject({
        worktreeRoot: linkedWorktree,
        kibiAuthorityRoot: repo.root,
        branch: "linked-feature",
        repoRelativePath: "src/tracked.ts",
        posture: "root_active",
        isAuthoritative: true,
        isLinkedWorktree: true,
        agentIdentity: "unknown",
      });
      expect(context.sessionId).toBeUndefined();
    } finally {
      repo.cleanup();
    }
  });

  it("resolves verified .worktrees children under the main repository to the same authority root", () => {
    const repo = createTempGitRepo();
    try {
      createAuthoritativeKb(repo.root);
      const nestedWorktree = join(repo.root, ".worktrees", "nested-feature");
      createLinkedWorktree(repo.root, "nested-feature", nestedWorktree);

      const context = resolveWorkContext({
        inputDirectory: repo.root,
        inputWorktree: nestedWorktree,
      });

      expect(context.worktreeRoot).toBe(nestedWorktree);
      expect(context.kibiAuthorityRoot).toBe(repo.root);
      expect(context.branch).toBe("nested-feature");
      expect(context.repoRelativePath).toBe(".");
      expect(context.isLinkedWorktree).toBe(true);
      expect(context.isAuthoritative).toBe(true);
      expect(context.posture).toBe("root_active");
    } finally {
      repo.cleanup();
    }
  });

  it("reports HEAD for detached linked worktrees without crashing", () => {
    const repo = createTempGitRepo();
    try {
      createAuthoritativeKb(repo.root);
      const detachedWorktree = join(repo.root, "..", "detached-feature");
      git(
        repo.root,
        `worktree add --detach ${shellQuote(detachedWorktree)} HEAD`,
      );

      const context = resolveWorkContext({
        inputDirectory: repo.root,
        inputWorktree: detachedWorktree,
      });

      expect(context.worktreeRoot).toBe(detachedWorktree);
      expect(context.kibiAuthorityRoot).toBe(repo.root);
      expect(context.branch).toBe("HEAD");
      expect(context.isLinkedWorktree).toBe(true);
      expect(context.isAuthoritative).toBe(true);
    } finally {
      repo.cleanup();
    }
  });

  it("returns a graceful non-authoritative context for non-git directories", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-work-context-nongit-"));
    try {
      const filePath = join(root, "notes.md");
      writeFileSync(filePath, "notes\n");

      const context = resolveWorkContext({
        inputDirectory: root,
        inputWorktree: root,
        filePath,
      });

      expect(context).toMatchObject({
        worktreeRoot: root,
        kibiAuthorityRoot: root,
        branch: "unknown",
        repoRelativePath: "notes.md",
        posture: "root_uninitialized",
        isAuthoritative: false,
        isLinkedWorktree: false,
        agentIdentity: "unknown",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not treat vendored-only Kibi trees as authoritative roots", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-work-context-vendored-"));
    try {
      mkdirSync(join(root, "kibi"), { recursive: true });
      writeFileSync(join(root, "kibi", "opencode.json"), "{}\n");

      const context = resolveWorkContext({
        inputDirectory: root,
        inputWorktree: root,
      });

      expect(context.worktreeRoot).toBe(root);
      expect(context.kibiAuthorityRoot).toBe(root);
      expect(context.posture).toBe("vendored_only");
      expect(context.isAuthoritative).toBe(false);
      expect(context.isLinkedWorktree).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses filePath inside a linked worktree before inputWorktree", () => {
    const repo = createTempGitRepo();
    try {
      createAuthoritativeKb(repo.root);
      const linkedWorktree = join(repo.root, "..", "priority-feature");
      createLinkedWorktree(repo.root, "priority-feature", linkedWorktree);
      const linkedFilePath = join(linkedWorktree, "src", "priority.ts");
      writeFileSync(linkedFilePath, "export const priority = true;\n");

      const context = resolveWorkContext({
        inputDirectory: repo.root,
        inputWorktree: repo.root,
        filePath: linkedFilePath,
      });

      expect(context.worktreeRoot).toBe(linkedWorktree);
      expect(context.kibiAuthorityRoot).toBe(repo.root);
      expect(context.branch).toBe("priority-feature");
      expect(context.repoRelativePath).toBe("src/priority.ts");
      expect(context.isLinkedWorktree).toBe(true);
      expect(context.isAuthoritative).toBe(true);
      expect(relative(context.worktreeRoot, linkedFilePath)).toBe(
        join("src", "priority.ts"),
      );
    } finally {
      repo.cleanup();
    }
  });
});
