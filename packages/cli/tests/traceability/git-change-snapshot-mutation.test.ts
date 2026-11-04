import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  captureDiffSnapshot,
  captureStagedSnapshot,
  mergeResolutionBase,
  renameResolutionBase,
} from "../../src/traceability/git-change-snapshot.js";

const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const initialCwd = process.cwd();
const initialTmp = process.env.TMPDIR;
let sandbox = "";
let indexLog = "";
let loggingBin = "";

// Git calls whose cwd a faulty change dropped must not reach a real checkout,
// and every temporary directory stays inside the sandbox.
beforeAll(() => {
  sandbox = mkdtempSync(path.join(tmpdir(), "kibi-gcs-sandbox-"));
  process.env.TMPDIR = sandbox;
  const scratchCwd = path.join(sandbox, "cwd");
  mkdirSync(scratchCwd);
  process.chdir(scratchCwd);
  loggingBin = path.join(sandbox, "bin");
  mkdirSync(loggingBin);
  indexLog = path.join(sandbox, "index.log");
  writeFileSync(
    path.join(loggingBin, "git"),
    `#!/bin/sh\nif [ -n "$GIT_INDEX_FILE" ]; then echo "$GIT_INDEX_FILE" >> "${indexLog}"; fi\nexec /usr/bin/git "$@"\n`,
  );
  chmodSync(path.join(loggingBin, "git"), 0o755);
});

afterAll(() => {
  process.chdir(initialCwd);
  if (initialTmp === undefined) Reflect.deleteProperty(process.env, "TMPDIR");
  else process.env.TMPDIR = initialTmp;
  rmSync(sandbox, { recursive: true, force: true });
});

/** Runs `action` with a git on PATH that records each scratch index file. */
function scratchIndexes<T>(action: () => T): { result: T; indexes: string[] } {
  writeFileSync(indexLog, "");
  const previous = process.env.PATH;
  process.env.PATH = `${loggingBin}${path.delimiter}${previous}`;
  try {
    const result = action();
    const indexes = readFileSync(indexLog, "utf8").split("\n").filter(Boolean);
    return { result, indexes };
  } finally {
    process.env.PATH = previous;
  }
}

