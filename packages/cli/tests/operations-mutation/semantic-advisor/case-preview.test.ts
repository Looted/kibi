import { describe, expect, test } from "bun:test";
import {
  CASE_LIMIT,
  previewCases,
} from "../../../src/operations/semantic-advisor/case-preview.js";
import type { SemanticStrictPropertyClaim } from "../../../src/operations/semantic-advisor/types.js";

type Claim = SemanticStrictPropertyClaim;

const claim = (fields: Partial<Claim>): Claim => ({
  subject_key: "cart",
  property_key: "items",
  operator: "eq",
  value_type: "int",
  ...fields,
});

const numeric = (
  valueType: "int" | "number",
  operator: Claim["operator"],
  value: number,
): Claim =>
  claim(
    valueType === "int"
      ? { operator, value_type: "int", value_int: value }
      : { operator, value_type: "number", value_number: value },
  );

const summary = (subject: Claim): string[] =>
  previewCases(subject).cases.map(
    (c) => `${c.generator} ${c.constraint} ${c.predicted}`,
  );

// Each row: value type, operator, bound, and the cases it yields in order.
const NUMERIC: ReadonlyArray<
  readonly ["int" | "number", Claim["operator"], number, string[]]
> = [
  ["int", "eq", -1, ["boundary eq -1 success", "boundary gt -1 rejection"]],
  ["int", "eq", 0, ["boundary eq 0 success", "boundary gt 0 rejection"]],
  [
    "int",
    "eq",
    1,
    [
      "boundary eq 1 success",
      "boundary gt 1 rejection",
      "boundary lt 1 rejection",
    ],
  ],
  [
    "int",
    "eq",
    2,
    [
      "boundary eq 2 success",
      "boundary gt 2 rejection",
      "boundary lt 2 rejection",
    ],
  ],
  [
    "int",
    "eq",
    8,
    [
      "boundary eq 8 success",
      "boundary gt 8 rejection",
      "boundary lt 8 rejection",
    ],
  ],
  ["int", "neq", -1, ["boundary eq -1 rejection", "boundary gt -1 success"]],
  ["int", "neq", 0, ["boundary eq 0 rejection", "boundary gt 0 success"]],
  [
    "int",
    "neq",
    1,
    [
      "boundary eq 1 rejection",
      "boundary gt 1 success",
      "boundary lt 1 success",
    ],
  ],
  [
    "int",
    "neq",
    2,
    [
      "boundary eq 2 rejection",
      "boundary gt 2 success",
      "boundary lt 2 success",
    ],
  ],
  [
    "int",
    "neq",
    8,
    [
      "boundary eq 8 rejection",
      "boundary gt 8 success",
      "boundary lt 8 success",
    ],
  ],
  ["int", "lt", -1, ["boundary eq -2 success", "boundary gte -1 rejection"]],
  ["int", "lt", 0, ["boundary eq -1 success", "boundary gte 0 rejection"]],
  ["int", "lt", 1, ["boundary eq 0 success", "boundary gte 1 rejection"]],
  [
    "int",
    "lt",
    2,
    [
      "boundary eq 1 success",
      "boundary gte 2 rejection",
      "cardinality eq 0 success",
    ],
  ],
  [
    "int",
    "lt",
    8,
    [
      "boundary eq 7 success",
      "boundary gte 8 rejection",
      "cardinality eq 0 success",
      "cardinality eq 1 success",
    ],
  ],
  ["int", "lte", -1, ["boundary eq -1 success", "boundary gt -1 rejection"]],
  ["int", "lte", 0, ["boundary eq 0 success", "boundary gt 0 rejection"]],
  [
    "int",
    "lte",
    1,
    [
      "boundary eq 1 success",
      "boundary gt 1 rejection",
      "cardinality eq 0 success",
    ],
  ],
  [
    "int",
    "lte",
    2,
    [
      "boundary eq 2 success",
      "boundary gt 2 rejection",
      "cardinality eq 0 success",
      "cardinality eq 1 success",
    ],
  ],
  [
    "int",
    "lte",
    8,
    [
      "boundary eq 8 success",
      "boundary gt 8 rejection",
      "cardinality eq 0 success",
      "cardinality eq 1 success",
    ],
  ],
  ["int", "gt", -1, ["boundary eq 0 success"]],
  ["int", "gt", 0, ["boundary eq 1 success", "boundary lte 0 rejection"]],
  [
    "int",
    "gt",
    1,
    [
      "boundary eq 2 success",
      "boundary lte 1 rejection",
      "cardinality gte 2 success",
    ],
  ],
  ["int", "gt", 2, ["boundary eq 3 success", "boundary lte 2 rejection"]],
  ["int", "gt", 8, ["boundary eq 9 success", "boundary lte 8 rejection"]],
  ["int", "gte", -1, ["boundary eq -1 success"]],
  ["int", "gte", 0, ["boundary eq 0 success"]],
  [
    "int",
    "gte",
    1,
    [
      "boundary eq 1 success",
      "boundary lt 1 rejection",
      "cardinality gte 2 success",
    ],
  ],
  [
    "int",
    "gte",
    2,
    [
      "boundary eq 2 success",
      "boundary lt 2 rejection",
      "cardinality gte 2 success",
    ],
  ],
  ["int", "gte", 8, ["boundary eq 8 success", "boundary lt 8 rejection"]],
  [
    "number",
    "eq",
    -1,
    [
      "boundary eq -1 success",
      "boundary gt -1 rejection",
      "boundary lt -1 rejection",
    ],
  ],
  [
    "number",
    "eq",
    0,
    [
      "boundary eq 0 success",
      "boundary gt 0 rejection",
      "boundary lt 0 rejection",
    ],
  ],
  [
    "number",
    "eq",
    1,
    [
      "boundary eq 1 success",
      "boundary gt 1 rejection",
      "boundary lt 1 rejection",
    ],
  ],
  [
    "number",
    "eq",
    2,
    [
      "boundary eq 2 success",
      "boundary gt 2 rejection",
      "boundary lt 2 rejection",
    ],
  ],
  [
    "number",
    "eq",
    2.5,
    [
      "boundary eq 2.5 success",
      "boundary gt 2.5 rejection",
      "boundary lt 2.5 rejection",
    ],
  ],
  [
    "number",
    "eq",
    8,
    [
      "boundary eq 8 success",
      "boundary gt 8 rejection",
      "boundary lt 8 rejection",
    ],
  ],
  [
    "number",
    "neq",
    -1,
    [
      "boundary eq -1 rejection",
      "boundary gt -1 success",
      "boundary lt -1 success",
    ],
  ],
  [
    "number",
    "neq",
    0,
    [
      "boundary eq 0 rejection",
      "boundary gt 0 success",
      "boundary lt 0 success",
    ],
  ],
  [
    "number",
    "neq",
    1,
    [
      "boundary eq 1 rejection",
      "boundary gt 1 success",
      "boundary lt 1 success",
    ],
  ],
  [
    "number",
    "neq",
    2,
    [
      "boundary eq 2 rejection",
      "boundary gt 2 success",
      "boundary lt 2 success",
    ],
  ],
  [
    "number",
    "neq",
    2.5,
    [
      "boundary eq 2.5 rejection",
      "boundary gt 2.5 success",
      "boundary lt 2.5 success",
    ],
  ],
  [
    "number",
    "neq",
    8,
    [
      "boundary eq 8 rejection",
      "boundary gt 8 success",
      "boundary lt 8 success",
    ],
  ],
  ["number", "lt", -1, ["boundary gte -1 rejection"]],
  ["number", "lt", 0, ["boundary gte 0 rejection"]],
  ["number", "lt", 1, ["boundary gte 1 rejection"]],
  ["number", "lt", 2, ["boundary gte 2 rejection"]],
  ["number", "lt", 2.5, ["boundary gte 2.5 rejection"]],
  ["number", "lt", 8, ["boundary gte 8 rejection"]],
  ["number", "lte", -1, ["boundary eq -1 success", "boundary gt -1 rejection"]],
  ["number", "lte", 0, ["boundary eq 0 success", "boundary gt 0 rejection"]],
  ["number", "lte", 1, ["boundary eq 1 success", "boundary gt 1 rejection"]],
  ["number", "lte", 2, ["boundary eq 2 success", "boundary gt 2 rejection"]],
  [
    "number",
    "lte",
    2.5,
    ["boundary eq 2.5 success", "boundary gt 2.5 rejection"],
  ],
  ["number", "lte", 8, ["boundary eq 8 success", "boundary gt 8 rejection"]],
  ["number", "gt", -1, ["boundary lte -1 rejection"]],
  ["number", "gt", 0, ["boundary lte 0 rejection"]],
  ["number", "gt", 1, ["boundary lte 1 rejection"]],
  ["number", "gt", 2, ["boundary lte 2 rejection"]],
  ["number", "gt", 2.5, ["boundary lte 2.5 rejection"]],
  ["number", "gt", 8, ["boundary lte 8 rejection"]],
  ["number", "gte", -1, ["boundary eq -1 success", "boundary lt -1 rejection"]],
  ["number", "gte", 0, ["boundary eq 0 success", "boundary lt 0 rejection"]],
  ["number", "gte", 1, ["boundary eq 1 success", "boundary lt 1 rejection"]],
  ["number", "gte", 2, ["boundary eq 2 success", "boundary lt 2 rejection"]],
  [
    "number",
    "gte",
    2.5,
    ["boundary eq 2.5 success", "boundary lt 2.5 rejection"],
  ],
  ["number", "gte", 8, ["boundary eq 8 success", "boundary lt 8 rejection"]],
];

