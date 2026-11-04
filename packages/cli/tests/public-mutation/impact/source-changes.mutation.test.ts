import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  collectSourceChanges,
  normalizeSourceFile,
  uniqueSorted,
} from "../../../src/public/impact/source-changes.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-source-changes-"));
  roots.push(root);
  return root;
}

function write(root: string, file: string, content: string | Buffer): void {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), content);
}

function git(root: string, ...args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.name=t", "-c", "user.email=t@example.test", ...args],
    { cwd: root, encoding: "utf8" },
  );
}

function repo(files: Record<string, string>): string {
  const root = tempRoot();
  git(root, "init", "-q");
  git(root, "config", "core.fileMode", "true");
  for (const [file, content] of Object.entries(files))
    write(root, file, content);
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");
  return root;
}

describe("path helpers", () => {
  test("normalizeSourceFile makes workspace-relative forward-slash paths", () => {
    expect(normalizeSourceFile("/ws", "/ws/src/a.ts")).toBe("src/a.ts");
    expect(normalizeSourceFile("/ws", "src/b.ts")).toBe("src/b.ts");
  });

  test("uniqueSorted", () => {
    expect(uniqueSorted(["b", "a", "b", "c"])).toStrictEqual(["a", "b", "c"]);
  });
});

describe("explicit source files", () => {
  test("reads supported readable files as whole-file changes", () => {
    const root = tempRoot();
    write(root, "src/a.ts", "a\r\nb\n");
    write(root, "src/b.py", "x");
    write(root, "..x.ts", "");
    write(root, "README.md", "readme");
    write(root, "src/bin.ts", Buffer.from([0x61, 0x00, 0x62]));
    write(root, "src/bad.ts", Buffer.from([0x61, 0xff, 0x62]));
    mkdirSync(join(root, "src", "dir.ts"));
    symlinkSync(join(root, "src", "a.ts"), join(root, "src", "link.ts"));
    expect(
      collectSourceChanges({
        workspaceRoot: root,
        sourceFiles: [
          "src/a.ts",
          join(root, "src", "b.py"),
          "..x.ts",
          "README.md",
          "src/missing.ts",
          "src/bin.ts",
          "src/bad.ts",
          "src/dir.ts",
          "src/link.ts",
          "src/a.ts",
        ],
      }),
    ).toStrictEqual([
      {
        file: "src/a.ts",
        status: "M",
        hunkRanges: [{ start: 1, end: 3 }],
        content: "a\r\nb\n",
      },
      {
        file: "src/b.py",
        status: "M",
        hunkRanges: [{ start: 1, end: 1 }],
        content: "x",
      },
      {
        file: "..x.ts",
        status: "M",
        hunkRanges: [{ start: 1, end: 1 }],
        content: "",
      },
    ]);
  });

  test("returns nothing without source files", () => {
    expect(collectSourceChanges({ workspaceRoot: tempRoot() })).toStrictEqual(
      [],
    );
  });

  test("refuses paths outside the workspace", () => {
    const root = tempRoot();
    expect(() =>
      collectSourceChanges({ workspaceRoot: root, sourceFiles: ["../out.ts"] }),
    ).toThrow(new Error("Source path must remain inside the workspace"));
    const outside = tempRoot();
    write(outside, "x.ts", "x");
    symlinkSync(outside, join(root, "linked"));
    expect(() =>
      collectSourceChanges({
        workspaceRoot: root,
        sourceFiles: ["linked/x.ts"],
      }),
    ).toThrow(new Error("Source path escapes the workspace"));
  });
});

const BASE = {
  "a.ts": "export const a = 1;\n",
  "b.ts": "export const b = 1;\n",
  "c.py": "c = 1\n",
  "d.pyi": "d: int\n",
  "e.go": "var e = 1\n",
  "f.rs": "let f = 1;\n",
  "g.go.ts": "export const g = 1;\n",
  "m.py": "m = 1\n",
  "README.md": "readme\n",
  "src/[ab].ts": "export const glob = 1;\n",
  "src/a.ts": "export const sa = 0;\n",
  "m.ts": "export const m = 1;\n",
  ".kb/requirements/REQ-x.md":
    "---\nid: REQ-x\ntitle: X\nstatus: open\n---\nX\n",
};

