// executable_for TEST-source-analysis-v2-contract
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  captureDiffSnapshot,
  captureStagedSnapshot,
} from "../../src/traceability/git-change-snapshot.js";
import { getStagedInventory } from "../../src/traceability/git-staged.js";

function git(root: string, args: string[]): Buffer {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitText(root: string, args: string[]): string {
  return git(root, args).toString("utf8").trim();
}

function createRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-git-change-snapshot-"));
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "Snapshot Test"]);
  git(root, ["config", "user.email", "snapshot@example.test"]);
  return root;
}

function commitAll(root: string, message: string): string {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", message]);
  return gitText(root, ["rev-parse", "HEAD"]);
}

describe("git change snapshots", () => {
  it("inventories the captured index tree and both sides of every change", () => {
    const root = createRepo();
    try {
      writeFileSync(
        join(root, "edit.ts"),
        "const first = 1;\r\nconst second = 2;\r\n",
      );
      writeFileSync(join(root, "gone.txt"), "removed line\n");
      writeFileSync(join(root, "rename-old.txt"), "rename line\n");
      writeFileSync(join(root, "mode.sh"), "#!/bin/sh\nexit 0\n");
      writeFileSync(join(root, "copy-source.txt"), "copied line\n");
      symlinkSync("copy-source.txt", join(root, "type-change"));
      const baseCommit = commitAll(root, "baseline");

      writeFileSync(
        join(root, "edit.ts"),
        "const staged = 1;\r\nconst second = 2;\r\n",
      );
      git(root, ["add", "edit.ts"]);
      writeFileSync(
        join(root, "edit.ts"),
        "const unstaged = 9;\r\nconst later = 3;\r\n",
      );
      git(root, ["rm", "gone.txt"]);
      git(root, ["mv", "rename-old.txt", "rename-new.txt"]);
      chmodSync(join(root, "mode.sh"), 0o755);
      git(root, ["add", "mode.sh"]);
      writeFileSync(join(root, "copy-new.txt"), "copied line\n");
      writeFileSync(
        join(root, "notes.unknown"),
        "advisory bytes without extension\n",
      );
      writeFileSync(join(root, "binary.dat"), Buffer.from([0, 1, 2, 255]));
      writeFileSync(join(root, "café\nfile.txt"), Buffer.from("one\r\ntwo"));
      symlinkSync("copy-source.txt", join(root, "new-link"));
      unlinkSync(join(root, "type-change"));
      writeFileSync(join(root, "type-change"), "now a regular file\n");
      git(root, [
        "add",
        "-A",
        "--",
        "copy-new.txt",
        "notes.unknown",
        "binary.dat",
        "café\nfile.txt",
        "new-link",
        "type-change",
      ]);
      git(root, [
        "update-index",
        "--add",
        "--cacheinfo",
        `160000,${baseCommit},vendor/lib`,
      ]);

      const snapshot = captureStagedSnapshot(root);
      const byPath = new Map(
        snapshot.inventory.map((entry) => [entry.path, entry]),
      );
      expect(snapshot.headCommit).toBe(baseCommit);
      expect(
        snapshot
          .readGit(["rev-parse", "--verify", "HEAD"])
          .toString("utf8")
          .trim(),
      ).toBe(baseCommit);
      const committedPaths = snapshot
        .readGit(["ls-tree", "-r", "--name-only", "-z", "HEAD"])
        .toString("utf8");
      expect(committedPaths).toContain("edit.ts");
      expect(committedPaths).not.toContain("copy-new.txt");
      expect(byPath.get("edit.ts")).toMatchObject({
        status: "M",
        content: "const staged = 1;\r\nconst second = 2;\r\n",
        previousContent: "const first = 1;\r\nconst second = 2;\r\n",
        hunkRanges: [{ start: 1, end: 1 }],
        oldHunkRanges: [{ start: 1, end: 1 }],
      });
      expect(byPath.get("edit.ts")?.content).not.toContain("unstaged");
      expect(byPath.get("gone.txt")).toMatchObject({
        status: "D",
        previousContent: "removed line\n",
        previousMode: "100644",
        oldHunkRanges: [{ start: 1, end: 1 }],
      });
      expect(byPath.get("rename-new.txt")).toMatchObject({
        status: "R",
        oldPath: "rename-old.txt",
        previousContent: "rename line\n",
        content: "rename line\n",
      });
      expect(byPath.get("mode.sh")).toMatchObject({
        gitMode: "100755",
        previousMode: "100644",
      });
      expect(byPath.get("type-change")).toMatchObject({
        status: "T",
        gitMode: "100644",
        previousMode: "120000",
      });
      expect(byPath.get("copy-new.txt")).toMatchObject({
        status: "C",
        copyFromPath: "copy-source.txt",
        previousContent: "copied line\n",
      });
      expect(byPath.get("new-link")).toMatchObject({
        gitMode: "120000",
        skipReason: "symlink",
      });
      expect(byPath.get("vendor/lib")).toMatchObject({
        gitMode: "160000",
        skipReason: "submodule",
      });
      expect(byPath.get("binary.dat")).toMatchObject({ skipReason: "binary" });
      expect(byPath.get("notes.unknown")).toMatchObject({
        analysisDepth: "file",
        disposition: "advisory",
        content: "advisory bytes without extension\n",
      });
      expect(byPath.get("café\nfile.txt")).toMatchObject({
        content: "one\r\ntwo",
        hunkRanges: [{ start: 1, end: 2 }],
      });
      expect(snapshot.assertUnchanged).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects an index change after capturing the tree", () => {
    const root = createRepo();
    try {
      writeFileSync(join(root, "base.txt"), "base\n");
      commitAll(root, "baseline");
      const snapshot = captureStagedSnapshot(root);
      writeFileSync(join(root, "staged.txt"), "staged\n");
      git(root, ["add", "staged.txt"]);
      expect(() => snapshot.assertUnchanged()).toThrow(
        "Git index or HEAD changed",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses an empty base tree for an unborn branch", () => {
    const root = createRepo();
    try {
      writeFileSync(join(root, "first.txt"), "first\n");
      git(root, ["add", "first.txt"]);
      const snapshot = captureStagedSnapshot(root);
      expect(snapshot.headCommit).toBeNull();
      expect(snapshot.inventory).toMatchObject([
        { path: "first.txt", status: "A", content: "first\n" },
      ]);
      expect(snapshot.baseTree).not.toBe(snapshot.headTree);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("resolves explicit revisions once and lets legacy readers target the captured trees", () => {
    const root = createRepo();
    try {
      writeFileSync(join(root, "value.txt"), "base\n");
      const base = commitAll(root, "base");
      writeFileSync(join(root, "value.txt"), "head\n");
      const head = commitAll(root, "head");
      const snapshot = captureDiffSnapshot(root, base, head);
      expect(snapshot.inventory).toMatchObject([
        {
          path: "value.txt",
          status: "M",
          previousContent: "base\n",
          content: "head\n",
        },
      ]);
      expect(
        snapshot
          .readGit([
            "diff",
            "--cached",
            "--name-status",
            "-z",
            "--diff-filter=ACMRD",
          ])
          .toString("utf8"),
      ).toContain("value.txt");
      expect(getStagedInventory(snapshot.readGit)).toMatchObject([
        { path: "value.txt", status: "M", content: "head\n" },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a corrupt HEAD instead of treating it as an unborn branch", () => {
    const root = createRepo();
    try {
      writeFileSync(join(root, ".git/refs/heads/main"), `${"1".repeat(40)}\n`);
      expect(() => captureStagedSnapshot(root)).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("preserves historical injected-reader behavior", () => {
    const exec = (args: readonly string[]): Buffer => {
      if (args.includes("--name-status")) return Buffer.from("M\0note.bin\0");
      if (args[0] === "ls-files")
        return Buffer.from("100644 hash 0\tnote.bin\0");
      if (args[0] === "diff") return Buffer.from("@@ -1 +1 @@\n-old\n+new\n");
      if (args[0] === "show") return Buffer.from("new\n");
      throw new Error(`unexpected args: ${args.join(" ")}`);
    };
    expect(getStagedInventory(exec)).toMatchObject([
      { path: "note.bin", status: "M", content: "new\n" },
    ]);
  });

  it("judges a staged merge commit only on what the merge itself changed", () => {
    const root = createRepo();
    try {
      writeFileSync(join(root, "shared.txt"), "base\n");
      writeFileSync(join(root, "theirs.ts"), "export const a = 1;\n");
      writeFileSync(join(root, "removed.txt"), "gone on develop\n");
      commitAll(root, "baseline");
      git(root, ["checkout", "-b", "develop"]);
      writeFileSync(join(root, "shared.txt"), "develop\n");
      writeFileSync(
        join(root, "theirs.ts"),
        "export const a = 1;\nexport const b = 2;\n",
      );
      writeFileSync(join(root, "added.ts"), "export const c = 3;\n");
      unlinkSync(join(root, "removed.txt"));
      commitAll(root, "develop work");
      git(root, ["checkout", "main"]);
      writeFileSync(join(root, "shared.txt"), "main\n");
      commitAll(root, "main work");
      try {
        git(root, ["merge", "develop"]);
      } catch {
        // The shared.txt conflict leaves the merge in progress.
      }
      writeFileSync(join(root, "shared.txt"), "resolved\n");
      git(root, ["add", "shared.txt"]);

      const snapshot = captureStagedSnapshot(root);
      expect(snapshot.inventory.map((file) => file.path)).toEqual([
        "shared.txt",
      ]);
      expect(snapshot.inventory[0]?.previousContent).toBe("main\n");
      expect(snapshot.mergeInherited).toEqual([
        "added.ts",
        "removed.txt",
        "theirs.ts",
      ]);
      expect(snapshot.headCommit).toBe(gitText(root, ["rev-parse", "HEAD"]));
      expect(snapshot.baseTree).not.toBe(
        gitText(root, ["rev-parse", "HEAD^{tree}"]),
      );

      // Outside a merge the base is the HEAD tree again.
      git(root, ["commit", "--no-verify", "-m", "merge"]);
      writeFileSync(join(root, "after.ts"), "export const d = 4;\n");
      git(root, ["add", "after.ts"]);
      const plain = captureStagedSnapshot(root);
      expect(plain.mergeInherited).toBeUndefined();
      expect(plain.baseTree).toBe(gitText(root, ["rev-parse", "HEAD^{tree}"]));
      expect(plain.inventory.map((file) => file.path)).toEqual(["after.ts"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("judges knowledge files moved into .kb/ only on what the commit changed in them", () => {
    const root = createRepo();
    try {
      const record = (id: string, title: string) =>
        `  - id: ${id}\n    title: ${title}\n    sourceFile: src/${title}.ts\n    links:\n      - REQ-legacy-owner\n    status: active\n`;
      mkdirSync(join(root, "documentation/requirements"), { recursive: true });
      writeFileSync(
        join(root, "documentation/symbols.yaml"),
        `symbols:\n${record("SYM-alpha", "alpha")}${record("SYM-beta", "beta")}`,
      );
      writeFileSync(
        join(root, "documentation/requirements/REQ-legacy-owner.md"),
        "---\nid: REQ-legacy-owner\ntitle: Legacy owner\nstatus: open\n---\n\n# Legacy owner\n",
      );
      writeFileSync(join(root, "notes.md"), "plain notes\n");
      commitAll(root, "legacy layout");

      mkdirSync(join(root, ".kb/requirements"), { recursive: true });
      mkdirSync(join(root, "docs"), { recursive: true });
      git(root, ["mv", "documentation/symbols.yaml", ".kb/symbols.yaml"]);
      git(root, [
        "mv",
        "documentation/requirements/REQ-legacy-owner.md",
        ".kb/requirements/REQ-legacy-owner.md",
      ]);
      // A rename that is not a knowledge relocation keeps today's diff.
      git(root, ["mv", "notes.md", "docs/notes.md"]);
      writeFileSync(
        join(root, ".kb/symbols.yaml"),
        `symbols:\n${record("SYM-alpha", "alpha")}${record("SYM-beta", "beta")}    owner: platform\n`,
      );
      git(root, ["add", ".kb/symbols.yaml"]);

      const snapshot = captureStagedSnapshot(root);
      expect(snapshot.renameResolved).toEqual([
        {
          from: "documentation/requirements/REQ-legacy-owner.md",
          to: ".kb/requirements/REQ-legacy-owner.md",
        },
        { from: "documentation/symbols.yaml", to: ".kb/symbols.yaml" },
      ]);
      expect(
        snapshot.inventory.map((file) => [file.status, file.path]),
      ).toEqual([
        ["M", ".kb/symbols.yaml"],
        ["R", "docs/notes.md"],
      ]);
      expect(snapshot.inventory[0]?.diffText).toContain("+    owner: platform");
      expect(snapshot.inventory[0]?.diffText).not.toContain("SYM-alpha");
      // Readers of the base see the committed manifest at its new path.
      expect(
        snapshot.readGit(["show", "HEAD:.kb/symbols.yaml"]).toString("utf8"),
      ).toContain("SYM-beta");

      // A plain edit of an already canonical manifest diffs against HEAD.
      git(root, ["commit", "--no-verify", "-m", "migrate"]);
      writeFileSync(
        join(root, ".kb/symbols.yaml"),
        `symbols:\n${record("SYM-alpha", "alpha")}`,
      );
      git(root, ["add", ".kb/symbols.yaml"]);
      const plain = captureStagedSnapshot(root);
      expect(plain.renameResolved).toBeUndefined();
      expect(plain.baseTree).toBe(gitText(root, ["rev-parse", "HEAD^{tree}"]));
      expect(plain.inventory.map((file) => file.path)).toEqual([
        ".kb/symbols.yaml",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
