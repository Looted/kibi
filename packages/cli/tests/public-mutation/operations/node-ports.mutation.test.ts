import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as fsPromises from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  nodeFilesystem,
  nodeGit,
  nodeNetwork,
} from "../../../src/public/operations/node-ports.js";

const gitPort = nodeGit as Required<typeof nodeGit>;
const fsPort = nodeFilesystem as Required<typeof nodeFilesystem>;
type Snapshot = {
  version: string;
  hash: string;
  dirty: boolean;
  fileCount: number;
  changes: readonly unknown[];
  changeCount: number;
  changesTruncated: boolean;
};
const snapshotOf = (root: string) =>
  gitPort.workspaceSnapshot(root) as unknown as Promise<Snapshot>;

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function temp(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-node-ports-"));
  roots.push(root);
  return root;
}

function write(root: string, files: Record<string, string>) {
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
}

function git(root: string, ...args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.name=t", "-c", "user.email=t@t", "-C", root, ...args],
    { encoding: "utf8", stdio: "pipe" },
  );
}

function repo(files: Record<string, string>): string {
  const root = temp();
  git(root, "init", "-q", "-b", "main");
  git(root, "config", "core.fileMode", "true");
  git(root, "config", "core.precomposeunicode", "false");
  write(root, files);
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  return root;
}

const RECEIPT_DOC = (receipt: string) =>
  `---\nid: TEST-1\nproof_receipts:\n  - ${receipt}\ntitle: A test document long enough to pass sixty-four bytes\n---\nbody\n`;

