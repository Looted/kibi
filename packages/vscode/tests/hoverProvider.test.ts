import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
// Import real implementations BEFORE mock.module intercepts them
const {
  buildHoverMarkdown: realBuildHoverMarkdown,
  categorizeEntities: realCategorizeEntities,
  formatLensTitle: realFormatLensTitle,
} = await import("../src/helpers?real");
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

type MockMarkdownString = { value: string; isTrusted?: boolean };
type MockHover = { contents: MockMarkdownString };
type TestToken = { isCancellationRequested: boolean };
type EntityDetails = {
  id: string;
  type: string;
  title: string;
  status: string;
  tags: string[];
};

class MockMarkdownStringImpl {
  isTrusted?: boolean;

  constructor(public value: string) {}
}

class MockHoverImpl {
  constructor(public contents: MockMarkdownString) {}
}

// Tests will inject per-test fakes via the provider constructor deps seam.

function configureVscodeMock() {
  resetVscodeMock({
    MarkdownString: MockMarkdownStringImpl,
    Hover: MockHoverImpl,
  });
}

configureVscodeMock();

mock.module("vscode", () => getVscodeMockModule());

// Per-test injected fakes
let fakeExecCli: (command: string, options?: Record<string, unknown>) => string;
let fakeBuildHoverMarkdown: (...args: any[]) => string;

const { KibiHoverProvider } = await import("../src/hoverProvider");
const { RelationshipCache } = await import("../src/relationshipCache");

type MockSymbol = {
  id: string;
  title: string;
  sourceFile?: string;
  sourceLine?: number;
};

type MockRelationship = { type: string; from: string; to: string };

type HoverProviderInternal = {
  symbolIndex: { byFile: Map<string, MockSymbol[]> } | null;
  fetchRelationships(symbolId: string): Promise<MockRelationship[] | null>;
  queryRelationshipsViaCli(
    symbolId: string,
  ): Promise<MockRelationship[] | null>;
  fetchEntityDetails(
    relationships: MockRelationship[],
    token: TestToken,
  ): Promise<EntityDetails[]>;
  fetchEntityById(entityId: string): Promise<EntityDetails | null>;
  queryEntityViaCli(entityId: string): Promise<EntityDetails | null>;
  entityDetailsCache: Map<
    string,
    { data: EntityDetails | null; timestamp: number }
  >;
  entityInflight: Map<string, Promise<EntityDetails | null>>;
};

function makeProvider(symbols?: MockSymbol[], depsOverrides?: any) {
  const filePath = "/workspace/src/example.ts";
  const symbolIndex = symbols
    ? {
        byFile: new Map([[filePath, symbols]]),
      }
    : null;

  const finalDeps = {
    execCli: (cmd: string, opts?: Record<string, unknown>) =>
      fakeExecCli(cmd, opts),
    buildMarkdown: (...args: any[]) => fakeBuildHoverMarkdown(...args),
    ...(depsOverrides || {}),
  };

  return {
    filePath,
    cache: new RelationshipCache(),
    provider: new KibiHoverProvider(
      "/workspace",
      symbolIndex as never,
      new RelationshipCache(),
      finalDeps,
    ),
  };
}

function makeProviderWithCache(
  symbols: MockSymbol[] = [],
  depsOverrides?: any,
) {
  const filePath = "/workspace/src/example.ts";
  const symbolIndex = {
    byFile: new Map([[filePath, symbols]]),
  };
  const cache = new RelationshipCache();

  const finalDeps = {
    execCli: (cmd: string, opts?: Record<string, unknown>) =>
      fakeExecCli(cmd, opts),
    buildMarkdown: (...args: any[]) => fakeBuildHoverMarkdown(...args),
    ...(depsOverrides || {}),
  };

  return {
    filePath,
    cache,
    provider: new KibiHoverProvider(
      "/workspace",
      symbolIndex as never,
      cache,
      finalDeps,
    ),
  };
}

function makeDocument(filePath: string) {
  return {
    uri: { fsPath: filePath },
  };
}

function makePosition(line: number, character = 0) {
  return { line, character };
}

function makeToken(cancelled = false) {
  return { isCancellationRequested: cancelled };
}

