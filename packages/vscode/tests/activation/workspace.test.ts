import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
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
  // Bun >=1.4 coerces undefined assignments into the string "undefined".
  if (value === undefined) {
    const { KIBI_WORKSPACE_ROOT: _omitted, ...rest } = process.env;
    process.env = rest;
    return;
  }
  process.env.KIBI_WORKSPACE_ROOT = value;
}

beforeEach(() => {
  resetVscodeMock({ workspace: { workspaceFolders: undefined } });
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-workspace-test-"));
  output = { appendLine: mock((_value: string) => {}) };
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
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
  fs.writeFileSync(path.join(kbConfigDir, "manifest.json"), "{}");

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

test("resolveWorkspaceRoot logs warning when KIBI_WORKSPACE_ROOT is set but missing .kb/manifest.json", async () => {
  const originalEnv = process.env.KIBI_WORKSPACE_ROOT;
  setWorkspaceRootEnv(tmpDir);

  try {
    const { resolveWorkspaceRoot } = await importWorkspaceModule();
    const result = resolveWorkspaceRoot(output as never);

    expect(result).toBeUndefined();
    expect(output.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("missing .kb/manifest.json"),
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

afterAll(() => {
  mock.restore();
});
