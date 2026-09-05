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

  test("adaptProlog works when optional indexed methods are absent", async () => {
    const query = mock(async (goal: string) => ({
      success: true,
      bindings: { goal },
    }));
    const prolog = { query };
    const session = {
      activeBranchName: "minimal",
      attachedBranchKbPath: null,
      ensureProlog: async () => prolog,
      resetProlog: async (_reason: string) => {},
      inFlightRequests: new Map<string, Promise<unknown>>(),
      isShuttingDown: false,
      prologProcess: { getPid: () => 7 },
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
      DEFAULT_TOOLS_RUNTIME.handleSparql({ query: "SELECT * WHERE {}" }, context),
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
        DEFAULT_TOOLS_RUNTIME.deriveDiagnosticFields(
          "kb_status",
          {},
          null,
          {},
        ).result_summary,
      ).toBe("kb_status completed");
    } finally {
      rmSync(kbPath, { recursive: true, force: true });
    }
  });
});
