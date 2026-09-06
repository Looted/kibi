// implements REQ-mcp-suggest-predicates
import { afterEach, describe, expect, test } from "bun:test";
import { normalizeText } from "../../src/operations/modeling/predicate-utils.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("predicate-utils remaining empty-text guard", () => {
  test("normalizeText rejects blank input", () => {
    restores.push(isolateKibiEnv());
    expect(() => normalizeText("")).toThrow(/non-empty string/);
    expect(() => normalizeText("   ")).toThrow(/non-empty string/);
    expect(() => normalizeText(undefined as unknown as string)).toThrow(
      /non-empty string/,
    );
  });
});
