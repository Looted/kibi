import { describe, expect, test } from "bun:test";

import {
  analyzeSemanticAdvisorInput,
  semanticClaimKey,
} from "../../src/operations/semantic-advisor/analyze-prose.js";
import { validateSemanticInventoryBoundary } from "../../src/operations/semantic-advisor/ingestion-boundary.js";
import { semanticSourceOf } from "../../src/operations/semantic-advisor/shared.js";
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
        inventory_contract: {
          source_field: "semantic_text",
          source_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
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
    const suggestedRequirement = first.structuredContent.receipt.suggestions
      .flatMap(({ applyPlan }) => applyPlan)
      .find((step) => step.type === "req");
    expect(suggestedRequirement?.properties).toMatchObject({
      semantic_text: input.text,
    });
    expect(suggestedRequirement?.properties).not.toHaveProperty("text_ref");
    expect(semanticAdvisorSpec.requiresProlog).toBe(false);
  });

  for (const text of [
    "The reviewer must record each changed clause with a rationale.",
    "The service must retain artifacts such as review notes.",
    "The reviewer must explain changes because reviewers need evidence.",
    "The service must record changes so that reviewers can audit them.",
    "The service must record changes in order to support review.",
    "Therefore, the service must record changes.",
    "The service must show illustrative review notes.",
    "The service must make reviewers feel comfortable.",
    "The reviewer is required to record a rationale before shipping.",
    "Reviewers may have at most two active sessions such as release sessions.",
    "The service cannot omit review notes because reviewers need evidence.",
    "Only reviewers may approve changes such as release changes.",
    "Because reviews need evidence, reviewers must record a rationale.",
    "The reviewer should record each changed clause with a rationale.",
    "The service should make reviewers feel comfortable.",
    "The service should retain artifacts such as review notes.",
    "The page must feel welcoming.",
    "The page is required to feel comfortable.",
    "The page should feel warm at exactly 37 degrees.",
    "The page should feel comfortable for at least 3 minutes.",
    "The page should feel welcoming and retain artifacts.",
    "The reviewer must confirm the page should feel welcoming.",
  ]) {
    test(`retains the asserted obligation: ${text}`, async () => {
      const context = {
        workspaceRoot: "/tmp/semantic-advisor",
        signal: new AbortController().signal,
        clock: () => new Date(0),
      };
      const args = { text, type: "req", id: "REQ-CONTEXT-CUE" };
      const claimKey = semanticClaimKey(text);
      const preview = await semanticAdvisorSpec.execute(args, context);
      const receipt = preview.structuredContent.receipt;
      expect(receipt.propositions).toHaveLength(1);
      expect(receipt.propositions[0]).toMatchObject({
        claim_key: claimKey,
        role: "normative",
      });
      expect(receipt.propositions[0]?.status).not.toBe("nonlogical");
      expect(receipt.propositions[0]?.status).not.toBe("modeled");
      expect(receipt.logic_coverage.expected_claim_keys).toContain(claimKey);
      expect(receipt.logic_coverage.missing_claim_keys).toContain(claimKey);
      expect(receipt.logic_coverage.unresolved_claim_keys).toContain(claimKey);
      expect(receipt.logic_coverage.status).toBe("unverified");
      expect(receipt.logic_readiness).toBe("needs_modeling");

      const interpreted = await semanticAdvisorSpec.execute(
        {
          ...args,
          interpretations: [
            {
              claim_key: claimKey,
              claim_text: text,
              ir: {
                version: "kibi.logic.v1",
                kind: "atom",
                modality: "oblige",
                head: { kind: "atom", name: "review_obligation", args: [] },
              },
            },
          ],
        },
        context,
      );
      const typedReceipt = interpreted.structuredContent.receipt;
      expect(typedReceipt.interpretations[0]?.valid).toBe(true);
      expect(typedReceipt.propositions[0]).toMatchObject({
        claim_key: claimKey,
        role: "normative",
        status: "modeled",
        semantic_key: expect.any(String),
      });
      expect(typedReceipt.logic_coverage.unresolved_claim_keys).toEqual([]);
      // A typed preview is not a persisted grounding or completed proof.
      expect(typedReceipt.logic_coverage.missing_claim_keys).toContain(
        claimKey,
      );
      expect(typedReceipt.logic_coverage.status).toBe("unverified");
    });
  }

  for (const text of [
    "The landing page should feel welcoming and energetic to new readers.",
    "The page should feel comfortable for visitors.",
    "The page should look complete.",
    "The page should seem complete.",
  ]) {
    test(`keeps subjective should aspirations nonlogical: ${text}`, async () => {
      const context = {
        workspaceRoot: "/tmp/semantic-advisor",
        signal: new AbortController().signal,
        clock: () => new Date(0),
      };
      const result = await semanticAdvisorSpec.execute(
        { text, type: "req" },
        context,
      );
      const receipt = result.structuredContent.receipt;
      expect(receipt.clauses[0]?.normative).toBe(true);
      expect(receipt.propositions).toHaveLength(1);
      expect(receipt.propositions[0]).toMatchObject({
        role: "subjective",
        status: "nonlogical",
      });
      expect(receipt.logic_coverage.expected_claim_keys).toEqual([]);
      expect(receipt.logic_coverage.unresolved_claim_keys).toEqual([]);
    });
  }

  test("keeps a cue-bearing obligation unresolved after an invalid typed interpretation", async () => {
    const context = {
      workspaceRoot: "/tmp/semantic-advisor",
      signal: new AbortController().signal,
      clock: () => new Date(0),
    };
    const text =
      "The reviewer must record each changed clause with a rationale.";
    const claimKey = semanticClaimKey(text);
    const result = await semanticAdvisorSpec.execute(
      {
        text,
        type: "req",
        interpretations: [
          {
            claim_key: claimKey,
            claim_text: text,
            ir: {
              version: "kibi.logic.v1",
              kind: "atom",
              modality: "oblige",
              head: { kind: "atom", name: "ReviewObligation", args: [] },
            },
          },
        ],
      },
      context,
    );
    const receipt = result.structuredContent.receipt;
    expect(receipt.interpretations[0]?.valid).toBe(false);
    expect(receipt.propositions[0]?.status).not.toBe("modeled");
    expect(receipt.logic_coverage.expected_claim_keys).toContain(claimKey);
    expect(receipt.logic_coverage.unresolved_claim_keys).toContain(claimKey);
  });

  test("keeps explicit contextual labels and standalone explanations nonlogical", async () => {
    const context = {
      workspaceRoot: "/tmp/semantic-advisor",
      signal: new AbortController().signal,
      clock: () => new Date(0),
    };
    for (const [text, role] of [
      ["For example, the reviewer must record every change.", "example"],
      ["Example: The reviewer must record every change.", "example"],
      [
        "Illustrative example: The reviewer must record every change.",
        "example",
      ],
      ["e.g. a reviewer must record every change.", "example"],
      ["Rationale: The reviewer must have evidence.", "rationale"],
      ["Because reviews need an audit trail.", "rationale"],
      ["Reviewers prefer concise explanations.", "subjective"],
      ["Artifacts such as notes help reviewers.", "example"],
    ] as const) {
      const result = await semanticAdvisorSpec.execute(
        { text, type: "req" },
        context,
      );
      expect(result.structuredContent.receipt.propositions).toHaveLength(1);
      expect(result.structuredContent.receipt.propositions[0]).toMatchObject({
        role,
        status: "nonlogical",
      });
      expect(
        result.structuredContent.receipt.logic_coverage.expected_claim_keys,
      ).toEqual([]);
      expect(
        result.structuredContent.receipt.logic_coverage.unresolved_claim_keys,
      ).toEqual([]);
    }
  });

  for (const [text, role] of [
    ["Because reviews need an audit trail before shipping.", "rationale"],
    ["Because reviews need notes if a change is substantial.", "rationale"],
    ["Reviewers feel comfortable when the page looks complete.", "subjective"],
    [
      "Reviewers prefer concise notes unless a change is substantial.",
      "subjective",
    ],
    [
      "Artifacts such as notes help reviewers when discussing changes.",
      "example",
    ],
  ] as const) {
    test(`keeps weak context cues nonlogical: ${text}`, async () => {
      const context = {
        workspaceRoot: "/tmp/semantic-advisor",
        signal: new AbortController().signal,
        clock: () => new Date(0),
      };
      const result = await semanticAdvisorSpec.execute(
        { text, type: "req" },
        context,
      );
      const receipt = result.structuredContent.receipt;
      // Preserve broader clause discovery while distinguishing context.
      expect(receipt.clauses[0]?.normative).toBe(true);
      expect(receipt.propositions).toHaveLength(1);
      expect(receipt.propositions[0]).toMatchObject({
        role,
        status: "nonlogical",
      });
      expect(receipt.logic_coverage.expected_claim_keys).toEqual([]);
      expect(receipt.logic_coverage.unresolved_claim_keys).toEqual([]);
    });
  }

  test("retains asserted condition and exception roles around explanatory words", async () => {
    const context = {
      workspaceRoot: "/tmp/semantic-advisor",
      signal: new AbortController().signal,
      clock: () => new Date(0),
    };
    for (const [text, role] of [
      [
        "If a change is substantial, the reviewer must record a rationale.",
        "condition",
      ],
      [
        "Reviewers must record a rationale unless a change is exempt.",
        "exception",
      ],
    ] as const) {
      const result = await semanticAdvisorSpec.execute(
        { text, type: "req" },
        context,
      );
      const receipt = result.structuredContent.receipt;
      const claimKey = semanticClaimKey(text);
      expect(receipt.propositions[0]?.role).toBe(role);
      expect(receipt.propositions[0]?.status).not.toBe("nonlogical");
      expect(receipt.logic_coverage.expected_claim_keys).toContain(claimKey);
      expect(receipt.logic_coverage.unresolved_claim_keys).toContain(claimKey);
    }
  });

  // implements REQ-kibi-truthful-consistency
  test("routes only-when and must-not-unless prose to one forbid-unless rule", () => {
    const suggestionsFor = (text: string) =>
      analyzeSemanticAdvisorInput({
        payload: {
          type: "req",
          id: "REQ-CHECKOUT",
          properties: { title: "Checkout", semantic_text: text },
        },
      }).receipt.suggestions;
    const onlyWhen = suggestionsFor(
      "Checkout may happen only when the cart total is positive.",
    );
    const unless = suggestionsFor(
      "Checkout must not happen unless the cart total is positive.",
    );

    expect(onlyWhen.map(({ kind }) => kind)).toEqual(["rule"]);
    expect(unless.map(({ kind }) => kind)).toEqual(["rule"]);
    expect(onlyWhen[0]).toMatchObject({
      confidence: 0.8,
      suggested_next_tool: "kb_model_requirement",
      rule: {
        modality: "forbid",
        head: { name: "checkout" },
        body: { namespace: "cart", name: "total" },
        exceptions: [{ kind: "compare", operator: "gt" }],
      },
    });
    // Both phrasings say the same thing, so they share one rule identity.
    const key = (list: typeof onlyWhen) =>
      list[0]?.kind === "rule" ? list[0].semantic_key : null;
    expect(key(onlyWhen)).not.toBeNull();
    expect(key(onlyWhen)).toBe(key(unless));
  });

  // implements REQ-kibi-truthful-consistency
  test("keeps a conditional it cannot translate as an unresolved ontology gap", () => {
    for (const text of [
      "Checkout may happen only when the cart total is positive and the user is verified.",
      "Admins may export reports only when the tenant has the export feature enabled.",
    ]) {
      const receipt = analyzeSemanticAdvisorInput({
        payload: {
          type: "req",
          id: "REQ-CONDITIONAL",
          properties: { title: "Conditional", semantic_text: text },
        },
      }).receipt;
      const [suggestion] = receipt.suggestions;

      expect(receipt.suggestions.map(({ kind }) => kind)).toEqual([
        "ontology_gap",
      ]);
      expect(JSON.stringify(suggestion?.applyPlan)).toContain(
        "needs_rule_interpretation",
      );
      expect(receipt.logic_coverage.unresolved_claim_keys).toContain(
        semanticClaimKey(text),
      );
    }
  });

  // implements REQ-kibi-truthful-consistency
  test("keeps a catalog predicate for a conditional the rule reader cannot translate", () => {
    const receipt = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-POST-DELETION",
        properties: {
          title: "Post deletion",
          semantic_text: "Users cannot delete posts unless they own them.",
        },
      },
    }).receipt;

    expect(receipt.suggestions.map(({ kind }) => kind)).toEqual(["predicate"]);
  });

  test("keeps semantic prose independent from text_ref evidence", () => {
    expect(
      semanticSourceOf({
        properties: {
          title: "Fallback title",
          text_ref: "src/policy.ts:42",
          semantic_text: "The policy must retain authored prose.",
        },
      }),
    ).toEqual({
      field: "semantic_text",
      text: "The policy must retain authored prose.",
    });
    expect(
      semanticSourceOf({
        properties: {
          title: "Fallback title",
          text_ref: "Legacy requirement prose.",
          semantic_text: "",
          semantic_source_field: "semantic_text",
        },
      }),
    ).toEqual({ field: "semantic_text", text: "" });
  });

  test("does not treat error nouns in titles as modal-free requirements", () => {
    for (const title of [
      "Transaction failure",
      "Save failure",
      "Entity audit failure",
    ]) {
      const result = analyzeSemanticAdvisorInput({
        payload: {
          type: "req",
          id: `REQ-${title.replace(/\s+/g, "-").toUpperCase()}`,
          properties: { title },
        },
      });
      expect(result.receipt.clauses[0]?.normative).toBe(false);
      expect(result.receipt.suggestions).toEqual([]);
    }
  });

  test("keeps standalone prohibition language normative", () => {
    for (const text of ["Forbidden.", "Prohibited."]) {
      const result = analyzeSemanticAdvisorInput({
        payload: {
          type: "req",
          id: `REQ-${text.replace(/\W/g, "").toUpperCase()}`,
          properties: { semantic_text: text },
        },
      });
      expect(result.receipt.clauses[0]?.normative).toBe(true);
      expect(result.receipt.propositions[0]?.role).toBe("normative");
    }
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
    const suggestedRequirement = partial.receipt.suggestions
      .flatMap(({ applyPlan }) => applyPlan)
      .find((step) => step.type === "req");
    expect(suggestedRequirement?.properties).toMatchObject({
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "text_ref",
      semantic_source_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      semantic_inventory: [
        expect.objectContaining({ status: "missing" }),
        expect.objectContaining({ status: "modeled" }),
      ],
    });
    const predicateSuggestion = partial.receipt.suggestions.find(
      ({ kind }) => kind === "predicate",
    );
    expect(
      predicateSuggestion?.kind === "predicate"
        ? predicateSuggestion.relationshipPlan
        : null,
    ).toMatchObject({
      inventoryContract: {
        version: "kibi.semantic-inventory.v1",
        source_field: "text_ref",
        source_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      semanticInventory: [
        expect.objectContaining({ status: "modeled" }),
        expect.objectContaining({ status: "missing" }),
      ],
    });

    const complete = analyzeSemanticAdvisorInput({
      payload: {
        ...payload,
        properties: {
          ...payload.properties,
          semantic_inventory: clauses.map((claimText, index) => ({
            claim_key: logicClaims[index],
            claim_text: claimText.replace(/[.]$/, ""),
            role: "normative",
            status: "modeled",
            span: { start: 0, end: 1 },
          })),
        },
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

  test("splits comma conjunctions without splitting launcher package lists", () => {
    const ordinary = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-COMMA-CONJUNCTION",
        properties: {
          semantic_text:
            "System must validate input, and it must reject invalid values.",
        },
      },
    });
    expect(ordinary.receipt.clauses.map(({ text }) => text)).toEqual([
      "System must validate input",
      "it must reject invalid values",
    ]);

    const launcher = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-LAUNCHER-COMMA-CONJUNCTION",
        properties: {
          semantic_text:
            "The launcher must resolve kibi-mcp through consumer-scoped Node package semantics including exports-restricted and pnpm-style layouts, and reject packages outside consumer scope unless active package-manager semantics authorize it",
        },
      },
    });
    expect(launcher.receipt.clauses).toHaveLength(1);
    expect(launcher.receipt.suggestions[0]).toMatchObject({
      kind: "predicate",
      predicate: {
        predicate_name: "exception_rule",
        predicate_args: [
          "launcher",
          "consumer_scoped_node_package_semantics",
          "active_package_manager_semantics",
        ],
      },
    });
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

  test("validates a source-bound ledger with an explicit unresolved outcome", () => {
    const text = "System must support OAuth2 authentication.";
    const base = {
      type: "req",
      id: "REQ-LEDGER",
      properties: { title: "OAuth", status: "open", text_ref: text },
      relationships: [],
    };
    const semantic = analyzeSemanticAdvisorInput({ payload: base });
    const contract = semantic.receipt.inventory_contract;
    const payload = {
      ...base,
      properties: {
        ...base.properties,
        logic_claims: semantic.receipt.logic_coverage.expected_claim_keys,
        semantic_inventory_version: contract.version,
        semantic_source_field: contract.source_field,
        semantic_source_hash: contract.source_hash,
        semantic_inventory: semantic.receipt.propositions.map(
          (proposition) => ({ ...proposition, status: "ontology_gap" }),
        ),
      },
    };

    expect(
      validateSemanticInventoryBoundary(
        payload,
        payload.relationships,
        analyzeSemanticAdvisorInput({ payload }).receipt,
      ).errors,
    ).toEqual([]);
  });

  test("names stale grounding targets when proposition counts disagree", () => {
    const text = "System must support OAuth2 authentication.";
    const base = {
      type: "req",
      id: "REQ-STALE-GROUNDING",
      properties: { title: "OAuth", status: "open", text_ref: text },
      relationships: [
        {
          type: "requires_predicate",
          from: "REQ-STALE-GROUNDING",
          to: "FACT-STALE",
        },
      ],
    };
    const semantic = analyzeSemanticAdvisorInput({ payload: base });
    const contract = semantic.receipt.inventory_contract;
    const payload = {
      ...base,
      properties: {
        ...base.properties,
        logic_claims: semantic.receipt.logic_coverage.expected_claim_keys,
        semantic_inventory_version: contract.version,
        semantic_source_field: contract.source_field,
        semantic_source_hash: contract.source_hash,
        semantic_inventory: semantic.receipt.propositions.map(
          (proposition) => ({ ...proposition, status: "ontology_gap" }),
        ),
      },
    };

    expect(
      validateSemanticInventoryBoundary(
        payload,
        payload.relationships,
        analyzeSemanticAdvisorInput({ payload }).receipt,
      ).errors,
    ).toContain(
      "modeled semantic_inventory entries (0) must equal logical grounding relationships (1) [requires_predicate->FACT-STALE]",
    );
  });

  test("canonicalizes repeated identical claims while retaining the first span", () => {
    const text = "The service must log exports. The service must log exports.";
    const payload = {
      type: "req",
      id: "REQ-DUPLICATE-LEDGER",
      properties: { title: "Export logs", status: "open", text_ref: text },
      relationships: [],
    };
    const semantic = analyzeSemanticAdvisorInput({ payload });

    expect(semantic.receipt.propositions).toHaveLength(1);
    expect(semantic.receipt.propositions[0]?.span).toEqual({
      start: 0,
      end: Buffer.byteLength("The service must log exports", "utf8"),
    });
    const contract = semantic.receipt.inventory_contract;
    const withInventory = {
      ...payload,
      properties: {
        ...payload.properties,
        logic_claims: semantic.receipt.logic_coverage.expected_claim_keys,
        semantic_inventory_version: contract.version,
        semantic_source_field: contract.source_field,
        semantic_source_hash: contract.source_hash,
        semantic_inventory: semantic.receipt.propositions.map(
          (proposition) => ({ ...proposition, status: "ontology_gap" }),
        ),
      },
    };
    expect(
      validateSemanticInventoryBoundary(
        withInventory,
        [],
        analyzeSemanticAdvisorInput({ payload: withInventory }).receipt,
      ).errors,
    ).toEqual([]);
  });

  test("keeps a later distinct clause indexed and interpreted after deduplication", () => {
    const repeated = "The service must log exports.";
    const distinct = "The service must rotate logs.";
    const distinctClause = "The service must rotate logs";
    const text = `${repeated} ${repeated} ${distinct}`;
    const distinctKey = semanticClaimKey(distinct);
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-DUPLICATE-INDEX",
        properties: { title: "Logs", status: "open", semantic_text: text },
      },
      interpretations: [
        {
          claim_key: distinctKey,
          claim_text: distinct,
          ir: {
            version: "kibi.logic.v1",
            kind: "atom",
            modality: "oblige",
            head: { kind: "atom", name: "rotate_logs", args: [] },
          },
        },
      ],
    });

    expect(result.receipt.propositions).toHaveLength(2);
    expect(result.receipt.propositions[1]).toMatchObject({
      claim_key: distinctKey,
      claim_text: distinctClause,
      status: "modeled",
      span: {
        start: Buffer.byteLength(`${repeated} ${repeated} `, "utf8"),
        end:
          Buffer.byteLength(`${repeated} ${repeated} `, "utf8") +
          Buffer.byteLength(distinctClause, "utf8"),
      },
    });
    expect(result.receipt.clauses[1]?.index).toBe(2);
    expect(result.receipt.interpretations[0]?.claim_key).toBe(distinctKey);
    expect(result.receipt.interpretations[0]?.valid).toBe(true);
  });
});
