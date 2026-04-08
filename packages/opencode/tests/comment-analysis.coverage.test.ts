import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyzeCodeFile } from "../src/comment-analysis";

describe("comment-analysis coverage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-comment-coverage-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("extracts Python docstrings with inline opening and closing content", () => {
    const pyFile = path.join(tmpDir, "inline-docstring.py");
    fs.writeFileSync(
      pyFile,
      `def describe_policy():
    """Unique emails are required.
    At most five sessions are allowed.
    Defaults are enforced by policy."""
    return True
`,
    );

    const result = analyzeCodeFile(pyFile, { minLines: 3 });

    assert.ok(result);
    assert.equal(result?.sourceKind, "docstring");
    assert.equal(result?.suggestionType, "fact");
  });

  test("ignores assigned triple-quoted strings inside function bodies", () => {
    const pyFile = path.join(tmpDir, "assigned-string-in-function.py");
    fs.writeFileSync(
      pyFile,
      `def build_message():
    message = """
    User email must be unique across the entire system.
    Each user can have at most five active sessions.
    Sessions expire after 30 minutes of inactivity.
    """
    return message
`,
    );

    const result = analyzeCodeFile(pyFile, { minLines: 3 });

    assert.equal(result, null);
  });

  test("does not treat empty module docstrings as durable knowledge", () => {
    const pyFile = path.join(tmpDir, "empty-docstring.py");
    fs.writeFileSync(
      pyFile,
      `"""
"""

VALUE = 1
`,
    );

    const result = analyzeCodeFile(pyFile, { minLines: 1 });

    assert.equal(result, null);
  });

  test("resets class context when top-level code follows a class body", () => {
    const pyFile = path.join(tmpDir, "class-exit.py");
    fs.writeFileSync(
      pyFile,
      `class Example:
    pass

VALUE = 1
"""
This string comes after top-level code.
It should not be treated as a docstring.
Even though it spans multiple lines.
"""
`,
    );

    const result = analyzeCodeFile(pyFile, { minLines: 3 });

    assert.equal(result, null);
  });
});
