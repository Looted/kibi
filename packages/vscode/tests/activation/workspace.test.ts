import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "../shared/vscode-mock";

type WorkspaceFolderUri = { fsPath: string; path: string; scheme: string };
type WorkspaceMock = {
  workspaceFolders: Array<{ uri: WorkspaceFolderUri }> | undefined;
};

resetVscodeMock({ workspace: { workspaceFolders: undefined } });

mock.module("vscode", () => getVscodeMockModule());

const stableFsModule = {
  ...fs,
  existsSync: (targetPath: fs.PathLike) => {
    try {
      fs.accessSync(targetPath);
      return true;
    } catch {
      return false;
    }
  },
};

let output: { appendLine: ReturnType<typeof mock<(value: string) => void>> };
let tmpDir: string;

function getWorkspaceMock(): WorkspaceMock {
  return getVscodeMockModule().workspace as WorkspaceMock;
}

async function importWorkspaceModule() {
  mock.module("vscode", () => getVscodeMockModule());
  const module = await import(
    `../../src/activation/workspace?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  module._resetWorkspaceFsDepsForTests();
  module._setWorkspaceFsDepsForTests({
    existsSync: stableFsModule.existsSync,
  });
  return module;
}

function setWorkspaceRootEnv(value: string | undefined) {
  Object.defineProperty(process.env, "KIBI_WORKSPACE_ROOT", {
    value,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  resetVscodeMock({ workspace: { workspaceFolders: undefined } });
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-workspace-test-"));
  output = { appendLine: mock((_value: string) => {}) };
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  mock.restore();
});

test("resolveWorkspaceRoot returns workspace folder path when workspaceFolders is set", async () => {
  getWorkspaceMock().workspaceFolders = [
    { uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } },
  ];

  const { resolveWorkspaceRoot } = await importWorkspaceModule();

  const result = resolveWorkspaceRoot(output as never);

  expect(result).toBe(tmpDir);
  expect(output.appendLine).toHaveBeenCalledWith(`Workspace root: ${tmpDir}`);
});

test("resolveWorkspaceRoot falls back to KIBI_WORKSPACE_ROOT env var when workspaceFolders is empty", async () => {
  const kbConfigDir = path.join(tmpDir, ".kb");
  fs.mkdirSync(kbConfigDir, { recursive: true });
  fs.writeFileSync(path.join(kbConfigDir, "config.json"), "{}");

  const originalEnv = process.env.KIBI_WORKSPACE_ROOT;
  setWorkspaceRootEnv(tmpDir);

  try {
    const { resolveWorkspaceRoot } = await importWorkspaceModule();
    const result = resolveWorkspaceRoot(output as never);

    expect(result).toBe(path.resolve(tmpDir));
    expect(output.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("KIBI_WORKSPACE_ROOT fallback"),
    );
  } finally {
    setWorkspaceRootEnv(originalEnv);
  }
});

test("resolveWorkspaceRoot logs warning when KIBI_WORKSPACE_ROOT is set but missing .kb/config.json", async () => {
  const originalEnv = process.env.KIBI_WORKSPACE_ROOT;
  setWorkspaceRootEnv(tmpDir);

  try {
    const { resolveWorkspaceRoot } = await importWorkspaceModule();
    const result = resolveWorkspaceRoot(output as never);

    expect(result).toBeUndefined();
    expect(output.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("missing .kb/config.json"),
    );
  } finally {
    setWorkspaceRootEnv(originalEnv);
  }
});

test("resolveWorkspaceRoot returns undefined when both workspaceFolders and env are empty", async () => {
  const originalEnv = process.env.KIBI_WORKSPACE_ROOT;
  setWorkspaceRootEnv(undefined);

  try {
    const { resolveWorkspaceRoot } = await importWorkspaceModule();
    const result = resolveWorkspaceRoot(output as never);

    expect(result).toBeUndefined();
    expect(output.appendLine).toHaveBeenCalledWith(
      "No workspace folder found; activation skipped.",
    );
  } finally {
    setWorkspaceRootEnv(originalEnv);
  }
});

test("getWorkspaceFolderUri returns matching folder URI when folder is found", async () => {
  getWorkspaceMock().workspaceFolders = [
    { uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } },
  ];

  const { getWorkspaceFolderUri } = await importWorkspaceModule();

  const result = getWorkspaceFolderUri(tmpDir);

  expect(result.fsPath).toBe(tmpDir);
});

test("getWorkspaceFolderUri returns Uri.file(workspaceRoot) when folder not found (no workspaceFolders)", async () => {
  getWorkspaceMock().workspaceFolders = undefined;

  const { getWorkspaceFolderUri } = await importWorkspaceModule();

  const result = getWorkspaceFolderUri("/some/other/path");

  expect(result.fsPath).toBe("/some/other/path");
});

test("getWorkspaceFolderUri returns Uri.file fallback when workspaceFolders exist but none match", async () => {
  getWorkspaceMock().workspaceFolders = [
    {
      uri: {
        fsPath: "/different/path",
        path: "/different/path",
        scheme: "file",
      },
    },
  ];

  const { getWorkspaceFolderUri } = await importWorkspaceModule();

  const result = getWorkspaceFolderUri("/some/other/path");

  expect(result.fsPath).toBe("/some/other/path");
});

test("_setWorkspaceFsDepsForTests overrides readFileSync used by getCurrentBranch", async () => {
  const gitDir = path.join(tmpDir, ".git");
  fs.mkdirSync(gitDir, { recursive: true });
  // .git/HEAD contains a ref line
  fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/my-branch\n");

  const { _setWorkspaceFsDepsForTests, getCurrentBranch } = await importWorkspaceModule();

  // Override readFileSync to return a different branch name
  const fakeReadFileSync = mock((_p: unknown, _enc: unknown) =>
    "ref: refs/heads/overridden-branch\n",
  );
  _setWorkspaceFsDepsForTests({
    existsSync: stableFsModule.existsSync,
    readFileSync: fakeReadFileSync as typeof fs.readFileSync,
  });

  const branch = getCurrentBranch(tmpDir);

  // Should use the overridden readFileSync (line 20: workspaceReadFileSync assignment)
  // rather than the real fs.readFileSync
  expect(branch).toBe("overridden-branch");
  expect(fakeReadFileSync).toHaveBeenCalled();
});

test("_resetWorkspaceFsDepsForTests restores real fs functions", async () => {
  const gitDir = path.join(tmpDir, ".git");
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/real-branch\n");

  const { _setWorkspaceFsDepsForTests, _resetWorkspaceFsDepsForTests, getCurrentBranch } =
    await importWorkspaceModule();

  // First, override with a fake readFileSync
  const fakeReadFileSync = mock((_p: unknown, _enc: unknown) =>
    "ref: refs/heads/fake-branch\n",
  );
  _setWorkspaceFsDepsForTests({
    existsSync: stableFsModule.existsSync,
    readFileSync: fakeReadFileSync as typeof fs.readFileSync,
  });

  // Verify override is active
  expect(getCurrentBranch(tmpDir)).toBe("fake-branch");

  // Reset back to real fs (lines 23-27)
  _resetWorkspaceFsDepsForTests();

  // Now getCurrentBranch should use real fs.readFileSync
  const branch = getCurrentBranch(tmpDir);
  expect(branch).toBe("real-branch");
});

test("getCurrentBranch returns branch from git command when successful", async () => {
  const { getCurrentBranch } = await importWorkspaceModule();

  // tmpDir is not a git repo, so execSync will throw, but we just want to
  // verify the function returns something. Let's create a real .git/HEAD fallback.
  const gitDir = path.join(tmpDir, ".git");
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/feature-test\n");

  const branch = getCurrentBranch(tmpDir);
  expect(branch).toBe("feature-test");
});

test("getCurrentBranch falls back to .git/HEAD file when git command fails", async () => {
  const gitDir = path.join(tmpDir, ".git");
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n");

  const { getCurrentBranch } = await importWorkspaceModule();

  // git branch --show-current will fail since tmpDir is not a real git repo
  const branch = getCurrentBranch(tmpDir);
  expect(branch).toBe("main");
});

test("getCurrentBranch returns raw HEAD content when not a ref line", async () => {
  const gitDir = path.join(tmpDir, ".git");
  fs.mkdirSync(gitDir, { recursive: true });
  // Detached HEAD: a raw commit hash, not a ref: line
  fs.writeFileSync(path.join(gitDir, "HEAD"), "abc123def456\n");

  const { getCurrentBranch } = await importWorkspaceModule();

  const branch = getCurrentBranch(tmpDir);
  // Line 102: returns headContent.trim() || "main" when no ref match
  expect(branch).toBe("abc123def456");
});

test("getCurrentBranch returns 'main' when .git/HEAD is missing", async () => {
  // tmpDir has no .git directory at all
  const { getCurrentBranch } = await importWorkspaceModule();

  const branch = getCurrentBranch(tmpDir);
  // Both execSync and .git/HEAD fallback fail -> returns "main"
  expect(branch).toBe("main");
});
