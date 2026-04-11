import { describe, expect, it } from "bun:test";
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
});
