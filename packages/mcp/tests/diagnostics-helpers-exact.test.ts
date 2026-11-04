import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  buildDiagnosticToolCall,
  classifyDiagnosticError,
  deriveDiagnosticHints,
  deriveDiagnosticRetryKey,
  extractToolCallPayload,
  redactDiagnosticArgs,
} from "../src/diagnostics-helpers.js";

const CASES: Array<[string, string, string, string]> = [
  [
    "STALE_SNAPSHOT seen",
    "stale_snapshot",
    "persistence",
    "KB snapshot is stale; refresh/retry after the latest KB state is attached.",
  ],
  [
    "Unknown option -x, use -H for help",
    "prolog_unknown_option",
    "prolog_runtime",
    "Prolog rejected startup/module/query options; inspect MCP package wiring and Prolog invocation.",
  ],
  [
    "Prolog process not started yet",
    "prolog_process_not_started",
    "prolog_lifecycle",
    "Prolog process is unavailable; restart the MCP server before retrying.",
  ],
  [
    "Resetting Prolog worker now",
    "prolog_worker_reset",
    "prolog_lifecycle",
    "Prolog worker was reset so the next MCP call can start from a fresh worker.",
  ],
  [
    "after a Prolog worker reset",
    "prolog_worker_reset",
    "prolog_lifecycle",
    "Prolog worker was reset so the next MCP call can start from a fresh worker.",
  ],
  [
    "Tool kb_query TIMED OUT AFTER 5ms",
    "tool_timeout",
    "tool_timeout",
    "MCP tool execution exceeded its bounded timeout.",
  ],
  [
    "a Tool Timeout happened",
    "tool_timeout",
    "tool_timeout",
    "MCP tool execution exceeded its bounded timeout.",
  ],
  [
    "linked Coarsely while granular symbols are available",
    "coarse_symbol_linkage",
    "validation",
    "Symbol traceability targeted a coarse file/module while narrower exported symbols exist.",
  ],
  [
    "Entity validation failed: title",
    "entity_validation_failed",
    "validation",
    "Entity payload failed schema validation.",
  ],
  [
    "Relationship validation failed for x",
    "relationship_validation_failed",
    "validation",
    "Relationship payload failed schema validation.",
  ],
  [
    "Relationship source must match the upserted entity REQ-1",
    "relationship_source_mismatch",
    "validation",
    "Relationship source did not match the entity being upserted.",
  ],
  [
    "Module load failed: x",
    "prolog_module_load_failed",
    "prolog_runtime",
    "Prolog failed to load an execution module.",
  ],
  [
    "the Query Failed",
    "prolog_query_failed",
    "prolog_runtime",
    "Prolog query execution failed.",
  ],
  ["anything else", "handler_error", "handler", "Unhandled MCP handler error."],
];

describe("classifyDiagnosticError, exact", () => {
  for (const [message, category, stage, summary] of CASES) {
    test(`"${message}" is ${category}`, () => {
      const error = new TypeError(message);
      expect(classifyDiagnosticError(error)).toStrictEqual({
        error_name: "TypeError",
        error_message: message,
        error_category: category,
        error_stage: stage,
        error_summary: summary,
      });
    });
  }

  test("the matchers are anchored where they must be", () => {
    const category = (message: string) =>
      classifyDiagnosticError(new Error(message)).error_category;
    expect(category("unknown option only")).toBe("handler_error");
    expect(category("use h for help")).toBe("handler_error");
    expect(category("timed out after ms")).toBe("handler_error");
    expect(category("x Entity validation failed:")).toBe("handler_error");
    expect(category("entity validation failed: x")).toBe("handler_error");
    expect(category("x Relationship validation failed")).toBe("handler_error");
    expect(
      category("x Relationship source must match the upserted entity"),
    ).toBe("handler_error");
  });

  test("a non-error value is wrapped", () => {
    expect(classifyDiagnosticError("query failed")).toStrictEqual({
      error_name: "Error",
      error_message: "query failed",
      error_category: "prolog_query_failed",
      error_stage: "prolog_runtime",
      error_summary: "Prolog query execution failed.",
    });
  });

  test("a contradiction names the checked and conflicting requirements", () => {
    const message =
      "Contradiction detected for requirement REQ-1: Conflicts with REQ-2: x; conflicts with REQ-3";
    expect(classifyDiagnosticError(new Error(message))).toStrictEqual({
      error_name: "Error",
      error_message: message,
      error_category: "semantic_contradiction",
      error_stage: "validation",
      error_summary:
        "Requirement prose/facts contradict existing contradiction-ready requirements.",
      semantic_outcome: "conflict-blocked",
      semantic_checked_req_id: "REQ-1",
      semantic_conflicting_req_ids: ["REQ-2", "REQ-3"],
    });
    expect(
      classifyDiagnosticError(
        new Error("contradiction detected for requirement"),
      ),
    ).toStrictEqual({
      error_name: "Error",
      error_message: "contradiction detected for requirement",
      error_category: "semantic_contradiction",
      error_stage: "validation",
      error_summary:
        "Requirement prose/facts contradict existing contradiction-ready requirements.",
      semantic_outcome: "conflict-blocked",
    });
  });
});

