import { describe, expect, test } from "bun:test";
import {
  prepareOperationInput,
  validateAgainstSchema,
} from "../src/cli-validate.js";

const schema = {
  type: "object",
  properties: {
    query: { type: "string" },
    options: {
      type: "object",
      properties: { limit: { type: "integer" } },
      additionalProperties: false,
    },
  },
  required: ["query"],
} as const;

describe("validateAgainstSchema", () => {
  test("accepts valid nested business input", () => {
    expect(
      validateAgainstSchema({ query: "auth", options: { limit: 5 } }, schema),
    ).toEqual({ valid: true });
  });

  test("returns structured errors when a required field is absent", () => {
    const result = validateAgainstSchema({}, schema);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((error) => error.includes("query"))).toBe(true);
    }
  });

  test("rejects every unknown top-level business field", () => {
    const result = validateAgainstSchema(
      { query: "auth", unexpected: true },
      schema,
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((error) => error.includes("unexpected"))).toBe(
        true,
      );
    }
  });

  test("extracts diagnostic telemetry before business validation", () => {
    const telemetry = { is_autonomous: true, attempt_number: 1 };

    const result = prepareOperationInput(
      { query: "auth", _diagnostic_telemetry: telemetry },
      schema,
    );

    expect(result).toEqual({
      valid: true,
      businessInput: { query: "auth" },
      telemetry,
    });
  });

  test("rejects non-object diagnostic telemetry", () => {
    const result = prepareOperationInput(
      { query: "auth", _diagnostic_telemetry: "invalid" },
      schema,
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual([
        "_diagnostic_telemetry must be an object when provided",
      ]);
    }
  });
});
