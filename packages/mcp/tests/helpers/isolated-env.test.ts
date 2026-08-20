import { describe, expect, test } from "bun:test";
import { isolatedMcpSandboxEnv } from "./isolated-env.js";

describe("isolatedMcpSandboxEnv", () => {
  test("strips a host KIBI_BRANCH unless the caller sets a different identity", () => {
    const original = process.env.KIBI_BRANCH;
    process.env.KIBI_BRANCH = "feat/host-branch";
    try {
      const stripped = isolatedMcpSandboxEnv();
      expect(stripped.KIBI_BRANCH).toBeUndefined();
      expect("KIBI_BRANCH" in stripped).toBe(false);
      expect(
        isolatedMcpSandboxEnv({ ...process.env }).KIBI_BRANCH,
      ).toBeUndefined();
      expect(
        isolatedMcpSandboxEnv({ KIBI_WORKSPACE: "/tmp/sandbox" }).KIBI_BRANCH,
      ).toBeUndefined();
      expect(isolatedMcpSandboxEnv({ KIBI_BRANCH: "trunk" }).KIBI_BRANCH).toBe(
        "trunk",
      );
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_BRANCH");
      } else {
        process.env.KIBI_BRANCH = original;
      }
    }
  });
});
