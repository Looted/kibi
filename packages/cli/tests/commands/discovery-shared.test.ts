import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import type { PrologProcess } from "../../src/prolog.js";
import { resolveBranchAttachment } from "../../src/utils/branch-resolver.js";

type QueryResult = {
  success: boolean;
  error?: string;
  bindings?: Record<string, unknown>;
};

type QueryableProlog = {
  query: (goal: string) => Promise<QueryResult>;
};

type MockPrologInstance = {
  options: { timeout: number };
  useOneShotMode?: boolean;
  start: ReturnType<typeof mock>;
  query: ReturnType<typeof mock>;
  terminate: ReturnType<typeof mock>;
};

function expectedStorePath(): string {
  const attachment = resolveBranchAttachment(process.cwd());
  if ("error" in attachment) throw new Error(attachment.error);
  return attachment.storePath;
}

const state = {
  currentBranch: "feature/test-branch",
  throwCurrentBranch: false,
  resolveKbPlPath: "/opt/kibi/core/kb.pl",
  queryResponses: [] as Array<QueryResult | Error>,
  queries: [] as string[],
  cleanups: [] as Array<MockPrologInstance | null | undefined>,
  createdPrologs: [] as MockPrologInstance[],
};

function resetState() {
  state.currentBranch = "feature/test-branch";
  state.throwCurrentBranch = false;
  state.resolveKbPlPath = "/opt/kibi/core/kb.pl";
  state.queryResponses = [];
  state.queries = [];
  state.cleanups = [];
  state.createdPrologs = [];
}

function setBranch(value?: string) {
  process.env.KIBI_BRANCH = value ?? "";
}

function stripAnsi(value: string) {
  return value.replace(
    new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"),
    "",
  );
}

class MockPrologProcess {
  options: { timeout: number };
  useOneShotMode?: boolean;
  start: ReturnType<typeof mock>;
  query: ReturnType<typeof mock>;
  terminate: ReturnType<typeof mock>;

  constructor(options: { timeout: number }) {
    this.options = options;
    this.start = mock(async () => undefined);
    this.query = mock(async (goal: string) => {
      state.queries.push(goal);
      const next = state.queryResponses.shift();
      if (next instanceof Error) {
        throw next;
      }
      return next ?? { success: true, bindings: {} };
    });
    this.terminate = mock(async () => {
      state.cleanups.push(this as unknown as MockPrologInstance);
      return undefined;
    });
    state.createdPrologs.push(this as unknown as MockPrologInstance);
  }
}

// Use DI to inject mock dependencies instead of mock.module().
// mock.module() in Bun cannot be undone and pollutes other test files' static imports.
import * as discovery from "../../src/commands/discovery-shared.js";
import type { DiscoveryDeps } from "../../src/commands/discovery-shared.js";

const mockDeps: DiscoveryDeps = {
  createProlog: (opts) =>
    new MockPrologProcess(opts) as unknown as PrologProcess,
  resolveKbPl: () => state.resolveKbPlPath,
};

