import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { execSync as realExecSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

type ExecSyncOptions = {
  cwd: string;
  encoding: "utf8";
  timeout: number;
  stdio: ["ignore", "pipe", "ignore"];
};

let execSyncImpl: (cmd: string, options: ExecSyncOptions) => string = realExecSync as unknown as (cmd: string, options: ExecSyncOptions) => string;

const execSyncCalls: Array<{ cmd: string; options: ExecSyncOptions }> = [];

mock.module("node:child_process", () => ({
  execSync: (cmd: string, options: ExecSyncOptions) => {
    execSyncCalls.push({ cmd, options });
    return execSyncImpl(cmd, options);
  },
}));

const symbolIndexModuleNonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const { buildIndex, queryRelationshipsViaCli } = await import(
  `../src/symbolIndex?case=${symbolIndexModuleNonce}`
);

describe("symbolIndex", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-symbol-index-"));
    execSyncCalls.length = 0;
    execSyncImpl = realExecSync as unknown as (cmd: string, options: ExecSyncOptions) => string;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    execSyncCalls.length = 0;
    execSyncImpl = realExecSync as unknown as (cmd: string, options: ExecSyncOptions) => string;
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

  test("buildIndex returns empty index when manifest path is a directory", () => {
    const index = buildIndex(tmpDir, tmpDir);

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

    const absPath = path.resolve(
      tmpDir,
      "packages/vscode/src/codeLensProvider.ts",
    );
    const fileEntries = index.byFile.get(absPath);
    expect(fileEntries?.length).toBe(2);

    const method1 = index.byId.get("SYM-METHOD-001");
    expect(method1?.sourceLine).toBe(78);

    const method2 = index.byId.get("SYM-METHOD-002");
    expect(method2?.sourceLine).toBe(115);
  });

  test("buildIndex unquotes single-quoted YAML values", () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      [
        "symbols:",
        "  - id: 'SYM-SINGLE-001'",
        "    title: 'MyFunc'",
        "    sourceFile: 'packages/vscode/src/symbolIndex.ts'",
        "    links:",
        "      - 'REQ-quoted-001'",
      ].join("\n"),
      "utf8",
    );

    const index = buildIndex(manifestPath, tmpDir);
    const symbol = index.byId.get("SYM-SINGLE-001");

    expect(symbol).toBeDefined();
    expect(symbol?.title).toBe("MyFunc");
    expect(symbol?.sourceFile).toBe(
      path.resolve(tmpDir, "packages/vscode/src/symbolIndex.ts"),
    );
    expect(symbol?.links).toEqual(["REQ-quoted-001"]);
  });

  test("buildIndex stops collecting links after a non-link line in links block", () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      [
        "symbols:",
        "  - id: SYM-LINK-RESET-001",
        "    title: MyFunc",
        "    links:",
        "      - REQ-001",
        "    kind: function",
        "      - REQ-SHOULD-NOT-BE-COLLECTED",
        "    sourceLine: 27",
      ].join("\n"),
      "utf8",
    );

    const index = buildIndex(manifestPath, tmpDir);
    const symbol = index.byId.get("SYM-LINK-RESET-001");

    expect(symbol).toBeDefined();
    expect(symbol?.links).toEqual(["REQ-001"]);
    expect(symbol?.sourceLine).toBe(27);
  });

  test("queryRelationshipsViaCli parses JSON from the first successful candidate", () => {
    const relationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
      { type: "verified_by", from: "REQ-001", to: "TEST-001" },
    ];

    execSyncImpl = () => JSON.stringify(relationships);

    expect(queryRelationshipsViaCli("SYM-001", tmpDir)).toEqual(relationships);
    expect(execSyncCalls).toEqual([
      {
        cmd: "kibi query --relationships SYM-001 --format json",
        options: {
          cwd: tmpDir,
          encoding: "utf8",
          timeout: 10000,
          stdio: ["ignore", "pipe", "ignore"],
        },
      },
    ]);
  });

  test("queryRelationshipsViaCli falls back to the bun command after a failure", () => {
    const relationships = [
      { type: "implements", from: "SYM-002", to: "REQ-002" },
    ];
    let callCount = 0;

    execSyncImpl = (cmd) => {
      callCount += 1;
      if (callCount === 1) {
        expect(cmd).toBe("kibi query --relationships SYM-002 --format json");
        throw new Error("kibi not found");
      }

      expect(cmd).toBe(
        "bun run packages/cli/bin/kibi query --relationships SYM-002 --format json",
      );
      return JSON.stringify(relationships);
    };

    expect(queryRelationshipsViaCli("SYM-002", tmpDir)).toEqual(relationships);
    expect(execSyncCalls).toHaveLength(2);
  });

  test("queryRelationshipsViaCli returns an empty array when all candidates fail", () => {
    execSyncImpl = () => {
      throw new Error("all commands failed");
    };

    expect(queryRelationshipsViaCli("SYM-003", tmpDir)).toEqual([]);
    expect(execSyncCalls).toHaveLength(2);
  });
});

afterAll(() => {
  mock.restore();
});
