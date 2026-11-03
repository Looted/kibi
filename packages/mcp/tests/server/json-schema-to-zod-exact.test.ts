import { describe, expect, test } from "bun:test";
import type { z } from "zod";

import {
  describedAnySchema,
  firstDefined,
  jsonSchemaToZod,
  singleLiteralOrAny,
} from "../../src/server/json-schema-to-zod.js";

const ok = (schema: z.ZodTypeAny, value: unknown) =>
  schema.safeParse(value).success;

function issues(schema: z.ZodTypeAny, value: unknown) {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
}

describe("helpers", () => {
  test("firstDefined, describedAnySchema and singleLiteralOrAny", () => {
    expect(firstDefined([2, 3])).toBe(2);
    expect(firstDefined([])).toBeUndefined();
    expect(describedAnySchema("d").description).toBe("d");
    expect(describedAnySchema(undefined).description).toBeUndefined();
    expect(singleLiteralOrAny([], "d").description).toBe("d");
    expect(ok(singleLiteralOrAny([], undefined), { any: 1 })).toBe(true);
  });
});

describe("jsonSchemaToZod, exact", () => {
  test("non-object schemas accept anything", () => {
    for (const schema of [undefined, null, 0, "", "string", true])
      expect(ok(jsonSchemaToZod(schema), { any: 1 })).toBe(true);
  });

  test("const literals, with and without a description", () => {
    for (const value of ["a", 1, false, null]) {
      const schema = jsonSchemaToZod({ const: value, description: "d" });
      expect(ok(schema, value)).toBe(true);
      expect(ok(schema, "other")).toBe(false);
      expect(schema.description).toBe("d");
      expect(jsonSchemaToZod({ const: value }).description).toBeUndefined();
    }
    const objectConst = jsonSchemaToZod({ const: { a: 1 }, description: "o" });
    expect(ok(objectConst, "anything")).toBe(true);
    expect(objectConst.description).toBe("o");
    expect(ok(jsonSchemaToZod({ const: [1] }), 5)).toBe(true);
    expect(jsonSchemaToZod({ const: [1] }).description).toBeUndefined();
    expect(jsonSchemaToZod({ const: 1, description: 5 }).description).toBe(
      undefined,
    );
  });

  test("enums become literal unions", () => {
    const union = jsonSchemaToZod({
      enum: ["a", 2, true, null, { x: 1 }],
      description: "e",
    });
    for (const value of ["a", 2, true, null])
      expect(ok(union, value)).toBe(true);
    expect(ok(union, { x: 1 })).toBe(false);
    expect(ok(union, "b")).toBe(false);
    expect(union.description).toBe("e");
    expect(jsonSchemaToZod({ enum: ["a", "b"] }).description).toBeUndefined();

    const single = jsonSchemaToZod({ enum: ["only"], description: "s" });
    expect(ok(single, "only")).toBe(true);
    expect(ok(single, "other")).toBe(false);
    expect(single.description).toBe("s");

    const objects = jsonSchemaToZod({ enum: [{ a: 1 }], description: "x" });
    expect(ok(objects, 42)).toBe(true);
    expect(objects.description).toBe("x");
    expect(jsonSchemaToZod({ enum: [[1]] }).description).toBeUndefined();

    // An empty enum constrains nothing here: the type decides.
    expect(ok(jsonSchemaToZod({ enum: [], type: "string" }), 1)).toBe(false);
    expect(ok(jsonSchemaToZod({ enum: "a", type: "string" }), "z")).toBe(true);
  });

  test("anyOf becomes a union and keeps its description", () => {
    const schema = jsonSchemaToZod({
      anyOf: [{ type: "string" }, { type: "number" }],
      description: "u",
    });
    expect(ok(schema, "a")).toBe(true);
    expect(ok(schema, 1)).toBe(true);
    expect(ok(schema, true)).toBe(false);
    expect(schema.description).toBe("u");
    expect(
      jsonSchemaToZod({ anyOf: [{ type: "string" }, { type: "number" }] })
        .description,
    ).toBeUndefined();
    expect(ok(jsonSchemaToZod({ anyOf: [], type: "string" }), 1)).toBe(false);
  });

  test("a type list becomes a union of each type", () => {
    const nullable = jsonSchemaToZod({ type: ["string", "null", 5] });
    expect(ok(nullable, "a")).toBe(true);
    expect(ok(nullable, null)).toBe(true);
    expect(ok(nullable, 1)).toBe(false);
    const single = jsonSchemaToZod({ type: ["integer"] });
    expect(ok(single, 1)).toBe(true);
    expect(ok(single, 1.5)).toBe(false);
  });

  test("objects: optional, required and additional properties", () => {
    const loose = jsonSchemaToZod({
      type: "object",
      description: "obj",
      properties: { a: { type: "string" }, b: { type: "number" } },
      required: ["a", "", 3],
    });
    expect(loose.description).toBe("obj");
    expect(loose.parse({ a: "x", extra: 1 })).toStrictEqual({
      a: "x",
      extra: 1,
    });
    expect(ok(loose, { b: 1 })).toBe(false);
    expect(ok(loose, { a: "x", b: "no" })).toBe(false);

    const strict = jsonSchemaToZod({
      type: "object",
      properties: { a: { type: "string" } },
      additionalProperties: false,
    });
    expect(strict.description).toBeUndefined();
    // Without additional properties, unknown keys are dropped.
    expect(strict.parse({ a: "x", extra: 1 })).toStrictEqual({ a: "x" });

    const bare = jsonSchemaToZod({
      type: "object",
      properties: "x",
      required: "a",
    });
    expect(bare.parse({ k: 1 })).toStrictEqual({ k: 1 });
    expect(ok(bare, "x")).toBe(false);
  });

  test("objects: if/then rules in allOf require their keys", () => {
    // JSON Schema names this keyword "then"; a computed key keeps the lint
    // rule against thenable objects quiet.
    const THEN = ["th", "en"].join("");
    const allOf = [
      {
        if: { properties: { kind: { const: "a" } }, required: ["kind"] },
        [THEN]: { required: ["alpha", "", 4] },
      },
      { if: { required: ["kind"] } },
      { [THEN]: { required: ["never"] } },
      { if: true, [THEN]: null },
      { if: true, [THEN]: "x" },
      { if: true, [THEN]: { required: "beta" } },
      { if: false, [THEN]: { required: ["gamma"] } },
      null,
      "rule",
    ];
    const schema = jsonSchemaToZod({ type: "object", allOf });
    expect(issues(schema, { kind: "a" })).toStrictEqual([
      {
        path: ["alpha"],
        message: "Required by conditional JSON Schema rule: alpha",
      },
    ]);
    expect(ok(schema, { kind: "a", alpha: 1 })).toBe(true);
    expect(ok(schema, { kind: "b" })).toBe(true);
    expect(schema.meta()).toStrictEqual({ allOf });
    expect(jsonSchemaToZod({ type: "object" }).meta()).toBeUndefined();
  });

  test("objects: a oneOf of guard branches must match exactly one", () => {
    const schema = jsonSchemaToZod({
      type: "object",
      properties: { a: {}, b: {}, c: {} },
      oneOf: [
        { required: ["a"], not: { anyOf: [{ required: ["b"] }] } },
        {
          required: ["b"],
          description: "b only",
          not: { allOf: [{ required: ["a", "c"] }] },
        },
      ],
    });
    expect(ok(schema, { a: 1 })).toBe(true);
    expect(ok(schema, { b: 1 })).toBe(true);
    const message =
      "Input must match exactly one of: {a} without b; {b} without a, c";
    expect(issues(schema, {})).toStrictEqual([
      { path: [], message: `${message} (matched 0).` },
    ]);
    expect(issues(schema, { a: 1, b: 1, c: 1 })).toStrictEqual([
      { path: [], message: `${message} (matched 0).` },
    ]);
    const both = jsonSchemaToZod({
      type: "object",
      oneOf: [{ required: ["a"] }, { required: [] }],
    });
    expect(issues(both, { a: 1 })).toStrictEqual([
      {
        path: [],
        message: "Input must match exactly one of: {a}; {} (matched 2).",
      },
    ]);
    expect(ok(both, {})).toBe(true);
  });

  test("objects: oneOf that is not made of guard branches is left alone", () => {
    for (const oneOf of [
      [{ required: ["a"] }],
      [{ required: ["a"] }, { properties: { a: {} } }],
      [{ required: ["a"] }, {}],
      [{ required: ["a"] }, null],
      [{ required: ["a"] }, ["x"]],
      [{ required: ["a"] }, { required: [1] }],
      [{ required: ["a"] }, { required: "b" }],
      [{ required: ["a"] }, { not: { properties: {} } }],
      [{ required: ["a"] }, { anyOf: [{ type: "x" }] }],
      [{ required: ["a"] }, { allOf: "x" }],
      "x",
    ]) {
      const schema = jsonSchemaToZod({ type: "object", oneOf });
      expect([oneOf, ok(schema, {})]).toStrictEqual([oneOf, true]);
    }
    const nested = jsonSchemaToZod({
      type: "object",
      oneOf: [
        { required: ["a"] },
        { allOf: [{ required: ["b"] }], anyOf: [{ required: ["c"] }] },
      ],
    });
    expect(ok(nested, { a: 1 })).toBe(true);
    expect(ok(nested, { b: 1, c: 1 })).toBe(true);
    expect(ok(nested, {})).toBe(false);
  });

  test("a guard description ignores non-object parts of not", () => {
    const schema = jsonSchemaToZod({
      type: "object",
      oneOf: [
        { required: ["a"], not: { anyOf: [{ not: { required: ["z"] } }] } },
        { required: ["b"] },
      ],
    });
    expect(issues(schema, {})).toStrictEqual([
      {
        path: [],
        message: "Input must match exactly one of: {a}; {b} (matched 0).",
      },
    ]);
  });

  test("arrays: items, bounds, uniqueness and description", () => {
    const schema = jsonSchemaToZod({
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 2,
      uniqueItems: true,
      description: "arr",
    });
    expect(schema.description).toBe("arr");
    expect(ok(schema, ["a"])).toBe(true);
    expect(ok(schema, ["a", "b"])).toBe(true);
    expect(ok(schema, [])).toBe(false);
    expect(ok(schema, ["a", "b", "c"])).toBe(false);
    expect(ok(schema, [1])).toBe(false);
    expect(issues(schema, ["a", "a"])).toStrictEqual([
      { path: [], message: "Array items must be unique" },
    ]);
    expect(schema.meta()).toStrictEqual({
      description: "arr",
      uniqueItems: true,
    });
    const objects = jsonSchemaToZod({ type: "array", uniqueItems: true });
    expect(ok(objects, [{ a: 1 }, { a: 2 }])).toBe(true);
    expect(ok(objects, [{ a: 1 }, { a: 1 }])).toBe(false);
    const plain = jsonSchemaToZod({ type: "array", uniqueItems: "yes" });
    expect(plain.description).toBeUndefined();
    expect(ok(plain, [1, 1, "x"])).toBe(true);
    expect(plain.meta()).toBeUndefined();
  });

  test("strings: bounds, pattern and description", () => {
    const schema = jsonSchemaToZod({
      type: "string",
      minLength: 2,
      maxLength: 3,
      pattern: "^a",
      description: "s",
    });
    expect(schema.description).toBe("s");
    expect(ok(schema, "ab")).toBe(true);
    expect(ok(schema, "abc")).toBe(true);
    expect(ok(schema, "a")).toBe(false);
    expect(ok(schema, "abcd")).toBe(false);
    expect(ok(schema, "ba")).toBe(false);
    const plain = jsonSchemaToZod({ type: "string", minLength: "2" });
    expect(plain.description).toBeUndefined();
    expect(ok(plain, "")).toBe(true);
  });

  for (const type of ["number", "integer"]) {
    test(`${type}: bounds and description`, () => {
      const schema = jsonSchemaToZod({
        type,
        minimum: 1,
        maximum: 3,
        description: "n",
      });
      expect(schema.description).toBe("n");
      expect(ok(schema, 1)).toBe(true);
      expect(ok(schema, 3)).toBe(true);
      expect(ok(schema, 0)).toBe(false);
      expect(ok(schema, 4)).toBe(false);
      expect(ok(schema, "2")).toBe(false);
      const plain = jsonSchemaToZod({ type, minimum: "1" });
      expect(plain.description).toBeUndefined();
      expect(ok(plain, -100)).toBe(true);
    });
  }

  test("integers reject fractions, numbers accept them", () => {
    expect(ok(jsonSchemaToZod({ type: "integer" }), 1.5)).toBe(false);
    expect(ok(jsonSchemaToZod({ type: "number" }), 1.5)).toBe(true);
  });

  test("booleans, nulls and unknown types", () => {
    const b = jsonSchemaToZod({ type: "boolean", description: "b" });
    expect(b.description).toBe("b");
    expect(ok(b, false)).toBe(true);
    expect(ok(b, 0)).toBe(false);
    expect(jsonSchemaToZod({ type: "boolean" }).description).toBeUndefined();
    const n = jsonSchemaToZod({ type: "null", description: "n" });
    expect(n.description).toBe("n");
    expect(ok(n, null)).toBe(true);
    expect(ok(n, 0)).toBe(false);
    expect(jsonSchemaToZod({ type: "null" }).description).toBeUndefined();
    const mystery = jsonSchemaToZod({ type: "mystery", description: "m" });
    expect(mystery.description).toBe("m");
    expect(ok(mystery, { x: 1 })).toBe(true);
    expect(jsonSchemaToZod({ description: 5 }).description).toBeUndefined();
  });
});
