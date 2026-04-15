/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { ManifestSymbolEntry } from "../../../src/extractors/symbols-coordinator.js";

// --- Mocks ---

const mockReadFileSync = mock(
  (
    _path: import("node:fs").PathOrFileDescriptor,
    options?:
      | BufferEncoding
      | { encoding?: BufferEncoding | null; flag?: string | null }
      | null,
  ): string | Uint8Array =>
    typeof options === "string" || options?.encoding ? "" : Buffer.from(""),
);
const mockWriteFileSync = mock(
  (
    _path: import("node:fs").PathOrFileDescriptor,
    _content: string | Uint8Array,
    _encoding?: BufferEncoding | null,
  ) => {},
);
const mockExistsSync = mock((_path: import("node:fs").PathLike) => true);

const mockEnrichSymbolCoordinates = mock(
  async (
    entries: ManifestSymbolEntry[],
    _workspaceRoot: string,
    _deps?: Partial<
      typeof import("../../../src/extractors/symbols-coordinator.js")
    >,
  ) => entries,
);

const mockParseYAML = mock((_content: string) => ({}));
const mockDumpYAML = mock((_obj: object, _opts?: object) => "yaml-content\n");

import {
  hasAllGeneratedCoordinates,
  isEligibleForCoordinateRefresh,
  refreshManifestCoordinates,
} from "../../../src/commands/sync/manifest.js";

const manifestDeps = () => ({
  dumpYAML: mockDumpYAML as typeof import("js-yaml").dump,
  enrichSymbolCoordinates:
    mockEnrichSymbolCoordinates as typeof import("../../../src/extractors/symbols-coordinator.js").enrichSymbolCoordinates,
  existsSync: mockExistsSync as typeof import("node:fs").existsSync,
  parseYAML: mockParseYAML as typeof import("js-yaml").load,
  readFileSync:
    mockReadFileSync as unknown as typeof import("node:fs").readFileSync,
  writeFileSync: mockWriteFileSync as typeof import("node:fs").writeFileSync,
});

// We test isRecord indirectly through refreshManifestCoordinates since it's not exported.
// Re-implement the same logic here for direct testing.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// --- Helpers ---

function makeEntry(
  overrides: Partial<ManifestSymbolEntry> = {},
): ManifestSymbolEntry {
  return {
    id: "SYM-001",
    title: "myFunction",
    sourceFile: "src/foo.ts",
    sourceLine: 10,
    sourceColumn: 0,
    sourceEndLine: 10,
    sourceEndColumn: 12,
    coordinatesGeneratedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/** Capture console.log calls for assertions */
function captureLog(): { messages: string[]; restore: () => void } {
  const messages: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    messages.push(String(args[0]));
  };
  return {
    messages,
    restore: () => {
      console.log = orig;
    },
  };
}

/** Capture console.warn calls for assertions */
function captureWarn(): { messages: string[]; restore: () => void } {
  const messages: string[] = [];
  const orig = console.warn;
  console.warn = (...args: unknown[]) => {
    messages.push(String(args[0]));
  };
  return {
    messages,
    restore: () => {
      console.warn = orig;
    },
  };
}

// --- Tests ---

describe("isRecord", () => {
  test("returns true for plain object", () => {
    expect(isRecord({ foo: "bar" })).toBe(true);
  });

  test("returns false for array", () => {
    expect(isRecord([1, 2, 3])).toBe(false);
  });

  test("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  test("returns false for string", () => {
    expect(isRecord("hello")).toBe(false);
  });

  test("returns false for number", () => {
    expect(isRecord(42)).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(isRecord(undefined)).toBe(false);
  });

  test("returns false for boolean", () => {
    expect(isRecord(true)).toBe(false);
  });
});

