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

  test("records canonical IR, byte spans, and shadow cues for a typed rule", () => {
    const text =
      "If a customer is active, the service must retain the account.";
    const claimKey = semanticClaimKey(text);
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-RULE",
        properties: { title: "Retention", text_ref: text },
      },
      clauses: [text],
      interpretations: [
        {
          claim_key: claimKey,
          claim_text: text,
          ir: {
            version: "kibi.logic.v1",
            kind: "rule",
            modality: "oblige",
            variables: [{ name: "X", type: "entity" }],
            head: {
              kind: "atom",
              name: "retain",
              args: [{ kind: "var", name: "X", type: "entity" }],
            },
            body: {
              kind: "atom",
              name: "active_customer",
              args: [{ kind: "var", name: "X", type: "entity" }],
            },
          },
        },
      ],
    });
    expect(result.receipt.propositions[0]).toMatchObject({
      claim_key: claimKey,
      status: "modeled",
      payload_hash: expect.any(String),
    });
    expect(result.receipt.propositions[0]?.span.end).toBeGreaterThan(0);
    expect(result.receipt.interpretations[0]?.normalized_ir?.kind).toBe("rule");
    expect(
      result.receipt.shadow_analysis.find(({ kind }) => kind === "conditional")
        ?.represented,
    ).toBe(true);
  });

  test("keeps materially different interpretations unresolved", () => {
    const text = "The service may export the report.";
    const claimKey = semanticClaimKey(text);
    const base = {
      version: "kibi.logic.v1" as const,
      kind: "atom" as const,
      modality: "permit" as const,
      head: { kind: "atom" as const, name: "export_report", args: [] },
    };
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-AMBIGUOUS",
        properties: { title: text, text_ref: text },
      },
      clauses: [text],
      interpretations: [
        { claim_key: claimKey, claim_text: text, ir: base },
        {
          claim_key: claimKey,
          claim_text: text,
          ir: { ...base, modality: "forbid" },
        },
      ],
    });
    expect(result.receipt.propositions[0]?.status).toBe("ambiguous");
    expect(result.receipt.logic_coverage.unresolved_claim_keys).toContain(
      claimKey,
    );
  });
});
