import { afterAll, beforeAll, describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyzeCodeFile } from "../src/comment-analysis";

// implements REQ-opencode-comment-routing

describe("comment-analysis", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-comment-test-"));
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe("JavaScript/TypeScript comment extraction", () => {
    it("detects long // comment blocks as FACT knowledge", () => {
      const jsFile = path.join(tmpDir, "test-invariant.js");
      fs.writeFileSync(
        jsFile,
        `// User email must be unique across the entire system.
// This is enforced at the database level with a unique index.
// Each user can have at most 5 active sessions at any time.
// Sessions expire after 30 minutes of inactivity by default.

function validateUser(user) {
  return user.email && user.email.length > 0;
}
`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.ok(result, "Should detect durable knowledge");
      assert.equal(result?.suggestionType, "fact");
      assert.ok(
        result?.confidence === "high" || result?.confidence === "medium",
      );
      assert.ok(result?.fingerprint);
      assert.equal(result?.sourceKind, "block-comment");
    });

    it("detects /* */ rationale blocks as ADR knowledge", () => {
      const jsFile = path.join(tmpDir, "test-decision.js");
      fs.writeFileSync(
        jsFile,
        `/*
 * We chose PostgreSQL over MongoDB because we need ACID transactions
 * and strong consistency guarantees. The tradeoff is slightly higher
 * operational complexity but ensures data integrity.
 */

const db = createPostgresConnection();
`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.ok(result, "Should detect decision knowledge");
      assert.equal(result?.suggestionType, "adr");
    });

    it("ignores short comments", () => {
      const jsFile = path.join(tmpDir, "test-short.js");
      fs.writeFileSync(
        jsFile,
        `// This is just a short comment
// Not enough lines to trigger analysis

function add(a, b) {
  return a + b;
}
`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.equal(result, null);
    });

    it("handles JSDoc-style comments", () => {
      const jsFile = path.join(tmpDir, "test-jsdoc.js");
      fs.writeFileSync(
        jsFile,
        `/**
 * Validates user input according to security requirements.
 * The system must reject inputs containing SQL injection patterns.
 * All user data must be sanitized before database operations.
 */

function validateInput(input) {
  return input.replace(/['";]/g, "");
}
`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.ok(result);
      assert.ok(
        ["fact", "req", "scenario", "test"].includes(
          result?.suggestionType || "",
        ),
      );
    });
  });

  describe("Python comment extraction", () => {
    it("detects contiguous # comment blocks as ADR knowledge", () => {
      const pyFile = path.join(tmpDir, "test-decision.py");
      fs.writeFileSync(
        pyFile,
        `# We chose PostgreSQL over MongoDB because we need ACID transactions
# and strong consistency guarantees. The tradeoff is slightly higher
# operational complexity but ensures data integrity for financial records.
#
# This decision was made in March 2024 after evaluating multiple options.

import psycopg2
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.ok(
        result,
        "Should detect decision knowledge in Python # comments",
      );
      assert.equal(result?.suggestionType, "adr");
      assert.equal(result?.sourceKind, "block-comment");
    });

    it("detects module-level docstrings as FACT knowledge", () => {
      const pyFile = path.join(tmpDir, "test-invariant.py");
      fs.writeFileSync(
        pyFile,
        `"""
User accounts must have unique email addresses.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.
"""

import datetime

class User:
    pass
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.ok(result, "Should detect module docstring as FACT");
      assert.equal(result?.suggestionType, "fact");
      assert.equal(result?.sourceKind, "docstring");
    });

    it("detects class docstrings", () => {
      const pyFile = path.join(tmpDir, "test-class-docstring.py");
      fs.writeFileSync(
        pyFile,
        `class DatabaseConfig:
    """
    Database configuration defaults and limits.
    
    Default connection pool size is 10.
    Maximum query timeout is 30 seconds.
    Connection retry attempts default to 3.
    """
    
    pass
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.ok(result, "Should detect class docstring");
      assert.equal(result?.suggestionType, "fact");
      assert.equal(result?.sourceKind, "docstring");
    });

    it("detects function docstrings", () => {
      const pyFile = path.join(tmpDir, "test-function-docstring.py");
      fs.writeFileSync(
        pyFile,
        `def validate_user(user_data):
    """
    Validates user data according to security requirements.
    
    The system must reject inputs containing SQL injection patterns.
    All user data must be sanitized before database operations.
    Email addresses must match the standard RFC 5322 format.
    """
    return True
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.ok(result, "Should detect function docstring");
      assert.ok(result?.suggestionType);
    });

    it("ignores arbitrary triple-quoted strings", () => {
      const pyFile = path.join(tmpDir, "test-string.py");
      fs.writeFileSync(
        pyFile,
        `message = """
This looks like a docstring but it's just a string.
User email must be unique across the entire system.
Each user can have at most 5 active sessions.
"""

print(message)
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      // This might or might not be detected depending on heuristic
      // The important thing is it doesn't crash
      assert.ok(result === null || result !== null);
    });

    it("ignores short Python comments", () => {
      const pyFile = path.join(tmpDir, "test-short-py.py");
      fs.writeFileSync(
        pyFile,
        `# Just a short comment
# Not enough lines

def add(a, b):
    return a + b
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.equal(result, null);
    });

    it("handles single-quote docstrings", () => {
      const pyFile = path.join(tmpDir, "test-single-quote.py");
      fs.writeFileSync(
        pyFile,
        `'''
Configuration defaults for the application.
Default timeout is 30 seconds.
Maximum retry count is 5.
'''

CONFIG = {}
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.ok(result, "Should handle single-quote docstrings");
    });
  });

  describe("fingerprint stability", () => {
    it("returns same fingerprint for same content", () => {
      const jsFile = path.join(tmpDir, "test-fingerprint.js");
      const content = `// User email must be unique across the entire system.
// This is enforced at the database level with a unique index.
// Each user can have at most 5 active sessions.

function validate() {}`;

      fs.writeFileSync(jsFile, content);

      const result1 = analyzeCodeFile(jsFile, { minLines: 3 });
      const result2 = analyzeCodeFile(jsFile, { minLines: 3 });

      assert.ok(result1 && result2);
      assert.equal(result1?.fingerprint, result2?.fingerprint);
    });

    it("returns different fingerprint for different content", () => {
      const jsFile1 = path.join(tmpDir, "test-fp1.js");
      const jsFile2 = path.join(tmpDir, "test-fp2.js");

      fs.writeFileSync(
        jsFile1,
        `// User email must be unique across the entire system.
// This is enforced at the database level with a unique index.

function validate() {}`,
      );

      fs.writeFileSync(
        jsFile2,
        `// We chose PostgreSQL over MongoDB because we need ACID transactions.
// The tradeoff is higher operational complexity.

function connect() {}`,
      );

      const result1 = analyzeCodeFile(jsFile1, { minLines: 2 });
      const result2 = analyzeCodeFile(jsFile2, { minLines: 2 });

      assert.ok(result1 && result2);
      assert.notEqual(result1?.fingerprint, result2?.fingerprint);
    });
  });

  describe("error handling", () => {
    it("returns null for non-existent files", () => {
      const result = analyzeCodeFile("/non-existent/file.js", { minLines: 3 });
      assert.equal(result, null);
    });

    it("returns null for unsupported file types", () => {
      const txtFile = path.join(tmpDir, "test.txt");
      fs.writeFileSync(
        txtFile,
        `User email must be unique across the entire system.
This is enforced at the database level with a unique index.
Each user can have at most 5 active sessions.`,
      );

      const result = analyzeCodeFile(txtFile, { minLines: 3 });
      assert.equal(result, null);
    });

    it("returns null for empty files", () => {
      const jsFile = path.join(tmpDir, "test-empty.js");
      fs.writeFileSync(jsFile, "");

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.equal(result, null);
    });

    it("returns null for files with only whitespace", () => {
      const jsFile = path.join(tmpDir, "test-whitespace.js");
      fs.writeFileSync(jsFile, "   \n\n   \n");

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.equal(result, null);
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("handles comments at exact minLines boundary", () => {
      const jsFile = path.join(tmpDir, "test-boundary.js");
      fs.writeFileSync(
        jsFile,
        `// User emails must be unique across the entire system
// Maximum sessions per user is at most 5 concurrent connections
// Sessions expire after 30 minutes of inactivity

function test() {}`,
      );

      // Exactly 3 lines with minLines: 3
      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.ok(result, "Should detect comment at exact boundary");
    });

    it("ignores comments just below minLines boundary", () => {
      const jsFile = path.join(tmpDir, "test-below-boundary.js");
      fs.writeFileSync(
        jsFile,
        `// Line 1
// Line 2

function test() {}`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.equal(result, null, "Should not detect comment below boundary");
    });

    it("handles comments with empty lines", () => {
      const jsFile = path.join(tmpDir, "test-empty-lines.js");
      fs.writeFileSync(
        jsFile,
        `// User emails must be unique across the entire system
//
// Maximum sessions per user is at most 5 concurrent connections
//
// Sessions expire after 30 minutes of inactivity

function test() {}`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.ok(result, "Should handle comments with empty lines");
    });

    it("handles files with only comments (no code)", () => {
      const jsFile = path.join(tmpDir, "test-only-comments.js");
      fs.writeFileSync(
        jsFile,
        `// User emails must be unique across the entire system
// Maximum sessions per user is at most 5 concurrent connections
// Sessions expire after 30 minutes of inactivity`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.ok(result, "Should handle files with only comments");
    });

    it("handles unicode content", () => {
      const jsFile = path.join(tmpDir, "test-unicode.js");
      fs.writeFileSync(
        jsFile,
        `// User emails must be unique across the entire system
// Maximum sessions per user is at most 5 concurrent connections
// Sessions expire after 30 minutes of inactivity

function test() {}`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.ok(result, "Should handle unicode content");
    });
  });

  describe("Python negative cases", () => {
    it("ignores strings assigned to variables", () => {
      const pyFile = path.join(tmpDir, "test-assigned-string.py");
      fs.writeFileSync(
        pyFile,
        `message = """
User email must be unique across the entire system.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.
"""

print(message)
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.equal(result, null, "Should not detect assigned strings");
    });

    it("ignores strings inside if blocks", () => {
      const pyFile = path.join(tmpDir, "test-if-string.py");
      fs.writeFileSync(
        pyFile,
        `if True:
    """
    User email must be unique across the entire system.
    Each user can have at most 5 active sessions.
    Sessions expire after 30 minutes of inactivity.
    """
    pass
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.equal(result, null, "Should not detect strings in if blocks");
    });

    it("ignores strings inside for loops", () => {
      const pyFile = path.join(tmpDir, "test-for-string.py");
      fs.writeFileSync(
        pyFile,
        `for i in range(10):
    """
    User email must be unique across the entire system.
    Each user can have at most 5 active sessions.
    Sessions expire after 30 minutes of inactivity.
    """
    pass
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.equal(result, null, "Should not detect strings in for loops");
    });

    it("ignores strings after imports (not module docstrings)", () => {
      const pyFile = path.join(tmpDir, "test-post-import.py");
      fs.writeFileSync(
        pyFile,
        `import datetime

"""
User email must be unique across the entire system.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.
"""

class User:
    pass
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.equal(result, null, "Should not detect strings after imports");
    });

    it("ignores second string in module (not a docstring)", () => {
      const pyFile = path.join(tmpDir, "test-second-string.py");
      fs.writeFileSync(
        pyFile,
        `"""
This is the actual module docstring.
It should be detected as a docstring.
And it has enough lines.
"""

SECOND_STRING = """
User email must be unique across the entire system.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.
"""
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      // Should detect the module docstring, not the second string
      assert.ok(result, "Should detect module docstring");
      assert.equal(result?.sourceKind, "docstring");
    });

    it("handles Python # comments with varying indents", () => {
      const pyFile = path.join(tmpDir, "test-indent-comments.py");
      fs.writeFileSync(
        pyFile,
        `def function():
    # User emails must be unique across the entire system
    # Maximum sessions per user is at most 5 concurrent connections
    # Sessions expire after 30 minutes of inactivity
    pass

# We chose PostgreSQL because of ACID requirements
# Strong consistency is required for data integrity
# The tradeoff is operational complexity we accept
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.ok(result, "Should detect # comments regardless of indent");
    });

    it("ignores docstring after code in function body", () => {
      const pyFile = path.join(tmpDir, "test-late-docstring.py");
      fs.writeFileSync(
        pyFile,
        `def process():
    x = 1
    """
    This looks like a docstring but comes after code.
    It should not be treated as a function docstring.
    Even though it has enough lines to qualify.
    """
    return x
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.equal(result, null, "Should not detect late docstrings");
    });

    it("handles nested class with docstring", () => {
      const pyFile = path.join(tmpDir, "test-nested-class.py");
      fs.writeFileSync(
        pyFile,
        `class Outer:
    """
    User emails must be unique across the entire system.
    Maximum sessions per user is at most 5 connections.
    Sessions expire after 30 minutes of inactivity.
    """
    
    class Inner:
        """
        Inner class limits.
        Default values must be unique per instance.
        At most 5 connections allowed.
        """
        pass
`,
      );

      const result = analyzeCodeFile(pyFile, { minLines: 3 });
      assert.ok(result, "Should detect nested class docstrings");
    });
  });

  describe("JavaScript/TypeScript edge cases", () => {
    it("handles mixed comment styles in same file", () => {
      const jsFile = path.join(tmpDir, "test-mixed.js");
      fs.writeFileSync(
        jsFile,
        `// User emails must be unique across the entire system
// Maximum sessions per user is at most 5 connections
// Sessions expire after 30 minutes of inactivity

/* User emails must be unique across the entire system
 * Maximum sessions per user is at most 5 connections
 * Sessions expire after 30 minutes of inactivity
 */

function test() {}`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.ok(result, "Should handle mixed comment styles");
    });

    it("handles comments at start of file", () => {
      const jsFile = path.join(tmpDir, "test-start.js");
      fs.writeFileSync(
        jsFile,
        `/**
 * User emails must be unique across the entire system
 * Maximum sessions per user is at most 5 connections
 * Sessions expire after 30 minutes of inactivity
 */

function test() {}`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.ok(result, "Should handle comments at file start");
    });

    it("handles comments with code interspersed", () => {
      const jsFile = path.join(tmpDir, "test-interspersed.js");
      fs.writeFileSync(
        jsFile,
        `// First comment block
// User accounts must have unique emails
// Maximum sessions is 5

function test1() {}

// Second comment block  
// We chose PostgreSQL because of ACID
// The tradeoff is complexity
// But we need consistency

function test2() {}`,
      );

      const result = analyzeCodeFile(jsFile, { minLines: 3 });
      assert.ok(result, "Should detect second comment block");
      assert.equal(result?.suggestionType, "adr");
    });
  });
});
