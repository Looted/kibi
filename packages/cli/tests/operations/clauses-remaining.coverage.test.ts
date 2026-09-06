// implements REQ-mcp-semantic-advisor-preflight
import { afterEach, describe, expect, test } from "bun:test";
import { extractSemanticClauses } from "../../src/operations/semantic-advisor/clauses.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("semantic clauses remaining empty supplied-clause guard", () => {
  test("rejects supplied clauses that are all blank", () => {
    restores.push(isolateKibiEnv());
    expect(() => extractSemanticClauses("The system must work.", ["", "  "])).toThrow(
      /at least one non-empty atomic claim/,
    );
  });
});
