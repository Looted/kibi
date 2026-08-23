import { describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ManifestError,
  extractFromManifest,
  extractFromManifestString,
  extractManifestSymbolRecordsString,
  readManifestWithCoordinateOverlay,
} from "../../src/extractors/manifest";

const TEST_DIR = join(process.cwd(), "test-tmp");

function setupTestFile(filename: string, content: string): string {
  mkdirSync(TEST_DIR, { recursive: true });
  const filePath = join(TEST_DIR, filename);
  writeFileSync(filePath, content);
  return filePath;
}

function cleanup() {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

describe("manifest extractor", () => {
  test("extracts symbols from YAML manifest", () => {
    const yaml = `
symbols:
  - id: symbol-io-logger
    title: IO logger
    source: https://example.com/symbols/io-logger
    status: active
    tags: [logging, io]
  - id: symbol-auth-service
    title: Auth service
    source: https://example.com/symbols/auth-service
    status: active
    tags: [auth]
`;
    const filePath = setupTestFile("test-manifest.yaml", yaml);

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(2);
    expect(results[0].entity.type).toBe("symbol");
    expect(results[0].entity.title).toBe("IO logger");
    expect(results[0].entity.status).toBe("active");
    expect(results[0].entity.source).toBe(filePath);
    expect(results[0].entity.tags).toEqual(["logging", "io"]);
    expect(results[0].entity.id).toBe("symbol-io-logger");

    expect(results[1].entity.title).toBe("Auth service");
    expect(results[1].entity.tags).toEqual(["auth"]);

    cleanup();
  });

  test("extracts relationships from links array", () => {
    const yaml = `
symbols:
  - id: symbol-auth-service
    title: Auth service
    source: https://example.com/symbols/auth-service
    status: active
    links:
      - type: implements
        target: REQ-001
      - type: covered_by
        target: TEST-042
      - REQ-002
`;
    const filePath = setupTestFile("test-links.yaml", yaml);

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(1);
    const { relationships } = results[0];

    // Should extract 3 relationships: 2 typed + 1 simple string (treated as implements)
    expect(relationships).toHaveLength(3);
    expect(relationships).toContainEqual({
      type: "implements",
      from: expect.any(String),
      to: "REQ-001",
    });
    expect(relationships).toContainEqual({
      type: "covered_by",
      from: expect.any(String),
      to: "TEST-042",
    });
    expect(relationships).toContainEqual({
      type: "implements",
      from: expect.any(String),
      to: "REQ-002",
    });

    cleanup();
  });

  test("extracts typed relationships from manifest strings", () => {
    const results = extractFromManifestString(
      `
symbols:
  - id: symbol-auth-service
    title: Auth service
    sourceFile: src/auth-service.ts
    status: active
    relationships:
      - type: covered_by
        target: TEST-042
      - type: implements
        target: REQ-001
`,
      "src/symbols.yaml",
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      sourceFile: "src/auth-service.ts",
      relationships: [
        {
          type: "covered_by",
          from: "symbol-auth-service",
          to: "TEST-042",
        },
        {
          type: "implements",
          from: "symbol-auth-service",
          to: "REQ-001",
        },
      ],
    });
    expect(results[0]?.entity.source).toBe("src/symbols.yaml");
  });

  test("generates consistent content-based IDs", () => {
    const yaml = `
symbols:
  - id: symbol-auth-service
    title: Auth service
    source: https://example.com/symbols/auth-service
    status: active
`;
    const filePath = setupTestFile("test-id.yaml", yaml);

    const results1 = extractFromManifest(filePath);
    const results2 = extractFromManifest(filePath);

    expect(results1[0].entity.id).toBe(results2[0].entity.id);
    expect(results1[0].entity.id).toBe("symbol-auth-service");

    cleanup();
  });

  test("handles missing optional fields with defaults", () => {
    const yaml = `
symbols:
  - title: Minimal Symbol
    source: https://example.com/minimal
`;
    const filePath = setupTestFile("test-defaults.yaml", yaml);

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(1);
    const { entity } = results[0];

    expect(entity.status).toBe("active");
    expect(entity.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entity.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entity.tags).toBeUndefined();

    cleanup();
  });

  test("throws ManifestError when title is missing", () => {
    const yaml = `
symbols:
  - source: https://example.com/no-title
    status: active
`;
    const filePath = setupTestFile("test-no-title.yaml", yaml);

    expect(() => extractFromManifest(filePath)).toThrow(ManifestError);
    expect(() => extractFromManifest(filePath)).toThrow(
      "Missing required field: title",
    );

    cleanup();
  });

  test("throws ManifestError when symbols array is missing", () => {
    const yaml = `
other_data:
  - title: Not a symbol
`;
    const filePath = setupTestFile("test-no-symbols.yaml", yaml);

    expect(() => extractFromManifest(filePath)).toThrow(ManifestError);
    expect(() => extractFromManifest(filePath)).toThrow(
      "No symbols array found",
    );

    cleanup();
  });

  test("handles multiple relationship types", () => {
    const yaml = `
symbols:
  - title: Complex Symbol
    source: https://example.com/complex
    links:
      - type: implements
        target: REQ-001
      - type: constrained_by
        target: ADR-005
      - type: publishes
        target: EVENT-001
      - type: consumes
        target: EVENT-002
`;
    const filePath = setupTestFile("test-rel-types.yaml", yaml);

    const results = extractFromManifest(filePath);
    const { relationships } = results[0];

    // Should extract all 4 typed relationships
    expect(relationships).toHaveLength(4);
    expect(relationships).toContainEqual({
      type: "implements",
      from: expect.any(String),
      to: "REQ-001",
    });
    expect(relationships).toContainEqual({
      type: "constrained_by",
      from: expect.any(String),
      to: "ADR-005",
    });
    expect(relationships).toContainEqual({
      type: "publishes",
      from: expect.any(String),
      to: "EVENT-001",
    });
    expect(relationships).toContainEqual({
      type: "consumes",
      from: expect.any(String),
      to: "EVENT-002",
    });

    cleanup();
  });

  test("extracts sourceFile field from manifest", () => {
    const yaml = `
symbols:
  - id: symbol-with-sourcefile
    title: Symbol With SourceFile
    sourceFile: src/app.ts
    status: active
    links:
      - REQ-001
`;
    const filePath = setupTestFile("test-sourcefile.yaml", yaml);

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(1);
    expect(results[0].sourceFile).toBe("src/app.ts");

    cleanup();
  });

  test("rejects unsupported relationship types in symbol links", () => {
    const yaml = `
symbols:
  - id: symbol-invalid-rel-type
    title: Invalid Relationship Type
    status: active
    relationships:
      - type: decomposes
        target: REQ-001
`;
    const filePath = setupTestFile("test-invalid-rel-type.yaml", yaml);

    expect(() => extractFromManifest(filePath)).toThrow(ManifestError);
    expect(() => extractFromManifest(filePath)).toThrow(
      'Invalid relationship type "decomposes"',
    );

    cleanup();
  });

  test("rejects invalid relationship direction for specified_by on symbol", () => {
    const yaml = `
symbols:
  - id: SYM-INVALID-SPECIFIED-BY
    title: Invalid specified_by direction
    status: active
    relationships:
      - type: specified_by
        target: REQ-001
`;
    const filePath = setupTestFile("test-invalid-rel-direction.yaml", yaml);

    expect(() => extractFromManifest(filePath)).toThrow(ManifestError);
    expect(() => extractFromManifest(filePath)).toThrow(
      'Invalid relationship direction for "specified_by": symbol -> req',
    );

    cleanup();
  });

  test("extractFromManifest overlays authored entries with coordinate artifact metadata", () => {
    // Legacy (unbound) artifact records are validated against current source
    // content, so point both the manifest and the artifact at a real file.
    const inlineSource = setupTestFile(
      "overlay-src.ts",
      `${Array.from({ length: 9 }, () => "// filler").join("\n")}\n  Symbol With Overlay\n`,
    );
    const yaml = `
symbols:
  - id: symbol-with-overlay
    title: Symbol With Overlay
    sourceFile: ${inlineSource}
    sourceLine: 1
    sourceColumn: 0
    sourceEndLine: 1
    sourceEndColumn: 19
    status: active
`;
    const filePath = setupTestFile("test-overlay-sourcefile.yaml", yaml);
    writeFileSync(
      join(TEST_DIR, "symbol-coordinates.yaml"),
      `coordinates:
  symbol-with-overlay:
    sourceFile: ${inlineSource}
    sourceLine: 10
    sourceColumn: 2
    sourceEndLine: 12
    sourceEndColumn: 21
`,
    );

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(1);
    expect(results[0]?.sourceFile).toBe(inlineSource);

    cleanup();
  });

  test("falls back to source field when sourceFile is missing (legacy)", () => {
    const yaml = `
symbols:
  - id: symbol-with-legacy-source
    title: Symbol With Legacy Source
    source: src/legacy.ts
    status: active
`;
    const filePath = setupTestFile("test-legacy-source.yaml", yaml);

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(1);
    expect(results[0].sourceFile).toBe("src/legacy.ts");

    cleanup();
  });

  test("prefers sourceFile over source when both are present", () => {
    const yaml = `
symbols:
  - id: symbol-with-both
    title: Symbol With Both Fields
    sourceFile: src/correct.ts
    source: src/wrong.ts
    status: active
`;
    const filePath = setupTestFile("test-both-fields.yaml", yaml);

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(1);
    expect(results[0].sourceFile).toBe("src/correct.ts");

    cleanup();
  });

  test("extracts symbol role, kind, coordinates, and ignores malformed link objects", () => {
    const results = extractFromManifestString(
      `symbols:
  - id: SYM-RICH
    title: Rich symbol
    sourceFile: src/rich.ts
    symbol_kind: function
    symbol_role: behavioral
    sourceLine: 10
    sourceColumn: 2
    sourceEndLine: 12
    sourceEndColumn: 4
    links:
      - type: implements
      - target: REQ-MISSING-TYPE
      - null
    relationships:
      - type: executable_for
        target: TEST-RICH
`,
      ".kb/symbols.yaml",
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      entity: {
        id: "SYM-RICH",
        symbol_kind: "function",
        symbol_role: "behavioral",
        sourceLine: 10,
        sourceColumn: 2,
        sourceEndLine: 12,
        sourceEndColumn: 4,
      },
      relationships: [
        { type: "executable_for", from: "SYM-RICH", to: "TEST-RICH" },
      ],
    });
  });

  test("clones manifest symbol records without mutating parsed content", () => {
    const records = extractManifestSymbolRecordsString(
      `symbols:
  - id: SYM-CLONE
    title: Clone
    sourceFile: src/clone.ts
`,
      ".kb/symbols.yaml",
    );

    expect(records).toEqual([
      { id: "SYM-CLONE", title: "Clone", sourceFile: "src/clone.ts" },
    ]);
  });

  test("wraps invalid manifest YAML as ManifestError", () => {
    expect(() =>
      extractFromManifestString("symbols: [", ".kb/symbols.yaml"),
    ).toThrow(ManifestError);
  });

  test("wraps invalid coordinate artifacts as ManifestError", () => {
    const symbolsPath = setupTestFile(
      "explicit-coordinates-symbols.yaml",
      `symbols:
  - id: SYM-COORD
    title: Coord
`,
    );
    const coordinatesPath = setupTestFile(
      "explicit-coordinates.yaml",
      "coordinates: [",
    );

    expect(() =>
      readManifestWithCoordinateOverlay(symbolsPath, coordinatesPath),
    ).toThrow(ManifestError);

    cleanup();
  });
});
