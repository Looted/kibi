import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  jsonSchemaToZod,
  matchesJsonSchemaCondition as matches,
} from "../../src/server/json-schema-to-zod.js";

const ok = (schema: z.ZodTypeAny, value: unknown) =>
  schema.safeParse(value).success;

function issues(schema: z.ZodTypeAny, value: unknown) {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    code: issue.code,
    path: issue.path,
    message: issue.message,
  }));
}

// JSON Schema names this keyword "then"; a computed key keeps the lint rule
// against thenable objects quiet.
const THEN = ["th", "en"].join("");

describe("condition edges", () => {
  test("numbers must be finite and integers whole", () => {
    expect(matches(Number.NaN, { type: "number" })).toBe(false);
    expect(matches(Number.POSITIVE_INFINITY, { type: "number" })).toBe(false);
    expect(matches("1", { type: "number" })).toBe(false);
    expect(matches(1.5, { type: "integer" })).toBe(false);
    expect(matches("1", { type: "integer" })).toBe(false);
    expect(matches(2, { type: "integer" })).toBe(true);
  });

  test("only text entries of a type list count", () => {
    expect(matches(1, { type: [5, "string"] })).toBe(false);
    expect(matches("a", { type: [5, "string"] })).toBe(true);
    expect(matches(1, { type: 5 })).toBe(true);
    expect(matches(1, { type: [[["string"]]] })).toBe(true);
  });

  test("required ignores empty and non-text keys", () => {
    expect(matches({ a: 1 }, { required: ["a", 4] })).toBe(true);
    expect(matches({ a: 1 }, { required: ["a", ""] })).toBe(true);
    expect(matches({ a: 1 }, { required: ["a", "b"] })).toBe(false);
  });

  test("an object without property schemas is not constrained by them", () => {
    expect(matches({ a: 1 }, { required: ["a"] })).toBe(true);
    expect(matches({ a: 1 }, { properties: null })).toBe(true);
    expect(matches({ 0: 1 }, { properties: "x" })).toBe(true);
  });
});

describe("conditional required keys", () => {
  test("a then without a required list adds nothing", () => {
    for (const thenValue of [null, undefined, "x", 3, { required: "a" }]) {
      const schema = jsonSchemaToZod({
        type: "object",
        allOf: [{ if: true, [THEN]: thenValue }],
      });
      expect(ok(schema, {})).toBe(true);
    }
  });

  test("empty and non-text keys in then are ignored", () => {
    const schema = jsonSchemaToZod({
      type: "object",
      allOf: [{ if: true, [THEN]: { required: ["", 4, "a"] } }],
    });
    expect(issues(schema, {})).toStrictEqual([
      {
        code: "custom",
        path: ["a"],
        message: "Required by conditional JSON Schema rule: a",
      },
    ]);
  });
});

