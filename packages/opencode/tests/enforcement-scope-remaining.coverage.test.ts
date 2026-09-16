// implements REQ-opencode-worktree-hard-enforcement-v1
import { afterEach, describe, expect, test } from "bun:test";
import { buildDirtyRelevantFingerprint } from "../src/enforcement-scope.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("buildDirtyRelevantFingerprint remaining empty input", () => {
  test("returns clean when every value is blank", () => {
    expect(buildDirtyRelevantFingerprint(["", "  ", null, undefined])).toBe(
      "clean",
    );
  });
});
