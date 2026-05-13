import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

const validateMcpServerPathMock = mock((_output: unknown) => {});
const resolveWorkspaceRootMock = mock((_output: unknown) => "/repo" as string | undefined);
const getWorkspaceFolderUriMock = mock((_workspaceRoot: string) => ({
  fsPath: "/repo",
  path: "/repo",
  scheme: "file",
}));
const getCurrentBranchMock = mock((_workspaceRoot: string) => "develop");
const registerTreeViewMock = mock((..._args: unknown[]) => ({
  treeDataProvider: {
    getLocalPathForEntity: (_id: string) => undefined,
  },
  watcher: { dispose() {} },
  treeView: { dispose() {} },
  refreshCommand: { dispose() {} },
}));
const registerBriefWatcherMock = mock((..._args: unknown[]) => ({
  watcher: { dispose() {} },
  dispose() {},
}));
const registerNavigationCommandsMock = mock((..._args: unknown[]) => ({
  openEntityCommand: { dispose() {} },
  openEntityByIdCommand: { dispose() {} },
  openTreeItemSourceCommand: { dispose() {} },
  focusKnowledgeBaseCommand: { dispose() {} },
}));
const registerTraceabilityMock = mock((..._args: unknown[]) => ({
  relationshipCache: {},
  symbolIndex: null,
  browseLinkedEntitiesCommand: { dispose() {} },
  codeActionRegistration: { dispose() {} },
  codeLensRegistration: { dispose() {} },
  hoverRegistration: { dispose() {} },
}));
const registerContextOnOpenMock = mock((..._args: unknown[]) => {});

resetVscodeMock();
mock.module("vscode", () => getVscodeMockModule());
mock.module("../src/activation", () => ({
  validateMcpServerPath: (output: unknown) => validateMcpServerPathMock(output),
  resolveWorkspaceRoot: (output: unknown) => resolveWorkspaceRootMock(output),
  getWorkspaceFolderUri: (workspaceRoot: string) => getWorkspaceFolderUriMock(workspaceRoot),
  getCurrentBranch: (workspaceRoot: string) => getCurrentBranchMock(workspaceRoot),
  registerTreeView: (
    context: unknown,
    output: unknown,
    workspaceRoot: string,
    workspaceFolderUri: unknown,
  ) => registerTreeViewMock(context, output, workspaceRoot, workspaceFolderUri),
  registerBriefWatcher: (
    context: unknown,
    output: unknown,
    workspaceRoot: string,
    branch: string,
  ) => registerBriefWatcherMock(context, output, workspaceRoot, branch),
  registerNavigationCommands: (output: unknown, treeDataProvider: unknown) =>
    registerNavigationCommandsMock(output, treeDataProvider),
  registerTraceability: (
    context: unknown,
    output: unknown,
    workspaceRoot: string,
    treeDataProvider: unknown,
  ) => registerTraceabilityMock(context, output, workspaceRoot, treeDataProvider),
  registerContextOnOpen: (context: unknown, output: unknown, workspaceRoot: string) =>
    registerContextOnOpenMock(context, output, workspaceRoot),
}));

const vscode = getVscodeMockModule();
const extensionModule = await import("../src/extension");

function makeContext() {
  return { subscriptions: [] as unknown[] };
}

beforeEach(() => {
  resetVscodeMock();
  Object.assign(vscode.window as Record<string, unknown>, {
    createOutputChannel: mock((_name: string) => ({
      appendLine: mock((_message: string) => {}),
      dispose() {},
    })),
  });
  Object.assign(vscode.workspace as Record<string, unknown>, {
    registerTextDocumentContentProvider: mock((_scheme: string, _provider: unknown) => ({
      dispose() {},
    })),
    onDidChangeWorkspaceFolders: mock((listener: () => void) => {
      return { dispose() {}, listener };
    }),
  });
  resolveWorkspaceRootMock.mockImplementation((_output: unknown) => "/repo");
  registerTraceabilityMock.mockImplementation(() => ({
    relationshipCache: {},
    symbolIndex: null,
    browseLinkedEntitiesCommand: { dispose() {} },
    codeActionRegistration: { dispose() {} },
    codeLensRegistration: { dispose() {} },
    hoverRegistration: { dispose() {} },
  }));
});

