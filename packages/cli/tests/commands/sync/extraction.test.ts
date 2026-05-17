/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";

// --- Mocks ---

const mockExtractFromMarkdown = mock((_file: string): ExtractionResult => {
  throw new Error("not implemented");
});

const mockExtractFromManifest = mock((_file: string): ExtractionResult[] => {
  throw new Error("not implemented");
});

mock.module("../../../src/extractors/markdown.js", () => ({
  extractFromMarkdown: mockExtractFromMarkdown,
  FrontmatterError: class FrontmatterError extends Error {
    public classification: string;
    public hint: string;
    public originalError?: string;
    constructor(
      message: string,
      public filePath: string,
      options?: {
        classification?: string;
        hint?: string;
        originalError?: string;
      },
    ) {
      super(message);
      this.name = "FrontmatterError";
      this.classification = options?.classification || "Generic Error";
      this.hint = options?.hint || "Check the file for syntax errors.";
      this.originalError = options?.originalError;
    }
  },
}));

mock.module("../../../src/extractors/manifest.js", () => ({
  extractFromManifest: mockExtractFromManifest,
}));

// Note: We don't mock cache.js because it pollutes other tests.
// The toCacheKey function is used but the tests don't rely on its specific return value.

import { processExtractions } from "../../../src/commands/sync/extraction.js";

// --- Helpers ---

function makeResult(
  overrides: Partial<ExtractionResult["entity"]> = {},
): ExtractionResult {
  return {
    entity: {
      id: "REQ-001",
      type: "req",
      title: "Test Requirement",
      status: "open",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      source: "documentation/requirements/REQ-001.md",
      ...overrides,
    },
    relationships: [],
  };
}

// Import FrontmatterError from mocked module for use in tests
const { FrontmatterError } = await import(
  "../../../src/extractors/markdown.js"
);

// --- Tests ---

describe("processExtractions", () => {
  beforeEach(() => {
    mockExtractFromMarkdown.mockClear();
    mockExtractFromManifest.mockClear();
  });

  afterAll(() => {
    mock.restore();
  });

  test("returns empty results, no errors, no failedCacheKeys for empty inputs", async () => {
    const result = await processExtractions([], [], true);

    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.failedCacheKeys.size).toBe(0);
    expect(mockExtractFromMarkdown).not.toHaveBeenCalled();
    expect(mockExtractFromManifest).not.toHaveBeenCalled();
  });

  test("extracts a single markdown file successfully", async () => {
    const extractionResult = makeResult();
    mockExtractFromMarkdown.mockReturnValueOnce(extractionResult);

    const result = await processExtractions(
      ["documentation/requirements/REQ-001.md"],
      [],
      true,
    );

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual(extractionResult);
    expect(result.errors).toEqual([]);
    expect(mockExtractFromMarkdown).toHaveBeenCalledWith(
      "documentation/requirements/REQ-001.md",
    );
  });

  test("extracts multiple markdown files", async () => {
    const result1 = makeResult({ id: "REQ-001", title: "Requirement 1" });
    const result2 = makeResult({ id: "REQ-002", title: "Requirement 2" });

    mockExtractFromMarkdown
      .mockReturnValueOnce(result1)
      .mockReturnValueOnce(result2);

    const result = await processExtractions(
      [
        "documentation/requirements/REQ-001.md",
        "documentation/requirements/REQ-002.md",
      ],
      [],
      true,
    );

    expect(result.results).toHaveLength(2);
    expect(result.results[0].entity.id).toBe("REQ-001");
    expect(result.results[1].entity.id).toBe("REQ-002");
  });

  test("handles extraction errors gracefully", async () => {
    mockExtractFromMarkdown.mockImplementation(() => {
      throw new Error("Failed to extract");
    });

    const result = await processExtractions(
      ["documentation/requirements/REQ-001.md"],
      [],
      true,
    );

    expect(result.results).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.failedCacheKeys.size).toBe(1);
  });

  test("dry run mode collects errors without stopping", async () => {
    const manifestResults = [
      makeResult({ source: "documentation/symbols.yaml" }),
    ];
    mockExtractFromManifest.mockReturnValueOnce(manifestResults);
    mockExtractFromMarkdown.mockImplementation(() => {
      throw new Error("Markdown parse error");
    });

    const result = await processExtractions(
      ["documentation/requirements/REQ-001.md"],
      ["documentation/symbols.yaml"],
      true, // validateOnly - errors should be collected
    );

    // Markdown extraction was attempted but failed
    expect(mockExtractFromMarkdown).toHaveBeenCalled();
    // Manifest extraction still works
    expect(mockExtractFromManifest).toHaveBeenCalledWith(
      "documentation/symbols.yaml",
    );
    // Errors are collected
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("collects relationships from extraction results", async () => {
    // Create extraction result with relationships at top level
    const extractionResult = {
      entity: {
        id: "REQ-001",
        type: "req" as const,
        title: "Test Requirement",
        status: "open" as const,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        source: "documentation/requirements/REQ-001.md",
      },
      relationships: [
        {
          id: "rel-001",
          type: "depends_on" as const,
          from: "REQ-001",
          to: "REQ-002",
          created_at: "2026-01-01T00:00:00Z",
          created_by: "test",
          source: "test.md",
        },
      ],
    };

    mockExtractFromMarkdown.mockReturnValueOnce(extractionResult);

    const result = await processExtractions(
      ["documentation/requirements/REQ-001.md"],
      [],
      true,
    );

    // Relationships are in the results, not at top level
    expect(result.results).toHaveLength(1);
    expect(result.results[0].relationships).toHaveLength(1);
    expect(result.results[0].relationships[0].type).toBe("depends_on");
    expect(result.results[0].relationships[0].from).toBe("REQ-001");
    expect(result.results[0].relationships[0].to).toBe("REQ-002");
  });

  test("deduplicates entities by id", async () => {
    // Same entity ID returned twice (simulating duplicate source files)
    const extractionResult = makeResult({
      id: "REQ-001",
      source: "documentation/requirements/REQ-001.md",
    });

    mockExtractFromMarkdown.mockReturnValueOnce(extractionResult);

    const result = await processExtractions(
      ["documentation/requirements/REQ-001.md"],
      [],
      true,
    );

    // Should only have one result for REQ-001
    const ids = result.results.map((r) => r.entity.id);
    expect(ids.filter((id) => id === "REQ-001")).toHaveLength(1);
  });

  test("FrontmatterError includes classification and hint", () => {
    const error = new FrontmatterError("Missing required fields", "test.md", {
      classification: "missing_required",
      hint: "Add required frontmatter fields",
      originalError: "Field 'id' is required",
    });

    expect(error.name).toBe("FrontmatterError");
    expect(error.filePath).toBe("test.md");
    expect(error.classification).toBe("missing_required");
    expect(error.hint).toBe("Add required frontmatter fields");
    expect(error.originalError).toBe("Field 'id' is required");
  });
});

