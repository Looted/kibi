import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import {
  DEFAULT_TOOLS_RUNTIME,
  _adaptPrologForTests,
  _resetSessionModulePromise,
  _setToolsServerDepsForTests,
} from "../../src/server/tools-runtime.js";

afterEach(() => {
  _setToolsServerDepsForTests({}, true);
  _resetSessionModulePromise();
});

function session(branch: string) {
  return {
    getActiveBranchName: () => branch,
    getAttachedBranchKbPath: mock(() => null as string | null),
    ensureProlog: async () => ({}),
    resetProlog: mock(async (_reason: string) => {}),
    inFlightRequests: new Map(),
    getIsShuttingDown: () => false,
    getPrologProcess: () => null,
    updateAttachedBranchStamp: mock(() => {}),
  };
}

function useSession(value: ReturnType<typeof session>, reset?: boolean) {
  const deps = { getSessionModule: async () => value as never };
  if (reset === undefined) _setToolsServerDepsForTests(deps);
  else _setToolsServerDepsForTests(deps, reset);
}

describe("tools runtime, exact", () => {
  test("the session module stays cached until it is reset", async () => {
    useSession(session("a"), true);
    expect(await DEFAULT_TOOLS_RUNTIME.activeBranchName()).toBe("a");
    useSession(session("b"));
    expect(await DEFAULT_TOOLS_RUNTIME.activeBranchName()).toBe("a");
    useSession(session("c"), false);
    expect(await DEFAULT_TOOLS_RUNTIME.activeBranchName()).toBe("a");
    _resetSessionModulePromise();
    expect(await DEFAULT_TOOLS_RUNTIME.activeBranchName()).toBe("c");
    useSession(session("d"), true);
    expect(await DEFAULT_TOOLS_RUNTIME.activeBranchName()).toBe("d");
  });

  test("an engine without optional methods gets a port without them", () => {
    const port = _adaptPrologForTests({
      query: async () => ({ success: true }),
    } as never);
    expect(Object.keys(port).sort()).toStrictEqual([
      "nextSolution",
      "query",
      "save",
    ]);
    const full = _adaptPrologForTests({
      query: async () => ({ success: true }),
      queryEntities: async () => ({}),
      searchEntities: async () => ({}),
      storageStatus: async () => ({}),
      queryStatusJson: async () => ({}),
    } as never);
    expect(Object.keys(full).sort()).toStrictEqual([
      "nextSolution",
      "query",
      "queryEntities",
      "queryStatusJson",
      "save",
      "searchEntities",
      "storageStatus",
    ]);
  });

  test("reset passes its reason to the session", async () => {
    const current = session("a");
    useSession(current, true);
    await DEFAULT_TOOLS_RUNTIME.resetProlog("why");
    expect(current.resetProlog).toHaveBeenCalledWith("why");
  });

  test("the stamp refresh asks the session for the store again", async () => {
    const current = session("a");
    current.getAttachedBranchKbPath
      .mockReturnValueOnce("/nonexistent-kibi-root/.kb/branches/a")
      .mockReturnValue(null);
    useSession(current, true);
    const spec = {
      name: "kb_upsert",
      requiresProlog: false,
      effects: ["kb-write"],
    } as never;
    const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(spec, {
      workspaceRoot: "/nonexistent-kibi-root",
    });
    await DEFAULT_TOOLS_RUNTIME.operationRuntime.afterSuccess(spec, context);
    // The write sees an attached store; the refresh then finds none.
    expect(current.getAttachedBranchKbPath).toHaveBeenCalledTimes(2);
    expect(current.updateAttachedBranchStamp).not.toHaveBeenCalled();
  });

  test("network reads go through the global fetch", async () => {
    const response = new Response("ok");
    const fetch = spyOn(globalThis, "fetch").mockImplementation(
      (async () => response) as never,
    );
    try {
      const context = await DEFAULT_TOOLS_RUNTIME.operationRuntime.open(
        {
          name: "kb_sparql_remote",
          requiresProlog: false,
          effects: [],
        } as never,
        { workspaceRoot: "/nonexistent-kibi-root" },
      );
      const init = { method: "POST" };
      expect(await context.net?.fetch("https://example.test/q", init)).toBe(
        response,
      );
      expect(fetch).toHaveBeenCalledWith("https://example.test/q", init);
    } finally {
      fetch.mockRestore();
    }
  });
});
