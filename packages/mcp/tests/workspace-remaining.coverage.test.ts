// implements REQ-002
import { afterEach, describe, expect, test } from "bun:test";
import { nextAncestorDirectory, resolveWorkspaceRoot } from "../src/workspace.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("mcp workspace leftover ancestor walk", () => {
  test("nextAncestorDirectory stops at the filesystem root", () => {
    expect(nextAncestorDirectory("/")).toBeUndefined();
    expect(nextAncestorDirectory("/tmp/nested")).toBe("/tmp");
    expect(typeof resolveWorkspaceRoot(process.cwd())).toBe("string");
  });
});
