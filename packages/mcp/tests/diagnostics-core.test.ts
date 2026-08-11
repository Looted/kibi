import { describe, expect, test } from "bun:test";

import {
  classifyDiagnosticError,
  deriveDiagnosticFields,
} from "../src/diagnostics.js";

describe("classifyDiagnosticError", () => {
  test("classifies stale snapshot save failures", () => {
    const result = classifyDiagnosticError(
      new Error(
        "Upsert execution failed: Failed to save KB after upsert: No permission to save kb stale_snapshot",
      ),
    );

    expect(result).toEqual({
      error_name: "Error",
      error_message:
        "Upsert execution failed: Failed to save KB after upsert: No permission to save kb stale_snapshot",
      error_category: "stale_snapshot",
      error_stage: "persistence",
      error_summary:
        "KB snapshot is stale; refresh/retry after the latest KB state is attached.",
    });
  });

  test("classifies Prolog option and lifecycle failures", () => {
    expect(
      classifyDiagnosticError(
        new Error(
          "Status execution failed: Status execution module load failed: Unknown option (h for help)",
        ),
      ),
    ).toMatchObject({
      error_category: "prolog_unknown_option",
      error_stage: "prolog_runtime",
    });

    expect(
      classifyDiagnosticError(new Error("Prolog process not started")),
    ).toMatchObject({
      error_category: "prolog_process_not_started",
      error_stage: "prolog_lifecycle",
    });
  });

  test("classifies tool timeout and Prolog worker reset events", () => {
    expect(
      classifyDiagnosticError(new Error("Tool kb_upsert timed out after 25ms")),
    ).toMatchObject({
      error_category: "tool_timeout",
      error_stage: "tool_timeout",
    });

    expect(
      classifyDiagnosticError(
        new Error("prolog worker reset: tool timeout: kb_upsert"),
      ),
    ).toMatchObject({
      error_category: "prolog_worker_reset",
      error_stage: "prolog_lifecycle",
    });
  });

  test("classifies validation failures separately from runtime failures", () => {
    expect(
      classifyDiagnosticError(
        new Error(
          "Symbol SYM-VIDEO-TOOL-STATE links src/app/utils/video-tool-state.ts coarsely while granular symbols are available: deriveVideoToolState",
        ),
      ),
    ).toMatchObject({
      error_category: "coarse_symbol_linkage",
      error_stage: "validation",
    });

    expect(
      classifyDiagnosticError(
        new Error(
          "Entity validation failed: root: must have required property 'title'",
        ),
      ),
    ).toMatchObject({
      error_category: "entity_validation_failed",
      error_stage: "validation",
    });
  });

  test("classifies validation failures: relationship validation and source mismatch", () => {
    expect(
      classifyDiagnosticError(
        new Error("Relationship validation failed: invalid field 'unknown'"),
      ),
    ).toMatchObject({
      error_category: "relationship_validation_failed",
      error_stage: "validation",
    });

    expect(
      classifyDiagnosticError(
        new Error(
          "Relationship source must match the upserted entity TEST-1; received from=REQ-1",
        ),
      ),
    ).toMatchObject({
      error_category: "relationship_source_mismatch",
      error_stage: "validation",
    });
  });

  test("classifies Prolog failures: module load and query", () => {
    expect(
      classifyDiagnosticError(
        new Error("Status execution module load failed: plunit"),
      ),
    ).toMatchObject({
      error_category: "prolog_module_load_failed",
      error_stage: "prolog_runtime",
    });

    expect(
      classifyDiagnosticError(new Error("Prolog query failed: timeout")),
    ).toMatchObject({
      error_category: "prolog_query_failed",
      error_stage: "prolog_runtime",
    });
  });

  test("classifies Prolog requirement contradictions as semantic validation", () => {
    const result = classifyDiagnosticError(
      new Error(
        "Upsert execution failed: Contradiction detected for requirement REQ-NEW:\n  - Conflicts with REQ-OLD: Value conflict on auth.session_timeout: eq 15 vs eq 30",
      ),
    );

    expect(result).toMatchObject({
      error_category: "semantic_contradiction",
      error_stage: "validation",
      error_summary:
        "Requirement prose/facts contradict existing contradiction-ready requirements.",
      semantic_outcome: "conflict-blocked",
      semantic_conflicting_req_ids: ["REQ-OLD"],
      semantic_checked_req_id: "REQ-NEW",
    });
  });

  test("classifies unhandled handler errors for unknown messages", () => {
    const result = classifyDiagnosticError(
      new Error("Unexpected internal failure"),
    );
    expect(result).toMatchObject({
      error_category: "handler_error",
      error_stage: "handler",
      error_summary: "Unhandled MCP handler error.",
    });
  });

  test("classifies non-Error thrown values", () => {
    const result = classifyDiagnosticError("plain string error");
    expect(result).toMatchObject({
      error_name: "Error",
      error_category: "handler_error",
      error_stage: "handler",
      error_summary: "Unhandled MCP handler error.",
    });
  });
});

