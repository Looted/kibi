import { describe, expect, test } from "bun:test";
import { analyzeSemanticAdvisorInput } from "../../../src/operations/semantic-advisor/analyze-prose.js";
import { previewCases } from "../../../src/operations/semantic-advisor/case-preview.js";
import { assertLogicalGroundingClaimKeys } from "../../../src/operations/semantic-advisor/ingestion-boundary.js";
import { normalizePredicateToken } from "../../../src/operations/semantic-advisor/shared.js";
import { detectCountStrictSuggestion } from "../../../src/operations/semantic-advisor/strict-count-rules.js";
import type { PrologPort } from "../../../src/public/operations/runtime-types.js";

const payload = (
  properties: Record<string, unknown> = {},
  relationships: unknown[] = [],
) => ({
  type: "req",
  id: "REQ-1",
  properties: { title: "REQ-1", status: "open", ...properties },
  relationships,
});

describe("case previews", () => {
  test("strict bounds on real numbers stay open", () => {
    const claim = (operator: string) =>
      ({
        subject_key: "api",
        property_key: "latency",
        operator,
        value_type: "number",
        value_number: 2.5,
      }) as Parameters<typeof previewCases>[0];
    const lt = previewCases(claim("lt"));
    const gt = previewCases(claim("gt"));
    expect(lt.cases.length).toBeGreaterThan(0);
    expect(gt.cases.length).toBeGreaterThan(0);
    expect(lt.limitReached).toBe(false);
  });
});

describe("shared helpers", () => {
  test("normalizePredicateToken drops articles, quotes and punctuation", () => {
    expect(normalizePredicateToken("  The user's  login-rate! ")).toBe(
      "users_login-rate",
    );
  });
});

describe("count rules", () => {
  test("a cap with a property becomes a capped count", () => {
    const suggestion = detectCountStrictSuggestion(
      payload() as never,
      "Uploads cap at retry attempts 5.",
    );
    expect(JSON.stringify(suggestion)).toContain(
      '"property_key":"retry_attempts_cap"',
    );
  });
});

describe("analyzeSemanticAdvisorInput", () => {
  test("a clause the prose does not contain keeps its own text over an empty span", () => {
    const result = analyzeSemanticAdvisorInput({
      // Stored clauses, unlike caller-supplied ones, are not checked verbatim.
      payload: payload({
        semantic_text: "The editor must autosave drafts.",
        semantic_clauses: [
          "The editor must autosave drafts.",
          "The editor must lint.",
        ],
      }) as never,
    });
    expect(
      result.receipt.propositions.map((row) => row.span.start === row.span.end),
    ).toContain(true);
  });

  test("counts grounding slots", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: payload({ semantic_text: "The editor must autosave drafts." }, [
        { type: "requires_property", from: "REQ-1", to: "FACT-1" },
        "junk",
      ]) as never,
    });
    expect(result.receipt.propositions.length).toBe(1);
  });
});

describe("assertLogicalGroundingClaimKeys", () => {
  test("reads a planned grounding fact's claim_key from the plan", async () => {
    const prolog = {
      query: async () => ({ success: false, bindings: {} }),
    } as unknown as PrologPort;
    const modeled = payload({
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_inventory: [
        { claim_key: "CLAIM-1", status: "modeled", role: "normative" },
      ],
    });
    await assertLogicalGroundingClaimKeys(
      prolog,
      modeled as never,
      [{ type: "requires_property", from: "REQ-1", to: "FACT-1" }],
      {
        entities: new Map([["FACT-1", { type: "fact", claim_key: "CLAIM-1" }]]),
      },
    );
  });
});
