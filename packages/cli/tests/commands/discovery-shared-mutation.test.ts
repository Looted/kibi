import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import path from "node:path";
import {
  executeReportingSpec,
  printDiscoveryResult,
  resolveCoreModulePath,
  resolveCurrentKbPath,
  runJsonModuleQuery,
  withAttachedBranchProlog,
} from "../../src/commands/discovery-shared.js";
import { EngineClient } from "../../src/engine.js";
import type { PrologProcess } from "../../src/prolog.js";
import * as runtimeTypes from "../../src/public/operations/runtime-types.js";
import { coverageSpec } from "../../src/public/operations/specs/reporting.js";
import * as detachedSnapshot from "../../src/runtime/detached-snapshot.js";
import * as resolver from "../../src/utils/branch-resolver.js";

const restores: Array<() => void> = [];
let logs: string[] = [];
let warns: string[] = [];

beforeEach(() => {
  logs = [];
  warns = [];
  const spies = [
    spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    }),
    spyOn(console, "warn").mockImplementation((...args) => {
      warns.push(args.map(String).join(" "));
    }),
  ];
  for (const spy of spies) restores.push(() => spy.mockRestore());
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
});

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

function attach(answer: unknown) {
  return track(
    spyOn(resolver, "resolveReadBranchAttachment").mockReturnValue(
      answer as never,
    ),
  );
}

const plain = {
  gitBranch: "main",
  kbBranch: "kb-main",
  storePath: "/store/it's",
  kind: "exact",
  migrationRequired: false,
};

type Answer = { success: boolean; error?: string; bindings: object };

function fakeProlog(answer: Answer = { success: true, bindings: {} }) {
  const calls: string[] = [];
  const prolog = {
    start: async () => {
      calls.push("start");
    },
    query: async (goal: string) => {
      calls.push(goal);
      return answer;
    },
    terminate: async () => {
      calls.push("terminate");
    },
  };
  return { prolog: prolog as unknown as PrologProcess, calls };
}

describe("withAttachedBranchProlog with an injected process", () => {
  test("starts it, attaches the branch store and cleans up", async () => {
    attach(plain);
    const fake = fakeProlog();
    const options: unknown[] = [];
    const seen: unknown[] = [];
    const value = await withAttachedBranchProlog(
      async (prolog) => {
        seen.push(prolog);
        return 42;
      },
      {
        createProlog: (opts) => {
          options.push(opts);
          return fake.prolog;
        },
      },
    );
    expect(value).toBe(42);
    expect(seen).toStrictEqual([fake.prolog]);
    expect(options).toStrictEqual([{ timeout: 120000 }]);
    expect(fake.calls).toStrictEqual([
      "start",
      "kb_attach('/store/it''s')",
      "kb_detach",
      "terminate",
    ]);
    expect(warns).toStrictEqual([]);
  });

  test("a failed attach names the engine's error or an unknown one", async () => {
    attach(plain);
    for (const [answer, message] of [
      [{ success: false, error: "no store", bindings: {} }, "no store"],
      [{ success: false, bindings: {} }, "Unknown error"],
    ] as const) {
      const fake = fakeProlog(answer);
      let called = false;
      await expect(
        withAttachedBranchProlog(
          async () => {
            called = true;
          },
          { createProlog: () => fake.prolog },
        ),
      ).rejects.toThrow(`Failed to attach KB: ${message}`);
      expect(called).toBe(false);
      expect(fake.calls.slice(-2)).toStrictEqual(["kb_detach", "terminate"]);
    }
  });

  test("a branch that cannot be resolved fails before starting anything", async () => {
    attach({ error: "no branch here" });
    const fake = fakeProlog();
    await expect(
      withAttachedBranchProlog(async () => 1, {
        createProlog: () => fake.prolog,
      }),
    ).rejects.toThrow(new Error("no branch here"));
    expect(fake.calls).toStrictEqual([]);
  });
});

describe("withAttachedBranchProlog with the branch engine", () => {
  function stubEngine() {
    const calls: unknown[] = [];
    track(
      spyOn(EngineClient.prototype, "start").mockImplementation(async function (
        this: unknown,
      ) {
        calls.push(["start", this]);
      } as never),
    );
    track(
      spyOn(EngineClient.prototype, "terminate").mockImplementation(
        async () => {
          calls.push("terminate");
        },
      ),
    );
    track(
      spyOn(EngineClient.prototype, "query").mockImplementation((async (
        goal: string,
      ) => {
        calls.push(goal);
        return { success: true, bindings: {} };
      }) as never),
    );
    return calls;
  }

  test("serves the callback from an engine on the branch and terminates it", async () => {
    attach(plain);
    const calls = stubEngine();
    const seen: unknown[] = [];
    const value = await withAttachedBranchProlog(async (prolog) => {
      seen.push(prolog);
      return "engine";
    });
    expect(value).toBe("engine");
    expect(seen[0]).toBeInstanceOf(EngineClient);
    expect(calls).toStrictEqual([["start", seen[0]], "terminate"]);
  });

  test("a branch that cannot be resolved reports its own error", async () => {
    attach({ error: "no branch here" });
    const calls = stubEngine();
    await expect(withAttachedBranchProlog(async () => 1)).rejects.toThrow(
      new Error("no branch here"),
    );
    expect(calls).toStrictEqual([]);
  });

  test("a detached checkout warns and refreshes its snapshot first", async () => {
    const attachment = {
      ...plain,
      readOnly: { notice: "reading a snapshot" },
    };
    attach(attachment);
    const calls = stubEngine();
    const refreshed: unknown[][] = [];
    track(
      spyOn(detachedSnapshot, "refreshDetachedSnapshot").mockImplementation(
        (async (...args: unknown[]) => {
          refreshed.push(args);
          calls.push("refresh");
        }) as never,
      ),
    );
    await withAttachedBranchProlog(async () => undefined);
    expect(warns).toStrictEqual(["[KIBI] reading a snapshot"]);
    expect(refreshed).toStrictEqual([[process.cwd(), attachment]]);
    expect(calls[0]).toBe("refresh");
  });
});

