import { describe, expect, test } from "bun:test";
import { unlinkSync, writeFileSync } from "node:fs";
import {
  FrontmatterError,
  extractFromMarkdown,
} from "../../src/extractors/markdown";

describe("Markdown Extractor", () => {
  test("extracts requirement from markdown", () => {
    const result = extractFromMarkdown(
      "packages/cli/tests/fixtures/requirements/REQ-001.md",
    );
    expect(result.entity.type).toBe("req");
    expect(result.entity.id).toMatch(/^[0-9a-f]{16}$/);
    expect(result.entity.title).toBe("User Authentication");
    expect(result.entity.status).toBe("approved");
    expect(result.entity.priority).toBe("high");
    expect(result.entity.owner).toBe("security-team");
    expect(result.entity.tags).toEqual([
      "authentication",
      "security",
      "phase-1",
    ]);
  });

  test("extracts relationships from frontmatter", () => {
    const result = extractFromMarkdown(
      "packages/cli/tests/fixtures/scenarios/SCEN-001.md",
    );
    expect(result.relationships).toBeInstanceOf(Array);
    expect(result.relationships.length).toBeGreaterThan(0);
    expect(result.relationships[0]).toHaveProperty("type");
    expect(result.relationships[0]).toHaveProperty("from");
    expect(result.relationships[0]).toHaveProperty("to");
    expect(result.relationships[0].type).toBe("specified_by");
    expect(result.relationships[0].to).toBe("REQ-001");
  });

  test("infers type from directory path", () => {
    const result = extractFromMarkdown(
      "packages/cli/tests/fixtures/adr/ADR-001.md",
    );
    expect(result.entity.type).toBe("adr");
  });

  test("handles malformed frontmatter gracefully", () => {
    const tempFile = "/tmp/test-invalid-frontmatter.md";
    writeFileSync(tempFile, "---\ninvalid: [unclosed\n---\n# Title");

    expect(() => extractFromMarkdown(tempFile)).toThrow(FrontmatterError);

    unlinkSync(tempFile);
  });

  test("generates consistent IDs", () => {
    const result1 = extractFromMarkdown(
      "packages/cli/tests/fixtures/requirements/REQ-001.md",
    );
    const result2 = extractFromMarkdown(
      "packages/cli/tests/fixtures/requirements/REQ-001.md",
    );
    expect(result1.entity.id).toBe(result2.entity.id);
  });

  test("extracts all entity fields", () => {
    const result = extractFromMarkdown(
      "packages/cli/tests/fixtures/requirements/REQ-001.md",
    );
    expect(result.entity).toHaveProperty("id");
    expect(result.entity).toHaveProperty("title");
    expect(result.entity).toHaveProperty("status");
    expect(result.entity).toHaveProperty("created_at");
    expect(result.entity).toHaveProperty("updated_at");
    expect(result.entity).toHaveProperty("source");
    expect(result.entity.source).toBe(
      "packages/cli/tests/fixtures/requirements/REQ-001.md",
    );
  });

  test("handles missing required title field", () => {
    const tempFile = "/tmp/test-missing-title.md";
    writeFileSync(
      tempFile,
      "---\nstatus: draft\ntype: req\n---\n# Content without title",
    );

    expect(() => extractFromMarkdown(tempFile)).toThrow(FrontmatterError);
    expect(() => extractFromMarkdown(tempFile)).toThrow(
      "Missing required field: title",
    );

    unlinkSync(tempFile);
  });

  test("handles string links format", () => {
    const tempFile = "/tmp/test-string-links.md";
    writeFileSync(
      tempFile,
      '---\ntitle: Test\ntype: req\nlinks:\n  - "TARGET-001"\n  - "TARGET-002"\n---\n# Test',
    );

    const result = extractFromMarkdown(tempFile);
    expect(result.relationships.length).toBe(2);
    expect(result.relationships[0].type).toBe("relates_to");
    expect(result.relationships[0].to).toBe("TARGET-001");
    expect(result.relationships[1].to).toBe("TARGET-002");

    unlinkSync(tempFile);
  });

  test("provides default values for missing fields", () => {
    const tempFile = "/tmp/test-defaults.md";
    writeFileSync(
      tempFile,
      "---\ntitle: Minimal Document\ntype: req\n---\n# Content",
    );

    const result = extractFromMarkdown(tempFile);
    expect(result.entity.status).toBe("draft");
    expect(result.entity.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.entity.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    unlinkSync(tempFile);
  });
});
