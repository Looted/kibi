import { describe, expect, test } from "bun:test";
import { validateUpsertInput } from "../../src/operations/mutation/validation.js";

describe("mutation granularity validation", () => {
  test("accepts test-suite as a coarse symbol reason", () => {
    const validated = validateUpsertInput(
      {
        type: "symbol",
        id: "SYM-test-suite",
        properties: {
          title: "test suite anchor",
          status: "active",
          sourceFile: "packages/cli/tests/example.test.ts",
          granularity_reason: "test-suite",
        },
      },
      new Date("2026-08-24T00:00:00.000Z"),
    );

    expect(validated.entity.granularity_reason).toBe("test-suite");
  });
});
