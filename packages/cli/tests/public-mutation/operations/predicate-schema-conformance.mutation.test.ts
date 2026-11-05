import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as entities from "../../../src/public/operations/discovery-entities.js";
import {
  collectPredicateSchemaConformanceViolations,
  evaluatePredicateSchemaConformance,
} from "../../../src/public/operations/predicate-schema-conformance.js";
import { expectGolden } from "../helpers/golden.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const schema = (
  id: string,
  name: string,
  namespace: string | undefined,
  argumentNames: string[],
  extra: Record<string, unknown> = {},
) => ({
  id,
  type: "fact",
  fact_kind: "predicate_schema",
  predicate_name: name,
  ...(namespace === undefined ? {} : { predicate_namespace: namespace }),
  argument_names: argumentNames,
  ...extra,
});

const fact = (
  id: string,
  name: unknown,
  namespace: string | undefined,
  args: unknown,
  extra: Record<string, unknown> = {},
) => ({
  id,
  type: "fact",
  fact_kind: "predicate",
  predicate_name: name,
  ...(namespace === undefined ? {} : { predicate_namespace: namespace }),
  predicate_args: args,
  ...extra,
});

const SCHEMAS = [
  schema("SCH-color-3", "color", "paint", ["a", "b", "c"]),
  schema("SCH-color", " color ", "paint", ["thing", "hue"], {
    argument_constants: { hue: ["red", "blue"] },
    argument_aliases: { hue: { crimson: "red" } },
  }),
  schema("SCH-color-ui", "color", "ui", ["thing", "hue"]),
  schema("SCH-nameless", "  ", undefined, ["a"]),
  schema("SCH-solo", "solo", "other", ["a"]),
  schema("SCH-multi-z", "multi", "zeta", ["a"]),
  schema("SCH-multi-a", "multi", "alpha", ["a"]),
  schema("SCH-state", "state", undefined, ["entity", "value"], {
    argument_constants: { value: ["on", "off"] },
  }),
];

describe("evaluatePredicateSchemaConformance", () => {
  test("reports schemas whose vocabulary is invalid", () => {
    const violations = evaluatePredicateSchemaConformance([
      schema("SCH-bad", "bad", undefined, ["x"], {
        argument_constants: { y: ["a"], x: [] },
        source: " docs/bad.md ",
      }),
      schema("SCH-good", "good", undefined, ["x"], {
        argument_constants: { x: ["a"] },
      }),
      fact("F-carrier", "good", undefined, ["a"], {
        fact_kind: "observation",
        argument_constants: { x: ["a"] },
      }),
    ]);
    expectGolden("predicate-schema-invalid", violations);
  });

  test("checks each predicate fact against the schema of its signature", () => {
    const violations = evaluatePredicateSchemaConformance([
      ...SCHEMAS,
      fact("F-ok", "color", "paint", ["car", "red"]),
      fact("F-trimmed", " color ", " paint ", [1, "car", "blue"]),
      fact("F-alias", "color", "paint", ["car", "crimson"], {
        title: "Predicate: color(car,crimson)",
        source: " src/f.md ",
        sourceFile: "src/f.md",
        updated_at: "2026-01-01",
        created_at: "2026-01-01",
        links: [],
        relationships: [],
        relates_to: "X",
        value_string: null,
        tags: undefined,
        status: "active",
      }),
      fact("F-alias-titled", "color", "paint", ["crimson", "crimson"], {
        title: "Custom",
        canonical_key: "old",
      }),
      fact("F-undeclared", "color", "paint", ["car", "green"]),
      fact("F-missing", "nothing", undefined, ["a"], { source: "   " }),
      fact("F-align", "solo", undefined, ["x"], { title: "Solo" }),
      fact("F-multi", "multi", undefined, ["x"]),
      fact("F-state", "state", undefined, ["lamp", "dim"]),
      fact("F-guard", "guard", undefined, ["a", "b", "c"]),
      fact("F-guard-elsewhere", "guard", "custom", ["a", "b", "c"]),
      fact("F-nameless", "  ", undefined, ["a", "b"]),
      fact("F-solo-mixed", "solo", "other", [1, "x"]),
      fact("F-named-observation", "nothing", undefined, ["a"], {
        fact_kind: "observation",
        argument_names: ["a"],
      }),
      fact("F-named-number", 5, undefined, ["a"]),
      fact("F-no-args", "color", "paint", []),
      fact("F-args-text", "color", "paint", "car"),
      fact("F-observation", "nothing", undefined, ["a"], {
        fact_kind: "observation",
      }),
    ]);
    expectGolden("predicate-schema-facts", violations);
    expect(violations.map((row) => row.entityId)).toEqual([
      "F-alias",
      "F-alias-titled",
      "F-undeclared",
      "F-missing",
      "F-align",
      "F-multi",
      "F-state",
      "F-guard-elsewhere",
    ]);
    const repairOf = (id: string) =>
      (
        violations.find((row) => row.entityId === id)?.evidence as {
          repair: { properties: Record<string, unknown> } | null;
        }
      ).repair?.properties;
    expect(repairOf("F-alias")).toStrictEqual({
      title: "Predicate: color(car,red)",
      status: "active",
      fact_kind: "predicate",
      predicate_name: "color",
      predicate_namespace: "paint",
      predicate_args: ["car", "red"],
      canonical_key: "color(car,red)",
    });
    expect(repairOf("F-align")).toStrictEqual({
      title: "Solo",
      fact_kind: "predicate",
      predicate_name: "solo",
      predicate_args: ["x"],
      predicate_namespace: "other",
    });
    expect(
      violations.map((row) => Object.hasOwn(row, "source") && row.source),
    ).toEqual(["src/f.md", false, false, false, false, false, false, false]);
  });
});

describe("collectPredicateSchemaConformanceViolations", () => {
  test("loads every fact once", async () => {
    const load = spyOn(entities, "loadEntitiesPaged").mockResolvedValue([
      fact("F-missing", "nothing", undefined, ["a"]),
    ]);
    spies.push(load);
    const prolog = { query: async () => ({ success: true, bindings: {} }) };
    const violations = await collectPredicateSchemaConformanceViolations(
      prolog as never,
    );
    expect(load).toHaveBeenCalledWith(prolog, "fact");
    expect(violations.map((row) => row.entityId)).toEqual(["F-missing"]);
  });
});
