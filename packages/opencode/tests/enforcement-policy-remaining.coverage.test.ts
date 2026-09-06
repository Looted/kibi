// implements REQ-opencode-worktree-hard-enforcement-v1
import { afterEach, describe, expect, test } from "bun:test";
import {
  advisoryResultFromEvents,
  computeEnforcementPolicy,
} from "../src/enforcement-policy.js";

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

  test("advisoryResultFromEvents checkpoint-passes an empty relevant list", () => {
    const empty = advisoryResultFromEvents([], {
      affectedPaths: [],
      e2eReminder: null,
      reminderKindsToMark: [],
    });
    expect(empty.kind).toBe("checkpoint_passed");
    expect(empty.dirtyFileCount).toBe(0);
    expect(empty.text).toBeNull();

    const advisory = advisoryResultFromEvents(
      [
        {
          normalizedPath: "packages/cli/src/cli.ts",
          lifecycle: "edited",
          pathKind: "code",
          linkedEntityResult: { ids: ["REQ-1"], source: "symbols" },
          e2eSignal: { level: "none", evidence: [], reminderText: null },
        },
      ],
      {
        affectedPaths: ["packages/cli/src/cli.ts"],
        e2eReminder: null,
        reminderKindsToMark: [],
      },
    );
    expect(advisory.kind).toBe("advisory_guidance");
  });
});
