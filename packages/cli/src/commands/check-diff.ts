import {
  createMaintenanceSourceAnalysisService,
  fingerprintMaintenanceSourceSet,
  readSnapshotSourceConfig,
} from "../plugins/maintenance-source-analysis.js";
import { analyzeSourceChanges } from "../plugins/source-change-analysis.js";
import { captureDiffSnapshot } from "../traceability/git-change-snapshot.js";
import {
  evaluateImpactReview,
  fingerprintImpactEvaluator,
} from "../traceability/impact-evaluator.js";
import { assertTrustedPullRequestBaseline } from "../traceability/impact-pr-diff.js";
import { canonicalJson } from "../traceability/impact-review.js";
import { resolveTrustedPullRequestSnapshot } from "../traceability/trusted-pr-event.js";

/** Full, non-interactive aggregate PR gate; all inputs come from a verified event. */
export async function checkDiffCommand(
  workspaceRoot = process.cwd(),
): Promise<{ exitCode: number }> {
  const event = resolveTrustedPullRequestSnapshot(workspaceRoot);
  const snapshot = captureDiffSnapshot(
    workspaceRoot,
    event.mergeBaseCommit,
    event.headCommit,
  );
  assertTrustedPullRequestBaseline(snapshot, event);
  if (snapshot.inventory.length === 0) {
    const currentEvent = resolveTrustedPullRequestSnapshot(workspaceRoot);
    if (canonicalJson(currentEvent) !== canonicalJson(event))
      throw new Error(
        "Verified PR event or Git ancestry changed during impact evaluation",
      );
    console.log(
      JSON.stringify({
        status: "passed",
        repository: event.repository,
        targetRef: event.targetRef,
        targetCommit: event.targetCommit,
        targetTree: event.targetTree,
        headCommit: event.headCommit,
        headTree: event.headTree,
        mergeBaseCommit: event.mergeBaseCommit,
        mergeBaseTree: event.mergeBaseTree,
        scopeFingerprint: null,
        reviewerAuthority: "none",
      }),
    );
    return { exitCode: 0 };
  }
  const trustedConfig = readSnapshotSourceConfig(snapshot, event.targetTree);
  const providerSetFingerprint = fingerprintMaintenanceSourceSet(
    workspaceRoot,
    trustedConfig,
  );
  const sourceService = createMaintenanceSourceAnalysisService(
    workspaceRoot,
    trustedConfig,
  );
  const analyses = await analyzeSourceChanges(
    snapshot.inventory,
    sourceService,
  );
  const result = evaluateImpactReview(snapshot, {
    providerSetFingerprint,
    evaluatorFingerprint: fingerprintImpactEvaluator(),
    analyses,
  });
  if (!result.passed)
    throw new Error(
      result.diagnostics
        .map((item) => `${item.code}: ${item.message}`)
        .join("\n"),
    );
  const currentEvent = resolveTrustedPullRequestSnapshot(workspaceRoot);
  if (canonicalJson(currentEvent) !== canonicalJson(event))
    throw new Error(
      "Verified PR event or Git ancestry changed during impact evaluation",
    );
  console.log(
    JSON.stringify({
      status: "passed",
      repository: event.repository,
      targetRef: event.targetRef,
      targetCommit: event.targetCommit,
      targetTree: event.targetTree,
      headCommit: event.headCommit,
      headTree: event.headTree,
      mergeBaseCommit: event.mergeBaseCommit,
      mergeBaseTree: event.mergeBaseTree,
      scopeFingerprint: result.scopeFingerprint,
      reviewerAuthority: result.reviewerAuthority,
    }),
  );
  return { exitCode: 0 };
}
