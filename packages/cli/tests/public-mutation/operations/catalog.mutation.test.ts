import { describe, expect, test } from "bun:test";
import {
  OPERATION_CATALOG,
  getSpec,
  listSpecs,
  requireKnownSpec,
  withContractDefaults,
} from "../../../src/public/operations/catalog.js";
import {
  OPERATION_DATA_SCHEMAS,
  declaredEffects,
} from "../../../src/public/operations/contracts.js";
import type { OperationSpec } from "../../../src/public/operations/types.js";
import { expectGolden } from "../helpers/golden.js";

describe("operation catalog", () => {
  test("lists every operation once, in order, resolved in place", () => {
    const listed = listSpecs();
    expect(listed.map((spec) => spec.name)).toStrictEqual(
      OPERATION_CATALOG.map((spec) => spec.name),
    );
    expectGolden(
      "catalog-names",
      listed.map((spec) => spec.name),
    );
    for (const [index, spec] of listed.entries()) {
      expect(spec).toBe(OPERATION_CATALOG[index] as never);
      expect(getSpec(spec.name)).toBe(spec);
      expect(spec.resultVersion).toBe(`kibi.${spec.name}.v1`);
      expect(spec.declaredEffects).toStrictEqual(
        declaredEffects(spec.name, spec.effects),
      );
      const schema = spec.outputSchema as {
        properties: Record<string, unknown>;
      };
      expect(schema.properties.data).toBe(OPERATION_DATA_SCHEMAS[spec.name]);
      expect(schema.properties.operation).toStrictEqual({ const: spec.name });
      expect(schema.properties.resultVersion).toStrictEqual({
        const: `kibi.${spec.name}.v1`,
      });
      expect((schema.properties.effects as { minItems: number }).minItems).toBe(
        spec.effects.length,
      );
    }
  });

  test("builds the full result envelope schema", () => {
    const spec = getSpec("kb_check");
    const { data: _data, ...properties } = (
      spec.outputSchema as { properties: Record<string, unknown> }
    ).properties;
    expectGolden("catalog-envelope", {
      ...spec.outputSchema,
      properties,
    });
  });

  test("keeps declared contract fields and rejects unknown operations", () => {
    const declared = {
      ...getSpec("kb_status"),
      resultVersion: "custom.v2",
      outputSchema: { type: "null" },
      declaredEffects: [],
    } as unknown as OperationSpec;
    const resolved = withContractDefaults(declared);
    expect(resolved).toBe(declared as never);
    expect(
      Object.getOwnPropertyDescriptor(resolved, "resultVersion"),
    ).toStrictEqual({
      value: "custom.v2",
      enumerable: true,
      configurable: true,
      writable: true,
    });
    expect(resolved.outputSchema).toStrictEqual({ type: "null" });
    expect(resolved.declaredEffects).toStrictEqual([]);

    const versioned = { ...getSpec("kb_status") } as Record<string, unknown>;
    for (const key of ["outputSchema", "declaredEffects"])
      Reflect.deleteProperty(versioned, key);
    const fresh = withContractDefaults({
      ...versioned,
      resultVersion: "custom.v3",
    } as unknown as OperationSpec);
    expect(
      (fresh.outputSchema as { properties: { resultVersion: unknown } })
        .properties.resultVersion,
    ).toStrictEqual({ const: "custom.v3" });
    const descriptor = Object.getOwnPropertyDescriptor(fresh, "outputSchema");
    expect([
      descriptor?.enumerable,
      descriptor?.configurable,
      descriptor?.writable,
    ]).toStrictEqual([true, false, false]);
    const effects = Object.getOwnPropertyDescriptor(fresh, "declaredEffects");
    expect([
      effects?.enumerable,
      effects?.configurable,
      effects?.writable,
    ]).toStrictEqual([true, false, false]);
    const bare = { ...versioned } as Record<string, unknown>;
    Reflect.deleteProperty(bare, "resultVersion");
    const version = Object.getOwnPropertyDescriptor(
      withContractDefaults(bare as unknown as OperationSpec),
      "resultVersion",
    );
    expect(version).toStrictEqual({
      value: "kibi.kb_status.v1",
      enumerable: true,
      configurable: false,
      writable: false,
    });

    expect(() =>
      withContractDefaults({
        name: "kb_nope",
        effects: [],
      } as unknown as OperationSpec),
    ).toThrow(/^Missing output contract for kb_nope$/);
    expect(() => getSpec("kb_nope" as never)).toThrow(
      new RangeError("Unknown Kibi operation: kb_nope"),
    );
    expect(() => requireKnownSpec(undefined, "kb_x" as never)).toThrow(
      /^Unknown Kibi operation: kb_x$/,
    );
    const known = getSpec("kb_query");
    expect(requireKnownSpec(known, "kb_query")).toBe(known);
  });
});
