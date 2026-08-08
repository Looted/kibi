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
  extractToolCallPayload,
  initializeDiagnosticMode,
} from "../src/diagnostics.js";

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

    expect(process.env.KIBI_MCP_DIAGNOSTIC_MODE).toBe("0");
    expect(existsSync(path.join(workspaceRoot, ".kb", "usage.log"))).toBe(
      false,
    );
  });

  test("uses an explicitly isolated diagnostic receipt path", () => {
    const isolatedPath = path.join(workspaceRoot, "evidence", "verifier.log");
    process.env.KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH = isolatedPath;

    initializeDiagnosticMode(true);
    appendUsageLogLine({ tool: "kb_query", status: "success" });

    expect(existsSync(isolatedPath)).toBe(true);
    expect(readFileSync(isolatedPath, "utf8")).toContain('"tool":"kb_query"');
    expect(existsSync(path.join(workspaceRoot, ".kb", "usage.log"))).toBe(
      false,
    );
  });
});