describe("previewCases on numeric claims", () => {
  for (const [valueType, operator, value, expected] of NUMERIC)
    test(`${valueType} ${operator} ${value}`, () => {
      expect(summary(numeric(valueType, operator, value))).toStrictEqual(
        expected,
      );
    });

  test("each case carries the assumes fact a scenario states", () => {
    expect(previewCases(numeric("int", "lte", 2))).toStrictEqual({
      cases: (
        [
          ["boundary", "eq", 2, "success"],
          ["boundary", "gt", 2, "rejection"],
          ["cardinality", "eq", 0, "success"],
          ["cardinality", "eq", 1, "success"],
        ] as const
      ).map(([generator, op, value, predicted]) => ({
        generator,
        constraint: `${op} ${value}`,
        predicted,
        assumption: {
          fact_kind: "property_value",
          subject_key: "cart",
          property_key: "items",
          operator: op,
          value_type: "int",
          value,
        },
      })),
      limitReached: false,
    });
    expect(previewCases(numeric("number", "gt", 0.5)).cases).toStrictEqual([
      {
        generator: "boundary",
        constraint: "lte 0.5",
        predicted: "rejection",
        assumption: {
          fact_kind: "property_value",
          subject_key: "cart",
          property_key: "items",
          operator: "lte",
          value_type: "number",
          value: 0.5,
        },
      },
    ]);
  });

  test("a bound read from the other value field yields no cases", () => {
    expect(
      previewCases(claim({ value_type: "int", value_number: 3 })),
    ).toStrictEqual({ cases: [], limitReached: false });
    expect(
      previewCases(claim({ value_type: "number", value_int: 3 })),
    ).toStrictEqual({ cases: [], limitReached: false });
  });

  test("a non-finite bound yields no cases", () => {
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])
      expect(summary(numeric("number", "lte", value))).toStrictEqual([]);
  });

  test("operators without a numeric reading yield no cases", () => {
    for (const operator of ["matches", "includes", "subset_of"] as const)
      expect(summary(numeric("int", operator, 3))).toStrictEqual([]);
  });

  test("string and bool claims yield no cases", () => {
    expect(
      summary(claim({ value_type: "string", value_string: "3" })),
    ).toStrictEqual([]);
    expect(
      summary(claim({ value_type: "bool", value_bool: true })),
    ).toStrictEqual([]);
    expect(
      summary(
        claim({ operator: "lte", value_type: "string", value_number: 3 }),
      ),
    ).toStrictEqual([]);
  });
});

