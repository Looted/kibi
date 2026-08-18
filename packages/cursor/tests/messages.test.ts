import { describe, expect, test } from "bun:test";

import type { HookState } from "../src/hook-state";
import { freshnessReminder, stopFollowupMessage } from "../src/messages";

function state(overrides: Partial<HookState> = {}): HookState {
  return {
    mcpState: "unknown",
    dirtyPaths: [],
    guidedReadPaths: [],
    guidedWritePaths: [],
    kbMutationTools: [],
    kbCheckRun: false,
    impactCheckRun: false,
    impactCheckedPaths: [],
    planDelivered: false,
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

  test("returns impact guidance when impact check ran but missed source paths", () => {
    expect(
      stopFollowupMessage(
        state({
          dirtyPaths: ["packages/core/src/kb.pl"],
          impactCheckRun: true,
          impactCheckedPaths: [],
        }),
      ),
    ).toContain("impact-enabled kb_check");
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

  test("stays silent after plan delivery without edits or KB mutations", () => {
    expect(stopFollowupMessage(state({ planDelivered: true }))).toBeUndefined();
  });

  test("still prompts after plan delivery when source was edited", () => {
    expect(
      stopFollowupMessage(
        state({
          planDelivered: true,
          dirtyPaths: ["packages/core/src/kb.pl"],
        }),
      ),
    ).toContain("impact-enabled kb_check");
  });

  test("still summarizes KB mutations after plan delivery", () => {
    expect(
      stopFollowupMessage(
        state({
          planDelivered: true,
          kbMutationTools: ["kb_upsert"],
        }),
      ),
    ).toBe("Kibi KB updated (kb_upsert).");
  });

  test("formats deprecated freshness reminders with singular and plural nouns", () => {
    expect(freshnessReminder(["docs/a.md"])).toBe(
      "Kibi: sync or record no-impact after 1 edited file.",
    );
    expect(freshnessReminder(["docs/a.md", "docs/b.md"])).toBe(
      "Kibi: sync or record no-impact after 2 edited files.",
    );
  });
});
