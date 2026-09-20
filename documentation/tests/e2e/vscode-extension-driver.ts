/*
 * VS Code extension e2e driver.
 *
 * Loaded by vscode-extension-lifecycle.e2e.ts as a bun child process against a
 * real sandbox workspace whose KB was produced by the real `kibi` CLI. The
 * driver installs the shared vscode API mock at the module boundary, requires
 * the BUILT dist/extension.js bundle (the shipped artifact, not the sources),
 * activates it, and drives the tree, navigation, code lens, and
 * context-on-open surfaces. Assertions print as a JSON result envelope.
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { mock } from "bun:test";
import {
  getVscodeMockModule,
  resetVscodeMock,
} from "../../../packages/vscode/tests/shared/vscode-mock";

const require = createRequire(import.meta.url);

type Result = {
  ok: boolean;
  failures: string[];
  evidence: Record<string, unknown>;
};

const failures: string[] = [];
const evidence: Record<string, unknown> = {};

function expect(condition: unknown, message: string): void {
  if (!condition) failures.push(message);
}

const registeredCommands = new Map<string, unknown>();
const codeLensProviders: Array<{ selector: unknown; provider: unknown }> = [];

resetVscodeMock();
mock.module("vscode", () => getVscodeMockModule());
const vscode = getVscodeMockModule() as ReturnType<
  typeof getVscodeMockModule
> & {
  languages: {
    registerCodeLensProvider: (selector: unknown, provider: unknown) => unknown;
  };
  commands: {
    registerCommand: (id: string, cb: unknown) => unknown;
    executeCommand: (command: string, ...args: unknown[]) => Promise<unknown>;
  };
};

// Capture command + code-lens registrations without disturbing the mock.
const originalRegisterCommand = vscode.commands.registerCommand;
vscode.commands.registerCommand = mock((commandId: string, callback: unknown) => {
  registeredCommands.set(commandId, callback);
  return originalRegisterCommand(commandId, callback);
}) as never;
const originalRegisterCodeLens = vscode.languages.registerCodeLensProvider;
vscode.languages.registerCodeLensProvider = mock(
  (selector: unknown, provider: unknown) => {
    codeLensProviders.push({ selector, provider });
    return originalRegisterCodeLens(selector, provider);
  },
) as never;

// The MCP boundary answers kb_query for the context-on-open surface.
const executedCommands: Array<{ command: string; args: unknown[] }> = [];
vscode.commands.executeCommand = mock(
  async (command: string, ...args: unknown[]) => {
    executedCommands.push({ command, args });
    if (command === "kibi-mcp.kb_query") {
      return {
        structuredContent: { entities: [{ id: "REQ-E2E-001" }] },
      };
    }
    return undefined;
  },
) as never;

const workspaceRoot = process.argv[2] ?? "";
const distPath = process.argv[3] ?? "";
if (!workspaceRoot || !distPath) {
  console.error("usage: vscode-extension-driver.ts <workspaceRoot> <dist>");
  process.exit(2);
}

// Wire the workspace before activation so features initialize immediately.
Object.assign(vscode.workspace as Record<string, unknown>, {
  workspaceFolders: [
    { uri: { fsPath: workspaceRoot, path: workspaceRoot, scheme: "file" } },
  ],
});

const showTextDocumentCalls: unknown[] = [];
const openTextDocumentCalls: unknown[] = [];
const infoMessages: string[] = [];
(vscode.window as unknown as Record<string, unknown>).showTextDocument = mock(
  async (doc: unknown) => {
    showTextDocumentCalls.push(doc);
    return {
      selection: undefined,
      revealRange: (_range: unknown) => undefined,
    };
  },
) as never;
(vscode.workspace as unknown as Record<string, unknown>).openTextDocument =
  mock(async (uri: unknown) => {
    openTextDocumentCalls.push(uri);
    const fsPath = (uri as { fsPath: string }).fsPath;
    return {
      uri,
      lineCount: 40,
      fileName: fsPath,
    };
  }) as never;
(vscode.window as unknown as Record<string, unknown>).showInformationMessage =
  mock(async (message: string) => {
    infoMessages.push(message);
    return undefined;
  }) as never;

const extension = require(distPath) as {
  activate: (context: unknown) => void;
};
const subscriptions: unknown[] = [];
extension.activate({ subscriptions });

type TreeItemLike = {
  label?: string;
  id?: string;
  contextValue?: string;
  collapsibleState?: number;
  children?: TreeItemLike[];
  localPath?: string;
  sourceLine?: number;
  targetId?: string;
};

const treeViewCalls = (
  vscode.window as unknown as {
    createTreeViewCalls: Array<{
      id: string;
      options: { treeDataProvider: unknown };
    }>;
  }
).createTreeViewCalls;

expect(treeViewCalls.length === 1, `expected one tree view registration`);
const treeDataProvider = treeViewCalls[0]?.options
  .treeDataProvider as unknown as {
  getChildren: (element?: TreeItemLike) => Promise<TreeItemLike[]>;
  getTreeItem: (element: TreeItemLike) => {
    label?: string;
    collapsibleState?: number;
    command?: { command: string; arguments?: unknown[] };
  };
  getNavigationTargetForEntity: (
    entityId: string,
  ) => { localPath: string; line?: number } | undefined;
  getLocalPathForEntity: (entityId: string) => string | undefined;
};
evidence.treeViewId = treeViewCalls[0]?.id;

// ── Structural tree: category → entity → linked relationships ──────────────
const roots = await treeDataProvider.getChildren();
const rootLabels = roots.map((node) => node.label);
evidence.rootLabels = rootLabels;
expect(
  rootLabels.some((label) => label?.startsWith("Requirements")),
  "requirements category missing",
);
const requirementsRoot = roots.find((node) =>
  node.label?.startsWith("Requirements"),
) as TreeItemLike;
const requirementNodes = await treeDataProvider.getChildren(requirementsRoot);
const requirementNode = requirementNodes.find(
  (node) =>
    node.id === "REQ-E2E-001" ||
    node.label?.includes("REQ-E2E-001") ||
    (node.targetId === "REQ-E2E-001"),
);
expect(!!requirementNode, `REQ-E2E-001 missing from the tree`);
const requirementTreeItem = requirementNode
  ? treeDataProvider.getTreeItem(requirementNode)
  : undefined;
expect(
  requirementTreeItem?.collapsibleState === 1,
  "the requirement node must be expandable",
);
if (requirementNode) {
  const requirementChildren = await treeDataProvider.getChildren(requirementNode);
  evidence.requirementChildLabels = requirementChildren.map((c) => c.label);
  expect(
    requirementChildren.some((child) => child.label?.includes("SCEN-E2E-001")),
    "the scenario must appear under the requirement",
  );
}

const symbolsRoot = roots.find((node) =>
  node.label?.startsWith("Symbols"),
);
const symbolNodes = symbolsRoot
  ? await treeDataProvider.getChildren(symbolsRoot)
  : [];
const symbolNode = symbolNodes.find(
  (node) =>
    node.label?.includes("SYM-FEATURE-HELLO") ||
    node.targetId === "SYM-FEATURE-HELLO",
);
expect(!!symbolNode, "SYM-FEATURE-HELLO missing from the symbols category");
const symbolTreeItem = symbolNode
  ? treeDataProvider.getTreeItem(symbolNode)
  : undefined;
expect(
  symbolTreeItem?.command?.command === "kibi.openEntity",
  "the symbol node must carry an open-file command",
);
if (symbolTreeItem?.command?.arguments) {
  const [openedPath, openedLine] = symbolTreeItem.command.arguments as [
    string,
    number | undefined,
  ];
  evidence.symbolNavigation = { openedPath, openedLine };
  expect(
    openedPath.endsWith("src/feature.ts"),
    `navigation must resolve the real source file, got ${openedPath}`,
  );
  expect(
    typeof openedLine === "number" && openedLine >= 1,
    `navigation must carry the real 1-based line, got ${openedLine}`,
  );
}

// ── Navigation: ID-based command opens the resolved file at the line ───────
const navigationTarget =
  treeDataProvider.getNavigationTargetForEntity("SYM-FEATURE-HELLO");
expect(
  navigationTarget?.localPath?.endsWith("src/feature.ts") ??
    false === true,
  `navigation target must resolve, got ${JSON.stringify(navigationTarget)}`,
);
const openEntityById = registeredCommands.get("kibi.openEntityById") as
  | ((entityId: string) => Promise<void>)
  | undefined;
expect(!!openEntityById, "kibi.openEntityById must be registered");
if (openEntityById) {
  await openEntityById("SYM-FEATURE-HELLO");
  expect(
    openTextDocumentCalls.length === 1,
    "opening an entity must open its document",
  );
  const openedUri = openTextDocumentCalls[0] as { fsPath: string };
  expect(
    openedUri.fsPath.endsWith("src/feature.ts"),
    `the opened document must be the symbol's file, got ${openedUri.fsPath}`,
  );
  expect(
    showTextDocumentCalls.length === 1,
    "the editor must reveal the document",
  );
}

// ── Source-to-KB: code lenses bind indexed symbols to their files ──────────
const codeLensProvider = codeLensProviders[0]?.provider as unknown as {
  provideCodeLenses: (
    document: { uri: { fsPath: string } },
    token: { isCancellationRequested: boolean },
  ) => Array<{ range: unknown }> | null;
};
expect(!!codeLensProvider, "a code lens provider must be registered");
if (codeLensProvider) {
  const lenses = codeLensProvider.provideCodeLenses(
    { uri: { fsPath: join(workspaceRoot, "src", "feature.ts") } },
    { isCancellationRequested: false },
  );
  evidence.codeLensCount = lenses?.length ?? 0;
  expect(
    (lenses?.length ?? 0) >= 1,
    "the indexed symbol must yield a code lens on its source file",
  );
  const foreignLenses = codeLensProvider.provideCodeLenses(
    { uri: { fsPath: join(workspaceRoot, "src", "unrelated.ts") } },
    { isCancellationRequested: false },
  );
  expect(
    foreignLenses === null || foreignLenses.length === 0,
    "files without indexed symbols must not produce lenses",
  );
}

// ── Source-to-KB: opening a linked file surfaces the KB context ────────────
const emitOpen = (
  vscode.workspace as unknown as {
    emitOpenTextDocument: (value: unknown) => void;
  }
).emitOpenTextDocument;
emitOpen({
  uri: { fsPath: join(workspaceRoot, "src", "feature.ts"), scheme: "file" },
});
await new Promise((resolve) => setTimeout(resolve, 50));
const kbQuery = executedCommands.find(
  (call) => call.command === "kibi-mcp.kb_query",
);
expect(!!kbQuery, "opening a linked file must query the KB context");
expect(
  infoMessages.some((message) =>
    message.includes("1 KB entities linked to this file"),
  ),
  "the linked-entity count must surface to the user",
);
evidence.contextMessages = infoMessages;

const result: Result = { ok: failures.length === 0, failures, evidence };
console.log(JSON.stringify(result));
process.exit(failures.length === 0 ? 0 : 1);
