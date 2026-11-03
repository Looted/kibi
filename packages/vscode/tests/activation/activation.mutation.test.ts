import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  type DefaultFileSystemWatcher,
  type DefaultRelativePattern,
  type VscodeMockOverrides,
  getVscodeMockModule,
  resetVscodeMock as resetState,
} from "../shared/vscode-mock";

/** Swaps the mock state and re-registers the module, whose exports bun
 *  captures when it is mocked. */
function resetVscodeMock(overrides: VscodeMockOverrides = {}): void {
  resetState(overrides);
  mock.module("vscode", () => getVscodeMockModule());
}

resetVscodeMock();

const vscode = getVscodeMockModule() as unknown as {
  window: Record<string, ReturnType<typeof mock>> & {
    createTreeViewCalls: Array<{ id: string; options: unknown }>;
  };
  workspace: Record<string, ReturnType<typeof mock>>;
  commands: Record<string, ReturnType<typeof mock>> & {
    registerCommandCalls: Array<{ commandId: string; callback: unknown }>;
  };
  languages: Record<string, ReturnType<typeof mock>>;
};

const { findKibiMcpInPath, validateMcpServerPath } = await import(
  "../../src/activation/mcp"
);
const { registerNavigationCommands } = await import(
  "../../src/activation/navigation"
);
const { registerSignoff, signoffAnnouncement, SIGNOFF_COMMAND } = await import(
  "../../src/activation/signoff"
);
const { registerTraceability } = await import(
  "../../src/activation/traceability"
);
const {
  registerContextOnOpen,
  _setContextOnOpenFsDepsForTests,
  _resetContextOnOpenFsDepsForTests,
} = await import("../../src/activation/contextOnOpen");
const { registerTreeView } = await import("../../src/activation/treeView");
const { resolveWorkspaceRoot, getWorkspaceFolderUri } = await import(
  "../../src/activation/workspace"
);

const roots: string[] = [];
const realPlatform = process.platform;
const realHome = process.env.HOME;
const realEnvRoot = process.env.KIBI_WORKSPACE_ROOT;

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  Object.defineProperty(process, "platform", { value: realPlatform });
  process.env.HOME = realHome;
  if (realEnvRoot === undefined)
    Reflect.deleteProperty(process.env, "KIBI_WORKSPACE_ROOT");
  else process.env.KIBI_WORKSPACE_ROOT = realEnvRoot;
  _resetContextOnOpenFsDepsForTests();
  resetVscodeMock();
});

afterAll(() => {
  resetVscodeMock();
});

function tempRoot(): string {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-vsc-act-mut-")),
  );
  roots.push(root);
  return root;
}

function outputChannel() {
  const lines: string[] = [];
  return { lines, appendLine: (line: string) => lines.push(line) };
}

