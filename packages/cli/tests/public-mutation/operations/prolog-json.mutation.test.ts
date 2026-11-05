import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  OperationJsonDecodeError,
  runOperationJsonQuery,
  toPrologAtom,
  toPrologList,
} from "../../../src/public/operations/prolog-json.js";
import type { PrologQueryResult } from "../../../src/public/operations/runtime-types.js";

const ENV_KEYS = ["KIBI_KB_PL_PATH", "NODE_ENV"] as const;
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.KIBI_KB_PL_PATH = "/core/src/kb.pl";
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

type Call = readonly [string, AbortSignal | undefined];

function port(
  results: readonly PrologQueryResult[],
  extra: Record<string, unknown> = {},
) {
  const calls: Call[] = [];
  const queue = [...results];
  return {
    calls,
    port: {
      async query(goal: string, signal?: AbortSignal) {
        calls.push([goal, signal]);
        const next = queue.shift();
        if (next === undefined) throw new Error("unexpected query");
        return next;
      },
      async nextSolution() {
        return null;
      },
      async save() {
        return { success: true, bindings: {} };
      },
      ...extra,
    },
  };
}

const ok = (json: unknown): PrologQueryResult => ({
  success: true,
  bindings: { JsonString: json } as Record<string, string>,
});

function parseMessage(text: string): string {
  try {
    JSON.parse(text);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected invalid JSON");
}

describe("runOperationJsonQuery transport", () => {
  test("sends one combined goal to a one-shot port", async () => {
    const signal = new AbortController().signal;
    const { calls, port: prolog } = port([ok('{"a":1}')], {
      oneShotMode: true,
    });
    expect(
      await runOperationJsonQuery(prolog, "x.pl", "x:goal(J)", "X", signal),
    ).toStrictEqual({ a: 1 });
    expect(calls).toStrictEqual([
      ["(use_module('/core/src/x.pl'), x:goal(J))", signal],
    ]);
  });

  test("normalizes backslashes and escapes the module path", async () => {
    process.env.KIBI_KB_PL_PATH = "/it's\\core/kb.pl";
    const { calls, port: prolog } = port([ok("1")], { oneShotMode: true });
    await runOperationJsonQuery(prolog, "x.pl", "g", "X");
    expect(calls).toStrictEqual([
      ["(use_module('/it''s/core/x.pl'), g)", undefined],
    ]);
  });

  test("treats an unflagged port as one-shot under bun test", async () => {
    const { calls, port: prolog } = port([ok("1")]);
    await runOperationJsonQuery(prolog, "x.pl", "g", "X");
    expect(calls).toStrictEqual([
      ["(use_module('/core/src/x.pl'), g)", undefined],
    ]);
  });

  test("loads the module first on a long-lived engine", async () => {
    const signal = new AbortController().signal;
    const { calls, port: prolog } = port(
      [{ success: true, bindings: {} }, ok("[1]")],
      { storageStatus: async () => ({ success: true, bindings: {} }) },
    );
    expect(
      await runOperationJsonQuery(prolog, "x.pl", "g", "X", signal),
    ).toStrictEqual([1]);
    expect(calls).toStrictEqual([
      ["use_module('/core/src/x.pl')", signal],
      ["g", signal],
    ]);
  });

  test("loads the module first outside the test environment", async () => {
    process.env.NODE_ENV = "production";
    const { calls, port: prolog } = port([
      { success: true, bindings: {} },
      ok("2"),
    ]);
    expect(await runOperationJsonQuery(prolog, "x.pl", "g", "X")).toBe(2);
    expect(calls.map(([goal]) => goal)).toStrictEqual([
      "use_module('/core/src/x.pl')",
      "g",
    ]);
  });

  test("an explicit oneShotMode false wins over the test environment", async () => {
    const { calls, port: prolog } = port(
      [{ success: true, bindings: {} }, ok("3")],
      { oneShotMode: false },
    );
    expect(await runOperationJsonQuery(prolog, "x.pl", "g", "X")).toBe(3);
    expect(calls.map(([goal]) => goal)).toStrictEqual([
      "use_module('/core/src/x.pl')",
      "g",
    ]);
  });

  test("reports a failed module load", async () => {
    const failing = (error?: string) =>
      port(
        [
          error === undefined
            ? { success: false, bindings: {} }
            : { success: false, bindings: {}, error },
        ],
        { oneShotMode: false },
      ).port;
    await expect(
      runOperationJsonQuery(failing("no module"), "x.pl", "g", "Label"),
    ).rejects.toThrow(new Error("Label module load failed: no module"));
    await expect(
      runOperationJsonQuery(failing(), "x.pl", "g", "Label"),
    ).rejects.toThrow(new Error("Label module load failed: Unknown error"));
  });

  test("uses the typed status query for status.pl", async () => {
    const signal = new AbortController().signal;
    const seen: unknown[] = [];
    const { calls, port: prolog } = port([]);
    const withStatus = {
      ...prolog,
      async queryStatusJson(this: unknown, received?: AbortSignal) {
        seen.push(this === withStatus, received);
        return ok('{"fresh":true}');
      },
    };
    expect(
      await runOperationJsonQuery(withStatus, "status.pl", "g", "X", signal),
    ).toStrictEqual({ fresh: true });
    expect(seen).toStrictEqual([true, signal]);
    expect(calls).toStrictEqual([]);
  });

  test("queries status.pl normally without a typed status query", async () => {
    const { calls, port: prolog } = port([ok("4")], { oneShotMode: true });
    expect(await runOperationJsonQuery(prolog, "status.pl", "g", "X")).toBe(4);
    expect(calls.map(([goal]) => goal)).toStrictEqual([
      "(use_module('/core/src/status.pl'), g)",
    ]);
  });

  test("ignores the typed status query for other modules", async () => {
    const { calls, port: prolog } = port([ok("5")], {
      oneShotMode: true,
      queryStatusJson: async () => ok("99"),
    });
    expect(await runOperationJsonQuery(prolog, "other.pl", "g", "X")).toBe(5);
    expect(calls).toHaveLength(1);
  });
});

describe("runOperationJsonQuery decoding", () => {
  const run = (result: PrologQueryResult) =>
    runOperationJsonQuery(
      port([result], { oneShotMode: true }).port,
      "x.pl",
      "g",
      "Label",
    );

  test("reports a failed query", async () => {
    await expect(
      run({ success: false, bindings: {}, error: "boom" }),
    ).rejects.toThrow(new Error("Label query failed: boom"));
    await expect(run({ success: false, bindings: {} })).rejects.toThrow(
      new Error("Label query failed: Unknown error"),
    );
  });

  test("reports a missing JsonString binding", async () => {
    await expect(run({ success: true, bindings: {} })).rejects.toThrow(
      new Error("Label query returned no JsonString binding"),
    );
  });

  test("rejects a non-string binding as an outer decode error", async () => {
    const error = await run(ok(42)).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(OperationJsonDecodeError);
    const decode = error as OperationJsonDecodeError;
    expect(decode.message).toBe(
      "Label returned invalid JSON binding (stage=outer, bindingType=number, length=0, prefixCodePoints=[]): JsonString binding is not a string",
    );
    expect(decode.stage).toBe("outer");
    expect(decode.rawLength).toBe(0);
    expect(decode.prefixCodePoints).toStrictEqual([]);
  });

  test("rejects invalid outer JSON", async () => {
    const error = (await run(ok("{bad")).catch(
      (caught: unknown) => caught,
    )) as OperationJsonDecodeError;
    expect(error).toBeInstanceOf(OperationJsonDecodeError);
    expect(error.message).toBe(
      `Label returned invalid JSON binding (stage=outer, bindingType=string, length=4, prefixCodePoints=[123,98,97,100]): ${parseMessage("{bad")}`,
    );
    expect(error.stage).toBe("outer");
  });

  test("decodes a double-encoded result", async () => {
    expect(await run(ok(JSON.stringify('{"a":[1]}')))).toStrictEqual({
      a: [1],
    });
  });

  test("rejects invalid inner JSON", async () => {
    const error = (await run(ok(JSON.stringify("nope"))).catch(
      (caught: unknown) => caught,
    )) as OperationJsonDecodeError;
    expect(error).toBeInstanceOf(OperationJsonDecodeError);
    expect(error.message).toBe(
      `Label returned invalid JSON binding (stage=inner, bindingType=string, length=4, prefixCodePoints=[110,111,112,101]): ${parseMessage("nope")}`,
    );
    expect(error.stage).toBe("inner");
    expect(error.rawLength).toBe(4);
  });
});

describe("OperationJsonDecodeError", () => {
  test("bounds the raw prefix to eight code points", () => {
    const error = new OperationJsonDecodeError(
      "L",
      "inner",
      "😀abcdefghij",
      "plain cause",
    );
    expect(error.name).toBe("OperationJsonDecodeError");
    expect(error.code).toBe("engine_result_invalid_json");
    expect(error.rawLength).toBe(12);
    expect(error.prefixCodePoints).toStrictEqual([
      128512, 97, 98, 99, 100, 101, 102, 103,
    ]);
    expect(Object.isFrozen(error.prefixCodePoints)).toBe(true);
    expect(error.message).toBe(
      "L returned invalid JSON binding (stage=inner, bindingType=string, length=12, prefixCodePoints=[128512,97,98,99,100,101,102,103]): plain cause",
    );
  });
});

describe("Prolog literal helpers", () => {
  test("toPrologAtom", () => {
    expect(toPrologAtom()).toBe("none");
    expect(toPrologAtom("")).toBe("none");
    expect(toPrologAtom("it's")).toBe("'it''s'");
  });

  test("toPrologList", () => {
    expect(toPrologList()).toBe("[]");
    expect(toPrologList([])).toBe("[]");
    expect(toPrologList(["a", "b'c"])).toBe("['a','b''c']");
  });
});
