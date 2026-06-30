import { describe, expect, test } from "bun:test";

import {
  buildDiagnosticToolCall,
  deriveDiagnosticHints,
  deriveDiagnosticRetryKey,
  redactDiagnosticArgs,
} from "../src/diagnostics.js";

describe("diagnostic tool call helpers", () => {
  test("builds normalized tool_call objects with redacted raw args", () => {
    const toolCall = buildDiagnosticToolCall({
      tool: "kb_upsert",
      requestId: "req-123",
      args: {
        title: "Example",
        credentials: {
          token: "secret-token",
          nested: { authorization: "Bearer abc" },
        },
        _diagnostic_telemetry: {
          is_autonomous: true,
          attempt_number: 2,
        },
      },
      diagnosticPhase: "validation",
    });

    expect(toolCall).toMatchObject({
      schema_version: 1,
      canonical_tool: "kb_upsert",
      request_id: "req-123",
      business_args: {
        title: "Example",
        credentials: {
          token: "secret-token",
          nested: { authorization: "Bearer abc" },
        },
      },
      diagnostic_telemetry: {
        is_autonomous: true,
        attempt_number: 2,
      },
    });
    expect(toolCall.raw_args_redacted).toMatchObject({
      title: "Example",
      credentials: {
        token: "[REDACTED]",
        nested: { authorization: "[REDACTED]" },
      },
    });
  });

  test("redacts secret-like keys recursively without mutating input", () => {
    const args = {
      token: "secret-token",
      profile: {
        authorization: "Bearer abc",
        nested: [{ apiKey: "key-1" }, { value: "kept" }],
      },
    };

    const redacted = redactDiagnosticArgs(args);

    expect(redacted).toEqual({
      token: "[REDACTED]",
      profile: {
        authorization: "[REDACTED]",
        nested: [{ apiKey: "[REDACTED]" }, { value: "kept" }],
      },
    });
    expect(args.profile.nested[0].apiKey).toBe("key-1");
  });

  test("handles malformed redaction inputs without leaking secrets", () => {
    expect(redactDiagnosticArgs(null)).toBeNull();
    expect(
      redactDiagnosticArgs(["token", { authorization: "Bearer abc" }]),
    ).toEqual(["token", { authorization: "[REDACTED]" }]);
    expect(redactDiagnosticArgs("plain-string")).toBe("plain-string");
  });

  test("derives stable retry keys for semantically identical args", () => {
    const retryKeyA = deriveDiagnosticRetryKey("kb_query", {
      structuredContent: { count: 3 },
      alpha: "one",
      beta: "two",
    });
    const retryKeyB = deriveDiagnosticRetryKey("kb_query", {
      beta: "two",
      alpha: "one",
      structuredContent: { count: 3 },
    });

    expect(retryKeyA).toBe(retryKeyB);
    expect(retryKeyA.startsWith("retry_")).toBe(true);
    expect(retryKeyA.length).toBeGreaterThanOrEqual(20);
  });

  test("derives stable retry keys for malformed inputs", () => {
    expect(deriveDiagnosticRetryKey("kb_query", null)).toBe(
      deriveDiagnosticRetryKey("kb_query", null),
    );
    expect(deriveDiagnosticRetryKey("kb_query", ["a", "b"])).toBe(
      deriveDiagnosticRetryKey("kb_query", ["a", "b"]),
    );
  });

  test("derives deterministic hints for validation and runtime failures", () => {
    expect(
      deriveDiagnosticHints({
        tool: "kb_upsert",
        error: new Error(
          "Entity validation failed: status: invalid value 'implemented'",
        ),
      }),
    ).toContain("invalid_status");

    expect(
      deriveDiagnosticHints({
        tool: "kb_upsert",
        error: new Error(
          "Entity validation failed: additional properties: description",
        ),
      }),
    ).toContain("additional_properties");

    expect(
      deriveDiagnosticHints({
        tool: "kb_upsert",
        error: new Error(
          "Relationship source must match the upserted entity TEST-1; received from=REQ-1",
        ),
      }),
    ).toContain("relationship_source_mismatch");

    expect(
      deriveDiagnosticHints({
        tool: "kb_upsert",
        error: new Error("Tool kb_upsert timed out after 25ms"),
      }),
    ).toContain("tool_timeout");

    expect(
      deriveDiagnosticHints({
        tool: "kb_query",
        error: new Error("Prolog process not started"),
      }),
    ).toContain("prolog_process_not_started");

    expect(
      deriveDiagnosticHints({
        tool: "kb_query",
        error: new Error("Query failed"),
      }),
    ).toContain("query_failed");
  });

  test("derives deterministic hints for semantic contradiction failures", () => {
    expect(
      deriveDiagnosticHints({
        tool: "kb_upsert",
        error: new Error(
          "Upsert execution failed: Contradiction detected for requirement REQ-NEW: conflicts with REQ-OLD",
        ),
      }),
    ).toContain("semantic_contradiction");
  });

  test("builds a tool call from malformed input without exposing raw secrets", () => {
    const toolCall = buildDiagnosticToolCall({
      tool: "kb_query",
      requestId: "req-malformed",
      args: null,
      diagnosticPhase: "success",
    });

    expect(toolCall).toMatchObject({
      canonical_tool: "kb_query",
      request_id: "req-malformed",
      business_args: null,
      raw_args_redacted: null,
    });
  });
});
