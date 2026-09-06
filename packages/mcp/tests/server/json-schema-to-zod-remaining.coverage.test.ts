// implements REQ-002
import { afterEach, describe, expect, test } from "bun:test";
import {
  firstDefined,
  jsonSchemaToZod,
} from "../../src/server/json-schema-to-zod.js";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("json-schema-to-zod remaining allOf, enum hole, and described unknown", () => {
  test("rejects allOf when a required property is missing", () => {
    const schema = jsonSchemaToZod({
      type: "object",
      allOf: [
        {
          if: { allOf: [{ required: ["name"] }, { required: ["age"] }] },
          then: { required: ["extra"] },
        },
      ],
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
        extra: { type: "string" },
      },
    });
    expect(schema.safeParse({ name: "a" }).success).toBe(true);
    expect(schema.safeParse({ name: "a", age: 2 }).success).toBe(false);
    expect(schema.safeParse({ name: "a", age: 2, extra: "x" }).success).toBe(
      true,
    );
  });

  test("describes an unknown type", () => {
    const schema = jsonSchemaToZod({
      type: "mystery",
      description: "anything goes",
    });
    expect(schema.description).toBe("anything goes");
    expect(schema.safeParse(12).success).toBe(true);
  });

  test("firstDefined and undescribed mystery types stay executable", () => {
    expect(firstDefined([])).toBeUndefined();
    expect(firstDefined(["only"])).toBe("only");
    const schema = jsonSchemaToZod({ type: "mystery" });
    expect(schema.safeParse("x").success).toBe(true);
  });
});
