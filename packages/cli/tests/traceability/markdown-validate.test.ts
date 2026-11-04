import { describe, expect, it } from "bun:test";
import {
  FrontmatterError,
  extractFromMarkdownString,
} from "../../src/extractors/markdown";
import { validateStagedMarkdown } from "../../src/traceability/markdown-validate";

describe("validateStagedMarkdown", () => {
  it("returns no errors when neither frontmatter type nor path type is available", () => {
    const result = validateStagedMarkdown("/docs/random/file.md", "# content");

    expect(result.filePath).toBe("/docs/random/file.md");
    expect(result.errors).toEqual([]);
  });

  it("infers requirement type from path and reports embedded scenario fields", () => {
    const content = `---
id: REQ-123
title: Requirement with embedded scenario
scenarios:
  - given: user is logged in
---
`;

    const result = validateStagedMarkdown(
      "/docs/requirements/REQ-123.md",
      content,
    );

    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.classification).toBe("Embedded Entity Violation");
    expect(result.errors[0]?.message).toContain("scenario");
  });

  it("infers requirement type from path and reports embedded test fields", () => {
    const content = `---
id: REQ-124
title: Requirement with embedded test
test: run api assertion
---
`;

    const result = validateStagedMarkdown(
      "/docs/requirements/REQ-124.md",
      content,
    );

    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.classification).toBe("Embedded Entity Violation");
    expect(result.errors[0]?.message).toContain("test");
  });

  it("uses explicit frontmatter type over path inference", () => {
    const content = `---
id: SCEN-001
type: scenario
title: Scenario file
scenario: Given something
---
`;

    const result = validateStagedMarkdown(
      "/docs/requirements/REQ-999.md",
      content,
    );

    expect(result.errors).toEqual([]);
  });

  it("returns no errors for malformed frontmatter parse failures", () => {
    const malformed = `---
id: REQ-001
title: broken
links:
  - type: verified_by
    target: TEST-001
    extra: [unclosed
---
`;

    const result = validateStagedMarkdown(
      "/docs/requirements/REQ-001.md",
      malformed,
    );

    expect(result.errors).toEqual([]);
  });

  it("extracts optional test verification fields from test frontmatter", () => {
    const content = `---
id: TEST-200
title: Consumer login flow smoke test
status: passing
created_at: 2026-04-01T00:00:00Z
updated_at: 2026-04-01T00:00:00Z
source: .kb/tests/TEST-200.md
verification_scope: end_to_end
verification_perspective: consumer
---
`;

    const result = extractFromMarkdownString(
      content,
      "/docs/tests/TEST-200.md",
    );

    expect(result.entity.type).toBe("test");
    expect(result.entity.verification_scope).toBe("end_to_end");
    expect(result.entity.verification_perspective).toBe("consumer");
  });

  it("rejects invalid test verification enum values", () => {
    const content = `---
id: TEST-201
title: Invalid verification scope test
status: passing
created_at: 2026-04-01T00:00:00Z
updated_at: 2026-04-01T00:00:00Z
source: .kb/tests/TEST-201.md
verification_scope: playwright
---
`;

    expect(() =>
      extractFromMarkdownString(content, "/docs/tests/TEST-201.md"),
    ).toThrow(FrontmatterError);
  });

  it("rejects verification fields on non-test entities", () => {
    const content = `---
id: REQ-200
title: Requirement with invalid test field
status: open
created_at: 2026-04-01T00:00:00Z
updated_at: 2026-04-01T00:00:00Z
source: .kb/requirements/REQ-200.md
verification_perspective: consumer
---
`;

    expect(() =>
      extractFromMarkdownString(content, "/docs/requirements/REQ-200.md"),
    ).toThrow(FrontmatterError);
  });
});

describe("validateStagedMarkdown embedded entity report", () => {
  const hint = (types: string) =>
    `Move ${types} to separate entity files and link them using 'links' with relationship types like 'specified_by' or 'verified_by'.`;

  it("names both embedded entity kinds in one error", () => {
    const result = validateStagedMarkdown(
      ".kb/requirements/REQ-9.md",
      "---\ntitle: Both\ngiven: a user\ntests: [one]\n---\n",
    );
    expect(result.errors.length).toBe(1);
    const [error] = result.errors;
    expect(error?.message).toBe(
      "Invalid embedded entity: requirement contains scenario and test fields",
    );
    expect(error?.filePath).toBe(".kb/requirements/REQ-9.md");
    expect(error?.classification).toBe("Embedded Entity Violation");
    expect(error?.hint).toBe(hint("scenario and test"));
  });

  it("checks an explicit req type outside the requirements lane", () => {
    const result = validateStagedMarkdown(
      "docs/notes/REQ-10.md",
      "---\ntype: req\nscenario: inline\n---\n",
    );
    expect(result.errors.map((e) => e.hint)).toStrictEqual([hint("scenario")]);
  });

  it("accepts a requirement without embedded fields", () => {
    expect(
      validateStagedMarkdown(
        ".kb/requirements/REQ-11.md",
        "---\ntitle: Clean\n---\n",
      ),
    ).toStrictEqual({ filePath: ".kb/requirements/REQ-11.md", errors: [] });
  });

  it("ignores embedded fields in the scenario and test lanes", () => {
    for (const filePath of [".kb/scenarios/S-1.md", ".kb/tests/T-1.md"]) {
      const result = validateStagedMarkdown(
        filePath,
        "---\ntitle: X\nscenario: inline\ntest: inline\n---\n",
      );
      expect(result).toStrictEqual({ filePath, errors: [] });
    }
  });
});
