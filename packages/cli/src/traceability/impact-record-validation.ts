import { analysisObligation } from "./analysis-gate.js";
import type { GitChangeSnapshot } from "./git-change-snapshot.js";
import type { PreparedImpactReview } from "./impact-evaluator.js";
import { blobBytes, treeEntry } from "./impact-git-tree.js";
import { approvedPartialClass } from "./impact-policy.js";
import {
  IMPACT_REVIEW_PATH,
  type ImpactDecision,
  type ImpactFileRecord,
  type ImpactPolicy,
  type ImpactReviewRecord,
  canonicalJson,
  parseImpactReviewRecord,
} from "./impact-review.js";

/** Validate an authored impact review record against the prepared snapshot. */
// implements REQ-impact-policy-stage-e-content-bound-review
export function same(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function recordFromCapturedTree(
  snapshot: GitChangeSnapshot,
): ImpactReviewRecord {
  const entry = treeEntry(snapshot, snapshot.headTree, IMPACT_REVIEW_PATH);
  if (
    !entry ||
    entry.type !== "blob" ||
    (entry.mode !== "100644" && entry.mode !== "100755")
  )
    throw new Error(
      `Captured impact review record missing: ${IMPACT_REVIEW_PATH}`,
    );
  const bytes = blobBytes(snapshot, entry);
  if (!bytes) throw new Error("Impact review record blob is missing");
  return parseImpactReviewRecord(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
  );
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function validateDecisionAgainstSnapshot(
  path: string,
  decision: ImpactDecision,
  prepared: PreparedImpactReview,
  changedPaths: ReadonlySet<string>,
): void {
  if (decision.kind === "not_applicable") {
    if (!prepared.policy.notApplicablePaths.includes(path))
      throw new Error(`Policy does not permit not_applicable for ${path}`);
    return;
  }
  const inScope = prepared.scopedRequirementIdsByPath.get(path) ?? [];
  if (decision.kind === "no_impact") {
    if (inScope.length !== 0)
      throw new Error(
        `no_impact cannot omit scoped requirements for ${path}: ${inScope.join(", ")}`,
      );
    return;
  }
  const scoped = [...inScope].sort();
  const reqs = [...new Set(decision.requirementIds)].sort();
  if (
    reqs.length !== decision.requirementIds.length ||
    reqs.length !== scoped.length ||
    reqs.some((id, index) => id !== scoped[index])
  )
    throw new Error(
      `Impact requirements do not equal the complete scoped set for ${path}`,
    );
  if (decision.knowledge.state === "still_current") return;
  const after = prepared.headEntities;
  const before = prepared.baseEntities;
  let changedRequirement = false;
  const updatedRequirementIds = new Set<string>();
  for (const entity of decision.knowledge.entities) {
    const oldRow = before.get(entity.entityId);
    const newRow = after.get(entity.entityId);
    if (
      !newRow ||
      newRow.artifactPath !== entity.artifactPath ||
      !changedPaths.has(entity.artifactPath)
    )
      throw new Error(
        `Updated entity does not resolve to a changed scoped artifact: ${entity.entityId}`,
      );
    if (
      entity.beforeFingerprint !== (oldRow?.fingerprint ?? null) ||
      entity.afterFingerprint !== newRow.fingerprint ||
      entity.beforeFingerprint === entity.afterFingerprint
    )
      throw new Error(
        `Updated entity fingerprints are stale or semantically unchanged: ${entity.entityId}`,
      );
    if (newRow.type === "req") {
      if (!reqs.includes(entity.entityId))
        throw new Error(
          `Updated requirement is outside the complete scoped set: ${entity.entityId}`,
        );
      changedRequirement = true;
      updatedRequirementIds.add(entity.entityId);
    }
  }
  if (!changedRequirement)
    throw new Error(
      `Updated evidence for ${path} must include a semantically changed scoped requirement`,
    );
  const unchangedRequirementIds = new Set<string>();
  for (const item of decision.knowledge.stillCurrent ?? []) {
    if (!reqs.includes(item.requirementId))
      throw new Error(
        `stillCurrent requirement is outside the complete scoped set: ${item.requirementId}`,
      );
    if (updatedRequirementIds.has(item.requirementId))
      throw new Error(
        `Requirement is both updated and still_current: ${item.requirementId}`,
      );
    unchangedRequirementIds.add(item.requirementId);
  }
  if (
    unchangedRequirementIds.size !==
      (decision.knowledge.stillCurrent?.length ?? 0) ||
    updatedRequirementIds.size + unchangedRequirementIds.size !== reqs.length ||
    reqs.some(
      (id) =>
        !updatedRequirementIds.has(id) && !unchangedRequirementIds.has(id),
    )
  )
    throw new Error(
      `Updated evidence must account for every scoped requirement on ${path}`,
    );
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function validateAnalysisReviews(
  record: ImpactFileRecord,
  policy: ImpactPolicy,
): void {
  for (const side of ["before", "after"] as const) {
    const analysis = record[side]?.analysis;
    const reviews = record.analysisReviews.filter(
      (review) => review.side === side,
    );
    const obligation = analysisObligation(side, analysis, record.newHunkRanges);
    if (obligation.kind === "blocked")
      throw new Error(
        `Source analysis cannot be waived for ${record.path} (${side}): ${obligation.reason}`,
      );
    if (obligation.kind === "none") {
      if (reviews.length)
        throw new Error(
          `Unnecessary analysis review on ${record.path} (${side}); only after-side gaps that overlap changed lines need review`,
        );
      continue;
    }
    if (obligation.kind === "unsupported_review") {
      if (
        !policy.allowUnsupportedReview ||
        reviews.length !== 1 ||
        reviews[0]?.kind !== "unsupported_review"
      )
        throw new Error(
          `Unsupported side lacks one explicit whole-file review: ${record.path} (${side})`,
        );
      continue;
    }
    const allowedClass = analysis
      ? approvedPartialClass(policy, analysis)
      : null;
    if (!allowedClass)
      throw new Error(
        `Partial side is not approved by policy: ${record.path} (${side})`,
      );
    const review = reviews[0];
    if (
      reviews.length !== 1 ||
      review?.kind !== "partial_review" ||
      review.limitationClass !== allowedClass ||
      !same(review.ranges, obligation.ranges)
    )
      throw new Error(
        `Partial review must cover every uncovered range that overlaps changed lines: ${record.path} (${side})`,
      );
  }
}
