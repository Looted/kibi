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
  branchErrorToDiagnostic,
  createDocsNotIndexedDiagnostic,
  createInvalidAuthoringDiagnostic,
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

// implements REQ-cli-sync-summary-kb-totals
test("an incremental sync shows the KB totals beside what it imported", () => {
  const result = formatSyncSummary({
    branch: "main",
    timestamp: "2024-01-01T00:00:00Z",
    entityCounts: { req: 1 },
    storeTotals: { entities: { fact: 240, req: 43 }, relationships: 512 },
    relationshipCount: 2,
    success: true,
    published: true,
    failures: [],
  });
  expect(result).toContain(
    "KB Totals: 283 entities\n  fact: 240\n  req: 43\nKB Relationships: 512\nImported This Sync (changed sources only): 1 entities, 2 distinct relationships\n  req: 1\n",
  );
  expect(result).not.toContain("Entity Counts:");
});

test("formats summary with commit", () => {
  const result = formatSyncSummary({
    branch: "main",
    commit: "abc1234",
    timestamp: "2024-01-01T00:00:00Z",
    entityCounts: { req: 1 },
    relationshipCount: 1,
    success: true,
    published: true,
    failures: [],
  });
  expect(result).toContain("abc1234");
});

test("formats summary with duration", () => {
  const result = formatSyncSummary({
    branch: "main",
    timestamp: "2024-01-01T00:00:00Z",
    entityCounts: {},
    relationshipCount: 0,
    success: true,
    published: true,
    failures: [],
    durationMs: 1234,
  });
  expect(result).toContain("1234ms");
});

test("formats summary with failures", () => {
  const result = formatSyncSummary({
    branch: "main",
    timestamp: "2024-01-01T00:00:00Z",
    entityCounts: {},
    relationshipCount: 0,
    success: false,
    published: false,
    failures: [
      {
        category: "BRANCH_RESOLUTION_FAILURE" as const,
        severity: "error" as const,
        message: "Failed to resolve branch",
        suggestion: "Set KIBI_BRANCH",
      },
    ],
  });
  expect(result).toContain("Failures (1)");
  expect(result).toContain("BRANCH_RESOLUTION_FAILURE");
  expect(result).toContain("Suggestion: Set KIBI_BRANCH");
});

