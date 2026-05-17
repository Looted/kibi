/// <reference types="bun-types/test-globals" />
import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

const originalEnv = { ...process.env };

resetVscodeMock();
mock.module("vscode", () => getVscodeMockModule());

const vscode = getVscodeMockModule();

async function importWorkspaceModule() {
  const caseKey = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return import(`../src/activation/workspace?case=${caseKey}`);
}

function makeOutput() {
  return { appendLine: mock((_message: string) => {}) };
}

let tmpDir = "";

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-vscode-workspace-"));
  process.env = { ...originalEnv };
  Object.assign(vscode.workspace as Record<string, unknown>, { workspaceFolders: undefined });
});

afterEach(() => {
  Object.assign(vscode.workspace as Record<string, unknown>, { workspaceFolders: undefined });
  process.env = { ...originalEnv };
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe("activation/workspace direct", () => {
  test("resolveWorkspaceRoot prefers workspace folders", async () => {
    const workspaceModule = await importWorkspaceModule();
    const root = path.join(tmpDir, "repo");
    const output = makeOutput();

    Object.assign(vscode.workspace as Record<string, unknown>, {
      workspaceFolders: [{ uri: { fsPath: root, path: root, scheme: "file" } }],
    });

    expect(workspaceModule.resolveWorkspaceRoot(output as never)).toBe(root);
    expect(output.appendLine).toHaveBeenCalledWith(`Workspace root: ${root}`);
  });

  test("resolveWorkspaceRoot uses env fallback and reports missing config", async () => {
    const workspaceModule = await importWorkspaceModule();
    const output = makeOutput();
    const fallbackRoot = path.join(tmpDir, "fallback");

    Object.assign(vscode.workspace as Record<string, unknown>, { workspaceFolders: undefined });
    process.env.KIBI_WORKSPACE_ROOT = fallbackRoot;
    workspaceModule._setWorkspaceFsDepsForTests({
      existsSync: (candidate: fs.PathLike) =>
        String(candidate) === path.join(fallbackRoot, ".kb", "config.json"),
    });
    expect(workspaceModule.resolveWorkspaceRoot(output as never)).toBe(fallbackRoot);

    const invalidOutput = makeOutput();
    workspaceModule._setWorkspaceFsDepsForTests({ existsSync: () => false });
    expect(workspaceModule.resolveWorkspaceRoot(invalidOutput as never)).toBeUndefined();
    expect(invalidOutput.appendLine).toHaveBeenCalledWith(
      `KIBI_WORKSPACE_ROOT is set but missing .kb/config.json: ${fallbackRoot}`,
    );
    expect(invalidOutput.appendLine).toHaveBeenCalledWith(
      "No workspace folder found; activation skipped.",
    );
  });

  test("getWorkspaceFolderUri returns matched folder or file fallback", async () => {
    const workspaceModule = await importWorkspaceModule();
    const root = path.join(tmpDir, "repo");

    Object.assign(vscode.workspace as Record<string, unknown>, {
      workspaceFolders: [{ uri: { fsPath: root, path: root, scheme: "file" } }],
    });

    expect(workspaceModule.getWorkspaceFolderUri(root).fsPath).toBe(root);
    expect(workspaceModule.getWorkspaceFolderUri(path.join(tmpDir, "other")).fsPath).toBe(
      path.join(tmpDir, "other"),
    );
  });

  test("getCurrentBranch reads git branch then falls back to HEAD and main", async () => {
    const workspaceModule = await importWorkspaceModule();
    const gitRoot = path.join(tmpDir, "git-root");
    fs.mkdirSync(gitRoot, { recursive: true });
    execSync("git init", { cwd: gitRoot, stdio: "pipe" });
    execSync("git config user.email 'test@example.com'", { cwd: gitRoot, stdio: "pipe" });
    execSync("git config user.name 'Test User'", { cwd: gitRoot, stdio: "pipe" });
    fs.writeFileSync(path.join(gitRoot, "README.md"), "# test\n");
    execSync("git add README.md && git commit -m init", { cwd: gitRoot, stdio: "pipe" });
    execSync("git checkout -b feature/test", { cwd: gitRoot, stdio: "pipe" });

    expect(workspaceModule.getCurrentBranch(gitRoot)).toBe("feature/test");

    const headRoot = path.join(tmpDir, "head-root");
    fs.mkdirSync(path.join(headRoot, ".git"), { recursive: true });
    fs.writeFileSync(path.join(headRoot, ".git", "HEAD"), "ref: refs/heads/develop\n");
    expect(workspaceModule.getCurrentBranch(headRoot)).toBe("develop");

    fs.writeFileSync(path.join(headRoot, ".git", "HEAD"), "detached-head\n");
    expect(workspaceModule.getCurrentBranch(headRoot)).toBe("detached-head");

    workspaceModule._setWorkspaceFsDepsForTests({ existsSync: () => false });
    expect(workspaceModule.getCurrentBranch(path.join(tmpDir, "missing"))).toBe("main");
  });
});
afterAll(() => {
  mock.restore();
});
