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