describe("guard oneOf", () => {
  const guarded = (oneOf: unknown[]) =>
    jsonSchemaToZod({ type: "object", oneOf });

  test("non-guard branches leave the object alone", () => {
    for (const oneOf of [
      [{ required: ["a"] }, {}],
      [{ required: ["a"], properties: { a: {} } }, { required: ["b"] }],
      [{ required: "a" }, { required: ["b"] }],
      [{ required: [1] }, { required: ["b"] }],
      [{ anyOf: "x" }, { required: ["b"] }],
      [{ allOf: "x" }, { required: ["b"] }],
      [
        { anyOf: [{ required: ["a"] }, { type: "object" }] },
        { required: ["b"] },
      ],
      [
        { allOf: [{ required: ["a"] }, { type: "object" }] },
        { required: ["b"] },
      ],
      [{ not: { type: "object" } }, { required: ["b"] }],
      [null, { required: ["b"] }],
      ["required", { required: ["b"] }],
      [[{ required: ["a"] }], { required: ["b"] }],
      [{ required: ["a"] }],
    ]) {
      const schema = guarded(oneOf);
      expect(ok(schema, { b: 1 })).toBe(true);
      expect(ok(schema, { a: 1, b: 1 })).toBe(true);
      expect(ok(schema, {})).toBe(true);
    }
  });

  test("guard branches built from anyOf, allOf and not are enforced", () => {
    const schema = guarded([
      { anyOf: [{ required: ["a"] }, { required: ["c"] }] },
      { allOf: [{ required: ["b"] }, { not: { required: ["a"] } }] },
    ]);
    expect(ok(schema, { a: 1 })).toBe(true);
    expect(ok(schema, { b: 1 })).toBe(true);
    expect(issues(schema, { a: 1, b: 1, c: 1 })).toStrictEqual([]);
    expect(issues(schema, {})).toStrictEqual([
      {
        code: "custom",
        path: [],
        message: "Input must match exactly one of: {}; {} (matched 0).",
      },
    ]);
  });

  test("the message lists every required and forbidden key", () => {
    const schema = guarded([
      { required: ["a", "b"] },
      { required: ["c"], not: { required: ["a", "b"] } },
    ]);
    expect(issues(schema, { a: 1, b: 1 })).toStrictEqual([]);
    expect(issues(schema, {})).toStrictEqual([
      {
        code: "custom",
        path: [],
        message:
          "Input must match exactly one of: {a, b}; {c} without a, b (matched 0).",
      },
    ]);
  });
});

describe("jsonSchemaToZod edges", () => {
  test("a description that is not text is dropped", () => {
    for (const schema of [
      { const: "a" },
      { enum: ["a", "b"] },
      { anyOf: [{ type: "string" }, { type: "number" }] },
      { type: "object" },
      { type: "array" },
      { type: "string" },
      { type: "number" },
      { type: "integer" },
      { type: "boolean" },
      { type: "null" },
      { type: "other" },
    ]) {
      expect(jsonSchemaToZod({ ...schema, description: 5 }).description).toBe(
        undefined,
      );
      expect(jsonSchemaToZod({ ...schema, description: "d" }).description).toBe(
        "d",
      );
    }
  });

  test("a one-entry enum publishes a single constant", () => {
    expect(
      z.toJSONSchema(jsonSchemaToZod({ enum: ["a", { x: 1 }] })),
    ).toStrictEqual(z.toJSONSchema(z.literal("a")));
  });

  test("a type list keeps only its text entries", () => {
    const schema = jsonSchemaToZod({ type: [5, "string"] });
    expect(ok(schema, "a")).toBe(true);
    expect(ok(schema, 1)).toBe(false);
  });

  test("property schemas must be an object", () => {
    const strict = (properties: unknown) =>
      jsonSchemaToZod({
        type: "object",
        properties,
        additionalProperties: false,
      });
    expect(strict(null).parse({ 0: 1 })).toStrictEqual({});
    expect(strict("ab").parse({ 0: 1 })).toStrictEqual({});
  });

  test("required names the properties that must be present", () => {
    const schema = jsonSchemaToZod({
      type: "object",
      properties: { "": { type: "string" }, a: { type: "string" } },
      required: ["", 4],
    });
    expect(ok(schema, {})).toBe(true);
    const textRequired = jsonSchemaToZod({
      type: "object",
      properties: { a: { type: "string" } },
      required: "a",
    });
    expect(ok(textRequired, {})).toBe(true);
  });

  test("a pattern applies only when it is text", () => {
    expect(ok(jsonSchemaToZod({ type: "string", pattern: 5 }), "x")).toBe(true);
    expect(ok(jsonSchemaToZod({ type: "string", pattern: "^5$" }), "x")).toBe(
      false,
    );
  });

  test("primitive schemas accept anything without a description", () => {
    for (const schema of [undefined, null, 0, "", "x", 5, true, false]) {
      const result = jsonSchemaToZod(schema);
      expect(ok(result, { any: 1 })).toBe(true);
      expect(result.description).toBeUndefined();
    }
  });
});
