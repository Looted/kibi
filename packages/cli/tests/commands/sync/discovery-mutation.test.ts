import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  clearRecoveredPendingSourceReceipts,
  discoverSourceFiles,
  isFsEnoent,
  normalizeMarkdownPath,
  readTextOrEnoent,
  unlinkOrEnoent,
} from "../../../src/commands/sync/discovery.js";
import {
  createGitWorkspace,
  createTempDir,
  git,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

function repo(files: Record<string, string> = {}): string {
  const root = createGitWorkspace("main");
  roots.push(root);
  write(root, files);
  return root;
}

function write(root: string, files: Record<string, string>): void {
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
}

const receiptDir = (root: string) =>
  path.join(root, ".kb", "recovery", "pending-sources");

function receipt(root: string, name: string, body: unknown): string {
  const file = path.join(receiptDir(root), name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof body === "string" ? body : JSON.stringify(body));
  return file;
}

const sorted = (values: readonly string[]) => [...values].sort();

describe("discoverSourceFiles without Git", () => {
  test("finds every lane's markdown and the symbols manifest", async () => {
    const root = repo({
      ".kb/requirements/REQ-1.md": "r",
      ".kb/requirements/README.md": "readme",
      ".kb/requirements/notes.txt": "n",
      ".kb/scenarios/deep/S-1.md": "s",
      ".kb/tests/T-1.md": "t",
      ".kb/adr/A-1.md": "a",
      ".kb/flags/F-1.md": "f",
      ".kb/events/E-1.md": "e",
      ".kb/facts/README.md": "readme",
      ".kb/facts/X-1.md": "x",
      ".kb/symbols.yaml": "symbols: []\n",
      "docs/D.md": "d",
    });
    receipt(root, "bad.json", "{");
    const result = await discoverSourceFiles(root);
    expect(sorted(result.markdownFiles)).toStrictEqual(
      sorted(
        [
          ".kb/requirements/REQ-1.md",
          ".kb/scenarios/deep/S-1.md",
          ".kb/tests/T-1.md",
          ".kb/adr/A-1.md",
          ".kb/flags/F-1.md",
          ".kb/events/E-1.md",
          ".kb/facts/X-1.md",
        ].map((file) => path.join(root, file)),
      ),
    );
    expect(result.manifestFiles).toStrictEqual([
      path.join(root, ".kb", "symbols.yaml"),
    ]);
    expect(result.relationshipsDir).toBe(
      path.join(root, ".kb", "relationships"),
    );
    expect(result.recoveredPendingReceiptPaths).toStrictEqual([]);
  });
});

describe("discoverSourceFiles tracked-only", () => {
  test("keeps tracked and staged files only", async () => {
    const root = repo({
      ".kb/requirements/REQ-1.md": "r",
      ".kb/requirements/REQ-2.md": "staged",
      ".kb/requirements/REQ-3.md": "untracked",
      ".kb/symbols.yaml": "symbols: []\n",
    });
    git(root, "add .kb/requirements/REQ-1.md");
    git(root, "commit --no-verify -qm one");
    git(root, "add .kb/requirements/REQ-2.md");
    const result = await discoverSourceFiles(root, { trackedOnly: true });
    expect(sorted(result.markdownFiles)).toStrictEqual([
      path.join(root, ".kb/requirements/REQ-1.md"),
      path.join(root, ".kb/requirements/REQ-2.md"),
    ]);
    expect(result.manifestFiles).toStrictEqual([]);
    git(root, "add .kb/symbols.yaml");
    expect(
      (await discoverSourceFiles(root, { trackedOnly: true })).manifestFiles,
    ).toStrictEqual([path.join(root, ".kb", "symbols.yaml")]);
  });

  test("reads an index listing larger than a megabyte", async () => {
    const root = repo({ ".kb/requirements/REQ-1.md": "r" });
    git(root, "add -A");
    const oid = git(root, "rev-parse :.kb/requirements/REQ-1.md").trim();
    const lines = Array.from(
      { length: 16_000 },
      (_, i) => `100644 ${oid}\tbulk/${"x".repeat(60)}-${i}.txt`,
    ).join("\n");
    const listing = path.join(root, "listing.txt");
    writeFileSync(listing, `${lines}\n`);
    git(root, `update-index --index-info < ${JSON.stringify(listing)}`);
    const result = await discoverSourceFiles(root, { trackedOnly: true });
    expect(result.markdownFiles).toStrictEqual([
      path.join(root, ".kb/requirements/REQ-1.md"),
    ]);
  });

  test("adds sources bound by valid pending receipts", async () => {
    const files = {
      ".kb/requirements/P-1.md": "pending lane",
      "notes/n.md": "pending note",
      "notes/b.md": "backslash",
      "src/a.ts": "code",
      ".kb/symbols.yaml": "symbols: []\n",
    };
    const root = repo(files);
    receipt(root, "1.json", {
      path: ".kb/requirements/P-1.md",
      afterHash: sha(files[".kb/requirements/P-1.md"]),
    });
    receipt(root, "2.json", {
      path: "notes/n.md",
      afterHash: sha("pending note"),
    });
    receipt(root, "3.json", {
      path: "notes\\b.md",
      afterHash: sha("backslash"),
    });
    receipt(root, "4.json", { path: "src/a.ts", afterHash: sha("code") });
    receipt(root, "5.json", {
      path: ".kb/symbols.yaml",
      afterHash: sha("symbols: []\n"),
    });
    const result = await discoverSourceFiles(root, { trackedOnly: true });
    expect(sorted(result.markdownFiles)).toStrictEqual(
      sorted(
        [".kb/requirements/P-1.md", "notes/n.md", "notes/b.md"].map((file) =>
          path.join(root, file),
        ),
      ),
    );
    expect(result.manifestFiles).toStrictEqual([
      path.join(root, ".kb", "symbols.yaml"),
    ]);
    expect(fs.readdirSync(receiptDir(root)).length).toBe(5);
  });

  test("ignores malformed receipts", async () => {
    const root = repo();
    const bodies: unknown[] = [
      "{",
      "null",
      "5",
      { path: 5, afterHash: sha("x") },
      { path: ["BAD-1.md"], afterHash: sha("x") },
      { path: "", afterHash: sha("x") },
      { afterHash: sha("x") },
      { path: "BAD-2.md" },
      { path: "BAD-3.md", afterHash: 123 },
      { path: "BAD-4.md", afterHash: [sha("bad")] },
      { path: "BAD-5.md", afterHash: sha("bad").slice(1) },
      { path: "BAD-6.md", afterHash: `x${sha("bad")}` },
      { path: "BAD-7.md", afterHash: `${sha("bad")}x` },
    ];
    for (let i = 1; i <= 7; i++) write(root, { [`BAD-${i}.md`]: "bad" });
    bodies.forEach((body, i) => receipt(root, `r${i}.json`, body));
    receipt(root, "valid.txt", { path: "BAD-1.md", afterHash: sha("bad") });
    const result = await discoverSourceFiles(root, { trackedOnly: true });
    expect(result.markdownFiles).toStrictEqual([]);
    expect(result.recoveredPendingReceiptPaths).toStrictEqual([]);
  });

  test("skips a receipt whose source cannot be read", async () => {
    const root = repo();
    mkdirSync(path.join(root, "folder.md"));
    receipt(root, "d.json", { path: "folder.md", afterHash: sha("x") });
    const result = await discoverSourceFiles(root, { trackedOnly: true });
    expect(result.markdownFiles).toStrictEqual([]);
  });

  test("refuses receipts that escape, are missing or drifted", async () => {
    const escaping = repo();
    receipt(escaping, "e.json", { path: "../x.md", afterHash: sha("x") });
    await expect(
      discoverSourceFiles(escaping, { trackedOnly: true }),
    ).rejects.toMatchObject({
      message: "Pending source receipt escapes workspace: ../x.md",
      code: "PENDING_SOURCE_ESCAPES_WORKSPACE",
    });

    const missing = repo();
    receipt(missing, "m.json", { path: "gone.md", afterHash: sha("x") });
    await expect(
      discoverSourceFiles(missing, { trackedOnly: true }),
    ).rejects.toMatchObject({ code: "PENDING_SOURCE_MISSING" });
    await expect(
      discoverSourceFiles(missing, {
        trackedOnly: true,
        recoverMissingPendingSources: false,
      }),
    ).rejects.toMatchObject({ code: "PENDING_SOURCE_MISSING" });

    const drifted = repo({ "d.md": "edited" });
    receipt(drifted, "d.json", { path: "d.md", afterHash: sha("original") });
    await expect(
      discoverSourceFiles(drifted, { trackedOnly: true }),
    ).rejects.toMatchObject({
      code: "PENDING_SOURCE_HASH_DRIFT",
      message: expect.stringContaining(
        `; expected ${sha("original")}, found ${sha("edited")}`,
      ),
    });
  });

  test("returns missing sources for recovery", async () => {
    const root = repo({ "here.md": "here" });
    const raw = JSON.stringify({ path: "gone.md", afterHash: sha("x") });
    const file = receipt(root, "m.json", raw);
    receipt(root, "h.json", { path: "here.md", afterHash: sha("here") });
    const result = await discoverSourceFiles(root, {
      trackedOnly: true,
      recoverMissingPendingSources: true,
    });
    expect(result.recoveredPendingReceiptPaths).toStrictEqual([
      {
        receiptPath: file,
        path: "gone.md",
        afterHash: sha("x"),
        rawHash: sha(raw),
      },
    ]);
    expect(result.markdownFiles).toStrictEqual([path.join(root, "here.md")]);
  });

  test("consumes receipts of tracked files unless asked not to", async () => {
    const root = repo({
      "notes/t.md": "tracked",
      "notes/u.md": "tracked too",
      "notes/gone.md": "deleted later",
    });
    git(root, "add -A");
    fs.rmSync(path.join(root, "notes", "gone.md"));
    const other = sha("whatever");
    const consumed = [
      receipt(root, "t.json", { path: "notes/t.md", afterHash: other }),
      receipt(root, "u.json", { path: "notes\\u.md", afterHash: other }),
      receipt(root, "g.json", { path: "notes/gone.md", afterHash: other }),
    ];
    const kept = [
      receipt(root, "t.txt", { path: "notes/t.md", afterHash: other }),
      receipt(root, "bad.json", "{"),
      receipt(root, "null.json", "null"),
      receipt(root, "empty.json", { path: "" }),
      receipt(root, "untracked.json", { path: "other.md", afterHash: other }),
    ];
    write(root, { "other.md": "whatever" });
    const keep = await discoverSourceFiles(root, {
      trackedOnly: true,
      consumeTrackedPendingReceipts: false,
    });
    expect(sorted(keep.markdownFiles)).toStrictEqual(
      sorted(
        ["notes/t.md", "notes/u.md", "other.md"].map((f) => path.join(root, f)),
      ),
    );
    expect([...consumed, ...kept].every((file) => existsSync(file))).toBe(true);
    await discoverSourceFiles(root, { trackedOnly: true });
    expect(consumed.map((file) => existsSync(file))).toStrictEqual([
      false,
      false,
      false,
    ]);
    expect(kept.every((file) => existsSync(file))).toBe(true);
  });

  test("a numeric receipt path is not consumed", async () => {
    const root = repo({ "5": "five" });
    git(root, "add -A");
    const file = receipt(root, "n.json", { path: 5 });
    await discoverSourceFiles(root, { trackedOnly: true });
    expect(existsSync(file)).toBe(true);
  });
});

describe("clearRecoveredPendingSourceReceipts", () => {
  function snapshot(root: string, name: string, body: unknown) {
    const raw = typeof body === "string" ? body : JSON.stringify(body);
    const receiptPath = receipt(root, name, raw);
    return {
      receiptPath,
      path: "a.md",
      afterHash: sha("a"),
      rawHash: sha(raw),
    };
  }

  test("retires receipts that still match", () => {
    const root = createTempDir("kibi-discovery-mut-");
    roots.push(root);
    const match = snapshot(root, "a.json", {
      path: "a.md",
      afterHash: sha("a"),
    });
    const gone = {
      ...match,
      receiptPath: path.join(receiptDir(root), "x.json"),
    };
    clearRecoveredPendingSourceReceipts(root, [gone, match]);
    expect(existsSync(match.receiptPath)).toBe(false);
  });

  test("refuses receipts outside the recovery root", () => {
    const root = createTempDir("kibi-discovery-mut-");
    roots.push(root);
    for (const receiptPath of [
      path.join(root, ".kb", "recovery", "other", "a.json"),
      path.join(root, "a.json"),
      receiptDir(root),
    ]) {
      expect(() =>
        clearRecoveredPendingSourceReceipts(root, [
          { receiptPath, path: "a.md", afterHash: sha("a"), rawHash: "" },
        ]),
      ).toThrow(
        expect.objectContaining({
          message: `Pending source receipt escapes recovery root: ${receiptPath}`,
          code: "PENDING_SOURCE_ESCAPES_WORKSPACE",
        }),
      );
    }
  });

  test("refuses receipts that changed", () => {
    const root = createTempDir("kibi-discovery-mut-");
    roots.push(root);
    const changed = {
      message:
        "Pending source receipt changed during recovery for a.md; refusing to retire newer receipt",
      code: "PENDING_SOURCE_RECEIPT_CHANGED",
    };
    const cases = [
      {
        ...snapshot(root, "1.json", { path: "a.md", afterHash: sha("a") }),
        rawHash: sha("old"),
      },
      snapshot(root, "2.json", "{broken"),
      snapshot(root, "3.json", { path: "b.md", afterHash: sha("a") }),
      snapshot(root, "4.json", { path: "a.md", afterHash: sha("b") }),
    ];
    for (const item of cases) {
      expect(() => clearRecoveredPendingSourceReceipts(root, [item])).toThrow(
        expect.objectContaining(changed),
      );
      expect(existsSync(item.receiptPath)).toBe(true);
    }
  });
});

describe("receipt file helpers", () => {
  test("isFsEnoent recognizes only an ENOENT code", () => {
    expect(isFsEnoent(Object.assign(new Error("x"), { code: "ENOENT" }))).toBe(
      true,
    );
    expect(isFsEnoent({ code: "ENOENT" })).toBe(true);
    for (const value of [null, undefined, "ENOENT", { code: "EACCES" }, {}]) {
      expect(isFsEnoent(value)).toBe(false);
    }
  });

  test("readTextOrEnoent reads text, treats a missing file as null", () => {
    const root = createTempDir("kibi-discovery-mut-");
    roots.push(root);
    const file = path.join(root, "r.json");
    writeFileSync(file, "héllo");
    expect(readTextOrEnoent(file)).toBe("héllo");
    expect(readTextOrEnoent(path.join(root, "none"))).toBeNull();
    expect(() => readTextOrEnoent(root)).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(
          new RegExp(
            `^Failed to inspect pending source receipt for ${root}: EISDIR`,
          ),
        ),
        code: "PENDING_SOURCE_RECEIPT_IO",
      }),
    );
  });

  test("unlinkOrEnoent reports whether it removed the file", () => {
    const root = createTempDir("kibi-discovery-mut-");
    roots.push(root);
    const file = path.join(root, "r.json");
    writeFileSync(file, "x");
    expect(unlinkOrEnoent(file)).toBe(true);
    expect(existsSync(file)).toBe(false);
    expect(unlinkOrEnoent(file)).toBe(false);
    mkdirSync(path.join(root, "dir"));
    expect(() => unlinkOrEnoent(path.join(root, "dir"))).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(
          new RegExp(
            `^Failed to retire pending source receipt for ${path.join(root, "dir")}: E`,
          ),
        ),
        code: "PENDING_SOURCE_RECEIPT_IO",
      }),
    );
  });

  test("both helpers report thrown values that are not errors", () => {
    const read = spyOn(fs, "readFileSync").mockImplementation(() => {
      throw "busy";
    });
    restores.push(() => read.mockRestore());
    const unlink = spyOn(fs, "unlinkSync").mockImplementation(() => {
      throw null;
    });
    restores.push(() => unlink.mockRestore());
    expect(() => readTextOrEnoent("/r")).toThrow(
      "Failed to inspect pending source receipt for /r: busy",
    );
    expect(() => unlinkOrEnoent("/r")).toThrow(
      "Failed to retire pending source receipt for /r: null",
    );
  });

  test("normalizeMarkdownPath expands a lane to its markdown", () => {
    expect(normalizeMarkdownPath(undefined)).toBeNull();
    expect(normalizeMarkdownPath("")).toBeNull();
    expect(normalizeMarkdownPath("docs/*.md")).toBe("docs/*.md");
    expect(normalizeMarkdownPath("docs")).toBe("docs/**/*.md");
  });
});