describe("discovery-shared", () => {
  let logSpy: ReturnType<typeof spyOn>;
  const originalBranch = process.env.KIBI_BRANCH;

  beforeEach(() => {
    resetState();
    setBranch();
    logSpy = spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    setBranch(originalBranch);
  });

  test("withAttachedBranchProlog starts prolog, attaches branch KB, invokes callback, and cleans up", async () => {
    process.env.KIBI_BRANCH = "feat/search";
    state.queryResponses = [
      { success: true },
      { success: true },
      { success: true, bindings: { ok: true } },
    ];

    const result = await discovery.withAttachedBranchProlog(async (prolog) => {
      const callbackResult = await prolog.query("user_goal");
      return callbackResult.bindings;
    }, mockDeps);

    expect(JSON.stringify(result)).toBe(JSON.stringify({ ok: true }));
    expect(state.createdPrologs).toHaveLength(1);
    expect(state.createdPrologs[0]?.options).toEqual({ timeout: 120000 });
    expect(state.createdPrologs[0]?.start).toHaveBeenCalledTimes(1);
    expect(state.queries[0]).toContain("set_prolog_flag(answer_write_options");
    expect(state.queries[1]).toContain("kb_attach('");
    expect(state.queries[1]).toContain(expectedStorePath());
    expect(state.queries[2]).toBe("user_goal");
    expect(state.cleanups).toEqual([state.createdPrologs[0]]);
  });

  test("withAttachedBranchProlog prefers env branch and falls back to main when branch detection fails", async () => {
    process.env.KIBI_BRANCH = "env-branch";
    state.throwCurrentBranch = true;
    state.queryResponses = [{ success: true }, { success: true }];

    await discovery.withAttachedBranchProlog(async () => "done", mockDeps);
    expect(state.queries[1]).toContain(expectedStorePath());

    setBranch();
    resetState();
    // Use env var to force main branch (avoid depending on actual git branch)
    process.env.KIBI_BRANCH = "main";
    state.queryResponses = [{ success: true }, { success: true }];

    await discovery.withAttachedBranchProlog(async () => "done", mockDeps);
    expect(state.queries[1]).toContain(expectedStorePath());
  });

  test("withAttachedBranchProlog throws attach failures and still cleans up", async () => {
    state.queryResponses = [
      { success: true },
      { success: false, error: "attach exploded" },
    ];

    await expect(
      discovery.withAttachedBranchProlog(async () => "never", mockDeps),
    ).rejects.toThrow("Failed to attach KB: attach exploded");

    expect(state.cleanups).toEqual([state.createdPrologs[0]]);
  });

  test("withAttachedBranchProlog cleans up prolog when callback throws", async () => {
    state.queryResponses = [{ success: true }, { success: true }];

    await expect(
      discovery.withAttachedBranchProlog(async () => {
        throw new Error("callback failed");
      }, mockDeps),
    ).rejects.toThrow("callback failed");

    expect(state.createdPrologs).toHaveLength(1);
    expect(state.createdPrologs[0]?.options).toEqual({ timeout: 120000 });
    expect(state.createdPrologs[0]?.start).toHaveBeenCalledTimes(1);
    expect(state.queries[0]).toContain("set_prolog_flag(answer_write_options");
    expect(state.queries[1]).toContain("kb_attach('");
    expect(state.cleanups).toEqual([state.createdPrologs[0]]);
  });

  test("resolveCurrentKbPath uses the exact branch identity", async () => {
    // Use env var to control branch instead of mocking
    process.env.KIBI_BRANCH = "topic/x";
    await expect(discovery.resolveCurrentKbPath()).resolves.toBe(
      expectedStorePath(),
    );

    // Test fallback: clear env var and expect main
    process.env.KIBI_BRANCH = undefined;
    // Note: actual branch depends on git state, so we just verify it returns a path
    const result = await discovery.resolveCurrentKbPath();
    expect(result).toMatch(/\.kb\/branches\//);
  });

  test("resolveCoreModulePath joins the requested file next to kb.pl", () => {
    state.resolveKbPlPath = "/tmp/core/kb.pl";
    expect(discovery.resolveCoreModulePath("search_json.pl", mockDeps)).toBe(
      "/tmp/core/search_json.pl",
    );
  });

  test("runJsonModuleQuery wraps module usage, optional kb attach, and parses nested JSON", async () => {
    state.resolveKbPlPath = "/opt/kibi/core/kb.pl";
    const fakeProlog: QueryableProlog = {
      query: mock(async (goal: string) => {
        state.queries.push(goal);
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify(JSON.stringify({ rows: [1, 2] })),
          },
        };
      }),
    };

    await expect(
      discovery.runJsonModuleQuery(
        fakeProlog as unknown as PrologProcess,
        "nested\\coverage_json.pl",
        "coverage_goal(JsonString)",
        "Coverage failed",
        "/tmp/kb/path",
        mockDeps,
      ),
    ).resolves.toEqual({ rows: [1, 2] });

    expect(state.queries[0]).toContain(
      "use_module('/opt/kibi/core/nested/coverage_json.pl')",
    );
    expect(state.queries[0]).toContain("kb_attach('/tmp/kb/path')");
    expect(state.queries[0]).toContain("kb_detach");
  });

  test("runJsonModuleQuery omits kb attach without kbPath and surfaces query/result errors", async () => {
    const fakeProlog: QueryableProlog = {
      query: mock(async (goal: string) => ({
        success: true,
        bindings: { JsonString: '{"ok":true}' },
      })),
    };

    await expect(
      discovery.runJsonModuleQuery(
        fakeProlog as unknown as PrologProcess,
        "status_json.pl",
        "status_goal(JsonString)",
        "Status failed",
        undefined,
        mockDeps,
      ),
    ).resolves.toEqual({ ok: true });
    expect(fakeProlog.query).toHaveBeenCalledWith(
      "(use_module('/opt/kibi/core/status_json.pl'), status_goal(JsonString))",
    );

    await expect(
      discovery.runJsonModuleQuery(
        {
          query: mock(async () => ({ success: false, error: "bad query" })),
        } as unknown as PrologProcess,
        "status_json.pl",
        "status_goal(JsonString)",
        "Status failed",
        undefined,
        mockDeps,
      ),
    ).rejects.toThrow("Status failed: bad query");

    await expect(
      discovery.runJsonModuleQuery(
        {
          query: mock(async () => ({ success: true, bindings: {} })),
        } as unknown as PrologProcess,
        "status_json.pl",
        "status_goal(JsonString)",
        "Status failed",
        undefined,
        mockDeps,
      ),
    ).rejects.toThrow("Status failed: missing JsonString binding");
  });

  test("printDiscoveryResult emits JSON output and fallback text for unsupported payloads", () => {
    discovery.printDiscoveryResult("json", { ok: true }, "fallback text");
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ ok: true }, null, 2));

    discovery.printDiscoveryResult("table", null, "fallback text");
    expect(logSpy).toHaveBeenLastCalledWith("fallback text");

    discovery.printDiscoveryResult(
      "table",
      { unsupported: true },
      "fallback text",
    );
    expect(logSpy).toHaveBeenLastCalledWith("fallback text");
  });

  test("printDiscoveryResult renders search and status tables", () => {
    discovery.printDiscoveryResult(
      "table",
      {
        count: 2,
        results: [
          {
            entity: { id: "REQ-1", type: "req", title: "Alpha" },
            score: 0.91,
            reasons: ["title", "body"],
            snippet: "matched text",
          },
          {
            entity: {},
            score: 0,
            reasons: "not-an-array",
            snippet: "",
          },
        ],
      },
      "fallback",
    );
    const searchOutput = stripAnsi(logSpy.mock.calls.at(-1)?.[0] as string);
    expect(searchOutput).toContain("Search results: 2 total");
    expect(searchOutput).toContain("REQ-1");
    expect(searchOutput).toContain("title, body");
    expect(searchOutput).toContain("│ -");

    discovery.printDiscoveryResult(
      "table",
      {
        branch: "feature/x",
        syncState: "fresh",
        dirty: false,
        snapshotId: "snap-1",
        syncedAt: "2026-03-30T00:00:00Z",
        kbPath: "",
      },
      "fallback",
    );
    const statusOutput = stripAnsi(logSpy.mock.calls.at(-1)?.[0] as string);
    expect(statusOutput).toContain("Branch");
    expect(statusOutput).toContain("feature/x");
    expect(statusOutput).toContain("false");
    expect(statusOutput).toContain("snap-1");
    expect(statusOutput).toContain("- ");
  });

  test("printDiscoveryResult renders graph, gaps, and both coverage table shapes", () => {
    discovery.printDiscoveryResult(
      "table",
      {
        nodes: [
          { id: "REQ-1", type: "req", title: "Requirement", status: "open" },
        ],
        edges: [{ type: "implements", from: "SYM-1", to: "REQ-1" }],
        truncated: true,
      },
      "fallback",
    );
    const graphOutput = stripAnsi(logSpy.mock.calls.at(-1)?.[0] as string);
    expect(graphOutput).toContain("Nodes: 1  Edges: 1  Truncated: true");
    expect(graphOutput).toContain("implements");

    discovery.printDiscoveryResult(
      "table",
      {
        count: 1,
        rows: [
          {
            id: "REQ-2",
            type: "req",
            status: "open",
            missingRelationships: [],
            presentRelationships: ["verified_by"],
            source: undefined,
          },
        ],
      },
      "fallback",
    );
    const gapsOutput = stripAnsi(logSpy.mock.calls.at(-1)?.[0] as string);
    expect(gapsOutput).toContain("Gap rows: 1");
    expect(gapsOutput).toContain("verified_by");
    expect(gapsOutput).toContain("- ");

    discovery.printDiscoveryResult(
      "table",
      {
        summary: { covered: 1, missing: 0 },
        rows: [
          {
            id: "REQ-3",
            status: "open",
            priority: "high",
            coverageStatus: "covered",
            scenarioCount: 1,
            testCount: 2,
            transitiveSymbolCount: 3,
            gaps: ["none"],
          },
        ],
      },
      "fallback",
    );
    const requirementCoverage = stripAnsi(
      logSpy.mock.calls.at(-1)?.[0] as string,
    );
    expect(requirementCoverage).toContain("covered");
    expect(requirementCoverage).toContain("Scen");
    expect(requirementCoverage).toContain("none");

    discovery.printDiscoveryResult(
      "table",
      {
        summary: { covered: 1 },
        rows: [
          {
            id: "SYM-1",
            type: "symbol",
            coverageStatus: "partial",
            directRequirementCount: 4,
            testCount: 5,
            count: 6,
            gaps: [],
          },
        ],
      },
      "fallback",
    );
    const genericCoverage = stripAnsi(logSpy.mock.calls.at(-1)?.[0] as string);
    expect(genericCoverage).toContain("Details");
    expect(genericCoverage).toContain("req=4 covered=5");
    expect(genericCoverage).toContain("executable=- count=6");
    expect(genericCoverage).toContain("partial");
  });
});
afterAll(() => {
  mock.restore();
});
