import { describe, expect, test } from "bun:test";

interface SuggestPredicatesModule {
  handleKbSuggestPredicates: (
    prolog: unknown,
    args: Record<string, unknown>,
  ) => Promise<{
    content: Array<{ type: string; text: string }>;
    structuredContent: Record<string, unknown>;
    applyPlan: Array<Record<string, unknown>>;
  }>;
}

describe("kb_suggest_predicates", () => {
  async function loadModule(): Promise<SuggestPredicatesModule> {
    return import(
      "../../src/tools/suggest-predicates.js"
    ) as unknown as Promise<SuggestPredicatesModule>;
  }

  async function suggest(args: Record<string, unknown>) {
    const { handleKbSuggestPredicates } = await loadModule();
    return handleKbSuggestPredicates(null, args);
  }

  test("ranks built-in state and persistence predicates for editor navigation prose", async () => {
    const { handleKbSuggestPredicates } = await loadModule();

    const result = await handleKbSuggestPredicates(null, {
      text: "When the user navigates away with unsaved annotation edits, the editor must auto-save the draft and return to idle mode.",
      requirementId: "REQ-EDITOR-004",
      source: "requirements/editor.md#L12",
      subjectHint: "editor.annotation",
      maxCandidates: 4,
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;

    expect(candidates).toHaveLength(4);
    expect(candidates[0]).toMatchObject({
      predicate_name: "commit_action",
      predicate_args: ["editor.annotation", "navigation", "draft"],
      polarity: "assert",
      schema: expect.objectContaining({
        predicate_name: "commit_action",
        argument_names: ["subject", "trigger", "scope"],
      }),
    });
    expect(candidates.map((candidate) => candidate.predicate_name)).toEqual(
      expect.arrayContaining(["transition", "has_unsaved_changes"]),
    );
    const relationshipPlan = structured.relationshipPlan as Record<
      string,
      unknown
    > | null;

    expect(applyPlan).toHaveLength(1);
    expect(applyPlan[0]).toMatchObject({
      type: "fact",
      relationships: [],
      properties: {
        fact_kind: "predicate",
        predicate_name: "commit_action",
        predicate_args: ["editor.annotation", "navigation", "draft"],
        tags: expect.arrayContaining(["lane:ontology", "predicate-suggestion"]),
      },
    });
    expect(relationshipPlan).toMatchObject({
      applyAfter: applyPlan[0]?.id,
      requiresExistingReq: "REQ-EDITOR-004",
      relationship: {
        type: "requires_predicate",
        from: "REQ-EDITOR-004",
        to: applyPlan[0]?.id,
      },
    });
    expect(result.applyPlan).toEqual(applyPlan);
    expect(result.content[0]?.text).toContain("commit_action");
  });

  test("routes generic return prose to ontology gap instead of weak transition match", async () => {
    const { handleKbSuggestPredicates } = await loadModule();

    const result = await handleKbSuggestPredicates(null, {
      text: "The API must return a specific JSON error body.",
      requirementId: "REQ-API-ERROR-001",
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;

    expect(candidates).toHaveLength(0);
    expect(structured.recommendedAction).toBe("record_ontology_gap");
    expect(applyPlan[0]).toMatchObject({
      type: "fact",
      properties: {
        fact_kind: "observation",
        tags: expect.arrayContaining(["review:ontology-gap"]),
      },
      relationships: [],
    });
  });

  test("emits an ontology-gap observation when no built-in predicate is confident enough", async () => {
    const result = await suggest({
      text: "The product should feel delightful and magical.",
      requirementId: "REQ-BRAND-001",
      source: "requirements/brand.md#L3",
      minScore: 0.8,
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;

    expect(candidates).toHaveLength(0);
    expect(structured.recommendedAction).toBe("record_ontology_gap");
    expect(applyPlan).toHaveLength(1);
    expect(applyPlan[0]).toMatchObject({
      type: "fact",
      relationships: [],
      properties: {
        fact_kind: "observation",
        tags: expect.arrayContaining([
          "review:ontology-gap",
          "needs_schema_extension",
        ]),
      },
    });
    expect(result.content[0]?.text).toContain("ontology gap");
  });

  test("rejects blank prose before scoring predicates", async () => {
    const { handleKbSuggestPredicates } = await loadModule();

    await expect(
      handleKbSuggestPredicates(null, { text: "   " }),
    ).rejects.toThrow("text must be a non-empty string");
  });

  test("does not attach a relationship plan when no requirement ID is provided", async () => {
    const result = await suggest({
      text: "The editor mode must enter idle state.",
      subjectHint: "editor",
      maxCandidates: 1,
    });

    const structured = result.structuredContent;
    const candidates = structured.candidates as Array<Record<string, unknown>>;

    expect(candidates[0]).toMatchObject({
      predicate_name: "state",
      predicate_args: ["editor", "idle"],
    });
    expect(structured.relationshipPlan).toBeNull();
  });

  test("covers broad built-in predicate families from prose cues", async () => {
    const cases = [
      {
        text: "Readonly scrubbing must guard editor annotation behavior unless editing is enabled.",
        expectedName: "guard",
        expectedArgs: ["editor.annotation", "isReadOnly", "true"],
      },
      {
        text: "Pressing escape must discard active annotation changes without save.",
        expectedName: "discard_action",
        expectedArgs: ["editor.annotation", "escape", "active_annotation"],
      },
      {
        text: "Keyboard navigation must satisfy WCAG accessibility requirements.",
        expectedName: "accessibility_requirement",
        expectedArgs: ["requirement.subject", "WCAG", "required"],
      },
      {
        text: "Customer data must be retained for 7 years.",
        expectedName: "retention_policy",
        expectedArgs: ["customer.data", "7", "years"],
      },
      {
        text: "Search latency must be maximum 200 ms.",
        expectedName: "resource_constraint",
        expectedArgs: ["requirement.subject", "latency", "lte", "200", "ms"],
      },
      {
        text: "The checkout feature flag `checkoutV2` must be disabled.",
        expectedName: "feature_gate",
        expectedArgs: ["requirement.subject", "checkoutV2", "false"],
      },
      {
        text: "Checkout must emit OrderSubmittedEvent when payment succeeds.",
        expectedName: "publishes_event",
        expectedArgs: ["requirement.subject", "OrderSubmittedEvent"],
      },
      {
        text: "Search results must display an empty state acceptance outcome.",
        expectedName: "acceptance_rule",
        expectedArgs: [
          "requirement.subject",
          "search_results_must_display_an_empty_state_acceptance_outcome",
        ],
      },
    ];

    for (const testCase of cases) {
      const result = await suggest({
        text: testCase.text,
        maxCandidates: 1,
      });
      const candidates = result.structuredContent.candidates as Array<
        Record<string, unknown>
      >;

      expect(candidates[0]).toMatchObject({
        predicate_name: testCase.expectedName,
        predicate_args: testCase.expectedArgs,
      });
    }
  });

  test("covers fallback argument inference for built-in predicates", async () => {
    const cases = [
      {
        text: "Users must save profile.",
        expectedName: "commit_action",
        expectedArgs: ["user", "unspecified_trigger", "subject"],
      },
      {
        text: "The form must save on submit for the session.",
        expectedName: "commit_action",
        expectedArgs: ["session", "submit", "session"],
      },
      {
        text: "The workflow must cancel and save the draft.",
        expectedName: "commit_action",
        expectedArgs: ["requirement.subject", "cancel", "draft"],
      },
      {
        text: "Scrubbing must guard editing behavior.",
        expectedName: "guard",
        expectedArgs: ["requirement.subject", "condition", "true"],
      },
      {
        text: "The editor must have no unsaved dirty changes.",
        expectedName: "has_unsaved_changes",
        expectedArgs: ["editor", "false"],
      },
      {
        text: "Screen reader accessibility is required.",
        expectedName: "accessibility_requirement",
        expectedArgs: ["requirement.subject", "accessibility", "required"],
      },
      {
        text: "Records must follow a retention policy for 3 months.",
        expectedName: "retention_policy",
        expectedArgs: ["requirement.subject", "3", "months"],
      },
      {
        text: "Audit logs must be retained for 14 days.",
        expectedName: "retention_policy",
        expectedArgs: ["requirement.subject", "14", "days"],
      },
      {
        text: "Retention policy must exist.",
        expectedName: "retention_policy",
        expectedArgs: ["requirement.subject", "1", "unit"],
      },
      {
        text: "Payload size must be minimum 5 mb.",
        expectedName: "resource_constraint",
        expectedArgs: ["requirement.subject", "size", "gte", "5", "mb"],
      },
      {
        text: "Request timeout must not exceed 30 seconds.",
        expectedName: "resource_constraint",
        expectedArgs: [
          "requirement.subject",
          "timeout",
          "lte",
          "30",
          "seconds",
        ],
      },
      {
        text: "The upload limit must be enforced.",
        expectedName: "resource_constraint",
        expectedArgs: ["requirement.subject", "resource", "lte", "0", "unit"],
      },
      {
        text: "The feature gate must be enabled.",
        expectedName: "feature_gate",
        expectedArgs: ["requirement.subject", "feature_gate", "true"],
      },
      {
        text: "The checkout flow must publish an event.",
        expectedName: "publishes_event",
        expectedArgs: ["requirement.subject", "domain_event"],
      },
    ];

    for (const testCase of cases) {
      const result = await suggest({
        text: testCase.text,
        maxCandidates: 1,
      });
      const candidates = result.structuredContent.candidates as Array<
        Record<string, unknown>
      >;

      expect(candidates[0]).toMatchObject({
        predicate_name: testCase.expectedName,
        predicate_args: testCase.expectedArgs,
      });
    }
  });

  test("uses project-local predicate schemas when Prolog returns predicate_schema facts", async () => {
    const { handleKbSuggestPredicates } = await loadModule();
    let capturedGoal = "";
    const prolog = {
      query: async (goal: string) => {
        capturedGoal = goal;
        return {
          success: true,
          bindings: {
            Results:
              '[[FACT-SCHEMA-CUSTOM,fact,[fact_kind=predicate_schema,predicate_name=custom_policy,title="Custom policy",description="Project-local custom policy.",argument_names=[subject,mode],argument_types=[entity,mode],aliases=[custom],examples=[custom_policy(subject,mode)],tags=[custom,policy]]]]',
          },
        };
      },
    };

    const result = await handleKbSuggestPredicates(prolog, {
      text: "The custom policy mode must be enforced.",
      subjectHint: "policy.engine",
      maxCandidates: 1,
    });
    const candidates = result.structuredContent.candidates as Array<
      Record<string, unknown>
    >;

    expect(candidates[0]).toMatchObject({
      predicate_name: "custom_policy",
      predicate_args: ["policy.engine", "unknown"],
      schema: expect.objectContaining({
        id: "FACT-SCHEMA-CUSTOM",
        title: "Custom policy",
        argument_names: ["subject", "mode"],
        tags: ["custom", "policy"],
      }),
    });
    expect(capturedGoal).toContain("fact_kind=predicate_schema");
  });

  test("reports warnings when existing predicate schemas cannot be loaded", async () => {
    const { handleKbSuggestPredicates } = await loadModule();
    const prolog = {
      query: async () => ({ success: false, error: "boom" }),
    };

    const result = await handleKbSuggestPredicates(prolog, {
      text: "Session timeout must be maximum 30 seconds.",
      maxCandidates: 1,
    });

    expect(result.structuredContent.warnings).toEqual([
      "Existing predicate_schema facts could not be loaded: boom",
    ]);
  });

  test("skips existing schema loading when disabled", async () => {
    const { handleKbSuggestPredicates } = await loadModule();
    let queryCount = 0;
    const prolog = {
      query: async () => {
        queryCount += 1;
        return { success: false, error: "should not be called" };
      },
    };

    const result = await handleKbSuggestPredicates(prolog, {
      text: "Session timeout must be maximum 30 seconds.",
      includeExistingSchemas: false,
      maxCandidates: 1,
    });

    expect(queryCount).toBe(0);
    expect(result.structuredContent.warnings).toEqual([]);
  });
});
