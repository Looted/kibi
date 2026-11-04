import { describe, expect, test } from "bun:test";

import type { PrologProcess } from "kibi-runtime";
import { createDiscoveryContext } from "../../src/tools/discovery-adapter.js";
import { resolveWorkspaceRoot } from "../../src/workspace.js";

type Call = { readonly method: string; readonly args: readonly unknown[] };

function engine(extra: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const record = (method: string, answer: unknown) =>
    function (this: unknown, ...args: unknown[]) {
      calls.push({ method, args: [this, ...args] });
      return Promise.resolve(answer);
    };
  const process = {
    query: record("query", { success: true, bindings: { X: "1" } }),
    ...Object.fromEntries(
      Object.entries(extra).map(([key, answer]) => [key, record(key, answer)]),
    ),
  };
  return { process, calls };
}

describe("createDiscoveryContext", () => {
  test("forwards queries with the base signal and replays the last answer once", async () => {
    const { process, calls } = engine();
    const controller = new AbortController();
    const clock = () => new Date(5);
    const context = createDiscoveryContext(
      process as unknown as PrologProcess,
      {
        workspaceRoot: "/ws",
        signal: controller.signal,
        clock,
        extra: "kept",
      } as never,
    );
    expect(context.workspaceRoot).toBe("/ws");
    expect(context.signal).toBe(controller.signal);
    expect(context.clock).toBe(clock);
    expect((context as unknown as { extra: string }).extra).toBe("kept");

    const port = context.prolog;
    expect(port).toBeDefined();
    expect(await port?.nextSolution()).toBeNull();
    const answer = await port?.query("goal(X)");
    expect(answer).toStrictEqual({ success: true, bindings: { X: "1" } });
    expect(calls[0]?.args).toStrictEqual([
      process,
      "goal(X)",
      controller.signal,
    ]);
    expect(await port?.nextSolution()).toBe(answer);
    expect(await port?.nextSolution()).toBeNull();

    const own = new AbortController().signal;
    await port?.query("other", own);
    expect(calls[1]?.args[2]).toBe(own);

    await port?.save();
    expect(calls[2]?.args).toStrictEqual([
      process,
      "kb_save",
      controller.signal,
    ]);
    await port?.save(own);
    expect(calls[3]?.args[2]).toBe(own);

    for (const key of [
      "queryEntities",
      "searchEntities",
      "storageStatus",
      "queryStatusJson",
    ])
      expect(key in (port ?? {})).toBe(false);
  });

  test("without a base context it resolves the workspace and makes its own signal and clock", () => {
    const { process } = engine();
    const context = createDiscoveryContext(process as unknown as PrologProcess);
    expect(context.workspaceRoot).toBe(resolveWorkspaceRoot());
    expect(context.signal.aborted).toBe(false);
    const before = Date.now();
    const now = context.clock().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  test("indexed discovery and status reach the engine methods with the right signal", async () => {
    const { process, calls } = engine({
      queryEntities: "entities",
      searchEntities: "search",
      storageStatus: "storage",
      queryStatusJson: "status",
    });
    const base = new AbortController().signal;
    const own = new AbortController().signal;
    const port = createDiscoveryContext(
      process as unknown as PrologProcess,
      {
        workspaceRoot: "/ws",
        signal: base,
      } as never,
    ).prolog;
    const input = { type: "req" } as never;

    expect(await port?.queryEntities?.(input)).toBe("entities" as never);
    expect(await port?.queryEntities?.(input, own)).toBe("entities" as never);
    expect(await port?.searchEntities?.(input)).toBe("search" as never);
    expect(await port?.searchEntities?.(input, own)).toBe("search" as never);
    expect(await port?.storageStatus?.()).toBe("storage" as never);
    expect(await port?.queryStatusJson?.()).toBe("status" as never);
    expect(await port?.queryStatusJson?.(own)).toBe("status" as never);
    expect(calls).toStrictEqual([
      { method: "queryEntities", args: [process, input, base] },
      { method: "queryEntities", args: [process, input, own] },
      { method: "searchEntities", args: [process, input, base] },
      { method: "searchEntities", args: [process, input, own] },
      { method: "storageStatus", args: [process] },
      { method: "queryStatusJson", args: [process, base] },
      { method: "queryStatusJson", args: [process, own] },
    ]);
  });

  test("one-shot mode follows the engine, else the Bun runtime", () => {
    const { process } = engine();
    const build = (mode: unknown) =>
      createDiscoveryContext({
        ...process,
        ...(mode === "absent" ? {} : { useOneShotMode: mode }),
      } as unknown as PrologProcess).prolog?.oneShotMode;
    expect(build(true)).toBe(true);
    expect(build(false)).toBe(false);
    expect(build(1)).toBe(true);
    expect(build(0)).toBe(false);
    expect(build("absent")).toBe(true);
  });
});