function scratchPattern(prefix: string): RegExp {
  const escaped = sandbox.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}/${prefix}[A-Za-z0-9]{6}/index$`);
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync(
    "git",
    [
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@t",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.autocrlf=false",
      ...args,
    ],
    { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] },
  ).trim();
}

function repo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "kibi-gcs-"));
  git(dir, "init", "-q", "-b", "main");
  return dir;
}

function write(root: string, files: Record<string, string | Buffer>): void {
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

function commit(root: string, files: Record<string, string | Buffer> = {}) {
  write(root, files);
  git(root, "add", "-A");
  git(root, "commit", "-q", "--allow-empty", "-m", "c");
  return git(root, "rev-parse", "HEAD");
}

function remove(root: string, ...files: string[]): void {
  for (const file of files) unlinkSync(path.join(root, file));
}

function blob(root: string, file: string, rev = "HEAD"): string {
  return git(root, "rev-parse", `${rev}:${file}`);
}

type Inventory = ReturnType<typeof captureDiffSnapshot>["inventory"];

function withoutDiff(inventory: Inventory) {
  return inventory.map(({ diffText, ...rest }) => rest);
}

describe("captureDiffSnapshot", () => {
  test("inventories every kind of change between two commits", () => {
    const root = repo();
    const lib = Array.from({ length: 12 }, (_, i) => `line ${i}`).join("\n");
    const base = commit(root, {
      ".gitattributes": "*.bin -diff\n",
      "src/mod.ts": "a\nb\nc\n",
      "src/gone.ts": "x\n",
      "notes.txt": "n1\nn2\nn3\nn4\n",
      "src/lib.ts": `${lib}\n`,
      "bin.dat": Buffer.from([1, 0, 2]),
      "was-bin.txt": Buffer.from([1, 0, 2]),
      "latin.txt": Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x0a]),
      "multi.bin": "1\n2\n",
    });
    write(root, {
      "src/mod.ts": "a\nB\nc\nd\n",
      "docs/notes.txt": "n1\nn2\nn3\nn4\n",
      "src/lib-copy.ts": `${lib}\n`,
      "bin.dat": Buffer.from([1, 0, 3]),
      "was-bin.txt": "text\n",
      "latin.txt": Buffer.from([0x63, 0x61, 0x66, 0xe8, 0x0a]),
      "empty.txt": "",
      "added.bin": "1\r\n2\n3",
      "multi.bin": "1\n2\n3\n",
    });
    remove(root, "src/gone.ts", "notes.txt");
    const head = commit(root);

    const snapshot = captureDiffSnapshot(root, "main~1", "main");
    expect(snapshot.headCommit).toBe(base);
    expect(snapshot.baseTree).toBe(git(root, "rev-parse", `${base}^{tree}`));
    expect(snapshot.headTree).toBe(git(root, "rev-parse", `${head}^{tree}`));
    expect(snapshot.assertUnchanged()).toBeUndefined();
    expect(withoutDiff(snapshot.inventory)).toStrictEqual([
      {
        path: "added.bin",
        status: "A",
        hunkRanges: [{ start: 1, end: 3 }],
        oldHunkRanges: [],
        content: "1\r\n2\n3",
        gitMode: "100644",
        analysisDepth: "file",
        disposition: "advisory",
      },
      {
        path: "bin.dat",
        status: "M",
        hunkRanges: [],
        oldHunkRanges: [],
        gitMode: "100644",
        previousMode: "100644",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "binary",
      },
      {
        path: "docs/notes.txt",
        status: "R",
        oldPath: "notes.txt",
        hunkRanges: [],
        oldHunkRanges: [],
        content: "n1\nn2\nn3\nn4\n",
        previousContent: "n1\nn2\nn3\nn4\n",
        gitMode: "100644",
        previousMode: "100644",
        analysisDepth: "file",
        disposition: "advisory",
      },
      {
        path: "empty.txt",
        status: "A",
        hunkRanges: [{ start: 1, end: 1 }],
        oldHunkRanges: [],
        content: "",
        gitMode: "100644",
        analysisDepth: "file",
        disposition: "advisory",
      },
      {
        path: "latin.txt",
        status: "M",
        hunkRanges: [{ start: 1, end: 1 }],
        oldHunkRanges: [{ start: 1, end: 1 }],
        gitMode: "100644",
        previousMode: "100644",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "unsupported_encoding",
      },
      {
        path: "multi.bin",
        status: "M",
        hunkRanges: [],
        oldHunkRanges: [],
        content: "1\n2\n3\n",
        previousContent: "1\n2\n",
        gitMode: "100644",
        previousMode: "100644",
        analysisDepth: "file",
        disposition: "advisory",
      },
      {
        path: "src/gone.ts",
        status: "D",
        hunkRanges: [],
        oldHunkRanges: [{ start: 1, end: 1 }],
        previousContent: "x\n",
        gitMode: "100644",
        previousMode: "100644",
        analysisDepth: "file",
        disposition: "advisory",
      },
      {
        path: "src/lib-copy.ts",
        status: "C",
        copyFromPath: "src/lib.ts",
        hunkRanges: [],
        oldHunkRanges: [],
        content: `${lib}\n`,
        previousContent: `${lib}\n`,
        gitMode: "100644",
        previousMode: "100644",
        analysisDepth: "symbol",
        disposition: "checked",
      },
      {
        path: "src/mod.ts",
        status: "M",
        hunkRanges: [
          { start: 2, end: 2 },
          { start: 4, end: 4 },
        ],
        oldHunkRanges: [{ start: 2, end: 2 }],
        content: "a\nB\nc\nd\n",
        previousContent: "a\nb\nc\n",
        gitMode: "100644",
        previousMode: "100644",
        analysisDepth: "symbol",
        disposition: "checked",
      },
      {
        path: "was-bin.txt",
        status: "M",
        hunkRanges: [],
        oldHunkRanges: [],
        gitMode: "100644",
        previousMode: "100644",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "binary",
      },
    ]);
    const diffOf = (file: string) =>
      snapshot.inventory.find((entry) => entry.path === file)?.diffText;
    expect(diffOf("src/mod.ts")).toBe(
      `${git(root, "diff", "--no-ext-diff", "--no-color", "-U0", base, head, "--", "src/mod.ts")}\n`,
    );
    expect(diffOf("docs/notes.txt")).toBe(
      `${git(root, "diff", "--no-ext-diff", "--no-color", "-U0", "-M", base, head, "--", "notes.txt", "docs/notes.txt")}\n`,
    );
  });

  test("ranges a whole added or deleted file without hunks by its lines", () => {
    const root = repo();
    commit(root, {
      ".gitattributes": "*.bin -diff\n",
      "old.bin": "1\n2\n3\n4",
    });
    write(root, { "new.bin": "a\nb\n" });
    remove(root, "old.bin");
    commit(root);
    const ranges = captureDiffSnapshot(root, "HEAD~1", "HEAD").inventory.map(
      (entry) => [entry.path, entry.hunkRanges, entry.oldHunkRanges],
    );
    expect(ranges).toStrictEqual([
      ["new.bin", [{ start: 1, end: 3 }], []],
      ["old.bin", [], [{ start: 1, end: 4 }]],
    ]);
  });

  test("reads multi-digit hunks and skips hunk-like content and binaries", () => {
    const root = repo();
    const lines = (from: number, mark: string) =>
      Array.from({ length: 30 }, (_, i) =>
        i + 1 >= from && i + 1 < from + 12 ? `${mark}${i}` : `l${i}`,
      ).join("\n");
    const base = commit(root, {
      "a.txt": "1\n",
      "at.txt": "x\n",
      "big.txt": `${lines(99, "")}\n`,
      "to-bin.txt": "t\n",
      undefined: "1\n",
    });
    const head = commit(root, {
      "a.txt": "2\n",
      "added.dat": Buffer.from([0, 1, 2]),
      "at.txt": "x\n@@ -9 +9 @@\n",
      "big.txt": `${lines(12, "changed ")}\n`,
      "to-bin.txt": Buffer.from([0, 1]),
      undefined: "2\n",
    });
    const inventory = captureDiffSnapshot(root, base, head).inventory;
    expect(
      inventory.map((entry) => [
        entry.path,
        entry.hunkRanges,
        entry.oldHunkRanges,
        entry.skipReason ?? null,
      ]),
    ).toStrictEqual([
      ["a.txt", [{ start: 1, end: 1 }], [{ start: 1, end: 1 }], null],
      ["added.dat", [{ start: 1, end: 1 }], [], "binary"],
      ["at.txt", [{ start: 2, end: 2 }], [], null],
      ["big.txt", [{ start: 12, end: 23 }], [{ start: 12, end: 23 }], null],
      ["to-bin.txt", [], [], "binary"],
      ["undefined", [{ start: 1, end: 1 }], [{ start: 1, end: 1 }], null],
    ]);
    expect(inventory[0]?.diffText).toBe(
      `${git(root, "diff", "--no-ext-diff", "--no-color", "-U0", base, head, "--", "a.txt")}\n`,
    );
  });

  test("skips symlinks and submodules on either side", () => {
    const root = repo();
    symlinkSync("zzzz/elsewhere", path.join(root, "gone-link"));
    commit(root, { target: "t\n" });
    const sub = commit(root);
    symlinkSync("target", path.join(root, "link"));
    remove(root, "gone-link");
    git(root, "update-index", "--add", "--cacheinfo", `160000,${sub},sub`);
    write(root, { target: "t\n" });
    git(root, "add", "link", "gone-link");
    git(root, "commit", "-q", "-m", "c");
    expect(
      withoutDiff(captureDiffSnapshot(root, "HEAD~1", "HEAD").inventory),
    ).toStrictEqual([
      {
        path: "gone-link",
        status: "D",
        hunkRanges: [],
        oldHunkRanges: [{ start: 1, end: 1 }],
        gitMode: "120000",
        previousMode: "120000",
        previousContent: "zzzz/elsewhere",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "symlink",
      },
      {
        path: "link",
        status: "A",
        hunkRanges: [{ start: 1, end: 1 }],
        oldHunkRanges: [],
        gitMode: "120000",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "symlink",
      },
      {
        path: "sub",
        status: "A",
        hunkRanges: [{ start: 1, end: 1 }],
        oldHunkRanges: [],
        gitMode: "160000",
        analysisDepth: "none",
        disposition: "skipped",
        skipReason: "submodule",
      },
    ]);
  });

  test("chooses the analysis depth from the path", () => {
    const root = repo();
    const files = [
      ".kb/requirements/r.md",
      ".kb/requirements/r.txt",
      ".kb/notes/n.md",
      "docs/requirements/r.md",
      ".kb/relationships/a.yaml",
      ".kb/relationships/a.yml",
      ".kb/relationships/a.json",
      ".kbx/relationships/a.yaml",
      ".kb/manifest.json",
      ".kb/symbols.yaml",
      ".kb/symbols.yml",
      ".kb/symbol-coordinates.yaml",
      ".kb/symbol-coordinates.yml",
      ".kb\\manifest.json",
      "x.ts",
      "x.tsx",
      "x.js",
      "x.jsx",
      "x.mts",
      "x.cts",
      "x.mjs",
      "x.cjs",
      "x.ts.bak",
      "x.d",
    ];
    commit(root, { keep: "k\n" });
    commit(root, Object.fromEntries(files.map((file) => [file, "v\n"])));
    const depths = Object.fromEntries(
      captureDiffSnapshot(root, "HEAD~1", "HEAD").inventory.map((entry) => [
        entry.path,
        [entry.analysisDepth as string, entry.disposition as string],
      ]),
    );
    const metadata = ["metadata", "checked"];
    const symbol = ["symbol", "checked"];
    const file = ["file", "advisory"];
    expect(depths).toStrictEqual({
      ".kb/requirements/r.md": metadata,
      ".kb/requirements/r.txt": file,
      ".kb/notes/n.md": file,
      "docs/requirements/r.md": file,
      ".kb/relationships/a.yaml": metadata,
      ".kb/relationships/a.yml": metadata,
      ".kb/relationships/a.json": file,
      ".kbx/relationships/a.yaml": file,
      ".kb/manifest.json": metadata,
      ".kb/symbols.yaml": metadata,
      ".kb/symbols.yml": metadata,
      ".kb/symbol-coordinates.yaml": metadata,
      ".kb/symbol-coordinates.yml": file,
      ".kb\\manifest.json": metadata,
      "x.ts": symbol,
      "x.tsx": symbol,
      "x.js": symbol,
      "x.jsx": symbol,
      "x.mts": symbol,
      "x.cts": symbol,
      "x.mjs": symbol,
      "x.cjs": symbol,
      "x.ts.bak": file,
      "x.d": file,
    });
  });

  test("resolves revisions once and rejects one that is not a commit", () => {
    const root = repo();
    const first = commit(root, { a: "1\n" });
    const tree = git(root, "rev-parse", "HEAD^{tree}");
    expect(() => captureDiffSnapshot(root, tree, "HEAD")).toThrow(
      `git command failed: git rev-parse --verify --end-of-options ${tree}^{commit} -> Command failed: git rev-parse --verify --end-of-options ${tree}^{commit}`,
    );
    expect(() => captureDiffSnapshot(root, "HEAD", "--all")).toThrow(
      "git command failed: git rev-parse --verify --end-of-options --all^{commit} -> Command failed: git rev-parse --verify --end-of-options --all^{commit}",
    );
    const snapshot = captureDiffSnapshot(root, "HEAD", "HEAD");
    expect([snapshot.headCommit, snapshot.inventory]).toStrictEqual([
      first,
      [],
    ]);
  });
});

describe("snapshot readGit", () => {
  let root = "";
  let base = "";
  let head = "";
  let snapshot: ReturnType<typeof captureDiffSnapshot>;
  const text = (args: string[]) => snapshot.readGit(args).toString("utf8");

  beforeAll(() => {
    root = repo();
    base = commit(root, { "src/a.ts": "a1\n", "src/b.ts": "b1\n" });
    head = commit(root, { "src/a.ts": "a2\n", "src/c.ts": "c\n" });
    commit(root, { "src/a.ts": "a3\n" });
    snapshot = captureDiffSnapshot(root, base, head);
  });

  test("diffs the captured trees for a cached diff", () => {
    expect(text(["diff", "--cached", "--name-only"])).toBe(
      "src/a.ts\nsrc/c.ts\n",
    );
    expect(
      text([
        "diff",
        "--cached",
        "--name-only",
        "--diff-filter=A",
        "--",
        "src/a.ts",
      ]),
    ).toBe("src/a.ts\n");
    expect(text(["diff", "--cached", "--name-status", "--", "src/c.ts"])).toBe(
      "A\tsrc/c.ts\n",
    );
    expect(text(["diff", "--name-only"])).toBe("");
    expect(text(["diff", "--name-only", "HEAD~1", "HEAD"])).toBe("src/a.ts\n");
  });

  test("lists the captured head tree as index entries", () => {
    const a = blob(root, "src/a.ts", head);
    const c = blob(root, "src/c.ts", head);
    const b = blob(root, "src/b.ts", head);
    expect(text(["ls-files", "--stage", "-z", "--", "src/a.ts"])).toBe(
      `100644 ${a} 0\tsrc/a.ts\0`,
    );
    expect(text(["ls-files", "--stage", "-z"])).toBe(
      `100644 ${a} 0\tsrc/a.ts\u0000100644 ${b} 0\tsrc/b.ts\u0000100644 ${c} 0\tsrc/c.ts\0`,
    );
    expect(text(["ls-files", "--stage", "--"])).toBe(
      `100644 ${a} 0\tsrc/a.ts\u0000100644 ${b} 0\tsrc/b.ts\u0000100644 ${c} 0\tsrc/c.ts\0`,
    );
    expect(text(["ls-files", "--stage", "--", "missing"])).toBe("");
    expect(text(["ls-files"])).toBe("src/a.ts\nsrc/b.ts\nsrc/c.ts\n");
  });

  test("reads HEAD as the captured base", () => {
    expect(text(["ls-tree", "--name-only", "HEAD"])).toBe("src\n");
    expect(text(["ls-tree", "-r", "--name-only", "HEAD"])).toBe(
      "src/a.ts\nsrc/b.ts\n",
    );
    expect(text(["ls-tree", "-r", "--name-only", head])).toBe(
      "src/a.ts\nsrc/b.ts\nsrc/c.ts\n",
    );
    expect(text(["rev-parse", "HEAD^{tree}"])).toBe(`${snapshot.baseTree}\n`);
    expect(text(["rev-parse", "--verify", "HEAD"])).toBe(`${base}\n`);
    expect(text(["rev-parse", "--verify", "HEAD^{commit}"])).toBe(`${base}\n`);
    expect(text(["rev-parse", "HEAD~0"])).toBe(
      `${git(root, "rev-parse", "HEAD")}\n`,
    );
    expect(text(["rev-parse", "--verify", head])).toBe(`${head}\n`);
    expect(text(["show", ":src/a.ts"])).toBe("a2\n");
    expect(text(["show", "HEAD:src/a.ts"])).toBe("a1\n");
    expect(text(["show", `${head}:src/c.ts`])).toBe("c\n");
    expect(text(["show", "--format=%H", "-s"])).toBe(
      `${git(root, "rev-parse", "HEAD")}\n`,
    );
    expect(text(["cat-file", "-t", base])).toBe("commit\n");
  });

  test("passes other commands through unchanged", () => {
    const current = git(root, "rev-parse", "HEAD");
    expect(text(["ls-files", "--cached"])).toBe(
      "src/a.ts\nsrc/b.ts\nsrc/c.ts\n",
    );
    expect(text(["rev-parse", "--stage"])).toBe("--stage\n");
    expect(text(["log", "-1", "--format=%H", "HEAD"])).toBe(`${current}\n`);
    expect(text(["rev-parse", "HEAD:src/a.ts"])).toBe(
      `${blob(root, "src/a.ts")}\n`,
    );
  });

  test("reads captured blobs in one batch", () => {
    const a = blob(root, "src/a.ts", head);
    const b = blob(root, "src/b.ts", head);
    expect(snapshot.readBlobs([])).toStrictEqual(new Map());
    expect(snapshot.readBlobs([a, b, a])).toStrictEqual(
      new Map([
        [a, Buffer.from("a2\n")],
        [b, Buffer.from("b1\n")],
      ]),
    );
    for (const oid of [
      a.toUpperCase(),
      a.slice(1),
      `${a}0`.repeat(2).slice(0, 65),
      `x${a}`,
      `${a}x`,
    ])
      expect(() => snapshot.readBlobs([a, oid])).toThrow(
        "Invalid snapshot object ID",
      );
    const tree = snapshot.baseTree;
    expect(() => snapshot.readBlobs([tree])).toThrow(
      `Invalid snapshot blob response: ${tree}`,
    );
    const missing = "0".repeat(40);
    expect(() => snapshot.readBlobs([missing])).toThrow(
      `Invalid snapshot blob response: ${missing}`,
    );
  });
});

describe("readBlobs response checks", () => {
  const oid = "a".repeat(40);
  const other = "b".repeat(40);
  let fakeDir = "";
  let root = "";
  let snapshot: ReturnType<typeof captureDiffSnapshot>;

  beforeAll(() => {
    root = repo();
    commit(root, { a: "1\n" });
    snapshot = captureDiffSnapshot(root, "HEAD", "HEAD");
    fakeDir = mkdtempSync(path.join(tmpdir(), "kibi-gcs-bin-"));
    const fake = path.join(fakeDir, "git");
    writeFileSync(
      fake,
      `#!/bin/sh\nif [ "$1" = cat-file ] && [ "$2" = --batch ]; then cat "${fakeDir}/out"; exit 0; fi\nexec /usr/bin/git "$@"\n`,
    );
    chmodSync(fake, 0o755);
  });

  function respond(output: Buffer | string, oids: string[] = [oid]) {
    writeFileSync(path.join(fakeDir, "out"), output);
    const previous = process.env.PATH;
    process.env.PATH = `${fakeDir}${path.delimiter}${previous}`;
    try {
      return snapshot.readBlobs(oids);
    } catch (error) {
      return (error as Error).message;
    } finally {
      process.env.PATH = previous;
    }
  }

  test("accepts a well-formed response", () => {
    expect(
      respond(`${oid} blob 2\nhi\n${other} blob 0\n\n`, [oid, other]),
    ).toStrictEqual(
      new Map([
        [oid, Buffer.from("hi")],
        [other, Buffer.from("")],
      ]),
    );
  });

  test("rejects a malformed header, size or delimiter", () => {
    const bad = `Invalid snapshot blob response: ${oid}`;
    expect(respond(`${oid} blob 2`)).toBe(bad);
    expect(respond(`${other} blob 2\nhi\n`)).toBe(bad);
    expect(respond(`${oid} tree 2\nhi\n`)).toBe(bad);
    expect(respond(`${oid} blob x\nhi\n`)).toBe(bad);
    expect(respond(`${oid} blob 1.5\nhi\n`)).toBe(bad);
    expect(respond(`${oid} blob -1\nhi\n`)).toBe(bad);
    expect(respond(`${oid} blob 3\nhi\n`)).toBe(bad);
    expect(respond(`${oid} blob 2\nhi`)).toBe(bad);
    expect(respond(`${oid} blob 2\nhix`)).toBe(
      `Invalid snapshot blob delimiter: ${oid}`,
    );
    expect(respond(`${oid} blob 2\nhi\nx`)).toBe(
      "Unexpected trailing snapshot blob data",
    );
    expect(respond(`${oid} blob 2\nhi\n${oid} blob 2\nhi\n`, [oid])).toBe(
      "Unexpected trailing snapshot blob data",
    );
  });
});