/** Lets `.then` callbacks of already-settled promises run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

function command(id: string): (...args: unknown[]) => Promise<void> | void {
  const call = vscode.commands.registerCommandCalls.find(
    (entry) => entry.commandId === id,
  );
  return call?.callback as (...args: unknown[]) => Promise<void> | void;
}

function configuration(values: Record<string, unknown>) {
  const sections: Array<string | undefined> = [];
  const getConfiguration = mock((section?: string) => {
    sections.push(section);
    return {
      get: <T>(key: string, defaultValue?: T) =>
        (key in values ? values[key] : defaultValue) as T,
    };
  });
  return { sections, getConfiguration };
}

describe("findKibiMcpInPath", () => {
  test("asks `which` on POSIX and returns the first existing listed path", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    const execSync = mock(
      (..._args: unknown[]) => "\n  /opt/a/kibi-mcp  \r\n/opt/b/kibi-mcp\n",
    );
    const existsSync = mock((p: string) => p === "/opt/a/kibi-mcp");
    expect(
      findKibiMcpInPath({ execSync: execSync as never, existsSync } as never),
    ).toBe("/opt/a/kibi-mcp");
    expect(execSync.mock.calls).toEqual([
      [
        "which kibi-mcp",
        { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] },
      ],
    ]);
    expect(existsSync.mock.calls).toEqual([["/opt/a/kibi-mcp"]]);
  });

  test("asks `where` on Windows", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    const execSync = mock((..._args: unknown[]) => "C:\\kibi-mcp.cmd\n");
    findKibiMcpInPath({
      execSync: execSync as never,
      existsSync: () => true,
    } as never);
    expect(execSync.mock.calls[0]?.[0]).toBe("where kibi-mcp");
  });

  test("falls back to the common install locations in order", () => {
    process.env.HOME = "/home/u";
    const checked: string[] = [];
    const deps = {
      execSync: () => {
        throw new Error("not found");
      },
      existsSync: (p: string) => {
        checked.push(p);
        return false;
      },
    };
    expect(findKibiMcpInPath(deps as never)).toBeUndefined();
    expect(checked).toEqual([
      "/usr/local/bin/kibi-mcp",
      "/usr/bin/kibi-mcp",
      "/home/u/.local/bin/kibi-mcp",
      "/home/u/.bun/bin/kibi-mcp",
    ]);

    Reflect.deleteProperty(process.env, "HOME");
    checked.length = 0;
    findKibiMcpInPath(deps as never);
    expect(checked.slice(2)).toEqual([
      ".local/bin/kibi-mcp",
      ".bun/bin/kibi-mcp",
    ]);

    expect(
      findKibiMcpInPath({
        execSync: () => "/listed/but/missing\n",
        existsSync: (p: string) => p === "/usr/bin/kibi-mcp",
      } as never),
    ).toBe("/usr/bin/kibi-mcp");
  });
});

describe("validateMcpServerPath", () => {
  function setup(values: Record<string, unknown>, selection?: string) {
    const config = configuration(values);
    const showWarningMessage = mock(async (..._args: unknown[]) => selection);
    const showErrorMessage = mock(async (..._args: unknown[]) => selection);
    const executeCommand = mock(async (..._args: unknown[]) => undefined);
    resetVscodeMock({
      workspace: { getConfiguration: config.getConfiguration },
      window: { showWarningMessage, showErrorMessage },
      commands: { executeCommand },
    });
    return { config, showWarningMessage, showErrorMessage, executeCommand };
  }

  const notFound = {
    execSync: () => {
      throw new Error("not found");
    },
    existsSync: () => false,
  };

  test("reads kibi.mcp.serverPath and accepts an existing path as written", () => {
    const { config } = setup({ "mcp.serverPath": " /srv/kibi-mcp" });
    const output = outputChannel();
    const existsSync = mock((p: string) => p === " /srv/kibi-mcp");
    validateMcpServerPath(output as never, { existsSync } as never);
    expect(config.sections).toEqual(["kibi"]);
    expect(output.lines).toEqual([
      "Kibi MCP server path validated:  /srv/kibi-mcp",
    ]);
  });

  test.each([[undefined], [""], ["   "]])(
    "an unset or blank path (%p) is auto-detected",
    (value) => {
      setup(value === undefined ? {} : { "mcp.serverPath": value });
      const output = outputChannel();
      validateMcpServerPath(
        output as never,
        {
          execSync: () => "/found/kibi-mcp\n",
          existsSync: (p: string) => p === "/found/kibi-mcp",
        } as never,
      );
      expect(output.lines).toEqual([
        "Auto-detected kibi-mcp at: /found/kibi-mcp",
        "Kibi MCP server path validated: /found/kibi-mcp",
      ]);
    },
  );

  test("nothing found: warns and offers the settings", async () => {
    const { showWarningMessage, executeCommand } = setup({}, "Open Settings");
    const output = outputChannel();
    validateMcpServerPath(output as never, notFound as never);
    await settle();
    const message =
      "Kibi MCP server path is not configured and kibi-mcp was not found in PATH.";
    expect(output.lines).toEqual([message]);
    expect(showWarningMessage.mock.calls).toEqual([[message, "Open Settings"]]);
    expect(executeCommand.mock.calls).toEqual([
      ["workbench.action.openSettings", "kibi.mcp.serverPath"],
    ]);
  });

  test("dismissing the warning opens nothing", async () => {
    const { executeCommand } = setup({});
    validateMcpServerPath(outputChannel() as never, notFound as never);
    await settle();
    expect(executeCommand).not.toHaveBeenCalled();
  });

  test("a configured path that does not exist is an error", async () => {
    const { showErrorMessage, executeCommand } = setup(
      { "mcp.serverPath": "/gone" },
      "Open Settings",
    );
    const output = outputChannel();
    validateMcpServerPath(output as never, notFound as never);
    await settle();
    expect(output.lines).toEqual([
      "Kibi MCP server not found at configured path: /gone",
    ]);
    expect(showErrorMessage.mock.calls).toEqual([
      [
        "Kibi MCP server not found at configured path. Please check your settings.",
        "Open Settings",
      ],
    ]);
    expect(executeCommand.mock.calls).toEqual([
      ["workbench.action.openSettings", "kibi.mcp.serverPath"],
    ]);
  });

  test("dismissing the error opens nothing", async () => {
    const { executeCommand } = setup({ "mcp.serverPath": "/gone" }, "Later");
    validateMcpServerPath(outputChannel() as never, notFound as never);
    await settle();
    expect(executeCommand).not.toHaveBeenCalled();
  });
});

describe("registerNavigationCommands", () => {
  function setup() {
    resetVscodeMock();
    const output = outputChannel();
    return { output };
  }

  test("registers the four commands and returns their disposables", () => {
    const { output } = setup();
    const result = registerNavigationCommands(output as never, {
      getLocalPathForEntity: () => undefined,
    });
    expect(Object.keys(result)).toEqual([
      "openEntityCommand",
      "openEntityByIdCommand",
      "openTreeItemSourceCommand",
      "focusKnowledgeBaseCommand",
    ]);
    for (const disposable of Object.values(result)) {
      expect(typeof disposable.dispose).toBe("function");
    }
    expect(output.lines).toEqual(["Navigation commands registered."]);
  });

  test("open by id falls back to the local path without a navigation lookup", async () => {
    setup();
    registerNavigationCommands(outputChannel() as never, {
      getLocalPathForEntity: (id) => (id === "REQ-1" ? "/w/req.md" : undefined),
    });
    await command("kibi.openEntityById")("REQ-1");
    expect(vscode.workspace.openTextDocument.mock.calls[0]?.[0]).toEqual({
      fsPath: "/w/req.md",
      path: "/w/req.md",
      scheme: "file",
    });
    await command("kibi.openEntityById")("REQ-2");
    expect(vscode.window.showInformationMessage.mock.calls).toEqual([
      ['Kibi: Entity "REQ-2" has no local source file.'],
    ]);
  });

  test("tree items without a source path say so", async () => {
    setup();
    registerNavigationCommands(outputChannel() as never, {
      getLocalPathForEntity: () => undefined,
    });
    await command("kibi.openTreeItemSource")();
    await command("kibi.openTreeItemSource")({ label: "REQ-9" });
    expect(vscode.window.showInformationMessage.mock.calls).toEqual([
      ["Kibi: This item has no local source file."],
      ["Kibi: REQ-9 has no local source file."],
    ]);
  });
});

describe("signoffAnnouncement", () => {
  test("counts questions without a non-blank string answer", () => {
    expect(
      signoffAnnouncement(
        JSON.stringify({
          kind: "questions",
          questions: [
            {},
            { answer: "  " },
            { answer: 3 },
            { answer: "yes" },
            { answer: " no " },
          ],
        }),
      ),
    ).toStrictEqual({
      message: "Kibi: 3 decisions wait for your answer.",
      openLabel: "Show decisions",
    });
    expect(
      signoffAnnouncement(
        JSON.stringify({ kind: "questions", questions: [{ answer: "" }] }),
      ),
    ).toStrictEqual({
      message: "Kibi: 1 decision waits for your answer.",
      openLabel: "Show decisions",
    });
  });

  test("each kind needs its own list", () => {
    expect(
      signoffAnnouncement(
        JSON.stringify({
          kind: "summary",
          requirements: [{}],
          questions: [{}],
        }),
      ),
    ).toStrictEqual({
      message: "Kibi: requirements signoff ready (1 requirement).",
      openLabel: "Show signoff",
    });
    expect(
      signoffAnnouncement(
        JSON.stringify({ kind: "questions", requirements: [{}], questions: 1 }),
      ),
    ).toBeUndefined();
    expect(
      signoffAnnouncement(JSON.stringify({ kind: "summary", requirements: 2 })),
    ).toBeUndefined();
    expect(
      signoffAnnouncement(JSON.stringify({ kind: "other", questions: [{}] })),
    ).toBeUndefined();
  });
});

describe("registerSignoff", () => {
  function setup(choice?: string) {
    const panels: Array<{ webview: { html: string } }> = [];
    const showInformationMessage = mock(async (..._args: unknown[]) => choice);
    resetVscodeMock({
      window: {
        showInformationMessage,
        createWebviewPanel: mock((..._args: unknown[]) => {
          const panel = {
            webview: { html: "" },
            reveal() {},
            onDidDispose() {},
          };
          panels.push(panel);
          return panel;
        }),
      },
    });
    const root = tempRoot();
    const output = outputChannel();
    const context = { subscriptions: [] as unknown[] };
    const disposables = registerSignoff(
      context as never,
      output as never,
      root,
    );
    const watcher = vscode.workspace.createFileSystemWatcher.mock.results[0]
      ?.value as DefaultFileSystemWatcher;
    return {
      root,
      output,
      panels,
      showInformationMessage,
      watcher,
      disposables,
    };
  }

  function writeView(root: string, view: unknown) {
    const dir = path.join(root, ".kb", "briefs", "signoff");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "latest.json"), JSON.stringify(view));
  }

  test("registers the command and watches the latest view", () => {
    const { root, watcher, disposables } = setup();
    expect(SIGNOFF_COMMAND).toBe("kibi.showSignoff");
    expect(vscode.commands.registerCommandCalls[0]?.commandId).toBe(
      "kibi.showSignoff",
    );
    const pattern = watcher.pattern as DefaultRelativePattern;
    expect([pattern.base, pattern.pattern]).toEqual([
      root,
      ".kb/briefs/signoff/latest.json",
    ]);
    expect(disposables).toHaveLength(2);
  });

  test("an unreadable or empty view announces nothing", async () => {
    const { root, output, showInformationMessage, watcher } = setup();
    watcher.emitCreate();
    writeView(root, { kind: "questions", questions: [] });
    watcher.emitChange();
    await settle();
    expect(output.lines).toEqual([]);
    expect(showInformationMessage).not.toHaveBeenCalled();
  });

  test("a new view is logged and announced; declining opens nothing", async () => {
    const { root, output, panels, showInformationMessage, watcher } =
      setup("Later");
    writeView(root, { kind: "summary", requirements: [] });
    watcher.emitChange();
    await settle();
    expect(output.lines).toEqual([
      "Kibi: requirements signoff ready (0 requirements).",
    ]);
    expect(showInformationMessage.mock.calls).toEqual([
      ["Kibi: requirements signoff ready (0 requirements).", "Show signoff"],
    ]);
    expect(panels).toEqual([]);
  });
});

describe("registerTraceability", () => {
  const selector = [{ language: "typescript" }, { language: "javascript" }];

  function setup(overrides: Record<string, unknown> = {}) {
    const showWarningMessage = mock((..._args: unknown[]) => undefined);
    const showQuickPick = mock(async (..._args: unknown[]) => undefined);
    const showInformationMessage = mock(
      async (..._args: unknown[]) => undefined,
    );
    resetVscodeMock({
      window: { showWarningMessage, showQuickPick, showInformationMessage },
      languages: overrides,
    });
    return { showWarningMessage, showQuickPick, showInformationMessage };
  }

  test("registers the providers for TypeScript and JavaScript", () => {
    setup();
    const root = tempRoot();
    const output = outputChannel();
    registerTraceability(
      { subscriptions: [] } as never,
      output as never,
      root,
      { getLocalPathForEntity: () => undefined },
    );
    const actions = vscode.languages.registerCodeActionsProvider.mock.calls[0];
    expect(actions?.[0]).toEqual(selector);
    expect(actions?.[2]).toEqual({ providedCodeActionKinds: ["empty-kind"] });
    expect(
      vscode.languages.registerCodeLensProvider.mock.calls[0]?.[0],
    ).toEqual(selector);
    expect(vscode.languages.registerHoverProvider.mock.calls[0]?.[0]).toEqual(
      selector,
    );
    expect(output.lines).toEqual([
      "Traceability code actions initialized.",
      "CodeLens indicators initialized.",
      "Hover provider initialized.",
    ]);
  });

  test("each provider failure is reported and the others still register", () => {
    const fail = (what: string) => () => {
      throw new Error(`${what} broke`);
    };
    const { showWarningMessage } = setup({
      registerCodeActionsProvider: fail("actions"),
      registerCodeLensProvider: fail("lens"),
      registerHoverProvider: fail("hover"),
    });
    const output = outputChannel();
    const result = registerTraceability(
      { subscriptions: [] } as never,
      output as never,
      tempRoot(),
      { getLocalPathForEntity: () => undefined },
    );
    expect(output.lines).toEqual([
      "Traceability initialization failed: actions broke",
      "CodeLens initialization failed: lens broke",
      "Hover provider initialization failed: hover broke",
    ]);
    expect(showWarningMessage.mock.calls).toEqual([
      [
        "Kibi traceability actions failed to initialize. Knowledge Base view remains available.",
      ],
      [
        "Kibi CodeLens indicators failed to initialize. Knowledge Base view remains available.",
      ],
      [
        "Kibi hover provider failed to initialize. Knowledge Base view remains available.",
      ],
    ]);
    expect(result.symbolIndex).toStrictEqual({
      byTitle: new Map(),
      byFile: new Map(),
      byId: new Map(),
    });
  });

  test("browsing linked entities tolerates missing relationships and lookups", async () => {
    const { showQuickPick, showInformationMessage } = setup();
    registerTraceability(
      { subscriptions: [] } as never,
      outputChannel() as never,
      tempRoot(),
      {
        getLocalPathForEntity: (id) => (id === "REQ-1" ? "/w/r.md" : undefined),
      },
    );
    const browse = command("kibi.browseLinkedEntities");
    await browse("SYM-1", undefined);
    expect(showInformationMessage.mock.calls).toEqual([
      ['No linked entities found for symbol "SYM-1".'],
    ]);
    await browse("SYM-1", [
      { type: "implements", from: "SYM-1", to: "REQ-1" },
      { type: "implements", from: "SYM-1", to: "REQ-2" },
    ]);
    expect(showQuickPick.mock.calls[0]?.[0]).toEqual([
      { label: "REQ-1", description: "r.md", detail: "/w/r.md" },
      { label: "REQ-2", description: "(no local file)" },
    ]);
  });
});

describe("registerContextOnOpen", () => {
  function setup(result: unknown, enabled?: boolean) {
    const config = configuration(
      enabled === undefined ? {} : { contextOnOpen: enabled },
    );
    const executeCommand = mock(async (..._args: unknown[]) => {
      if (result instanceof Error) throw result;
      return result;
    });
    const showInformationMessage = mock(
      async (..._args: unknown[]) => undefined,
    );
    resetVscodeMock({
      workspace: { getConfiguration: config.getConfiguration },
      commands: { executeCommand },
      window: { showInformationMessage },
    });
    const root = tempRoot();
    fs.mkdirSync(path.join(root, ".kb"));
    const output = outputChannel();
    const context = { subscriptions: [] as unknown[] };
    registerContextOnOpen(context as never, output as never, root);
    const open = async (fsPath: string, scheme = "file") => {
      (
        vscode.workspace as unknown as {
          emitOpenTextDocument: (doc: unknown) => void;
        }
      ).emitOpenTextDocument({ uri: { fsPath, scheme } });
      await settle();
    };
    return {
      root,
      output,
      context,
      config,
      executeCommand,
      showInformationMessage,
      open,
    };
  }

  test("results without an entity list say nothing", async () => {
    for (const result of [undefined, {}, { structuredContent: {} }]) {
      const { root, output, showInformationMessage, open } = setup(result);
      await open(path.join(root, "src", "a.ts"));
      expect(output.lines).toEqual([
        "Context on file open listener registered.",
      ]);
      expect(showInformationMessage).not.toHaveBeenCalled();
    }
  });

  test("the reset helper restores the real file check", async () => {
    const { root, executeCommand, open } = setup({
      structuredContent: { entities: [{}, {}] },
    });
    _setContextOnOpenFsDepsForTests({ existsSync: () => false });
    _resetContextOnOpenFsDepsForTests();
    await open(path.join(root, "src", "a.ts"));
    expect(executeCommand.mock.calls).toEqual([
      ["kibi-mcp.kb_query", { sourceFile: path.join("src", "a.ts") }],
    ]);
  });
});

describe("registerTreeView", () => {
  test("creates the view with collapse-all and watches branch RDF files", () => {
    resetVscodeMock();
    const root = tempRoot();
    const output = outputChannel();
    const uri = { fsPath: root };
    const result = registerTreeView(
      { subscriptions: [] } as never,
      output as never,
      root,
      uri as never,
    );
    expect(vscode.window.createTreeViewCalls).toEqual([
      {
        id: "kibi-knowledge-base",
        options: {
          treeDataProvider: result.treeDataProvider,
          showCollapseAll: true,
        },
      },
    ]);
    expect(output.lines).toEqual(["Tree view registered: kibi-knowledge-base"]);
    const pattern = (result.watcher as unknown as DefaultFileSystemWatcher)
      .pattern as DefaultRelativePattern;
    expect([pattern.base, pattern.pattern]).toEqual([
      uri,
      ".kb/branches/**/kb.rdf",
    ]);
  });
});

