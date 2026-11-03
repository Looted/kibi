import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as runtime from "kibi-runtime";
import type { OperationContext, PrologProcess } from "kibi-runtime";

import { handleKbCheck } from "../../src/tools/check.js";
import { handleKbFindGaps } from "../../src/tools/find-gaps.js";
import { handleKbGraph } from "../../src/tools/graph.js";
import { handleKbModelRequirement } from "../../src/tools/model-requirement.js";
import { createMutationContext } from "../../src/tools/mutation-context.js";
import { handleKbPlanBootstrap } from "../../src/tools/plan-bootstrap.js";
import { validateLiveRelationshipTargets } from "../../src/tools/relationship-validation.js";
import {
  handleKbSkillsList,
  handleKbSkillsLoad,
  handleKbSkillsRead,
} from "../../src/tools/skills.js";
import { handleSparql } from "../../src/tools/sparql.js";
import { handleKbSuggestPredicates } from "../../src/tools/suggest-predicates.js";
import { __test__, handleKbUpsert } from "../../src/tools/upsert.js";
import { handleKbValidateUpsert } from "../../src/tools/validate-upsert.js";
import { resolveWorkspaceRoot } from "../../src/workspace.js";

type AnyContext = OperationContext & Record<string, unknown>;

const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

/** Replace `owner[key]` for one test and capture what it was called with. */
function capture<T extends object>(owner: T, key: keyof T, answer: unknown) {
  const spy = spyOn(owner, key as never).mockImplementation(
    (async () => answer) as never,
  );
  restores.push(() => spy.mockRestore());
  return spy as unknown as {
    mock: { calls: Array<[unknown, AnyContext]> };
  };
}

function engine() {
  const goals: string[] = [];
  const invalidate = mock(() => undefined);
  const prolog = {
    query: async (goal: string) => {
      goals.push(goal);
      return { success: true, bindings: { G: goal } };
    },
    invalidateCache: invalidate,
  };
  return { prolog: prolog as unknown as PrologProcess, goals, invalidate };
}

function expectFreshClock(context: AnyContext) {
  const before = Date.now();
  const now = context.clock();
  expect(now).toBeInstanceOf(Date);
  expect(now.getTime()).toBeGreaterThanOrEqual(before);
  expect(now.getTime()).toBeLessThanOrEqual(Date.now());
}

/** The four-method port the thin adapters hand the runtime. */
async function expectQueryPort(
  port: AnyContext["prolog"],
  goals: string[],
  invalidate: ReturnType<typeof mock>,
) {
  expect(await port?.query("a(X)")).toStrictEqual({
    success: true,
    bindings: { G: "a(X)" },
  });
  expect(await port?.nextSolution()).toBeNull();
  port?.invalidateCache?.();
  expect(invalidate).toHaveBeenCalledTimes(1);
  expect(await port?.save()).toStrictEqual({
    success: true,
    bindings: { G: "kb_save" },
  });
  expect(goals).toStrictEqual(["a(X)", "kb_save"]);
}

describe("handleKbCheck", () => {
  test("hands checkSpec the context's signal, clock and an engine port", async () => {
    const spy = capture(runtime.checkSpec, "execute", { ok: 1 });
    const { prolog, goals, invalidate } = engine();
    const signal = new AbortController().signal;
    const clock = () => new Date(3);
    const args = { rules: ["x"] } as never;
    const result = await handleKbCheck(prolog, args, {
      workspaceRoot: "/ctx",
      signal,
      clock,
      extra: 1,
    } as never);
    expect(result).toStrictEqual({ ok: 1 } as never);
    const [input, context] = spy.mock.calls[0] ?? [];
    expect(input).toStrictEqual({ rules: ["x"] });
    expect(input).not.toBe(args);
    expect(context.workspaceRoot).toBe("/ctx");
    expect(context.signal).toBe(signal);
    expect(context.clock).toBe(clock);
    expect(context.extra).toBe(1);
    await expectQueryPort(context.prolog, goals, invalidate);
  });

  test("an explicit workspaceRoot wins; without a context it builds its own", async () => {
    const spy = capture(runtime.checkSpec, "execute", {});
    const { prolog } = engine();
    await handleKbCheck(
      prolog,
      { workspaceRoot: "/arg" } as never,
      {
        workspaceRoot: "/ctx",
      } as never,
    );
    expect(spy.mock.calls[0]?.[1].workspaceRoot).toBe("/arg");
    await handleKbCheck(prolog, {} as never);
    const context = spy.mock.calls[1]?.[1] as AnyContext;
    expect(context.workspaceRoot).toBe(resolveWorkspaceRoot());
    expect(context.signal.aborted).toBe(false);
    expectFreshClock(context);
    expect(Object.keys(context).sort()).toStrictEqual([
      "clock",
      "prolog",
      "signal",
      "workspaceRoot",
    ]);
  });
});

