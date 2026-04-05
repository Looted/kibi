/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, test } from "bun:test";
import {
  deriveDiagnosticFields,
  extractToolCallPayload,
} from "../src/diagnostics.js";

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

describe("extractToolCallPayload", () => {
  test("extracts business args and null telemetry when not present", () => {
    const args = { key1: "value1", key2: "value2" };
    const result = extractToolCallPayload(args);

    expect(result.businessArgs).toEqual({ key1: "value1", key2: "value2" });
    expect(result.telemetry).toBeNull();
  });

  test("extracts telemetry from _diagnostic_telemetry field", () => {
    const args = {
      key1: "value1",
      _diagnostic_telemetry: { is_autonomous: true, confidence_score: 0.9 },
    };
    const result = extractToolCallPayload(args);

    expect(result.businessArgs).toEqual({ key1: "value1" });
    expect(result.telemetry).toEqual({
      is_autonomous: true,
      confidence_score: 0.9,
    });
  });

  test("handles empty args", () => {
    const result = extractToolCallPayload({});
    expect(result.businessArgs).toEqual({});
    expect(result.telemetry).toBeNull();
  });

  test("filters out _diagnostic_telemetry from business args", () => {
    const args = {
      _diagnostic_telemetry: {},
      other: "value",
    };
    const result = extractToolCallPayload(args);

    expect(result.businessArgs).toEqual({ other: "value" });
    expect(result.businessArgs).not.toHaveProperty("_diagnostic_telemetry");
  });

  test("handles non-object telemetry", () => {
    const args = {
      key: "value",
      _diagnostic_telemetry: "invalid",
    };
    const result = extractToolCallPayload(args);

    expect(result.telemetry).toBeNull();
  });

  test("preserves all business args except telemetry", () => {
    const args = {
      a: 1,
      b: "two",
      c: [3],
      d: { nested: true },
      _diagnostic_telemetry: {},
    };
    const result = extractToolCallPayload(args);

    expect(result.businessArgs).toEqual({
      a: 1,
      b: "two",
      c: [3],
      d: { nested: true },
    });
  });
});
