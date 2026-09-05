// implements REQ-002
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  initializeDiagnosticMode,
} from "../src/diagnostics.js";

const restorers: Array<() => void> = [];

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name);
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  initializeDiagnosticMode(false);
  for (const restore of restorers.splice(0)) restore();
});

describe("deriveDiagnosticFields remaining protocol and coverage branches", () => {
  test("unwraps kibiProtocol envelopes and records effect plus retry telemetry", () => {
    const result = deriveDiagnosticFields(
      "kb_status",
      {},
      {
        is_autonomous: true,
        session_id: "session-1",
        actor_id: "actor-1",
        followed_next_actions: ["kb_check"],
        unsafe_original_retry: true,
      },
      {
        structuredContent: {
          kibiProtocol: 1,
          resultVersion: "kibi.kb_status.v1",
          status: "committed_with_repairs",
          data: { count: 0 },
          effects: [
            { kind: "kb-write", status: "failed" },
            { kind: "kb-write", status: "completed" },
            null,
            "skip",
            [1],
          ],
        },
      },
    );

    expect(result).toMatchObject({
      protocol_version: 1,
      result_version: "kibi.kb_status.v1",
      result_status: "committed_with_repairs",
      session_id: "session-1",
      actor_id: "actor-1",
      unsafe_original_retry: true,
      followed_next_actions: ["kb_check"],
    });
    expect(result.effect_failures).toEqual([
      { kind: "kb-write", status: "failed" },
    ]);
  });

  test("kb_check without a rules array and non-record structured content stay defensive", () => {
    const noRules = deriveDiagnosticFields("kb_check", { rules: "all" }, null, {
      structuredContent: { count: 0 },
    });
    expect(noRules.requested_rules).toEqual([]);
    expect(noRules.result_summary).toBe("0 violations");

    const notRecord = deriveDiagnosticFields(
      "kb_query",
      {},
      null,
      { structuredContent: ["not", "an", "object"] },
    );
    expect(notRecord.result_count).toBe(0);
    expect(notRecord.zero_results).toBe(true);
  });

  test("kb_coverage falls back when rows, summary, and receipt stages are missing", () => {
    const result = deriveDiagnosticFields("kb_coverage", {}, null, {
      structuredContent: {
        rows: "not-rows",
        summary: "not-summary",
        repairPlan: "not-plan",
        meta: { proofSnapshot: 12 },
      },
    });
    expect(result.coverage_by).toBe("req");
    expect(result.coverage_requirement_count).toBe(0);
    expect(result.coverage_proven_count).toBe(0);
    expect(result.coverage_receipt_gaps).toEqual([]);
    expect(result.coverage_receipt_gaps_truncated).toBe(false);
    expect(result.coverage_scope_complete).toBeUndefined();
    expect(result.coverage_proof_snapshot).toBeUndefined();
  });

  test("kb_coverage truncates receipt gaps and normalizes unknown requirement ids", () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      id: index === 0 ? 99 : `ZZZ-${String(index).padStart(3, "0")}`,
      proofGaps: ["missing_proof_receipt", "stale_proof_receipt", 12],
      proofStages:
        index % 2 === 0
          ? { passingE2e: "not-record" }
          : {
              passingE2e: {
                missingReceiptTests: ["TEST-A", "TEST-A"],
                staleReceiptTests: ["TEST-B"],
              },
            },
    }));
    const result = deriveDiagnosticFields(
      "kb_coverage",
      { by: "symbol" },
      null,
      { structuredContent: { rows } },
    );
    expect(result.coverage_by).toBe("symbol");
    expect(result.coverage_receipt_gap_total).toBe(51);
    expect(result.coverage_receipt_gaps_truncated).toBe(true);
    expect((result.coverage_receipt_gaps as unknown[]).length).toBe(50);
    expect(
      (result.coverage_receipt_gaps as Array<{ requirementId: string }>).some(
        (gap) => gap.requirementId === "unknown",
      ),
    ).toBe(true);
  });

  test("kb_suggest_predicates and mutation tools tolerate incomplete payloads", () => {
    const predicates = deriveDiagnosticFields(
      "kb_suggest_predicates",
      {},
      null,
      {
        structuredContent: {
          candidates: [{ score: "high" }, "skip"],
          recommendedAction: 1,
          relationshipPlan: "nope",
        },
      },
    );
    expect(predicates.predicate_candidate_count).toBe(2);
    expect(predicates.predicate_top_name).toBeUndefined();
    expect(predicates.predicate_top_score).toBeUndefined();
    expect(predicates.predicate_recommended_action).toBeUndefined();
    expect(predicates.predicate_relationship_plan).toBe(false);
    expect(predicates.result_summary).toBe("2 predicate candidates");

    const validate = deriveDiagnosticFields(
      "kb_validate_upsert",
      { properties: { title: "X" } },
      null,
      {
        structuredContent: {
          valid: false,
          semanticAdvisor: "not-a-receipt",
        },
      },
    );
    expect(validate.validation_valid).toBe(false);
    expect(validate.mutation_target).toBe("unknown:unknown");
    expect(validate.result_summary).toBe("upsert payload invalid");

    const upsert = deriveDiagnosticFields(
      "kb_upsert",
      { type: "req", id: "REQ-1" },
      null,
      {
        structuredContent: {
          created: 1,
          contradictionCheck: "skip",
          semanticAdvisor: {
            suggestions: [{ kind: 1 }, { other: true }, { kind: "gap" }],
            suggested_next_tools: "not-array",
            inventory_contract: { source_hash: 12 },
          },
        },
      },
    );
    expect(upsert.semantic_suggestion_kinds).toEqual(["gap"]);
    expect(upsert.semantic_next_tools).toEqual([]);
    expect(upsert.semantic_source_hash).toBeUndefined();
    expect(upsert.result_summary).toBe("kb_upsert completed");
  });

  test("initializeDiagnosticMode defaults to the process-argv flag and can isolate logs", () => {
    const previousWorkspace = process.env.KIBI_WORKSPACE;
    const previousUsageLog = process.env.KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH;
    const previousMode = process.env.KIBI_MCP_DIAGNOSTIC_MODE;
    const workspaceRoot = mkdtempSync(
      path.join(tmpdir(), "kibi-mcp-diag-remaining-"),
    );
    restorers.push(() => {
      rmSync(workspaceRoot, { recursive: true, force: true });
      restoreEnv("KIBI_WORKSPACE", previousWorkspace);
      restoreEnv("KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH", previousUsageLog);
      restoreEnv("KIBI_MCP_DIAGNOSTIC_MODE", previousMode);
    });
    process.env.KIBI_WORKSPACE = workspaceRoot;
    initializeDiagnosticMode();
    appendUsageLogLine({ tool: "kb_status" });
    expect(process.env.KIBI_MCP_DIAGNOSTIC_MODE).toBe("0");
    expect(existsSync(path.join(workspaceRoot, ".kb", "usage.log"))).toBe(
      false,
    );

    const isolated = path.join(workspaceRoot, "isolated.log");
    process.env.KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH = isolated;
    initializeDiagnosticMode(true);
    appendUsageLogLine({ tool: "kb_query" });
    expect(readFileSync(isolated, "utf8")).toContain("kb_query");
  });

  test("classifies rare contradiction and timeout messages without captured ids", () => {
    const contradiction = classifyDiagnosticError(
      new Error("contradiction detected for requirement"),
    );
    expect(contradiction).toMatchObject({
      error_category: "semantic_contradiction",
      semantic_outcome: "conflict-blocked",
    });
    expect(contradiction.semantic_checked_req_id).toBeUndefined();
    expect(contradiction.semantic_conflicting_req_ids).toBeUndefined();

    expect(
      classifyDiagnosticError(new Error("tool timeout while waiting")).error_category,
    ).toBe("tool_timeout");
    expect(
      classifyDiagnosticError(
        new Error("Status execution module load failed without option help"),
      ).error_category,
    ).toBe("prolog_module_load_failed");
  });

  test("records coverage snapshots, predicate tops, and updated upsert readiness", () => {
    const coverage = deriveDiagnosticFields(
      "kb_coverage",
      { by: "req" },
      { confidence_score: 0.2, attempt_number: 1 },
      {
        structuredContent: {
          kibiProtocol: 1,
          effects: "not-array",
          data: {
            rows: [
              {
                id: "REQ-1",
                proofGaps: ["missing_proof_receipt"],
                proofStages: {
                  passingE2e: { missingReceiptTests: ["TEST-1"] },
                },
              },
            ],
            summary: { total: 1, proofProven: 0, proofMissing: 1 },
            repairPlan: { scope: { complete: true } },
            meta: { proofSnapshot: "snap-1" },
          },
        },
      },
    );
    expect(coverage.coverage_scope_complete).toBe(true);
    expect(coverage.coverage_proof_snapshot).toBe("snap-1");
    expect(coverage.effect_failures).toEqual([]);

    const predicates = deriveDiagnosticFields(
      "kb_suggest_predicates",
      {},
      null,
      {
        structuredContent: {
          candidates: [{ predicate_name: "held_out", score: 0.9 }],
          recommendedAction: "apply",
          relationshipPlan: { from: "REQ-1" },
        },
      },
    );
    expect(predicates.result_summary).toBe(
      "1 predicate candidates; top=held_out",
    );
    expect(predicates.predicate_top_score).toBe(0.9);
    expect(predicates.predicate_relationship_plan).toBe(true);

    const upsert = deriveDiagnosticFields(
      "kb_upsert",
      { type: "req", id: "REQ-2" },
      null,
      {
        structuredContent: {
          created: 0,
          updated: 1,
          contradictionCheck: {
            outcome: "no-conflict",
            checked_req_id: "REQ-2",
            strict_readiness: "ready",
            subject_key: "auth",
            property_key: "timeout",
          },
          semanticAdvisor: { logic_readiness: "ready", candidate_lane: "strict" },
        },
      },
    );
    expect(upsert.result_summary).toBe("upsert updated; semantic ready");
    expect(upsert.semantic_contradiction_outcome).toBe("no-conflict");
    expect(upsert.semantic_strict_readiness).toBe("ready");
    expect(upsert.semantic_subject_key).toBe("auth");
    expect(upsert.semantic_property_key).toBe("timeout");
  });
});
