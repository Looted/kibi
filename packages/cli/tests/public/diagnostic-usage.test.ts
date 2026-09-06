import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  appendCliDiagnosticUsage,
  deriveDiagnosticUsageFields,
  diagnosticMutationFingerprint,
} from "../../src/public/diagnostic-usage.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("diagnosticMutationFingerprint", () => {
  test("canonicalizes nested args and drops diagnostic telemetry", () => {
    const left = diagnosticMutationFingerprint({
      type: "req",
      id: "REQ-1",
      nested: { b: 2, a: 1 },
      tags: ["z", "a"],
      _diagnostic_telemetry: { ignored: true },
    });
    const right = diagnosticMutationFingerprint({
      _diagnostic_telemetry: { other: true },
      nested: { a: 1, b: 2 },
      tags: ["z", "a"],
      id: "REQ-1",
      type: "req",
    });
    expect(left).toBe(right);
    expect(left).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("deriveDiagnosticUsageFields", () => {
  test("unwraps MCP structuredContent and CLI protocol envelopes", () => {
    const mcp = deriveDiagnosticUsageFields(
      "kb_query",
      {},
      null,
      { structuredContent: { count: 0 } },
    );
    expect(mcp).toMatchObject({
      telemetry_status: "missing",
      result_count: 0,
      zero_results: true,
      result_summary: "0 results",
    });

    const cli = deriveDiagnosticUsageFields(
      "kb_search",
      {},
      { is_autonomous: true, session_id: "s1", actor_id: "a1" },
      {
        kibiProtocol: 1,
        data: {
          kibiProtocol: 1,
          resultVersion: "kibi.search.v1",
          status: "ok",
          count: 3,
          effects: [{ status: "failed" }, "skip", { status: "ok" }],
        },
      },
    );
    expect(cli).toMatchObject({
      telemetry_status: "provided",
      session_id: "s1",
      actor_id: "a1",
      protocol_version: 1,
      result_version: "kibi.search.v1",
      result_status: "ok",
      result_count: 3,
      zero_results: false,
      unsafe_original_retry: false,
    });
    expect(cli.effect_failures).toEqual([{ status: "failed" }]);
  });

  test("summarizes check, coverage, semantic, and mutation tools", () => {
    expect(
      deriveDiagnosticUsageFields("kb_check", { rules: ["required-fields"] }, null, {
        count: 2,
      }),
    ).toMatchObject({
      violation_count: 2,
      requested_rules: ["required-fields"],
      result_summary: "2 violations",
    });

    const coverage = deriveDiagnosticUsageFields(
      "kb_coverage",
      { by: "symbol" },
      null,
      {
        summary: { total: 2, proofProven: 1, proofMissing: 1 },
        rows: [
          {
            id: "REQ-2",
            proofGaps: ["missing_proof_receipt", "other"],
            proofStages: {
              passingE2e: { missingReceiptTests: ["TEST-2"] },
            },
          },
          {
            id: "REQ-1",
            proofGaps: ["stale_proof_receipt"],
            proofStages: "invalid",
          },
          { id: 1, proofGaps: [] },
        ],
        repairPlan: { scope: { complete: false } },
      },
    );
    expect(coverage).toMatchObject({
      coverage_by: "symbol",
      coverage_proven_count: 1,
      coverage_receipt_gap_count: 2,
      coverage_scope_complete: false,
    });
    expect(coverage.coverage_receipt_gaps).toEqual([
      {
        requirementId: "REQ-1",
        testIds: [],
        codes: ["stale_proof_receipt"],
      },
      {
        requirementId: "REQ-2",
        testIds: ["TEST-2"],
        codes: ["missing_proof_receipt"],
      },
    ]);

    const advisor = deriveDiagnosticUsageFields(
      "kb_semantic_advisor",
      {},
      null,
      {
        receipt: {
          inventory_contract: { source_hash: "abc" },
          logic_readiness: "ready",
          candidate_lane: "strict",
        },
      },
    );
    expect(advisor).toMatchObject({
      semantic_source_hash: "abc",
      semantic_logic_readiness: "ready",
      semantic_candidate_lane: "strict",
    });

    const upsert = deriveDiagnosticUsageFields(
      "kb_upsert",
      { type: "req", id: "REQ-1" },
      { followed_next_actions: ["kb_check"], unsafe_original_retry: true },
      {
        kibiProtocol: 1,
        data: {
          kibiProtocol: 1,
          semanticAdvisor: { logic_readiness: "blocked" },
        },
      },
    );
    expect(upsert.mutation_target).toBe("req:REQ-1");
    expect(upsert.unsafe_original_retry).toBe(true);

    const validate = deriveDiagnosticUsageFields(
      "kb_validate_upsert",
      { type: "fact" },
      null,
      { valid: true, semanticAdvisor: { candidate_lane: "predicate" } },
    );
    expect(validate).toMatchObject({
      mutation_target: "fact:unknown",
      validation_valid: true,
      semantic_candidate_lane: "predicate",
    });

    expect(
      deriveDiagnosticUsageFields("kb_graph", {}, null, "plain"),
    ).toMatchObject({ result_summary: "kb_graph completed" });
  });
});

describe("appendCliDiagnosticUsage", () => {
  test("writes a JSONL usage row with derived fields", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-diag-usage-"));
    tempDirs.push(dir);
    const logPath = path.join(dir, "nested", "usage.log");
    appendCliDiagnosticUsage({
      workspaceRoot: dir,
      tool: "kb_check",
      businessArgs: { rules: [] },
      telemetry: null,
      startedAt: new Date("2026-09-05T00:00:00.000Z"),
      finishedAt: new Date("2026-09-05T00:00:01.000Z"),
      status: "error",
      error: "boom",
      logPath,
    });
    const row = JSON.parse(readFileSync(logPath, "utf8")) as Record<
      string,
      unknown
    >;
    expect(row).toMatchObject({
      tool: "kb_check",
      interface: "cli_json",
      status: "error",
      error_message: "boom",
      duration_ms: 1000,
      violation_count: 0,
    });
  });
});