describe("deriveDiagnosticHints, exact", () => {
  const hint = (error: unknown) =>
    deriveDiagnosticHints({ tool: "kb_upsert", error });

  test("payload hints come first", () => {
    expect(hint(new Error("Invalid value 'implemented' for status"))).toBe(
      "invalid_status: use one of the schema-accepted statuses (for example open, active, accepted, passing).",
    );
    expect(hint("must NOT have Additional Properties")).toBe(
      "additional_properties: remove unsupported fields from the payload and retry with schema-only arguments.",
    );
  });

  test("each category has its hint and phase", () => {
    expect(hint(new Error("timed out after 3ms"))).toBe(
      "tool_timeout runtime: retry the same request after reducing payload size or scope.",
    );
    expect(
      hint(new Error("Relationship source must match the upserted entity")),
    ).toBe(
      "relationship_source_mismatch validation: align the relationship source with the upserted entity id.",
    );
    expect(hint(new Error("contradiction detected for requirement R"))).toBe(
      "semantic_contradiction validation: add a supersedes relationship to the conflicting requirement, deprecate the older requirement, or align the modeled facts.",
    );
    expect(hint(new Error("prolog process not started"))).toBe(
      "prolog_process_not_started runtime: restart the MCP server before retrying the tool call.",
    );
    expect(hint(new Error("query failed"))).toBe(
      "prolog_query_failed runtime: inspect the Prolog query or workspace state and retry.",
    );
    expect(hint(new Error("stale_snapshot"))).toBe(
      "stale_snapshot persistence: KB snapshot is stale; refresh/retry after the latest KB state is attached.",
    );
    expect(hint(new Error("prolog worker reset"))).toBe(
      "prolog_worker_reset runtime: Prolog worker was reset so the next MCP call can start from a fresh worker.",
    );
    expect(hint(new Error("unknown option, h for help"))).toBe(
      "prolog_unknown_option runtime: Prolog rejected startup/module/query options; inspect MCP package wiring and Prolog invocation.",
    );
    expect(hint(new Error("Entity validation failed: x"))).toBe(
      "entity_validation_failed validation: Entity payload failed schema validation.",
    );
    expect(hint(new Error("boom"))).toBe(
      "handler_error handler: Unhandled MCP handler error.",
    );
  });
});

