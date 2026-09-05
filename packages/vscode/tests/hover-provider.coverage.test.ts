// implements REQ-vscode-kb-to-source
import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildIndex } from "../src/symbolIndex";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

resetVscodeMock();
mock.module("vscode", () => getVscodeMockModule());

const { KibiHoverProvider } = await import("../src/hoverProvider.ts");

function writeManifest(dir: string, body: string): string {
  const manifestPath = path.join(dir, "symbols.yaml");
  fs.writeFileSync(manifestPath, body);
  return manifestPath;
}

function createCache() {
  const cache = new Map<string, { data: unknown; timestamp: number }>();
  const inflight = new Map<string, Promise<unknown>>();
  return {
    get: (key: string) => cache.get(key),
    set: (key: string, value: { data: unknown; timestamp: number }) => {
      cache.set(key, value);
    },
    getInflight: (key: string) => inflight.get(key),
    setInflight: (key: string, promise: Promise<unknown>) => {
      inflight.set(key, promise);
    },
    deleteInflight: (key: string) => inflight.delete(key),
    _cache: cache,
    _inflight: inflight,
  };
}

let tmpDir: string;

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

afterAll(() => {
  mock.restore();
});

describe("hoverProvider remaining runtime branches", () => {
  test("cancellation getter hits mid-hover checks and empty file symbols", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-hover-cov-"));
    const testFile = path.join(tmpDir, "alpha.ts");
    fs.writeFileSync(testFile, "export function alpha() {}\n");
    const emptyFile = path.join(tmpDir, "empty.ts");
    fs.writeFileSync(emptyFile, "");
    const manifestPath = writeManifest(
      tmpDir,
      `
symbols:
  - id: SYM-ALPHA
    title: alpha
    sourceFile: ${testFile}
    sourceLine: 1
    links: [REQ-1]
  - id: SYM-EMPTY
    title: empty
    sourceFile: ${emptyFile}
    links: []
`,
    );
    const index = buildIndex(manifestPath, tmpDir);
    index.byFile.set(emptyFile, []);

    const cache = createCache();
    let checks = 0;
    const token = {
      get isCancellationRequested() {
        checks += 1;
        return checks >= 3;
      },
    };
    const provider = new KibiHoverProvider(tmpDir, index, cache as never, {
      execCli: (command: string) => {
        if (command.includes("--relationships")) {
          return JSON.stringify([
            { type: "implements", from: "SYM-ALPHA", to: "REQ-1" },
          ]);
        }
        return JSON.stringify({ id: "REQ-1", title: "Req" });
      },
    });

    expect(
      await provider.provideHover(
        { uri: { fsPath: testFile } } as never,
        { line: 0, character: 0 } as never,
        token as never,
      ),
    ).toBeNull();

    expect(
      await provider.provideHover(
        { uri: { fsPath: emptyFile } } as never,
        { line: 0, character: 0 } as never,
        { isCancellationRequested: false } as never,
      ),
    ).toBeNull();
  });

  test("expired cache, FACT prefix, empty entity arrays, and default fields", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-hover-fields-"));
    const testFile = path.join(tmpDir, "beta.ts");
    fs.writeFileSync(testFile, "export function beta() {}\n");
    const manifestPath = writeManifest(
      tmpDir,
      `
symbols:
  - id: SYM-BETA
    title: beta
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );
    const index = buildIndex(manifestPath, tmpDir);
    const cache = createCache();
    cache.set("rel:SYM-BETA", {
      data: [{ type: "relates_to", from: "SYM-BETA", to: "FACT-1" }],
      timestamp: Date.now() - 60_000,
    });

    const provider = new KibiHoverProvider(tmpDir, index, cache as never, {
      execCli: (command: string) => {
        if (command.includes("--relationships")) {
          return JSON.stringify([
            { type: "relates_to", from: "SYM-BETA", to: "FACT-1" },
            { type: "implements", from: "SYM-BETA", to: "REQ-2" },
            { type: "implements", from: "SYM-BETA", to: "SCEN-2" },
            { type: "implements", from: "SYM-BETA", to: "TEST-2" },
            { type: "implements", from: "SYM-BETA", to: "ADR-2" },
            { type: "implements", from: "SYM-BETA", to: "FLAG-2" },
            { type: "implements", from: "SYM-BETA", to: "EVENT-2" },
          ]);
        }
        if (command.includes("FACT-1") || command.includes("fact")) {
          return JSON.stringify([]);
        }
        if (command.includes("REQ-2")) {
          return JSON.stringify({});
        }
        if (command.includes("SCEN-2")) {
          return JSON.stringify({ title: "Scenario" });
        }
        if (command.includes("TEST-2")) {
          throw new Error("entity failed");
        }
        if (command.includes("ADR-2")) {
          return "not-json";
        }
        return JSON.stringify({
          id: "FLAG-2",
          title: "Flag",
          status: "active",
          tags: "not-array",
        });
      },
    });

    const hover = await provider.provideHover(
      { uri: { fsPath: testFile } } as never,
      { line: 0, character: 0 } as never,
      { isCancellationRequested: false } as never,
    );
    expect(hover).not.toBeNull();
  });

  test("relationship cache.set throw, entity inflight reuse, and symbol without line", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-hover-inflight-"));
    const testFile = path.join(tmpDir, "gamma.ts");
    fs.writeFileSync(testFile, "export function gamma() {}\n");
    const manifestPath = writeManifest(
      tmpDir,
      `
symbols:
  - id: SYM-GAMMA
    title: gamma
    sourceFile: ${testFile}
    links: [REQ-9]
`,
    );
    const index = buildIndex(manifestPath, tmpDir);
    const symbol = index.byFile.get(testFile)?.[0];
    if (symbol) {
      delete symbol.sourceFile;
      delete symbol.sourceLine;
      symbol.sourceLine = 1;
    }

    const throwingCache = createCache();
    throwingCache.set = () => {
      throw new Error("cache write failed");
    };
    const throwingProvider = new KibiHoverProvider(
      tmpDir,
      index,
      throwingCache as never,
      {
        execCli: (command: string) => {
          if (command.includes("--relationships")) {
            return JSON.stringify([
              { type: "implements", from: "SYM-GAMMA", to: "REQ-9" },
            ]);
          }
          return JSON.stringify({ id: "REQ-9", title: "Req" });
        },
      },
    );
    expect(
      await throwingProvider.provideHover(
        { uri: { fsPath: testFile } } as never,
        { line: 0, character: 0 } as never,
        { isCancellationRequested: false } as never,
      ),
    ).toBeNull();

    const cache = createCache();
    const provider = new KibiHoverProvider(tmpDir, index, cache as never, {
      execCli: (command: string) => {
        if (command.includes("--relationships")) {
          return JSON.stringify([
            { type: "implements", from: "SYM-GAMMA", to: "REQ-9" },
          ]);
        }
        return JSON.stringify({
          id: "REQ-9",
          title: "Req",
          status: "open",
          tags: ["a"],
        });
      },
    });
    const internals = provider as unknown as {
      entityInflight: Map<string, Promise<unknown>>;
      entityDetailsCache: Map<string, { data: unknown; timestamp: number }>;
    };
    let resolveInflight: (value: {
      id: string;
      type: string;
      title: string;
      status: string;
      tags: string[];
    }) => void = () => {};
    internals.entityInflight.set(
      "entity:REQ-9",
      new Promise((resolve) => {
        resolveInflight = resolve;
      }),
    );
    const inflightHover = provider.provideHover(
      { uri: { fsPath: testFile } } as never,
      { line: 0, character: 0 } as never,
      { isCancellationRequested: false } as never,
    );
    resolveInflight({
      id: "REQ-9",
      type: "req",
      title: "Req",
      status: "open",
      tags: ["a"],
    });
    expect(await inflightHover).not.toBeNull();

    expect(
      await provider.provideHover(
        { uri: { fsPath: testFile } } as never,
        { line: 0, character: 0 } as never,
        { isCancellationRequested: false } as never,
      ),
    ).not.toBeNull();

    internals.entityDetailsCache.set = () => {
      throw new Error("entity cache write failed");
    };
    internals.entityDetailsCache.delete("entity:REQ-9");
    internals.entityDetailsCache.clear();
    expect(
      await provider.provideHover(
        { uri: { fsPath: testFile } } as never,
        { line: 0, character: 0 } as never,
        { isCancellationRequested: false } as never,
      ),
    ).not.toBeNull();
  });

  test("cancellation during entity-detail iteration returns an empty hover path", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-hover-cancel-ents-"));
    const testFile = path.join(tmpDir, "delta.ts");
    fs.writeFileSync(testFile, "export function delta() {}\n");
    const manifestPath = writeManifest(
      tmpDir,
      `
symbols:
  - id: SYM-DELTA
    title: delta
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );
    const index = buildIndex(manifestPath, tmpDir);
    const token = { isCancellationRequested: false };
    const provider = new KibiHoverProvider(tmpDir, index, createCache() as never, {
      execCli: (command: string) => {
        if (command.includes("--relationships")) {
          return JSON.stringify([
            { type: "implements", from: "SYM-DELTA", to: "REQ-1" },
            { type: "implements", from: "SYM-DELTA", to: "REQ-2" },
          ]);
        }
        token.isCancellationRequested = true;
        return JSON.stringify({ id: "REQ-1", title: "Req" });
      },
    });
    expect(
      await provider.provideHover(
        { uri: { fsPath: testFile } } as never,
        { line: 0, character: 0 } as never,
        token as never,
      ),
    ).toBeNull();
  });
});
