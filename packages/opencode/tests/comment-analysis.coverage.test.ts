/// <reference types="bun-types" />
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

  test("ignores assigned triple-quoted strings at module scope and in functions for both quote styles", () => {
    const pyFile = path.join(tmpDir, "assigned-quote-styles.py");
    fs.writeFileSync(
      pyFile,
      `x = """
User email must be unique across the entire system.
Each user can have at most five active sessions.
Sessions expire after 30 minutes of inactivity.
"""

def build_message():
    value = '''
    We chose PostgreSQL over MongoDB for strong consistency.
    The tradeoff is higher operational complexity.
    This text is durable knowledge but only a string assignment.
    '''
    return value
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

  test("ignores first triple-quoted block when empty and later non-docstring blocks", () => {
    const pyFile = path.join(tmpDir, "non-docstring-triple-quotes.py");
    fs.writeFileSync(
      pyFile,
      `"""
"""

value = 1

"""
This multi-line triple-quoted string is not a docstring.
It appears after a real statement and must be ignored.
It should not be classified as durable knowledge here.
"""
`,
    );

    const result = analyzeCodeFile(pyFile, { minLines: 3 });

    assert.equal(result, null);
  });

  // Lines 254-259: inside isAssignment=true branch, flag-setting logic
  test("assigns triple-quoted string and marks module docstring found", () => {
    const pyFile = path.join(tmpDir, "assignment-marks-found.py");
    fs.writeFileSync(
      pyFile,
      `x = """
Durable knowledge in assignment.
This should be ignored as docstring.
"""

# Now another triple-quoted that would be docstring if not for foundModuleDocstring
"""
This comes after assignment and should not be a docstring either.
"""
`,
    );

    const result = analyzeCodeFile(pyFile, { minLines: 3 });

    // Should be null because first triple-quote is an assignment (not a docstring)
    // and foundModuleDocstring is set, so second triple-quote is also not a docstring
    assert.equal(result, null);
  });

  // implements REQ-opencode-comment-routing
  test("ignores assignment-backed triple-quoted strings inside class bodies", () => {
    const pyFile = path.join(tmpDir, "class-assignment-docstring.py");
    fs.writeFileSync(
      pyFile,
      `title = """
Module assignment text that looks durable.
It should not become a module docstring.
It is only assigned data.
"""

class Example:
    details = """
    Class assignment text that looks durable.
    It should not become a class docstring.
    It is only assigned data.
    """

    """
    This later triple-quoted block must also be ignored.
    The assignment already consumed the docstring slot.
    So analyzeCodeFile should return null.
    """
`,
    );

    const result = analyzeCodeFile(pyFile, { minLines: 3 });

    assert.equal(result, null);
  });

  // implements REQ-opencode-comment-routing
  test("non-docstring triple-quote after code prevents later module docstring detection", () => {
    const pyFile = path.join(tmpDir, "non-docstring-blocks-docstring.py");
    fs.writeFileSync(
      pyFile,
      `value = 1
"""
This block comes after real code, so it is not a module docstring.
It should mark the docstring opportunity as consumed.
This exercises the non-docstring triple-quote path.
"""

"""
This later block also looks like a docstring.
But the earlier non-docstring triple quote already consumed the slot.
So it must also be ignored.
"""
`,
    );

    const result = analyzeCodeFile(pyFile, { minLines: 3 });

    assert.equal(result, null);
  });

  // implements REQ-opencode-comment-routing
  test("treats a failed first module docstring extraction as non-docstring content", () => {
    const pyFile = path.join(tmpDir, "unterminated-module-triple-quote.py");
    fs.writeFileSync(
      pyFile,
      `"""
This starts where a module docstring would normally appear.
The extraction path will be forced to fail.
That should still consume the module docstring opportunity.
"""
`,
    );

    const originalIncludes = String.prototype.includes;
    String.prototype.includes = function includesPatched(
      searchString: string,
      position?: number,
    ): boolean {
      if (
        searchString === '"""' &&
        originalIncludes.call(
          String(this),
          "module docstring would normally appear",
        )
      ) {
        return false;
      }
      return originalIncludes.call(this, searchString, position);
    };

    let result: ReturnType<typeof analyzeCodeFile>;
    try {
      result = analyzeCodeFile(pyFile, { minLines: 3 });
    } finally {
      String.prototype.includes = originalIncludes;
    }

    assert.equal(result, null);
  });
});