describe("reporting adapters", () => {
  for (const [label, run, owner, key] of [
    [
      "handleKbFindGaps",
      (prolog: PrologProcess) =>
        handleKbFindGaps(prolog as never, { type: "req" }),
      runtime,
      "executeFindGaps",
    ],
    [
      "handleKbGraph",
      (prolog: PrologProcess) =>
        handleKbGraph(prolog as never, { seedIds: ["REQ-1"] } as never),
      runtime,
      "executeGraph",
    ],
  ] as const) {
    test(`${label} runs in the process directory with a query-only port`, async () => {
      const spy = capture(owner, key as never, { rows: [] });
      const { prolog, goals } = engine();
      expect(await run(prolog)).toStrictEqual({ rows: [] } as never);
      const [input, context] = spy.mock.calls[0] ?? [];
      expect(Object.keys(input as object).length).toBeGreaterThan(0);
      expect(context.workspaceRoot).toBe(process.cwd());
      expect(context.signal.aborted).toBe(false);
      expectFreshClock(context);
      const port = context.prolog;
      expect(port?.oneShotMode).toBe(true);
      expect(await port?.query("g")).toStrictEqual({
        success: true,
        bindings: { G: "g" },
      });
      expect(await port?.nextSolution()).toBeNull();
      expect(await port?.save()).toStrictEqual({
        success: true,
        bindings: { G: "kb_save" },
      });
      expect(goals).toStrictEqual(["g", "kb_save"]);
      await run({
        ...prolog,
        query: prolog.query,
        useOneShotMode: false,
      } as unknown as PrologProcess);
      expect(spy.mock.calls[1]?.[1].prolog?.oneShotMode).toBe(false);
    });
  }
});

describe("validateLiveRelationshipTargets", () => {
  test("hands the shared validator an engine port", async () => {
    const spy = capture(runtime, "validateLiveRelationshipTargets", undefined);
    const { prolog, goals, invalidate } = engine();
    const entity = { id: "REQ-1" };
    const relationships = [{ type: "covers" }];
    await validateLiveRelationshipTargets(prolog, entity, relationships);
    const call = spy.mock.calls[0] as unknown as [
      AnyContext["prolog"],
      unknown,
      unknown,
    ];
    expect(call[1]).toBe(entity);
    expect(call[2]).toBe(relationships);
    await expectQueryPort(call[0], goals, invalidate);
  });
});