describe("redaction and retry keys", () => {
  test("secret-like keys are redacted at any depth", () => {
    expect(
      redactDiagnosticArgs({
        token: "a",
        Secret: 1,
        my_password: "p",
        Authorization: "b",
        api_key: "k",
        "api-key": "k",
        apikey: "k",
        bearerValue: "v",
        safe: "s",
        nested: [{ apiKey: "x", keep: [1, { password: 2 }] }],
      }),
    ).toStrictEqual({
      token: "[REDACTED]",
      Secret: "[REDACTED]",
      my_password: "[REDACTED]",
      Authorization: "[REDACTED]",
      api_key: "[REDACTED]",
      "api-key": "[REDACTED]",
      apikey: "[REDACTED]",
      bearerValue: "[REDACTED]",
      safe: "s",
      nested: [{ apiKey: "[REDACTED]", keep: [1, { password: "[REDACTED]" }] }],
    });
    expect(redactDiagnosticArgs(null)).toBeNull();
    expect(redactDiagnosticArgs("token")).toBe("token");
  });

  test("the retry key hashes the tool and the sorted, redacted arguments", () => {
    const expected = `retry_${createHash("sha256")
      .update("kb_query")
      .update("\0")
      .update('{"a":[{"x":1,"y":2}],"b":1,"token":"[REDACTED]"}')
      .digest("hex")
      .slice(0, 16)}`;
    expect(
      deriveDiagnosticRetryKey("kb_query", {
        token: "t1",
        b: 1,
        a: [{ y: 2, x: 1 }],
      }),
    ).toBe(expected);
    expect(
      deriveDiagnosticRetryKey("kb_query", {
        a: [{ x: 1, y: 2 }],
        token: "t2",
        b: 1,
      }),
    ).toBe(expected);
    expect(deriveDiagnosticRetryKey("kb_search", { b: 1 })).not.toBe(
      deriveDiagnosticRetryKey("kb_query", { b: 1 }),
    );
    expect(deriveDiagnosticRetryKey("ab", "c")).not.toBe(
      deriveDiagnosticRetryKey("a", "bc"),
    );
  });
});

describe("tool call payloads", () => {
  test("telemetry is split from the business arguments", () => {
    expect(
      extractToolCallPayload({ q: 1, _diagnostic_telemetry: { r: "x" } }),
    ).toStrictEqual({ businessArgs: { q: 1 }, telemetry: { r: "x" } });
    expect(
      extractToolCallPayload({ q: 1, _diagnostic_telemetry: "x" }),
    ).toStrictEqual({ businessArgs: { q: 1 }, telemetry: null });
    expect(
      extractToolCallPayload({ _diagnostic_telemetry: null }),
    ).toStrictEqual({ businessArgs: {}, telemetry: null });
  });

  test("a successful call has no error and no hint", () => {
    const args = { q: 1, apiKey: "k", _diagnostic_telemetry: { r: 1 } };
    expect(
      buildDiagnosticToolCall({
        tool: "kb_query",
        requestId: "r1",
        args,
        diagnosticPhase: "success",
      }),
    ).toStrictEqual({
      schema_version: 1,
      canonical_tool: "kb_query",
      request_id: "r1",
      diagnostic_phase: "success",
      business_args: { q: 1, apiKey: "k" },
      raw_args_redacted: {
        q: 1,
        apiKey: "[REDACTED]",
        _diagnostic_telemetry: { r: 1 },
      },
      retry_key: deriveDiagnosticRetryKey("kb_query", args),
      hint: "",
      diagnostic_error: null,
      diagnostic_telemetry: { r: 1 },
    });
  });

  test("a failed call carries its error, hint and given telemetry", () => {
    const call = buildDiagnosticToolCall({
      tool: "kb_query",
      requestId: "r2",
      args: ["not", "an", "object"],
      diagnosticPhase: "handler",
      error: new Error("query failed"),
      telemetry: { given: true },
    });
    expect(call.business_args).toBeNull();
    expect(call.raw_args_redacted).toStrictEqual(["not", "an", "object"]);
    expect(call.hint).toBe(
      "prolog_query_failed runtime: inspect the Prolog query or workspace state and retry.",
    );
    expect(call.diagnostic_error?.error_category).toBe("prolog_query_failed");
    expect(call.diagnostic_telemetry).toStrictEqual({ given: true });
    const bare = buildDiagnosticToolCall({
      tool: "kb_query",
      requestId: "r3",
      args: null,
      diagnosticPhase: "handler",
    });
    expect(bare.business_args).toBeNull();
    expect(bare.diagnostic_telemetry).toBeNull();
  });
});
