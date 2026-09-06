// implements REQ-vscode-traceability
import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

resetVscodeMock({ workspace: { workspaceFolders: undefined } });
mock.module("vscode", () => getVscodeMockModule());

const workspaceModule = await import("../src/activation/workspace.js");

const lines: string[] = [];
const output = {
  appendLine: (line: string) => {
    lines.push(line);
  },
};

afterEach(() => {
  workspaceModule._resetWorkspaceFsDepsForTests();
  Reflect.deleteProperty(process.env, "KIBI_WORKSPACE_ROOT");
  getVscodeMockModule().workspace.workspaceFolders = undefined;
  lines.length = 0;
});

describe("vscode workspace resolution branches", () => {
  test("uses the first workspace folder when present", () => {
    const vscode = getVscodeMockModule();
    const folder = { uri: { fsPath: "/workspace" } as never };
    vscode.workspace.workspaceFolders = [folder];
    expect(workspaceModule.resolveWorkspaceRoot(output as never)).toBe(
      "/workspace",
    );
    expect(workspaceModule.getWorkspaceFolderUri("/workspace")).toBe(folder.uri);
  });

  test("falls back to KIBI_WORKSPACE_ROOT when the manifest exists", () => {
    const vscode = getVscodeMockModule();
    vscode.workspace.workspaceFolders = undefined;
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-vscode-ws-"));
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "manifest.json"), "{}\n");
    process.env.KIBI_WORKSPACE_ROOT = root;
    expect(workspaceModule.resolveWorkspaceRoot(output as never)).toBe(
      path.resolve(root),
    );
    expect(
      lines.some((line) => line.includes("KIBI_WORKSPACE_ROOT fallback")),
    ).toBe(true);
  });

  test("rejects an env fallback without a manifest and skips empty activation", () => {
    const vscode = getVscodeMockModule();
    vscode.workspace.workspaceFolders = undefined;
    process.env.KIBI_WORKSPACE_ROOT = "/tmp/kibi-missing-ws";
    expect(workspaceModule.resolveWorkspaceRoot(output as never)).toBeUndefined();
    expect(lines.some((line) => line.includes("missing .kb/manifest.json"))).toBe(
      true,
    );

    Reflect.deleteProperty(process.env, "KIBI_WORKSPACE_ROOT");
    lines.length = 0;
    expect(workspaceModule.resolveWorkspaceRoot(output as never)).toBeUndefined();
    expect(lines.some((line) => line.includes("activation skipped"))).toBe(true);
  });

  test("test fs overrides and file URI fallback", () => {
    workspaceModule._setWorkspaceFsDepsForTests({ existsSync: () => false });
    const vscode = getVscodeMockModule();
    vscode.workspace.workspaceFolders = undefined;
    process.env.KIBI_WORKSPACE_ROOT = "/tmp/anywhere";
    expect(workspaceModule.resolveWorkspaceRoot(output as never)).toBeUndefined();
    workspaceModule._setWorkspaceFsDepsForTests({});
    expect(workspaceModule.getWorkspaceFolderUri("/tmp/orphan").fsPath).toBe(
      "/tmp/orphan",
    );
  });
});
