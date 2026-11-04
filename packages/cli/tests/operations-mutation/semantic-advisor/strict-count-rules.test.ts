import { describe, expect, test } from "bun:test";
import { strictSuggestion } from "../../../src/operations/semantic-advisor/shared.js";
import {
  detectCountStrictSuggestion,
  numberToken,
  whenParsedNumber,
} from "../../../src/operations/semantic-advisor/strict-count-rules.js";

const payload = { id: "REQ-a", properties: { title: "Count", text_ref: "x" } };

const claimOf = (statement: string) => {
  const suggestion = detectCountStrictSuggestion(payload, statement);
  return suggestion && "claim" in suggestion
    ? { evidence: suggestion.evidence, ...suggestion.claim }
    : suggestion;
};

describe("numberToken", () => {
  test.each([
    ["0", 0],
    ["42", 42],
    ["007", 7],
    ["zero", 0],
    ["one", 1],
    ["two", 2],
    ["three", 3],
    ["four", 4],
    ["five", 5],
    ["six", 6],
    ["seven", 7],
    ["eight", 8],
    ["nine", 9],
    ["ten", 10],
    ["TEN", 10],
    ["eleven", null],
    ["4a", null],
    ["a4", null],
    ["", null],
  ])("%p -> %p", (value, expected) => {
    expect(numberToken(value)).toBe(expected);
  });
});

describe("whenParsedNumber", () => {
  test("maps a number and passes null through", () => {
    expect(whenParsedNumber(3, (value) => value * 2)).toBe(6);
    expect(whenParsedNumber(0, (value) => `n${value}`)).toBe("n0");
    expect(whenParsedNumber(null, () => "never")).toBeNull();
  });
});

describe("detectCountStrictSuggestion", () => {
  test("builds the whole strict suggestion for a bounded count", () => {
    expect(
      detectCountStrictSuggestion(
        payload,
        "Each user has at most 3 active sessions.",
      ),
    ).toStrictEqual(
      strictSuggestion(
        payload,
        "at most 3",
        {
          subject_key: "user.session",
          property_key: "active_count",
          operator: "lte",
          value_type: "int",
          value_int: 3,
        },
        "Bounded cardinality is a strict numeric property and should be modeled explicitly.",
        0.9,
      ),
    );
  });

  test("builds the whole strict suggestion for a cap", () => {
    expect(
      detectCountStrictSuggestion(payload, "Retries cap at 3"),
    ).toStrictEqual(
      strictSuggestion(
        payload,
        "cap at 3",
        {
          subject_key: "retry",
          property_key: "count",
          operator: "lte",
          value_type: "int",
          value_int: 3,
        },
        "Cap-at prose is an upper-bound strict property and should be modeled explicitly.",
        0.9,
      ),
    );
  });

  test.each([
    [
      "A user may hold at least two sessions",
      {
        evidence: "at least two",
        subject_key: "user.session",
        property_key: "count",
        operator: "gte",
        value_type: "int",
        value_int: 2,
      },
    ],
    [
      "Teams have AT  LEAST 5 seats.",
      {
        evidence: "AT  LEAST 5",
        subject_key: "seats",
        property_key: "count",
        operator: "gte",
        value_type: "int",
        value_int: 5,
      },
    ],
    [
      "Orders have exactly ten line_items",
      {
        evidence: "exactly ten",
        subject_key: "line.items",
        property_key: "count",
        operator: "eq",
        value_type: "int",
        value_int: 10,
      },
    ],
    [
      "Orders have EXACTLY 1 owner",
      {
        evidence: "EXACTLY 1",
        subject_key: "owner",
        property_key: "count",
        operator: "eq",
        value_type: "int",
        value_int: 1,
      },
    ],
    [
      "Uploads allow no more than 4 files",
      {
        evidence: "no more than 4",
        subject_key: "files",
        property_key: "count",
        operator: "lte",
        value_type: "int",
        value_int: 4,
      },
    ],
    [
      "Uploads allow up to 4 user-files.",
      {
        evidence: "up to 4",
        subject_key: "user.files",
        property_key: "count",
        operator: "lte",
        value_type: "int",
        value_int: 4,
      },
    ],
    [
      "The API has at least 30 routes under /api/orgs",
      {
        evidence: "at least 30",
        subject_key: "route.api.org",
        property_key: "count",
        operator: "gte",
        value_type: "int",
        value_int: 30,
      },
    ],
    [
      "The API has at most 2 routes in `/admin`.",
      {
        evidence: "at most 2",
        subject_key: "route.admin",
        property_key: "count",
        operator: "lte",
        value_type: "int",
        value_int: 2,
      },
    ],
    [
      "The API has at most 2 routes below /x/y",
      {
        evidence: "at most 2",
        subject_key: "route.x.y",
        property_key: "count",
        operator: "lte",
        value_type: "int",
        value_int: 2,
      },
    ],
    [
      "A browser keeps at most 2 user sessions",
      {
        evidence: "at most 2",
        subject_key: "user.session",
        property_key: "count",
        operator: "lte",
        value_type: "int",
        value_int: 2,
      },
    ],
    [
      "The API has at most 2 routes under api",
      {
        evidence: "at most 2",
        subject_key: "routes.under.api",
        property_key: "count",
        operator: "lte",
        value_type: "int",
        value_int: 2,
      },
    ],
    [
      "Retries cap at 3",
      {
        evidence: "cap at 3",
        subject_key: "retry",
        property_key: "count",
        operator: "lte",
        value_type: "int",
        value_int: 3,
      },
    ],
    [
      "Upload size caps at five.",
      {
        evidence: "cap at five",
        subject_key: "upload.size",
        property_key: "count",
        operator: "lte",
        value_type: "int",
        value_int: 5,
      },
    ],
    [
      "The queue capped at retry depth 9",
      {
        evidence: "cap at 9",
        subject_key: "the.queue",
        property_key: "retry_depth_cap",
        operator: "lte",
        value_type: "int",
        value_int: 9,
      },
    ],
    [
      "The queue CAPPED  AT  9",
      {
        evidence: "cap at 9",
        subject_key: "the.queue",
        property_key: "count",
        operator: "lte",
        value_type: "int",
        value_int: 9,
      },
    ],
  ])("%p", (statement, expected) => {
    expect(claimOf(statement) as unknown).toStrictEqual(expected);
  });

  test.each([
    "Plain prose",
    "at most eleven sessions",
    "at most 3 sessions please now!",
    "at most3 sessions",
    "at most 3sessions",
    "almost at most 3 9sessions",
    "Retries capat 3",
    "Retries cap at eleven",
    "Retries cap at 3 now",
    " cap at 3",
    "Retries cap at 3x",
  ])("%p is not a count", (statement) => {
    expect(detectCountStrictSuggestion(payload, statement)).toBeNull();
  });
});
