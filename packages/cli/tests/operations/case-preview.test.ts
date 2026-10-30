import { describe, expect, test } from "bun:test";

import { previewCases } from "../../src/operations/semantic-advisor/case-preview.js";
import type { SemanticStrictPropertyClaim } from "../../src/operations/semantic-advisor/types.js";

function claim(
  fields: Partial<SemanticStrictPropertyClaim>,
): SemanticStrictPropertyClaim {
  return {
    subject_key: "upload.batch",
    property_key: "files_per_batch",
    operator: "lte",
    value_type: "int",
    ...fields,
  };
}

function rows(preview: ReturnType<typeof previewCases>) {
  return preview.cases.map((item) => `${item.constraint}:${item.predicted}`);
}

// implements REQ-kibi-case-coverage
// The same cases packages/core/tests/kb.plt expects from cases.pl.
describe("edge-case preview of a typed claim", () => {
  test("an upper bound yields its boundary, the value past it and zero/one", () => {
    expect(rows(previewCases(claim({ value_int: 5 })))).toEqual([
      "eq 5:success",
      "gt 5:rejection",
      "eq 0:success",
      "eq 1:success",
    ]);
  });

  test("a strict integer bound uses the value inside it", () => {
    expect(rows(previewCases(claim({ operator: "lt", value_int: 8 })))).toEqual([
      "eq 7:success",
      "gte 8:rejection",
      "eq 0:success",
      "eq 1:success",
    ]);
  });

  test("a zero count yields only its boundary rows", () => {
    expect(rows(previewCases(claim({ operator: "eq", value_int: 0 })))).toEqual([
      "eq 0:success",
      "gt 0:rejection",
    ]);
  });

  test("a lower bound drops the class that straddles it and the classes inside the refused side", () => {
    // gte 2 straddles 3; eq 0 and eq 1 sit inside lt 3, already refused.
    expect(rows(previewCases(claim({ operator: "gte", value_int: 3 })))).toEqual([
      "eq 3:success",
      "lt 3:rejection",
    ]);
  });

  test("set members succeed and a value outside an equal set is refused", () => {
    const preview = previewCases(
      claim({ operator: "eq", value_type: "set", value_set: ["a", "b"] }),
    );
    expect(rows(preview)).toEqual([
      "includes a:success",
      "includes b:success",
      "includes a value outside [a, b]:rejection",
    ]);
    expect(preview.cases[2]?.assumption).toEqual({
      fact_kind: "property_value",
      subject_key: "upload.batch",
      property_key: "files_per_batch",
      operator: "includes",
      value_type: "set",
      value: ["<a value outside the set>"],
    });
  });

  test("a boolean or string claim has no cases", () => {
    expect(previewCases(claim({ value_type: "bool", operator: "eq", value_bool: true })).cases).toEqual([]);
    expect(previewCases(claim({ value_type: "string", operator: "eq", value_string: "x" })).cases).toEqual([]);
  });
});
