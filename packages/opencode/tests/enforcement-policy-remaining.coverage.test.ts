// implements REQ-opencode-worktree-hard-enforcement-v1
import { afterEach, describe, expect, test } from "bun:test";
import { computeEnforcementPolicy } from "../src/enforcement-policy.js";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("enforcement-policy remaining empty relevant-event checkpoint", () => {
  test("advisory mode still checkpoint-passes when every event is ignored", () => {
    const result = computeEnforcementPolicy({
      effectiveMode: "smart",
      lifecycleEvents: [
        { normalizedPath: "README.md", lifecycle: "edited" },
      ],
      pathKinds: ["ignored"],
      posture: "root_active",
      resolvedContext: {
        workspaceRoot: "/tmp/repo",
        isAuthoritative: true,
      } as never,
    });
    expect(result.kind).toBe("checkpoint_passed");
    expect(result.dirtyFileCount).toBe(0);
    expect(result.text).toBeNull();
  });
});
