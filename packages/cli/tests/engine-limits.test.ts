import { describe, expect, test } from "bun:test";
import {
  BOUNDED_READ_HELPER_DEFINITION,
  ENGINE_READ_INFERENCE_LIMIT_ENV,
  ENGINE_READ_TIME_LIMIT_CAP_MS,
  ENGINE_READ_TIME_LIMIT_ENV,
  EngineQueryLimitError,
  QUERY_LIMIT_EXCEEDED_CODE,
  assertWithinQueryLimits,
  boundedReadGoal,
  normalizeQueryLimits,
  queryLimitExceededOf,
  queryLimitsFromEnv,
  settleBoundedRead,
} from "../src/engine-limits.js";

describe("normalizeQueryLimits", () => {
  test("keeps positive safe integers and caps the time budget", () => {
    expect(normalizeQueryLimits({ timeMs: 250, inferences: 1000 })).toEqual({
      timeMs: 250,
      inferences: 1000,
    });
    expect(normalizeQueryLimits({ timeMs: 10_000_000 })).toEqual({
      timeMs: ENGINE_READ_TIME_LIMIT_CAP_MS,
    });
  });

  test("drops anything that is not a usable budget", () => {
    for (const value of [null, undefined, 5, "x", {}])
      expect(normalizeQueryLimits(value)).toBeUndefined();
    expect(normalizeQueryLimits({ timeMs: 0, inferences: -1 })).toBeUndefined();
    expect(
      normalizeQueryLimits({ timeMs: 1.5, inferences: "9" }),
    ).toBeUndefined();
    expect(
      normalizeQueryLimits({ inferences: 1_000_000_000_001 }),
    ).toBeUndefined();
    expect(normalizeQueryLimits({ timeMs: Number.NaN, inferences: 7 })).toEqual(
      { inferences: 7 },
    );
  });
});

describe("queryLimitsFromEnv", () => {
  test("reads both budgets and ignores blank or invalid values", () => {
    expect(
      queryLimitsFromEnv({
        [ENGINE_READ_TIME_LIMIT_ENV]: " 1500 ",
        [ENGINE_READ_INFERENCE_LIMIT_ENV]: "20000",
      }),
    ).toEqual({ timeMs: 1500, inferences: 20000 });
    expect(queryLimitsFromEnv({})).toBeUndefined();
    expect(
      queryLimitsFromEnv({
        [ENGINE_READ_TIME_LIMIT_ENV]: "   ",
        [ENGINE_READ_INFERENCE_LIMIT_ENV]: "1e3x",
      }),
    ).toBeUndefined();
    expect(
      queryLimitsFromEnv({ [ENGINE_READ_TIME_LIMIT_ENV]: "-5" }),
    ).toBeUndefined();
  });
});

describe("boundedReadGoal", () => {
  test("passes seconds with millisecond precision and none for absent budgets", () => {
    expect(boundedReadGoal("member(X, [1])", { timeMs: 1500 })).toBe(
      "(kibi_engine_bounded_read((member(X, [1])), 1.500, none, KibiReadOutcome))",
    );
    expect(boundedReadGoal("true", { inferences: 42 })).toBe(
      "(kibi_engine_bounded_read((true), none, 42, KibiReadOutcome))",
    );
  });
});

