import { describe, expect, test } from "bun:test";
import {
  DEFAULT_USAGE_HINTS,
  USAGE_HINTS_BY_PREDICATE,
} from "../../../src/operations/modeling/predicate-catalog.js";
import {
  loadExistingPredicateSchemas,
  optionalPredicateName,
  predicateSchemaFromEntity,
  schemaForCandidate,
  stringArray,
  usageHintsFromEntity,
} from "../../../src/operations/modeling/predicate-loader.js";
import type { PredicateSchemaCandidate } from "../../../src/operations/modeling/predicate-types.js";
import { hashId } from "../../../src/operations/modeling/predicate-utils.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";

const QUERY =
  "findall([Id,'fact',Props], (kb:predicate_schema(Id, _Namespace, _Name, _Arity, _ArgumentNames, _ArgumentTypes), kb_entity(Id, 'fact', Props)), Results)";

const minimal = {
  id: "F",
  predicate_name: "zz_pred",
  title: "T",
  description: "D",
  argument_names: ["a"],
  argument_types: ["string"],
  keywords: ["k"],
  examples: ["e"],
  tags: ["t"],
} as unknown as PredicateSchemaCandidate;

describe("optionalPredicateName and stringArray", () => {
  test("keeps only strings", () => {
    expect(optionalPredicateName("p")).toBe("p");
    expect(optionalPredicateName(3)).toBe(undefined);
  });

  test("keeps trimmed non-empty strings of an array", () => {
    expect(stringArray([" a ", "", "  ", 3, null, "b"])).toStrictEqual([
      "a",
      "b",
    ]);
    expect(stringArray("a")).toStrictEqual([]);
    expect(stringArray(undefined)).toStrictEqual([]);
  });
});

describe("usageHintsFromEntity", () => {
  test("needs both lists", () => {
    expect(
      usageHintsFromEntity({ use_when: ["u"], do_not_use_when: [" n "] }),
    ).toStrictEqual({ use_when: ["u"], do_not_use_when: ["n"] });
    expect(usageHintsFromEntity({ use_when: ["u"], do_not_use_when: [] })).toBe(
      undefined,
    );
    expect(
      usageHintsFromEntity({ use_when: [""], do_not_use_when: ["n"] }),
    ).toBe(undefined);
  });
});

describe("schemaForCandidate", () => {
  test("drops keywords and absent optional fields, defaulting usage hints", () => {
    expect(schemaForCandidate(minimal)).toStrictEqual({
      id: "F",
      predicate_name: "zz_pred",
      title: "T",
      description: "D",
      argument_names: ["a"],
      argument_types: ["string"],
      examples: ["e"],
      tags: ["t"],
      usage_hints: DEFAULT_USAGE_HINTS,
    });
  });

  test("uses the catalog hints by name, then the schema's own", () => {
    const catalogued = {
      ...minimal,
      predicate_name: "dependency_resolution_policy",
    };
    const fallback = USAGE_HINTS_BY_PREDICATE.dependency_resolution_policy;
    expect(fallback).toBeDefined();
    expect(schemaForCandidate(catalogued).usage_hints).toBe(fallback);
    const own = { use_when: ["x"], do_not_use_when: ["y"] };
    expect(
      schemaForCandidate({ ...catalogued, usage_hints: own }).usage_hints,
    ).toBe(own);
  });

  test("copies every present optional field", () => {
    const full = {
      ...minimal,
      predicate_namespace: "ns",
      argument_descriptions: ["d"],
      argument_constants: { a: ["x"] },
      argument_aliases: { a: { y: "x" } },
      key_arguments: ["a"],
      aliases: ["al"],
      paraphrase_templates: ["pt"],
    } as unknown as PredicateSchemaCandidate;
    expect(schemaForCandidate(full)).toStrictEqual({
      id: "F",
      predicate_name: "zz_pred",
      predicate_namespace: "ns",
      title: "T",
      description: "D",
      argument_names: ["a"],
      argument_types: ["string"],
      argument_descriptions: ["d"],
      argument_constants: { a: ["x"] },
      argument_aliases: { a: { y: "x" } },
      key_arguments: ["a"],
      aliases: ["al"],
      paraphrase_templates: ["pt"],
      examples: ["e"],
      tags: ["t"],
      usage_hints: DEFAULT_USAGE_HINTS,
    });
  });
});

