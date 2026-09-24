// implements REQ-008
import { afterEach, describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-runtime";

import {
  DEFAULT_TOOLS_RUNTIME,
  _resetSessionModulePromise,
  _setToolsServerDepsForTests,
} from "../../src/server/tools-runtime.js";

const previousDebug = process.env.KIBI_MCP_DEBUG;

afterEach(() => {
  _setToolsServerDepsForTests({}, true);
  _resetSessionModulePromise();
  if (previousDebug === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
  } else {
    process.env.KIBI_MCP_DEBUG = previousDebug;
  }
});

function createSession(kbPath: string | null = "/tmp/kibi-branch") {
  const query = mock(async (_goal: string, _signal?: AbortSignal) => ({
    success: true,
    bindings: { goal: _goal },
  }));
  const queryEntities = mock(
    async (_input: unknown, _signal?: AbortSignal) => ({
      entities: [],
      count: 0,
    }),
  );
  const searchEntities = mock(
    async (_input: unknown, _signal?: AbortSignal) => ({
      entities: [],
      count: 0,
    }),
  );
  const queryStatusJson = mock(async (_signal?: AbortSignal) => ({
    success: true,
    bindings: { Json: "{}" },
  }));
  const prolog = {
    query,
    invalidateCache: () => {},
    queryEntities,
    searchEntities,
    storageStatus: async () => ({ success: true, bindings: {} }),
    queryStatusJson,
  };
  return {
    session: {
      getActiveBranchName: () => "coverage-branch",
      getAttachedBranchKbPath: () => kbPath,
      ensureProlog: async () => prolog,
      resetProlog: async (_reason: string) => {},
      inFlightRequests: new Map<string, Promise<unknown>>(),
      getIsShuttingDown: () => false,
      getPrologProcess: () => ({ getPid: () => 4242 }),
      updateAttachedBranchStamp: mock((_stamp: unknown) => {}),
    },
    prolog,
    spies: { query, queryEntities, searchEntities, queryStatusJson },
  };
}

describe("DEFAULT_TOOLS_RUNTIME session wiring", () => {
  test("adaptProlog keeps EngineClient this when calling queryStatusJson", async () => {
    // Regression for MCP kb_status dirty:true fallback: extracting
    // engine.queryStatusJson and invoking it unbound made `this.command`
    // undefined inside EngineClient.
    class FakeEngine {
      commandCalls = 0;
      async query(_goal: string, _signal?: AbortSignal) {
        return { success: true, bindings: {} };
      }
      async command(_command: unknown, _signal?: AbortSignal) {
        this.commandCalls += 1;
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify({
              branch: "main",
              snapshotId: "snap",
              syncedAt: null,
              dirty: false,
              syncState: "fresh",
            }),
          },
        };
      }
      async queryStatusJson(signal?: AbortSignal) {
        return this.command({ version: 1, kind: "status" }, signal);
      }
    }
    const engine = new FakeEngine();
    _setToolsServerDepsForTests(
      {
        getSessionModule: async () =>
          ({
            getActiveBranchName: () => "main",
            getAttachedBranchKbPath: () => "/tmp/kb",
            ensureProlog: async () => engine,
            resetProlog: async () => {},
            inFlightRequests: new Map(),
            getIsShuttingDown: () => false,
            getPrologProcess: () => ({ getPid: () => 1 }),
            updateAttachedBranchStamp: () => {},
          }) as never,
      },
      true,
    );
    const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
      {
        name: "kb_status",
        requiresProlog: false,
        effects: ["local-read"],
      } as never,
      {},
    );
    const prolog = await context.ensureProlog?.();
    const result = await prolog?.queryStatusJson?.();
    expect(result?.success).toBe(true);
    expect(engine.commandCalls).toBe(1);
  });

  test("adaptProlog forwards AbortSignal to underlying PrologPort methods", async () => {
    const { session, spies } = createSession();
    _setToolsServerDepsForTests(
      { getSessionModule: async () => session as never },
      true,
    );
    const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
      {
        name: "kb_query",
        requiresProlog: true,
        effects: ["kb-read"],
      } as never,
      {},
    );
    const signal = AbortSignal.abort();
    await context.prolog?.query("true", signal);
    await context.prolog?.queryEntities?.(
      { type: "req", limit: 1, offset: 0 },
      signal,
    );
    await context.prolog?.searchEntities?.(
      { query: "x", limit: 1, offset: 0 },
      signal,
    );
    await context.prolog?.queryStatusJson?.(signal);
    await context.prolog?.save(signal);
    expect(spies.query.mock.calls.some((call) => call[1] === signal)).toBe(
      true,
    );
    expect(
      spies.queryEntities.mock.calls.some((call) => call[1] === signal),
    ).toBe(true);
    expect(
      spies.searchEntities.mock.calls.some((call) => call[1] === signal),
    ).toBe(true);
    expect(
      spies.queryStatusJson.mock.calls.some((call) => call[0] === signal),
    ).toBe(true);
    expect(spies.query.mock.calls.some((call) => call[0] === "kb_save")).toBe(
      true,
    );
  });

  test("session accessors and adaptProlog cover optional Prolog methods", async () => {
    const { session, prolog } = createSession();
    _setToolsServerDepsForTests(
      { getSessionModule: async () => session as never },
      true,
    );

    expect(await DEFAULT_TOOLS_RUNTIME.activeBranchName()).toBe(
      "coverage-branch",
    );
    expect(await DEFAULT_TOOLS_RUNTIME.ensureProlog()).toBe(prolog as never);
    await DEFAULT_TOOLS_RUNTIME.resetProlog("test");
    expect(await DEFAULT_TOOLS_RUNTIME.inFlightRequests()).toBe(
      session.inFlightRequests,
    );
    expect(await DEFAULT_TOOLS_RUNTIME.isShuttingDown()).toBe(false);
    expect((await DEFAULT_TOOLS_RUNTIME.prologProcess())?.getPid()).toBe(4242);
    expect(DEFAULT_TOOLS_RUNTIME.tools.length).toBeGreaterThan(0);
    expect(typeof DEFAULT_TOOLS_RUNTIME.diagnosticModeEnabled()).toBe(
      "boolean",
    );

    const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
      {
        name: "kb_status",
        requiresProlog: true,
        effects: ["local-read"],
      } as never,
      {},
    );
    expect(context.prolog).toBeDefined();
    const first = await context.prolog?.query("kb_status");
    expect(first?.success).toBe(true);
    const again = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
      {
        name: "kb_status",
        requiresProlog: true,
        effects: ["local-read"],
      } as never,
      {},
    );
    expect(
      await again.prolog?.queryEntities?.({
        type: "req",
        limit: 10,
        offset: 0,
      }),
    ).toEqual({
      entities: [],
      count: 0,
    });
    expect(
      await again.prolog?.searchEntities?.({
        query: "x",
        limit: 10,
        offset: 0,
      }),
    ).toEqual({
      entities: [],
      count: 0,
    });
    expect(await again.prolog?.storageStatus?.()).toMatchObject({
      success: true,
    });
    expect(await again.prolog?.queryStatusJson?.()).toMatchObject({
      success: true,
    });
    expect(await again.prolog?.nextSolution()).toMatchObject({ success: true });
    expect(await again.prolog?.nextSolution()).toBeNull();
    await again.prolog?.save();
  });

  test("refreshAttachedBranchStamp swallows stamp errors and logs when debug is on", async () => {
    process.env.KIBI_MCP_DEBUG = "1";
    const warn = mock((..._args: unknown[]) => {});
    const originalWarn = console.warn;
    console.warn = warn as typeof console.warn;
    const { session } = createSession("/tmp/does-not-exist-kibi-stamp");
    session.updateAttachedBranchStamp = mock(() => {
      throw new Error("stamp failed");
    });
    _setToolsServerDepsForTests(
      { getSessionModule: async () => session as never },
      true,
    );
    try {
      const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
        {
          name: "kb_skills_list",
          requiresProlog: false,
          effects: ["local-read"],
        } as never,
        {},
      );
      expect(context.workspaceRoot).toBeDefined();
    } finally {
      console.warn = originalWarn;
    }
  });

  test("adaptProlog works when optional indexed methods are absent", async () => {
    const query = mock(async (goal: string) => ({
      success: true,
      bindings: { goal },
    }));
    const prolog = { query };
    const session = {
      getActiveBranchName: () => "minimal",
      getAttachedBranchKbPath: () => null,
      ensureProlog: async () => prolog,
      resetProlog: async (_reason: string) => {},
      inFlightRequests: new Map<string, Promise<unknown>>(),
      getIsShuttingDown: () => false,
      getPrologProcess: () => ({ getPid: () => 7 }),
      updateAttachedBranchStamp: mock(),
    };
    _setToolsServerDepsForTests(
      { getSessionModule: async () => session as never },
      true,
    );
    const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
      {
        name: "kb_status",
        requiresProlog: true,
        effects: ["local-read"],
      } as never,
      {},
    );
    expect(context.prolog?.queryEntities).toBeUndefined();
    expect(await context.prolog?.query("kb_status")).toMatchObject({
      success: true,
    });
  });

  test("handleSparql delegates to the shared spec", async () => {
    const { session } = createSession();
    _setToolsServerDepsForTests(
      { getSessionModule: async () => session as never },
      true,
    );
    const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
      {
        name: "kb_sparql_remote",
        requiresProlog: false,
        effects: ["network"],
      } as never,
      {},
    );
    await expect(
      DEFAULT_TOOLS_RUNTIME.handleSparql(
        { query: "SELECT * WHERE {}" } as never,
        context,
      ),
    ).rejects.toThrow();
  });

  test("refreshAttachedBranchStamp skips an empty path and swallows non-debug errors", async () => {
    Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
    const warn = mock((..._args: unknown[]) => {});
    const originalWarn = console.warn;
    console.warn = warn as typeof console.warn;
    const writeSpec = {
      name: "kb_upsert",
      requiresProlog: false,
      effects: ["kb-write"],
    } as never;
    const emptySession = createSession("").session;
    const emptyUpdate = mock();
    emptySession.updateAttachedBranchStamp = emptyUpdate;
    _setToolsServerDepsForTests(
      { getSessionModule: async () => emptySession as never },
      true,
    );
    try {
      const skipped = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
        writeSpec,
        {},
      );
      await DEFAULT_TOOLS_RUNTIME.operationRuntime.afterSuccess(
        writeSpec,
        skipped,
      );
      expect(emptyUpdate).not.toHaveBeenCalled();

      const throwing = createSession("/tmp/kibi-stamp-throw").session;
      throwing.updateAttachedBranchStamp = mock(() => {
        throw "stamp exploded";
      });
      _setToolsServerDepsForTests(
        { getSessionModule: async () => throwing as never },
        true,
      );
      const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
        writeSpec,
        {},
      );
      await DEFAULT_TOOLS_RUNTIME.operationRuntime.afterSuccess(
        writeSpec,
        context,
      );
      expect(warn).not.toHaveBeenCalled();
    } finally {
      console.warn = originalWarn;
    }
  });

  test("refreshAttachedBranchStamp records a real stamp and exposes diagnostic helpers", async () => {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const kbPath = mkdtempSync(path.join(tmpdir(), "kibi-mcp-stamp-"));
    const recorded: unknown[] = [];
    const { session } = createSession(kbPath);
    session.updateAttachedBranchStamp = mock((stamp: unknown) => {
      recorded.push(stamp);
    });
    _setToolsServerDepsForTests(
      { getSessionModule: async () => session as never },
      true,
    );
    const writeSpec = {
      name: "kb_upsert",
      requiresProlog: false,
      effects: ["kb-write"],
    } as never;
    try {
      const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
        writeSpec,
        {},
      );
      await DEFAULT_TOOLS_RUNTIME.operationRuntime.afterSuccess(
        writeSpec,
        context,
      );
      expect(recorded[0]).toEqual(
        expect.objectContaining({ branchPath: kbPath, dirMissing: false }),
      );
      expect(
        DEFAULT_TOOLS_RUNTIME.classifyDiagnosticError(
          new Error("Prolog query failed: boom"),
        ).error_category,
      ).toBe("prolog_query_failed");
      expect(
        DEFAULT_TOOLS_RUNTIME.extractToolCallPayload({
          id: "REQ-1",
          _diagnostic_telemetry: { attempt_number: 2 },
        }).telemetry,
      ).toEqual({ attempt_number: 2 });
      expect(
        DEFAULT_TOOLS_RUNTIME.deriveDiagnosticFields("kb_status", {}, null, {})
          .result_summary,
      ).toBe("kb_status completed");
    } finally {
      rmSync(kbPath, { recursive: true, force: true });
    }
  });
});
