import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
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
  const {
    GIT_INDEX_FILE: _ignoredIndex,
    GIT_OBJECT_DIRECTORY: _ignoredObj,
    GIT_ALTERNATE_OBJECT_DIRECTORIES: _ignoredAlt,
    ...env
  } = process.env;
  return env;
};
const git = (args: string[], env: NodeJS.ProcessEnv = gitEnv()) =>
  execFileSync("git", args, { cwd: root, env, encoding: "utf8" });
const write = (file: string, text: string) => {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), text);
};
/** Recursively adds or removes write bits so tests can exercise a read-only `.git`. */
function setWritableRecursive(target: string, writable: boolean): void {
  if (!existsSync(target)) return;
  const stat = statSync(target);
  if (stat.isDirectory()) {
    if (writable) chmodSync(target, stat.mode | 0o200);
    for (const entry of readdirSync(target)) {
      setWritableRecursive(path.join(target, entry), writable);
    }
    if (!writable) chmodSync(target, stat.mode & ~0o222);
  } else {
    chmodSync(target, writable ? stat.mode | 0o200 : stat.mode & ~0o222);
  }
}
/**
 * Whether removing write bits really stops this process from writing. It
 * does not for root (or any process with CAP_DAC_OVERRIDE), so the tests
 * that need a genuinely read-only `.git` skip there; the simulated
 * EROFS/EACCES/EPERM test still covers the fallback.
 */
