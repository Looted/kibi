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
});