const setClaim = (
  operator: Claim["operator"],
  members: readonly string[] | undefined,
): Claim =>
  claim({
    operator,
    value_type: "set",
    ...(members === undefined ? {} : { value_set: members }),
  });

const setAssumption = (value: string[]) => ({
  fact_kind: "property_value",
  subject_key: "cart",
  property_key: "items",
  operator: "includes",
  value_type: "set",
  value,
});

describe("previewCases on set claims", () => {
  test("eq names each member and rejects a value outside", () => {
    expect(previewCases(setClaim("eq", ["a", "b"]))).toStrictEqual({
      cases: [
        {
          generator: "member",
          constraint: "includes a",
          predicted: "success",
          assumption: setAssumption(["a"]),
        },
        {
          generator: "member",
          constraint: "includes b",
          predicted: "success",
          assumption: setAssumption(["b"]),
        },
        {
          generator: "non_member",
          constraint: "includes a value outside [a, b]",
          predicted: "rejection",
          assumption: setAssumption(["<a value outside the set>"]),
        },
      ],
      limitReached: false,
    });
  });

  test("subset_of rejects and includes leaves a value outside unspecified", () => {
    expect(summary(setClaim("subset_of", ["a"]))).toStrictEqual([
      "member includes a success",
      "non_member includes a value outside [a] rejection",
    ]);
    expect(summary(setClaim("includes", ["a"]))).toStrictEqual([
      "member includes a success",
      "non_member includes a value outside [a] unspecified",
    ]);
  });

  test("excludes rejects each member", () => {
    expect(previewCases(setClaim("excludes", ["a", "b"])).cases).toStrictEqual([
      {
        generator: "excluded_member",
        constraint: "includes a",
        predicted: "rejection",
        assumption: setAssumption(["a"]),
      },
      {
        generator: "excluded_member",
        constraint: "includes b",
        predicted: "rejection",
        assumption: setAssumption(["b"]),
      },
    ]);
  });

  test("other operators on a set yield no cases", () => {
    for (const operator of ["neq", "lt", "matches"] as const)
      expect(summary(setClaim(operator, ["a"]))).toStrictEqual([]);
  });

  test("an empty set still has the value outside it", () => {
    expect(summary(setClaim("eq", []))).toStrictEqual([
      "non_member includes a value outside [] rejection",
    ]);
  });

  test("a set claim without a list of members has no cases", () => {
    for (const operator of ["eq", "includes", "excludes"] as const)
      expect(previewCases(setClaim(operator, undefined))).toStrictEqual({
        cases: [],
        limitReached: false,
      });
  });
});

describe("CASE_LIMIT", () => {
  const members = (count: number) =>
    Array.from({ length: count }, (_, i) => `m${i}`);

  test("is twelve, as in cases.pl", () => {
    expect(CASE_LIMIT).toBe(12);
  });

  test("a claim with exactly the limit is not cut", () => {
    const preview = previewCases(setClaim("eq", members(11)));
    expect(preview.cases).toHaveLength(12);
    expect(preview.limitReached).toBe(false);
  });

  test("a claim past the limit keeps the first twelve cases", () => {
    const preview = previewCases(setClaim("eq", members(12)));
    expect(preview.limitReached).toBe(true);
    expect(preview.cases.map((c) => c.constraint)).toStrictEqual(
      members(12).map((m) => `includes ${m}`),
    );
  });
});
