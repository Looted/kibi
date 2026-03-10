import { describe, expect, test } from "bun:test";
import { unlinkSync, writeFileSync } from "node:fs";
import {
  FrontmatterError,
  detectEmbeddedEntities,
  extractFromMarkdown,
  inferTypeFromPath,
} from "../../src/extractors/markdown";

describe("Markdown Extractor", () => {
  describe("Type Inference", () => {
    test("infers type from path for all supported directories", () => {
      const cases = [
        { path: "/path/to/requirements/REQ-001.md", expected: "req" },
        { path: "/path/to/scenarios/SCEN-001.md", expected: "scenario" },
        { path: "/path/to/tests/TEST-001.md", expected: "test" },
        { path: "/path/to/adr/ADR-001.md", expected: "adr" },
        { path: "/path/to/flags/FLAG-001.md", expected: "flag" },
        { path: "/path/to/events/EVT-001.md", expected: "event" },
        { path: "/path/to/facts/FACT-001.md", expected: "fact" },
      ];

      for (const { path, expected } of cases) {
        expect(inferTypeFromPath(path)).toBe(expected);
      }
    });

    test("returns null for paths without type indicators", () => {
      expect(inferTypeFromPath("/path/to/other/doc.md")).toBe(null);
      expect(inferTypeFromPath("/requirements-doc.md")).toBe(null);
    });

    test("handles nested paths correctly", () => {
      expect(inferTypeFromPath("/src/requirements/nested/doc.md")).toBe("req");
    });

    test("prioritizes types based on check order", () => {
      // The implementation checks in this order: requirements, scenarios, tests, adr, flags, events, facts
      // So /requirements/scenarios/ should be 'req'
      expect(inferTypeFromPath("/requirements/scenarios/doc.md")).toBe("req");

      // /scenarios/requirements/ should also be 'req' because includes("/requirements/") is checked first
      expect(inferTypeFromPath("/scenarios/requirements/doc.md")).toBe("req");

      // /tests/scenarios/ should be 'scenario' because includes("/scenarios/") is checked before includes("/tests/")
      expect(inferTypeFromPath("/tests/scenarios/doc.md")).toBe("scenario");
    });
  });

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

  test("diagnoses unquoted colon in title", () => {
    const tempFile = "/tmp/test-unquoted-colon.md";
    writeFileSync(tempFile, "---\ntitle: Foo: Bar\n---\n# Content");

    try {
      extractFromMarkdown(tempFile);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(FrontmatterError);
      const fe = error as FrontmatterError;
      expect(fe.classification).toBe("Unquoted colon likely in title");
      expect(fe.hint).toContain("Wrap values containing colons in quotes");
    } finally {
      unlinkSync(tempFile);
    }
  });

  test("diagnoses missing closing delimiter", () => {
    const tempFile = "/tmp/test-missing-closing.md";
    writeFileSync(tempFile, "---\ntitle: Foo\n# Content");

    try {
      extractFromMarkdown(tempFile);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(FrontmatterError);
      const fe = error as FrontmatterError;
      expect(fe.classification).toBe("Missing closing ---");
      expect(fe.hint).toContain("Ensure the frontmatter is enclosed");
    } finally {
      unlinkSync(tempFile);
    }
  });

  test("diagnoses generic YAML mapping error", () => {
    const tempFile = "/tmp/test-mapping-error.md";
    writeFileSync(tempFile, "---\ntitle: Foo\nkey: [unclosed\n---\n# Content");

    try {
      extractFromMarkdown(tempFile);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(FrontmatterError);
      const fe = error as FrontmatterError;
      expect(fe.classification).toBe("Generic YAML mapping error");
      expect(fe.hint).toContain("Check for unclosed brackets");
    } finally {
      unlinkSync(tempFile);
    }
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

  test("extracts supersedes relationship from ADR frontmatter", () => {
    const tempFile = "/tmp/test-supersedes.md";
    writeFileSync(
      tempFile,
      `---
id: ADR-010
title: New Decision
type: adr
status: active
links:
  - type: supersedes
    target: ADR-005
---
# Content
`,
    );

    const result = extractFromMarkdown(tempFile);
    expect(result.relationships).toBeInstanceOf(Array);
    expect(result.relationships.length).toBe(1);
    expect(result.relationships[0].type).toBe("supersedes");
    expect(result.relationships[0].to).toBe("ADR-005");

    unlinkSync(tempFile);
  });

  describe("Embedded Entity Detection", () => {
    test("rejects requirement with embedded scenarios array", () => {
      const tempFile = "/tmp/requirements/test-embedded-scenarios.md";
      writeFileSync(
        tempFile,
        `---
id: REQ-001
title: Some requirement
scenarios:
  - Given: user is logged in
    When: they click X
    Then: Y happens
---
# Content
`,
      );

      try {
        extractFromMarkdown(tempFile);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(FrontmatterError);
        const fe = error as FrontmatterError;
        expect(fe.classification).toBe("Embedded Entity Violation");
        expect(fe.message).toContain("Invalid embedded entity");
        expect(fe.message).toContain("scenario");
      } finally {
        unlinkSync(tempFile);
      }
    });

    test("rejects requirement with embedded tests array", () => {
      const tempFile = "/tmp/requirements/test-embedded-tests.md";
      writeFileSync(
        tempFile,
        `---
id: REQ-001
title: Some requirement
tests:
  - name: test 1
    expected: result
---
# Content
`,
      );

      try {
        extractFromMarkdown(tempFile);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(FrontmatterError);
        const fe = error as FrontmatterError;
        expect(fe.classification).toBe("Embedded Entity Violation");
        expect(fe.message).toContain("Invalid embedded entity");
        expect(fe.message).toContain("test");
      } finally {
        unlinkSync(tempFile);
      }
    });

    test("rejects requirement with embedded steps array", () => {
      const tempFile = "/tmp/requirements/test-embedded-steps.md";
      writeFileSync(
        tempFile,
        `---
id: REQ-001
title: Some requirement
steps:
  - given: user is logged in
    when: they click X
    then: Y happens
---
# Content
`,
      );

      try {
        extractFromMarkdown(tempFile);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(FrontmatterError);
        const fe = error as FrontmatterError;
        expect(fe.classification).toBe("Embedded Entity Violation");
        expect(fe.message).toContain("scenario");
      } finally {
        unlinkSync(tempFile);
      }
    });

    test("allows separate scenario files with links", () => {
      const tempFile = "/tmp/scenarios/test-valid-scenario.md";
      writeFileSync(
        tempFile,
        `---
id: SCEN-001
title: Scenario for REQ-001
links:
  - REQ-001
---
# Content
`,
      );

      const result = extractFromMarkdown(tempFile);
      expect(result.entity.id).toBe("SCEN-001");
      expect(result.entity.type).toBe("scenario");
      expect(result.relationships.length).toBeGreaterThan(0);

      unlinkSync(tempFile);
    });

    test("allows separate test files with links", () => {
      const tempFile = "/tmp/tests/test-valid-test.md";
      writeFileSync(
        tempFile,
        `---
id: TEST-001
title: Test for REQ-001
links:
  - REQ-001
---
# Content
`,
      );

      const result = extractFromMarkdown(tempFile);
      expect(result.entity.id).toBe("TEST-001");
      expect(result.entity.type).toBe("test");
      expect(result.relationships.length).toBeGreaterThan(0);

      unlinkSync(tempFile);
    });

    test("detectEmbeddedEntities returns empty for non-req types", () => {
      const data = { scenarios: [{ given: "test" }] };
      const result = detectEmbeddedEntities(data, "scenario");
      expect(result).toEqual([]);
    });

    test("detectEmbeddedEntities returns empty when no embedded entities", () => {
      const data = { title: "Test", status: "open" };
      const result = detectEmbeddedEntities(data, "req");
      expect(result).toEqual([]);
    });

    test("detectEmbeddedEntities detects both scenario and test fields", () => {
      const data = {
        scenarios: [{ given: "test" }],
        tests: [{ name: "test" }],
      };
      const result = detectEmbeddedEntities(data, "req");
      expect(result).toContain("scenario");
      expect(result).toContain("test");
    });
  });
});
