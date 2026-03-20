import { describe, expect, test } from "bun:test";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
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
    expect(result.entity.status).toBe("open");
    expect(result.entity.priority).toBe("high");
    expect(result.entity.owner).toBe("security-team");
    expect(result.entity.tags).toEqual([
      "authentication",
      "security",
      "phase-1",
    ]);
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

  test("formats FrontmatterError with hint and original error", () => {
    const error = new FrontmatterError("Broken frontmatter", "/tmp/test.md", {
      classification: "Syntax Error",
      hint: "Fix the YAML block.",
      originalError: "unexpected end of stream",
    });

    expect(error.toString()).toContain(
      "/tmp/test.md: [Syntax Error] Broken frontmatter",
    );
    expect(error.toString()).toContain("How to fix:\n- Fix the YAML block.");
    expect(error.toString()).toContain(
      "Original error: unexpected end of stream",
    );
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
      "---\nstatus: open\ntype: req\n---\n# Content without title",
    );

    expect(() => extractFromMarkdown(tempFile)).toThrow(FrontmatterError);
    expect(() => extractFromMarkdown(tempFile)).toThrow(
      "Missing required field: title",
    );

    unlinkSync(tempFile);
  });

  test("provides default values for missing fields", () => {
    const tempFile = "/tmp/test-defaults.md";
    writeFileSync(
      tempFile,
      "---\ntitle: Minimal Document\ntype: req\n---\n# Content",
    );

    const result = extractFromMarkdown(tempFile);
    expect(result.entity.status).toBe("open");
    expect(result.entity.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.entity.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    unlinkSync(tempFile);
  });

  test("uses type-specific default statuses", () => {
    const scenarioFile = "/tmp/scenarios/test-default-scenario.md";
    mkdirSync("/tmp/scenarios", { recursive: true });
    writeFileSync(scenarioFile, "---\ntitle: Minimal Scenario\n---\n# Content");

    const testFile = "/tmp/tests/test-default-test.md";
    mkdirSync("/tmp/tests", { recursive: true });
    writeFileSync(testFile, "---\ntitle: Minimal Test\n---\n# Content");

    const adrFile = "/tmp/adr/test-default-adr.md";
    mkdirSync("/tmp/adr", { recursive: true });
    writeFileSync(adrFile, "---\ntitle: Minimal ADR\n---\n# Content");

    try {
      expect(extractFromMarkdown(scenarioFile).entity.status).toBe("draft");
      expect(extractFromMarkdown(testFile).entity.status).toBe("pending");
      expect(extractFromMarkdown(adrFile).entity.status).toBe("proposed");
    } finally {
      unlinkSync(scenarioFile);
      unlinkSync(testFile);
      unlinkSync(adrFile);
    }
  });

  describe("Embedded Entity Detection", () => {
    test("rejects requirement with embedded scenarios array", () => {
      const tempFile = "/tmp/requirements/test-embedded-scenarios.md";
      mkdirSync("/tmp/requirements", { recursive: true });
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
      mkdirSync("/tmp/requirements", { recursive: true });
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
      mkdirSync("/tmp/requirements", { recursive: true });
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
      mkdirSync("/tmp/scenarios", { recursive: true });
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
      expect(result.relationships).toEqual([
        {
          type: "relates_to",
          from: "SCEN-001",
          to: "REQ-001",
        },
      ]);

      unlinkSync(tempFile);
    });

    test("allows separate test files with links", () => {
      const tempFile = "/tmp/tests/test-valid-test.md";
      mkdirSync("/tmp/tests", { recursive: true });
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
      expect(result.relationships).toEqual([
        {
          type: "relates_to",
          from: "TEST-001",
          to: "REQ-001",
        },
      ]);

      unlinkSync(tempFile);
    });

    test("extracts mixed string and typed links from markdown", () => {
      const tempFile = "/tmp/requirements/test-mixed-links.md";
      mkdirSync("/tmp/requirements", { recursive: true });
      writeFileSync(
        tempFile,
        `---
id: REQ-001
title: Mixed links requirement
links:
  - SCEN-001
  - type: verified_by
    target: TEST-001
---
# Content
`,
      );

      try {
        const result = extractFromMarkdown(tempFile);
        expect(result.relationships).toEqual([
          {
            type: "relates_to",
            from: "REQ-001",
            to: "SCEN-001",
          },
          {
            type: "verified_by",
            from: "REQ-001",
            to: "TEST-001",
          },
        ]);
      } finally {
        unlinkSync(tempFile);
      }
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

    test("detectEmbeddedEntities detects scalar string scenario fields", () => {
      const result = detectEmbeddedEntities(
        { given: "user is logged in" },
        "req",
      );
      expect(result).toContain("scenario");
    });

    test("detectEmbeddedEntities detects scalar string test fields", () => {
      const result = detectEmbeddedEntities(
        { tests: "some test description" },
        "req",
      );
      expect(result).toContain("test");
    });
  });
});
