import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  deriveDiagnosticFields as derive,
  diagnosticModeRequested,
  routedBusinessArgs,
  routedOperationName,
} from "../src/diagnostics.js";

const sha = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const envelope = (data: unknown, extra: Record<string, unknown> = {}) => ({
  structuredContent: { kibiProtocol: 1, data, ...extra },
});

describe("diagnosticModeRequested", () => {
  test("the flag or a truthy env opt-in", () => {
    expect(diagnosticModeRequested(["node", "--diagnostic-mode"], {})).toBe(
      true,
    );
    expect(diagnosticModeRequested(["node"], {})).toBe(false);
    for (const value of ["1", " TRUE ", "true"])
      expect(diagnosticModeRequested([], { KIBI_DIAGNOSTIC_MODE: value })).toBe(
        true,
      );
    for (const value of ["0", "yes", "", " "])
      expect(diagnosticModeRequested([], { KIBI_DIAGNOSTIC_MODE: value })).toBe(
        false,
      );
  });
});

describe("routed operation names and arguments", () => {
  test("composite tools report the operation they routed to", () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ["kb_model", { mode: "analyze" }, "kb_semantic_advisor"],
      ["kb_model", { mode: "requirement" }, "kb_model_requirement"],
      ["kb_model", { mode: "predicates" }, "kb_suggest_predicates"],
      ["kb_model", { mode: "other" }, "kb_model"],
      ["kb_model", { mode: 1 }, "kb_model"],
      ["kb_model", { action: "list" }, "kb_model"],
      ["kb_skills", { action: "list" }, "kb_skills_list"],
      ["kb_skills", { action: "load" }, "kb_skills_load"],
      ["kb_skills", { action: "read" }, "kb_skills_read"],
      ["kb_skills", { action: "x" }, "kb_skills"],
      ["kb_skills", { action: 2 }, "kb_skills"],
      ["kb_skills", { mode: "analyze" }, "kb_skills"],
      ["kb_upsert", { dryRun: true }, "kb_validate_upsert"],
      ["kb_upsert", { dryRun: "true" }, "kb_upsert"],
      ["kb_upsert", {}, "kb_upsert"],
      [
        "kb_query",
        { mode: "analyze", action: "list", dryRun: true },
        "kb_query",
      ],
    ];
    for (const [tool, args, expected] of cases)
      expect([tool, args, routedOperationName(tool, args)]).toStrictEqual([
        tool,
        args,
        expected,
      ]);
  });

  test("the selector is dropped only when the call was routed", () => {
    const query = { mode: "analyze", q: 1 };
    expect(routedBusinessArgs("kb_query", query)).toBe(query);
    expect(
      routedBusinessArgs("kb_model", { mode: "analyze", text: "t" }),
    ).toStrictEqual({ text: "t" });
    expect(
      routedBusinessArgs("kb_skills", { action: "load", id: "x", mode: 1 }),
    ).toStrictEqual({ id: "x", mode: 1 });
    expect(
      routedBusinessArgs("kb_upsert", { dryRun: true, id: "R" }),
    ).toStrictEqual({ id: "R" });
  });
});

