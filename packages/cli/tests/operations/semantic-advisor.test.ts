import { describe, expect, test } from "bun:test";

import {
  analyzeSemanticAdvisorInput,
  semanticClaimKey,
} from "../../src/operations/semantic-advisor/analyze-prose.js";
import { semanticAdvisorSpec } from "../../src/public/operations/specs/semantic.js";

describe("semantic advisor operation", () => {
  test("returns deterministic strict-property advice without Prolog", async () => {
    // Given: exact MCP-shaped input and a context with no Prolog capability.
    const input = {
      text: "Users may have at most two active sessions.",
      type: "req",
      id: "REQ-SESSIONS",
      title: "Limit active sessions",
      source: "docs/requirements/sessions.md",
    };
    const context = {
      workspaceRoot: "/tmp/semantic-advisor",
      signal: new AbortController().signal,
      clock: () => new Date(0),
    };

    // When: the public operation executes twice.
    const first = await semanticAdvisorSpec.execute(input, context);
    const second = await semanticAdvisorSpec.execute(input, context);

    // Then: the output is stable and contains the established strict claim.
    expect(first).toEqual(second);
    expect(first.structuredContent).toMatchObject({
      receipt: {
        suggestions: [
          {
            kind: "strict_property",
            claim: {
              subject_key: "user.session",
              property_key: "active_count",
              operator: "lte",
              value_int: 2,
            },
          },
        ],
      },
    });
    expect(semanticAdvisorSpec.requiresProlog).toBe(false);
  });

  test("uses one stable claim identity across trailing punctuation artifacts", async () => {
    const context = {
      workspaceRoot: "/tmp/semantic-advisor",
      signal: new AbortController().signal,
      clock: () => new Date(0),
    };
    const base = {
      text: "Checkout requires payment authorization before submission.",
      type: "req",
      id: "REQ-CHECKOUT",
      title: "Checkout authorization",
    };

    const plain = await semanticAdvisorSpec.execute(
      {
        ...base,
        clauses: ["Checkout requires payment authorization before submission"],
      },
      context,
    );
    const comma = await semanticAdvisorSpec.execute(
      {
        ...base,
        clauses: ["Checkout requires payment authorization before submission,"],
      },
      context,
    );

    expect(comma.structuredContent.receipt.clauses[0]?.claim_key).toBe(
      plain.structuredContent.receipt.clauses[0]?.claim_key,
    );
    expect(comma.structuredContent.receipt.clauses[0]?.text).toBe(
      "Checkout requires payment authorization before submission",
    );
  });

  test("keeps a compound requirement partial until every claim has a grounding edge", () => {
    const clauses = [
      "Checkout requires payment authorization before submission.",
      "Customer data must be retained for 7 years.",
    ];
    const logicClaims = clauses.map(semanticClaimKey);
    const payload = {
      type: "req",
      id: "REQ-COMPOUND",
      properties: {
        title: "Compound checkout policy",
        text_ref: clauses.join(" "),
        logic_claims: logicClaims,
      },
      relationships: [
        {
          type: "requires_predicate",
          from: "REQ-COMPOUND",
          to: "FACT-CHECKOUT-AUTHORIZATION",
        },
      ],
    };

    const partial = analyzeSemanticAdvisorInput({ payload, clauses });
    expect(partial.receipt.logic_readiness).toBe("needs_modeling");
    expect(partial.receipt.logic_coverage.status).toBe("partial");
    expect(partial.receipt.suggestions).toHaveLength(2);

    const complete = analyzeSemanticAdvisorInput({
      payload: {
        ...payload,
        relationships: [
          ...payload.relationships,
          {
            type: "requires_property",
            from: "REQ-COMPOUND",
            to: "FACT-CUSTOMER-RETENTION",
          },
          {
            type: "constrains",
            from: "REQ-COMPOUND",
            to: "FACT-CUSTOMER-DATA",
          },
        ],
      },
      clauses,
    });
    expect(complete.receipt.logic_readiness).toBe("modeled");
    expect(complete.receipt.logic_coverage.status).toBe("complete");
    expect(complete.receipt.suggestions).toEqual([]);
  });
});