describe("settleBoundedRead", () => {
  const limits = { timeMs: 2000, inferences: 500 };

  test("strips the outcome binding from a read that finished", () => {
    expect<unknown>(
      settleBoundedRead(
        {
          success: true,
          bindings: { X: "1", KibiReadOutcome: "kibi_read_outcome(none)" },
        },
        limits,
      ),
    ).toEqual({ success: true, bindings: { X: "1" } });
  });

  test("turns a time or inference stop into a non-retryable limit error", () => {
    const time = settleBoundedRead(
      {
        success: true,
        bindings: { X: "_", KibiReadOutcome: "kibi_read_outcome(time)" },
      },
      limits,
    );
    expect(time).toEqual({
      success: false,
      bindings: {},
      error: `${QUERY_LIMIT_EXCEEDED_CODE}: read stopped at its time limit of 2000 ms (${ENGINE_READ_TIME_LIMIT_ENV}) before computing an answer. Narrow the query or raise the limit.`,
      limitExceeded: { kind: "time", limit: 2000 },
    });
    const inferences = settleBoundedRead(
      {
        success: true,
        bindings: { KibiReadOutcome: "kibi_read_outcome(inferences)" },
      },
      limits,
    );
    expect(inferences).toMatchObject({
      success: false,
      limitExceeded: { kind: "inferences", limit: 500 },
    });
    expect((inferences as { error: string }).error).toContain(
      `inference limit of 500 (${ENGINE_READ_INFERENCE_LIMIT_ENV})`,
    );
  });

  test("an outcome for a budget that was not set is not a limit hit", () => {
    expect<unknown>(
      settleBoundedRead(
        {
          success: true,
          bindings: { KibiReadOutcome: "kibi_read_outcome(time)" },
        },
        { inferences: 10 },
      ),
    ).toEqual({ success: true, bindings: {} });
  });

  test("a failed query is returned untouched", () => {
    const failed = { success: false, bindings: {}, error: "syntax error" };
    expect(settleBoundedRead(failed, limits)).toBe(failed);
  });
});

describe("limit errors", () => {
  test("EngineQueryLimitError carries the code, limit and message", () => {
    const error = new EngineQueryLimitError({ kind: "inferences", limit: 9 });
    expect(error.name).toBe("EngineQueryLimitError");
    expect(error.code).toBe(QUERY_LIMIT_EXCEEDED_CODE);
    expect(error.retryable).toBe(false);
    expect(queryLimitExceededOf(error)).toEqual({
      kind: "inferences",
      limit: 9,
    });
  });

  test("queryLimitExceededOf recovers the limit from a relayed message", () => {
    expect(
      queryLimitExceededOf(
        new Error(
          "engine said: QUERY_LIMIT_EXCEEDED: read stopped at its time limit of 1200 ms",
        ),
      ),
    ).toEqual({ kind: "time", limit: 1200 });
    const malformed = Object.assign(new Error("other failure"), {
      code: QUERY_LIMIT_EXCEEDED_CODE,
      limitExceeded: { kind: "memory", limit: 1 },
    });
    expect(queryLimitExceededOf(malformed)).toBeNull();
    expect(queryLimitExceededOf("QUERY_LIMIT_EXCEEDED")).toBeNull();
    expect(queryLimitExceededOf(new Error("plain"))).toBeNull();
  });

  test("assertWithinQueryLimits throws only for a well-formed limit hit", () => {
    for (const value of [
      null,
      "x",
      {},
      { limitExceeded: null },
      { limitExceeded: { kind: "memory", limit: 1 } },
      { limitExceeded: { kind: "time", limit: "1" } },
    ])
      expect(() => assertWithinQueryLimits(value)).not.toThrow();
    expect(() =>
      assertWithinQueryLimits({ limitExceeded: { kind: "time", limit: 5 } }),
    ).toThrow(EngineQueryLimitError);
  });
});

