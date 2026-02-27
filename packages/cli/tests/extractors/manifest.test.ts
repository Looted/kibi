import { describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ManifestError,
  extractFromManifest,
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
    status: defined
    tags: [logging, io]
  - id: symbol-auth-service
    title: Auth service
    source: https://example.com/symbols/auth-service
    status: defined
    tags: [auth]
`;
    const filePath = setupTestFile("test-manifest.yaml", yaml);

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(2);
    expect(results[0].entity.type).toBe("symbol");
    expect(results[0].entity.title).toBe("IO logger");
    expect(results[0].entity.status).toBe("defined");
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
    status: defined
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

    expect(relationships).toHaveLength(3);
    expect(relationships[0].type).toBe("implements");
    expect(relationships[0].from).toBe(results[0].entity.id);
    expect(relationships[0].to).toBe("REQ-001");

    expect(relationships[1].type).toBe("covered_by");
    expect(relationships[1].to).toBe("TEST-042");

    expect(relationships[2].type).toBe("relates_to");
    expect(relationships[2].to).toBe("REQ-002");

    cleanup();
  });

  test("generates consistent content-based IDs", () => {
    const yaml = `
symbols:
  - id: symbol-auth-service
    title: Auth service
    source: https://example.com/symbols/auth-service
    status: defined
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

    expect(entity.status).toBe("draft");
    expect(entity.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entity.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entity.tags).toBeUndefined();

    cleanup();
  });

  test("throws ManifestError when title is missing", () => {
    const yaml = `
symbols:
  - source: https://example.com/no-title
    status: defined
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

    expect(relationships).toHaveLength(4);
    expect(relationships[0].type).toBe("implements");
    expect(relationships[1].type).toBe("constrained_by");
    expect(relationships[2].type).toBe("publishes");
    expect(relationships[3].type).toBe("consumes");

    cleanup();
  });
});
