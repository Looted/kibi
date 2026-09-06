// implements REQ-opencode-enforcement
import { afterEach, describe, expect, test } from "bun:test";
import { isSafeDocsUnknownPath } from "../src/meaningful-change-classifier.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("meaningful-change leftover safe-docs unknown path", () => {
  test("isSafeDocsUnknownPath is true only for that pair", () => {
    expect(isSafeDocsUnknownPath("safe_docs_only", "unknown")).toBe(true);
    expect(isSafeDocsUnknownPath("safe_docs_only", "code")).toBe(false);
    expect(isSafeDocsUnknownPath("behavior_candidate", "unknown")).toBe(false);
  });
});
