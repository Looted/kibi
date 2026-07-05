import { describe, expect, it } from "bun:test";

import { hasMeaningfulSourceDiff } from "../../src/public/impact/diff-meaning.js";

describe("hasMeaningfulSourceDiff", () => {
  it("ignores formatting-only trailing commas around escaped string arguments", () => {
    const diffText = [
      "diff --git a/src/copy.ts b/src/copy.ts",
      "@@ -1 +1 @@",
      '-render("Hello \\"there\\"")',
      '+render("Hello \\"there\\"",)',
      "",
    ].join("\n");

    expect(hasMeaningfulSourceDiff(diffText)).toBe(false);
  });

  it("ignores formatting-only trailing commas in arrays and objects", () => {
    const diffText = [
      "diff --git a/src/config.ts b/src/config.ts",
      "@@ -1,2 +1,2 @@",
      '-const names = ["kibi"]',
      '+const names = ["kibi",]',
      "-const options = { enabled: true }",
      "+const options = { enabled: true, }",
      "",
    ].join("\n");

    expect(hasMeaningfulSourceDiff(diffText)).toBe(false);
  });

  it("ignores formatter-only trailing commas before closing object braces", () => {
    const diffText = [
      "diff --git a/src/config.ts b/src/config.ts",
      "@@ -1 +1 @@",
      "-configure({ enabled: true })",
      "+configure({ enabled: true,})",
      "",
    ].join("\n");

    expect(hasMeaningfulSourceDiff(diffText)).toBe(false);
  });

  it("keeps escaped string literal whitespace changes meaningful", () => {
    const diffText = [
      "diff --git a/src/copy.ts b/src/copy.ts",
      "@@ -1 +1 @@",
      '-export const copy = "Hello \\"there\\"";',
      '+export const copy = "Hello  \\"there\\"";',
      "",
    ].join("\n");

    expect(hasMeaningfulSourceDiff(diffText)).toBe(true);
  });

  it("returns false for metadata-only diffs with no added or removed content", () => {
    const diffText = [
      "diff --git a/src/a.ts b/src/a.ts",
      "index 1111111..2222222 100644",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "",
    ].join("\n");

    expect(hasMeaningfulSourceDiff(diffText)).toBe(false);
  });

  it("detects an earlier meaningful hunk before later formatter-only hunks", () => {
    const diffText = [
      "diff --git a/src/a.ts b/src/a.ts",
      "@@ -1 +1 @@",
      "-export const value = 1;",
      "+export const value = 2;",
      "@@ -3 +3 @@",
      "-render(`same`)",
      "+render(`same`,)",
      "",
    ].join("\n");

    expect(hasMeaningfulSourceDiff(diffText)).toBe(true);
  });

  it("preserves whitespace inside single-quoted and template literals", () => {
    const singleQuoted = [
      "@@ -1 +1 @@",
      "-const value = 'a b';",
      "+const value = 'ab';",
    ].join("\n");
    const templateQuoted = [
      "@@ -1 +1 @@",
      "-const value = `a b`;",
      "+const value = `ab`;",
    ].join("\n");

    expect(hasMeaningfulSourceDiff(singleQuoted)).toBe(true);
    expect(hasMeaningfulSourceDiff(templateQuoted)).toBe(true);
  });
});