describe("workspaceSnapshot", () => {
  test("hashes included files and names a clean tree", async () => {
    const root = repo({
      "a.txt": "a",
      "src/b.ts": "b",
      ".kb/requirements/r.md": "r",
      ".kb/proof/runsx": "kept",
      ".changesetx/c.md": "kept",
      ".changeset/c.md": "x",
      ".kb/branches/main/x": "x",
      ".kb/recovery/x": "x",
      ".kb/proof/runs/x": "x",
      ".kb/briefs/x": "x",
      ".kb/migrations/x": "x",
      "docs/d.md": "x",
    });
    const snapshot = await snapshotOf(root);
    expect(snapshot).toStrictEqual({
      version: "kibi.workspace-snapshot.v2",
      hash: snapshot.hash,
      dirty: false,
      fileCount: 5,
      changes: [],
      changeCount: 0,
      changesTruncated: false,
    });
    expect(snapshot.hash).toBe(HASHES.clean);
  });

  test("a file named like an excluded directory is excluded too", async () => {
    const root = repo({ docs: "x", a: "a" });
    expect((await snapshotOf(root)).fileCount).toBe(1);
  });

  test("names unreadable, untracked and NFC-equal files the same way everywhere", async () => {
    const decomposed = repo({ "a.txt": "a", "e\u0301.txt": "x", "z.txt": "z" });
    const composed = repo({ "a.txt": "a", "\u00e9.txt": "x", "z.txt": "z" });
    const one = await snapshotOf(decomposed);
    const two = await snapshotOf(composed);
    expect(one.hash).toBe(two.hash);
    expect(one.hash).toBe(HASHES.accent);

    rmSync(join(composed, "z.txt"));
    write(composed, { "new.txt": "n" });
    const changed = await snapshotOf(composed);
    expect(changed.hash).toBe(HASHES.deleted);
    expect(changed.fileCount).toBe(4);
    expect(changed.changes).toStrictEqual([
      { path: "z.txt", status: " D", snapshotRelevant: true },
      { path: "new.txt", status: "??", snapshotRelevant: true },
    ]);
    expect(changed.dirty).toBe(true);
  });

  test("a receipt-only markdown change leaves the tree clean", async () => {
    const root = repo({
      "proof/t.md": RECEIPT_DOC("old"),
      "proof/u.md": RECEIPT_DOC("old"),
      "tool.sh": "echo hi\n",
      "docs/x.md": "x",
      "a\\b.txt": "x",
    });
    write(root, { "proof/t.md": RECEIPT_DOC("new") });
    const receiptOnly = await snapshotOf(root);
    expect(receiptOnly.dirty).toBe(false);
    expect(receiptOnly.changes).toStrictEqual([
      { path: "proof/t.md", status: " M", snapshotRelevant: false },
    ]);

    write(root, {
      "proof/u.md": RECEIPT_DOC("new").replace("body", "changed body"),
      "docs/x.md": "changed",
      "a\\b.txt": "changed",
    });
    chmodSync(join(root, "tool.sh"), 0o755);
    const changed = await snapshotOf(root);
    expect(changed.changes).toStrictEqual([
      { path: "a/b.txt", status: " M", snapshotRelevant: true },
      { path: "docs/x.md", status: " M", snapshotRelevant: false },
      { path: "proof/t.md", status: " M", snapshotRelevant: false },
      { path: "proof/u.md", status: " M", snapshotRelevant: true },
      { path: "tool.sh", status: " M", snapshotRelevant: true },
    ]);
  });

  test("a new or vanished markdown file is not receipt-only", async () => {
    const root = repo({ "gone.md": RECEIPT_DOC("x") });
    write(root, { "new.md": RECEIPT_DOC("x") });
    git(root, "add", "new.md");
    write(root, { "new.md": RECEIPT_DOC("y") });
    write(root, { "gone.md": RECEIPT_DOC("y") });
    git(root, "add", "gone.md");
    rmSync(join(root, "gone.md"));
    expect((await snapshotOf(root)).changes).toStrictEqual([
      { path: "gone.md", status: "MD", snapshotRelevant: true },
      { path: "new.md", status: "AM", snapshotRelevant: true },
    ]);
  });

  test("a large receipt-only markdown change still leaves the tree clean", async () => {
    const big = "x".repeat(2 * 1024 * 1024);
    const root = repo({ "big.md": `${RECEIPT_DOC("old")}${big}` });
    write(root, { "big.md": `${RECEIPT_DOC("new")}${big}` });
    expect((await snapshotOf(root)).dirty).toBe(false);
  });

  test("lists more than a megabyte of paths", async () => {
    const root = repo({ "a.txt": "a" });
    const segment = (letter: string) => letter.repeat(240);
    const dir = [
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j",
      "k",
      "l",
      "m",
      "n",
      "o",
    ]
      .map(segment)
      .join("/");
    const files: Record<string, string> = {};
    for (let index = 0; index < 320; index += 1)
      files[`${dir}/${String(index).padStart(200, "0")}`] = "x";
    write(root, files);
    git(root, "add", "-A");
    const snapshot = await snapshotOf(root);
    expect([snapshot.fileCount, snapshot.changeCount]).toStrictEqual([
      321, 320,
    ]);
  });

  test("renames and copies count when either side is included", async () => {
    const root = repo({
      "src/a.ts": "a",
      "docs/b.md": "b",
      "docs/c.md": "c",
      "x\\y.ts": "y",
      "src/e.ts": "e\n".repeat(40),
    });
    git(root, "config", "status.renames", "copies");
    git(root, "mv", "src/a.ts", "docs/a.ts");
    git(root, "mv", "docs/b.md", "src/b.md");
    git(root, "mv", "docs/c.md", "docs/d.md");
    git(root, "mv", "x\\y.ts", "src/y.ts");
    write(root, {
      "src/e.ts": `${"e\n".repeat(40)}f\n`,
      "src/copy.ts": "e\n".repeat(40),
    });
    git(root, "add", "-A");
    expect((await snapshotOf(root)).changes).toStrictEqual([
      {
        path: "docs/a.ts",
        status: "R ",
        snapshotRelevant: true,
        previousPath: "src/a.ts",
      },
      {
        path: "docs/d.md",
        status: "R ",
        snapshotRelevant: false,
        previousPath: "docs/c.md",
      },
      {
        path: "src/b.md",
        status: "R ",
        snapshotRelevant: true,
        previousPath: "docs/b.md",
      },
      {
        path: "src/copy.ts",
        status: "C ",
        snapshotRelevant: true,
        previousPath: "src/e.ts",
      },
      { path: "src/e.ts", status: "M ", snapshotRelevant: true },
      {
        path: "src/y.ts",
        status: "R ",
        snapshotRelevant: true,
        previousPath: "x/y.ts",
      },
    ]);
  });

  test("lists at most 200 changes", async () => {
    const root = repo({ "a.txt": "a" });
    const files: Record<string, string> = {};
    for (let index = 0; index < 200; index += 1)
      files[`n/${String(index).padStart(3, "0")}.txt`] = "x";
    write(root, files);
    git(root, "config", "status.showUntrackedFiles", "all");
    const exact = await snapshotOf(root);
    expect([
      exact.changes.length,
      exact.changeCount,
      exact.changesTruncated,
    ]).toStrictEqual([1, 1, false]);
    git(root, "add", "-A");
    const staged = await snapshotOf(root);
    expect([
      staged.changes.length,
      staged.changeCount,
      staged.changesTruncated,
    ]).toStrictEqual([200, 200, false]);
    write(root, { "z.txt": "z" });
    const over = await snapshotOf(root);
    expect([
      over.changes.length,
      over.changeCount,
      over.changesTruncated,
    ]).toStrictEqual([200, 201, true]);
    expect((over.changes.at(-1) as { path: string }).path).toBe("n/199.txt");
  });

  test("a directory outside git fails", async () => {
    await expect(snapshotOf(temp())).rejects.toThrow();
  });
});

const HASHES = {
  clean: "f809eb3e4e946b7bf9fb623816899538f174233c9c6053ea87ec0148adc5d89f",
  accent: "259f8b9ee041c35be25cbb3888ceca2f30851a7fdc5c5dc32b590d4c810d8fa9",
  deleted: "4db9fe89a10574fada1582a674ce41fb2138f91461060c34bff06a155da89a28",
};