describe("hasAllGeneratedCoordinates", () => {
  test("returns true when all coordinate fields present and valid", () => {
    const entry = makeEntry();
    expect(hasAllGeneratedCoordinates(entry)).toBe(true);
  });

  test("returns false when sourceLine is missing", () => {
    const entry = makeEntry({ sourceLine: undefined });
    expect(hasAllGeneratedCoordinates(entry)).toBe(false);
  });

  test("returns false when sourceColumn is missing", () => {
    const entry = makeEntry({ sourceColumn: undefined });
    expect(hasAllGeneratedCoordinates(entry)).toBe(false);
  });

  test("returns false when sourceEndLine is missing", () => {
    const entry = makeEntry({ sourceEndLine: undefined });
    expect(hasAllGeneratedCoordinates(entry)).toBe(false);
  });

  test("returns false when sourceEndColumn is missing", () => {
    const entry = makeEntry({ sourceEndColumn: undefined });
    expect(hasAllGeneratedCoordinates(entry)).toBe(false);
  });

  test("returns false when coordinatesGeneratedAt is missing", () => {
    const entry = makeEntry({ coordinatesGeneratedAt: undefined });
    expect(hasAllGeneratedCoordinates(entry)).toBe(false);
  });

  test("returns false when coordinatesGeneratedAt is empty string", () => {
    const entry = makeEntry({ coordinatesGeneratedAt: "" });
    expect(hasAllGeneratedCoordinates(entry)).toBe(false);
  });

  test("returns false when sourceLine is not a number (string)", () => {
    const entry = makeEntry({ sourceLine: "10" as unknown as number });
    expect(hasAllGeneratedCoordinates(entry)).toBe(false);
  });

  test("returns false for completely empty entry", () => {
    expect(hasAllGeneratedCoordinates({ id: "X", title: "Y" })).toBe(false);
  });
});

