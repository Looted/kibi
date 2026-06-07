import { afterAll, beforeAll, describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getRequirementPriority,
  isMustPriorityRequirement,
} from "../src/requirement-doc";

// implements REQ-opencode-kibi-plugin-v1

describe("requirement-doc", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-req-test-"));
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe("isMustPriorityRequirement", () => {
    it("returns true for priority: must", () => {
      const reqFile = path.join(tmpDir, "REQ-001.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-001
title: Test Requirement
priority: must
---

This is a must-priority requirement.
`,
      );

      assert.equal(isMustPriorityRequirement(reqFile), true);
    });

    it("returns false for priority: should", () => {
      const reqFile = path.join(tmpDir, "REQ-002.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-002
title: Test Requirement
priority: should
---

This is a should-priority requirement.
`,
      );

      assert.equal(isMustPriorityRequirement(reqFile), false);
    });

    it("returns false for missing priority", () => {
      const reqFile = path.join(tmpDir, "REQ-003.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-003
title: Test Requirement
---

This requirement has no priority field.
`,
      );

      assert.equal(isMustPriorityRequirement(reqFile), false);
    });

    it("returns false for malformed frontmatter", () => {
      const reqFile = path.join(tmpDir, "REQ-004.md");
      fs.writeFileSync(
        reqFile,
        `No frontmatter here

Just some content without YAML.
`,
      );

      assert.equal(isMustPriorityRequirement(reqFile), false);
    });

    it("returns false for non-existent file", () => {
      const nonExistent = path.join(tmpDir, "non-existent.md");
      assert.equal(isMustPriorityRequirement(nonExistent), false);
    });

    it("respects worktree parameter for relative paths", () => {
      const subDir = path.join(tmpDir, "subdir");
      fs.mkdirSync(subDir, { recursive: true });
      const reqFile = path.join(subDir, "REQ-005.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-005
priority: must
---
`,
      );

      // Test with relative path and worktree
      assert.equal(
        isMustPriorityRequirement("subdir/REQ-005.md", tmpDir),
        true,
      );
    });

    it("handles quoted priority values", () => {
      const reqFile = path.join(tmpDir, "REQ-006.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-006
priority: "must"
---
`,
      );

      assert.equal(isMustPriorityRequirement(reqFile), true);
    });

    it("handles single-quoted priority values", () => {
      const reqFile = path.join(tmpDir, "REQ-007.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-007
priority: 'must'
---
`,
      );

      assert.equal(isMustPriorityRequirement(reqFile), true);
    });
  });

  describe("getRequirementPriority", () => {
    it("returns 'must' for must-priority requirements", () => {
      const reqFile = path.join(tmpDir, "REQ-008.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-008
priority: must
---
`,
      );

      assert.equal(getRequirementPriority(reqFile), "must");
    });

    it("returns 'should' for should-priority requirements", () => {
      const reqFile = path.join(tmpDir, "REQ-009.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-009
priority: should
---
`,
      );

      assert.equal(getRequirementPriority(reqFile), "should");
    });

    it("returns null for missing priority", () => {
      const reqFile = path.join(tmpDir, "REQ-010.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-010
title: No Priority
---
`,
      );

      assert.equal(getRequirementPriority(reqFile), null);
    });

    it("returns null for malformed frontmatter", () => {
      const reqFile = path.join(tmpDir, "REQ-011.md");
      fs.writeFileSync(reqFile, "No frontmatter");

      assert.equal(getRequirementPriority(reqFile), null);
    });

    it("returns null for non-existent file", () => {
      const nonExistent = path.join(tmpDir, "does-not-exist.md");
      assert.equal(getRequirementPriority(nonExistent), null);
    });
  });

  describe("edge cases", () => {
    it("handles CRLF line endings", () => {
      const reqFile = path.join(tmpDir, "REQ-CRLF.md");
      const content = "---\r\nid: REQ-CRLF\r\npriority: must\r\n---\r\n";
      fs.writeFileSync(reqFile, content);

      assert.equal(isMustPriorityRequirement(reqFile), true);
    });

    it("handles BOM marker", () => {
      const reqFile = path.join(tmpDir, "REQ-BOM.md");
      const content = "\uFEFF---\nid: REQ-BOM\npriority: must\n---\n";
      fs.writeFileSync(reqFile, content);

      assert.equal(isMustPriorityRequirement(reqFile), true);
    });

    it("handles inline YAML comments", () => {
      const reqFile = path.join(tmpDir, "REQ-COMMENT.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-COMMENT
priority: must  # This is a comment
---
`,
      );

      assert.equal(isMustPriorityRequirement(reqFile), true);
    });
  });
});
