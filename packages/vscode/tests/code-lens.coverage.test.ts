// implements REQ-vscode-kb-to-source
import { afterAll, afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildIndex } from "../src/symbolIndex";
import {
  DefaultCodeLens,
  DefaultFileSystemWatcher,
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

const { KibiCodeLensProvider } = await import("../src/codeLensProvider.ts");
const { RelationshipCache } = await import("../src/relationshipCache.ts");

const vscodeWorkspace = (getVscodeMockModule() as Record<string, unknown>)
  .workspace as {
  createFileSystemWatcher: (pattern: unknown) => DefaultFileSystemWatcher;
};

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

describe("codeLensProvider remaining runtime branches", () => {
  test("resolves cached, inflight, uncached, cancelled, and metadata-less lenses", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-lens-cov-"));
    const sourceFile = path.join(tmpDir, "src", "alpha.ts");
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.writeFileSync(sourceFile, "export function alpha() {}\n");
    writeSymbols(tmpDir, [
      {
        id: "SYM-ALPHA",
        title: "alpha",
        sourceFile: "src/alpha.ts",
        sourceLine: 1,
        links: ["REQ-STATIC", "REQ-1"],
      },
      {
        id: "SYM-NOLINE",
        title: "noline",
        sourceFile: "src/alpha.ts",
        links: [],
      },
    ]);
    mockQueryImpl = () => [
      { type: "implements", from: "SYM-ALPHA", to: "REQ-1" },
      { type: "guards", from: "FLAG-ONE", to: "SYM-ALPHA" },
      { type: "relates_to", from: "SYM-ALPHA", to: "REQ-STATIC" },
    ];

    const cache = new RelationshipCache();
    const provider = new KibiCodeLensProvider(tmpDir, cache);
    const lenses = provider.provideCodeLenses(
      { uri: { fsPath: sourceFile } } as never,
      { isCancellationRequested: false } as never,
    );
    expect(lenses?.length).toBe(2);
    expect((lenses?.[1] as DefaultCodeLens).range).toMatchObject({
      start: { line: 0, character: 0 },
    });

    const resolved = await provider.resolveCodeLens(lenses![0], {
      isCancellationRequested: false,
    } as never);
    expect(resolved?.command?.title).toBeDefined();
    expect(resolved?.command?.arguments?.[1]).toEqual(
      expect.arrayContaining([
        { type: "relates_to", from: "SYM-ALPHA", to: "REQ-STATIC" },
        { type: "implements", from: "SYM-ALPHA", to: "REQ-1" },
        { type: "guards", from: "FLAG-ONE", to: "SYM-ALPHA" },
      ]),
    );

    mockQueryImpl = () => {
      throw new Error("should use cache");
    };
    const cached = await provider.resolveCodeLens(lenses![0], {
      isCancellationRequested: false,
    } as never);
    expect(cached?.command?.command).toBe("kibi.browseLinkedEntities");

    const otherCache = new RelationshipCache();
    const inflightProvider = new KibiCodeLensProvider(tmpDir, otherCache);
    const inflightLenses = inflightProvider.provideCodeLenses(
      { uri: { fsPath: sourceFile } } as never,
      { isCancellationRequested: false } as never,
    );
    let queryCount = 0;
    mockQueryImpl = () => {
      queryCount += 1;
      return [{ type: "implements", from: "SYM-ALPHA", to: "REQ-1" }];
    };
    const [left, right] = await Promise.all([
      inflightProvider.resolveCodeLens(inflightLenses![0], {
        isCancellationRequested: false,
      } as never),
      inflightProvider.resolveCodeLens(inflightLenses![0], {
        isCancellationRequested: false,
      } as never),
    ]);
    expect(left?.command?.command).toBe("kibi.browseLinkedEntities");
    expect(right?.command?.command).toBe("kibi.browseLinkedEntities");
    expect(queryCount).toBe(1);

    const cancelToken = { isCancellationRequested: false };
    mockQueryImpl = () => {
      cancelToken.isCancellationRequested = true;
      return [{ type: "implements", from: "SYM-ALPHA", to: "REQ-1" }];
    };
    const cancelCache = new RelationshipCache();
    const cancelProvider = new KibiCodeLensProvider(tmpDir, cancelCache);
    const cancelLenses = cancelProvider.provideCodeLenses(
      { uri: { fsPath: sourceFile } } as never,
      { isCancellationRequested: false } as never,
    );
    expect(
      await cancelProvider.resolveCodeLens(
        cancelLenses![0],
        cancelToken as never,
      ),
    ).toBeNull();

    expect(
      await provider.resolveCodeLens(new DefaultCodeLens({} as never), {
        isCancellationRequested: false,
      } as never),
    ).toBeNull();
  });

  test("matches documents by relative path and ignores paths outside the workspace", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-lens-rel-"));
    const sourceFile = path.join(tmpDir, "src", "beta.ts");
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.writeFileSync(sourceFile, "export function beta() {}\n");
    writeSymbols(tmpDir, [
      {
        id: "SYM-BETA",
        title: "beta",
        sourceFile: "src/beta.ts",
        sourceLine: 4,
        links: [],
      },
    ]);
    const provider = new KibiCodeLensProvider(tmpDir, new RelationshipCache());
    const internals = provider as unknown as {
      getEntriesForDocumentPath: (filePath: string) => unknown;
      relativeKey: (inputPath: string) => string | null;
      filePathCandidates: (inputPath: string) => string[];
      index: unknown;
      rebuildFileAliases: () => void;
    };

    expect(
      internals.getEntriesForDocumentPath(path.join(tmpDir, "src", "beta.ts")),
    ).toBeTruthy();
    expect(internals.relativeKey(path.join(tmpDir, "..", "outside.ts"))).toBeNull();
    expect(internals.relativeKey(tmpDir)).toBeNull();

    const realpathSpy = spyOn(fs.realpathSync, "native").mockImplementation(() => {
      throw new Error("no realpath");
    });
    try {
      expect(
        internals.filePathCandidates(path.join(tmpDir, "missing", "ghost.ts"))
          .length,
      ).toBeGreaterThan(0);
    } finally {
      realpathSpy.mockRestore();
    }

    internals.index = null;
    internals.rebuildFileAliases();
    expect(
      internals.getEntriesForDocumentPath(path.join(tmpDir, "src", "beta.ts")),
    ).toBeNull();
    expect(
      provider.provideCodeLenses(
        { uri: { fsPath: sourceFile } } as never,
        { isCancellationRequested: false } as never,
      ),
    ).toBeNull();
  });

  test("watchSources debounce refreshes on manifest and KB events", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-lens-watch-"));
    const sourceFile = path.join(tmpDir, "src", "gamma.ts");
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.writeFileSync(sourceFile, "export function gamma() {}\n");
    writeSymbols(tmpDir, [
      {
        id: "SYM-GAMMA",
        title: "gamma",
        sourceFile: "src/gamma.ts",
        sourceLine: 1,
        links: [],
      },
    ]);
    const watchers: DefaultFileSystemWatcher[] = [];
    vscodeWorkspace.createFileSystemWatcher = (pattern: unknown) => {
      const watcher = new DefaultFileSystemWatcher(pattern);
      watchers.push(watcher);
      return watcher;
    };

    const cache = new RelationshipCache();
    cache.set("codelens:rel:SYM-GAMMA", {
      data: [{ type: "implements", from: "SYM-GAMMA", to: "REQ-1" }],
      timestamp: Date.now(),
    });
    const provider = new KibiCodeLensProvider(tmpDir, cache);
    const context = { subscriptions: [] as Array<{ dispose: () => void }> };
    provider.watchSources(context as never);
    expect(watchers).toHaveLength(2);
    expect(context.subscriptions).toHaveLength(2);

    watchers[0]?.emitChange();
    watchers[0]?.emitCreate();
    watchers[0]?.emitDelete();
    watchers[1]?.emitChange();
    watchers[1]?.emitCreate();
    watchers[1]?.emitDelete();
    await new Promise((resolve) => setTimeout(resolve, 550));
    expect(cache.get("codelens:rel:SYM-GAMMA")).toBeUndefined();
  });
});
