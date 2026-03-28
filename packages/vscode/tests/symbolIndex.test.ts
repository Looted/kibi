import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildIndex } from "../src/symbolIndex";

describe("symbolIndex", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-symbol-index-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("buildIndex parses symbols and links from symbols.yaml", () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      [
        "symbols:",
        "  - id: SYM-001",
        "    title: PrologProcess",
        "    sourceFile: packages/cli/src/prolog.ts",
        "    sourceLine: 16",
        "    links:",
        "      - REQ-001",
        "      - REQ-009",
      ].join("\n"),
      "utf8",
    );

    const index = buildIndex(manifestPath, tmpDir);

    expect(index.byId.size).toBe(1);
    expect(index.byFile.size).toBe(1);
    expect(index.byTitle.get("prologprocess")?.length).toBe(1);

    const sym = index.byId.get("SYM-001");
    expect(sym).toBeDefined();
    expect(sym?.sourceLine).toBe(16);
    expect(sym?.links).toEqual(["REQ-001", "REQ-009"]);
  });

  test("buildIndex tolerates malformed manifest content", () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(manifestPath, "symbols: [\n  - id: SYM-001", "utf8");

    const index = buildIndex(manifestPath, tmpDir);

    expect(index.byId.size).toBe(0);
    expect(index.byFile.size).toBe(0);
    expect(index.byTitle.size).toBe(0);
  });


  test("buildIndex correctly maps internal helper function entries", () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      [
        "symbols:",
        "  - id: SYM-INT-001",
        "    title: mergeStaticLinks",
        "    sourceFile: packages/cli/src/linker.ts",
        "    sourceLine: 42",
        "    links:",
        "      - REQ-010",
        "  - id: SYM-INT-002",
        "    title: parseSymbolsManifest",
        "    sourceFile: packages/vscode/src/symbolIndex.ts",
        "    sourceLine: 102",
        "    links:",
      ].join("\n"),
      "utf8",
    );

    const index = buildIndex(manifestPath, tmpDir);

    expect(index.byId.size).toBe(2);
    expect(index.byFile.size).toBe(2);

    const helper = index.byId.get("SYM-INT-001");
    expect(helper).toBeDefined();
    expect(helper?.title).toBe("mergeStaticLinks");
    expect(helper?.sourceLine).toBe(42);
    expect(helper?.links).toEqual(["REQ-010"]);

    // byTitle uses lowercased key
    expect(index.byTitle.get("mergestaticlinks")?.length).toBe(1);

    // absolute path resolution: relative sourceFile is resolved against workspaceRoot
    const absolutePath = path.resolve(tmpDir, "packages/cli/src/linker.ts");
    expect(index.byFile.has(absolutePath)).toBe(true);
  });

  test("buildIndex correctly maps class method entries", () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      [
        "symbols:",
        "  - id: SYM-METHOD-001",
        "    title: provideCodeLenses",
        "    sourceFile: packages/vscode/src/codeLensProvider.ts",
        "    sourceLine: 78",
        "    links:",
        "      - REQ-vscode-codelens",
        "  - id: SYM-METHOD-002",
        "    title: resolveCodeLens",
        "    sourceFile: packages/vscode/src/codeLensProvider.ts",
        "    sourceLine: 115",
        "    links:",
        "      - REQ-vscode-codelens",
      ].join("\n"),
      "utf8",
    );

    const index = buildIndex(manifestPath, tmpDir);

    // Both methods share the same sourceFile — byFile groups them together
    expect(index.byId.size).toBe(2);
    expect(index.byFile.size).toBe(1);

    const absPath = path.resolve(tmpDir, "packages/vscode/src/codeLensProvider.ts");
    const fileEntries = index.byFile.get(absPath);
    expect(fileEntries?.length).toBe(2);

    const method1 = index.byId.get("SYM-METHOD-001");
    expect(method1?.sourceLine).toBe(78);

    const method2 = index.byId.get("SYM-METHOD-002");
    expect(method2?.sourceLine).toBe(115);
  });
});
