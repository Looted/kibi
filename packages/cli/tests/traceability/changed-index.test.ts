import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  prepareChangedIndex,
  withChangedIndex,
} from "../../src/traceability/changed-index.js";

let root: string;
const gitEnv = () => {
  const { GIT_INDEX_FILE: _ignored, ...env } = process.env;
  return env;
};
const git = (args: string[], env: NodeJS.ProcessEnv = gitEnv()) =>
  execFileSync("git", args, { cwd: root, env, encoding: "utf8" });
const write = (file: string, text: string) => {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), text);
};
/** The paths a commit from `index` would change against HEAD. */
const changedIn = (index?: string) =>
  git(
    ["diff", "--cached", "--name-status", "HEAD"],
    index === undefined ? gitEnv() : { ...gitEnv(), GIT_INDEX_FILE: index },
  )
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "kibi-changed-index-"));
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.email", "t@example.com"]);
  git(["config", "user.name", "T"]);
  write("a.ts", "export const a = 1;\n");
  write("b.ts", "export const b = 1;\n");
  write("gone.ts", "export const gone = 1;\n");
  write(".gitignore", "ignored.ts\n");
  write(".kb/requirements/REQ-a.md", "a\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "base"]);
  // Staged, unstaged, untracked, deleted and ignored changes.
  write("a.ts", "export const a = 2;\n");
  git(["add", "a.ts"]);
  write("b.ts", "export const b = 2;\n");
  write("new.ts", "export const n = 1;\n");
  rmSync(path.join(root, "gone.ts"));
  write("ignored.ts", "x\n");
  write(".kb/requirements/REQ-a.md", "b\n");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("prepareChangedIndex", () => {
  test("holds every working-tree change over the index and leaves the real index alone", () => {
    const changed = prepareChangedIndex(root);
    try {
      expect(path.dirname(changed.indexFile)).toBe(path.join(root, ".git"));
      expect(changedIn(changed.indexFile)).toStrictEqual(
        [
          "D\tgone.ts",
          "M\t.kb/requirements/REQ-a.md",
          "M\ta.ts",
          "M\tb.ts",
          "A\tnew.ts",
        ].sort(),
      );
      expect(changedIn()).toStrictEqual(["M\ta.ts"]);
    } finally {
      changed.dispose();
    }
    expect(existsSync(changed.indexFile)).toBe(false);
  });

  test("with paths, adds only those paths and .kb on top of the index", () => {
    const changed = prepareChangedIndex(root, [
      path.join(root, "b.ts"),
      "gone.ts",
      "never-existed.ts",
      "b.ts",
    ]);
    try {
      expect(changedIn(changed.indexFile)).toStrictEqual(
        [
          "D\tgone.ts",
          "M\t.kb/requirements/REQ-a.md",
          "M\ta.ts",
          "M\tb.ts",
        ].sort(),
      );
    } finally {
      changed.dispose();
    }
  });

  test("an empty path list adds the whole working tree", () => {
    const changed = prepareChangedIndex(root, []);
    try {
      expect(changedIn(changed.indexFile)).toContain("A\tnew.ts");
    } finally {
      changed.dispose();
    }
  });

  test("a named directory that was deleted records the deletion of its files", () => {
    git(["checkout", "-q", "--", "gone.ts"]);
    write("old/x.ts", "export const x = 1;\n");
    git(["add", "old/x.ts"]);
    git(["commit", "-q", "-m", "old"]);
    rmSync(path.join(root, "old"), { recursive: true });
    const changed = prepareChangedIndex(root, ["old"]);
    try {
      expect(changedIn(changed.indexFile)).toContain("D\told/x.ts");
      expect(changedIn(changed.indexFile)).not.toContain("D\tgone.ts");
    } finally {
      changed.dispose();
    }
  });

  test("dispose removes the scratch index and its lock, and may run twice", () => {
    const changed = prepareChangedIndex(root);
    writeFileSync(`${changed.indexFile}.lock`, "");
    changed.dispose();
    expect(existsSync(changed.indexFile)).toBe(false);
    expect(existsSync(`${changed.indexFile}.lock`)).toBe(false);
    expect(() => changed.dispose()).not.toThrow();
  });

  test("a repository with no index yet gets one holding the working tree", () => {
    rmSync(root, { recursive: true, force: true });
    root = mkdtempSync(path.join(tmpdir(), "kibi-changed-index-"));
    git(["init", "-q", "-b", "main"]);
    write("first.ts", "export const first = 1;\n");
    expect(existsSync(path.join(root, ".git", "index"))).toBe(false);
    const changed = prepareChangedIndex(root);
    try {
      expect(
        git(["ls-files"], { ...gitEnv(), GIT_INDEX_FILE: changed.indexFile }),
      ).toBe("first.ts\n");
      expect(existsSync(path.join(root, ".git", "index"))).toBe(false);
    } finally {
      changed.dispose();
    }
  });

  test("with only paths git cannot add, the index is copied as it is", () => {
    rmSync(path.join(root, ".kb"), { recursive: true });
    git(["rm", "-q", "-r", "--cached", ".kb"]);
    const changed = prepareChangedIndex(root, ["never-existed.ts"]);
    try {
      expect(changedIn(changed.indexFile)).toStrictEqual(changedIn());
    } finally {
      changed.dispose();
    }
  });

  test("ignores an inherited GIT_INDEX_FILE and names a git failure", () => {
    const previous = process.env.GIT_INDEX_FILE;
    process.env.GIT_INDEX_FILE = path.join(root, "elsewhere");
    try {
      const changed = prepareChangedIndex(root);
      expect(changedIn(changed.indexFile)).toContain("A\tnew.ts");
      changed.dispose();
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "GIT_INDEX_FILE");
      else process.env.GIT_INDEX_FILE = previous;
    }
    const files = () => readdirSync(path.join(root, ".git"));
    const before = files();
    expect(() =>
      prepareChangedIndex(root, undefined, (args, options) => {
        if (args[0] === "add") throw new Error("add failed");
        return execFileSync("git", [...args], { ...options, encoding: "utf8" });
      }),
    ).toThrow(
      /^Could not build the index of the working tree's changes: add failed$/,
    );
    expect(files()).toStrictEqual(before);
  });
});

describe("withChangedIndex", () => {
  test("points git at the changed index for the call, then restores it", async () => {
    const previous = process.env.GIT_INDEX_FILE;
    Reflect.deleteProperty(process.env, "GIT_INDEX_FILE");
    try {
      let seen: string | undefined;
      const inside = await withChangedIndex(root, ["new.ts"], async () => {
        seen = process.env.GIT_INDEX_FILE;
        return execFileSync("git", ["diff", "--cached", "--name-only"], {
          cwd: root,
          encoding: "utf8",
        });
      });
      expect(inside.trim().split("\n").sort()).toStrictEqual(
        [".kb/requirements/REQ-a.md", "a.ts", "new.ts"].sort(),
      );
      expect(seen).toBeDefined();
      expect(existsSync(seen as string)).toBe(false);
      expect(process.env.GIT_INDEX_FILE).toBeUndefined();

      process.env.GIT_INDEX_FILE = "/kept";
      await expect(
        withChangedIndex(
          root,
          undefined,
          async () => {
            throw new Error("check failed");
          },
          () => ({ indexFile: "/scratch", dispose: () => {} }),
        ),
      ).rejects.toThrow("check failed");
      expect(process.env.GIT_INDEX_FILE).toBe("/kept");
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "GIT_INDEX_FILE");
      else process.env.GIT_INDEX_FILE = previous;
    }
  });
});