const readOnlyEnforced = (() => {
  const probe = mkdtempSync(path.join(tmpdir(), "kibi-ro-probe-"));
  try {
    chmodSync(probe, 0o500);
    try {
      writeFileSync(path.join(probe, "write-test"), "");
      return false;
    } catch {
      return true;
    }
  } finally {
    chmodSync(probe, 0o700);
    rmSync(probe, { recursive: true, force: true });
  }
})();
/** The paths a commit from `index` would change against HEAD. */
const changedIn = (
  index?: string,
  extraEnv?: Readonly<Record<string, string>>,
) =>
  git(
    ["diff", "--cached", "--name-status", "HEAD"],
    index === undefined
      ? gitEnv()
      : { ...gitEnv(), ...extraEnv, GIT_INDEX_FILE: index },
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
  setWritableRecursive(path.join(root, ".git"), true);
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
      expect(changed.env).toBeUndefined();
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

  test.skipIf(!readOnlyEnforced)(
    "falls back to a temp directory when .git is read-only",
    () => {
      const gitDir = path.join(root, ".git");
      const before = readdirSync(gitDir);
      setWritableRecursive(gitDir, false);
      const changed = prepareChangedIndex(root);
      const tempDir = path.dirname(changed.indexFile);
      try {
        expect(tempDir).not.toBe(gitDir);
        expect(changed.env).toBeDefined();
        expect(changed.env?.GIT_OBJECT_DIRECTORY).toBe(
          path.join(tempDir, "objects"),
        );
        expect(changed.env?.GIT_ALTERNATE_OBJECT_DIRECTORIES).toBe(
          path.join(gitDir, "objects"),
        );
        expect(changedIn(changed.indexFile, changed.env)).toStrictEqual(
          [
            "D\tgone.ts",
            "M\t.kb/requirements/REQ-a.md",
            "M\ta.ts",
            "M\tb.ts",
            "A\tnew.ts",
          ].sort(),
        );
        const env = {
          ...gitEnv(),
          ...changed.env,
          GIT_INDEX_FILE: changed.indexFile,
        };
        expect(git(["show", ":b.ts"], env)).toBe("export const b = 2;\n");
        expect(git(["show", ":new.ts"], env)).toBe("export const n = 1;\n");
        expect(git(["write-tree"], env).trim()).toMatch(/^[a-f0-9]{40,64}$/);
      } finally {
        changed.dispose();
      }
      expect(existsSync(tempDir)).toBe(false);
      expect(() => changed.dispose()).not.toThrow();
      setWritableRecursive(gitDir, true);
      expect(readdirSync(gitDir)).toStrictEqual(before);
      expect(changedIn()).toStrictEqual(["M\ta.ts"]);
    },
  );

  test.skipIf(!readOnlyEnforced)(
    "falls back to a temp directory with split-index when .git is read-only",
    () => {
      const gitDir = path.join(root, ".git");
      git(["update-index", "--split-index"]);
      write("a.ts", "export const a = 3;\n");
      git(["add", "a.ts"]);
      expect(
        readdirSync(gitDir).some((entry) => entry.startsWith("sharedindex.")),
      ).toBe(true);
      setWritableRecursive(gitDir, false);

      const changed = prepareChangedIndex(root);
      const tempDir = path.dirname(changed.indexFile);
      try {
        const env = {
          ...gitEnv(),
          ...changed.env,
          GIT_INDEX_FILE: changed.indexFile,
        };
        expect(changedIn(changed.indexFile, changed.env)).toStrictEqual(
          [
            "D\tgone.ts",
            "M\t.kb/requirements/REQ-a.md",
            "M\ta.ts",
            "M\tb.ts",
            "A\tnew.ts",
          ].sort(),
        );
        expect(git(["show", ":a.ts"], env)).toBe("export const a = 3;\n");
        expect(git(["show", ":new.ts"], env)).toBe("export const n = 1;\n");
        expect(git(["write-tree"], env).trim()).toMatch(/^[a-f0-9]{40,64}$/);
      } finally {
        changed.dispose();
      }
      expect(existsSync(tempDir)).toBe(false);
    },
  );

  test.skipIf(!readOnlyEnforced)(
    "falls back when unborn .git or .git/objects is read-only",
    () => {
      // Writable .git/ with read-only .git/objects: copy succeeds, git add fails.
      const gitDir = path.join(root, ".git");
      const before = readdirSync(gitDir);
      setWritableRecursive(path.join(gitDir, "objects"), false);
      const objectsReadOnly = prepareChangedIndex(root);
      const objectsTempDir = path.dirname(objectsReadOnly.indexFile);
      try {
        expect(readdirSync(gitDir)).toStrictEqual(before);
        expect(
          changedIn(objectsReadOnly.indexFile, objectsReadOnly.env),
        ).toContain("A\tnew.ts");
        expect(
          git(["show", ":new.ts"], {
            ...gitEnv(),
            ...objectsReadOnly.env,
            GIT_INDEX_FILE: objectsReadOnly.indexFile,
          }),
        ).toBe("export const n = 1;\n");
      } finally {
        objectsReadOnly.dispose();
      }
      expect(existsSync(objectsTempDir)).toBe(false);

      // Unborn repository with read-only .git (no .git/index to copy).
      setWritableRecursive(gitDir, true);
      rmSync(root, { recursive: true, force: true });
      root = mkdtempSync(path.join(tmpdir(), "kibi-changed-index-"));
      git(["init", "-q", "-b", "main"]);
      write("first.ts", "export const first = 1;\n");
      setWritableRecursive(path.join(root, ".git"), false);
      const unborn = prepareChangedIndex(root);
      const unbornTempDir = path.dirname(unborn.indexFile);
      try {
        const env = {
          ...gitEnv(),
          ...unborn.env,
          GIT_INDEX_FILE: unborn.indexFile,
        };
        expect(git(["ls-files"], env)).toBe("first.ts\n");
        expect(git(["show", ":first.ts"], env)).toBe(
          "export const first = 1;\n",
        );
      } finally {
        unborn.dispose();
      }
      expect(existsSync(unbornTempDir)).toBe(false);
    },
  );

  test("falls back on simulated EROFS, EACCES and EPERM, preserves alternates, and cleans up on failure", () => {
    const gitDir = path.join(root, ".git");
    const before = readdirSync(gitDir);
    const existingAlt = mkdtempSync(path.join(tmpdir(), "kibi-existing-alt-"));
    const previousAlt = process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES;
    const previousObj = process.env.GIT_OBJECT_DIRECTORY;
    process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES = existingAlt;
    try {
      for (const code of ["EROFS", "EACCES", "EPERM"] as const) {
        const changed = prepareChangedIndex(
          root,
          undefined,
          (args, options) => {
            if (args[0] === "add") {
              throw Object.assign(new Error(`${code}: simulated`), { code });
            }
            return execFileSync("git", [...args], {
              ...options,
              encoding: "utf8",
            });
          },
        );
        const tempDir = path.dirname(changed.indexFile);
        try {
          expect(tempDir).not.toBe(gitDir);
          expect(readdirSync(gitDir)).toStrictEqual(before);
          expect(changed.env?.GIT_ALTERNATE_OBJECT_DIRECTORIES).toBe(
            `${path.join(gitDir, "objects")}${path.delimiter}${existingAlt}`,
          );
          expect(changedIn(changed.indexFile, changed.env)).toContain(
            "A\tnew.ts",
          );
        } finally {
          changed.dispose();
        }
        expect(existsSync(tempDir)).toBe(false);
      }

      // Inherited GIT_OBJECT_DIRECTORY is preserved in alternates alongside existing alternates.
      process.env.GIT_OBJECT_DIRECTORY = path.join(gitDir, "objects");
      const withObjEnv = prepareChangedIndex(
        root,
        undefined,
        (args, options) => {
          if (args[0] === "add") {
            throw Object.assign(new Error("git failed"), {
              stderr: Buffer.from("fatal: Read-only file system\n"),
            });
          }
          return execFileSync("git", [...args], {
            ...options,
            encoding: "utf8",
          });
        },
      );
      try {
        expect(withObjEnv.env?.GIT_ALTERNATE_OBJECT_DIRECTORIES).toBe(
          `${path.join(gitDir, "objects")}${path.delimiter}${existingAlt}`,
        );
      } finally {
        withObjEnv.dispose();
      }
    } finally {
      if (previousAlt === undefined)
        Reflect.deleteProperty(process.env, "GIT_ALTERNATE_OBJECT_DIRECTORIES");
      else process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES = previousAlt;
      if (previousObj === undefined)
        Reflect.deleteProperty(process.env, "GIT_OBJECT_DIRECTORY");
      else process.env.GIT_OBJECT_DIRECTORY = previousObj;
      rmSync(existingAlt, { recursive: true, force: true });
    }

    let seenFallbackTempDir: string | undefined;
    expect(() =>
      prepareChangedIndex(root, undefined, (args, options) => {
        if (args[0] === "add") {
          throw Object.assign(new Error("EROFS: read-only"), { code: "EROFS" });
        }
        if (args[0] === "-c") {
          seenFallbackTempDir = path.dirname(
            options.env.GIT_INDEX_FILE as string,
          );
          throw new Error("disk full");
        }
        return execFileSync("git", [...args], { ...options, encoding: "utf8" });
      }),
    ).toThrow(
      /^Could not build the index of the working tree's changes: disk full$/,
    );
    expect(seenFallbackTempDir).toBeDefined();
    expect(existsSync(seenFallbackTempDir as string)).toBe(false);
    expect(readdirSync(gitDir)).toStrictEqual(before);
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

  test.skipIf(!readOnlyEnforced)(
    "applies and restores fallback env vars when .git is read-only",
    async () => {
      const saved = {
        GIT_INDEX_FILE: process.env.GIT_INDEX_FILE,
        GIT_OBJECT_DIRECTORY: process.env.GIT_OBJECT_DIRECTORY,
        GIT_ALTERNATE_OBJECT_DIRECTORIES:
          process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES,
      };
      Reflect.deleteProperty(process.env, "GIT_INDEX_FILE");
      Reflect.deleteProperty(process.env, "GIT_OBJECT_DIRECTORY");
      Reflect.deleteProperty(process.env, "GIT_ALTERNATE_OBJECT_DIRECTORIES");
      setWritableRecursive(path.join(root, ".git"), false);
      try {
        let seenTempDir: string | undefined;
        const result = await withChangedIndex(root, ["new.ts"], async () => {
          seenTempDir = path.dirname(process.env.GIT_INDEX_FILE as string);
          expect(process.env.GIT_OBJECT_DIRECTORY).toBe(
            path.join(seenTempDir, "objects"),
          );
          expect(process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES).toBe(
            path.join(root, ".git", "objects"),
          );
          return {
            diff: execFileSync("git", ["diff", "--cached", "--name-only"], {
              cwd: root,
              encoding: "utf8",
            }),
            blob: execFileSync("git", ["show", ":new.ts"], {
              cwd: root,
              encoding: "utf8",
            }),
          };
        });
        expect(result.diff.trim().split("\n").sort()).toStrictEqual(
          [".kb/requirements/REQ-a.md", "a.ts", "new.ts"].sort(),
        );
        expect(result.blob).toBe("export const n = 1;\n");
        expect(seenTempDir).toBeDefined();
        expect(existsSync(seenTempDir as string)).toBe(false);
        expect(process.env.GIT_INDEX_FILE).toBeUndefined();
        expect(process.env.GIT_OBJECT_DIRECTORY).toBeUndefined();
        expect(process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES).toBeUndefined();

        process.env.GIT_INDEX_FILE = "/kept-index";
        process.env.GIT_OBJECT_DIRECTORY = "/kept-objects";
        process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES = "/kept-alternates";
        await expect(
          withChangedIndex(
            root,
            undefined,
            async () => {
              expect(process.env.GIT_OBJECT_DIRECTORY).toBe("/tmp-objects");
              expect(process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES).toBe(
                "/tmp-alt",
              );
              throw new Error("boom");
            },
            () => ({
              indexFile: "/scratch",
              env: {
                GIT_OBJECT_DIRECTORY: "/tmp-objects",
                GIT_ALTERNATE_OBJECT_DIRECTORIES: "/tmp-alt",
              },
              dispose: () => {},
            }),
          ),
        ).rejects.toThrow("boom");
        expect(process.env.GIT_INDEX_FILE).toBe("/kept-index");
        expect(process.env.GIT_OBJECT_DIRECTORY).toBe("/kept-objects");
        expect(process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES).toBe(
          "/kept-alternates",
        );
      } finally {
        for (const [key, value] of Object.entries(saved)) {
          if (value === undefined) Reflect.deleteProperty(process.env, key);
          else process.env[key] = value;
        }
      }
    },
  );
});
