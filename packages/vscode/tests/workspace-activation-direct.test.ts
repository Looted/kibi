/// <reference types="bun-types/test-globals" />
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
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
  Object.assign(vscode.workspace as Record<string, unknown>, {
    workspaceFolders: undefined,
  });
});

afterEach(async () => {
  const workspaceModule = await importWorkspaceModule();
  workspaceModule._resetWorkspaceFsDepsForTests();
  Object.assign(vscode.workspace as Record<string, unknown>, {
    workspaceFolders: undefined,
  });
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

    Object.assign(vscode.workspace as Record<string, unknown>, {
      workspaceFolders: undefined,
    });
    process.env.KIBI_WORKSPACE_ROOT = fallbackRoot;
    workspaceModule._setWorkspaceFsDepsForTests({
      existsSync: (candidate: fs.PathLike) =>
        String(candidate) === path.join(fallbackRoot, ".kb", "manifest.json"),
    });
    expect(workspaceModule.resolveWorkspaceRoot(output as never)).toBe(
      fallbackRoot,
    );

    const invalidOutput = makeOutput();
    workspaceModule._setWorkspaceFsDepsForTests({ existsSync: () => false });
    expect(
      workspaceModule.resolveWorkspaceRoot(invalidOutput as never),
    ).toBeUndefined();
    expect(invalidOutput.appendLine).toHaveBeenCalledWith(
      `KIBI_WORKSPACE_ROOT is set but missing .kb/manifest.json: ${fallbackRoot}`,
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
    expect(
      workspaceModule.getWorkspaceFolderUri(path.join(tmpDir, "other")).fsPath,
    ).toBe(path.join(tmpDir, "other"));
  });
});
afterAll(() => {
  mock.restore();
});
