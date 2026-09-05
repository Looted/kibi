import { describe, expect, test } from "bun:test";

import {
  buildDiagnosticToolCall,
  classifyDiagnosticError,
  deriveDiagnosticHints,
  deriveDiagnosticRetryKey,
  extractToolCallPayload,
  redactDiagnosticArgs,
} from "../src/diagnostics-helpers.js";

describe("diagnostics helpers coverage", () => {
  test("classifies common MCP error families and redacts secrets", () => {
    expect(classifyDiagnosticError(new Error("stale_snapshot")).error_category).toBe(
      "stale_snapshot",
    );
    expect(
      classifyDiagnosticError(new Error("unknown option ... h for help"))
        .error_category,
    ).toBe("prolog_unknown_option");
    expect(
      classifyDiagnosticError(new Error("Prolog process not started"))
        .error_category,
    ).toBe("prolog_process_not_started");
    expect(
      classifyDiagnosticError(new Error("resetting Prolog worker")).error_category,
    ).toBe("prolog_worker_reset");
    expect(
      classifyDiagnosticError(new Error("timed out after 15000ms")).error_category,
    ).toBe("tool_timeout");
    expect(
      classifyDiagnosticError(
        new Error("coarsely while granular symbols are available"),
      ).error_category,
    ).toBe("coarse_symbol_linkage");
    expect(
      classifyDiagnosticError(new Error("Entity validation failed: x"))
        .error_category,
    ).toBe("entity_validation_failed");
    expect(
      classifyDiagnosticError(new Error("Relationship validation failed"))
        .error_category,
    ).toBe("relationship_validation_failed");

    expect(redactDiagnosticArgs({ token: "secret-value", ok: true })).toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect(deriveDiagnosticRetryKey("kb_query", { id: "REQ-1" })).toMatch(
      /^retry_/,
    );
    expect(
      deriveDiagnosticHints({
        tool: "kb_upsert",
        error: new Error("invalid value 'implemented'"),
      }),
    ).toContain("invalid_status");
    expect(
      deriveDiagnosticHints({
        tool: "kb_upsert",
        error: new Error("must NOT have additional properties"),
      }),
    ).toContain("additional_properties");
    expect(
      extractToolCallPayload({
        id: "REQ-1",
        _diagnostic_telemetry: { attempt: 1 },
      }).telemetry,
    ).toEqual({ attempt: 1 });

    const call = buildDiagnosticToolCall({
      tool: "kb_query",
      requestId: "req-1",
      args: { id: "REQ-1", _diagnostic_telemetry: { attempt: 2 } },
      diagnosticPhase: "execute",
      error: new Error("tool timeout"),
    });
    expect(call.canonical_tool).toBe("kb_query");
    expect(call.retry_key).toMatch(/^retry_/);
  });
});
