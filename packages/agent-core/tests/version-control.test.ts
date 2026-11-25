import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  checkoutSessionNote,
  workspaceTelemetryVcs,
  workspaceWithoutGit,
} from "../src/checkout-hooks";
import {
  NO_GIT_UNAVAILABLE_FEATURES,
  findRepositoryMarker,
  noGitAdoptionNotice,
  noGitAdvisory,
} from "../src/version-control";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "kibi-version-control-")),
  );
  roots.push(root);
  return root;
}

function optIn(root: string): void {
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  writeFileSync(path.join(root, ".kb", "manifest.json"), "{}\n");
}

describe("findRepositoryMarker", () => {
  test("finds a .git directory or file at or above the start", () => {
    const root = tempRoot();
    const nested = path.join(root, "a", "b");
    mkdirSync(nested, { recursive: true });
    expect(findRepositoryMarker(nested, {})).toBeNull();
    writeFileSync(path.join(root, "a", ".git"), "gitdir: elsewhere\n");
    expect(findRepositoryMarker(nested, {})).toBe(path.join(root, "a", ".git"));
    mkdirSync(path.join(nested, ".git"));
    expect(findRepositoryMarker(nested, {})).toBe(path.join(nested, ".git"));
  });

  test("stops below a GIT_CEILING_DIRECTORIES entry, as Git does", () => {
    const root = tempRoot();
    const nested = path.join(root, "work", "project");
    mkdirSync(nested, { recursive: true });
    mkdirSync(path.join(root, ".git"));
    expect(findRepositoryMarker(nested, {})).toBe(path.join(root, ".git"));
    const ceiling = { GIT_CEILING_DIRECTORIES: `${path.delimiter}${root}` };
    expect(findRepositoryMarker(nested, ceiling)).toBeNull();
    // The ceiling itself is never searched, but its children are.
    mkdirSync(path.join(root, "work", ".git"));
    expect(findRepositoryMarker(nested, ceiling)).toBe(
      path.join(root, "work", ".git"),
    );
  });

  test.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "counts an entry it cannot inspect as present",
    () => {
      const root = tempRoot();
      const locked = path.join(root, "locked");
      mkdirSync(path.join(locked, "inner"), { recursive: true });
      chmodSync(locked, 0o000);
      try {
        expect(findRepositoryMarker(path.join(locked, "inner"), {})).toBe(
          path.join(locked, "inner", ".git"),
        );
      } finally {
        chmodSync(locked, 0o755);
      }
    },
  );
});

describe("no-Git advisory", () => {
  test("says what works, what is off and how to turn it on", () => {
    expect(noGitAdvisory("not_a_repository")).toBe(
      "No Git repository: Kibi is working without version control in this directory. Search, query, record, upsert, check and sync work on one knowledge store. Off until there is a repository: the commit gate (`kibi check --staged`), Git hooks, impact review and per-branch knowledge. Recommended: run `git init`, then `kibi init`; the knowledge recorded here carries over. Until then, finish a change with `kibi check`.",
    );
  });

  test("asks for Git first when Git is missing, and names KIBI_BRANCH's reach", () => {
    const text = noGitAdvisory("git_unavailable", "local");
    expect(text).toStartWith(
      "Git is not installed (or not on PATH) and this directory has no repository: Kibi is working without version control.",
    );
    expect(text).toContain(
      "Recommended: install Git, run `git init`, then `kibi init`;",
    );
    expect(text).toEndWith(
      "KIBI_BRANCH=local selects this store only in processes that set it; unset it to use this directory's own store.",
    );
  });

  test("names the adopting branch and the follow-ups", () => {
    expect(noGitAdoptionNotice("main", 1)).toBe(
      "Git repository found: the knowledge recorded without Git now belongs to branch 'main' (1 file). Run `kibi init` to install the Git hooks and refresh the agent instructions, then commit .kb/.",
    );
    expect(noGitAdoptionNotice("dev", 3)).toContain("(3 files)");
  });

  test("lists the Git features that are off", () => {
    expect(NO_GIT_UNAVAILABLE_FEATURES).toEqual([
      "commit_gate",
      "git_hooks",
      "impact_review",
      "check_diff",
      "branch_stores",
      "merge_driver",
      "branch_gc",
    ]);
  });
});

describe("checkoutSessionNote", () => {
  const previousCeiling = process.env.GIT_CEILING_DIRECTORIES;
  const previousBranch = process.env.KIBI_BRANCH;
  const previousPath = process.env.PATH;
  afterEach(() => {
    for (const [key, value] of [
      ["GIT_CEILING_DIRECTORIES", previousCeiling],
      ["KIBI_BRANCH", previousBranch],
      ["PATH", previousPath],
    ] as const) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  });

  function outsideGit(): string {
    const root = tempRoot();
    process.env.GIT_CEILING_DIRECTORIES = path.dirname(root);
    return root;
  }

  test("is the no-Git advisory in a Kibi workspace outside Git", () => {
    const root = outsideGit();
    expect(checkoutSessionNote(root)).toBeNull();
    optIn(root);
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    expect(workspaceWithoutGit(root)).toBe("not_a_repository");
    expect(checkoutSessionNote(root)).toBe(noGitAdvisory("not_a_repository"));
    process.env.KIBI_BRANCH = " local ";
    expect(checkoutSessionNote(root)).toBe(
      noGitAdvisory("not_a_repository", "local"),
    );
    process.env.KIBI_BRANCH = " ";
    expect(checkoutSessionNote(root)).toBe(noGitAdvisory("not_a_repository"));
  });

  test("names a missing Git as the reason", () => {
    const root = outsideGit();
    optIn(root);
    process.env.PATH = path.join(root, "no-bin");
    expect(workspaceWithoutGit(root)).toBe("git_unavailable");
  });

  test("telemetry names the workspace's version control", () => {
    const root = outsideGit();
    expect(workspaceTelemetryVcs(root)).toStrictEqual({
      kind: "none",
      reason: "not_a_repository",
    });
    mkdirSync(path.join(root, ".git"));
    expect(workspaceTelemetryVcs(root)).toStrictEqual({ kind: "git" });
  });

  test("never treats a directory with a .git entry as outside Git", () => {
    const root = outsideGit();
    optIn(root);
    mkdirSync(path.join(root, ".git"));
    expect(workspaceWithoutGit(root)).toBeNull();
    expect(checkoutSessionNote(root)).toBeNull();
  });
});
