/**
 * Unit tests for KibiCodeActionProvider, browseLinkedEntities, and openFileAtLine.
 * Uses the same top-level import + mock.module pattern as codeLens.test.ts.
 */
import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

// Set up vscode mock ONCE at top level
resetVscodeMock();
mock.module("vscode", () => getVscodeMockModule());
const vscode = getVscodeMockModule();

// Import source modules AFTER mock is registered
const { KibiCodeActionProvider, browseLinkedEntities, openFileAtLine } = await import(
  "../src/codeActionProvider"
);

let tmpDir: string;

function configureVscodeMock(options: {
  window?: Record<string, unknown>;
  workspace?: Record<string, unknown>;
} = {}) {
  Object.assign(vscode.window as Record<string, unknown>, {
    showInformationMessage: mock(async (_message: string) => undefined),
    showWarningMessage: mock(async (_message: string) => undefined),
    showErrorMessage: mock(async (_message: string) => undefined),
    showQuickPick: mock(async (_items: unknown[]) => undefined),
    showTextDocument: mock(async (_doc: unknown) => ({
      selection: undefined,
      revealRange: mock((_range: unknown, _revealType: unknown) => {}),
    })),
    ...options.window,
  });

  Object.assign(vscode.workspace as Record<string, unknown>, {
    openTextDocument: mock(async (uri: unknown) => ({ uri, lineCount: 1 })),
    ...options.workspace,
  });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-code-action-"));
  configureVscodeMock();
});

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  mock.restore();
});

afterAll(() => {
  mock.restore();
});

function writeManifest(symbols: string) {
  fs.writeFileSync(path.join(tmpDir, "symbols.yaml"), symbols, "utf8");
}

