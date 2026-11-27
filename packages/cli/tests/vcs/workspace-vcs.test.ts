import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { codedErrorOf } from "../../src/cli-errors.js";
import {
  assertGitWorkspace,
  refuseWithoutGit,
} from "../../src/vcs/git-boundary.js";
import {
  gitRequiredMessage,
  probeWorkspaceVcs,
} from "../../src/vcs/workspace-vcs.js";
import {
  cleanup,
  gitRepository,
  hideGit,
  isolateFromRepositories,
  plainDirectory,
} from "./vcs-fixtures.js";

beforeEach(isolateFromRepositories);
afterEach(cleanup);

describe("probeWorkspaceVcs", () => {
  test("a repository is git, with its context", () => {
    const root = gitRepository();
    const vcs = probeWorkspaceVcs(root);
    expect(vcs.kind).toBe("git");
    expect(vcs.kind === "git" && vcs.repository.worktreeRoot).toBe(root);
  });

  test("a directory outside any repository is none", () => {
    expect(probeWorkspaceVcs(plainDirectory())).toStrictEqual({
      kind: "none",
      reason: "not_a_repository",
    });
  });

  test("without Git and without a .git entry it is none because Git is unavailable", () => {
    const root = plainDirectory();
    hideGit();
    expect(probeWorkspaceVcs(root)).toStrictEqual({
      kind: "none",
      reason: "git_unavailable",
    });
  });

  test("a .git entry without Git is unresolved, never none", () => {
    const root = plainDirectory();
    fs.mkdirSync(path.join(root, ".git"));
    hideGit();
    const vcs = probeWorkspaceVcs(root);
    expect(vcs.kind === "unresolved" && vcs.code).toBe("GIT_NOT_AVAILABLE");
  });

  test("a .git entry Git does not accept is an unreadable repository, never none", () => {
    const root = plainDirectory();
    fs.mkdirSync(path.join(root, ".git"));
    const vcs = probeWorkspaceVcs(root);
    expect(vcs.kind === "unresolved" && vcs.code).toBe(
      "GIT_REPOSITORY_UNREADABLE",
    );
    expect(vcs.kind === "unresolved" && vcs.reason).toContain(".git entry");
  });

  test("a workspace directory that does not exist is unresolved, never none", () => {
    const root = path.join(plainDirectory(), "missing");
    expect(probeWorkspaceVcs(root)).toStrictEqual({
      kind: "unresolved",
      code: "BRANCH_UNRESOLVED",
      reason: `The workspace directory ${root} does not exist.`,
    });
  });

  test("a bare repository is unresolved", () => {
    const root = plainDirectory();
    execFileSync("git", ["init", "-q", "--bare", root]);
    const vcs = probeWorkspaceVcs(root);
    expect(vcs).toStrictEqual({
      kind: "unresolved",
      code: "BRANCH_UNRESOLVED",
      reason: "Bare repository: no working tree to attach Kibi to.",
    });
  });
});

describe("gitRequiredMessage", () => {
  test("names what the feature reads, the alternative and how to turn it on", () => {
    expect(gitRequiredMessage("commit_gate", "kibi check --staged")).toBe(
      "kibi check --staged needs a Git repository: it checks the staged snapshot of a commit, and this directory has none. Run `kibi check` to check the knowledge base as it is on disk. To turn it on, run `git init`, then `kibi init`.",
    );
  });

  test("leaves out the alternative when nothing stands in", () => {
    expect(gitRequiredMessage("branch_gc", "kibi gc")).toBe(
      "kibi gc needs a Git repository: it removes the stores of branches Git no longer has, and this directory has none. To turn it on, run `git init`, then `kibi init`.",
    );
  });

  test("every feature names what it reads", () => {
    for (const feature of [
      "generated_check",
      "check_diff",
      "git_hooks",
      "impact_review",
      "change_signoff",
      "branch_stores",
    ] as const) {
      const message = gitRequiredMessage(feature, "op");
      expect(message).toStartWith("op needs a Git repository: it ");
      expect(message).toContain("`kibi ");
      expect(message).toEndWith("run `git init`, then `kibi init`.");
    }
  });
});

describe("the Git boundary", () => {
  test("a repository passes without a refusal", () => {
    const root = gitRepository();
    expect(refuseWithoutGit(root, "branch_gc", "kibi gc")).toBeNull();
    expect(() =>
      assertGitWorkspace(root, "branch_gc", "kibi gc"),
    ).not.toThrow();
  });

  test("a .git entry Git cannot read is left to the command", () => {
    const root = plainDirectory();
    fs.mkdirSync(path.join(root, ".git"));
    expect(refuseWithoutGit(root, "branch_gc", "kibi gc")).toBeNull();
  });

  test("outside a repository the text boundary prints GIT_REQUIRED and exits 1", () => {
    const root = plainDirectory();
    const errors = spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(refuseWithoutGit(root, "branch_gc", "kibi gc")).toStrictEqual({
        exitCode: 1,
      });
      expect(errors.mock.calls).toEqual([
        [`Error [GIT_REQUIRED]: ${gitRequiredMessage("branch_gc", "kibi gc")}`],
      ]);
    } finally {
      errors.mockRestore();
    }
  });

  test("outside a repository the operation boundary throws a coded refusal", () => {
    const root = plainDirectory();
    let thrown: unknown;
    try {
      assertGitWorkspace(root, "impact_review", "kb_prepare_impact_review");
    } catch (error) {
      thrown = error;
    }
    expect(codedErrorOf(thrown)).toStrictEqual({
      code: "GIT_REQUIRED",
      message: gitRequiredMessage("impact_review", "kb_prepare_impact_review"),
      retryable: false,
    });
  });
});
