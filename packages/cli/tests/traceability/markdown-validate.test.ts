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
