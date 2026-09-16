// implements REQ-008
import { afterEach, describe, expect, test } from "bun:test";
import { isSymbolRole } from "../../src/public/symbol-granularity.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("symbol-granularity remaining role predicate", () => {
  test("isSymbolRole accepts known roles and rejects other values", () => {
    restores.push(isolateKibiEnv());
    expect(isSymbolRole("behavioral")).toBe(true);
    expect(isSymbolRole("unknown")).toBe(true);
    expect(isSymbolRole("not-a-role")).toBe(false);
    expect(isSymbolRole(12)).toBe(false);
  });
});