test("formats failure with file", () => {
  const result = formatSyncSummary({
    branch: "main",
    timestamp: "2024-01-01T00:00:00Z",
    entityCounts: {},
    relationshipCount: 0,
    success: false,
    published: false,
    failures: [
      {
        category: "EXTRACTION_ERROR" as const,
        severity: "warning" as const,
        message: "Parse error",
        file: "docs/REQ-001.md",
      },
    ],
  });
  expect(result).toContain("File: docs/REQ-001.md");
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

describe("branchErrorToDiagnostic", () => {
  const branchErrorCodes = [
    "DETACHED_HEAD",
    "UNBORN_BRANCH",
    "GIT_NOT_AVAILABLE",
    "NOT_A_GIT_REPO",
    "ENV_OVERRIDE",
    "UNKNOWN_ERROR",
  ] as const;

  test("creates branch diagnostics for all error codes when branch is provided", () => {
    for (const code of branchErrorCodes) {
      const message = `problem for ${code}`;
      const branch = `feature/${code.toLowerCase()}`;
      const result = branchErrorToDiagnostic(code, message, branch);

      expect(result.category).toBe("BRANCH_RESOLUTION_FAILURE");
      expect(result.severity).toBe("error");
      expect(result.message).toContain(message);
      expect(result.suggestion).toContain(branch);
    }
  });

  test("mentions KIBI_BRANCH when branch is not provided", () => {
    for (const code of branchErrorCodes) {
      const message = `problem for ${code}`;
      const result = branchErrorToDiagnostic(code, message);

      expect(result.category).toBe("BRANCH_RESOLUTION_FAILURE");
      expect(result.severity).toBe("error");
      expect(result.message).toContain(message);
      expect(result.suggestion).toContain("KIBI_BRANCH");
    }
  });
});

describe("createDocsNotIndexedDiagnostic", () => {
  test("creates warning diagnostic with counts and sync suggestion", () => {
    const result = createDocsNotIndexedDiagnostic(12, 7);

    expect(result.category).toBe("DOCS_NOT_INDEXED");
    expect(result.severity).toBe("warning");
    expect(result.message).toContain("12");
    expect(result.message).toContain("7");
    expect(result.suggestion).toContain("kibi sync --validate-only");
  });
});

describe("createInvalidAuthoringDiagnostic", () => {
  test("creates invalid authoring diagnostic for a single embedded type", () => {
    const filePath = ".kb/requirements/REQ-001.md";
    const result = createInvalidAuthoringDiagnostic(filePath, ["scenario"]);

    expect(result.category).toBe("INVALID_AUTHORING");
    expect(result.severity).toBe("error");
    expect(result.file).toBe(filePath);
    expect(result.message).toContain("scenario");
    expect(result.suggestion).toContain("Move scenario");
    expect(result.suggestion).toContain("separate entity files");
  });

  test("creates invalid authoring diagnostic for multiple embedded types", () => {
    const filePath = ".kb/requirements/REQ-002.md";
    const result = createInvalidAuthoringDiagnostic(filePath, [
      "scenario",
      "test",
    ]);

    expect(result.category).toBe("INVALID_AUTHORING");
    expect(result.severity).toBe("error");
    expect(result.file).toBe(filePath);
    expect(result.message).toContain("scenario and test");
    expect(result.suggestion).toContain("Move scenario and test");
    expect(result.suggestion).toContain("separate entity files");
  });
});

describe("diagnostic wording contracts", () => {
  test("branch failures name the detected branch or explain how to set one", () => {
    expect(
      branchErrorToDiagnostic("DETACHED_HEAD", "HEAD is detached"),
    ).toEqual({
      category: "BRANCH_RESOLUTION_FAILURE",
      severity: "error",
      message: "Failed to resolve active branch: HEAD is detached",
      suggestion:
        "Set KIBI_BRANCH environment variable or ensure you're in a git repository with a valid checked-out branch.",
    });
    expect(
      branchErrorToDiagnostic("AMBIGUOUS_ATTACHMENT", "two stores", "main"),
    ).toEqual({
      category: "BRANCH_RESOLUTION_FAILURE",
      severity: "error",
      message: "Failed to resolve active branch: two stores",
      suggestion:
        "Detected branch: main. Set KIBI_BRANCH environment variable to explicitly specify the branch.",
    });
    expect(
      branchErrorToDiagnostic("UNKNOWN_ERROR", "boom", "").suggestion,
    ).toStartWith("Set KIBI_BRANCH environment variable or ensure");
  });

  test("a missing KB names the branch and the path sync will create", () => {
    expect(createKbMissingDiagnostic("main", ".kb/branches/main")).toEqual({
      category: "KB_MISSING",
      severity: "warning",
      message: "Branch KB does not exist for 'main'",
      suggestion: "Run 'kibi sync' to create the KB at .kb/branches/main",
    });
  });

  test("unindexed docs report both counts", () => {
    expect(createDocsNotIndexedDiagnostic(12, 7)).toEqual({
      category: "DOCS_NOT_INDEXED",
      severity: "warning",
      message: "12 markdown files found but only 7 entities in KB",
      suggestion:
        "Some documents may have extraction errors. Run 'kibi sync --validate-only' to check.",
    });
  });

  test("embedded authoring names every embedded type", () => {
    expect(
      createInvalidAuthoringDiagnostic("REQ-002.md", ["scenario", "test"]),
    ).toEqual({
      category: "INVALID_AUTHORING",
      severity: "error",
      message: "Requirement contains embedded scenario and test fields",
      file: "REQ-002.md",
      suggestion:
        "Move scenario and test to separate entity files and link them using 'links' with relationship types like 'specified_by' or 'verified_by'.",
    });
  });

  test("MCP diagnostics keep optional fields only when present", () => {
    expect(
      formatDiagnosticsForMcp([
        {
          category: "SYNC_ERROR",
          severity: "error",
          message: "bare",
        },
        {
          category: "EXTRACTION_ERROR",
          severity: "warning",
          message: "full",
          file: "a.md",
          suggestion: "fix it",
        },
        {
          category: "RELATIONSHIP_ERROR",
          severity: "error",
          message: "empty strings",
          file: "",
          suggestion: "",
        },
      ]),
    ).toEqual([
      { category: "SYNC_ERROR", severity: "error", message: "bare" },
      {
        category: "EXTRACTION_ERROR",
        severity: "warning",
        message: "full",
        file: "a.md",
        suggestion: "fix it",
      },
      {
        category: "RELATIONSHIP_ERROR",
        severity: "error",
        message: "empty strings",
        file: "",
        suggestion: "",
      },
    ]);
    const [bare] = formatDiagnosticsForMcp([
      { category: "SYNC_ERROR", severity: "error", message: "bare" },
    ]);
    expect(Object.keys(bare ?? {})).toEqual([
      "category",
      "severity",
      "message",
    ]);
  });
});

describe("formatSyncSummary output", () => {
  const base = {
    branch: "main",
    timestamp: "2024-01-01T00:00:00Z",
    relationshipCount: 3,
  };

  test("a full sync without store totals lists sorted entity counts", () => {
    expect(
      formatSyncSummary({
        ...base,
        commit: "0123456789abcdef",
        entityCounts: { test: 2, adr: 1, req: 4 },
        success: true,
        published: true,
        failures: [],
        durationMs: 0,
      }),
    ).toBe(
      [
        "═══ Sync Summary ═══",
        "Branch: main",
        "Commit: 01234567",
        "Timestamp: 2024-01-01T00:00:00Z",
        "",
        "Entity Counts:",
        "  adr: 1",
        "  req: 4",
        "  test: 2",
        "Total Relationships: 3",
        "",
        "Status: ✓ Success",
        "Published: Yes",
        "Duration: 0ms",
        "═══ End Summary ═══",
      ].join("\n"),
    );
  });

  test("a failed sync lists each failure with its file and suggestion", () => {
    expect(
      formatSyncSummary({
        ...base,
        commit: "",
        entityCounts: {},
        success: false,
        published: false,
        failures: [
          {
            category: "SYNC_ERROR",
            severity: "error",
            message: "store locked",
            file: "",
            suggestion: "",
          },
          {
            category: "EXTRACTION_ERROR",
            severity: "warning",
            message: "bad front matter",
            file: "docs/a.md",
            suggestion: "fix the YAML",
          },
        ],
      }),
    ).toBe(
      [
        "═══ Sync Summary ═══",
        "Branch: main",
        "Timestamp: 2024-01-01T00:00:00Z",
        "",
        "Entity Counts:",
        "  (none)",
        "Total Relationships: 3",
        "",
        "Status: ✗ Failed",
        "Published: No",
        "",
        "Failures (2):",
        "  [SYNC_ERROR] ERROR: store locked",
        "  [EXTRACTION_ERROR] WARNING: bad front matter",
        "    File: docs/a.md",
        "    Suggestion: fix the YAML",
        "═══ End Summary ═══",
      ].join("\n"),
    );
  });

  test("store totals sum every type and show an empty import", () => {
    expect(
      formatSyncSummary({
        ...base,
        entityCounts: {},
        storeTotals: { entities: { req: 2, adr: 5 }, relationships: 9 },
        success: true,
        published: false,
        failures: [],
      }),
    ).toBe(
      [
        "═══ Sync Summary ═══",
        "Branch: main",
        "Timestamp: 2024-01-01T00:00:00Z",
        "",
        "KB Totals: 7 entities",
        "  adr: 5",
        "  req: 2",
        "KB Relationships: 9",
        "Imported This Sync (changed sources only): 0 entities, 3 distinct relationships",
        "  (none)",
        "",
        "Status: ✓ Success",
        "Published: No",
        "═══ End Summary ═══",
      ].join("\n"),
    );
  });

  test("imported counts are summed across types", () => {
    const result = formatSyncSummary({
      ...base,
      entityCounts: { req: 2, adr: 3 },
      storeTotals: { entities: {}, relationships: 0 },
      success: true,
      published: true,
      failures: [],
    });
    expect(result).toContain(
      "KB Totals: 0 entities\n  (none)\nKB Relationships: 0\nImported This Sync (changed sources only): 5 entities, 3 distinct relationships\n  adr: 3\n  req: 2\n",
    );
  });
});