describe("deriveDiagnosticFields", () => {
  test("preserves opaque session and actor correlation identifiers", () => {
    const result = deriveDiagnosticFields(
      "kb_status",
      {},
      {
        is_autonomous: true,
        session_id: "session-mcp",
        actor_id: "actor-mcp",
      },
      {},
    );

    expect(result).toMatchObject({
      telemetry_status: "provided",
      session_id: "session-mcp",
      actor_id: "actor-mcp",
    });
  });

  test("returns telemetry status field", () => {
    const result = deriveDiagnosticFields("kb_query", {}, null, {});
    expect(result.telemetry_status).toBe("missing");
  });

  test("returns provided telemetry status when telemetry exists", () => {
    const telemetry = { is_autonomous: true };
    const result = deriveDiagnosticFields("kb_query", {}, telemetry, {});
    expect(result.telemetry_status).toBe("provided");
    expect(result.telemetry_is_autonomous).toBe(true);
  });

  test("includes telemetry confidence and attempt metadata", () => {
    const telemetry = {
      is_autonomous: false,
      confidence_score: 0.75,
      attempt_number: 2,
    };
    const result = deriveDiagnosticFields("kb_search", {}, telemetry, {});
    expect(result.telemetry_confidence_score).toBe(0.75);
    expect(result.telemetry_attempt_number).toBe(2);
  });

  test("kb_query: extracts result count", () => {
    const result = deriveDiagnosticFields("kb_query", {}, null, {
      structuredContent: { count: 5 },
    });
    expect(result.result_count).toBe(5);
    expect(result.zero_results).toBe(false);
    expect(result.result_summary).toBe("5 results");
  });

  test("kb_query: handles zero results", () => {
    const result = deriveDiagnosticFields("kb_query", {}, null, {
      structuredContent: { count: 0 },
    });
    expect(result.result_count).toBe(0);
    expect(result.zero_results).toBe(true);
    expect(result.result_summary).toBe("0 results");
  });

  test("kb_search: extracts result count", () => {
    const result = deriveDiagnosticFields("kb_search", {}, null, {
      structuredContent: { count: 10 },
    });
    expect(result.result_count).toBe(10);
    expect(result.result_summary).toBe("10 results");
  });

  test("kb_check: extracts violation count", () => {
    const result = deriveDiagnosticFields(
      "kb_check",
      { rules: ["rule1", "rule2"] },
      null,
      { structuredContent: { count: 3 } },
    );
    expect(result.violation_count).toBe(3);
    expect(result.requested_rules).toEqual(["rule1", "rule2"]);
    expect(result.result_summary).toBe("3 violations");
  });

  test("kb_check: handles zero violations", () => {
    const result = deriveDiagnosticFields("kb_check", {}, null, {
      structuredContent: { count: 0 },
    });
    expect(result.violation_count).toBe(0);
    expect(result.result_summary).toBe("0 violations");
  });

  test("kb_semantic_advisor: extracts semantic readiness fields", () => {
    const result = deriveDiagnosticFields("kb_semantic_advisor", {}, null, {
      structuredContent: {
        receipt: {
          logic_readiness: "needs_modeling",
          candidate_lane: "predicate",
          suggestions: [{ kind: "predicate" }, { kind: "ontology_gap" }],
          suggested_next_tools: ["kb_suggest_predicates"],
          inventory_contract: { source_hash: "a".repeat(64) },
        },
      },
    });

    expect(result.semantic_logic_readiness).toBe("needs_modeling");
    expect(result.semantic_candidate_lane).toBe("predicate");
    expect(result.semantic_suggestion_kinds).toEqual([
      "predicate",
      "ontology_gap",
    ]);
    expect(result.semantic_suggestion_count).toBe(2);
    expect(result.semantic_next_tools).toEqual(["kb_suggest_predicates"]);
    expect(result.semantic_source_hash).toBe("a".repeat(64));
    expect(result.result_summary).toBe(
      "semantic advisor needs_modeling via predicate",
    );
  });

  test("mutation operations expose stable payload fingerprints and preflight validity", () => {
    const validate = deriveDiagnosticFields(
      "kb_validate_upsert",
      {
        id: "REQ-1",
        type: "req",
        properties: { status: "open", title: "One" },
      },
      null,
      {
        structuredContent: {
          valid: true,
          semanticAdvisor: {
            inventory_contract: { source_hash: "b".repeat(64) },
          },
        },
      },
    );
    const upsert = deriveDiagnosticFields(
      "kb_upsert",
      {
        properties: { title: "One", status: "open" },
        type: "req",
        id: "REQ-1",
      },
      null,
      { structuredContent: { created: 1, updated: 0 } },
    );

    expect(validate.validation_valid).toBe(true);
    expect(validate.mutation_target).toBe("req:REQ-1");
    expect(validate.semantic_source_hash).toBe("b".repeat(64));
    expect(validate.mutation_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(upsert.mutation_fingerprint).toBe(validate.mutation_fingerprint);
  });

  test("kb_coverage records complete proof and receipt recovery signals", () => {
    const result = deriveDiagnosticFields(
      "kb_coverage",
      { by: "req", includePassing: true, limit: 500 },
      null,
      {
        structuredContent: {
          summary: { total: 2, proofProven: 1, proofMissing: 1 },
          rows: [
            { id: "REQ-1", proofGaps: [] },
            {
              id: "REQ-2",
              proofGaps: [
                "missing_logic_grounding",
                "stale_verification_receipt",
              ],
            },
          ],
          repairPlan: { scope: { complete: true } },
          meta: { verificationSnapshot: "c".repeat(64) },
        },
      },
    );

    expect(result).toMatchObject({
      coverage_by: "req",
      coverage_requirement_count: 2,
      coverage_proven_count: 1,
      coverage_proof_missing_count: 1,
      coverage_proof_gap_count: 2,
      coverage_receipt_gap_count: 1,
      coverage_scope_complete: true,
      coverage_verification_snapshot: "c".repeat(64),
      result_summary: "1 proven; 2 proof gaps",
    });
    expect(result.coverage_gap_codes).toEqual([
      "missing_logic_grounding",
      "stale_verification_receipt",
    ]);
  });

  test("kb_suggest_predicates: extracts predicate recommendation fields", () => {
    const result = deriveDiagnosticFields("kb_suggest_predicates", {}, null, {
      structuredContent: {
        candidates: [
          { predicate_name: "commit_action", score: 0.98 },
          { predicate_name: "has_unsaved_changes", score: 0.74 },
        ],
        recommendedAction: "apply_requires_predicate",
        relationshipPlan: {
          relationship: { type: "requires_predicate" },
        },
      },
    });

    expect(result.predicate_candidate_count).toBe(2);
    expect(result.predicate_top_name).toBe("commit_action");
    expect(result.predicate_top_score).toBe(0.98);
    expect(result.predicate_recommended_action).toBe(
      "apply_requires_predicate",
    );
    expect(result.predicate_relationship_plan).toBe(true);
    expect(result.result_summary).toBe(
      "2 predicate candidates; top=commit_action",
    );
  });

  test("kb_upsert: extracts semantic advisor and contradiction fields", () => {
    const result = deriveDiagnosticFields("kb_upsert", {}, null, {
      structuredContent: {
        created: 0,
        updated: 1,
        relationships_created: 2,
        semanticAdvisor: {
          logic_readiness: "modeled",
          candidate_lane: "none",
          suggestions: [],
        },
      },
    });

    expect(result.upsert_created).toBe(0);
    expect(result.upsert_updated).toBe(1);
    expect(result.upsert_relationships_created).toBe(2);
    expect(result.semantic_logic_readiness).toBe("modeled");
    expect(result.semantic_candidate_lane).toBe("none");
    expect(result.semantic_suggestion_count).toBe(0);
    expect(result.result_summary).toBe("upsert updated; semantic modeled");
  });

  test("kb_upsert: extracts successful contradiction-check outcome fields", () => {
    const result = deriveDiagnosticFields("kb_upsert", {}, null, {
      structuredContent: {
        created: 1,
        updated: 0,
        contradictionCheck: {
          outcome: "no-conflict",
          checked_req_id: "REQ-NEW",
          strict_readiness: "contradiction-ready",
          subject_key: "auth.session",
          property_key: "timeout_minutes",
        },
      },
    });

    expect(result.semantic_contradiction_outcome).toBe("no-conflict");
    expect(result.semantic_checked_req_id).toBe("REQ-NEW");
    expect(result.semantic_strict_readiness).toBe("contradiction-ready");
    expect(result.semantic_subject_key).toBe("auth.session");
    expect(result.semantic_property_key).toBe("timeout_minutes");
  });

  test("other tools: returns default summary", () => {
    const result = deriveDiagnosticFields("kb_upsert", {}, null, {});
    expect(result.result_summary).toBe("kb_upsert completed");
  });

  test("handles non-object result", () => {
    const result = deriveDiagnosticFields("kb_query", {}, null, null);
    expect(result.result_count).toBe(0);
    expect(result.zero_results).toBe(true);
  });

  test("handles result without structuredContent", () => {
    const result = deriveDiagnosticFields("kb_query", {}, null, {
      other: "value",
    });
    expect(result.result_count).toBe(0);
    expect(result.zero_results).toBe(true);
  });

  test("handles string count values", () => {
    const result = deriveDiagnosticFields("kb_query", {}, null, {
      structuredContent: { count: "7" },
    });
    expect(result.result_count).toBe(7);
  });
});
