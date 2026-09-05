import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SyncError, syncCommand } from "../../src/commands/sync.js";
import {
  captureIo,
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
  for (const root of roots.splice(0)) {
    removeTempDir(root);
  }
});

describe("syncCommand error and option paths", () => {
  test("fails when the workspace is not a git repository", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createTempDir("kibi-sync-nongit-");
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    try {
      await syncCommand({ workspaceRoot: cwd, validateOnly: true });
      throw new Error("expected SyncError outside git");
    } catch (error) {
      expect(error).toBeInstanceOf(SyncError);
    }
    expect(io.errorText()).toContain("Failed to resolve active branch");
  });

  test("blocks writes through a legacy branch attachment", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "branches", "main"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "branches", "main", "kb.rdf"), "legacy\n");
    await expect(syncCommand({ workspaceRoot: cwd })).rejects.toThrow(
      /legacy branch storage/i,
    );
  });

  test("blocks on unresolved git conflicts", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    writeFileSync(path.join(cwd, "conflict.txt"), "main\n");
    git(cwd, "add conflict.txt");
    git(cwd, "commit -m 'main file'");
    git(cwd, "checkout -b other");
    writeFileSync(path.join(cwd, "conflict.txt"), "other\n");
    git(cwd, "add conflict.txt");
    git(cwd, "commit -m 'other file'");
    git(cwd, "checkout main");
    writeFileSync(path.join(cwd, "conflict.txt"), "changed\n");
    git(cwd, "add conflict.txt");
    git(cwd, "commit -m 'changed main'");
    try {
      git(cwd, "merge other");
    } catch {
      // Expected conflict.
    }
    expect(git(cwd, "diff --name-only --diff-filter=U --")).toContain(
      "conflict.txt",
    );
    try {
      await syncCommand({ workspaceRoot: cwd, validateOnly: true });
      throw new Error("expected SyncError for unresolved Git conflicts");
    } catch (error) {
      expect(error).toBeInstanceOf(SyncError);
      expect(String(error)).toMatch(/Unresolved Git conflicts/);
    }
  });

  test("validate-only runs against a git workspace", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await syncCommand({
      validateOnly: true,
      workspaceRoot: cwd,
    });
    expect(typeof result.success).toBe("boolean");
  });
});
