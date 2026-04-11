import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "../shared/vscode-mock";

type DisposableLike = { dispose: () => void };
type OpenDocument = { uri: { scheme: string; fsPath: string } };
type OpenDocumentListener = (doc: OpenDocument) => Promise<void>;

let capturedDocOpenListener: OpenDocumentListener | null = null;
let mockContextOnOpen = true;
let mockExecuteCommandResult: unknown = undefined;
let executeCommandImpl: (
  command: string,
  ...args: unknown[]
) => Promise<unknown> = async () => mockExecuteCommandResult;
const showInformationMessage = mock(async (_msg: string) => undefined);
let mockExistsSync: ReturnType<typeof mock<(targetPath: string) => boolean>>;

const workspaceApi = {
  onDidOpenTextDocument: mock(
    (listener: (doc: unknown) => Promise<void>): DisposableLike => {
      capturedDocOpenListener = listener as OpenDocumentListener;
      return { dispose() {} };
    },
  ),
  getConfiguration: mock((_section?: string) => ({
    get: <T>(key: string, defaultValue?: T) => {
      if (key === "contextOnOpen") return mockContextOnOpen as T;
      return defaultValue as T;
    },
  })),
};

const commandsApi = {
  registerCommand: mock((): DisposableLike => ({ dispose() {} })),
  executeCommand: mock((command: string, ...args: unknown[]) =>
    executeCommandImpl(command, ...args),
  ),
};

const windowApi = { showInformationMessage };

resetVscodeMock({
  workspace: workspaceApi,
  commands: commandsApi,
  window: windowApi,
});

mock.module("vscode", () => getVscodeMockModule());

const actualFs = await import("node:fs");

let output: { appendLine: ReturnType<typeof mock<(value: string) => void>> };
let context: { subscriptions: DisposableLike[] };
let tmpDir: string;

