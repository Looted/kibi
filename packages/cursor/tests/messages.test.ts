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
    impactCheckRun: false,
    impactCheckedPaths: [],
    ...overrides,
  };
}

describe("stopFollowupMessage", () => {
  test("returns undefined when nothing changed", () => {
    expect(stopFollowupMessage(state())).toBeUndefined();
  });

  test("returns a short freshness nudge for documentation paths without KB activity", () => {
    expect(
      stopFollowupMessage(
        state({ dirtyPaths: ["documentation/symbols.yaml"] }),
      ),
    ).toBe("Kibi: sync or record no-impact after 1 edited file.");
  });

  test("returns impact guidance for source paths without impact checks", () => {
    expect(
      stopFollowupMessage(state({ dirtyPaths: ["packages/core/src/kb.pl"] })),
    ).toBe(
      [
        "Kibi: run impact-enabled kb_check after 1 edited source file.",
        'Use kb_check({sourceFiles:["packages/core/src/kb.pl"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}).',
        "Review symbol granularity and semantic review of linked requirements/tests before stopping.",
      ].join("\n"),
    );
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

  test("returns undefined when impact-enabled kb_check already covered source paths", () => {
    expect(
      stopFollowupMessage(
        state({
          dirtyPaths: ["packages/core/src/kb.pl"],
          kbCheckRun: true,
          impactCheckRun: true,
          impactCheckedPaths: ["packages/core/src/kb.pl"],
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
