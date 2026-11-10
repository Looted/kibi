import { describe, expect, test } from "bun:test";
import { evaluateProseCoverageCorpus } from "../../../src/operations/semantic-advisor/prose-coverage-evaluator.js";

const strictText = "Sessions expire after 30 minutes.";
const predicateText = "Login must stay disabled until MFA completes.";

describe("evaluateProseCoverageCorpus", () => {
  test("an empty corpus is fully covered", () => {
    expect(evaluateProseCoverageCorpus([])).toStrictEqual({
      coverage: 1,
      summary: { total: 0, passed: 0, failed: 0 },
      failures: [],
    });
  });

  test("passes cases whose first suggestion matches every given expectation", () => {
    expect(
      evaluateProseCoverageCorpus([
        { id: "a", text: strictText, expected: { kind: "strict_property" } },
        {
          id: "b",
          text: strictText,
          expected: {
            kind: "strict_property",
            property_key: "expiry_minutes",
            operator: "eq",
          },
        },
        { id: "c", text: predicateText, expected: { kind: "predicate" } },
        {
          id: "c2",
          text: strictText,
          expected: { kind: "strict_property", predicate_name: "guard" },
        },
        {
          id: "d",
          text: predicateText,
          expected: { kind: "predicate", predicate_name: "guard" },
        },
        {
          id: "e",
          text: predicateText,
          expected: { kind: "predicate", property_key: "x", operator: "y" },
        },
      ]),
    ).toStrictEqual({
      coverage: 1,
      summary: { total: 6, passed: 6, failed: 0 },
      failures: [],
    });
  });

  test("reports each kind of mismatch", () => {
    const failures = [
      {
        id: "none",
        text: "Nice prose here",
        expected: { kind: "predicate" as const },
      },
      {
        id: "kind",
        text: strictText,
        expected: { kind: "predicate" as const },
      },
      {
        id: "name",
        text: predicateText,
        expected: { kind: "predicate" as const, predicate_name: "owns" },
      },
      {
        id: "key",
        text: strictText,
        expected: { kind: "strict_property" as const, property_key: "ttl" },
      },
      {
        id: "op",
        text: strictText,
        expected: {
          kind: "strict_property" as const,
          property_key: "expiry_minutes",
          operator: "lte",
        },
      },
    ];
    expect(
      evaluateProseCoverageCorpus([
        ...failures,
        {
          id: "ok",
          source: "docs/x.md",
          text: strictText,
          expected: { kind: "strict_property" },
        },
      ]),
    ).toStrictEqual({
      coverage: 1 / 6,
      summary: { total: 6, passed: 1, failed: 5 },
      failures: [
        {
          id: "none",
          text: "Nice prose here",
          reason: "No semantic advisor suggestion was produced",
        },
        {
          id: "kind",
          text: strictText,
          reason: "Expected predicate but received strict_property",
        },
        {
          id: "name",
          text: predicateText,
          reason: "Expected predicate owns but received guard",
        },
        {
          id: "key",
          text: strictText,
          reason: "Expected property ttl but received expiry_minutes",
        },
        {
          id: "op",
          text: strictText,
          reason: "Expected operator lte but received eq",
        },
      ],
    });
  });

  test("analyzes each case as an open requirement with its own id", () => {
    const result = evaluateProseCoverageCorpus([
      {
        id: "x",
        text: "Users must not delete invoices.",
        expected: { kind: "predicate", predicate_name: "permission_rule" },
      },
    ]);
    expect(result.summary).toStrictEqual({ total: 1, passed: 1, failed: 0 });
  });
});
