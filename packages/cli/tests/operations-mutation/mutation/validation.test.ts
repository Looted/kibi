import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { KbRejection } from "../../../src/cli-errors.js";
import type { UpsertInput } from "../../../src/operations/mutation/types.js";
import {
  isAllowedGranularityReason,
  isUpsertEntityProperty,
  validateUpsertInput,
} from "../../../src/operations/mutation/validation.js";

const NOW = new Date("2026-03-04T05:06:07.000Z");

function outcome(input: UpsertInput): unknown {
  try {
    return validateUpsertInput(structuredClone(input), NOW);
  } catch (error) {
    if (!(error instanceof KbRejection)) throw error;
    return { code: error.code, message: error.message, issues: error.issues };
  }
}

// Golden upsert validations: every accepted entity and every rejection
// (code, message and telemetry issues) for inputs chosen so each schema
// error formatter, alias hint and guard decides at least one of them.
const { cases } = JSON.parse(
  readFileSync(
    path.join(import.meta.dir, "fixtures", "validation.golden.json"),
    "utf8",
  ),
) as { cases: { input: UpsertInput; expected: string }[] };

describe("validateUpsertInput golden cases", () => {
  for (const [index, { input, expected }] of cases.entries()) {
    test(`case ${index}: ${input.type} ${input.id} ${JSON.stringify(input.properties).slice(0, 80)}`, () => {
      expect(JSON.parse(JSON.stringify(outcome(input)))).toStrictEqual(
        JSON.parse(expected),
      );
    });
  }
});

describe("upsert schema helpers", () => {
  test("knows the added and the schema's own properties", () => {
    expect(isUpsertEntityProperty("granularity_reason")).toBe(true);
    expect(isUpsertEntityProperty("symbol_role")).toBe(true);
    expect(isUpsertEntityProperty("title")).toBe(true);
    expect(isUpsertEntityProperty("value")).toBe(false);
    expect(isUpsertEntityProperty("toString")).toBe(false);
  });

  test("re-exports the granularity reason check", () => {
    expect(isAllowedGranularityReason("test-suite")).toBe(true);
  });

  test("keeps the validators between calls", () => {
    const input = {
      type: "req",
      id: "R-1",
      properties: { title: "R", status: "open" },
    } as UpsertInput;
    expect(outcome(input)).toStrictEqual(outcome(input));
  });
});
