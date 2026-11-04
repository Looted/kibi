import { describe, expect, test } from "bun:test";
import {
  prepareOperationInput,
  validateAgainstSchema,
} from "../src/cli-validate.js";

// Each test builds its own schema object: validators are cached per object.
function querySchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      query: { type: "string" },
      limit: { type: "integer", minimum: 1 },
      nested: {
        type: "object",
        properties: { depth: { type: "integer" } },
      },
    },
    required: ["query"],
  };
}

describe("prepareOperationInput", () => {
  test("rejects non-objects and arrays", () => {
    for (const input of [null, "x", 1, [{ query: "a" }]]) {
      expect(prepareOperationInput(input, querySchema())).toStrictEqual({
        valid: false,
        errors: ["input must be an object"],
      });
    }
  });

  test("rejects telemetry that is not a plain object", () => {
    for (const telemetry of [null, 1, [1]]) {
      expect(
        prepareOperationInput(
          { query: "a", _diagnostic_telemetry: telemetry },
          querySchema(),
        ),
      ).toStrictEqual({
        valid: false,
        errors: ["_diagnostic_telemetry must be an object when provided"],
      });
    }
  });

  test("valid input without telemetry has no telemetry key", () => {
    expect(prepareOperationInput({ query: "a" }, querySchema())).toStrictEqual({
      valid: true,
      businessInput: { query: "a" },
    });
  });

  test("valid input with telemetry strips it from the business input", () => {
    expect(
      prepareOperationInput(
        { query: "a", _diagnostic_telemetry: { attempt: 2 } },
        querySchema(),
      ),
    ).toStrictEqual({
      valid: true,
      businessInput: { query: "a" },
      telemetry: { attempt: 2 },
    });
  });

  test("reports every error with its location and parameters", () => {
    expect(
      prepareOperationInput(
        { limit: 0, nested: { depth: "deep" }, extra: true },
        querySchema(),
      ),
    ).toStrictEqual({
      valid: false,
      errors: [
        "/ must have required property 'query': query",
        "/ must NOT have additional properties: extra",
        "/limit must be >= 1: >=, 1",
        "/nested/depth must be integer: integer",
      ],
      issues: [
        { field: "other", rule: "required" },
        { field: "other", rule: "additionalProperties" },
        { field: "other", rule: "minimum" },
        { field: "other", rule: "type" },
      ],
    });
  });

  test("an error without parameters has no trailing colon", () => {
    expect(
      prepareOperationInput(
        { query: "a", banned: 1 },
        { type: "object", properties: { query: {}, banned: false } },
      ),
    ).toStrictEqual({
      valid: false,
      errors: ["/banned boolean schema is false"],
      issues: [{ field: "other", rule: "false schema" }],
    });
  });

  test("schemas may use keywords Ajv does not know", () => {
    expect(
      prepareOperationInput(
        { query: "a" },
        { type: "object", "x-kibi-note": "n", properties: { query: {} } },
      ),
    ).toStrictEqual({ valid: true, businessInput: { query: "a" } });
  });

  test("validators are compiled once per schema object", () => {
    const properties: Record<string, unknown> = { query: { type: "string" } };
    const schema = { type: "object", properties };
    expect(prepareOperationInput({ query: "a" }, schema).valid).toBe(true);
    properties.query = { type: "number" };
    expect(prepareOperationInput({ query: "a" }, schema).valid).toBe(true);
    expect(prepareOperationInput({ query: "a" }, { ...schema }).valid).toBe(
      false,
    );
  });

  test("two schema objects with one $id each validate on their own", () => {
    const first = {
      $id: "kibi-test-shared-id",
      type: "object",
      properties: { a: { type: "string" } },
    };
    const second = {
      $id: "kibi-test-shared-id",
      type: "object",
      properties: { b: { type: "string" }, c: { "x-kibi": 1 } },
    };
    expect(prepareOperationInput({ a: "x" }, first).valid).toBe(true);
    expect(prepareOperationInput({ b: "x" }, second)).toStrictEqual({
      valid: true,
      businessInput: { b: "x" },
    });
    expect(prepareOperationInput({ b: 1, c: 1, d: 1 }, second)).toStrictEqual({
      valid: false,
      errors: [
        "/ must NOT have additional properties: d",
        "/b must be string: string",
      ],
      issues: [
        { field: "other", rule: "additionalProperties" },
        { field: "other", rule: "type" },
      ],
    });
  });
});

describe("validateAgainstSchema", () => {
  test("drops the business input of a valid result", () => {
    expect(validateAgainstSchema({ query: "a" }, querySchema())).toStrictEqual({
      valid: true,
    });
  });

  test("keeps the errors of an invalid result", () => {
    expect(validateAgainstSchema({}, querySchema())).toStrictEqual({
      valid: false,
      errors: ["/ must have required property 'query': query"],
    });
  });
});