describe("nodeFilesystem", () => {
  test("reads, writes, renames, stats, syncs and unlinks", async () => {
    const root = temp();
    const nested = join(root, "a", "b");
    await fsPort.mkdir(nested);
    expect(existsSync(nested)).toBe(true);
    const file = join(nested, "f.txt");
    await fsPort.writeFile(file, "é");
    expect(readFileSync(file)).toStrictEqual(Buffer.from("é", "utf8"));
    expect(await fsPort.readFile(file)).toBe("é");
    const moved = join(root, "g.txt");
    await fsPort.rename(file, moved);
    expect(
      ((await fsPort.stat(moved)) as unknown as { size: number }).size,
    ).toBe(2);
    await fsPort.fsync(moved);
    await fsPort.fsync(root);
    await fsPort.unlink(moved);
    expect(existsSync(moved)).toBe(false);
    await expect(fsPort.fsync(moved)).rejects.toThrow();
  });

  test("fsync syncs and closes a handle, skipping directories only on Windows", async () => {
    const root = temp();
    const file = join(root, "f.txt");
    writeFileSync(file, "x");
    const calls: string[] = [];
    const open = spyOn(fsPromises, "open").mockImplementation((async (
      target: string,
    ) => {
      calls.push(`open ${target === root ? "dir" : "file"}`);
      return {
        sync: async () => {
          calls.push("sync");
        },
        close: async () => {
          calls.push("close");
        },
      };
    }) as never);
    const platform = Object.getOwnPropertyDescriptor(process, "platform");
    try {
      await fsPort.fsync(root);
      Object.defineProperty(process, "platform", { value: "win32" });
      await fsPort.fsync(root);
      await fsPort.fsync(file);
      await expect(fsPort.fsync(join(root, "missing"))).rejects.toThrow();
    } finally {
      Object.defineProperty(
        process,
        "platform",
        platform as PropertyDescriptor,
      );
      open.mockRestore();
    }
    expect(calls).toStrictEqual([
      "open dir",
      "sync",
      "close",
      "open file",
      "sync",
      "close",
    ]);
  });

  test("fsync closes the handle when the sync fails", async () => {
    const calls: string[] = [];
    const open = spyOn(fsPromises, "open").mockImplementation((async () => ({
      sync: async () => {
        throw new Error("sync failed");
      },
      close: async () => {
        calls.push("close");
      },
    })) as never);
    try {
      await expect(fsPort.fsync("/anything")).rejects.toThrow("sync failed");
    } finally {
      open.mockRestore();
    }
    expect(calls).toStrictEqual(["close"]);
  });

  test("globs files, dot files included, without ignored trees", async () => {
    const root = temp();
    const ignored = [
      ".git",
      ".kb/branches",
      ".kb/recovery",
      ".kb/proof/runs",
      ".kb/briefs",
      ".kb/migrations",
      "node_modules",
      "vendor",
      "vendors",
      "third_party",
      "third-party",
      "dist",
      "build",
      "coverage",
      "target",
    ];
    const files: Record<string, string> = {
      "a.txt": "a",
      ".hidden.txt": "h",
      "sub/b.txt": "b",
    };
    for (const dir of ignored) files[`x/${dir}/f.txt`] = "f";
    write(root, files);
    mkdirSync(join(root, "dir.txt"));
    const found = await fsPort.glob(["**/*.txt", "*.txt"], {
      cwd: root,
    });
    expect([...found].sort()).toStrictEqual([
      ".hidden.txt",
      "a.txt",
      "sub/b.txt",
    ]);
    expect(
      await fsPort.glob(["sub/*.txt", "sub/b.txt"], { cwd: root }),
    ).toStrictEqual(["sub/b.txt"]);
    expect(
      await fsPort.glob(["*.txt"], { cwd: join(root, "missing") }),
    ).toStrictEqual([]);
    expect(
      await fsPort.glob(["*"], { cwd: join(root, "a.txt") }),
    ).toStrictEqual([]);
  });
});

describe("nodeGit", () => {
  test("rev-parse runs in the process directory", async () => {
    const root = repo({ "a.txt": "a" });
    const cwd = process.cwd();
    process.chdir(join(root));
    try {
      const head = git(root, "rev-parse", "HEAD").trim();
      expect(await gitPort.revParse("HEAD")).toBe(head);
      expect(await gitPort.revParse("--abbrev-ref", "HEAD")).toBe("main");
      expect(await gitPort.showToplevel()).toBe(
        git(root, "rev-parse", "--show-toplevel").trim(),
      );
    } finally {
      process.chdir(cwd);
    }
  });

  test("ignoredPaths keeps the paths the ignore policy ignores", async () => {
    const root = temp();
    write(root, { ".gitignore": "*.log\n" });
    expect(
      await gitPort.ignoredPaths(root, ["a.log", "a.ts", "node_modules/x.ts"]),
    ).toStrictEqual(["a.log", "node_modules/x.ts"]);
  });
});

describe("nodeNetwork", () => {
  test("fetch delegates to the global fetch", async () => {
    const response = await nodeNetwork.fetch("data:text/plain,hello");
    expect(await response.text()).toBe("hello");
  });
});
