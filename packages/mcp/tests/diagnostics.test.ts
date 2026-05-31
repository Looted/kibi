/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import {
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  extractToolCallPayload,
  initializeDiagnosticMode,
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

describe.serial("diagnostic mode lifecycle", () => {
  const originalArgv = [...process.argv];
  const originalEnv = { ...process.env };
  let workspaceRoot = "";

  beforeEach(() => {
    workspaceRoot = mkdtempSync(
      path.join(tmpdir(), "kibi-mcp-diagnostics-test-"),
    );
    process.argv = [...originalArgv];
    process.env = {
      ...originalEnv,
      KIBI_WORKSPACE: workspaceRoot,
      KIBI_MCP_DIAGNOSTIC_MODE: undefined,
    };
    initializeDiagnosticMode(false);
  });

  afterEach(() => {
    initializeDiagnosticMode(false);
    process.argv = [...originalArgv];
    process.env = { ...originalEnv };
    if (workspaceRoot) {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("initializeDiagnosticMode sets diagnostic env and usage log path", () => {
    const entry = { tool: "kb_query", count: 1 };

    initializeDiagnosticMode(true);
    appendUsageLogLine(entry);

    const logPath = path.join(workspaceRoot, ".kb", "usage.log");

    expect(process.env.KIBI_MCP_DIAGNOSTIC_MODE).toBe("1");
    expect(existsSync(logPath)).toBe(true);
    expect(readFileSync(logPath, "utf8")).toBe(`${JSON.stringify(entry)}\n`);
  });

  test("appendUsageLogLine is a no-op when diagnostic mode is disabled", () => {
    initializeDiagnosticMode(false);
    appendUsageLogLine({ tool: "kb_status" });

    expect(process.env.KIBI_MCP_DIAGNOSTIC_MODE).toBeUndefined();
    expect(existsSync(path.join(workspaceRoot, ".kb", "usage.log"))).toBe(
      false,
    );
  });
});
