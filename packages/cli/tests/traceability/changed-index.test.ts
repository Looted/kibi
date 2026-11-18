import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
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
  test("sees a same-size edit git would only catch as racily clean", () => {
    // Stat data alone cannot tell this edit apart: same size, same mtime,
    // ctime ignored. Only git's racy-clean rule (a file not older than the
    // index is re-read) finds it, so the scratch index must keep the real
    // index's times.
    git(["config", "core.trustctime", "false"]);
    // An mtime well before the index is written, so git does not smudge
    // the entry as racy when it writes the index now.
    const racy = new Date(Date.now() - 100_000);
    const file = path.join(root, "b.ts");
    utimesSync(file, racy, racy);
    git(["add", "-A"]);
    write("b.ts", "export const b = 3;\n");
    utimesSync(file, racy, racy);
    // The index as if written in the same second as that edit.
    utimesSync(path.join(root, ".git", "index"), racy, racy);
    expect(git(["diff", "--name-only"])).toBe("b.ts\n");
    const changed = prepareChangedIndex(root, ["b.ts"]);
    try {
      expect(
        git(["show", ":b.ts"], {
          ...gitEnv(),
          GIT_INDEX_FILE: changed.indexFile,
        }),
      ).toBe("export const b = 3;\n");
    } finally {
      changed.dispose();
    }
  });

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

  test("a named path that neither exists nor is tracked is refused, not dropped", () => {
    expect(() =>
      prepareChangedIndex(root, ["a.ts", "never-existed.ts", "nor-this.ts"]),
    ).toThrow(
      "never-existed.ts, nor-this.ts are neither in the working tree nor tracked by git, so there is nothing to judge (paths are read from the directory the command runs in).",
    );
    expect(() => prepareChangedIndex(root, ["never-existed.ts"])).toThrow(
      "never-existed.ts is neither in the working tree",
    );
    // A deleted tracked file and a path spelled with "./" are judged.
    const changed = prepareChangedIndex(root, ["gone.ts", "./b.ts"]);
    try {
      expect(changedIn(changed.indexFile)).toContain("D\tgone.ts");
      expect(changedIn(changed.indexFile)).toContain("M\tb.ts");
    } finally {
      changed.dispose();
    }
  });

  test("a named path whose deletion or rename is already staged is judged", () => {
    git(["rm", "-q", "--cached", "gone.ts"]);
    git(["mv", "b.ts", "moved.ts"]);
    const changed = prepareChangedIndex(root, ["gone.ts", "b.ts", "moved.ts"]);
    try {
      const paths = changedIn(changed.indexFile);
      expect(paths).toContain("D\tgone.ts");
      expect(paths).toContain("D\tb.ts");
      expect(paths).toContain("A\tmoved.ts");
    } finally {
      changed.dispose();
    }
    // Before the first commit, a path that is nowhere is still refused.
    rmSync(root, { recursive: true, force: true });
    root = mkdtempSync(path.join(tmpdir(), "kibi-changed-index-"));
    git(["init", "-q", "-b", "main"]);
    write("first.ts", "export const first = 1;\n");
    expect(() => prepareChangedIndex(root, ["never-existed.ts"])).toThrow(
      "never-existed.ts is neither in the working tree",
    );
  });

  test("with only .kb named and no .kb, the index is copied as it is", () => {
    rmSync(path.join(root, ".kb"), { recursive: true });
    git(["rm", "-q", "-r", "--cached", ".kb"]);
    const changed = prepareChangedIndex(root, [".kb"]);
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
