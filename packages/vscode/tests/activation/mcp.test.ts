import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import type { McpDeps } from "../../src/activation/mcp";
import { getVscodeMockModule, resetVscodeMock } from "../shared/vscode-mock";
type DisposableLike = { dispose: () => void };

let mockServerPath = "";
const showWarningMessage = mock<
  (message: string, ...items: unknown[]) => Promise<string | undefined>
>(async (_msg: string, ..._args: unknown[]) => undefined);
const showErrorMessage = mock<
  (message: string, ...items: unknown[]) => Promise<string | undefined>
>(async (_msg: string, ..._args: unknown[]) => undefined);
const executeCommand = mock(
  async (_cmd: string, ..._args: unknown[]) => undefined,
);
let mockExistsSync: ReturnType<typeof mock<(targetPath: string) => boolean>>;
let mockExecSync: ReturnType<typeof mock<(command: string, options?: unknown) => string>>;
let mockDeps: McpDeps;

const workspaceApi = {
  getConfiguration: mock((_section?: string) => ({
    get: <T>(key: string, defaultValue?: T) => {
      if (key === "mcp.serverPath") return mockServerPath as T;
      return defaultValue as T;
    },
  })),
};

const windowApi = {
  showWarningMessage,
  showErrorMessage,
};

const commandsApi = {
  registerCommand: mock((): DisposableLike => ({ dispose() {} })),
  executeCommand,
};

resetVscodeMock({
  workspace: workspaceApi,
  window: windowApi,
  commands: commandsApi,
});

mock.module("vscode", () => getVscodeMockModule());
const { findKibiMcpInPath, validateMcpServerPath } = await import(
  "../../src/activation/mcp"
);

let output: { appendLine: ReturnType<typeof mock<(value: string) => void>> };

beforeEach(() => {
  mockServerPath = "";
  output = { appendLine: mock((_value: string) => {}) };
  mockExistsSync = mock((_targetPath: string) => false);
  mockExecSync = mock(() => {
    throw new Error("not found");
  });
  mockDeps = {
    existsSync: (...args: unknown[]) => mockExistsSync(...(args as [string])),
    execSync: ((...args: unknown[]) =>
      mockExecSync(
        ...(args as [string, unknown | undefined]),
      )) as McpDeps["execSync"],
  };
  workspaceApi.getConfiguration.mockClear();
  showWarningMessage.mockClear();
  showErrorMessage.mockClear();
  commandsApi.registerCommand.mockClear();
  executeCommand.mockReset();
  resetVscodeMock({
    workspace: workspaceApi,
    window: windowApi,
    commands: commandsApi,
  });
});

afterAll(() => {
  resetVscodeMock();
  mock.restore();
});

test("validateMcpServerPath: config path empty, auto-detection finds kibi-mcp in PATH", () => {
  mockExecSync = mock(() => "/usr/local/bin/kibi-mcp\n");
  mockExistsSync = mock(
    (targetPath: string) => targetPath === "/usr/local/bin/kibi-mcp",
  );

  validateMcpServerPath(output as never, mockDeps);

  expect(output.appendLine).toHaveBeenCalledWith(
    expect.stringContaining("Auto-detected kibi-mcp at"),
  );
});

test("validateMcpServerPath: config path empty, auto-detection fails, shows warning", () => {
  mockExecSync = mock(() => {
    throw new Error("not found");
  });
  mockExistsSync = mock(() => false);

  validateMcpServerPath(output as never, mockDeps);

  expect(showWarningMessage).toHaveBeenCalledWith(
    expect.stringContaining("not configured"),
    "Open Settings",
  );
  expect(output.appendLine).toHaveBeenCalledWith(
    expect.stringContaining("not configured"),
  );
});

test("validateMcpServerPath: config path set and file exists, logs success", () => {
  const validPath = "/usr/local/bin/kibi-mcp";
  mockServerPath = validPath;
  mockExistsSync = mock((targetPath: string) => targetPath === validPath);

  validateMcpServerPath(output as never, mockDeps);

  expect(output.appendLine).toHaveBeenCalledWith(
    expect.stringContaining("validated"),
  );
});