describe("captureStagedSnapshot", () => {
  test("captures the index of an unborn repository against the empty tree", () => {
    const root = repo();
    write(root, { "src/a.ts": "a\n" });
    git(root, "add", "-A");
    const snapshot = captureStagedSnapshot(root);
    expect(snapshot.headCommit).toBeNull();
    expect(snapshot.baseTree).toBe(EMPTY_TREE);
    expect(snapshot.headTree).toBe(git(root, "write-tree"));
    expect(withoutDiff(snapshot.inventory)).toStrictEqual([
      {
        path: "src/a.ts",
        status: "A",
        hunkRanges: [{ start: 1, end: 1 }],
        oldHunkRanges: [],
        content: "a\n",
        gitMode: "100644",
        analysisDepth: "symbol",
        disposition: "checked",
      },
    ]);
    expect(Object.keys(snapshot).sort()).toStrictEqual([
      "assertUnchanged",
      "baseTree",
      "headCommit",
      "headTree",
      "inventory",
      "readBlobs",
      "readGit",
    ]);
    expect(snapshot.readGit(["rev-parse", "HEAD^{tree}"]).toString()).toBe(
      `${EMPTY_TREE}\n`,
    );
    expect(() => snapshot.readGit(["rev-parse", "HEAD"])).toThrow(
      "HEAD does not resolve to a commit in this snapshot",
    );
    expect(snapshot.assertUnchanged()).toBeUndefined();
  });

  test("treats an orphan branch as unborn even when a longer ref ends like it", () => {
    const root = repo();
    commit(root, { a: "1\n" });
    git(root, "update-ref", "refs/x/refs/heads/new", "HEAD");
    git(root, "checkout", "-q", "--orphan", "new");
    const snapshot = captureStagedSnapshot(root);
    expect([snapshot.headCommit, snapshot.baseTree]).toStrictEqual([
      null,
      EMPTY_TREE,
    ]);
  });

  test("rejects a branch that points to a missing commit", () => {
    const root = repo();
    commit(root, { a: "1\n" });
    writeFileSync(
      path.join(root, ".git/refs/heads/main"),
      `${"1".repeat(40)}\n`,
    );
    expect(() => captureStagedSnapshot(root)).toThrow(
      "git command failed: git rev-parse --verify HEAD^{commit} -> Command failed: git rev-parse --verify HEAD^{commit}",
    );
  });

  test("captures staged changes against HEAD and notices later changes", () => {
    const root = repo();
    const base = commit(root, { "a.txt": "1\n", "b.txt": "1\n" });
    write(root, { "a.txt": "2\n", "b.txt": "2\n" });
    git(root, "add", "a.txt");
    const snapshot = captureStagedSnapshot(root);
    expect(snapshot.headCommit).toBe(base);
    expect(snapshot.baseTree).toBe(git(root, "rev-parse", "HEAD^{tree}"));
    expect(snapshot.inventory.map((entry) => entry.path)).toStrictEqual([
      "a.txt",
    ]);
    expect(snapshot.readGit(["show", ":a.txt"]).toString()).toBe("2\n");
    expect(snapshot.assertUnchanged()).toBeUndefined();
    const changed =
      "Git index or HEAD changed during staged analysis; retry the operation";
    git(root, "add", "b.txt");
    expect(() => snapshot.assertUnchanged()).toThrow(changed);
    git(root, "reset", "-q", "b.txt");
    expect(snapshot.assertUnchanged()).toBeUndefined();
    git(root, "commit", "-q", "--allow-empty", "-m", "c");
    git(root, "reset", "-q", "--soft", "HEAD~1");
    expect(snapshot.assertUnchanged()).toBeUndefined();
    git(root, "commit", "-q", "-m", "c");
    git(root, "read-tree", snapshot.headTree);
    expect(() => snapshot.assertUnchanged()).toThrow(changed);
  });
});

