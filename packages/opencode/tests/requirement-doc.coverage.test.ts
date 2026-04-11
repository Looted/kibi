import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getRequirementPriority,
  isMustPriorityRequirement,
} from "../src/requirement-doc";

describe("requirement-doc coverage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-requirement-doc-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("preserves hashes inside quoted values with escaped quotes", () => {
    const filePath = path.join(tmpDir, "REQ-QUOTED.md");
    fs.writeFileSync(
      filePath,
      `---
id: REQ-QUOTED
title: "Quoted \\\"value\\\" # stays inside the string" # real comment
priority: must
---
`,
    );

    assert.equal(isMustPriorityRequirement(filePath), true);
    assert.equal(getRequirementPriority(filePath), "must");
  });

  test("treats boolean priority values as non-string metadata", () => {
    const truePath = path.join(tmpDir, "REQ-TRUE.md");
    fs.writeFileSync(
      truePath,
      `---
id: REQ-TRUE
priority: true
---
`,
    );

    const falsePath = path.join(tmpDir, "REQ-FALSE.md");
    fs.writeFileSync(
      falsePath,
      `---
id: REQ-FALSE
priority: false
---
`,
    );

    assert.equal(isMustPriorityRequirement(truePath), false);
    assert.equal(isMustPriorityRequirement(falsePath), false);
    assert.equal(getRequirementPriority(truePath), null);
    assert.equal(getRequirementPriority(falsePath), null);
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("treats numeric priority values as non-string metadata", () => {
    const filePath = path.join(tmpDir, "REQ-NUMERIC.md");
    fs.writeFileSync(
      filePath,
      `---
id: REQ-NUMERIC
priority: 1
---
`,
    );

    assert.equal(isMustPriorityRequirement(filePath), false);
    assert.equal(getRequirementPriority(filePath), null);
  });
});
