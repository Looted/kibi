// @ts-ignore
import { describe, expect, test } from "bun:test";
import { runAggregatedChecks } from "../../src/commands/aggregated-checks";
import type { PrologProcess } from "../../src/prolog";

type QueryResult = {
  success: boolean;
  error?: string;
  bindings?: Record<string, unknown>;
};

function makeProlog(result: QueryResult, capture?: { lastQuery?: string }) {
  const p = {
    async query(q: string) {
      if (capture) capture.lastQuery = q;
      return result;
    },
  };
  return p as unknown as PrologProcess;
}

describe("runAggregatedChecks", () => {
  test("successful check with violations returned", async () => {
    const violations = {
      "rule-a": [
        {
          rule: "rule-a",
          entityId: "E1",
          description: "desc",
          suggestion: "fix",
          source: "src",
        },
      ],
    };

    const result = {
      success: true,
      bindings: { JsonString: JSON.stringify(violations) },
    };

    const prolog = makeProlog(result);

    const out = await runAggregatedChecks(prolog, null, false);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      rule: "rule-a",
      entityId: "E1",
      description: "desc",
      suggestion: "fix",
      source: "src",
    });
  });

  test("empty violations (no issues found)", async () => {
    const result = {
      success: true,
      bindings: { JsonString: JSON.stringify({}) },
    };
    const prolog = makeProlog(result);
    const out = await runAggregatedChecks(prolog, null, false);
    expect(out).toHaveLength(0);
  });

  test("double-encoded JSON parsing", async () => {
    const violations = {
      x: [
        {
          rule: "x",
          entityId: "id",
          description: "d",
          suggestion: "s",
          source: "",
        },
      ],
    };
    const double = JSON.stringify(JSON.stringify(violations));
    const result = { success: true, bindings: { JsonString: double } };
    const prolog = makeProlog(result);
    const out = await runAggregatedChecks(prolog, null, false);
    expect(out[0].description).toBe("d");
  });

  test("rules allowlist filtering", async () => {
    const violations = {
      bucket: [
        {
          rule: "keep",
          entityId: "A",
          description: "a",
          suggestion: "",
          source: "",
        },
        {
          rule: "skip",
          entityId: "B",
          description: "b",
          suggestion: "",
          source: "",
        },
      ],
    };
    const result = {
      success: true,
      bindings: { JsonString: JSON.stringify(violations) },
    };
    const prolog = makeProlog(result);
    const out = await runAggregatedChecks(prolog, new Set(["keep"]), false);
    expect(out).toHaveLength(1);
    expect(out[0].rule).toBe("keep");
  });

  test("missing JsonString binding handling", async () => {
    const result = { success: true, bindings: {} };
    const prolog = makeProlog(result);
    await expect(runAggregatedChecks(prolog, null, false)).rejects.toThrow(
      "No JSON string in binding",
    );
  });

  test("invalid JSON parsing error", async () => {
    const result = { success: true, bindings: { JsonString: "not json" } };
    const prolog = makeProlog(result);
    await expect(runAggregatedChecks(prolog, null, false)).rejects.toThrow(
      "Failed to parse violations JSON",
    );
  });

  test("failed Prolog query handling", async () => {
    const result = { success: false, error: "oom" };
    const prolog = makeProlog(result);
    await expect(runAggregatedChecks(prolog, null, false)).rejects.toThrow(
      /Aggregated checks query failed/,
    );
  });

  test("suggestion/source fields mapping undefined when empty", async () => {
    const violations = {
      r: [
        {
          rule: "r",
          entityId: "e",
          description: "d",
          suggestion: "",
          source: "",
        },
      ],
    };
    const prolog = makeProlog({
      success: true,
      bindings: { JsonString: JSON.stringify(violations) },
    });
    const out = await runAggregatedChecks(prolog, null, false);
    expect(out[0].suggestion).toBeUndefined();
    expect(out[0].source).toBeUndefined();
  });

  test("requireAdr flag passed to check_all_json_with_options (true and false)", async () => {
    const violations = { r: [] };
    const capture: { lastQuery?: string } = {};
    const prologTrue = makeProlog(
      { success: true, bindings: { JsonString: JSON.stringify(violations) } },
      capture,
    );
    await runAggregatedChecks(prologTrue, null, true);
    expect(capture.lastQuery).toContain("check_all_json_with_options");
    expect(capture.lastQuery).toContain("true");

    const capture2: { lastQuery?: string } = {};
    const prologFalse = makeProlog(
      { success: true, bindings: { JsonString: JSON.stringify(violations) } },
      capture2,
    );
    await runAggregatedChecks(prologFalse, null, false);
    expect(capture2.lastQuery).toContain("false");
  });
});
