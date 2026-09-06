// implements REQ-kibi-legacy-migration-preview-v2
import { afterEach, describe, expect, test } from "bun:test";
import { compareReadyActionIds } from "../../src/public/operations/migration-plan.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("migration-plan leftover ready-id sort", () => {
  test("falls back to localeCompare when an action is missing from the map", () => {
    expect(compareReadyActionIds("b-id", "a-id", new Map())).toBeGreaterThan(0);
    const action = {
      id: "a-id",
      state: "ready",
      safety: "automatic",
      category: "schema",
    };
    expect(
      compareReadyActionIds(
        "a-id",
        "a-id",
        new Map([["a-id", action as never]]),
      ),
    ).toBe(0);
  });
});
