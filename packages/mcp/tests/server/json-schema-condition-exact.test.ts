import { describe, expect, test } from "bun:test";

import { matchesJsonSchemaCondition as matches } from "../../src/server/json-schema-to-zod.js";

describe("matchesJsonSchemaCondition, exact", () => {
  test("boolean, missing and non-object schemas", () => {
    expect(matches(1, true)).toBe(true);
    expect(matches(1, undefined)).toBe(true);
    expect(matches(1, false)).toBe(false);
    expect(matches(1, null)).toBe(true);
    expect(matches(1, 5)).toBe(true);
    expect(matches(1, "string")).toBe(true);
    expect(matches(1, {})).toBe(true);
  });

  test("each JSON type", () => {
    const cases: Array<[string, unknown, boolean]> = [
      ["object", {}, true],
      ["object", null, false],
      ["object", [], false],
      ["object", "x", false],
      ["array", [], true],
      ["array", {}, false],
      ["string", "", true],
      ["string", 1, false],
      ["number", 1.5, true],
      ["number", Number.NaN, false],
      ["number", Number.POSITIVE_INFINITY, false],
      ["number", "1", false],
      ["integer", 2, true],
      ["integer", 2.5, false],
      ["integer", "2", false],
      ["boolean", false, true],
      ["boolean", 0, false],
      ["null", null, true],
      ["null", undefined, false],
      ["mystery", 1, true],
    ];
    for (const [type, value, expected] of cases) {
      expect([type, value, matches(value, { type })]).toStrictEqual([
        type,
        value,
        expected,
      ]);
    }
  });

  test("a type list matches any listed type and ignores non-text entries", () => {
    expect(matches("a", { type: ["number", "string"] })).toBe(true);
    expect(matches(true, { type: ["number", "string"] })).toBe(false);
    expect(matches(1, { type: ["string", 3] })).toBe(false);
    expect(matches(1, { type: [3] })).toBe(true);
    expect(matches(1, { type: [] })).toBe(true);
    expect(matches(1, { type: 7 })).toBe(true);
  });

  test("const compares by value and only when the schema owns it", () => {
    expect(matches({ a: [1] }, { const: { a: [1] } })).toBe(true);
    expect(matches({ a: [2] }, { const: { a: [1] } })).toBe(false);
    expect(matches(null, { const: null })).toBe(true);
    expect(matches(0, { const: null })).toBe(false);
    expect(matches(5, Object.create({ const: 1 }))).toBe(true);
  });

  test("enum needs one equal entry and is ignored unless a list", () => {
    expect(matches("b", { enum: ["a", "b"] })).toBe(true);
    expect(matches("c", { enum: ["a", "b"] })).toBe(false);
    expect(matches({ k: 1 }, { enum: [{ k: 1 }] })).toBe(true);
    expect(matches("c", { enum: [] })).toBe(false);
    expect(matches("c", { enum: "c" })).toBe(true);
  });

  test("required applies to objects and ignores empty or non-text keys", () => {
    expect(matches({ a: 1 }, { required: ["a"] })).toBe(true);
    expect(matches({}, { required: ["a"] })).toBe(false);
    expect(matches({ a: undefined }, { required: ["a"] })).toBe(true);
    expect(matches({}, { required: ["", 3] })).toBe(true);
    expect(matches({ b: 1 }, { required: ["", "a"] })).toBe(false);
    expect(matches(Object.create({ a: 1 }), { required: ["a"] })).toBe(false);
    expect(matches("x", { required: ["a"] })).toBe(true);
    expect(matches(["a"], { required: ["0"] })).toBe(true);
    expect(matches(null, { required: ["a"] })).toBe(true);
    expect(matches({}, { required: "a" })).toBe(true);
  });

  test("properties constrain only keys that are present", () => {
    const schema = { properties: { a: { type: "string" }, b: false } };
    expect(matches({ a: "x" }, schema)).toBe(true);
    expect(matches({ a: 1 }, schema)).toBe(false);
    expect(matches({ b: 1 }, schema)).toBe(false);
    expect(matches({}, schema)).toBe(true);
    expect(matches(Object.create({ b: 1 }), schema)).toBe(true);
    expect(matches({ a: 1 }, { properties: "a" })).toBe(true);
    expect(matches({ a: 1 }, { properties: null })).toBe(true);
    expect(matches([1], { properties: { 0: false } })).toBe(true);
  });

  test("not, anyOf, allOf and oneOf", () => {
    expect(matches(1, { not: { type: "string" } })).toBe(true);
    expect(matches("a", { not: { type: "string" } })).toBe(false);
    // An absent `not` subschema accepts everything, so `not` rejects.
    expect(matches(1, { not: undefined })).toBe(false);
    expect(matches(1, { anyOf: [{ type: "string" }, { type: "number" }] })).toBe(
      true,
    );
    expect(matches(true, { anyOf: [{ type: "string" }, { type: "number" }] })).toBe(
      false,
    );
    expect(matches(1, { anyOf: "x" })).toBe(true);
    expect(matches(1, { allOf: [{ type: "number" }, { const: 1 }] })).toBe(true);
    expect(matches(2, { allOf: [{ type: "number" }, { const: 1 }] })).toBe(false);
    expect(matches(1, { allOf: "x" })).toBe(true);
    expect(matches(1, { oneOf: [{ type: "number" }, { type: "string" }] })).toBe(
      true,
    );
    expect(matches(1, { oneOf: [{ type: "number" }, { const: 1 }] })).toBe(false);
    expect(matches(true, { oneOf: [{ type: "number" }] })).toBe(false);
    expect(matches(1, { oneOf: "x" })).toBe(true);
  });
});