describe("context-taking adapters", () => {
  test("handleKbModelRequirement passes a context through or builds one", async () => {
    const spy = capture(runtime.modelRequirementSpec, "execute", { m: 1 });
    const given = { workspaceRoot: "/ctx" } as never;
    expect(
      await handleKbModelRequirement(
        null as never,
        { text: "t" } as never,
        given,
      ),
    ).toStrictEqual({ m: 1 } as never);
    expect(spy.mock.calls[0]?.[1]).toBe(given);
    await handleKbModelRequirement(null as never, { text: "t" } as never);
    const built = spy.mock.calls[1]?.[1] as AnyContext;
    expect(built.workspaceRoot).toBe(resolveWorkspaceRoot());
    expect(built.signal.aborted).toBe(false);
    expectFreshClock(built);
  });

  test("handleKbSuggestPredicates uses the context, a plain context, or the engine", async () => {
    const spy = capture(runtime.suggestPredicatesSpec, "execute", { s: 1 });
    const given = { workspaceRoot: "/ctx" } as never;
    expect(
      await handleKbSuggestPredicates(null, { text: "t" } as never, given),
    ).toStrictEqual({ s: 1 } as never);
    expect(spy.mock.calls[0]?.[1]).toBe(given);

    await handleKbSuggestPredicates(null, { text: "t" } as never);
    const plain = spy.mock.calls[1]?.[1] as AnyContext;
    expect(Object.keys(plain).sort()).toStrictEqual([
      "clock",
      "signal",
      "workspaceRoot",
    ]);
    expect(plain.workspaceRoot).toBe(resolveWorkspaceRoot());
    expect(plain.signal.aborted).toBe(false);
    expectFreshClock(plain);

    const { prolog, goals } = engine();
    await handleKbSuggestPredicates(prolog, { text: "t" } as never);
    const discovery = spy.mock.calls[2]?.[1] as AnyContext;
    await discovery.prolog?.query("p");
    expect(goals).toStrictEqual(["p"]);
  });

  test("handleSparql builds a fetch-backed context", async () => {
    const spy = capture(runtime.sparqlRemoteSpec, "execute", { r: 1 });
    const args = { endpoint: "https://example.test/sparql", query: "ASK {}" };
    expect(await handleSparql(args)).toStrictEqual({ r: 1 } as never);
    expect(await handleSparql({} as never, args)).toStrictEqual({
      r: 1,
    } as never);
    expect(spy.mock.calls[0]?.[0]).toBe(args);
    expect(spy.mock.calls[1]?.[0]).toBe(args);
    const context = spy.mock.calls[0]?.[1] as AnyContext;
    expect(context.workspaceRoot).toBe(process.cwd());
    expect(context.signal.aborted).toBe(false);
    expectFreshClock(context);
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (async () => new Response("ok")) as never,
    );
    try {
      const init = { method: "POST" };
      const response = await context.net?.fetch("https://e.test", init);
      expect(await response?.text()).toBe("ok");
      expect(fetchSpy.mock.calls[0]).toStrictEqual(["https://e.test", init]);
    } finally {
      fetchSpy.mockRestore();
    }
    await expect(handleSparql({} as never)).rejects.toThrow(
      "SPARQL endpoint is required",
    );
  });

  test("handleKbPlanBootstrap fills workspace and host ports", async () => {
    const spy = capture(runtime, "executePlanBootstrap", { p: 1 });
    const signal = new AbortController().signal;
    const fs = { name: "fs" } as never;
    const git = { name: "git" } as never;
    expect(
      await handleKbPlanBootstrap(
        {} as never,
        {
          workspaceRoot: "/ctx",
          signal,
          fs,
          git,
        } as never,
      ),
    ).toStrictEqual({ p: 1 } as never);
    const first = spy.mock.calls[0]?.[1] as AnyContext;
    expect(first.workspaceRoot).toBe("/ctx");
    expect(first.signal).toBe(signal);
    expect(first.fs).toBe(fs);
    expect(first.git).toBe(git);
    await handleKbPlanBootstrap(
      {} as never,
      {
        workspaceRoot: "",
        signal,
      } as never,
    );
    const second = spy.mock.calls[1]?.[1] as AnyContext;
    expect(second.workspaceRoot).toBe(resolveWorkspaceRoot());
    expect(second.fs).toBe(runtime.nodeFilesystem);
    expect(second.git).toBe(runtime.nodeGit);
  });

  test("handleKbPlanBootstrap refuses anything but an operation context", async () => {
    capture(runtime, "executePlanBootstrap", {});
    for (const bad of [
      null,
      undefined,
      "ctx",
      { workspaceRoot: "/x" },
      { signal: new AbortController().signal },
    ])
      await expect(
        handleKbPlanBootstrap({} as never, bad as never),
      ).rejects.toThrow(new TypeError("Invalid bootstrap adapter invocation"));
  });
});

