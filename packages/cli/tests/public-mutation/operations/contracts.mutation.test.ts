import { describe, expect, test } from "bun:test";

import {
  OPERATION_DATA_SCHEMAS,
  assertUniqueEffectKinds,
  declaredEffects,
  nullableJsonSchema,
} from "../../../src/public/operations/contracts.js";
import type {
  OperationEffect,
  OperationName,
} from "../../../src/public/operations/types.js";
import { expectGolden } from "../helpers/golden.js";

const ALL_EFFECTS: readonly OperationEffect[] = [
  "local-read",
  "kb-read",
  "workspace-read",
  "network-read",
  "kb-write",
  "workspace-write",
];

describe("operation data schemas", () => {
  test("match the published contract", () => {
    expectGolden("operation-data-schemas", OPERATION_DATA_SCHEMAS);
  });
});

describe("nullableJsonSchema", () => {
  test("adds null to a single type and wraps anything else", () => {
    expect(nullableJsonSchema({ type: "string", minLength: 1 })).toStrictEqual({
      type: ["string", "null"],
      minLength: 1,
    });
    const union = { type: ["string", "integer"] };
    expect(nullableJsonSchema(union)).toStrictEqual({
      anyOf: [union, { type: "null" }],
    });
    expect(nullableJsonSchema({})).toStrictEqual({
      anyOf: [{}, { type: "null" }],
    });
  });
});

describe("effect contracts", () => {
  test("declare every effect of every operation", () => {
    expectGolden(
      "operation-effect-declarations",
      Object.fromEntries(
        Object.keys(OPERATION_DATA_SCHEMAS).map((operation) => [
          operation,
          declaredEffects(operation as OperationName, ALL_EFFECTS),
        ]),
      ),
    );
  });

  test("reject unknown operations and repeated effects", () => {
    expect(() =>
      declaredEffects("kb_nope" as OperationName, ["kb-read"]),
    ).toThrow("Missing effect contract for kb_nope");
    expect(() => declaredEffects("kb_status", ["kb-read", "kb-read"])).toThrow(
      "Duplicate effect contract for kb_status",
    );
    expect(declaredEffects("kb_status", [])).toEqual([]);
  });

  test("assert unique effect kinds", () => {
    expect(() =>
      assertUniqueEffectKinds("op", [{ kind: "a" }, { kind: "b" }], 2),
    ).not.toThrow();
    expect(() =>
      assertUniqueEffectKinds("op", [{ kind: "a" }, { kind: "a" }], 2),
    ).toThrow(new Error("Duplicate effect contract for op"));
  });
});