describe("resolveCurrentKbPath", () => {
  test("returns the store path or throws the resolution error", async () => {
    const spy = track(
      spyOn(resolver, "resolveBranchAttachment").mockReturnValue(
        plain as never,
      ),
    );
    expect(await resolveCurrentKbPath()).toBe("/store/it's");
    expect(spy.mock.calls[0]).toStrictEqual([process.cwd()]);
    spy.mockReturnValue({ error: "detached" } as never);
    await expect(resolveCurrentKbPath()).rejects.toThrow(new Error("detached"));
  });
});

describe("resolveCoreModulePath", () => {
  test("joins the file beside the core kb.pl", () => {
    expect(
      resolveCoreModulePath("checks.pl", {
        resolveKbPl: () => "/core/src/kb.pl",
      }),
    ).toBe(path.join("/core/src", "checks.pl"));
    expect(resolveCoreModulePath("x.pl", {})).toBe(
      resolveCoreModulePath("x.pl"),
    );
    expect(path.basename(resolveCoreModulePath("x.pl"))).toBe("x.pl");
  });
});

describe("runJsonModuleQuery", () => {
  const deps = { resolveKbPl: () => "/core\\it's/kb.pl" };
  const modulePath = "/core/it''s/m.pl";

  test("loads the module, optionally attaches, and parses the JSON", async () => {
    const fake = fakeProlog({
      success: true,
      bindings: { JsonString: '{"a":1}' },
    });
    expect(
      await runJsonModuleQuery(
        fake.prolog,
        "m.pl",
        "goal(X)",
        "L",
        undefined,
        deps,
      ),
    ).toStrictEqual({ a: 1 });
    const twice = fakeProlog({
      success: true,
      bindings: { JsonString: JSON.stringify('{"b":2}') },
    });
    expect(
      await runJsonModuleQuery(
        twice.prolog,
        "m.pl",
        "goal(X)",
        "L",
        "/kb/o'k",
        deps,
      ),
    ).toStrictEqual({ b: 2 });
    expect(fake.calls).toStrictEqual([
      `(use_module('${modulePath}'), goal(X))`,
    ]);
    expect(twice.calls).toStrictEqual([
      `(use_module('${modulePath}'), kb_attach('/kb/o''k'), goal(X), kb_detach)`,
    ]);
  });

  test("names the label on a failed query or a missing binding", async () => {
    for (const [answer, message] of [
      [{ success: false, error: "boom", bindings: {} }, "L: boom"],
      [{ success: false, bindings: {} }, "L: Unknown error"],
      [{ success: true, bindings: {} }, "L: missing JsonString binding"],
      [
        { success: true, bindings: { JsonString: "" } },
        "L: missing JsonString binding",
      ],
    ] as const) {
      const fake = fakeProlog(answer);
      await expect(
        runJsonModuleQuery(fake.prolog, "m.pl", "g", "L", undefined, deps),
      ).rejects.toThrow(new Error(message));
    }
  });
});

describe("printDiscoveryResult", () => {
  test("prints JSON, a rendered table, or the fallback", () => {
    printDiscoveryResult("json", { a: [1] }, "fallback");
    printDiscoveryResult("table", "not a table", "fallback");
    printDiscoveryResult(undefined, { results: [], count: 0 }, "fallback");
    expect(logs[0]).toBe(JSON.stringify({ a: [1] }, null, 2));
    expect(logs[1]).toBe("fallback");
    expect(logs[2]).not.toBe("fallback");
    expect(logs[2]?.length).toBeGreaterThan(0);
    expect(logs).toHaveLength(3);
  });
});

describe("executeReportingSpec", () => {
  test("runs the spec on a CLI runtime with the same options", async () => {
    const calls: unknown[][] = [];
    track(
      spyOn(runtimeTypes, "executeOperation").mockImplementation((async (
        ...args: unknown[]
      ) => {
        calls.push(args);
        return "result";
      }) as never),
    );
    const options = { workspaceRoot: "/ws" };
    expect(
      await executeReportingSpec(coverageSpec, { by: "req" } as never, options),
    ).toBe("result" as never);
    await executeReportingSpec(coverageSpec, { by: "type" } as never);
    expect(calls[0]?.[1]).toBe(coverageSpec);
    expect(calls[0]?.[2]).toStrictEqual({ by: "req" });
    expect(calls[0]?.[3]).toBe(options);
    expect(typeof (calls[0]?.[0] as { open?: unknown }).open).toBe("function");
    expect(calls[1]?.[3]).toStrictEqual({});
  });
});
