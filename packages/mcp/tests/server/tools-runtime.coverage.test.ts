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
  const query = mock(async (goal: string) => ({
    success: true,
    bindings: { goal },
  }));
  const prolog = {
    query,
    invalidateCache: () => {},
    queryEntities: async () => ({ entities: [] }),
    searchEntities: async () => ({ entities: [] }),
    storageStatus: async () => ({ success: true, bindings: {} }),
    queryStatusJson: async () => ({ success: true, bindings: { Json: "{}" } }),
  };
  return {
    session: {
      activeBranchName: "coverage-branch",
      attachedBranchKbPath: kbPath,
      ensureProlog: async () => prolog,
      resetProlog: async (_reason: string) => {},
      inFlightRequests: new Map<string, Promise<unknown>>(),
      isShuttingDown: false,
      prologProcess: { getPid: () => 4242 },
      updateAttachedBranchStamp: mock((_stamp: unknown) => {}),
    },
    prolog,
  };
}

describe("DEFAULT_TOOLS_RUNTIME session wiring", () => {
  test("session accessors and adaptProlog cover optional Prolog methods", async () => {
    const { session, prolog } = createSession();
    _setToolsServerDepsForTests(
      { getSessionModule: async () => session as never },
      true,
    );

    expect(await DEFAULT_TOOLS_RUNTIME.activeBranchName()).toBe(
      "coverage-branch",
    );
    expect(await DEFAULT_TOOLS_RUNTIME.ensureProlog()).toBe(prolog);
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
    expect(await again.prolog?.queryEntities?.({ type: "req" })).toEqual({
      entities: [],
    });
    expect(await again.prolog?.searchEntities?.({ query: "x" })).toEqual({
      entities: [],
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
      DEFAULT_TOOLS_RUNTIME.handleSparql({ query: "SELECT * WHERE {}" }, context),
    ).rejects.toThrow();
  });
});