describe("engine limit contracts", () => {
  test("the error code and environment variable names are stable", () => {
    expect(QUERY_LIMIT_EXCEEDED_CODE).toBe("QUERY_LIMIT_EXCEEDED");
    expect(ENGINE_READ_TIME_LIMIT_ENV).toBe("KIBI_ENGINE_READ_TIME_LIMIT_MS");
    expect(ENGINE_READ_INFERENCE_LIMIT_ENV).toBe(
      "KIBI_ENGINE_READ_INFERENCE_LIMIT",
    );
    expect(
      queryLimitsFromEnv({
        KIBI_ENGINE_READ_TIME_LIMIT_MS: "300",
        KIBI_ENGINE_READ_INFERENCE_LIMIT: "1e3",
      }),
    ).toEqual({ timeMs: 300, inferences: 1000 });
    expect(
      queryLimitsFromEnv({ KIBI_ENGINE_READ_INFERENCE_LIMIT: "0" }),
    ).toBeUndefined();
  });

  test("normalized limits carry only the budgets that were set", () => {
    expect(
      Object.keys(normalizeQueryLimits({ timeMs: 5 }) ?? {}),
    ).toStrictEqual(["timeMs"]);
    expect(
      Object.keys(normalizeQueryLimits({ inferences: 5 }) ?? {}),
    ).toStrictEqual(["inferences"]);
    expect(normalizeQueryLimits({ inferences: 1_000_000_000_000 })).toEqual({
      inferences: 1_000_000_000_000,
    });
  });

  test("the helper definition asserts all three clauses once", () => {
    expect(BOUNDED_READ_HELPER_DEFINITION).toMatch(
      /^\(current_predicate\(kibi_engine_bounded_read\/4\) -> true ; assertz\(\(kibi_engine_bounded_read\(Goal, Seconds, Inferences, kibi_read_outcome\(Outcome\)\) :- .+\)\), assertz\(\(kibi_engine_bounded_call\(Goal, Seconds, Inferences, Inner\) :- .+call_with_time_limit.+\)\), assertz\(\(kibi_engine_inference_call\(Goal, Inferences, Inner\) :- .+call_with_inference_limit.+\)\)\)$/,
    );
  });

  test("a read without a well-formed outcome binding is not a limit hit", () => {
    const limits = { timeMs: 100, inferences: 100 };
    for (const outcome of [
      undefined,
      "garbage",
      "xkibi_read_outcome(time)",
      "kibi_read_outcome(time)x",
    ]) {
      const bindings: Record<string, string> = { X: "1" };
      if (outcome !== undefined) bindings.KibiReadOutcome = outcome;
      expect<unknown>(
        settleBoundedRead({ success: true, bindings }, limits),
      ).toEqual({ success: true, bindings: { X: "1" } });
    }
    expect<unknown>(
      settleBoundedRead(
        {
          success: true,
          bindings: { KibiReadOutcome: "kibi_read_outcome(inferences)" },
        },
        { timeMs: 100 },
      ),
    ).toEqual({ success: true, bindings: {} });
  });

  test("queryLimitExceededOf trusts a typed limit over the message", () => {
    const typed = (limitExceeded: unknown, code = QUERY_LIMIT_EXCEEDED_CODE) =>
      Object.assign(new Error("rewrapped"), { code, limitExceeded });
    expect(queryLimitExceededOf(typed({ kind: "time", limit: 7 }))).toEqual({
      kind: "time",
      limit: 7,
    });
    expect(
      queryLimitExceededOf(typed({ kind: "inferences", limit: 8 })),
    ).toEqual({ kind: "inferences", limit: 8 });
    for (const error of [
      typed({ kind: "time", limit: 7 }, "OTHER"),
      typed(null),
      typed(undefined),
      typed({ kind: "time", limit: "7" }),
      typed({ kind: "", limit: 7 }),
    ])
      expect(queryLimitExceededOf(error)).toBeNull();
  });

  test("queryLimitExceededOf recovers an inference limit from a message", () => {
    expect(
      queryLimitExceededOf(
        new Error(
          "QUERY_LIMIT_EXCEEDED: read stopped at its inference limit of 40 (x)",
        ),
      ),
    ).toEqual({ kind: "inferences", limit: 40 });
  });

  test("assertWithinQueryLimits reports the limit it threw for", () => {
    expect(() => assertWithinQueryLimits(undefined)).not.toThrow();
    let thrown: unknown;
    try {
      assertWithinQueryLimits({
        limitExceeded: { kind: "inferences", limit: 3 },
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(EngineQueryLimitError);
    expect((thrown as EngineQueryLimitError).limitExceeded).toEqual({
      kind: "inferences",
      limit: 3,
    });
  });
});