async function importContextOnOpenModule() {
  mock.module("vscode", () => getVscodeMockModule());
  mock.module("node:fs", () => ({
    ...actualFs,
    existsSync: (...args: unknown[]) => mockExistsSync(...(args as [string])),
  }));
  return import(
    `../../src/activation/contextOnOpen?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function getDocOpenListener(): OpenDocumentListener {
  if (!capturedDocOpenListener) {
    throw new Error("Expected document open listener to be registered");
  }

  return capturedDocOpenListener;
}

async function registerFresh(workspaceRoot = tmpDir) {
  capturedDocOpenListener = null;
  context.subscriptions = [];
  const { registerContextOnOpen } = await importContextOnOpenModule();
  registerContextOnOpen(context as never, output as never, workspaceRoot);
}

beforeEach(() => {
  capturedDocOpenListener = null;
  mockContextOnOpen = true;
  mockExecuteCommandResult = undefined;
  executeCommandImpl = async () => mockExecuteCommandResult;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-ctx-open-"));
  output = { appendLine: mock((_value: string) => {}) };
  context = { subscriptions: [] };
  mockExistsSync = mock((_targetPath: string) => false);

  workspaceApi.onDidOpenTextDocument.mockClear();
  workspaceApi.getConfiguration.mockClear();
  commandsApi.registerCommand.mockClear();
  commandsApi.executeCommand.mockClear();
  showInformationMessage.mockReset();

  resetVscodeMock({
    workspace: workspaceApi,
    commands: commandsApi,
    window: windowApi,
  });
});

afterAll(() => {
  resetVscodeMock();
  mock.module("node:fs", () => actualFs);
  mock.restore();
});

test("registerContextOnOpen registers workspace.onDidOpenTextDocument listener", async () => {
  await registerFresh();

  expect(capturedDocOpenListener).not.toBeNull();
  expect(context.subscriptions.length).toBe(1);
  expect(output.appendLine).toHaveBeenCalledWith(
    "Context on file open listener registered.",
  );
});

test("registerContextOnOpen skips registration when contextOnOpen config is false", async () => {
  mockContextOnOpen = false;

  await registerFresh();

  expect(capturedDocOpenListener).toBeNull();
  expect(context.subscriptions.length).toBe(0);
  expect(output.appendLine).not.toHaveBeenCalled();
});

test("listener ignores non-file URIs (scheme !== 'file')", async () => {
  await registerFresh();

  await getDocOpenListener()({
    uri: { scheme: "untitled", fsPath: "" },
  });

  expect(mockExistsSync).not.toHaveBeenCalled();
});

test("listener ignores documents when workspaceRoot is empty", async () => {
  await registerFresh("");

  await getDocOpenListener()({
    uri: { scheme: "file", fsPath: "/some/file.ts" },
  });

  expect(mockExistsSync).not.toHaveBeenCalled();
});

test("listener returns early when .kb folder is missing", async () => {
  mockExistsSync = mock(() => false);

  await registerFresh();

  await getDocOpenListener()({
    uri: { scheme: "file", fsPath: path.join(tmpDir, "src", "file.ts") },
  });
});

test("listener shows info message when KB query returns entities", async () => {
  const filePath = path.join(tmpDir, "src", "file.ts");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "");

  mockExistsSync = mock(
    (targetPath: string) => targetPath === path.join(tmpDir, ".kb"),
  );
  mockExecuteCommandResult = {
    structuredContent: {
      entities: [{ id: "REQ-001" }, { id: "REQ-002" }],
    },
  };

  await registerFresh();

  await getDocOpenListener()({
    uri: { scheme: "file", fsPath: filePath },
  });

  expect(showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining("2 KB entities"),
  );
});

test("listener does not show message when KB query returns no entities", async () => {
  const filePath = path.join(tmpDir, "src", "file.ts");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "");

  mockExistsSync = mock(
    (targetPath: string) => targetPath === path.join(tmpDir, ".kb"),
  );
  mockExecuteCommandResult = { structuredContent: { entities: [] } };

  await registerFresh();

  await getDocOpenListener()({
    uri: { scheme: "file", fsPath: filePath },
  });

  expect(showInformationMessage).not.toHaveBeenCalled();
});

test("listener does not show message when structuredContent is missing", async () => {
  const filePath = path.join(tmpDir, "src", "file.ts");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "");

  mockExistsSync = mock(
    (targetPath: string) => targetPath === path.join(tmpDir, ".kb"),
  );
  mockExecuteCommandResult = {};

  await registerFresh();

  await getDocOpenListener()({
    uri: { scheme: "file", fsPath: filePath },
  });

  expect(showInformationMessage).not.toHaveBeenCalled();
});

test("listener logs error when KB query throws", async () => {
  const filePath = path.join(tmpDir, "src", "file.ts");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "");

  mockExistsSync = mock(
    (targetPath: string) => targetPath === path.join(tmpDir, ".kb"),
  );
  executeCommandImpl = async () => {
    throw new Error("MCP server not available");
  };

  await registerFresh();

  await getDocOpenListener()({
    uri: { scheme: "file", fsPath: filePath },
  });

  expect(output.appendLine).toHaveBeenCalledWith(
    expect.stringContaining("Context query failed"),
  );
});

test("listener uses relative path to sourceFile in KB query", async () => {
  const filePath = path.join(tmpDir, "src", "component.ts");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "");

  mockExistsSync = mock(
    (targetPath: string) => targetPath === path.join(tmpDir, ".kb"),
  );

  const executeCommandCapture = mock(
    async (_cmd: string, ..._args: unknown[]) => ({
      structuredContent: { entities: [] },
    }),
  );
  executeCommandImpl = (command: string, ...args: unknown[]) =>
    executeCommandCapture(command, ...args);

  await registerFresh();

  await getDocOpenListener()({
    uri: { scheme: "file", fsPath: filePath },
  });

  expect(executeCommandCapture).toHaveBeenCalledWith("kibi-mcp.kb_query", {
    sourceFile: path.relative(tmpDir, filePath),
  });
});

test("listener handles non-Error thrown values in catch block", async () => {
  const filePath = path.join(tmpDir, "src", "file.ts");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "");

  mockExistsSync = mock(
    (targetPath: string) => targetPath === path.join(tmpDir, ".kb"),
  );
  executeCommandImpl = async () => {
    throw "string error";
  };

  await registerFresh();

  await getDocOpenListener()({
    uri: { scheme: "file", fsPath: filePath },
  });

  expect(output.appendLine).toHaveBeenCalledWith(
    expect.stringContaining("string error"),
  );
});
