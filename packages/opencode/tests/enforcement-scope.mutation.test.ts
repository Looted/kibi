import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  buildDirtyRelevantFingerprint,
  buildEnforcementScopeKey,
} from "../src/enforcement-scope";

describe("buildEnforcementScopeKey", () => {
  test("trims every component", () => {
    expect(
      buildEnforcementScopeKey({
        sessionId: "  ses  ",
        agentIdentity: " agent ",
        worktreeRoot: "/repo/./x",
        branch: " main ",
        dirtyRelevantFingerprint: " abc ",
      }),
    ).toBe(
      JSON.stringify({
        sessionId: "ses",
        agentIdentity: "agent",
        worktreeRoot: path.resolve("/repo/x"),
        branch: "main",
        dirtyRelevantFingerprint: "abc",
      }),
    );
  });

  test("missing or blank components fall back", () => {
    for (const blank of [undefined, "   "]) {
      expect(
        buildEnforcementScopeKey({
          sessionId: blank,
          agentIdentity: blank,
          worktreeRoot: "/repo",
          branch: blank ?? "",
          dirtyRelevantFingerprint: blank ?? "",
        }),
      ).toBe(
        JSON.stringify({
          sessionId: "unknown",
          agentIdentity: "unknown",
          worktreeRoot: path.resolve("/repo"),
          branch: "unknown",
          dirtyRelevantFingerprint: "clean",
        }),
      );
    }
  });
});

describe("buildDirtyRelevantFingerprint", () => {
  test("no relevant values is clean", () => {
    expect(buildDirtyRelevantFingerprint([])).toBe("clean");
    expect(buildDirtyRelevantFingerprint([null, undefined, "  ", ""])).toBe(
      "clean",
    );
  });

  test("hashes the trimmed, sorted, non-empty values", () => {
    const expected = createHash("sha256")
      .update(JSON.stringify(["a", "b"]))
      .digest("hex");
    expect(buildDirtyRelevantFingerprint([" b ", "", null, "a"])).toBe(
      expected,
    );
    expect(buildDirtyRelevantFingerprint(["a", "b"])).toBe(expected);
  });
});