describe("deriveDiagnosticFields, exact", () => {
  test("telemetry fields and a plain result", () => {
    expect(derive("kb_graph", {}, null, null)).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_graph completed",
    });
    expect(
      derive(
        "kb_graph",
        {},
        {
          is_autonomous: false,
          confidence_score: 0,
          attempt_number: 2,
          session_id: "s",
          actor_id: "a",
        },
        {},
      ),
    ).toStrictEqual({
      telemetry_status: "provided",
      telemetry_is_autonomous: false,
      telemetry_confidence_score: 0,
      telemetry_attempt_number: 2,
      session_id: "s",
      actor_id: "a",
      result_summary: "kb_graph completed",
    });
    expect(
      derive("kb_graph", {}, { session_id: 1, actor_id: 2 }, {}),
    ).toStrictEqual({
      telemetry_status: "provided",
      telemetry_is_autonomous: null,
      telemetry_confidence_score: null,
      telemetry_attempt_number: null,
      result_summary: "kb_graph completed",
    });
  });

  test("envelope fields", () => {
    const failed = { status: "failed", id: "e1" };
    expect(
      derive(
        "kb_graph",
        {},
        { followed_next_actions: ["a"], unsafe_original_retry: true },
        envelope(
          {},
          {
            resultVersion: "v2",
            status: "success",
            effects: [failed, { status: "ok" }, null, [failed], "failed"],
          },
        ),
      ),
    ).toStrictEqual({
      telemetry_status: "provided",
      telemetry_is_autonomous: null,
      telemetry_confidence_score: null,
      telemetry_attempt_number: null,
      protocol_version: 1,
      result_version: "v2",
      result_status: "success",
      effect_failures: [failed],
      followed_next_actions: ["a"],
      unsafe_original_retry: true,
      result_summary: "kb_graph completed",
    });
    expect(
      derive(
        "kb_graph",
        {},
        { followed_next_actions: "a", unsafe_original_retry: "yes" },
        envelope({}, { effects: "none" }),
      ),
    ).toStrictEqual({
      telemetry_status: "provided",
      telemetry_is_autonomous: null,
      telemetry_confidence_score: null,
      telemetry_attempt_number: null,
      protocol_version: 1,
      result_version: null,
      result_status: null,
      effect_failures: [],
      followed_next_actions: [],
      unsafe_original_retry: false,
      result_summary: "kb_graph completed",
    });
    expect(derive("kb_graph", {}, null, envelope({}))).toStrictEqual({
      telemetry_status: "missing",
      protocol_version: 1,
      result_version: null,
      result_status: null,
      effect_failures: [],
      followed_next_actions: [],
      unsafe_original_retry: false,
      result_summary: "kb_graph completed",
    });
  });

  test("query and search counts", () => {
    for (const tool of ["kb_query", "kb_search"]) {
      expect(derive(tool, {}, null, envelope({ count: 0 }))).toMatchObject({
        result_count: 0,
        zero_results: true,
        result_summary: "0 results",
      });
      expect(derive(tool, {}, null, { count: 3 })).toStrictEqual({
        telemetry_status: "missing",
        result_count: 3,
        zero_results: false,
        result_summary: "3 results",
      });
      expect(derive(tool, {}, null, {})).toStrictEqual({
        telemetry_status: "missing",
        result_count: null,
        result_summary: "results count unavailable",
      });
    }
  });

  test("check counts and requested rules", () => {
    expect(
      derive("kb_check", { rules: ["a"] }, null, { count: 2 }),
    ).toStrictEqual({
      telemetry_status: "missing",
      violation_count: 2,
      requested_rules: ["a"],
      result_summary: "2 violations",
    });
    expect(derive("kb_check", { rules: "a" }, null, {})).toStrictEqual({
      telemetry_status: "missing",
      violation_count: null,
      requested_rules: [],
      result_summary: "violations count unavailable",
    });
  });

  test("receipt gap details name drifted fingerprint components", () => {
    const fields = derive("kb_coverage", { by: "req" }, null, {
      rows: [
        {
          id: "REQ-d",
          proofGaps: ["stale_proof_receipt"],
          proofStages: {
            passingE2e: {
              staleReceiptTests: ["T2", "T1"],
              receiptEvidence: [
                { testId: "T2", fingerprintDrift: ["command"] },
                {
                  testId: "T1",
                  fingerprintDrift: ["integration", 4, "command"],
                },
                { testId: "T3", fingerprintDrift: [] },
                { fingerprintDrift: ["command"] },
                "not a row",
              ],
            },
          },
        },
        {
          id: "REQ-e",
          proofGaps: ["stale_proof_receipt"],
          proofStages: { passingE2e: { receiptEvidence: "none" } },
        },
      ],
    });
    expect(fields.coverage_receipt_gaps).toStrictEqual([
      {
        requirementId: "REQ-d",
        testIds: ["T1", "T2"],
        codes: ["stale_proof_receipt"],
        fingerprintDrift: [
          { testId: "T1", components: ["integration", "command"] },
          { testId: "T2", components: ["command"] },
        ],
      },
      { requirementId: "REQ-e", testIds: [], codes: ["stale_proof_receipt"] },
    ]);
  });

  test("coverage fields and receipt gap details", () => {
    const rows = [
      {
        id: "REQ-b",
        proofGaps: [
          "missing_proof_receipt",
          "not_a_receipt_gap",
          "missing_proof_receipt",
          4,
        ],
        proofStages: {
          passingE2e: {
            missingReceiptTests: ["T2", "T1", "T1"],
            staleReceiptTests: ["T3"],
            failedReceiptTests: ["T4"],
            invalidReceiptTests: ["T5"],
            contractMismatchReceiptTests: ["T6"],
            snapshotUnavailableTests: ["T7", 8],
            otherTests: ["T9"],
          },
        },
      },
      {
        id: "REQ-a",
        proofGaps: [
          "stale_proof_receipt",
          "failed_proof_receipt",
          "invalid_proof_receipt",
          "proof_contract_mismatch",
          "proof_snapshot_unavailable",
        ],
        proofStages: { passingE2e: "none" },
      },
      { proofGaps: ["stale_proof_receipt"], proofStages: "none" },
      { id: "REQ-c", proofGaps: ["only_other"] },
      "not a row",
    ];
    expect(
      derive("kb_coverage", { by: "test" }, null, {
        rows,
        summary: { total: "9", proofTested: 4, proofMissing: 1 },
        repairPlan: { scope: { complete: false } },
        meta: { proofSnapshot: "snap" },
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      coverage_by: "test",
      coverage_requirement_count: 9,
      coverage_tested_count: 4,
      coverage_proof_missing_count: 1,
      coverage_proof_gap_count: 10,
      coverage_gap_codes: [
        "failed_proof_receipt",
        "invalid_proof_receipt",
        "missing_proof_receipt",
        "not_a_receipt_gap",
        "only_other",
        "proof_contract_mismatch",
        "proof_snapshot_unavailable",
        "stale_proof_receipt",
      ],
      coverage_receipt_gap_count: 8,
      coverage_receipt_gaps: [
        {
          requirementId: "REQ-a",
          testIds: [],
          codes: [
            "failed_proof_receipt",
            "invalid_proof_receipt",
            "proof_contract_mismatch",
            "proof_snapshot_unavailable",
            "stale_proof_receipt",
          ],
        },
        {
          requirementId: "REQ-b",
          testIds: ["T1", "T2", "T3", "T4", "T5", "T6", "T7"],
          codes: ["missing_proof_receipt"],
        },
        {
          requirementId: "unknown",
          testIds: [],
          codes: ["stale_proof_receipt"],
        },
      ],
      coverage_receipt_gap_total: 3,
      coverage_receipt_gaps_truncated: false,
      coverage_scope_complete: false,
      coverage_proof_snapshot: "snap",
      result_summary: "4 tested; 10 proof gaps",
    });
  });

  test("coverage defaults without a summary, plan or metadata", () => {
    expect(
      derive("kb_coverage", {}, null, {
        rows: [{ id: "R" }, { id: "S" }],
        repairPlan: { scope: { complete: "yes" } },
        meta: { proofSnapshot: 1 },
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      coverage_by: "req",
      coverage_requirement_count: 2,
      coverage_tested_count: 0,
      coverage_proof_missing_count: 0,
      coverage_proof_gap_count: 0,
      coverage_gap_codes: [],
      coverage_receipt_gap_count: 0,
      coverage_receipt_gaps: [],
      coverage_receipt_gap_total: 0,
      coverage_receipt_gaps_truncated: false,
      result_summary: "0 tested; 0 proof gaps",
    });
    expect(
      derive("kb_coverage", {}, null, { rows: "x", repairPlan: { scope: 1 } }),
    ).toMatchObject({ coverage_requirement_count: 0 });
    expect(
      "coverage_scope_complete" in
        derive("kb_coverage", {}, null, { repairPlan: "x" }),
    ).toBe(false);
  });

  test("coverage receipt gaps are capped at fifty", () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      id: `REQ-${String(index).padStart(3, "0")}`,
      proofGaps: ["missing_proof_receipt"],
    }));
    const fields = derive("kb_coverage", {}, null, { rows });
    expect((fields.coverage_receipt_gaps as unknown[]).length).toBe(50);
    expect(fields.coverage_receipt_gap_total).toBe(51);
    expect(fields.coverage_receipt_gaps_truncated).toBe(true);
    expect(
      (fields.coverage_receipt_gaps as Array<{ requirementId: string }>)[49]
        ?.requirementId,
    ).toBe("REQ-049");
    const fifty = derive("kb_coverage", {}, null, { rows: rows.slice(1) });
    expect(fifty.coverage_receipt_gaps_truncated).toBe(false);
    expect((fifty.coverage_receipt_gaps as unknown[]).length).toBe(50);
  });

  test("coverage without a payload falls back to the plain summary", () => {
    expect(derive("kb_coverage", {}, null, null)).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_coverage completed",
    });
  });

  test("semantic advisor fields", () => {
    const receipt = {
      logic_readiness: "ready",
      candidate_lane: "facts",
      suggestions: [{ kind: "a" }, { kind: 1 }, "x", { kind: "b" }],
      suggested_next_tools: ["kb_upsert", 3],
      inventory_contract: { source_hash: "h" },
    };
    expect(
      derive("kb_model", { mode: "analyze" }, null, { receipt }),
    ).toStrictEqual({
      telemetry_status: "missing",
      semantic_logic_readiness: "ready",
      semantic_candidate_lane: "facts",
      semantic_suggestion_kinds: ["a", "b"],
      semantic_suggestion_count: 2,
      semantic_next_tools: ["kb_upsert"],
      semantic_source_hash: "h",
      result_summary: "semantic advisor ready via facts",
    });
    expect(
      derive("kb_semantic_advisor", {}, null, {
        receipt: {
          logic_readiness: "ready",
          suggestions: "x",
          suggested_next_tools: "y",
          inventory_contract: { source_hash: 1 },
        },
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      semantic_logic_readiness: "ready",
      semantic_suggestion_kinds: [],
      semantic_suggestion_count: 0,
      semantic_next_tools: [],
      result_summary: "kb_semantic_advisor completed",
    });
    expect(
      derive("kb_semantic_advisor", {}, null, {
        receipt: { candidate_lane: "facts", inventory_contract: "x" },
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      semantic_candidate_lane: "facts",
      semantic_suggestion_kinds: [],
      semantic_suggestion_count: 0,
      semantic_next_tools: [],
      result_summary: "kb_semantic_advisor completed",
    });
    expect(
      derive("kb_semantic_advisor", {}, null, { receipt: "none" }),
    ).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_semantic_advisor completed",
    });
    expect(derive("kb_semantic_advisor", {}, null, null)).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_semantic_advisor completed",
    });
  });

  test("predicate suggestion fields", () => {
    expect(
      derive("kb_model", { mode: "predicates" }, null, {
        candidates: [
          "x",
          { predicate_name: "p", score: 0.5 },
          { predicate_name: "q" },
        ],
        recommendedAction: "reuse",
        relationshipPlan: {},
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      predicate_candidate_count: 3,
      predicate_top_name: "p",
      predicate_top_score: 0.5,
      predicate_recommended_action: "reuse",
      predicate_relationship_plan: true,
      result_summary: "3 predicate candidates; top=p",
    });
    expect(
      derive("kb_suggest_predicates", {}, null, {
        candidates: [{ predicate_name: 1, score: "1" }],
        recommendedAction: 2,
        relationshipPlan: [],
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      predicate_candidate_count: 1,
      predicate_relationship_plan: false,
      result_summary: "1 predicate candidates",
    });
    expect(
      derive("kb_suggest_predicates", {}, null, { candidates: "x" }),
    ).toStrictEqual({
      telemetry_status: "missing",
      predicate_candidate_count: 0,
      predicate_relationship_plan: false,
      result_summary: "0 predicate candidates",
    });
    expect(derive("kb_suggest_predicates", {}, null, null)).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_suggest_predicates completed",
    });
  });

  test("upsert fields with contradiction and advisor details", () => {
    const args = {
      type: "req",
      id: "REQ-1",
      properties: { b: 1, a: [{ d: 1, c: 2 }] },
      _diagnostic_telemetry: { x: 1 },
    };
    const fingerprint = sha({
      id: "REQ-1",
      properties: { a: [{ c: 2, d: 1 }], b: 1 },
      type: "req",
    });
    expect(
      derive("kb_upsert", args, null, {
        created: 1,
        updated: "0",
        relationships_created: 2,
        contradictionCheck: {
          outcome: "clear",
          checked_req_id: "REQ-1",
          strict_readiness: "ready",
          subject_key: "s",
          property_key: "p",
        },
        semanticAdvisor: { logic_readiness: "ready" },
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      mutation_fingerprint: fingerprint,
      mutation_target: "req:REQ-1",
      upsert_created: 1,
      upsert_updated: 0,
      upsert_relationships_created: 2,
      semantic_contradiction_outcome: "clear",
      semantic_checked_req_id: "REQ-1",
      semantic_strict_readiness: "ready",
      semantic_subject_key: "s",
      semantic_property_key: "p",
      semantic_logic_readiness: "ready",
      semantic_suggestion_kinds: [],
      semantic_suggestion_count: 0,
      semantic_next_tools: [],
      result_summary: "upsert created; semantic ready",
    });
    expect(
      derive("kb_upsert", { type: 1 }, null, {
        contradictionCheck: {
          outcome: 1,
          checked_req_id: 2,
          strict_readiness: 3,
          subject_key: 4,
          property_key: 5,
        },
        semanticAdvisor: { logic_readiness: "partial" },
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      mutation_fingerprint: sha({ type: 1 }),
      mutation_target: "unknown:unknown",
      upsert_created: 0,
      upsert_updated: 0,
      upsert_relationships_created: 0,
      semantic_logic_readiness: "partial",
      semantic_suggestion_kinds: [],
      semantic_suggestion_count: 0,
      semantic_next_tools: [],
      result_summary: "upsert updated; semantic partial",
    });
    expect(
      derive("kb_upsert", { id: "X" }, null, { contradictionCheck: "x" }),
    ).toStrictEqual({
      telemetry_status: "missing",
      mutation_fingerprint: sha({ id: "X" }),
      mutation_target: "unknown:X",
      upsert_created: 0,
      upsert_updated: 0,
      upsert_relationships_created: 0,
      result_summary: "kb_upsert completed",
    });
    expect(derive("kb_upsert", {}, null, null)).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_upsert completed",
    });
  });

  test("a dry-run upsert reports as validation with the write's fingerprint", () => {
    const args = { type: "req", id: "REQ-1", dryRun: true };
    const write = derive("kb_upsert", { type: "req", id: "REQ-1" }, null, {});
    expect(derive("kb_upsert", args, null, { valid: true })).toStrictEqual({
      telemetry_status: "missing",
      mutation_fingerprint: write.mutation_fingerprint,
      mutation_target: "req:REQ-1",
      validation_valid: true,
      result_summary: "upsert payload valid",
    });
    expect(
      derive("kb_validate_upsert", { type: "req" }, null, {
        valid: "true",
        semanticAdvisor: { candidate_lane: "l" },
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      mutation_fingerprint: sha({ type: "req" }),
      mutation_target: "req:unknown",
      validation_valid: false,
      semantic_candidate_lane: "l",
      semantic_suggestion_kinds: [],
      semantic_suggestion_count: 0,
      semantic_next_tools: [],
      result_summary: "upsert payload invalid",
    });
    expect(derive("kb_validate_upsert", {}, null, null)).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_validate_upsert completed",
    });
  });
});
