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
          evidence: {
            witnesses: [{ kind: "strict_property", status: "contradiction" }],
          },
        },
      ],
    };

    const result = {
      success: true,
      bindings: { JsonString: JSON.stringify(violations) },
    };

    const prolog = makeProlog(result);

    const out = await runAggregatedChecks(prolog, null);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      rule: "rule-a",
      entityId: "E1",
      description: "desc",
      suggestion: "fix",
      source: "src",
      evidence: {
        witnesses: [{ kind: "strict_property", status: "contradiction" }],
      },
    });
  });

  test("empty violations (no issues found)", async () => {
    const result = {
      success: true,
      bindings: { JsonString: JSON.stringify({}) },
    };
    const prolog = makeProlog(result);
    const out = await runAggregatedChecks(prolog, null);
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
    const out = await runAggregatedChecks(prolog, null);
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
    const out = await runAggregatedChecks(prolog, new Set(["keep"]));
    expect(out).toHaveLength(1);
    expect(out[0].rule).toBe("keep");
  });

  test("missing JsonString binding handling", async () => {
    const result = { success: true, bindings: {} };
    const prolog = makeProlog(result);
    await expect(runAggregatedChecks(prolog, null)).rejects.toThrow(
      "No JSON string in binding",
    );
  });

  test("invalid JSON parsing error", async () => {
    const result = { success: true, bindings: { JsonString: "not json" } };
    const prolog = makeProlog(result);
    await expect(runAggregatedChecks(prolog, null)).rejects.toThrow(
      "Failed to parse violations JSON",
    );
  });

  test("failed Prolog query handling", async () => {
    const result = { success: false, error: "oom" };
    const prolog = makeProlog(result);
    await expect(runAggregatedChecks(prolog, null)).rejects.toThrow(
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
    const out = await runAggregatedChecks(prolog, null);
    expect(out[0].suggestion).toBeUndefined();
    expect(out[0].source).toBeUndefined();
  });

  test("always evaluates symbol-traceability without a project requireAdr knob", async () => {
    const violations = { r: [] };
    const capture: { lastQuery?: string } = {};
    const prolog = makeProlog(
      { success: true, bindings: { JsonString: JSON.stringify(violations) } },
      capture,
    );
    await runAggregatedChecks(prolog, null);
    expect(capture.lastQuery).toContain("check_all_json_with_options");
    expect(capture.lastQuery).toContain("false");
    expect(capture.lastQuery).not.toContain("check_selected_json");
  });

  test("uses the selected Prolog check path for focused rules", async () => {
    const capture: { lastQuery?: string } = {};
    const prolog = makeProlog(
      { success: true, bindings: { JsonString: JSON.stringify({}) } },
      capture,
    );
    await runAggregatedChecks(prolog, new Set(["logic-coverage"]));
    expect(capture.lastQuery).toContain("check_selected_json");
    expect(capture.lastQuery).toContain("['logic-coverage']");
    expect(capture.lastQuery).toContain(
      "call(checks:check_selected_json(['logic-coverage'], JsonString))",
    );
  });
});