test("validateMcpServerPath: config path set but file missing, shows error", () => {
  mockServerPath = "/nonexistent/kibi-mcp";
  mockExistsSync = mock(() => false);

  validateMcpServerPath(output as never, mockDeps);

  expect(showErrorMessage).toHaveBeenCalledWith(
    expect.stringContaining("not found"),
    "Open Settings",
  );
  expect(output.appendLine).toHaveBeenCalledWith(
    expect.stringContaining("not found at configured path"),
  );
});

test("validateMcpServerPath: config path whitespace-only triggers auto-detection", () => {
  mockServerPath = "   ";
  mockExecSync = mock(() => {
    throw new Error("not found");
  });
  mockExistsSync = mock(() => false);

  validateMcpServerPath(output as never, mockDeps);

  expect(showWarningMessage).toHaveBeenCalled();
});

test("findKibiMcpInPath: command found in PATH returns path", () => {
  mockExecSync = mock(() => "/usr/local/bin/kibi-mcp\n");
  mockExistsSync = mock(
    (targetPath: string) => targetPath === "/usr/local/bin/kibi-mcp",
  );

  const result = findKibiMcpInPath(mockDeps);

  expect(result).toBe("/usr/local/bin/kibi-mcp");
});

test("findKibiMcpInPath: command returns multiple paths, returns first existing one", () => {
  mockExecSync = mock(() => "/first/path/kibi-mcp\n/second/path/kibi-mcp\n");
  mockExistsSync = mock(
    (targetPath: string) => targetPath === "/second/path/kibi-mcp",
  );

  const result = findKibiMcpInPath(mockDeps);

  expect(result).toBe("/second/path/kibi-mcp");
});

test("findKibiMcpInPath: command not found in PATH, checks common paths", () => {
  mockExecSync = mock(() => {
    throw new Error("not found");
  });
  mockExistsSync = mock((targetPath: string) =>
    targetPath.includes(".local/bin/kibi-mcp"),
  );

  const result = findKibiMcpInPath(mockDeps);

  expect(result).toContain(".local/bin/kibi-mcp");
});

test("findKibiMcpInPath: returns undefined when nothing is found", () => {
  mockExecSync = mock(() => {
    throw new Error("not found");
  });
  mockExistsSync = mock(() => false);

  const result = findKibiMcpInPath(mockDeps);

  expect(result).toBeUndefined();
});

test("findKibiMcpInPath: checks all common installation paths", () => {
  mockExecSync = mock(() => {
    throw new Error("not found");
  });

  const checkedPaths: string[] = [];
  mockExistsSync = mock((targetPath: string) => {
    checkedPaths.push(targetPath);
    return false;
  });

  findKibiMcpInPath(mockDeps);

  expect(checkedPaths).toContain("/usr/local/bin/kibi-mcp");
  expect(checkedPaths).toContain("/usr/bin/kibi-mcp");
});

test("findKibiMcpInPath: returns .bun/bin path when that exists", () => {
  mockExecSync = mock(() => {
    throw new Error("not found");
  });
  mockExistsSync = mock((targetPath: string) =>
    targetPath.includes(".bun/bin/kibi-mcp"),
  );

  const result = findKibiMcpInPath(mockDeps);

  expect(result).toContain(".bun/bin/kibi-mcp");
});

test("validateMcpServerPath: Open Settings warning selection executes command", async () => {
  mockExecSync = mock(() => {
    throw new Error("not found");
  });
  mockExistsSync = mock(() => false);
  showWarningMessage.mockImplementation(async () => "Open Settings");

  validateMcpServerPath(output as never, mockDeps);

  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(executeCommand).toHaveBeenCalledWith(
    "workbench.action.openSettings",
    "kibi.mcp.serverPath",
  );
});

test("validateMcpServerPath: Open Settings error selection executes command", async () => {
  mockServerPath = "/nonexistent/kibi-mcp";
  mockExistsSync = mock(() => false);
  showErrorMessage.mockImplementation(async () => "Open Settings");

  validateMcpServerPath(output as never, mockDeps);

  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(executeCommand).toHaveBeenCalledWith(
    "workbench.action.openSettings",
    "kibi.mcp.serverPath",
  );
});
