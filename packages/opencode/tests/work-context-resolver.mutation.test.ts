import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ancestorKbRoots,
  authorityRootFromLinkedGitDir,
  resolveBranch,
  resolveWorkContext,
} from "../src/work-context-resolver";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function tmp(): string {
  const dir = fs.realpathSync.native(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-wcr-")),
  );
  dirs.push(dir);
  return dir;
}

function write(file: string, content = ""): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

function mkdir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function kb(root: string): void {
  write(path.join(root, ".kb", "manifest.json"), "{}");
}

/** A main checkout at `root` with HEAD on `main`. */
function mainRepo(root: string, head = "ref: refs/heads/main\n"): string {
  write(path.join(root, ".git", "HEAD"), head);
  return root;
}

function context(dir: string, filePath?: string, inputDirectory = dir) {
  return resolveWorkContext({
    inputDirectory,
    inputWorktree: dir,
    ...(filePath ? { filePath } : {}),
  });
}

describe("resolveBranch", () => {
  function branchOf(head: string | undefined): string {
    const gitDir = mkdir(path.join(tmp(), ".git"));
    if (head !== undefined) write(path.join(gitDir, "HEAD"), head);
    return resolveBranch({
      worktreeRoot: path.dirname(gitDir),
      gitDir,
      commonGitDir: gitDir,
      isLinkedWorktree: false,
    });
  }

  test.each([
    ["ref: refs/heads/main\nsecond line", "main"],
    ["ref: refs/heads/main\r\nsecond line", "main"],
    ["  ref:refs/heads/feat/x  ", "feat/x"],
    ["ref: refs/heads/", ""],
    ["abc123", "HEAD"],
    ["ref: refs/tags/v1", "HEAD"],
    ["xref: refs/heads/main", "HEAD"],
    ["", "unknown"],
    ["\n", "unknown"],
  ])("HEAD %p -> %p", (head, expected) => {
    expect(branchOf(head)).toBe(expected);
  });

  test("a missing HEAD or no git is unknown", () => {
    expect(branchOf(undefined)).toBe("unknown");
    expect(resolveBranch(null)).toBe("unknown");
  });
});

describe("authorityRootFromLinkedGitDir", () => {
  test("cuts at the .git/worktrees marker", () => {
    expect(authorityRootFromLinkedGitDir("/m/.git/worktrees/x")).toBe("/m");
    expect(authorityRootFromLinkedGitDir("/.git/worktrees/x")).toBe("");
    expect(authorityRootFromLinkedGitDir("/m/x")).toBeNull();
  });
});

describe("ancestorKbRoots", () => {
  test("lists every ancestor with a KB manifest, nearest first", () => {
    const a = tmp();
    const b = path.join(a, "b");
    kb(a);
    kb(b);
    mkdir(path.join(b, "c"));
    write(path.join(b, "c", "manifest.json"), "{}");
    expect(ancestorKbRoots(path.join(b, "c"))).toStrictEqual([b, a]);
  });
});

describe("git discovery", () => {
  test("a file in a nested repository resolves to that repository", () => {
    const root = mainRepo(tmp());
    const inner = mainRepo(
      path.join(root, "sub", "inner"),
      "ref: refs/heads/inner\n",
    );
    const file = write(path.join(inner, "deep", "x.ts"));
    const result = context(root, file);
    expect(result.worktreeRoot).toBe(inner);
    expect(result.branch).toBe("inner");
    expect(result.repoRelativePath).toBe("deep/x.ts");
  });

  test("the search never leaves the declared root", () => {
    const parent = mainRepo(tmp());
    const child = mkdir(path.join(parent, "child"));
    const result = context(child, write(path.join(child, "a.ts")));
    expect(result.worktreeRoot).toBe(child);
    expect(result.branch).toBe("unknown");
    expect(result.isLinkedWorktree).toBe(false);
  });

  test("a file that does not exist yet searches from its directory", () => {
    const root = mainRepo(tmp());
    const result = context(root, path.join(root, "src", "new.ts"));
    expect(result.worktreeRoot).toBe(root);
    expect(result.repoRelativePath).toBe("src/new.ts");
  });

  test("a file outside the declared root searches its own ancestors", () => {
    const root = mainRepo(tmp());
    const other = mainRepo(tmp(), "ref: refs/heads/other\n");
    const result = context(root, write(path.join(other, "src", "x.ts")));
    expect(result.worktreeRoot).toBe(other);
    expect(result.branch).toBe("other");
  });

  test.each(["", "gitdir:   ", "not a gitdir line"])(
    "a .git file %p is not a worktree link",
    (content) => {
      const parent = mainRepo(tmp());
      const worktree = mkdir(path.join(parent, "w"));
      write(path.join(worktree, ".git"), content);
      const result = context(parent, write(path.join(worktree, "a.ts")));
      expect(result.worktreeRoot).toBe(parent);
      expect(result.isLinkedWorktree).toBe(false);
    },
  );
});