describe("staged merge commits", () => {
  function setup() {
    const root = repo();
    const base = commit(root, {
      "keep.txt": "k\n",
      "theirs.txt": "1\n",
      "both.txt": "1\n",
      "dropped.txt": "d\n",
    });
    git(root, "checkout", "-q", "-b", "side");
    remove(root, "dropped.txt");
    const side = commit(root, {
      "theirs.txt": "side\n",
      "both.txt": "side\n",
      "z-new.txt": "n\n",
    });
    git(root, "checkout", "-q", "main");
    commit(root, { "both.txt": "main\n" });
    return { root, base, side };
  }

  test("judges a merge only by what it writes itself", () => {
    const { root, side } = setup();
    try {
      git(root, "merge", "-q", "--no-commit", "--no-ff", "side");
    } catch {
      // The conflict on both.txt is resolved below.
    }
    write(root, { "both.txt": "resolved\n" });
    git(root, "add", "-A");
    const { result: snapshot, indexes } = scratchIndexes(() =>
      captureStagedSnapshot(root),
    );
    expect(indexes).toHaveLength(3);
    for (const index of indexes)
      expect(index).toMatch(scratchPattern("kibi-merge-base-"));
    expect(git(root, "write-tree")).toBe(snapshot.headTree);
    expect(
      readdirSync(sandbox).filter((name) => name.startsWith("kibi-merge-")),
    ).toStrictEqual([]);
    expect(snapshot.mergeInherited).toStrictEqual([
      "dropped.txt",
      "theirs.txt",
      "z-new.txt",
    ]);
    expect(withoutDiff(snapshot.inventory)).toStrictEqual([
      {
        path: "both.txt",
        status: "M",
        hunkRanges: [{ start: 1, end: 1 }],
        oldHunkRanges: [{ start: 1, end: 1 }],
        content: "resolved\n",
        previousContent: "main\n",
        gitMode: "100644",
        previousMode: "100644",
        analysisDepth: "file",
        disposition: "advisory",
      },
    ]);
    expect(snapshot.readGit(["show", "HEAD:theirs.txt"]).toString()).toBe(
      "side\n",
    );
    expect(() => snapshot.readGit(["show", "HEAD:dropped.txt"])).toThrow(
      "git command failed: git show",
    );
    expect(git(root, "rev-parse", "MERGE_HEAD")).toBe(side);
  });

  test("reads every merge parent and ignores other lines", () => {
    const { root, side } = setup();
    git(root, "checkout", "-q", "-b", "third", "main");
    const third = commit(root, { "a-third.txt": "3\n" });
    git(root, "checkout", "-q", "main");
    write(root, { "theirs.txt": "side\n", "a-third.txt": "3\n" });
    git(root, "add", "-A");
    writeFileSync(
      path.join(root, ".git/MERGE_HEAD"),
      `junk\r\n${side.toUpperCase()}\nx${side}\n${side}x\n  ${side}  \r\n\n${third}\n`,
    );
    expect(captureStagedSnapshot(root).mergeInherited).toStrictEqual([
      "a-third.txt",
      "theirs.txt",
    ]);
  });

  test("keeps the commit base when a merge inherits nothing", () => {
    const { root, side } = setup();
    writeFileSync(path.join(root, ".git/MERGE_HEAD"), `${side}\n`);
    const unchanged = captureStagedSnapshot(root);
    expect(unchanged.baseTree).toBe(git(root, "rev-parse", "HEAD^{tree}"));
    expect("mergeInherited" in unchanged).toBe(false);
    write(root, { "keep.txt": "own\n" });
    git(root, "add", "-A");
    const own = captureStagedSnapshot(root);
    expect("mergeInherited" in own).toBe(false);
    expect(own.inventory.map((entry) => entry.path)).toStrictEqual([
      "keep.txt",
    ]);
  });

  test("mergeResolutionBase needs a parent and a change", () => {
    const { root, side } = setup();
    const headTree = git(root, "rev-parse", "HEAD^{tree}");
    const sideTree = git(root, "rev-parse", `${side}^{tree}`);
    expect(mergeResolutionBase(root, headTree, sideTree, [])).toBeNull();
    expect(mergeResolutionBase(root, headTree, headTree, [side])).toBeNull();
    const result = mergeResolutionBase(root, headTree, sideTree, [side]);
    expect(result?.inherited).toStrictEqual([
      "both.txt",
      "dropped.txt",
      "theirs.txt",
      "z-new.txt",
    ]);
    expect(result?.baseTree).toBe(sideTree);
    expect(
      readdirSync(tmpdir()).some((name) => name.startsWith("kibi-merge-base-")),
    ).toBe(false);
  });
});

