import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PREDICATE_CATALOG_1 } from "../../../src/operations/modeling/predicate-catalog-1.js";
import { PREDICATE_CATALOG_2 } from "../../../src/operations/modeling/predicate-catalog-2.js";
import { PREDICATE_CATALOG_3 } from "../../../src/operations/modeling/predicate-catalog-3.js";
import { PREDICATE_CATALOG_4 } from "../../../src/operations/modeling/predicate-catalog-4.js";
import { PREDICATE_CATALOG_5 } from "../../../src/operations/modeling/predicate-catalog-5.js";
import { PREDICATE_CATALOG_6 } from "../../../src/operations/modeling/predicate-catalog-6.js";
import {
  BUILT_IN_PREDICATE_SCHEMAS,
  DEFAULT_USAGE_HINTS,
  USAGE_HINTS_BY_PREDICATE,
} from "../../../src/operations/modeling/predicate-catalog.js";
import * as vocabularies from "../../../src/operations/modeling/predicate-closed-vocabularies.js";
import { PREDICATE_USAGE_HINTS_1 } from "../../../src/operations/modeling/predicate-usage-hints-1.js";
import { PREDICATE_USAGE_HINTS_2 } from "../../../src/operations/modeling/predicate-usage-hints-2.js";
import { PREDICATE_USAGE_HINTS_3 } from "../../../src/operations/modeling/predicate-usage-hints-3.js";
import { PREDICATE_USAGE_HINTS_4 } from "../../../src/operations/modeling/predicate-usage-hints-4.js";

/**
 * The reviewed built-in predicate data, pinned verbatim. A deliberate catalog
 * change regenerates this golden file in the same commit.
 */
const golden = JSON.parse(
  readFileSync(
    path.join(import.meta.dir, "fixtures/predicate-data.golden.json"),
    "utf8",
  ),
) as Record<string, unknown>;

describe("built-in predicate data", () => {
  test("catalog parts match the reviewed golden data", () => {
    expect(PREDICATE_CATALOG_1).toStrictEqual(
      golden.PREDICATE_CATALOG_1 as never,
    );
    expect(PREDICATE_CATALOG_2).toStrictEqual(
      golden.PREDICATE_CATALOG_2 as never,
    );
    expect(PREDICATE_CATALOG_3).toStrictEqual(
      golden.PREDICATE_CATALOG_3 as never,
    );
    expect(PREDICATE_CATALOG_4).toStrictEqual(
      golden.PREDICATE_CATALOG_4 as never,
    );
    expect(PREDICATE_CATALOG_5).toStrictEqual(
      golden.PREDICATE_CATALOG_5 as never,
    );
    expect(PREDICATE_CATALOG_6).toStrictEqual(
      golden.PREDICATE_CATALOG_6 as never,
    );
  });

  test("usage hint parts match the reviewed golden data", () => {
    expect(PREDICATE_USAGE_HINTS_1).toStrictEqual(
      golden.PREDICATE_USAGE_HINTS_1 as never,
    );
    expect(PREDICATE_USAGE_HINTS_2).toStrictEqual(
      golden.PREDICATE_USAGE_HINTS_2 as never,
    );
    expect(PREDICATE_USAGE_HINTS_3).toStrictEqual(
      golden.PREDICATE_USAGE_HINTS_3 as never,
    );
    expect(PREDICATE_USAGE_HINTS_4).toStrictEqual(
      golden.PREDICATE_USAGE_HINTS_4 as never,
    );
  });

  test("closed vocabularies match the reviewed golden data", () => {
    const names = Object.keys(vocabularies)
      .filter((name) => name.endsWith("_VOCABULARY"))
      .sort();
    expect(names).toStrictEqual(
      Object.keys(golden)
        .filter((name) => name.endsWith("_VOCABULARY"))
        .sort(),
    );
    for (const name of names) {
      expect((vocabularies as Record<string, unknown>)[name]).toStrictEqual(
        golden[name] as never,
      );
    }
  });

  test("the catalog concatenates every part in order", () => {
    expect(BUILT_IN_PREDICATE_SCHEMAS).toStrictEqual([
      ...PREDICATE_CATALOG_1,
      ...PREDICATE_CATALOG_2,
      ...PREDICATE_CATALOG_3,
      ...PREDICATE_CATALOG_4,
      ...PREDICATE_CATALOG_5,
      ...PREDICATE_CATALOG_6,
    ]);
    expect(USAGE_HINTS_BY_PREDICATE).toStrictEqual({
      ...PREDICATE_USAGE_HINTS_1,
      ...PREDICATE_USAGE_HINTS_2,
      ...PREDICATE_USAGE_HINTS_3,
      ...PREDICATE_USAGE_HINTS_4,
    });
    expect(DEFAULT_USAGE_HINTS).toStrictEqual(
      golden.DEFAULT_USAGE_HINTS as never,
    );
  });
});

describe("closedArguments", () => {
  test("copies constants and only non-empty alias maps", () => {
    const result = vocabularies.closedArguments({
      action: vocabularies.CODING_STANDARD_ACTION_VOCABULARY,
      unit: vocabularies.RETENTION_UNIT_VOCABULARY,
    });
    expect(result).toStrictEqual({
      argument_constants: {
        action: ["use", "avoid"],
        unit: ["days", "months", "years"],
      },
      argument_aliases: {
        unit: { day: "days", month: "months", year: "years" },
      },
    });
    expect(result.argument_constants.unit).not.toBe(
      vocabularies.RETENTION_UNIT_VOCABULARY.constants,
    );
    expect(result.argument_aliases?.unit).not.toBe(
      vocabularies.RETENTION_UNIT_VOCABULARY.aliases,
    );
  });

  test("omits argument_aliases when no vocabulary has aliases", () => {
    expect(
      vocabularies.closedArguments({
        action: vocabularies.CODING_STANDARD_ACTION_VOCABULARY,
      }),
    ).toStrictEqual({ argument_constants: { action: ["use", "avoid"] } });
    expect(vocabularies.closedArguments({})).toStrictEqual({
      argument_constants: {},
    });
  });
});