describe("linked worktrees", () => {
  /** A main repo M and a linked worktree W whose git dir sits under M/.git/worktrees. */
  function linked() {
    const main = mainRepo(tmp());
    const gitDir = path.join(main, ".git", "worktrees", "wt");
    write(path.join(gitDir, "HEAD"), "ref: refs/heads/feature\n");
    write(path.join(gitDir, "commondir"), "../..\n");
    const worktree = tmp();
    write(path.join(worktree, ".git"), `gitdir: ${gitDir}\n`);
    return { main, gitDir, worktree };
  }

  test("resolve to the main checkout as Kibi authority", () => {
    const { main, worktree } = linked();
    kb(main);
    const result = context(worktree);
    expect(result.worktreeRoot).toBe(worktree);
    expect(result.kibiAuthorityRoot).toBe(main);
    expect(result.branch).toBe("feature");
    expect(result.isLinkedWorktree).toBe(true);
  });

  test("a relative gitdir resolves against the worktree", () => {
    const { main, gitDir, worktree } = linked();
    kb(main);
    write(
      path.join(worktree, ".git"),
      `gitdir: ${path.relative(worktree, gitDir)}`,
    );
    expect(context(worktree).kibiAuthorityRoot).toBe(main);
  });

  test("commondir alone can name the authority", () => {
    const main = mainRepo(tmp());
    kb(main);
    const elsewhere = tmp();
    const gitDir = path.join(elsewhere, "gitdirs", "wt");
    write(path.join(gitDir, "HEAD"), "ref: refs/heads/feature\n");
    write(path.join(gitDir, "commondir"), path.join(main, ".git"));
    const worktree = tmp();
    write(path.join(worktree, ".git"), `gitdir: ${gitDir}`);
    expect(context(worktree).kibiAuthorityRoot).toBe(main);
  });

  test("a relative commondir resolves against the git dir", () => {
    const main = mainRepo(tmp());
    kb(main);
    const gitDir = path.join(tmp(), "wt");
    write(path.join(gitDir, "HEAD"), "ref: refs/heads/feature\n");
    write(
      path.join(gitDir, "commondir"),
      path.relative(gitDir, path.join(main, ".git")),
    );
    const worktree = tmp();
    write(path.join(worktree, ".git"), `gitdir: ${gitDir}`);
    expect(context(worktree).kibiAuthorityRoot).toBe(main);
  });

  test("without any KB the first candidate is the authority", () => {
    const { main, worktree } = linked();
    expect(context(worktree).kibiAuthorityRoot).toBe(main);
  });

  test("a KB at the input directory wins when no earlier candidate has one", () => {
    const { worktree } = linked();
    const directory = tmp();
    kb(directory);
    expect(context(worktree, undefined, directory).kibiAuthorityRoot).toBe(
      directory,
    );
  });

  test("only a .kb/manifest.json marks a KB", () => {
    const { main, worktree } = linked();
    write(path.join(worktree, "manifest.json"), "{}");
    expect(context(worktree).kibiAuthorityRoot).toBe(main);
  });

  test("a common git dir not named .git names no authority", () => {
    const gitDir = path.join(tmp(), "wt");
    write(path.join(gitDir, "HEAD"), "ref: refs/heads/feature\n");
    write(path.join(gitDir, "commondir"), path.join(tmp(), "bare.git"));
    const worktree = tmp();
    write(path.join(worktree, ".git"), `gitdir: ${gitDir}`);
    expect(context(worktree).kibiAuthorityRoot).toBe(worktree);
  });

  test("a KB in the worktree itself is found", () => {
    const { worktree } = linked();
    kb(worktree);
    expect(context(worktree).kibiAuthorityRoot).toBe(worktree);
  });
});

describe("authority and posture", () => {
  test("a main checkout is its own authority even below another KB", () => {
    const outer = tmp();
    kb(outer);
    const root = mainRepo(path.join(outer, "repo"));
    expect(context(root).kibiAuthorityRoot).toBe(root);
  });

  test("root_active and hybrid postures are authoritative", () => {
    const active = mainRepo(tmp());
    kb(active);
    write(path.join(active, ".kb", "symbols.yaml"), "[]");
    for (const lane of [
      "requirements",
      "scenarios",
      "tests",
      "adr",
      "flags",
      "events",
      "facts",
    ]) {
      mkdir(path.join(active, ".kb", lane));
    }
    expect(context(active)).toMatchObject({
      posture: "root_active",
      isAuthoritative: true,
    });

    const hybrid = mainRepo(tmp());
    kb(hybrid);
    mkdir(path.join(hybrid, "node_modules", "kibi"));
    expect(context(hybrid)).toMatchObject({
      posture: "hybrid_root_plus_vendored",
      isAuthoritative: true,
    });

    const partial = mainRepo(tmp());
    kb(partial);
    expect(context(partial)).toMatchObject({
      posture: "root_partial",
      isAuthoritative: false,
    });
  });
});

describe("ancestorKbRoots manifest check", () => {
  test("a .kb directory without a manifest is no KB root", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-kb-roots-"));
    try {
      fs.mkdirSync(path.join(root, "outer", ".kb"), { recursive: true });
      fs.mkdirSync(path.join(root, "outer", "inner", ".kb"), {
        recursive: true,
      });
      fs.writeFileSync(path.join(root, "outer", ".kb", "manifest.json"), "{}");
      expect(ancestorKbRoots(path.join(root, "outer", "inner"))).toEqual([
        path.join(root, "outer"),
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
