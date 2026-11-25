import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  type BranchAttachment,
  NO_GIT_KB_BRANCH,
  resolveBranchAttachment,
} from "../../src/utils/branch-resolver.js";
import { branchStorePath } from "../../src/utils/branch-store-locator.js";
import { noGitStoreAdoptedDiagnostic } from "../../src/vcs/advisory.js";
import {
  adoptNoGitStore,
  takeNoGitAdoption,
} from "../../src/vcs/no-git-adoption.js";
import {
  cleanup,
  isolateFromRepositories,
  plainDirectory,
  write,
} from "./vcs-fixtures.js";

beforeEach(() => {
  isolateFromRepositories();
  takeNoGitAdoption();
});
afterEach(cleanup);

/** A workspace used without Git, with a no-Git store, then `git init`. */
function workspaceThatGotGit(): string {
  const root = plainDirectory("kibi-adopt-");
  write(root, ".kb/requirements/REQ-a.md", "a\n");
  write(root, ".kb/requirements/REQ-tracked.md", "t\n");
  write(root, ".kb/symbols.yaml", "symbols: []\n");
  write(root, ".kb/usage.log", "derived\n");
  const store = branchStorePath(root, NO_GIT_KB_BRANCH);
  write(root, path.relative(root, path.join(store, "branch.json")), "{}");
  execFileSync("git", ["init", "-q", "-b", "main", root]);
  execFileSync("git", ["-C", root, "add", ".kb/requirements/REQ-tracked.md"]);
  return root;
}

function attachment(root: string): BranchAttachment {
  const resolved = resolveBranchAttachment(root);
  if ("error" in resolved) throw new Error(resolved.error);
  return resolved;
}

function receipts(root: string): string[] {
  const dir = path.join(root, ".kb", "recovery", "pending-sources");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")))
    .map((receipt) => `${receipt.path}@${receipt.branch}`)
    .sort();
}

describe("adoptNoGitStore", () => {
  test("seals the untracked sources for the new branch and keeps the old store", () => {
    const root = workspaceThatGotGit();
    const adoption = adoptNoGitStore(root, attachment(root));
    expect(adoption).not.toBeNull();
    const { retiredStorePath, ...rest } = adoption as NonNullable<
      typeof adoption
    >;
    expect(rest).toStrictEqual({
      branch: "main",
      files: 2,
      notice:
        "Git repository found: the knowledge recorded without Git now belongs to branch 'main' (2 files). Run `kibi init` to install the Git hooks and refresh the agent instructions, then commit .kb/.",
    });
    expect(receipts(root)).toEqual([
      ".kb/requirements/REQ-a.md@main",
      ".kb/symbols.yaml@main",
    ]);
    expect(fs.existsSync(branchStorePath(root, NO_GIT_KB_BRANCH))).toBe(false);
    expect(fs.existsSync(path.join(retiredStorePath, "branch.json"))).toBe(
      true,
    );
    const journalDir = path.dirname(retiredStorePath);
    const journals = fs
      .readdirSync(journalDir)
      .filter((name) => name.endsWith(".json"));
    expect(journals).toHaveLength(1);
    expect(
      JSON.parse(
        fs.readFileSync(path.join(journalDir, journals[0] as string), "utf8"),
      ),
    ).toMatchObject({
      version: 1,
      state: "committed",
      branch: "main",
      files: [".kb/requirements/REQ-a.md", ".kb/symbols.yaml"],
      retiredStorePath,
    });
    // A second call finds no store.
    expect(adoptNoGitStore(root, attachment(root))).toBeNull();
  });

  test("reports the adoption on one result only", () => {
    const root = workspaceThatGotGit();
    const adoption = adoptNoGitStore(root, attachment(root));
    expect(noGitStoreAdoptedDiagnostic()).toStrictEqual({
      code: "no_git_store_adopted",
      severity: "info",
      message: adoption?.notice as string,
      detail: {
        branch: "main",
        files: 2,
        retiredStorePath: adoption?.retiredStorePath as string,
        next: "kibi init",
      },
    });
    expect(noGitStoreAdoptedDiagnostic()).toBeUndefined();
  });

  test("does nothing without a no-Git store, outside Git or for a named store", () => {
    const root = workspaceThatGotGit();
    const git = attachment(root);
    expect(
      adoptNoGitStore(root, { ...git, kind: "explicit_override" }),
    ).toBeNull();
    expect(
      adoptNoGitStore(root, {
        ...git,
        noGit: {
          reason: "not_a_repository",
          explicitOverride: false,
          notice: "",
        },
      }),
    ).toBeNull();
    const plain = plainDirectory();
    expect(adoptNoGitStore(plain, git)).toBeNull();
    expect(takeNoGitAdoption()).toBeNull();
    expect(receipts(root)).toEqual([]);
  });

  test("a process that lost the race returns null; any other failure is thrown", () => {
    const root = workspaceThatGotGit();
    const rename = spyOn(fs, "renameSync").mockImplementationOnce(() => {
      throw Object.assign(new Error("gone"), { code: "ENOENT" });
    });
    try {
      expect(adoptNoGitStore(root, attachment(root))).toBeNull();
      rename.mockImplementationOnce(() => {
        throw Object.assign(new Error("denied"), { code: "EACCES" });
      });
      expect(() => adoptNoGitStore(root, attachment(root))).toThrow("denied");
    } finally {
      rename.mockRestore();
    }
  });
});
