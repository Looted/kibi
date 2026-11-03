import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { checkDiffCommand } from "../../src/commands/check-diff.js";
import * as maintenance from "../../src/plugins/maintenance-source-analysis.js";
import * as sourceChange from "../../src/plugins/source-change-analysis.js";
import * as snapshotModule from "../../src/traceability/git-change-snapshot.js";
import * as evaluator from "../../src/traceability/impact-evaluator.js";
import * as prDiff from "../../src/traceability/impact-pr-diff.js";
import * as trusted from "../../src/traceability/trusted-pr-event.js";

const event = {
  repository: "owner/repo",
  targetRef: "refs/heads/main",
  targetCommit: "t1",
  targetTree: "tt1",
  headCommit: "h1",
  headTree: "ht1",
  mergeBaseCommit: "m1",
  mergeBaseTree: "mt1",
};

afterEach(() => {
  mock.restore();
});

function stubPipeline(inventory: unknown[], passed = true) {
  const events = [event, event];
  spyOn(trusted, "resolveTrustedPullRequestSnapshot").mockImplementation(
    () => (events.shift() ?? { ...event, headCommit: "moved" }) as never,
  );
  spyOn(snapshotModule, "captureDiffSnapshot").mockReturnValue({
    inventory,
  } as never);
  spyOn(prDiff, "assertTrustedPullRequestBaseline").mockReturnValue(
    undefined as never,
  );
  spyOn(maintenance, "readSnapshotSourceConfig").mockReturnValue({} as never);
  spyOn(maintenance, "fingerprintMaintenanceSourceSet").mockReturnValue(
    "providers" as never,
  );
  spyOn(maintenance, "createMaintenanceSourceAnalysisService").mockReturnValue(
    {} as never,
  );
  spyOn(sourceChange, "analyzeSourceChanges").mockResolvedValue([] as never);
  spyOn(evaluator, "fingerprintImpactEvaluator").mockReturnValue(
    "evaluator" as never,
  );
  spyOn(evaluator, "evaluateImpactReview").mockReturnValue({
    passed,
    diagnostics: [{ code: "IMPACT_X", message: "needs review" }],
    scopeFingerprint: "scope",
    reviewerAuthority: "owner",
  } as never);
  return events;
}

function captureLog(): string[] {
  const logs: string[] = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  return logs;
}

describe("checkDiffCommand", () => {
  test("reports the evaluated scope when a non-empty diff passes", async () => {
    stubPipeline([{ path: "src/a.ts" }]);
    const logs = captureLog();
    expect(await checkDiffCommand("/ws")).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      JSON.stringify({
        status: "passed",
        ...event,
        scopeFingerprint: "scope",
        reviewerAuthority: "owner",
      }),
    ]);
  });

  test("fails with the evaluator diagnostics", async () => {
    stubPipeline([{ path: "src/a.ts" }], false);
    await expect(checkDiffCommand("/ws")).rejects.toThrow(
      "IMPACT_X: needs review",
    );
  });

  test("refuses when the event changes during a non-empty evaluation", async () => {
    const events = stubPipeline([{ path: "src/a.ts" }]);
    events.pop();
    await expect(checkDiffCommand("/ws")).rejects.toThrow(
      "Verified PR event or Git ancestry changed during impact evaluation",
    );
  });

  test("refuses when the event changes during an empty evaluation", async () => {
    const events = stubPipeline([]);
    events.pop();
    await expect(checkDiffCommand("/ws")).rejects.toThrow(
      "Verified PR event or Git ancestry changed during impact evaluation",
    );
  });
});