afterEach(() => {
  mock.restore();
});

describe("extension activation", () => {
  test("activate initializes workspace features immediately", () => {
    const context = makeContext();

    extensionModule.activate(context as never);

    const createOutputChannel = vscode.window.createOutputChannel as ReturnType<typeof mock>;
    const output = createOutputChannel.mock.results[0]?.value as { appendLine: ReturnType<typeof mock> };

    expect(resolveWorkspaceRootMock).toHaveBeenCalled();
    expect(validateMcpServerPathMock).toHaveBeenCalled();
    expect(getWorkspaceFolderUriMock).toHaveBeenCalledWith("/repo");
    expect(getCurrentBranchMock).toHaveBeenCalledWith("/repo");
    expect(registerTreeViewMock).toHaveBeenCalled();
    expect(registerBriefWatcherMock).toHaveBeenCalledWith(expect.anything(), output, "/repo", "develop");
    expect(registerNavigationCommandsMock).toHaveBeenCalled();
    expect(registerTraceabilityMock).toHaveBeenCalled();
    expect(registerContextOnOpenMock).toHaveBeenCalledWith(expect.anything(), output, "/repo");
    expect(output.appendLine).toHaveBeenCalledWith("Activating Kibi extension...");
    expect(output.appendLine).toHaveBeenCalledWith("Kibi extension activation complete.");
    expect(context.subscriptions.length).toBeGreaterThan(1);
  });

  test("activate defers initialization until workspace becomes available", () => {
    resolveWorkspaceRootMock
      .mockImplementationOnce((_output: unknown) => undefined)
      .mockImplementationOnce((_output: unknown) => "/repo-late");
    const context = makeContext();

    extensionModule.activate(context as never);

    const createOutputChannel = vscode.window.createOutputChannel as ReturnType<typeof mock>;
    const output = createOutputChannel.mock.results[0]?.value as { appendLine: ReturnType<typeof mock> };
    const workspaceChange = context.subscriptions.find(
      (item) => typeof item === "object" && item !== null && "listener" in (item as Record<string, unknown>),
    ) as { listener: () => void } | undefined;
    if (!workspaceChange) throw new Error("Expected workspace folder listener");

    expect(output.appendLine).toHaveBeenCalledWith(
      "Workspace folder not available. Deferring activation until workspace opens...",
    );
    expect(registerTreeViewMock).not.toHaveBeenCalled();

    workspaceChange.listener();

    expect(registerTreeViewMock).toHaveBeenCalled();
    expect(getWorkspaceFolderUriMock).toHaveBeenCalledWith("/repo-late");
  });

  test("initializeWorkspaceFeatures remains idempotent across repeated workspace events", () => {
    resolveWorkspaceRootMock
      .mockImplementationOnce((_output: unknown) => undefined)
      .mockImplementation((_output: unknown) => "/repo-idempotent");
    const context = makeContext();

    extensionModule.activate(context as never);

    const createOutputChannel = vscode.window.createOutputChannel as ReturnType<typeof mock>;
    const output = createOutputChannel.mock.results[0]?.value as { appendLine: ReturnType<typeof mock> };
    const workspaceChange = context.subscriptions.find(
      (item) => typeof item === "object" && item !== null && "listener" in (item as Record<string, unknown>),
    ) as { listener: () => void } | undefined;
    if (!workspaceChange) throw new Error("Expected workspace folder listener");

    workspaceChange.listener();
    workspaceChange.listener();

    expect(registerTreeViewMock).toHaveBeenCalledTimes(1);
    expect(output.appendLine).toHaveBeenCalledWith(
      "Workspace features already initialized. Skipping duplicate initialization.",
    );
  });

  test("deactivate is a no-op", () => {
    expect(extensionModule.deactivate()).toBeUndefined();
  });
});
