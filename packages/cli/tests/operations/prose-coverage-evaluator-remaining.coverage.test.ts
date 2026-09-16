// implements REQ-mcp-semantic-advisor-preflight
import { afterEach, describe, expect, test } from "bun:test";
import { evaluateProseCoverageCorpus } from "../../src/operations/semantic-advisor/prose-coverage-evaluator.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("prose-coverage-evaluator remaining predicate name mismatch", () => {
  test("fails when a predicate suggestion uses a different name", () => {
    restores.push(isolateKibiEnv());
    const result = evaluateProseCoverageCorpus([
      {
        id: "guard",
        text: "Login must stay disabled until MFA completes.",
        expected: { kind: "predicate", predicate_name: "owns" },
      },
    ]);
    expect(result.summary.failed).toBe(1);
    expect(result.failures[0]?.reason).toMatch(/Expected predicate owns/);
  });
});