function editAll(root: string): void {
  write(root, "a.ts", "export const a = 2;\n");
  write(root, "b.ts", "export  const b = 1 ;\n");
  write(root, "c.py", "c  =  1\n");
  write(root, "d.pyi", "d:  int\n");
  write(root, "e.go", "var  e = 1\n");
  write(root, "f.rs", "let  f = 1;\n");
  write(root, "g.go.ts", "export  const g = 1;\n");
  chmodSync(join(root, "m.py"), 0o755);
  chmodSync(join(root, "m.ts"), 0o755);
  write(
    root,
    ".kb/requirements/REQ-x.md",
    "---\nid: REQ-x\ntitle: X\nstatus: open\n---\nY\n",
  );
  write(root, "README.md", "changed\n");
  write(root, "new.ts", "export const n = 1;\n");
}

describe("working-tree changes", () => {
  test("reports meaningful working-tree source diffs", () => {
    const root = repo(BASE);
    editAll(root);
    const changes = collectSourceChanges({
      workspaceRoot: root,
      includeWorkingTreeDiff: true,
    });
    expect(changes.map((change) => change.file)).toStrictEqual([
      "a.ts",
      "c.py",
      "d.pyi",
      "e.go",
      "f.rs",
    ]);
    expect(changes[0]).toStrictEqual({
      file: "a.ts",
      status: "M",
      hunkRanges: [{ start: 1, end: 1 }],
      content: "export const a = 2;\n",
    });
  });

  test("limits the diff to the named files, literally", () => {
    const root = repo(BASE);
    editAll(root);
    write(root, "src/a.ts", "export const sa = 1;\n");
    rmSync(join(root, "e.go"));
    expect(
      collectSourceChanges({
        workspaceRoot: root,
        includeWorkingTreeDiff: true,
        sourceFiles: [
          "b.ts",
          "src/[ab].ts",
          "new.ts",
          "missing.ts",
          "e.go",
          "a.ts",
        ],
      }).map((change) => change.file),
    ).toStrictEqual(["a.ts"]);
  });

  test("skips a changed file that is not valid UTF-8", () => {
    const root = repo(BASE);
    write(root, "bad.go", Buffer.from([0x61, 0xff, 0x0a]));
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "bad");
    write(root, "bad.go", Buffer.from([0x62, 0xfe, 0x0a]));
    expect(
      collectSourceChanges({
        workspaceRoot: root,
        includeWorkingTreeDiff: true,
        sourceFiles: ["bad.go"],
      }),
    ).toStrictEqual([]);
  });

  test("reports nothing outside a repository", () => {
    expect(
      collectSourceChanges({
        workspaceRoot: tempRoot(),
        includeWorkingTreeDiff: true,
      }),
    ).toStrictEqual([]);
  });
});

describe("staged changes", () => {
  test("reports meaningful staged source diffs", () => {
    const root = repo(BASE);
    editAll(root);
    git(root, "add", "-A");
    const changes = collectSourceChanges({ workspaceRoot: root, staged: true });
    // The staged reader yields JavaScript and TypeScript sources only.
    expect(changes.map((change) => change.file)).toStrictEqual([
      "a.ts",
      "new.ts",
    ]);
    expect(changes[0]).toStrictEqual({
      file: "a.ts",
      status: "M",
      hunkRanges: [{ start: 1, end: 1 }],
      content: "export const a = 2;\n",
    });
  });

  test("limits staged changes to the named files", () => {
    const root = repo(BASE);
    editAll(root);
    git(root, "add", "-A");
    expect(
      collectSourceChanges({
        workspaceRoot: root,
        staged: true,
        sourceFiles: ["new.ts", "b.ts"],
      }).map((change) => change.file),
    ).toStrictEqual(["new.ts"]);
  });
});
