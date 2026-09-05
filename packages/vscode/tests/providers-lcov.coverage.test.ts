/**
 * Regular (non-query-string) imports for VS Code providers so Bun LCOV records
 * hits that query-string test modules miss.
 */
import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildIndex } from "../src/symbolIndex";
import {
  getVscodeMockModule,
  resetVscodeMock,
} from "./shared/vscode-mock";

resetVscodeMock();
mock.module("vscode", () => getVscodeMockModule());

let mockQueryImpl: (
  symbolId: string,
  workspaceRoot: string,
) => Array<{ type: string; from: string; to: string }> = () => [];

mock.module("../src/symbolIndex", () => ({
  buildIndex,
  queryRelationshipsViaCli: (symbolId: string, workspaceRoot: string) =>
    mockQueryImpl(symbolId, workspaceRoot),
}));

const { KibiCodeLensProvider } = await import("../src/codeLensProvider");
const { RelationshipCache } = await import("../src/relationshipCache");
const { KibiHoverProvider } = await import("../src/hoverProvider");
const { KibiCodeActionProvider, browseLinkedEntities, openFileAtLine } =
  await import("../src/codeActionProvider");

let tmpDir: string;

afterEach(() => {
  mockQueryImpl = () => [];
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

afterAll(() => {
  mock.restore();
});

function writeSymbols(
  dir: string,
  symbols: Array<Record<string, unknown>>,
): void {
  const lines = ["symbols:"];
  for (const symbol of symbols) {
    lines.push(`  - id: ${String(symbol.id ?? "")}`);
    lines.push(`    title: ${String(symbol.title ?? "")}`);
    if (symbol.sourceFile) {
      lines.push(`    sourceFile: ${String(symbol.sourceFile)}`);
    }
    if (typeof symbol.sourceLine === "number") {
      lines.push(`    sourceLine: ${symbol.sourceLine}`);
    }
    lines.push("    links:");
    for (const link of Array.isArray(symbol.links) ? symbol.links : []) {
      lines.push(`      - ${String(link)}`);
    }
  }
  const symbolsPath = path.join(dir, ".kb", "symbols.yaml");
  fs.mkdirSync(path.dirname(symbolsPath), { recursive: true });
  fs.writeFileSync(symbolsPath, `${lines.join("\n")}\n`);
}

describe("VS Code provider LCOV imports", () => {
  test("code lens provide/resolve and cancelled documents", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-lens-lcov-"));
    const sourceFile = path.join(tmpDir, "src", "alpha.ts");
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.writeFileSync(sourceFile, "export function alpha() {}\n");
    writeSymbols(tmpDir, [
      {
        id: "SYM-ALPHA",
        title: "alpha",
        sourceFile,
        sourceLine: 1,
        links: ["REQ-1"],
      },
    ]);
    mockQueryImpl = () => [
      { type: "implements", from: "SYM-ALPHA", to: "REQ-1" },
    ];
    const cache = new RelationshipCache();
    const provider = new KibiCodeLensProvider(tmpDir, cache);
    const cancelled = provider.provideCodeLenses(
      { uri: { fsPath: sourceFile } } as never,
      { isCancellationRequested: true } as never,
    );
    expect(cancelled).toBeNull();
    const missing = provider.provideCodeLenses(
      { uri: { fsPath: path.join(tmpDir, "nope.ts") } } as never,
      { isCancellationRequested: false } as never,
    );
    expect(missing).toBeNull();
    const lenses = provider.provideCodeLenses(
      { uri: { fsPath: sourceFile } } as never,
      { isCancellationRequested: false } as never,
    );
    expect(lenses?.length).toBe(1);
    if (!lenses?.[0]) throw new Error("expected lens");
    const resolved = await provider.resolveCodeLens(
      lenses[0],
      { isCancellationRequested: false } as never,
    );
    expect(resolved.command?.command).toBe("kibi.browseLinkedEntities");
    const cancelledResolve = await provider.resolveCodeLens(lenses[0], {
      isCancellationRequested: true,
    } as never);
    expect(cancelledResolve).toBeNull();
    provider.refresh();
    const subscriptions: { dispose: () => void }[] = [];
    provider.watchSources({ subscriptions } as never);
    expect(subscriptions.length).toBeGreaterThan(0);
  });

  test("hover covers unknown prefix, CLI parse failure, and empty relationships", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-hover-lcov-"));
    const sourceFile = path.join(tmpDir, "src", "beta.ts");
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.writeFileSync(sourceFile, "export function beta() {}\n");
    const manifestPath = path.join(tmpDir, ".kb", "symbols.yaml");
    writeSymbols(tmpDir, [
      {
        id: "SYM-BETA",
        title: "beta",
        sourceFile,
        sourceLine: 1,
        links: ["REQ-1"],
      },
    ]);
    const index = buildIndex(manifestPath, tmpDir);
    const cache = {
      get: () => undefined,
      set: () => undefined,
      getInflight: () => undefined,
      setInflight: () => undefined,
      deleteInflight: () => undefined,
    };
    const emptyRels = new KibiHoverProvider(tmpDir, index, cache as never, {
      execCli: () => "[]",
    });
    expect(
      await emptyRels.provideHover(
        { uri: { fsPath: sourceFile } } as never,
        { line: 0, character: 0 } as never,
        { isCancellationRequested: false } as never,
      ),
    ).toBeNull();

    const provider = new KibiHoverProvider(tmpDir, index, cache as never, {
      execCli: (command: string) => {
        if (command.includes("--relationships")) {
          return JSON.stringify([
            { type: "implements", from: "SYM-BETA", to: "FACT-X" },
          ]);
        }
        if (command.includes("FACT-X")) throw new Error("nope");
        return JSON.stringify({ id: "SYM-BETA", title: "beta", status: "open" });
      },
    });
    const hover = await provider.provideHover(
      { uri: { fsPath: sourceFile } } as never,
      { line: 0, character: 0 } as never,
      { isCancellationRequested: false } as never,
    );
    expect(hover).not.toBeNull();

    const unknown = new KibiHoverProvider(tmpDir, index, cache as never, {
      execCli: (command: string) => {
        if (command.includes("--relationships")) {
          return JSON.stringify([
            { type: "relates_to", from: "SYM-BETA", to: "ZZZ-1" },
          ]);
        }
        return "{}";
      },
    });
    expect(
      await unknown.provideHover(
        { uri: { fsPath: sourceFile } } as never,
        { line: 0, character: 0 } as never,
        { isCancellationRequested: false } as never,
      ),
    ).not.toBeNull();
  });

  test("code actions and browseLinkedEntities empty/no-file paths", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-action-lcov-"));
    const sourceFile = path.join(tmpDir, "src", "gamma.ts");
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.writeFileSync(sourceFile, "export function gamma() {}\n");
    writeSymbols(tmpDir, [
      {
        id: "SYM-GAMMA",
        title: "gamma",
        sourceFile,
        sourceLine: 1,
        links: [],
      },
    ]);
    const provider = new KibiCodeActionProvider(tmpDir);
    const none = provider.provideCodeActions(
      {
        uri: { fsPath: path.join(tmpDir, "other.ts") },
        getWordRangeAtPosition: () => undefined,
        getText: () => "",
      } as never,
      { start: { line: 0, character: 0 } } as never,
    );
    expect(none).toEqual([]);
    const actions = provider.provideCodeActions(
      {
        uri: { fsPath: sourceFile },
        getWordRangeAtPosition: () => ({ start: 0, end: 5 }),
        getText: () => "gamma",
      } as never,
      { start: { line: 0, character: 0 } } as never,
    );
    expect(actions.length).toBeGreaterThan(0);

    const vscode = getVscodeMockModule() as {
      window: { showInformationMessage: ReturnType<typeof mock> };
    };
    await browseLinkedEntities("SYM-NONE", [], tmpDir, () => undefined);
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    await browseLinkedEntities(
      "SYM-GAMMA",
      [{ type: "relates_to", from: "SYM-GAMMA", to: "REQ-1" }],
      tmpDir,
      () => undefined,
    );
    await openFileAtLine(sourceFile);
  });
});
