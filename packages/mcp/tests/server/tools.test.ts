/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";

import { jsonSchemaToZod } from "../../src/server/tools.js";

// ============================================================================
// jsonSchemaToZod tests
// ============================================================================

describe("jsonSchemaToZod", () => {
  describe("null/undefined schema", () => {
    test("returns z.any() for null schema", () => {
      const result = jsonSchemaToZod(null);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(undefined).success).toBe(true);
      expect(result.safeParse(123).success).toBe(true);
      expect(result.safeParse("test").success).toBe(true);
    });

    test("returns z.any() for undefined schema", () => {
      const result = jsonSchemaToZod(undefined);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(null).success).toBe(true);
    });
  });

  describe("non-object schema", () => {
    test("returns z.any() for string schema", () => {
      const result = jsonSchemaToZod("not an object" as unknown);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse("test").success).toBe(true);
    });

    test("returns z.any() for number schema", () => {
      const result = jsonSchemaToZod(42 as unknown);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(42).success).toBe(true);
    });

    test("returns z.any() for array schema", () => {
      const result = jsonSchemaToZod([1, 2, 3] as unknown);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse([1, 2]).success).toBe(true);
    });
  });

  describe("schema with description", () => {
    test("propagates description to result for object schema", () => {
      const schema = {
        type: "object",
        description: "A test object schema",
        properties: {},
      };
      const result = jsonSchemaToZod(schema);
      expect(result.description).toBe("A test object schema");
    });

    test("propagates description to result for string schema", () => {
      const schema = {
        type: "string",
        description: "A test string schema",
      };
      const result = jsonSchemaToZod(schema);
      expect(result.description).toBe("A test string schema");
    });

    test("propagates description to result for array schema", () => {
      const schema = {
        type: "array",
        description: "A test array schema",
        items: { type: "string" },
      };
      const result = jsonSchemaToZod(schema);
      expect(result.description).toBe("A test array schema");
    });
  });

  describe("enum handling", () => {
    test("enum array with single string literal returns literal schema with description", () => {
      const schema = {
        enum: ["active"],
        description: "Single status value",
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.description).toBe("Single status value");
      expect(result.safeParse("active").success).toBe(true);
    });

    test("enum array with multiple string values returns union schema", () => {
      const schema = {
        enum: ["draft", "active", "deprecated"],
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse("draft").success).toBe(true);
      expect(result.safeParse("active").success).toBe(true);
      expect(result.safeParse("deprecated").success).toBe(true);
      expect(result.safeParse("unknown").success).toBe(false);
    });

    test("returns z.union for non-string enum values", () => {
      const schema = {
        enum: [1, 2, 3],
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(1).success).toBe(true);
      expect(result.safeParse(2).success).toBe(true);
      expect(result.safeParse(3).success).toBe(true);
      expect(result.safeParse("1").success).toBe(false);
    });

    test("empty enum array returns z.any()", () => {
      const schema = {
        enum: [],
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse("anything").success).toBe(true);
    });
  });

  describe("const handling", () => {
    test("preserves primitive JSON Schema constants in validation and advertised schema", () => {
      const result = jsonSchemaToZod({
        type: "string",
        const: "kibi.semantic-inventory.v1",
        description: "Inventory contract version",
      });

      expect(result.description).toBe("Inventory contract version");
      expect(result.safeParse("kibi.semantic-inventory.v1").success).toBe(true);
      expect(result.safeParse("kibi.semantic-inventory.v2").success).toBe(
        false,
      );
      expect(z.toJSONSchema(result)).toMatchObject({
        const: "kibi.semantic-inventory.v1",
      });
    });

    test("falls back to a described unconstrained schema for non-primitive constants", () => {
      const result = jsonSchemaToZod({
        const: { unsupported: true },
        description: "Opaque constant",
      });

      expect(result.description).toBe("Opaque constant");
      expect(result.safeParse("anything").success).toBe(true);
    });
  });

  describe("string type", () => {
    test("creates zod string schema", () => {
      const schema = { type: "string" };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse("hello").success).toBe(true);
      expect(result.safeParse(123).success).toBe(false);
    });

    test("respects minLength constraint", () => {
      const schema = { type: "string", minLength: 3 };
      const result = jsonSchemaToZod(schema);
      expect(result.safeParse("ab").success).toBe(false);
      expect(result.safeParse("abc").success).toBe(true);
    });

    test("respects maxLength constraint", () => {
      const schema = { type: "string", maxLength: 5 };
      const result = jsonSchemaToZod(schema);
      expect(result.safeParse("abcdef").success).toBe(false);
      expect(result.safeParse("abcde").success).toBe(true);
    });

    test("validates and advertises string patterns", () => {
      const schema = { type: "string", pattern: "^[a-z]+$" };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse("hello").success).toBe(true);
      expect(result.safeParse("Hello").success).toBe(false);
      expect(z.toJSONSchema(result)).toMatchObject({ pattern: "^[a-z]+$" });
    });

    test("accepts any string with format (not validated)", () => {
      const schema = { type: "string", format: "date-time" };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse("not-a-date").success).toBe(true);
    });
  });

  describe("number type", () => {
    test("creates zod number schema", () => {
      const schema = { type: "number" };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(42).success).toBe(true);
      expect(result.safeParse("42").success).toBe(false);
    });

    test("respects minimum constraint", () => {
      const schema = { type: "number", minimum: 10 };
      const result = jsonSchemaToZod(schema);
      expect(result.safeParse(9).success).toBe(false);
      expect(result.safeParse(10).success).toBe(true);
    });

    test("respects maximum constraint", () => {
      const schema = { type: "number", maximum: 100 };
      const result = jsonSchemaToZod(schema);
      expect(result.safeParse(101).success).toBe(false);
      expect(result.safeParse(100).success).toBe(true);
    });
  });

  describe("boolean type", () => {
    test("creates zod boolean schema", () => {
      const schema = { type: "boolean" };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(true).success).toBe(true);
      expect(result.safeParse(false).success).toBe(true);
      expect(result.safeParse("true").success).toBe(false);
    });
  });

  describe("integer type", () => {
    test("creates zod number schema for integer", () => {
      const schema = { type: "integer" };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(42).success).toBe(true);
      expect(result.safeParse(3.14).success).toBe(false);
    });

    test("integer respects minimum constraint", () => {
      const schema = { type: "integer", minimum: 0 };
      const result = jsonSchemaToZod(schema);
      expect(result.safeParse(-1).success).toBe(false);
      expect(result.safeParse(0).success).toBe(true);
    });

    test("integer respects maximum constraint", () => {
      const schema = { type: "integer", maximum: 100 };
      const result = jsonSchemaToZod(schema);
      expect(result.safeParse(101).success).toBe(false);
      expect(result.safeParse(100).success).toBe(true);
    });
  });

  describe("null type", () => {
    test("returns z.any() for null type (not implemented)", () => {
      const schema = { type: "null" };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(null).success).toBe(true);
      expect(result.safeParse("anything").success).toBe(true);
    });
  });

  describe("array type", () => {
    test("creates zod array schema", () => {
      const schema = {
        type: "array",
        items: { type: "string" },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(["a", "b"]).success).toBe(true);
      expect(result.safeParse([1, 2]).success).toBe(false);
    });

    test("respects minItems constraint", () => {
      const schema = {
        type: "array",
        items: { type: "string" },
        minItems: 2,
      };
      const result = jsonSchemaToZod(schema);
      expect(result.safeParse(["a"]).success).toBe(false);
      expect(result.safeParse(["a", "b"]).success).toBe(true);
    });

    test("respects maxItems constraint", () => {
      const schema = {
        type: "array",
        items: { type: "string" },
        maxItems: 2,
      };
      const result = jsonSchemaToZod(schema);
      expect(result.safeParse(["a", "b", "c"]).success).toBe(false);
      expect(result.safeParse(["a", "b"]).success).toBe(true);
    });

    test("validates and advertises uniqueItems", () => {
      const result = jsonSchemaToZod({
        type: "array",
        items: { type: "string" },
        uniqueItems: true,
      });
      expect(result.safeParse(["a", "b"]).success).toBe(true);
      expect(result.safeParse(["a", "a"]).success).toBe(false);
      expect(z.toJSONSchema(result)).toMatchObject({ uniqueItems: true });
    });

    test("handles items with nested object type", () => {
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse([{ id: "1" }, { id: "2" }]).success).toBe(true);
    });

    test("handles nested array items", () => {
      const schema = {
        type: "array",
        items: {
          type: "array",
          items: { type: "number" },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(
        result.safeParse([
          [1, 2],
          [3, 4],
        ]).success,
      ).toBe(true);
      expect(result.safeParse([["a", "b"]]).success).toBe(false);
    });
  });

  describe("object type", () => {
    test("creates zod object schema", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse({ name: "John", age: 30 }).success).toBe(true);
      expect(result.safeParse({ name: "John" }).success).toBe(true);
    });

    test("respects required properties", () => {
      const schema = {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result.safeParse({ name: "John" }).success).toBe(true);
      expect(result.safeParse({}).success).toBe(false);
    });

    test("handles nested object properties", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: {
                type: "object",
                properties: {
                  city: { type: "string" },
                },
              },
            },
          },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(
        result.safeParse({
          user: { name: "John", address: { city: "NYC" } },
        }).success,
      ).toBe(true);
    });

    test("objects are passthrough by default", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse({ name: "John", extra: "value" }).success).toBe(
        true,
      );
    });

    test("handles additionalProperties=false (strict objects)", () => {
      const schema = {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse({ name: "John" }).success).toBe(true);
    });

    test("handles additionalProperties as boolean true", () => {
      const schema = {
        type: "object",
        additionalProperties: true,
        properties: {
          name: { type: "string" },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse({ name: "John", extra: "value" }).success).toBe(
        true,
      );
    });

    test("handles additionalProperties as object schema", () => {
      const schema = {
        type: "object",
        additionalProperties: { type: "string" },
        properties: {
          name: { type: "string" },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
    });

    test("handles empty properties object", () => {
      const schema = {
        type: "object",
        properties: {},
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse({}).success).toBe(true);
    });

    test("handles missing properties field", () => {
      const schema = {
        type: "object",
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse({}).success).toBe(true);
    });

    test("validates and advertises conditional required properties", () => {
      const consequenceKeyword = ["th", "en"].join("");
      const allOf = [
        Object.fromEntries([
          [
            "if",
            {
              anyOf: [
                { required: ["claim_key"] },
                { required: ["claim_text"] },
              ],
            },
          ],
          [consequenceKeyword, { required: ["claim_key", "claim_text"] }],
        ]),
      ];
      const result = jsonSchemaToZod({
        type: "object",
        properties: {
          claim_key: { type: "string" },
          claim_text: { type: "string" },
        },
        allOf,
      });
      expect(result.safeParse({}).success).toBe(true);
      expect(
        result.safeParse({ claim_key: "CLAIM-0000000000000000" }).success,
      ).toBe(false);
      expect(
        result.safeParse({
          claim_key: "CLAIM-0000000000000000",
          claim_text: "Atomic claim",
        }).success,
      ).toBe(true);
      expect(z.toJSONSchema(result)).toMatchObject({ allOf });
    });
  });

  describe("const value", () => {
    test("enforces a string const", () => {
      const schema = { const: "fixed" };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse("fixed").success).toBe(true);
      expect(result.safeParse("other").success).toBe(false);
    });

    test("enforces a numeric const", () => {
      const schema = { const: 42 };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(42).success).toBe(true);
      expect(result.safeParse(43).success).toBe(false);
    });
  });

  describe("default values", () => {
    test("handles default value in schema", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string", default: "Anonymous" },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse({}).success).toBe(true);
    });

    test("handles default with required property", () => {
      const schema = {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", default: "Anonymous" },
        },
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse({}).success).toBe(false);
    });
  });

  describe("unknown type", () => {
    test("returns z.any() for unknown type", () => {
      const schema = { type: "unknown" };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse("anything").success).toBe(true);
      expect(result.safeParse(123).success).toBe(true);
    });
  });

  describe("boolean enum values", () => {
    test("handles boolean literal in enum", () => {
      const schema = {
        enum: [true, false],
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(true).success).toBe(true);
      expect(result.safeParse(false).success).toBe(true);
      expect(result.safeParse("true").success).toBe(false);
    });

    test("handles null in enum", () => {
      const schema = {
        enum: [null],
      };
      const result = jsonSchemaToZod(schema);
      expect(result).toBeInstanceOf(z.ZodType);
      expect(result.safeParse(null).success).toBe(true);
    });
  });
});