describe("predicateSchemaFromEntity", () => {
  test("needs a predicate_schema fact with a name", () => {
    expect(predicateSchemaFromEntity({ fact_kind: "rule" })).toStrictEqual([]);
    expect(
      predicateSchemaFromEntity({ fact_kind: "rule", predicate_name: "p" }),
    ).toStrictEqual([]);
    expect(
      predicateSchemaFromEntity({ fact_kind: "predicate_schema" }),
    ).toStrictEqual([]);
    expect(
      predicateSchemaFromEntity({
        fact_kind: "predicate_schema",
        predicate_name: "  ",
      }),
    ).toStrictEqual([]);
    expect(
      predicateSchemaFromEntity({
        fact_kind: "predicate_schema",
        predicate_name: 5,
      }),
    ).toStrictEqual([]);
  });

  test("fills defaults for a bare schema", () => {
    expect(
      predicateSchemaFromEntity({
        fact_kind: "predicate_schema",
        predicate_name: " p ",
        predicate_namespace: "default",
      }),
    ).toStrictEqual([
      {
        id: hashId("FACT-SCHEMA", ["p"]),
        predicate_name: "p",
        title: "p",
        description: "Project-local p predicate schema.",
        argument_names: [],
        argument_types: [],
        keywords: ["p"],
        aliases: [],
        paraphrase_templates: [],
        examples: [],
        tags: [],
      },
    ]);
    expect(
      predicateSchemaFromEntity({
        fact_kind: "predicate_schema",
        predicate_name: "p",
        predicate_namespace: 7,
      })[0]?.predicate_namespace,
    ).toBe(undefined);
  });

  test("reads every field of a full schema", () => {
    const constants = { a: ["x"] };
    const aliases = { a: { y: "x" } };
    const [schema] = predicateSchemaFromEntity({
      fact_kind: "predicate_schema",
      id: "FACT-P",
      predicate_name: "p",
      predicate_namespace: " domain ",
      title: "Title",
      description: "Desc",
      argument_names: ["a"],
      argument_types: ["atom"],
      argument_descriptions: ["the a"],
      argument_constants: constants,
      argument_aliases: aliases,
      key_arguments: ["a"],
      aliases: ["al"],
      tags: ["tg"],
      paraphrase_templates: ["pt"],
      examples: ["ex"],
      use_when: ["u"],
      do_not_use_when: ["n"],
    });
    expect(schema).toStrictEqual({
      id: "FACT-P",
      predicate_name: "p",
      predicate_namespace: "domain",
      title: "Title",
      description: "Desc",
      argument_names: ["a"],
      argument_types: ["atom"],
      argument_descriptions: ["the a"],
      argument_constants: { a: ["x"] },
      argument_aliases: { a: { y: "x" } },
      key_arguments: ["a"],
      keywords: ["p", "al", "tg"],
      aliases: ["al"],
      paraphrase_templates: ["pt"],
      examples: ["ex"],
      tags: ["tg"],
      usage_hints: { use_when: ["u"], do_not_use_when: ["n"] },
    } as unknown as PredicateSchemaCandidate);
    // The vocabulary is copied, not shared with the entity.
    expect(schema?.argument_constants?.a).not.toBe(constants.a);
    expect(schema?.argument_aliases?.a).not.toBe(aliases.a);
  });
});

describe("loadExistingPredicateSchemas", () => {
  test("skips the query when disabled or without Prolog", async () => {
    const { prolog, goals } = scriptedProlog([ok()]);
    expect(await loadExistingPredicateSchemas(prolog, false, [])).toStrictEqual(
      [],
    );
    const warnings: string[] = [];
    expect(
      await loadExistingPredicateSchemas(null, true, warnings),
    ).toStrictEqual([]);
    expect(warnings).toStrictEqual([]);
    expect(goals).toStrictEqual([]);
  });

  test("reads schema facts from the query results", async () => {
    const { prolog, goals } = scriptedProlog([
      ok({
        Results:
          "[['FACT-P','fact',[fact_kind=predicate_schema,predicate_name=p,title='P']],['FACT-R','fact',[fact_kind=rule]]]",
      }),
    ]);
    const warnings: string[] = [];
    const schemas = await loadExistingPredicateSchemas(prolog, true, warnings);
    expect(goals).toStrictEqual([QUERY]);
    expect(warnings).toStrictEqual([]);
    expect(schemas.map((schema) => [schema.id, schema.title])).toStrictEqual([
      ["FACT-P", "P"],
    ]);
  });

  test("reads no schemas without results", async () => {
    const { prolog } = scriptedProlog([ok()]);
    const warnings: string[] = [];
    expect(
      await loadExistingPredicateSchemas(prolog, true, warnings),
    ).toStrictEqual([]);
    expect(warnings).toStrictEqual([]);
  });

  test("turns a failed or throwing query into a warning", async () => {
    for (const [answer, message] of [
      [fail("boom"), "boom"],
      [fail(), "Query failed with unknown error"],
      [fail(""), "Query failed with unknown error"],
    ] as const) {
      const { prolog } = scriptedProlog([answer]);
      const warnings = ["earlier"];
      expect(
        await loadExistingPredicateSchemas(prolog, true, warnings),
      ).toStrictEqual([]);
      expect(warnings).toStrictEqual([
        "earlier",
        `Existing predicate_schema facts could not be loaded: ${message}`,
      ]);
    }
    const { prolog } = scriptedProlog([
      () => {
        throw "plain";
      },
    ]);
    const warnings: string[] = [];
    await loadExistingPredicateSchemas(prolog, true, warnings);
    expect(warnings).toStrictEqual([
      "Existing predicate_schema facts could not be loaded: plain",
    ]);
  });
});
