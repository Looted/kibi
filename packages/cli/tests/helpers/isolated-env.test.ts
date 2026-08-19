import { describe, expect, test } from "bun:test";
import { isolatedCliSandboxEnv } from "./isolated-env.js";

describe("isolatedCliSandboxEnv", () => {
  test("strips a host KIBI_BRANCH unless the caller sets a different identity", () => {
    const original = process.env.KIBI_BRANCH;
    process.env.KIBI_BRANCH = "feat/host-branch";
    try {
      expect(isolatedCliSandboxEnv().KIBI_BRANCH).toBeUndefined();
      expect(isolatedCliSandboxEnv({ ...process.env }).KIBI_BRANCH).toBeUndefined();
      expect(
        isolatedCliSandboxEnv({ KIBI_WORKSPACE: "/tmp/sandbox" }).KIBI_BRANCH,
      ).toBeUndefined();
      expect(isolatedCliSandboxEnv({ KIBI_WORKSPACE: "/tmp/sandbox" }).KIBI_WORKSPACE).toBe(
        "/tmp/sandbox",
      );
      expect(isolatedCliSandboxEnv({ KIBI_BRANCH: "trunk" }).KIBI_BRANCH).toBe(
        "trunk",
      );
    } finally {
      if (original === undefined) {
        delete process.env.KIBI_BRANCH;
      } else {
        process.env.KIBI_BRANCH = original;
      }
    }
  });
});
