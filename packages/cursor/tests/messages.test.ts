import { describe, expect, test } from "bun:test";

import type { HookState } from "../src/hook-state";
import { stopFollowupMessage } from "../src/messages";

function state(overrides: Partial<HookState> = {}): HookState {
  return {
    dirtyPaths: [],
    guidedReadPaths: [],
    guidedWritePaths: [],
    kbMutationTools: [],
    kbCheckRun: false,
    ...overrides,
  };
}

describe("stopFollowupMessage", () => {
  test("returns undefined when nothing changed", () => {
    expect(stopFollowupMessage(state())).toBeUndefined();
  });

  test("returns a short freshness nudge for KB-relevant dirty paths without KB activity", () => {
    expect(
      stopFollowupMessage(state({ dirtyPaths: ["packages/core/src/kb.pl"] })),
    ).toBe("Kibi: sync or record no-impact after 1 edited file.");
  });

  test("ignores test-only dirty paths", () => {
    expect(
      stopFollowupMessage(
        state({
          dirtyPaths: [
            "packages/mcp/tests/tools/check.test.ts",
            "packages/cursor/tests/hook-runner.test.ts",
          ],
        }),
      ),
    ).toBeUndefined();
  });

  test("returns undefined when kb_check already ran on dirty paths", () => {
    expect(
      stopFollowupMessage(
        state({
          dirtyPaths: ["packages/core/src/kb.pl"],
          kbCheckRun: true,
        }),
      ),
    ).toBeUndefined();
  });

  test("returns a short KB update summary after mutations", () => {
    expect(
      stopFollowupMessage(
        state({
          kbMutationTools: ["kb_upsert", "kb_upsert"],
        }),
      ),
    ).toBe("Kibi KB updated (kb_upsert).");
  });
});
