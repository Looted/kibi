import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { checkGeneratedManifests } from "../../src/commands/check-generated.js";
import { SYMBOLS_MANIFEST_COMMENT_BLOCK } from "../../src/commands/sync/manifest.js";
import * as gitSnapshot from "../../src/traceability/git-change-snapshot.js";
import {
  createGitWorkspace,
  git,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  mock.restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function repo(files: Record<string, string> = {}): string {
  const root = createGitWorkspace("main");
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  if (Object.keys(files).length > 0) git(root, "add -A");
  return root;
}

function captureConsole(): { logs: string[]; errors: string[] } {
  const logs: string[] = [];
  const errors: string[] = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.join(" "));
  });
  return { logs, errors };
}

const canonical = (body: string) => `${SYMBOLS_MANIFEST_COMMENT_BLOCK}${body}`;

async function run(root: string, options = {}) {
  return withCwd(root, () => checkGeneratedManifests(options));
}

describe("checkGeneratedManifests", () => {
  test("fails when no symbols manifest is staged", async () => {
    const root = repo();
    const io = captureConsole();
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(io.errors).toStrictEqual([
      "kibi: generated manifest check failed: Staged .kb/symbols.yaml is missing or is not a regular file",
    ]);
  });

  test("refuses a staged symbol coordinates artifact", async () => {
    const root = repo({
      ".kb/symbols.yaml": canonical("symbols: []\n"),
      ".kb/symbol-coordinates.yaml": "coordinates: {}\n",
    });
    const io = captureConsole();
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(io.errors[0]).toBe(
      "kibi: .kb/symbol-coordinates.yaml is staged, but symbol coordinates are derived locally and never committed.",
    );
    expect(io.errors[1]).toBe(
      "Run kibi migrate (or git rm --cached .kb/symbol-coordinates.yaml and add it to .gitignore), then commit again.",
    );
  });

  test("accepts an empty manifest without normalizing it", async () => {
    const root = repo({ ".kb/symbols.yaml": "symbols: []\n" });
    const io = captureConsole();
    expect(await run(root)).toStrictEqual({ exitCode: 0 });
    expect(io.logs).toStrictEqual([
      "kibi: staged symbols manifest is empty; nothing to check.",
    ]);
  });

  test("rejects a manifest without a symbols array", async () => {
    const root = repo({ ".kb/symbols.yaml": "other: 1\n" });
    const io = captureConsole();
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(io.errors).toStrictEqual([
      "kibi: generated manifest check failed: Staged .kb/symbols.yaml has no symbols array",
    ]);
  });

  test("rejects symbol sources outside the repository", async () => {
    const root = repo({
      ".kb/symbols.yaml":
        "symbols:\n  - id: SYM-A\n  - id: SYM-B\n    sourceFile: ../outside.ts\n",
    });
    const io = captureConsole();
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(io.errors).toStrictEqual([
      "kibi: generated manifest check failed: Symbol source must be a repository-relative path: ../outside.ts",
    ]);
  });

  test("rejects a symbol source staged as a symlink", async () => {
    const root = repo({
      ".kb/symbols.yaml":
        "symbols:\n  - id: SYM-A\n    sourceFile: src/link/a.ts\n",
    });
    mkdirSync(path.join(root, "src"), { recursive: true });
    symlinkSync("../elsewhere", path.join(root, "src", "link"));
    git(root, "add -A");
    const io = captureConsole();
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(io.errors).toStrictEqual([
      "kibi: generated manifest check failed: Staged symbol source is not a regular file: src/link/a.ts",
    ]);
  });

  test("skips an unchanged manifest when only changed files are checked", async () => {
    const root = repo({
      ".kb/symbols.yaml": "symbols:\n  - id: SYM-A\n",
    });
    git(root, "commit --no-verify -qm manifest");
    writeFileSync(path.join(root, "other.txt"), "x\n");
    git(root, "add other.txt");
    const io = captureConsole();
    expect(await run(root, { changedOnly: true })).toStrictEqual({
      exitCode: 0,
    });
    expect(io.logs).toStrictEqual(["kibi: staged symbols manifest unchanged."]);
  });

  test("reports drift from the canonical layout", async () => {
    const root = repo({
      ".kb/symbols.yaml": "symbols:\n  - id: SYM-A\n",
    });
    const io = captureConsole();
    expect(await run(root, { changedOnly: true })).toStrictEqual({
      exitCode: 1,
    });
    expect(io.errors[0]).toBe(
      "kibi: generated manifest drift in staged snapshot: .kb/symbols.yaml",
    );
    expect(io.errors[1]).toStartWith(
      "Run kibi sync --refresh-symbol-coordinates to rewrite the manifest",
    );
  });

  test("asks for a retry when the index changes during analysis", async () => {
    const root = repo({ ".kb/symbols.yaml": "symbols: []\n" });
    const capture = gitSnapshot.captureStagedSnapshot;
    spyOn(gitSnapshot, "captureStagedSnapshot").mockImplementation(
      (workspaceRoot: string) => ({
        ...capture(workspaceRoot),
        assertUnchanged: () => {
          throw new Error("index moved");
        },
      }),
    );
    const io = captureConsole();
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(io.errors).toStrictEqual([
      "kibi: generated manifest check failed: Git index changed during generated-manifest analysis (or HEAD changed); retry the commit",
    ]);
  });

  test("reports a failing git command with its stderr", async () => {
    const root = repo({ ".kb/symbols.yaml": "symbols: []\n" });
    const capture = gitSnapshot.captureStagedSnapshot;
    spyOn(gitSnapshot, "captureStagedSnapshot").mockImplementation(
      (workspaceRoot: string) => ({
        ...capture(workspaceRoot),
        headTree: "0".repeat(40),
      }),
    );
    const io = captureConsole();
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(io.errors[0]).toStartWith(
      `kibi: generated manifest check failed: git ls-tree -r -z --full-tree ${"0".repeat(40)} failed: fatal:`,
    );
  });

  test("rejects a truncated git blob response", async () => {
    const root = repo({ ".kb/symbols.yaml": "symbols: []\n" });
    const realSpawn = childProcess.spawnSync;
    spyOn(childProcess, "spawnSync").mockImplementation(((
      command: string,
      args: string[],
      options: never,
    ) => {
      const result = realSpawn(command, args, options);
      if (args[0] !== "cat-file") return result;
      const out = result.stdout as unknown as Buffer;
      return { ...result, stdout: out.subarray(0, out.length - 2) };
    }) as never);
    const io = captureConsole();
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(io.errors[0]).toMatch(
      /^kibi: generated manifest check failed: Incomplete Git blob [a-f0-9]+$/,
    );
  });
});
