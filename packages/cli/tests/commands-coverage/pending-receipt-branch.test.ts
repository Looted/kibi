import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { trackedRelationshipFiles } from "../../src/commands/sync.js";
import { discoverSourceFiles } from "../../src/commands/sync/discovery.js";
import { writePendingSourceReceipt } from "../../src/operations/mutation/source-authoring.js";
import {
  committedOnLocalBranch,
  pendingReceiptBranch,
  pendingReceiptScope,
} from "../../src/utils/pending-source-branch.js";
import {
  createGitWorkspace,
  createTempDir,
  git,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function sha(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function track(root: string): string {
  restores.push(isolateKibiEnv());
  roots.push(root);
  return root;
}

function pendingRoot(cwd: string): string {
  return path.join(cwd, ".kb", "recovery", "pending-sources");
}

function receipts(cwd: string): Array<Record<string, unknown>> {
  const root = pendingRoot(cwd);
  if (!existsSync(root)) return [];
  return readdirSync(root).map(
    (name) =>
      JSON.parse(readFileSync(path.join(root, name), "utf8")) as Record<
        string,
        unknown
      >,
  );
}

function writeReceipt(
  cwd: string,
  name: string,
  receipt: Record<string, unknown>,
): string {
  mkdirSync(pendingRoot(cwd), { recursive: true });
  const receiptPath = path.join(pendingRoot(cwd), `${name}.json`);
  writeFileSync(receiptPath, JSON.stringify(receipt));
  return receiptPath;
}

describe("pending-source receipts name their branch", () => {
  test("a receipt written on a branch records it", () => {
    const cwd = track(createGitWorkspace("feature/a"));
    writePendingSourceReceipt(cwd, ".kb/requirements/REQ-A.md", sha("a"));
    expect(receipts(cwd)).toMatchObject([
      { path: ".kb/requirements/REQ-A.md", branch: "feature/a" },
    ]);
  });

  test("a receipt written outside Git names no branch", () => {
    const cwd = track(createTempDir());
    expect(pendingReceiptBranch(cwd)).toBeUndefined();
    writePendingSourceReceipt(cwd, ".kb/requirements/REQ-A.md", sha("a"));
    const [receipt] = receipts(cwd);
    expect(receipt?.path).toBe(".kb/requirements/REQ-A.md");
    expect(receipt).not.toHaveProperty("branch");
  });

  test("the scope reads a receipt as this branch's unless it names another", () => {
    const cwd = track(createGitWorkspace("main"));
    const inScope = pendingReceiptScope(cwd);
    expect(inScope({ path: "x" })).toBe(true);
    expect(inScope(null)).toBe(true);
    expect(inScope({ branch: 7 })).toBe(true);
    expect(inScope({ branch: "main" })).toBe(true);
    expect(inScope({ branch: "other" })).toBe(false);
  });

  test("a path counts as committed only when a local branch holds it as a file", () => {
    const cwd = track(createGitWorkspace("main"));
    mkdirSync(path.join(cwd, "docs"), { recursive: true });
    writeFileSync(path.join(cwd, "docs", "kept.md"), "kept\n");
    git(cwd, "checkout -q -b feature");
    git(cwd, "add docs/kept.md");
    git(cwd, "commit -q --no-verify -m kept");
    git(cwd, "checkout -q main");
    const committed = committedOnLocalBranch(cwd);
    expect(committed("docs/kept.md")).toBe(true);
    expect(committed("docs")).toBe(false);
    expect(committed("docs/absent.md")).toBe(false);
  });

  test("outside Git, or when Git cannot answer, nothing is committed anywhere", () => {
    expect(committedOnLocalBranch(track(createTempDir()))("a.md")).toBe(false);
    const cwd = track(createGitWorkspace("main"));
    const committed = committedOnLocalBranch(cwd);
    expect(committed("a.md")).toBe(false);
    rmSync(path.join(cwd, ".git"), { recursive: true, force: true });
    mkdirSync(path.join(cwd, ".git"));
    expect(committed("a.md")).toBe(false);
  });

  test("a workspace without a branch checks every receipt", () => {
    const cwd = track(createTempDir());
    expect(pendingReceiptScope(cwd)({ branch: "other" })).toBe(true);
  });
});

describe("sync leaves another branch's receipts alone", () => {
  test("a missing source bound on another branch does not fail discovery", async () => {
    const cwd = track(createGitWorkspace("main"));
    writeReceipt(cwd, "foreign", {
      path: ".kb/requirements/REQ-ELSEWHERE.md",
      afterHash: sha("x"),
      branch: "other",
    });
    const result = await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(result.markdownFiles).toStrictEqual([]);
    expect(result.recoveredPendingReceiptPaths).toStrictEqual([]);
    expect(receipts(cwd)).toHaveLength(1);

    git(cwd, "checkout -q -b other");
    await expect(
      discoverSourceFiles(cwd, { trackedOnly: true }),
    ).rejects.toMatchObject({ code: "PENDING_SOURCE_MISSING" });
  });

  test("an untracked file bound on another branch is still compiled here", async () => {
    const cwd = track(createGitWorkspace("main"));
    const relative = ".kb/requirements/REQ-CARRIED.md";
    const body = "---\nid: REQ-CARRIED\ntitle: Carried\nstatus: open\n---\n";
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(path.join(cwd, relative), body);
    writeReceipt(cwd, "carried", {
      path: relative,
      afterHash: sha(body),
      branch: "other",
    });
    const result = await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(
      result.markdownFiles.some((file) => file.endsWith("REQ-CARRIED.md")),
    ).toBe(true);
  });

  test("a tracked file retires its receipt whichever branch wrote it", async () => {
    const cwd = track(createGitWorkspace("main"));
    const relative = ".kb/requirements/REQ-TRACKED.md";
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(path.join(cwd, relative), "tracked\n");
    git(cwd, `add ${relative}`);
    const foreign = writeReceipt(cwd, "foreign", {
      path: relative,
      afterHash: sha("tracked\n"),
      branch: "other",
    });
    const own = writeReceipt(cwd, "own", {
      path: relative,
      afterHash: sha("tracked\n"),
      branch: "main",
    });
    await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(existsSync(foreign)).toBe(false);
    expect(existsSync(own)).toBe(false);
  });

  test("a file written on main and committed on a feature branch leaves main syncing", async () => {
    const cwd = track(createGitWorkspace("main"));
    const relative = ".kb/requirements/REQ-BRANCHED.md";
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(path.join(cwd, relative), "branched\n");
    writePendingSourceReceipt(cwd, relative, sha("branched\n"));
    expect(receipts(cwd)).toMatchObject([{ branch: "main" }]);

    git(cwd, "checkout -q -b feature");
    git(cwd, `add ${relative}`);
    git(cwd, "commit -q --no-verify -m branched");
    await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(receipts(cwd)).toStrictEqual([]);

    git(cwd, "checkout -q main");
    expect(existsSync(path.join(cwd, relative))).toBe(false);
    const result = await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(result.markdownFiles).toStrictEqual([]);
  });

  test("a file committed on a feature branch without a sync there leaves main syncing and retires its receipt", async () => {
    const cwd = track(createGitWorkspace("main"));
    const relative = ".kb/requirements/REQ-UNSYNCED.md";
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(path.join(cwd, relative), "unsynced\n");
    writePendingSourceReceipt(cwd, relative, sha("unsynced\n"));

    git(cwd, "checkout -q -b feature");
    git(cwd, `add ${relative}`);
    git(cwd, "commit -q --no-verify -m unsynced");
    git(cwd, "checkout -q main");
    expect(existsSync(path.join(cwd, relative))).toBe(false);
    expect(receipts(cwd)).toMatchObject([{ branch: "main" }]);

    const readOnly = await discoverSourceFiles(cwd, {
      trackedOnly: true,
      consumeTrackedPendingReceipts: false,
    });
    expect(readOnly.markdownFiles).toStrictEqual([]);
    expect(receipts(cwd)).toHaveLength(1);

    const result = await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(result.markdownFiles).toStrictEqual([]);
    expect(receipts(cwd)).toStrictEqual([]);
  });

  test("a file no local branch has committed still fails as missing", async () => {
    const cwd = track(createGitWorkspace("main"));
    const relative = ".kb/requirements/REQ-LOST.md";
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(path.join(cwd, relative), "lost\n");
    writePendingSourceReceipt(cwd, relative, sha("lost\n"));
    git(cwd, "checkout -q -b feature");
    git(cwd, `add ${relative}`);
    git(cwd, "commit -q --no-verify -m lost");
    git(cwd, "checkout -q main");
    git(cwd, "branch -q -D feature");
    await expect(
      discoverSourceFiles(cwd, { trackedOnly: true }),
    ).rejects.toThrow(/Pending source is missing/);
  });

  test("a shard committed on a feature branch without a sync there leaves main's relationship read alone", () => {
    const cwd = track(createGitWorkspace("main"));
    const relationshipsDir = path.join(cwd, ".kb", "relationships");
    mkdirSync(relationshipsDir, { recursive: true });
    writeFileSync(path.join(relationshipsDir, "cd.yaml"), "shard\n");
    writePendingSourceReceipt(cwd, ".kb/relationships/cd.yaml", sha("shard\n"));
    git(cwd, "checkout -q -b feature");
    git(cwd, "add .kb/relationships/cd.yaml");
    git(cwd, "commit -q --no-verify -m shard");
    git(cwd, "checkout -q main");
    expect(trackedRelationshipFiles(cwd, relationshipsDir)).toStrictEqual([]);
  });

  test("a tracked shard is not hash-checked against another branch's receipt", () => {
    const cwd = track(createGitWorkspace("feature/a"));
    const relationshipsDir = path.join(cwd, ".kb", "relationships");
    mkdirSync(relationshipsDir, { recursive: true });
    const shard = path.join(relationshipsDir, "ab.yaml");
    writeFileSync(shard, "first\n");
    writePendingSourceReceipt(cwd, ".kb/relationships/ab.yaml", sha("first\n"));
    git(cwd, "add .kb/relationships/ab.yaml");
    git(cwd, "commit -q --no-verify -m shard");

    git(cwd, "checkout -q -b feature/b");
    writeFileSync(shard, "first\nsecond\n");
    git(cwd, "commit -q --no-verify -am more");
    expect(trackedRelationshipFiles(cwd, relationshipsDir)).toStrictEqual([
      shard,
    ]);
  });

  test("a relationship shard bound on another branch does not fail the relationship read", () => {
    const cwd = track(createGitWorkspace("main"));
    const relationshipsDir = path.join(cwd, ".kb", "relationships");
    mkdirSync(relationshipsDir, { recursive: true });
    writeReceipt(cwd, "foreign", {
      path: ".kb/relationships/ab.yaml",
      afterHash: sha("x"),
      branch: "other",
    });
    expect(trackedRelationshipFiles(cwd, relationshipsDir)).toStrictEqual([]);

    git(cwd, "checkout -q -b other");
    expect(() => trackedRelationshipFiles(cwd, relationshipsDir)).toThrow(
      /Pending source is missing/,
    );
  });
});