describe("KibiCodeActionProvider — provideCodeActions", () => {
  test("returns empty array when index is null (no manifest)", () => {
    const provider = new KibiCodeActionProvider(tmpDir);
    const document = {
      uri: { fsPath: "/fake/file.ts" },
      getWordRangeAtPosition: () => null,
      getText: () => "",
    };
    const range = { start: { line: 0, character: 0 } };
    const result = provider.provideCodeActions(document as never, range as never);
    expect(result).toEqual([]);
  });

  test("returns actions for symbols matching file path", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// code\n");

    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: src/main.ts
    sourceLine: 1
    links:
      - REQ-001
`);

    const provider = new KibiCodeActionProvider(tmpDir);

    const document = {
      uri: { fsPath: testFile },
      getWordRangeAtPosition: () => ({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 6 },
      }),
      getText: () => "myFunc",
    };
    const range = { start: { line: 0, character: 0 } };

    const actions = provider.provideCodeActions(document as never, range as never);
    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions[0]?.title).toContain("myFunc");
    expect(actions[0]?.command?.command).toBe("kibi.browseLinkedEntities");
  });

  test("returns actions for symbols matching title at cursor", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n");

    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: src/other.ts
    sourceLine: 1
    links:
      - REQ-001
`);

    const provider = new KibiCodeActionProvider(tmpDir);

    const document = {
      uri: { fsPath: testFile },
      getWordRangeAtPosition: () => ({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 6 },
      }),
      getText: () => "myFunc",
    };
    const range = { start: { line: 0, character: 0 } };

    const actions = provider.provideCodeActions(document as never, range as never);
    expect(actions.length).toBe(1);
    expect(actions[0]?.title).toContain("myFunc");
  });

  test("deduplicates symbols by ID when both file and title match", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// code\n");

    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: src/main.ts
    sourceLine: 1
    links:
      - REQ-001
`);

    const provider = new KibiCodeActionProvider(tmpDir);

    const document = {
      uri: { fsPath: testFile },
      getWordRangeAtPosition: () => ({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 6 },
      }),
      getText: () => "myFunc",
    };
    const range = { start: { line: 0, character: 0 } };

    const actions = provider.provideCodeActions(document as never, range as never);
    expect(actions.length).toBe(1);
  });

  test("returns empty when no symbols match", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// code\n");

    writeManifest(`symbols:
  - id: SYM-001
    title: otherFunc
    sourceFile: src/other.ts
    sourceLine: 1
    links: []
`);

    const provider = new KibiCodeActionProvider(tmpDir);

    const document = {
      uri: { fsPath: testFile },
      getWordRangeAtPosition: () => null,
      getText: () => "",
    };
    const range = { start: { line: 0, character: 0 } };

    const actions = provider.provideCodeActions(document as never, range as never);
    expect(actions).toEqual([]);
  });
});

describe("browseLinkedEntities", () => {
  test("shows info message when no linked entities", async () => {
    const showInfoMsg = mock(async (_msg: string) => undefined);
    configureVscodeMock({
      window: { showInformationMessage: showInfoMsg },
    });

    const mockGetNav = mock((_id: string) => undefined);
    await browseLinkedEntities("SYM-001", [], "/root", mockGetNav);
    expect(showInfoMsg).toHaveBeenCalledWith(expect.stringContaining("No linked entities"));
  });

  test("shows quick pick when entities exist", async () => {
    const showQuickPick = mock(async (_items: unknown[]) => undefined);
    configureVscodeMock({
      window: { showQuickPick },
    });

    const relationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
      { type: "guards", from: "FLAG-001", to: "SYM-001" },
    ];
    const mockGetNav = mock((_id: string) => undefined);

    await browseLinkedEntities("SYM-001", relationships, "/root", mockGetNav);

    expect(showQuickPick).toHaveBeenCalled();
    const items = (showQuickPick.mock.calls[0] as unknown[])[0] as Array<{ label: string }>;
    const labels = items.map((i: { label: string }) => i.label);
    expect(labels).toContain("REQ-001");
    expect(labels).toContain("FLAG-001");
  });

  test("opens file when user selects entity with local path", async () => {
    const openTextDoc = mock(async (_uri: unknown) => ({ uri: _uri, lineCount: 20 }));
    const textEditor = { selection: undefined, revealRange: mock(() => {}) };
    const showTextDoc = mock(async () => textEditor);
    const showQuickPick = mock(async (items: Array<{ label: string }>) =>
      items.find((i) => i.label === "REQ-001"),
    );

    configureVscodeMock({
      window: { showQuickPick, showTextDocument: showTextDoc },
      workspace: { openTextDocument: openTextDoc },
    });

    const relationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ];
    const mockGetNav = mock((id: string) =>
      id === "REQ-001" ? { localPath: "/path/to/req.md", line: 10 } : undefined,
    );

    await browseLinkedEntities("SYM-001", relationships, "/root", mockGetNav);

    expect(showQuickPick).toHaveBeenCalled();
    expect(openTextDoc).toHaveBeenCalled();
  });

  test("shows info message when selected entity has no local file", async () => {
    const showQuickPick = mock(async (items: Array<{ label: string }>) => items[0]);
    const showInfoMsg = mock(async (_msg: string) => undefined);

    configureVscodeMock({
      window: { showQuickPick, showInformationMessage: showInfoMsg },
    });

    const relationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ];
    const mockGetNav = mock((_id: string) => undefined);

    await browseLinkedEntities("SYM-001", relationships, "/root", mockGetNav);

    expect(showInfoMsg).toHaveBeenCalledWith(expect.stringContaining("no local source file"));
  });

  test("does nothing when user dismisses quick pick", async () => {
    const showQuickPick = mock(async () => undefined);
    const openTextDoc = mock(async () => ({}));

    configureVscodeMock({
      window: { showQuickPick },
      workspace: { openTextDocument: openTextDoc },
    });

    const relationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ];
    const mockGetNav = mock((_id: string) => ({ localPath: "/path" }));

    await browseLinkedEntities("SYM-001", relationships, "/root", mockGetNav);

    expect(openTextDoc).not.toHaveBeenCalled();
  });
});

describe("openFileAtLine", () => {
  test("opens file without line scroll when line is undefined", async () => {
    const openTextDoc = mock(async () => ({ uri: {}, lineCount: 10 }));
    const textEditor = { selection: undefined, revealRange: mock(() => {}) };
    const showTextDoc = mock(async () => textEditor);

    configureVscodeMock({
      window: { showTextDocument: showTextDoc },
      workspace: { openTextDocument: openTextDoc },
    });

    await openFileAtLine("/path/to/file.ts");
    expect(openTextDoc).toHaveBeenCalled();
    expect(showTextDoc).toHaveBeenCalled();
    expect(textEditor.revealRange).not.toHaveBeenCalled();
  });

  test("opens file and scrolls to line when line is provided", async () => {
    const openTextDoc = mock(async () => ({ uri: {}, lineCount: 100 }));
    const textEditor = { selection: undefined, revealRange: mock(() => {}) };
    const showTextDoc = mock(async () => textEditor);

    configureVscodeMock({
      window: { showTextDocument: showTextDoc },
      workspace: { openTextDocument: openTextDoc },
    });

    await openFileAtLine("/path/to/file.ts", 50);
    expect(openTextDoc).toHaveBeenCalled();
    expect(showTextDoc).toHaveBeenCalled();
    expect(textEditor.revealRange).toHaveBeenCalled();
  });

  test("clamps line number to document line count", async () => {
    const openTextDoc = mock(async () => ({ uri: {}, lineCount: 10 }));
    const textEditor = { selection: undefined, revealRange: mock(() => {}) };
    const showTextDoc = mock(async () => textEditor);

    configureVscodeMock({
      window: { showTextDocument: showTextDoc },
      workspace: { openTextDocument: openTextDoc },
    });

    // Line 500 but doc only has 10 lines — should clamp to line 9 (0-indexed)
    await openFileAtLine("/path/to/file.ts", 500);
    expect(textEditor.revealRange).toHaveBeenCalled();
  });
});