describe("skills adapters", () => {
  test("each skills handler runs in the process directory", async () => {
    const list = capture(runtime.skillsListSpec, "execute", { l: 1 });
    const load = capture(runtime.skillsLoadSpec, "execute", { o: 1 });
    const read = capture(runtime.skillsReadSpec, "execute", { r: 1 });
    expect(await handleKbSkillsList({})).toStrictEqual({ l: 1 } as never);
    expect(await handleKbSkillsLoad({ id: "a" })).toStrictEqual({
      o: 1,
    } as never);
    expect(await handleKbSkillsRead({ id: "a", resource: "b" })).toStrictEqual({
      r: 1,
    } as never);
    expect(list.mock.calls[0]?.[0]).toStrictEqual({});
    expect(load.mock.calls[0]?.[0]).toStrictEqual({ id: "a" });
    expect(read.mock.calls[0]?.[0]).toStrictEqual({ id: "a", resource: "b" });
    for (const spy of [list, load, read]) {
      const context = spy.mock.calls[0]?.[1] as AnyContext;
      expect(Object.keys(context).sort()).toStrictEqual([
        "clock",
        "signal",
        "workspaceRoot",
      ]);
      expect(context.workspaceRoot).toBe(process.cwd());
      expect(context.signal.aborted).toBe(false);
      expectFreshClock(context);
    }
  });

  test("failures are labelled, and non-Error failures are kept as text", async () => {
    for (const [owner, run, label] of [
      [runtime.skillsListSpec, () => handleKbSkillsList({}), "list"],
      [runtime.skillsLoadSpec, () => handleKbSkillsLoad({ id: "a" }), "load"],
    ] as const) {
      const spy = spyOn(owner, "execute").mockImplementation((async () => {
        throw "plain";
      }) as never);
      restores.push(() => spy.mockRestore());
      await expect(run()).rejects.toThrow(`Skills ${label} failed: plain`);
      spy.mockImplementation((async () => {
        throw new Error("boom");
      }) as never);
      await expect(run()).rejects.toThrow(`Skills ${label} failed: boom`);
    }
  });

  test("a read failure names the skill's declared resources when it has any", async () => {
    const read = spyOn(runtime.skillsReadSpec, "execute").mockImplementation(
      (async () => {
        throw "missing";
      }) as never,
    );
    restores.push(() => read.mockRestore());
    const load = spyOn(runtime, "loadBundledSkill");
    restores.push(() => load.mockRestore());

    load.mockImplementation((() => ({ manifest: {} })) as never);
    await expect(
      handleKbSkillsRead({ id: "s", resource: "r" }),
    ).rejects.toThrow(
      new Error("Skills read failed: missing. Declared resources: none"),
    );
    load.mockImplementation((() => ({ manifest: { resources: [] } })) as never);
    await expect(
      handleKbSkillsRead({ id: "s", resource: "r" }),
    ).rejects.toThrow(
      new Error("Skills read failed: missing. Declared resources: none"),
    );
    load.mockImplementation((() => ({
      manifest: { resources: ["a.md", "b.md"] },
    })) as never);
    await expect(
      handleKbSkillsRead({ id: "s", resource: "r" }),
    ).rejects.toThrow(
      new Error("Skills read failed: missing. Declared resources: a.md, b.md"),
    );
    expect(load.mock.calls.at(-1)?.[0]).toBe("s");
    load.mockRestore();
    await expect(handleKbSkillsRead({ id: "", resource: "r" })).rejects.toThrow(
      new Error("Skills read failed: missing"),
    );
    await expect(
      handleKbSkillsRead({ id: "no-such-skill", resource: "r" }),
    ).rejects.toThrow(new Error("Skills read failed: missing"));
    read.mockImplementation((async () => {
      throw new Error("gone");
    }) as never);
    await expect(
      handleKbSkillsRead({ id: "no-such-skill", resource: "r" }),
    ).rejects.toThrow(new Error("Skills read failed: gone"));
  });
});

