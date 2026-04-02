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
  createKbMissingDiagnostic,
  formatDiagnosticsForMcp,
  formatSyncSummary,
} from "../src/diagnostics.js";

describe("formatSyncSummary", () => {
  test("formats empty summary", () => {
    const result = formatSyncSummary({
      branch: "main",
      timestamp: "2024-01-01T00:00:00Z",
      entityCounts: {},
      relationshipCount: 0,
      success: true,
      published: true,
      failures: [],
    });
    expect(typeof result).toBe("string");
    expect(result).toContain("Sync Summary");
  });

  test("formats summary with entities", () => {
    const result = formatSyncSummary({
      branch: "main",
      timestamp: "2024-01-01T00:00:00Z",
      entityCounts: { req: 5, test: 3 },
      relationshipCount: 10,
      success: true,
      published: true,
      failures: [],
    });
    expect(result).toContain("5");
    expect(result).toContain("10");
  });
});

describe("formatDiagnosticsForMcp", () => {
  test("formats empty diagnostics array", () => {
    const result = formatDiagnosticsForMcp([]);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  test("formats single diagnostic", () => {
    const diagnostics = [
      {
        category: "SYNC_ERROR" as const,
        severity: "error" as const,
        message: "Test error message",
        file: "test.md",
      },
    ];
    const result = formatDiagnosticsForMcp(diagnostics);
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty("category");
    expect(result[0]).toHaveProperty("message");
  });

  test("formats multiple diagnostics", () => {
    const diagnostics = [
      {
        category: "SYNC_ERROR" as const,
        severity: "error" as const,
        message: "Error 1",
      },
      {
        category: "EXTRACTION_ERROR" as const,
        severity: "warning" as const,
        message: "Warning 1",
      },
    ];
    const result = formatDiagnosticsForMcp(diagnostics);
    expect(result.length).toBe(2);
  });
});

describe("createKbMissingDiagnostic", () => {
  test("creates diagnostic for missing KB", () => {
    const result = createKbMissingDiagnostic("main", "/path/to/.kb");
    expect(result).toHaveProperty("severity");
    expect(result).toHaveProperty("message");
    expect(result.severity).toBe("warning");
    expect(result.category).toBe("KB_MISSING");
  });

  test("includes branch in message", () => {
    const result = createKbMissingDiagnostic("feature/test", "/path");
    expect(result.message).toContain("feature/test");
  });

  test("includes suggestion", () => {
    const result = createKbMissingDiagnostic("main", "/path/to/.kb");
    expect(result.suggestion).toBeTruthy();
    expect(result.suggestion?.length).toBeGreaterThan(0);
  });
});