describe("KibiHoverProvider", () => {
  beforeEach(() => {
    configureVscodeMock();
    // reset per-test injected fakes
    fakeExecCli = (_cmd: string) => "[]";
    fakeBuildHoverMarkdown = realBuildHoverMarkdown as any;
  });
  afterEach(() => {
    fakeBuildHoverMarkdown = realBuildHoverMarkdown as any;
  });

  test("provideHover returns null for early exit cases", async () => {
    const noIndex = makeProvider();
    expect(
      await noIndex.provider.provideHover(
        makeDocument(noIndex.filePath) as never,
        makePosition(0) as never,
        makeToken(true) as never,
      ),
    ).toBeNull();

    expect(
      await noIndex.provider.provideHover(
        makeDocument(noIndex.filePath) as never,
        makePosition(0) as never,
        makeToken(false) as never,
      ),
    ).toBeNull();

    const noSymbols = makeProviderWithCache([]);
    expect(
      await noSymbols.provider.provideHover(
        makeDocument(noSymbols.filePath) as never,
        makePosition(0) as never,
        makeToken(false) as never,
      ),
    ).toBeNull();

    const wrongLine = makeProviderWithCache([
      {
        id: "SYM-001",
        title: "symbol",
        sourceFile: noSymbols.filePath,
        sourceLine: 5,
      },
    ]);
    expect(
      await wrongLine.provider.provideHover(
        makeDocument(wrongLine.filePath) as never,
        makePosition(0) as never,
        makeToken(false) as never,
      ),
    ).toBeNull();
  });

  test("provideHover returns null when relationships are absent or cancellation happens after async steps", async () => {
    const filePath = "/workspace/src/example.ts";
    const { provider } = makeProviderWithCache([
      {
        id: "SYM-001",
        title: "symbol",
        sourceFile: filePath,
        sourceLine: 1,
      },
    ]);
    const internal = provider as unknown as HoverProviderInternal;

    internal.fetchRelationships = mock(async () => []);
    expect(
      await provider.provideHover(
        makeDocument(filePath) as never,
        makePosition(0) as never,
        makeToken(false) as never,
      ),
    ).toBeNull();

    internal.fetchRelationships = mock(async () => [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ]);
    const afterRelationshipsToken = makeToken(false);
    internal.fetchEntityDetails = mock(async () => {
      afterRelationshipsToken.isCancellationRequested = true;
      return [];
    });
    expect(
      await provider.provideHover(
        makeDocument(filePath) as never,
        makePosition(0) as never,
        afterRelationshipsToken as never,
      ),
    ).toBeNull();

    internal.fetchRelationships = mock(async () => {
      afterRelationshipsToken.isCancellationRequested = true;
      return [{ type: "implements", from: "SYM-001", to: "REQ-001" }];
    });
    internal.fetchEntityDetails = mock(async () => []);
    afterRelationshipsToken.isCancellationRequested = false;
    expect(
      await provider.provideHover(
        makeDocument(filePath) as never,
        makePosition(0) as never,
        afterRelationshipsToken as never,
      ),
    ).toBeNull();
  });

  test("provideHover builds trusted hover markdown for the symbol and fetched entities", async () => {
    const { provider, filePath } = makeProviderWithCache([
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "/workspace/src/example.ts",
        sourceLine: 1,
      },
    ]);
    const entities = [
      {
        id: "REQ-001",
        type: "req",
        title: "Requirement",
        status: "open",
        tags: ["core"],
      },
    ];
    const internal = provider as unknown as HoverProviderInternal;

    internal.fetchRelationships = mock(async () => [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ]);
    internal.fetchEntityDetails = mock(async () => entities);
    // swap in a per-test mock implementation for buildHoverMarkdown
    fakeBuildHoverMarkdown = mock(() => "rendered markdown");

    const hover = (await provider.provideHover(
      makeDocument(filePath) as never,
      makePosition(0) as never,
      makeToken(false) as never,
    )) as MockHover | null;

    expect(hover).not.toBeNull();
    if (!hover) throw new Error("Expected hover");
    // buildHoverMarkdownMock is a function mock; ensure it was called with expected args
    expect(fakeBuildHoverMarkdown).toHaveBeenCalledWith(
      {
        id: "SYM-001",
        title: "myFunction",
        file: "/workspace/src/example.ts",
        line: 1,
      },
      entities,
    );
    expect(hover.contents.value).toBe("rendered markdown");
    expect(hover.contents.isTrusted).toBe(true);
  });

  test("fetchRelationships uses cache, inflight dedupe, stores truthy data, skips falsy data, and clears inflight on errors", async () => {
    const { provider, cache } = makeProviderWithCache();
    const internal = provider as unknown as HoverProviderInternal;

    cache.set("rel:SYM-CACHED", {
      data: [{ type: "implements", from: "SYM-CACHED", to: "REQ-001" }],
      timestamp: Date.now(),
    });
    expect(await internal.fetchRelationships("SYM-CACHED")).toEqual([
      { type: "implements", from: "SYM-CACHED", to: "REQ-001" },
    ]);

    cache.setInflight(
      "rel:SYM-INFLIGHT",
      Promise.resolve([
        { type: "covers", from: "SYM-INFLIGHT", to: "TEST-001" },
      ]),
    );
    expect(await internal.fetchRelationships("SYM-INFLIGHT")).toEqual([
      { type: "covers", from: "SYM-INFLIGHT", to: "TEST-001" },
    ]);

    internal.queryRelationshipsViaCli = mock(async () => [
      { type: "implements", from: "SYM-OK", to: "REQ-OK" },
    ]);
    expect(await internal.fetchRelationships("SYM-OK")).toEqual([
      { type: "implements", from: "SYM-OK", to: "REQ-OK" },
    ]);
    expect(cache.get("rel:SYM-OK")?.data).toEqual([
      { type: "implements", from: "SYM-OK", to: "REQ-OK" },
    ]);
    expect(cache.getInflight("rel:SYM-OK")).toBeUndefined();

    internal.queryRelationshipsViaCli = mock(async () => null);
    expect(await internal.fetchRelationships("SYM-NONE")).toBeNull();
    expect(cache.get("rel:SYM-NONE")).toBeUndefined();

    internal.queryRelationshipsViaCli = mock(async () => {
      throw new Error("boom");
    });
    expect(await internal.fetchRelationships("SYM-ERR")).toBeNull();
    expect(cache.getInflight("rel:SYM-ERR")).toBeUndefined();
  });

  test("queryRelationshipsViaCli parses JSON and falls back to empty list on CLI failure", async () => {
    const { provider } = makeProviderWithCache();
    const internal = provider as unknown as HoverProviderInternal;
    fakeExecCli = mock(
      () => '[{"type":"implements","from":"SYM-001","to":"REQ-001"}]',
    );

    expect(await internal.queryRelationshipsViaCli("SYM-001")).toEqual([
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ]);
    expect(fakeExecCli).toHaveBeenCalledWith(
      "bun run packages/cli/bin/kibi query --relationships SYM-001 --format json",
      {
        cwd: "/workspace",
        encoding: "utf8",
        timeout: 10000,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    fakeExecCli = mock(() => {
      throw new Error("cli failed");
    });
    expect(await internal.queryRelationshipsViaCli("SYM-002")).toEqual([]);
  });

  test("fetchEntityDetails deduplicates ids, skips null entities, and respects cancellation", async () => {
    const { provider } = makeProviderWithCache();
    const internal = provider as unknown as HoverProviderInternal;
    const seen: string[] = [];

    internal.fetchEntityById = mock(async (id: string) => {
      seen.push(id);
      if (id === "REQ-001") {
        return {
          id,
          type: "req",
          title: "Requirement",
          status: "open",
          tags: [],
        };
      }
      if (id === "TEST-001") return null;
      return {
        id,
        type: "symbol",
        title: "Symbol",
        status: "active",
        tags: ["x"],
      };
    });

    expect(
      await internal.fetchEntityDetails(
        [
          { type: "implements", from: "SYM-001", to: "REQ-001" },
          { type: "verified_by", from: "REQ-001", to: "TEST-001" },
        ],
        makeToken(false),
      ),
    ).toEqual([
      {
        id: "SYM-001",
        type: "symbol",
        title: "Symbol",
        status: "active",
        tags: ["x"],
      },
      {
        id: "REQ-001",
        type: "req",
        title: "Requirement",
        status: "open",
        tags: [],
      },
    ]);
    expect(seen).toEqual(["SYM-001", "REQ-001", "TEST-001"]);

    const cancellingToken = makeToken(false);
    internal.fetchEntityById = mock(async () => {
      cancellingToken.isCancellationRequested = true;
      return {
        id: "SYM-001",
        type: "symbol",
        title: "Symbol",
        status: "active",
        tags: [],
      };
    });
    expect(
      await internal.fetchEntityDetails(
        [
          { type: "implements", from: "SYM-001", to: "REQ-001" },
          { type: "verified_by", from: "REQ-001", to: "TEST-001" },
        ],
        cancellingToken,
      ),
    ).toEqual([]);
  });

  test("fetchEntityById uses cache and inflight requests, caches results, and clears inflight after rejection", async () => {
    const { provider } = makeProviderWithCache();
    const internal = provider as unknown as HoverProviderInternal;
    const entityCache = internal.entityDetailsCache;
    const inflight = internal.entityInflight;

    entityCache.set("entity:REQ-CACHED", {
      data: {
        id: "REQ-CACHED",
        type: "req",
        title: "Cached",
        status: "open",
        tags: [],
      },
      timestamp: Date.now(),
    });
    expect(await internal.fetchEntityById("REQ-CACHED")).toEqual({
      id: "REQ-CACHED",
      type: "req",
      title: "Cached",
      status: "open",
      tags: [],
    });

    inflight.set(
      "entity:REQ-INFLIGHT",
      Promise.resolve({
        id: "REQ-INFLIGHT",
        type: "req",
        title: "Inflight",
        status: "open",
        tags: [],
      }),
    );
    expect(await internal.fetchEntityById("REQ-INFLIGHT")).toEqual({
      id: "REQ-INFLIGHT",
      type: "req",
      title: "Inflight",
      status: "open",
      tags: [],
    });

    internal.queryEntityViaCli = mock(async () => ({
      id: "REQ-OK",
      type: "req",
      title: "Fresh",
      status: "open",
      tags: ["a"],
    }));
    expect(await internal.fetchEntityById("REQ-OK")).toEqual({
      id: "REQ-OK",
      type: "req",
      title: "Fresh",
      status: "open",
      tags: ["a"],
    });
    expect(entityCache.get("entity:REQ-OK")?.data).toEqual({
      id: "REQ-OK",
      type: "req",
      title: "Fresh",
      status: "open",
      tags: ["a"],
    });

    internal.queryEntityViaCli = mock(async () => {
      throw new Error("entity failure");
    });
    expect(await internal.fetchEntityById("REQ-ERR")).toBeNull();
    expect(inflight.get("entity:REQ-ERR")).toBeUndefined();
  });

  test("queryEntityViaCli handles invalid ids, unsupported types, object and array payloads, empty payloads, defaults, and parse failures", async () => {
    const { provider } = makeProviderWithCache();
    const internal = provider as unknown as HoverProviderInternal;

    expect(await internal.queryEntityViaCli("not-an-entity")).toBeNull();
    expect(await internal.queryEntityViaCli("FACT-001")).toBeNull();

    fakeExecCli = mock(() =>
      JSON.stringify([
        {
          id: "REQ-001",
          title: "Requirement",
          status: "closed",
          tags: ["core"],
        },
      ]),
    );
    expect(await internal.queryEntityViaCli("REQ-001")).toEqual({
      id: "REQ-001",
      type: "req",
      title: "Requirement",
      status: "closed",
      tags: ["core"],
    });

    fakeExecCli = mock(() => JSON.stringify({}));
    expect(await internal.queryEntityViaCli("TEST-001")).toEqual({
      id: "TEST-001",
      type: "test",
      title: "",
      status: "unknown",
      tags: [],
    });

    fakeExecCli = mock(() => "[]");
    expect(await internal.queryEntityViaCli("ADR-001")).toBeNull();

    fakeExecCli = mock(() => {
      throw new SyntaxError("bad json");
    });
    expect(await internal.queryEntityViaCli("REQ-ERR")).toBeNull();
  });
});

afterAll(() => {
  mock.restore();
});