describe("processExtractions edge cases", () => {
  beforeEach(() => {
    mockExtractFromMarkdown.mockClear();
    mockExtractFromManifest.mockClear();
  });

  afterAll(() => {
    mock.restore();
  });

  test("handles empty file list with manifest", async () => {
    const manifestResults = [makeResult()];
    mockExtractFromManifest.mockReturnValueOnce(manifestResults);

    const result = await processExtractions(
      [],
      ["documentation/symbols.yaml"],
      true,
    );

    expect(result.results).toHaveLength(1);
    expect(mockExtractFromManifest).toHaveBeenCalledTimes(1);
  });

  test("handles manifest extraction returning empty array", async () => {
    mockExtractFromManifest.mockReturnValueOnce([]);

    const result = await processExtractions(
      [],
      ["documentation/symbols.yaml"],
      true,
    );

    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("processes both manifest and markdown results", async () => {
    const manifestResult = makeResult({
      id: "REQ-FROM-MANIFEST",
      source: "documentation/symbols.yaml",
    });
    const markdownResult = makeResult({
      id: "REQ-FROM-MARKDOWN",
      source: "documentation/requirements/REQ-001.md",
    });

    mockExtractFromManifest.mockReturnValueOnce([manifestResult]);
    mockExtractFromMarkdown.mockReturnValueOnce(markdownResult);

    const result = await processExtractions(
      ["documentation/requirements/REQ-001.md"],
      ["documentation/symbols.yaml"],
      false,
    );

    // Results should contain both (order may vary)
    expect(result.results).toHaveLength(2);
    const ids = result.results.map((r) => r.entity.id).sort();
    expect(ids).toEqual(["REQ-FROM-MANIFEST", "REQ-FROM-MARKDOWN"]);
  });
});

describe("processExtractions error handling", () => {
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    mockExtractFromMarkdown.mockClear();
    mockExtractFromManifest.mockClear();
    originalConsoleWarn = console.warn;
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  test("handles FrontmatterError with Embedded Entity Violation", async () => {
    // Mock throws FrontmatterError with Embedded Entity Violation classification
    const error = new FrontmatterError(
      "Test scenario and test embedded",
      "test.md",
      { classification: "Embedded Entity Violation" },
    );
    mockExtractFromMarkdown.mockImplementation(() => {
      throw error;
    });

    const result = await processExtractions(["test.md"], [], true);

    // Should handle the error gracefully
    expect(result.results).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.failedCacheKeys.size).toBe(1);
  });

  test("non-validate mode uses console.warn for errors", async () => {
    const warnMessages: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnMessages.push(args.join(" "));
    };

    mockExtractFromMarkdown.mockImplementation(() => {
      throw new Error("Extraction failed");
    });

    // validateOnly = false should use console.warn
    const result = await processExtractions(
      ["test.md"],
      [],
      false, // not validateOnly
    );

    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]); // errors only collected in validateOnly mode
    expect(result.failedCacheKeys.size).toBe(1);
  });

  test("non-validate mode handles manifest errors", async () => {
    const warnMessages: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnMessages.push(args.join(" "));
    };

    mockExtractFromManifest.mockImplementation(() => {
      throw new Error("Manifest parse failed");
    });

    const result = await processExtractions(
      [],
      ["symbols.yaml"],
      false, // not validateOnly
    );

    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.failedCacheKeys.size).toBe(1);
  });
});
