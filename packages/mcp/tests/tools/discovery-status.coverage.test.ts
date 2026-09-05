import { afterEach, describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-runtime";
import { refreshSymbolCoordinatesForManifest } from "kibi-cli/operations/mutation/symbol-refresh";

import { createDiscoveryContext } from "../../src/tools/discovery-adapter.js";
import { handleKbStatus } from "../../src/tools/status.js";
import { __test__, validateKbUpsertArgs } from "../../src/tools/upsert.js";

const previousDebug = process.env.KIBI_MCP_DEBUG;

afterEach(() => {
  __test__.setRefreshCoordinatesForSymbolIdForTests(undefined);
  if (previousDebug === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
  } else {
    process.env.KIBI_MCP_DEBUG = previousDebug;
  }
});

describe("discovery-adapter Prolog port", () => {
  test("captures query results, nextSolution, save, and optional status json", async () => {
    const query = async (goal: string) => ({
      success: true,
      bindings: { goal },
    });
    const prolog = {
      query,
      invalidateCache: () => {},
      queryStatusJson: async () => ({
        success: true,
        bindings: { Json: "{}" },
      }),
      useOneShotMode: false,
    };
    const context = createDiscoveryContext(prolog as unknown as PrologProcess, {
      workspaceRoot: "/tmp/kibi-discovery",
      signal: new AbortController().signal,
      clock: () => new Date("2026-01-01T00:00:00Z"),
    });
    expect(context.workspaceRoot).toBe("/tmp/kibi-discovery");
    expect(context.prolog?.oneShotMode).toBe(false);
    const first = await context.prolog?.query("kb_status");
    expect(first?.bindings).toEqual({ goal: "kb_status" });
    expect(await context.prolog?.nextSolution()).toEqual(first);
    expect(await context.prolog?.nextSolution()).toBeNull();
    await context.prolog?.save();
    expect(await context.prolog?.queryStatusJson?.()).toMatchObject({
      success: true,
    });
  });

  test("defaults workspace and enables one-shot mode when Bun is present", async () => {
    const prolog = {
      query: async () => ({ success: true, bindings: {} }),
      invalidateCache: () => {},
    };
    const context = createDiscoveryContext(prolog as unknown as PrologProcess);
    expect(context.workspaceRoot.length).toBeGreaterThan(0);
    expect(context.prolog?.oneShotMode).toBe(true);
    expect(typeof context.clock()).toBe("object");
  });
});

describe("handleKbStatus cache invalidation", () => {
  test("invalidates the Prolog cache before executing status", async () => {
    const invalidateCache = () => {
      invalidateCache.called = true;
    };
    invalidateCache.called = false;
    const prolog = {
      invalidateCache,
      query: async () => ({
        success: true,
        bindings: {
          StatusJson: JSON.stringify({
            branch: "main",
            dirty: false,
            syncState: "fresh",
          }),
        },
      }),
    } as unknown as PrologProcess;
    try {
      await handleKbStatus(
        prolog,
        {},
        {
          workspaceRoot: process.cwd(),
          signal: new AbortController().signal,
          clock: () => new Date(),
        },
      );
    } catch {
      // Status may fail without a live store; the invalidateCache branch still ran.
    }
    expect(invalidateCache.called).toBe(true);
  });
});

describe("upsert test hooks", () => {
  test("validateKbUpsertArgs rejects an empty payload", () => {
    expect(() => validateKbUpsertArgs({} as never)).toThrow();
  });

  test("coordinate refresh wrapper swallows thrown errors", async () => {
    process.env.KIBI_MCP_DEBUG = "1";
    const warn = mock((..._args: unknown[]) => {});
    const original = console.warn;
    console.warn = warn as typeof console.warn;
    try {
      __test__.setRefreshCoordinatesForSymbolIdForTests(async () => {
        throw new Error("refresh exploded");
      });
      const result = await refreshSymbolCoordinatesForManifest(
        "SYM-1",
        "/tmp/symbols.yaml",
        {
          workspaceRoot: "/tmp",
          signal: new AbortController().signal,
          clock: () => new Date(),
        },
      );
      expect(result).toEqual({ refreshed: false, found: false });

      __test__.setRefreshCoordinatesForSymbolIdForTests(async () => {
        throw "string-fail";
      });
      const second = await refreshSymbolCoordinatesForManifest(
        "SYM-2",
        "/tmp/symbols.yaml",
        {
          workspaceRoot: "/tmp",
          signal: new AbortController().signal,
          clock: () => new Date(),
        },
      );
      expect(second).toEqual({ refreshed: false, found: false });
    } finally {
      console.warn = original;
      __test__.setRefreshCoordinatesForSymbolIdForTests(undefined);
    }
  });
});