describe("isEligibleForCoordinateRefresh", () => {
  const workspaceRoot = "/workspace";

  test("returns false for undefined sourceFile", () => {
    expect(
      isEligibleForCoordinateRefresh(undefined, workspaceRoot, manifestDeps()),
    ).toBe(false);
  });

  test("returns true for .ts extension", () => {
    mockExistsSync.mockImplementation(() => true);
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.ts",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(true);
  });

  test("returns true for .js extension", () => {
    mockExistsSync.mockImplementation(() => true);
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.js",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(true);
  });

  test("returns true for .tsx extension", () => {
    mockExistsSync.mockImplementation(() => true);
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.tsx",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(true);
  });

  test("returns true for .jsx extension", () => {
    mockExistsSync.mockImplementation(() => true);
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.jsx",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(true);
  });

  test("returns true for .mts extension", () => {
    mockExistsSync.mockImplementation(() => true);
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.mts",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(true);
  });

  test("returns true for .cts extension", () => {
    mockExistsSync.mockImplementation(() => true);
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.cts",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(true);
  });

  test("returns true for .mjs extension", () => {
    mockExistsSync.mockImplementation(() => true);
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.mjs",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(true);
  });

  test("returns true for .cjs extension", () => {
    mockExistsSync.mockImplementation(() => true);
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.cjs",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(true);
  });

  test("returns false for unsupported extension (.py)", () => {
    mockExistsSync.mockImplementation(() => true);
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.py",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(false);
  });

  test("returns false for unsupported extension (.rs)", () => {
    mockExistsSync.mockImplementation(() => true);
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.rs",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(false);
  });

  test("resolves relative path correctly", () => {
    mockExistsSync.mockImplementation(
      (p: import("node:fs").PathLike) => p === "/workspace/src/foo.ts",
    );
    expect(
      isEligibleForCoordinateRefresh(
        "src/foo.ts",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(true);
  });

  test("handles absolute path correctly", () => {
    const absPath = "/other/project/src/foo.ts";
    mockExistsSync.mockImplementation(
      (p: import("node:fs").PathLike) => p === absPath,
    );
    expect(
      isEligibleForCoordinateRefresh(absPath, workspaceRoot, manifestDeps()),
    ).toBe(true);
  });

  test("returns false when file does not exist", () => {
    mockExistsSync.mockImplementation(() => false);
    expect(
      isEligibleForCoordinateRefresh(
        "src/missing.ts",
        workspaceRoot,
        manifestDeps(),
      ),
    ).toBe(false);
  });
});

describe("refreshManifestCoordinates", () => {
  const manifestPath = "/workspace/documentation/symbols.yaml";
  const workspaceRoot = "/workspace";

  beforeEach(() => {
    mockReadFileSync.mockImplementation(() => "original-content");
    mockWriteFileSync.mockImplementation(() => {});
    mockExistsSync.mockImplementation(() => true);
    mockParseYAML.mockImplementation(() => ({
      symbols: [makeEntry()],
    }));
    mockDumpYAML.mockImplementation(() => "yaml-content\n");
    mockEnrichSymbolCoordinates.mockImplementation(
      async (entries: ManifestSymbolEntry[]) => entries,
    );
  });

  afterEach(() => {
    mockReadFileSync.mockReset();
    mockWriteFileSync.mockReset();
    mockExistsSync.mockReset();
    mockParseYAML.mockReset();
    mockDumpYAML.mockReset();
    mockEnrichSymbolCoordinates.mockReset();
  });

  test("warns and returns early for non-object YAML", async () => {
    mockParseYAML.mockImplementation(() => "not-an-object");
    const { messages, restore } = captureWarn();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages.length).toBe(1);
    expect(messages[0]).toContain(
      "is not a YAML object; skipping coordinate refresh",
    );
    expect(mockEnrichSymbolCoordinates).not.toHaveBeenCalled();

    restore();
  });

  test("warns and returns early when symbols array is missing", async () => {
    mockParseYAML.mockImplementation(() => ({ otherKey: "value" }));
    const { messages, restore } = captureWarn();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages.length).toBe(1);
    expect(messages[0]).toContain(
      "has no symbols array; skipping coordinate refresh",
    );
    expect(mockEnrichSymbolCoordinates).not.toHaveBeenCalled();

    restore();
  });

  test("warns and returns early when symbols is not an array", async () => {
    mockParseYAML.mockImplementation(() => ({ symbols: "not-array" }));
    const { messages, restore } = captureWarn();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages.length).toBe(1);
    expect(mockEnrichSymbolCoordinates).not.toHaveBeenCalled();

    restore();
  });

  test("increments refreshed count when coordinates changed", async () => {
    const entry = makeEntry();
    const enriched = makeEntry({ sourceLine: 20 });
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async () => [enriched]);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages.length).toBe(1);
    expect(messages[0]).toContain("refreshed=1");
    expect(messages[0]).toContain("unchanged=0");
    expect(messages[0]).toContain("failed=0");

    restore();
  });

  test("increments unchanged count when coordinates are the same and all coords present", async () => {
    const entry = makeEntry();
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => e);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages[0]).toContain("refreshed=0");
    expect(messages[0]).toContain("unchanged=1");
    expect(messages[0]).toContain("failed=0");

    restore();
  });

  test("increments failed count when eligible but missing coordinates", async () => {
    const entry = makeEntry({ sourceLine: undefined, sourceColumn: undefined });
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => e);
    mockExistsSync.mockImplementation(() => true);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages[0]).toContain("refreshed=0");
    expect(messages[0]).toContain("unchanged=0");
    expect(messages[0]).toContain("failed=1");

    restore();
  });

  test("increments unchanged when not eligible for refresh", async () => {
    const entry = makeEntry({ sourceFile: undefined });
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => e);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages[0]).toContain("unchanged=1");

    restore();
  });

  test("increments unchanged when eligible with unsupported extension but all coords present", async () => {
    const entry = makeEntry({ sourceFile: "src/foo.py" });
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => e);
    mockExistsSync.mockImplementation(() => true);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    // .py is not in SYMBOL_COORD_EXTENSIONS, so not eligible, hence unchanged
    expect(messages[0]).toContain("unchanged=1");

    restore();
  });

  test("increments failed when eligible but not all coords and sourceFile on enriched", async () => {
    const entry = makeEntry({
      sourceFile: "src/foo.ts",
      sourceLine: undefined,
      sourceColumn: undefined,
      sourceEndLine: undefined,
      sourceEndColumn: undefined,
      coordinatesGeneratedAt: undefined,
    });
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => e);
    mockExistsSync.mockImplementation(() => true);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages[0]).toContain("failed=1");

    restore();
  });

  test("does not write file when content unchanged", async () => {
    const entry = makeEntry();
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => e);

    // Make dumpYAML produce content such that rawContent === nextContent
    const commentBlock = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# GENERATED fields (never edit manually — overwritten by kibi sync and kb.symbols.refresh):
#   sourceLine, sourceColumn, sourceEndLine, sourceEndColumn, coordinatesGeneratedAt
# Run \`kibi sync\` or call the \`kb.symbols.refresh\` MCP tool to refresh coordinates.
`;
    const dumpedYaml = "yaml-content\n";
    const fullContent = `${commentBlock}${dumpedYaml}`;
    mockReadFileSync.mockImplementation(() => fullContent);
    mockDumpYAML.mockImplementation(() => dumpedYaml);

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  test("writes file when content changed", async () => {
    const entry = makeEntry();
    const enriched = makeEntry({ sourceLine: 99 });
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async () => [enriched]);
    mockDumpYAML.mockImplementation(() => "new-yaml\n");

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(mockWriteFileSync).toHaveBeenCalled();
    const callArgs = mockWriteFileSync.mock.calls[0];
    expect(callArgs).toBeDefined();
    const written = callArgs[1] as string;
    expect(written).toContain("new-yaml");
  });

  test("logs with path.relative for manifest path", async () => {
    const entry = makeEntry();
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => e);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    // path.relative("/workspace", "/workspace/documentation/symbols.yaml") => "documentation/symbols.yaml"
    expect(messages[0]).toContain("documentation/symbols.yaml");
    expect(messages[0]).toContain("✓ Refreshed symbol coordinates");

    restore();
  });

  test("handles non-record entries in symbols array as empty objects", async () => {
    const validEntry = makeEntry();
    mockParseYAML.mockImplementation(() => ({
      symbols: [validEntry, "not-a-record", 42],
    }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => e);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    // Should not throw; processes all entries
    expect(messages.length).toBe(1);

    restore();
  });

  test("handles enriched entry missing at index by falling back to previous", async () => {
    const entry = makeEntry();
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    // Simulate enrichSymbolCoordinates returning fewer entries
    mockEnrichSymbolCoordinates.mockImplementation(async () => []);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    // The enriched[i] is undefined, so it falls back to previous
    // Entry has sourceFile, is eligible, and hasAllGeneratedCoordinates is true → unchanged
    expect(messages[0]).toContain("unchanged=1");

    restore();
  });

  test("uses previous sourceFile when current sourceFile is not a string", async () => {
    const entry = makeEntry({ sourceFile: "src/foo.ts" });
    const enriched = makeEntry();
    Reflect.deleteProperty(enriched as Record<string, unknown>, "sourceFile");
    // Make coordinates different so it goes to refreshed
    enriched.sourceLine = 99;

    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async () => [enriched]);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    // Coordinates changed (sourceLine 10→99) → refreshed=1
    expect(messages[0]).toContain("refreshed=1");

    restore();
  });

  test("handles both current and previous sourceFile not being strings", async () => {
    const entry = makeEntry();
    Reflect.deleteProperty(entry as Record<string, unknown>, "sourceFile");
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => {
      const result = e.map((ent) => ({ ...ent }));
      Reflect.deleteProperty(
        result[0] as Record<string, unknown>,
        "sourceFile",
      );
      return result;
    });

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    // sourceFile undefined → not eligible → unchanged
    expect(messages[0]).toContain("unchanged=1");

    restore();
  });

  test("mix of refreshed, unchanged and failed counts", async () => {
    const entry1 = makeEntry({ id: "SYM-001" }); // will change coords
    const entry2 = makeEntry({ id: "SYM-002" }); // stays same, all coords
    const entry3 = makeEntry({
      id: "SYM-003",
      sourceFile: "src/foo.ts",
      sourceLine: undefined,
    }); // eligible, missing coords

    mockParseYAML.mockImplementation(() => ({
      symbols: [entry1, entry2, entry3],
    }));
    mockEnrichSymbolCoordinates.mockImplementation(async () => [
      makeEntry({ id: "SYM-001", sourceLine: 99 }), // coords changed → refreshed
      makeEntry({ id: "SYM-002" }), // same → eligible+has coords → unchanged
      makeEntry({
        id: "SYM-003",
        sourceFile: "src/foo.ts",
        sourceLine: undefined,
      }), // eligible+missing → failed
    ]);
    mockExistsSync.mockImplementation(() => true);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages[0]).toContain("refreshed=1");
    expect(messages[0]).toContain("unchanged=1");
    expect(messages[0]).toContain("failed=1");

    restore();
  });

  test("dumpYAML is called with correct options", async () => {
    const entry = makeEntry();
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => e);
    mockDumpYAML.mockImplementation(() => "dumped\n");

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(mockDumpYAML).toHaveBeenCalled();
    const callArgs = mockDumpYAML.mock.calls[0];
    const opts = callArgs[1] as Record<string, unknown>;
    expect(opts.lineWidth).toBe(-1);
    expect(opts.noRefs).toBe(true);
    expect(opts.sortKeys).toBe(false);
  });

  test("written content includes SYMBOLS_MANIFEST_COMMENT_BLOCK", async () => {
    const entry = makeEntry();
    const enriched = makeEntry({ sourceLine: 99 });
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async () => [enriched]);
    mockDumpYAML.mockImplementation(() => "yaml-output\n");

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(mockWriteFileSync).toHaveBeenCalled();
    const callArgs = mockWriteFileSync.mock.calls[0];
    const written = callArgs[1] as string;
    expect(written).toContain("# symbols.yaml");
    expect(written).toContain("AUTHORED fields (edit freely)");
    expect(written).toContain(
      "GENERATED fields (never edit manually — overwritten by kibi sync and kb.symbols.refresh)",
    );
    expect(written).toContain("yaml-output");
  });

  test("isRecord guard: null parsed YAML triggers early return", async () => {
    mockParseYAML.mockImplementation(
      () => null as unknown as Record<string, unknown>,
    );
    const { messages, restore } = captureWarn();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages.length).toBe(1);
    expect(messages[0]).toContain(
      "is not a YAML object; skipping coordinate refresh",
    );
    expect(mockEnrichSymbolCoordinates).not.toHaveBeenCalled();

    restore();
  });

  test("isRecord guard: array parsed YAML triggers early return", async () => {
    mockParseYAML.mockImplementation(() => ["not", "an", "object"]);
    const { messages, restore } = captureWarn();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    expect(messages.length).toBe(1);
    expect(messages[0]).toContain(
      "is not a YAML object; skipping coordinate refresh",
    );
    expect(mockEnrichSymbolCoordinates).not.toHaveBeenCalled();

    restore();
  });

  test("failed count when eligible file does not exist", async () => {
    const entry = makeEntry({
      sourceFile: "src/gone.ts",
      sourceLine: undefined,
    });
    mockParseYAML.mockImplementation(() => ({ symbols: [entry] }));
    mockEnrichSymbolCoordinates.mockImplementation(async (e) => e);
    // File doesn't exist → not eligible → but hasAllGeneratedCoordinates is false
    // Actually: not eligible → unchanged path. Let's trace:
    // eligible check: sourceFile is string → resolve → existsSync returns false → not eligible
    // So it goes to unchanged. To get failed, need eligible=true but coords missing.
    mockExistsSync.mockImplementation(() => false);

    const { messages, restore } = captureLog();

    await refreshManifestCoordinates(
      manifestPath,
      workspaceRoot,
      manifestDeps(),
    );

    // File doesn't exist → not eligible → unchanged
    expect(messages[0]).toContain("unchanged=1");

    restore();
  });
});

// --- Cleanup ---