describe("mutation adapters", () => {
  const originalWorkspace = process.env.KIBI_WORKSPACE;
  afterEach(() => {
    if (originalWorkspace === undefined)
      Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    else process.env.KIBI_WORKSPACE = originalWorkspace;
  });

  test("createMutationContext without an engine or workspace pin", () => {
    Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    const context = createMutationContext() as AnyContext;
    expect(Object.keys(context).sort()).toStrictEqual([
      "clock",
      "signal",
      "sourceFirst",
      "workspaceRoot",
    ]);
    expect(context.sourceFirst).toBe(false);
    expect(context.workspaceRoot).toBe(resolveWorkspaceRoot());
    expect(context.signal.aborted).toBe(false);
    expectFreshClock(context);
  });

  test("createMutationContext with an engine gives the four-method port", async () => {
    Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    const { prolog, goals, invalidate } = engine();
    const context = createMutationContext(prolog) as AnyContext;
    await expectQueryPort(context.prolog, goals, invalidate);
  });

  test("a pinned workspace gets a working filesystem port", async () => {
    const { mkdtempSync, rmSync, existsSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "kibi-mut-ctx-"));
    try {
      process.env.KIBI_WORKSPACE = dir;
      const fs = createMutationContext().fs;
      expect(fs).toBeDefined();
      const nested = join(dir, "a", "b");
      expect(await fs?.mkdir(nested)).toBeUndefined();
      expect(existsSync(nested)).toBe(true);
      const file = join(nested, "f.txt");
      await fs?.writeFile(file, "héllo");
      expect(await fs?.readFile(file)).toBe("héllo");
      expect((await fs?.stat(file))?.isFile()).toBe(true);
      await fs?.unlink?.(file);
      expect(existsSync(file)).toBe(false);
      process.env.KIBI_WORKSPACE = "";
      expect(createMutationContext().fs).toBe(fs);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("handleKbUpsert runs upsertSpec with a mutation context", async () => {
    const spy = capture(runtime.upsertSpec, "execute", { u: 1 });
    const { prolog, goals } = engine();
    const args = { type: "req", id: "REQ-1", properties: {} } as never;
    expect(await handleKbUpsert(prolog, args)).toStrictEqual({ u: 1 } as never);
    expect(spy.mock.calls[0]?.[0]).toBe(args);
    await spy.mock.calls[0]?.[1].prolog?.query("q");
    expect(goals).toStrictEqual(["q"]);
  });

  test("the refresh seam wraps failures and only logs them in debug mode", async () => {
    const seam = spyOn(runtime, "setSymbolRefreshForTests");
    restores.push(() => seam.mockRestore());
    seam.mockImplementation((() => undefined) as never);
    __test__.setRefreshCoordinatesForSymbolIdForTests(undefined);
    expect(seam.mock.calls[0]).toStrictEqual([undefined]);

    const answer = { refreshed: true, found: true };
    __test__.setRefreshCoordinatesForSymbolIdForTests(
      (async () => answer) as never,
    );
    const ok = seam.mock.calls[1]?.[0] as (id: string) => Promise<unknown>;
    expect(await ok("SYM-1")).toBe(answer);

    let failure: unknown = new Error("disk");
    __test__.setRefreshCoordinatesForSymbolIdForTests((async () => {
      throw failure;
    }) as never);
    const failing = seam.mock.calls[2]?.[0] as (id: string) => Promise<unknown>;
    const warn = spyOn(console, "warn").mockImplementation(() => undefined);
    restores.push(() => warn.mockRestore());
    const previous = process.env.KIBI_MCP_DEBUG;
    try {
      Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
      expect(await failing("SYM-1")).toStrictEqual({
        refreshed: false,
        found: false,
      });
      expect(warn).not.toHaveBeenCalled();
      process.env.KIBI_MCP_DEBUG = "1";
      await failing("SYM-1");
      failure = "text";
      await failing("SYM-2");
      expect(warn.mock.calls).toStrictEqual([
        ["[KIBI-MCP] Symbol coordinate auto-refresh failed for SYM-1: disk"],
        ["[KIBI-MCP] Symbol coordinate auto-refresh failed for SYM-2: text"],
      ]);
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
      else process.env.KIBI_MCP_DEBUG = previous;
    }
  });

  test("handleKbValidateUpsert accepts the payload alone or after an engine", async () => {
    const spy = capture(runtime.validateUpsertSpec, "execute", {
      content: [],
      structuredContent: { valid: true },
    });
    const args = { type: "req", id: "REQ-1", properties: {} } as never;
    expect(await handleKbValidateUpsert(args)).toStrictEqual({
      content: [],
      structuredContent: { valid: true },
    } as never);
    expect(spy.mock.calls[0]?.[0]).toBe(args);
    expect("prolog" in (spy.mock.calls[0]?.[1] ?? {})).toBe(false);

    const { prolog, goals } = engine();
    await handleKbValidateUpsert(prolog, args);
    expect(spy.mock.calls[1]?.[0]).toBe(args);
    await spy.mock.calls[1]?.[1].prolog?.query("v");
    expect(goals).toStrictEqual(["v"]);

    // A payload in first position with a second payload: no engine.
    await handleKbValidateUpsert(args, args);
    expect("prolog" in (spy.mock.calls[2]?.[1] ?? {})).toBe(false);
  });

  test("handleKbValidateUpsert refuses a call without a payload", async () => {
    capture(runtime.validateUpsertSpec, "execute", { structuredContent: {} });
    for (const partial of [
      { type: "req", id: "REQ-1" },
      { type: "req", properties: {} },
      { id: "REQ-1", properties: {} },
    ])
      await expect(handleKbValidateUpsert(partial as never)).rejects.toThrow(
        new Error("kb_validate_upsert requires an upsert payload"),
      );
  });

  test("handleKbValidateUpsert refuses a result without structured content", async () => {
    capture(runtime.validateUpsertSpec, "execute", { content: [] });
    await expect(
      handleKbValidateUpsert({
        type: "req",
        id: "REQ-1",
        properties: {},
      } as never),
    ).rejects.toThrow(
      new Error("kb_validate_upsert returned no structured content"),
    );
  });
});
