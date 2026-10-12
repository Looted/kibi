// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import {
  scenarioCoverageWarning,
  scenarioCoverageWarnings,
  symbolCoverageWarnings,
} from "../../src/operations/mutation/warnings.js";
import type { PrologPort } from "../../src/public/operations/runtime-types.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

/** A store that answers every goal with `success` and records the goals. */
function store(success: boolean): { prolog: PrologPort; goals: string[] } {
  const goals: string[] = [];
  return {
    goals,
    prolog: {
      query: async (goal) => {
        goals.push(Array.isArray(goal) ? goal.join(", ") : goal);
        return { success, bindings: {} };
      },
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
  };
}

describe("scenarioCoverageWarnings", () => {
  test("warns when a requirement already has specified_by coverage", async () => {
    restores.push(isolateKibiEnv());
    const warnings = await scenarioCoverageWarnings(
      store(true).prolog,
      [{ type: "verified_by", from: "REQ-1", to: "TEST-1" }],
      "req",
      "REQ-1",
    );
    expect(warnings[0]).toMatch(/Scenario-backed coverage/);
    expect(scenarioCoverageWarning("REQ-9")[0]).toContain("REQ-9");
  });
});

describe("symbolCoverageWarnings", () => {
  const implementsOnly = [
    { type: "implements", from: "SYM-a", to: "REQ-a" },
  ] as const;

  test("asks the store for a covered_by or executable_for edge of the symbol before warning", async () => {
    const { prolog, goals } = store(false);
    const warnings = await symbolCoverageWarnings(
      prolog,
      implementsOnly,
      "symbol",
      "SYM-a",
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("symbol-coverage");
    expect(goals).toEqual([
      "once((kb_relationship(covered_by, 'SYM-a', _) ; kb_relationship(executable_for, 'SYM-a', _)))",
    ]);
  });

  test("a stored covered_by edge silences the warning", async () => {
    expect(
      await symbolCoverageWarnings(
        store(true).prolog,
        implementsOnly,
        "symbol",
        "SYM-a",
      ),
    ).toEqual([]);
  });

  test("only the symbol's own relationships and only symbols are judged", async () => {
    const { prolog, goals } = store(false);
    expect(
      await symbolCoverageWarnings(
        prolog,
        [{ type: "implements", from: "SYM-other", to: "REQ-a" }],
        "symbol",
        "SYM-a",
      ),
    ).toEqual([]);
    expect(
      await symbolCoverageWarnings(prolog, implementsOnly, "req", "SYM-a"),
    ).toEqual([]);
    expect(goals).toEqual([]);
  });
});