describe("staged knowledge relocations", () => {
  const requirement = (extra: string) =>
    `---\nid: REQ-1\ntitle: One\nstatus: open\n---\n\nThe body of the requirement stays the same.\n${extra}`;

  test("judges a move into .kb/ by the edits inside the moved file", () => {
    const root = repo();
    commit(root, {
      "documentation/requirements/REQ-1.md": requirement(""),
      "documentation/symbols.yml": "symbols: []\n",
      "src/a.ts": "a\n",
    });
    remove(
      root,
      "documentation/requirements/REQ-1.md",
      "documentation/symbols.yml",
    );
    write(root, {
      ".kb/requirements/REQ-1.md": requirement("Added line.\n"),
      ".kb/symbols.yaml": "symbols: []\n",
    });
    git(root, "add", "-A");
    const snapshot = captureStagedSnapshot(root);
    expect(snapshot.renameResolved).toStrictEqual([
      {
        from: "documentation/requirements/REQ-1.md",
        to: ".kb/requirements/REQ-1.md",
      },
      { from: "documentation/symbols.yml", to: ".kb/symbols.yaml" },
    ]);
    expect(
      snapshot.inventory.map((entry) => [
        entry.path,
        entry.status,
        entry.hunkRanges,
      ]),
    ).toStrictEqual([
      [".kb/requirements/REQ-1.md", "M", [{ start: 8, end: 8 }]],
    ]);
  });

  test("pairs a rewritten move by its file name when the pairing is unique", () => {
    const root = repo();
    commit(root, {
      "old/requirements/REQ-2.md": "a\n",
      "old/scenarios/SCN-1.md": "s\n",
      "x/symbols.yaml": "symbols: []\n",
      "docs/tests/T.md": "t1\n",
      "more/tests/T.md": "t2\n",
      "one/facts/F.md": "f\n",
      ".kb/adr/A.md": "a\n",
    });
    remove(
      root,
      "old/requirements/REQ-2.md",
      "old/scenarios/SCN-1.md",
      "x/symbols.yaml",
      "docs/tests/T.md",
      "more/tests/T.md",
      "one/facts/F.md",
      ".kb/adr/A.md",
    );
    write(root, {
      ".kb/requirements/REQ-2.md": "completely different text\n",
      ".kb/requirements/SCN-1.md": "other\n",
      ".kb/symbol-coordinates.yaml": "rewritten: true\n",
      ".kb/symbols.yaml": "symbols:\n  - id: X\n",
      ".kb/tests/T.md": "new\n",
      ".kb/facts/F.md": "new fact\n",
      ".kb/facts/sub/F.md": "copy\n",
      ".kb/flags/A.md": "moved within\n",
    });
    git(root, "add", "-A");
    expect(captureStagedSnapshot(root).renameResolved).toStrictEqual([
      { from: "old/requirements/REQ-2.md", to: ".kb/requirements/REQ-2.md" },
      { from: "x/symbols.yaml", to: ".kb/symbols.yaml" },
    ]);
  });

  test("ignores moves within .kb/, outside it, or onto another manifest", () => {
    const root = repo();
    commit(root, {
      ".kb/requirements/R.md": "r\n",
      "old/requirements/Q.md": "q\n",
      "x/coords.yaml": "coords: []\n",
      "x/sym.ymlbols": "symbols: []\n",
    });
    remove(
      root,
      ".kb/requirements/R.md",
      "old/requirements/Q.md",
      "x/coords.yaml",
      "x/sym.ymlbols",
    );
    write(root, {
      ".kb/requirements/sub/R.md": "r\n",
      "new/requirements/Q.md": "q\n",
      ".kb/symbol-coordinates.yaml": "coords: []\n",
      ".kb/symbols.yaml": "symbols: []\n",
    });
    git(root, "add", "-A");
    expect("renameResolved" in captureStagedSnapshot(root)).toBe(false);
  });

  test("orders detected and paired relocations by their target", () => {
    const root = repo();
    commit(root, {
      "old/requirements/Z.md": "zeta requirement\n",
      "old/requirements/A.md": "alpha\n",
      "x/symbols": "symbols: []\n",
    });
    remove(root, "old/requirements/Z.md", "old/requirements/A.md", "x/symbols");
    write(root, {
      ".kb/requirements/Z.md": "zeta requirement\n",
      ".kb/requirements/A.md": "rewritten\n",
      ".kb/symbols.yaml": "symbols: []\n",
    });
    git(root, "add", "-A");
    const { result, indexes } = scratchIndexes(() =>
      captureStagedSnapshot(root),
    );
    expect(result.renameResolved).toStrictEqual([
      { from: "old/requirements/A.md", to: ".kb/requirements/A.md" },
      { from: "old/requirements/Z.md", to: ".kb/requirements/Z.md" },
      { from: "x/symbols", to: ".kb/symbols.yaml" },
    ]);
    expect(indexes).toHaveLength(3);
    for (const index of indexes)
      expect(index).toMatch(scratchPattern("kibi-rename-base-"));
  });

  test("pairs only a deleted file outside .kb/ with an added file inside it", () => {
    const root = repo();
    commit(root, {
      "old/requirements/X.md": "x one\n",
      "old/requirements/Y.md": "y one\n",
      ".kb/requirements/legacy/Y.md": "y two\n",
    });
    const sub = git(root, "rev-parse", "HEAD");
    git(
      root,
      "update-index",
      "--add",
      "--cacheinfo",
      `160000,${sub},old/requirements/S.md`,
    );
    git(root, "commit", "-q", "-m", "c");
    remove(root, "old/requirements/X.md", "old/requirements/Y.md");
    remove(root, ".kb/requirements/legacy/Y.md");
    git(root, "rm", "-q", "--cached", "old/requirements/S.md");
    write(root, {
      ".kb/requirements/X.md": "x two\n",
      "new/requirements/X.md": "x three\n",
      ".kb/requirements/Y.md": "y three\n",
      ".kb/requirements/S.md": "s\n",
    });
    git(root, "add", "-A");
    expect(captureStagedSnapshot(root).renameResolved).toStrictEqual([
      { from: "old/requirements/X.md", to: ".kb/requirements/X.md" },
      { from: "old/requirements/Y.md", to: ".kb/requirements/Y.md" },
    ]);
  });

  test("renameResolutionBase is null without a relocation", () => {
    const root = repo();
    commit(root, { "a/b.md": "x\n" });
    remove(root, "a/b.md");
    write(root, { "c/b.md": "x\n" });
    git(root, "add", "-A");
    const snapshot = captureStagedSnapshot(root);
    expect("renameResolved" in snapshot).toBe(false);
    expect(
      renameResolutionBase(root, snapshot.baseTree, snapshot.headTree),
    ).toBeNull();
  });
});