describe("resolveWorkspaceRoot", () => {
  function setup(workspaceFolders: unknown) {
    resetVscodeMock({ workspace: { workspaceFolders } });
    return outputChannel();
  }

  test("an empty folder list falls back to KIBI_WORKSPACE_ROOT", () => {
    const root = tempRoot();
    fs.mkdirSync(path.join(root, ".kb"));
    fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
    process.env.KIBI_WORKSPACE_ROOT = root;
    const output = setup([]);
    expect(resolveWorkspaceRoot(output as never)).toBe(root);
    expect(output.lines).toEqual([
      `No workspace folder attached; using KIBI_WORKSPACE_ROOT fallback: ${root}`,
      `Workspace root: ${root}`,
    ]);
  });

  test("an attached folder wins over KIBI_WORKSPACE_ROOT", () => {
    const root = tempRoot();
    fs.mkdirSync(path.join(root, ".kb"));
    fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
    process.env.KIBI_WORKSPACE_ROOT = root;
    const output = setup([{ uri: { fsPath: "/attached" } }]);
    expect(resolveWorkspaceRoot(output as never)).toBe("/attached");
    expect(output.lines).toEqual(["Workspace root: /attached"]);
  });

  test("the folder URI comes from the matching workspace folder", () => {
    const uri = { fsPath: "/attached" };
    setup([{ uri: { fsPath: "/other" } }, { uri }]);
    expect(getWorkspaceFolderUri("/attached")).toBe(uri as never);
  });
});
