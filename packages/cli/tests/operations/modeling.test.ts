import { describe, expect, test } from "bun:test";

import { classifyBinding } from "../../src/operations/modeling/predicate-bindings.js";
import { handleKbSuggestPredicates } from "../../src/operations/modeling/suggest-predicates.js";
import { analyzeSemanticAdvisorInput } from "../../src/operations/semantic-advisor/analyze-prose.js";
import { validateSemanticInventoryBoundary } from "../../src/operations/semantic-advisor/ingestion-boundary.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import {
  modelRequirementSpec,
  suggestPredicatesSpec,
} from "../../src/public/operations/specs/modeling.js";

function testContext(): OperationContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(0),
  };
}

describe("shared modeling operation executors", () => {
  test("modelRequirementSpec returns a deterministic write plan", async () => {
    // Given: prose that can be modeled without transport-specific defaults.
    const input = {
      text: "Customer data must be retained for 7 years.",
      confidence: 0.9,
    };

    // When: the public operation executes through the shared spec.
    const result = await modelRequirementSpec.execute(input, testContext());

    // Then: the result contains the real strict-lane plan rather than a placeholder.
    expect(result.structuredContent).toMatchObject({
      isStrict: true,
      extractionMode: "heuristic",
    });
    expect(result.structuredContent?.applyPlan).toHaveLength(3);
    const requirement = result.structuredContent?.applyPlan.find(
      (step) => step.type === "req",
    );
    expect(requirement).toBeDefined();
    if (requirement) {
      const payload = {
        type: requirement.type,
        id: String(requirement.id),
        properties: requirement.properties as Record<string, unknown>,
        relationships: requirement.relationships as Array<
          Record<string, unknown>
        >,
      };
      const semantic = analyzeSemanticAdvisorInput({ payload });
      expect(
        validateSemanticInventoryBoundary(
          payload,
          payload.relationships,
          semantic.receipt,
        ).errors,
      ).toEqual([]);
    }
  });

  test("suggestPredicatesSpec returns ranked predicate candidates", async () => {
    // Given: prose that matches the built-in persistence ontology.
    const input = {
      text: "The editor must save changes automatically when the user navigates away.",
      maxCandidates: 1,
      includeExistingSchemas: false,
    };

    // When: the public operation executes through the shared spec.
    const result = await suggestPredicatesSpec.execute(input, testContext());

    // Then: a concrete predicate fact plan is returned.
    expect(result.structuredContent).toMatchObject({
      recommendedAction: "apply_requires_predicate",
    });
    expect(result.structuredContent?.candidates).toHaveLength(1);
    expect(result.structuredContent?.applyPlan).toHaveLength(1);
  });

  test("semantic applicability rejects a complete-looking unrelated schema", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "A consumer-local MCP launcher must resolve dependencies without downloading packages or falling back to global installations.",
      maxCandidates: 10,
      includeExistingSchemas: false,
      argumentBindings: {
        subject: "launcher",
        event: "domain_event",
        component: "launcher",
        dependency: "dependencies",
        allowed_scope: "consumer_local",
        acquisition_policy: "no_download",
      },
    });
    const candidates = result.structuredContent.candidates;
    const dependency = candidates.find(
      (candidate) =>
        candidate.predicate_name === "dependency_resolution_policy",
    );
    expect(dependency?.eligibility).toBe("eligible");
    expect(dependency?.binding_provenance).not.toBe("placeholder");
    expect(result.structuredContent.recommendedAction).toBe(
      "apply_requires_predicate",
    );
    expect(
      candidates.every(
        (candidate) =>
          candidate.eligibility === "eligible" ||
          candidate.rejection_reasons.length > 0,
      ),
    ).toBe(true);
  });

  test("explicit unrelated schemas stay rejected despite complete bindings", async () => {
    const text =
      "A consumer-local MCP launcher must resolve dependencies without downloading packages or falling back to global installations.";
    const cases = [
      {
        schemaId: "FACT-SCHEMA-EVENT-PUBLISH",
        argumentBindings: {
          subject: "consumer_launcher",
          event: "LauncherDependenciesResolved",
        },
      },
      {
        schemaId: "FACT-SCHEMA-HAS-UNSAVED-CHANGES",
        argumentBindings: { subject: "consumer_launcher", expected: "true" },
      },
      {
        schemaId: "FACT-SCHEMA-SCOPED-AUTHORIZATION-RULE",
        argumentBindings: {
          actor_scope: "consumer_project",
          action: "resolve_dependencies",
          decision: "allow",
        },
      },
    ] as const;

    for (const input of cases) {
      const result = await handleKbSuggestPredicates(null, {
        text,
        ...input,
        includeExistingSchemas: false,
      });
      expect(result.structuredContent.candidates).toHaveLength(1);
      expect(result.structuredContent.candidates[0]).toMatchObject({
        eligibility: "rejected",
        binding_status: "complete",
      });
      expect(result.structuredContent.candidates[0]?.schema.id).toBe(
        input.schemaId,
      );
      expect(result.structuredContent.recommendedAction).toBe(
        "record_ontology_gap",
      );
      expect(result.structuredContent.applyPlan[0]?.properties).toMatchObject({
        fact_kind: "observation",
      });
    }
  });

  test("compound assertive prose abstains before ranking or binding", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "The launcher must resolve consumer-local kibi-mcp without downloading packages. The launcher must preserve stdio.",
      includeExistingSchemas: false,
      schemaId: "FACT-SCHEMA-EVENT-PUBLISH",
      argumentBindings: {
        subject: "consumer_launcher",
        event: "LauncherDependenciesResolved",
      },
      existingLogicClaims: ["CLAIM-1111111111111111"],
    });

    expect(result.structuredContent).toMatchObject({
      logicClaims: ["CLAIM-1111111111111111"],
      candidates: [],
      recommendedAction: "record_ontology_gap",
      recommendedPredicateSchema: null,
      applyPlan: [],
      relationshipPlan: null,
      warnings: [
        expect.stringContaining(
          "requires one atomic assertive proposition; semantic advisor detected 2",
        ),
      ],
    });
    expect(result.applyPlan).toEqual([]);
  });

  test("nonlogical rationale prose routes to advisor nonlogical handling", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "This design exists because the legacy renderer made zoom flicker visible during playback.",
      includeExistingSchemas: false,
      existingLogicClaims: ["CLAIM-1111111111111111"],
    });

    expect(result.structuredContent).toMatchObject({
      logicClaims: ["CLAIM-1111111111111111"],
      candidates: [],
      recommendedAction: "review_nonlogical",
      recommendedPredicateSchema: null,
      applyPlan: [],
      relationshipPlan: null,
      warnings: [
        expect.stringContaining("classifies this prose as nonlogical"),
      ],
    });
    expect(result.applyPlan).toEqual([]);
  });

  test("subjective prose routes to advisor nonlogical handling without a schema draft", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "The landing page should feel welcoming and energetic to new climbers.",
      includeExistingSchemas: false,
    });

    expect(result.structuredContent).toMatchObject({
      candidates: [],
      recommendedAction: "review_nonlogical",
      recommendedPredicateSchema: null,
      applyPlan: [],
      relationshipPlan: null,
    });
  });

  test("package-manager context alone does not imply an exception rule", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "The package manager installs and resolves dependencies in the workspace.",
      includeExistingSchemas: false,
      schemaId: "FACT-SCHEMA-EXCEPTION-RULE",
    });
    const exception = result.structuredContent.candidates.find(
      (candidate) => candidate.predicate_name === "exception_rule",
    );
    expect(exception?.eligibility).toBe("rejected");
    expect(exception?.rejection_reasons).toContain(
      "intent cues do not describe exception_rule",
    );
  });

  test("descriptive exception documentation does not become an eligible policy", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "The package manager exception is documented.",
      includeExistingSchemas: false,
      schemaId: "FACT-SCHEMA-EXCEPTION-RULE",
    });
    expect(result.structuredContent.candidates[0]).toMatchObject({
      predicate_name: "exception_rule",
      eligibility: "rejected",
      applicability_score: expect.any(Number),
      rejection_reasons: expect.arrayContaining([
        "prose does not express normative or validity intent",
        "intent cues do not describe exception_rule",
      ]),
    });
    expect(result.structuredContent.recommendedAction).toBe(
      "record_ontology_gap",
    );
    expect(result.structuredContent.applyPlan[0]?.properties).toMatchObject({
      fact_kind: "observation",
    });
  });

  test("descriptive package and launcher prose is not semantically eligible", async () => {
    for (const text of [
      "The package manager installs packages in the workspace.",
      "The launcher uses cwd.",
      "The workspace has a package.",
    ]) {
      const result = await handleKbSuggestPredicates(null, {
        text,
        includeExistingSchemas: false,
        maxCandidates: 10,
      });
      expect(result.structuredContent.candidates).toEqual([]);
      expect(result.structuredContent.recommendedAction).toBe(
        "record_ontology_gap",
      );

      const explicit = await handleKbSuggestPredicates(null, {
        text,
        includeExistingSchemas: false,
        schemaId: "FACT-SCHEMA-DEPENDENCY-RESOLUTION-POLICY",
      });
      expect(explicit.structuredContent.candidates[0]).toMatchObject({
        eligibility: "rejected",
        rejection_reasons: expect.arrayContaining([
          "prose does not express normative or validity intent",
        ]),
      });
    }
  });

  test("dependency resolution requires scope or acquisition policy semantics", async () => {
    const text = "The launcher must resolve and execute kibi-mcp.";
    const result = await handleKbSuggestPredicates(null, {
      text,
      includeExistingSchemas: false,
      maxCandidates: 10,
    });
    expect(result.structuredContent.candidates).toEqual([]);
    expect(result.structuredContent.recommendedAction).toBe(
      "record_ontology_gap",
    );

    const explicit = await handleKbSuggestPredicates(null, {
      text,
      includeExistingSchemas: false,
      schemaId: "FACT-SCHEMA-DEPENDENCY-RESOLUTION-POLICY",
    });
    expect(explicit.structuredContent.candidates[0]).toMatchObject({
      predicate_name: "dependency_resolution_policy",
      eligibility: "rejected",
      rejection_reasons: expect.arrayContaining([
        "required semantic cue absent for dependency_resolution_policy",
      ]),
    });
  });

  test("unknown domains abstain with a deterministic non-null schema draft", async () => {
    const input = {
      text: "The launcher must preserve an unrecognized handoff contract for future hosts.",
      includeExistingSchemas: false,
      minScore: 0.8,
    };
    const first = await handleKbSuggestPredicates(null, input);
    const second = await handleKbSuggestPredicates(null, input);
    expect(first.structuredContent.recommendedAction).toBe(
      "record_ontology_gap",
    );
    expect(first.structuredContent.recommendedPredicateSchema).toEqual(
      second.structuredContent.recommendedPredicateSchema,
    );
    expect(first.structuredContent.recommendedPredicateSchema).not.toBeNull();
    expect(first.applyPlan).toHaveLength(1);
  });

  test("modal-free validity conjunction remains proposition-complete", () => {
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-MODAL-FREE-001",
        properties: {
          semantic_text:
            "Unresolved placeholders are invalid and ambiguous multiple usable roots fail clearly.",
        },
      },
    });
    expect(result.receipt.clauses).toHaveLength(2);
    expect(result.receipt.clauses.map((clause) => clause.normative)).toEqual([
      true,
      true,
    ]);
    expect(
      result.receipt.propositions.map((proposition) => proposition.role),
    ).toEqual(["normative", "normative"]);
  });

  test("generic inferred defaults are placeholders but reviewed booleans bind explicitly", () => {
    expect(classifyBinding("true", "the gate is enabled", false)).toBe(
      "placeholder",
    );
    expect(classifyBinding("true", "the gate is enabled", true)).toBe(
      "explicit",
    );
    expect(
      classifyBinding("requirement.subject", "the gate is enabled", true),
    ).toBe("placeholder");
  });

  test("does not turn generic do-not-use wording into negative launcher evidence", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "The published kibi-cursor plugin must resolve and execute the consumer project's project-local kibi-mcp package without downloading packages or using a global or plugin-local runtime",
      includeExistingSchemas: false,
      maxCandidates: 8,
    });
    const candidate = result.structuredContent.candidates.find(
      (entry) => entry.predicate_name === "dependency_resolution_policy",
    );
    expect(candidate?.eligibility).toBe("eligible");
    expect(candidate?.rejection_reasons).not.toContain(
      "usage guidance says this schema is not for the supplied intent",
    );
  });

  test("keeps pronoun-derived launcher bindings reviewable rather than extracted", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "It must resolve the consumer workspace in deterministic order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd demonstrably contains project-local kibi-mcp",
      includeExistingSchemas: false,
      maxCandidates: 8,
    });
    const candidate = result.structuredContent.candidates.find(
      (entry) => entry.predicate_name === "ordered_resolution_strategy",
    );
    expect(candidate?.eligibility).toBe("eligible");
    expect(candidate?.binding_provenance_by_argument.resolver).toBe("inferred");
    expect(candidate?.binding_status).toBe("incomplete");
    expect(candidate?.predicate_args[0]).not.toBe("requirement.subject");
  });

  test("uses canonical launcher arguments only for exact semantic-rule clauses", async () => {
    const cases = [
      {
        text: "It must resolve the consumer workspace in deterministic order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd demonstrably contains project-local kibi-mcp",
        schemaId: "FACT-SCHEMA-ORDERED-RESOLUTION-STRATEGY",
        expectedArgs: [
          "launcher",
          "explicit_workspace_argument__WORKSPACE_FOLDER_PATHS__KIBI_WORKSPACE__CURSOR_WORKSPACE",
          "cwd_demonstrably_contains_project-local_kibi-mcp",
        ],
      },
      {
        text: "It must spawn the declared kibi-mcp bin with cwd and KIBI_WORKSPACE set to the consumer workspace, preserve stdio, and propagate child exit codes and termination signals",
        schemaId: "FACT-SCHEMA-PROCESS-DELEGATION-CONTRACT",
        expectedArgs: [
          "launcher",
          "resolved_executable",
          "consumer_cwd",
          "consumer_workspace_environment",
          "inherited_stdio",
          "propagate_exit_and_termination",
        ],
      },
      {
        text: "The launcher must resolve kibi-mcp through consumer-scoped Node package semantics including exports-restricted and pnpm-style layouts, and reject packages outside consumer scope unless active package-manager semantics authorize it",
        schemaId: "FACT-SCHEMA-EXCEPTION-RULE",
        expectedArgs: [
          "launcher",
          "consumer_scoped_node_package_semantics",
          "active_package_manager_semantics",
        ],
      },
      {
        text: "Missing project-local kibi-mcp must produce a concise actionable error",
        schemaId: "FACT-SCHEMA-FAILURE-BEHAVIOR",
        expectedArgs: ["launcher", "missing_dependency", "actionable_error"],
      },
    ] as const;

    for (const testCase of cases) {
      const result = await handleKbSuggestPredicates(null, {
        text: testCase.text,
        schemaId: testCase.schemaId,
        subjectHint: "launcher",
        includeExistingSchemas: false,
      });
      expect(result.structuredContent.candidates[0]).toMatchObject({
        predicate_args: testCase.expectedArgs,
        binding_status: "complete",
        binding_provenance: "extracted",
        eligibility: "eligible",
      });
      expect(result.structuredContent.recommendedAction).toBe(
        "apply_requires_predicate",
      );
      expect(result.structuredContent.applyPlan[0]?.properties).toMatchObject({
        predicate_args: testCase.expectedArgs,
      });
    }

    const nonExact = await handleKbSuggestPredicates(null, {
      text: "A consumer-local MCP launcher must resolve dependencies without downloading packages or falling back to global installations.",
      schemaId: "FACT-SCHEMA-DEPENDENCY-RESOLUTION-POLICY",
      includeExistingSchemas: false,
    });
    expect(nonExact.structuredContent.candidates[0]).toMatchObject({
      eligibility: "eligible",
      binding_status: "incomplete",
      binding_provenance: "placeholder",
    });
    expect(nonExact.structuredContent.recommendedAction).toBe(
      "provide_argument_bindings",
    );
    expect(nonExact.structuredContent.applyPlan).toEqual([]);
  });

  test("semantic applicability keeps scalar timeout constraints ahead of permission matches", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "Request timeout must not exceed 30 seconds.",
      includeExistingSchemas: false,
      maxCandidates: 4,
    });
    expect(result.structuredContent.candidates[0]).toMatchObject({
      predicate_name: "resource_constraint",
      eligibility: "eligible",
    });
    expect(result.structuredContent.recommendedAction).toBe(
      "provide_argument_bindings",
    );
  });

  test("treats upload limits as resource constraints, not rate limits", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "The upload limit must be enforced.",
      includeExistingSchemas: false,
      maxCandidates: 4,
    });
    const resource = result.structuredContent.candidates.find(
      (entry) => entry.predicate_name === "resource_constraint",
    );
    const rate = result.structuredContent.candidates.find(
      (entry) => entry.predicate_name === "rate_limit",
    );
    expect(resource).toMatchObject({
      eligibility: "eligible",
      binding_status: "incomplete",
    });
    expect(rate?.eligibility).toBe("rejected");
    expect(result.structuredContent.candidates[0]?.predicate_name).toBe(
      "resource_constraint",
    );
  });
});
