import { afterEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { formatLensTitle } from "../../src/helpers";
import { parseRdfRelationships } from "../../src/shared/rdf-parser";
import {
  type VscodeMockOverrides,
  getVscodeMockModule,
  resetVscodeMock as resetState,
} from "../shared/vscode-mock";

function resetVscodeMock(overrides: VscodeMockOverrides = {}): void {
  resetState(overrides);
  mock.module("vscode", () => getVscodeMockModule());
}

resetVscodeMock();

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  resetVscodeMock();
});

function workspaceRoot(): string {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-vsc-ext-mut-")),
  );
  roots.push(root);
  fs.mkdirSync(path.join(root, ".kb"));
  return root;
}

type Tagged = { tag: string; dispose(): void };

/** A mock whose registrations are tagged, so subscriptions can be named. */
function taggedMock(options: {
  root?: string;
  failTraceability?: boolean;
  changeListeners?: Array<() => void>;
}) {
  const lines: string[] = [];
  const channels: string[] = [];
  const tagged = (tag: string): Tagged => ({ tag, dispose() {} });
  const fail = () => {
    throw new Error("unavailable");
  };
  const folders = options.root
    ? [{ uri: { fsPath: options.root, path: options.root, scheme: "file" } }]
    : undefined;
  resetVscodeMock({
    window: {
      createOutputChannel: (name: string) => {
        channels.push(name);
        return { tag: "output", appendLine: (l: string) => lines.push(l) };
      },
      createTreeView: () => tagged("treeView"),
    },
    workspace: {
      workspaceFolders: folders,
      createFileSystemWatcher: (pattern: { pattern: string }) => ({
        ...tagged(`watch:${pattern.pattern}`),
        onDidChange() {},
        onDidCreate() {},
        onDidDelete() {},
      }),
      onDidOpenTextDocument: () => tagged("onOpen"),
      onDidChangeWorkspaceFolders: (listener: () => void) => {
        options.changeListeners?.push(listener);
        return tagged("onFolders");
      },
    },
    commands: {
      registerCommand: (id: string) => tagged(id),
    },
    languages: options.failTraceability
      ? {
          registerCodeActionsProvider: fail,
          registerCodeLensProvider: fail,
          registerHoverProvider: fail,
        }
      : {
          registerCodeActionsProvider: () => tagged("codeActions"),
          registerCodeLensProvider: () => tagged("codeLens"),
          registerHoverProvider: () => tagged("hover"),
        },
  });
  return { lines, channels };
}

async function freshExtension() {
  return await import(
    `../../src/extension?mutation=${Date.now()}-${Math.random()}`
  );
}

function tags(
  subscriptions: Array<{ tag?: string }>,
): Array<string | undefined> {
  return subscriptions.map((entry) => entry.tag);
}

describe("activate", () => {
  test("a fresh load initializes the workspace and registers everything", async () => {
    const root = workspaceRoot();
    const { lines, channels } = taggedMock({ root });
    const { activate } = await freshExtension();
    const context = { subscriptions: [] as Array<{ tag?: string }> };
    activate(context as never);

    expect(channels).toEqual(["Kibi"]);
    expect(lines[0]).toBe("Activating Kibi extension...");
    expect(lines).toContain(
      "Kibi MCP server path is not configured and kibi-mcp was not found in PATH.",
    );
    expect(lines.at(-1)).toBe("Kibi extension activation complete.");
    expect(tags(context.subscriptions)).toEqual([
      "output",
      "watch:.kb/{symbols.yaml,symbol-coordinates.yaml}",
      "watch:.kb/{symbols.yaml,symbol-coordinates.yaml}",
      "watch:.kb/branches/**/kb.rdf",
      "onOpen",
      "kibi.showSignoff",
      "watch:.kb/briefs/signoff/latest.json",
      "watch:.kb/branches/**/kb.rdf",
      "treeView",
      "kibi.refreshTree",
      "kibi.openEntity",
      "kibi.openEntityById",
      "kibi.openTreeItemSource",
      "kibi.focusKnowledgeBase",
      "kibi.browseLinkedEntities",
      "codeActions",
      "codeLens",
      "hover",
    ]);
  });

  test("failed traceability parts leave no empty subscriptions", async () => {
    const root = workspaceRoot();
    taggedMock({ root, failTraceability: true });
    const { activate } = await freshExtension();
    const context = { subscriptions: [] as Array<{ tag?: string }> };
    activate(context as never);
    expect(tags(context.subscriptions).slice(-2)).toEqual([
      "kibi.focusKnowledgeBase",
      "kibi.browseLinkedEntities",
    ]);
  });

  test("without a workspace it waits for a folder that resolves", async () => {
    const changeListeners: Array<() => void> = [];
    const { lines } = taggedMock({ changeListeners });
    const { activate } = await freshExtension();
    const context = { subscriptions: [] as Array<{ tag?: string }> };
    activate(context as never);
    expect(tags(context.subscriptions)).toEqual(["output", "onFolders"]);
    expect(lines.at(-1)).toBe(
      "Workspace folder not available. Deferring activation until workspace opens...",
    );

    // A change that still resolves no workspace initializes nothing.
    changeListeners[0]?.();
    expect(tags(context.subscriptions)).toEqual(["output", "onFolders"]);
  });
});

describe("formatLensTitle labels", () => {
  test("the other category and unknown ones get plain labels", () => {
    expect(formatLensTitle({ other: ["X-1"] }, [])).toBe(" 1 other");
    expect(formatLensTitle({ widgets: ["W-1"] }, [])).toBe(" 1 widget");
  });
});

describe("parseRdfRelationships", () => {
  test("reads every predicate of every description block", () => {
    const rdf = [
      '<rdf:Description rdf:about="urn:kibi:entity/SYM-1">',
      '  <kb:implements rdf:resource="http://kibi.dev/kb/entity/REQ-1"/>',
      '  <kb:implements rdf:resource="kb:entity/REQ-2"/>',
      "</rdf:Description>",
      '<rdf:Description rdf:about="kb:entity/TEST-1">',
      '  <kb:covered_by rdf:resource="kb:entity/REQ-3"/>',
      "</rdf:Description>",
    ].join("\n");
    expect(parseRdfRelationships(rdf)).toEqual([
      { relType: "implements", fromId: "SYM-1", toId: "REQ-1" },
      { relType: "implements", fromId: "SYM-1", toId: "REQ-2" },
      { relType: "covered_by", fromId: "TEST-1", toId: "REQ-3" },
    ]);
  });
});
