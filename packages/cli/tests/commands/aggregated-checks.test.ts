// @ts-ignore
import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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

  test("reads violations from the engine's result file when the answer says so", async () => {
    const violations = {
      "rule-a": [
        {
          rule: "rule-a",
          entityId: "E1",
          description: "desc",
          suggestion: "",
          source: "",
        },
      ],
    };
    let resultPath = "";
    const prolog = {
      async query(goal: string) {
        const match = goal.match(/check_all_json_file\('([^']+)', false\)/);
        if (!match?.[1]) throw new Error(`no result file in goal: ${goal}`);
        resultPath = match[1];
        expect(path.isAbsolute(resultPath)).toBe(true);
        writeFileSync(resultPath, JSON.stringify(violations), "utf8");
        return { success: true, bindings: { Transport: "file" } };
      },
    } as unknown as PrologProcess;

    const out = await runAggregatedChecks(prolog, null);
    expect(out).toEqual([
      { rule: "rule-a", entityId: "E1", description: "desc" },
    ]);
    expect(existsSync(path.dirname(resultPath))).toBe(false);
  });

  test("selected rules go through the result file too", async () => {
    let resultPath = "";
    const capture: { lastQuery?: string } = {};
    const prolog = {
      async query(goal: string) {
        capture.lastQuery = goal;
        const match = goal.match(
          /check_selected_json_file\(\['rule-a'\], '([^']+)'\)/,
        );
        if (!match?.[1]) throw new Error(`no result file in goal: ${goal}`);
        resultPath = match[1];
        writeFileSync(resultPath, JSON.stringify({ "rule-a": [] }), "utf8");
        return { success: true, bindings: { Transport: "file" } };
      },
    } as unknown as PrologProcess;

    const out = await runAggregatedChecks(prolog, new Set(["rule-a"]));
    expect(out).toEqual([]);
    expect(capture.lastQuery).toContain("check_selected_json([");
    expect(existsSync(path.dirname(resultPath))).toBe(false);
  });

  test("a file answer without a written file fails clearly and removes the temp dir", async () => {
    let resultPath = "";
    const prolog = {
      async query(goal: string) {
        const match = goal.match(/check_all_json_file\('([^']+)', false\)/);
        if (!match?.[1]) throw new Error(`no result file in goal: ${goal}`);
        resultPath = match[1];
        // The engine claims the file transport but never writes the file.
        return { success: true, bindings: { Transport: "file" } };
      },
    } as unknown as PrologProcess;

    await expect(runAggregatedChecks(prolog, null)).rejects.toThrow(
      /ENOENT|no such file/i,
    );
    expect(resultPath).not.toBe("");
    expect(existsSync(path.dirname(resultPath))).toBe(false);
  });

  test("an unusable temp dir is reported before the engine is asked", async () => {
    const previous = process.env.TMPDIR;
    const base = mkdtempSync(path.join(tmpdir(), "kibi-check-tmp-"));
    process.env.TMPDIR = path.join(base, "missing");
    let queried = false;
    const prolog = {
      async query() {
        queried = true;
        return { success: true, bindings: { Transport: "file" } };
      },
    } as unknown as PrologProcess;
    try {
      await expect(runAggregatedChecks(prolog, null)).rejects.toThrow(
        /ENOENT|no such file/i,
      );
      expect(queried).toBe(false);
    } finally {
      // biome-ignore lint/performance/noDelete: unset it, an assignment would store "undefined"
      if (previous === undefined) delete process.env.TMPDIR;
      else process.env.TMPDIR = previous;
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("a temp dir with a quote in its path reaches the engine as a valid atom", async () => {
    const previous = process.env.TMPDIR;
    const base = mkdtempSync(path.join(tmpdir(), "kibi-check-quote-"));
    const quoted = path.join(base, "it's here");
    process.env.TMPDIR = quoted;
    let resultPath = "";
    let goalText = "";
    const prolog = {
      async query(goal: string) {
        goalText = goal;
        // The atom is single-quoted, so a quote inside it is doubled.
        const match = goal.match(
          /check_all_json_file\('((?:[^']|'')+)', false\)/,
        );
        if (!match?.[1]) throw new Error(`no result file in goal: ${goal}`);
        resultPath = match[1].replaceAll("''", "'");
        writeFileSync(resultPath, JSON.stringify({ "rule-a": [] }), "utf8");
        return { success: true, bindings: { Transport: "file" } };
      },
    } as unknown as PrologProcess;
    try {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(quoted, { recursive: true });
      const out = await runAggregatedChecks(prolog, null);
      expect(out).toEqual([]);
      expect(resultPath.startsWith(quoted)).toBe(true);
      expect(goalText).toContain("it''s here");
      expect(existsSync(path.dirname(resultPath))).toBe(false);
    } finally {
      // biome-ignore lint/performance/noDelete: unset it, an assignment would store "undefined"
      if (previous === undefined) delete process.env.TMPDIR;
      else process.env.TMPDIR = previous;
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("an engine without the file predicates still answers through the binding", async () => {
    const result = {
      success: true,
      bindings: {
        Transport: "answer",
        JsonString: JSON.stringify({ "rule-a": [] }),
      },
    };
    const out = await runAggregatedChecks(makeProlog(result), null);
    expect(out).toHaveLength(0);
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
