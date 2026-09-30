import type { SourceChangeAnalysis } from "../plugins/source-change-analysis.js";
import entitySchema from "../schemas/entity.schema.json" with { type: "json" };
import { analysisObligation } from "./analysis-gate.js";
import type { GitChangeSnapshot } from "./git-change-snapshot.js";
import type { StagedPath } from "./git-staged.js";
import {
  type EntityRow,
  entityRowsWithRelationships,
  rawKnowledgeFingerprint,
  requirementScope,
  semanticKnowledgeFingerprint,
} from "./impact-knowledge.js";
import { approvedPartialClass, loadBaseImpactPolicy } from "./impact-policy.js";
import impactPolicySchema from "./impact-policy.v1.schema.json" with {
  type: "json",
};
import {
  recordFromCapturedTree,
  same,
  validateAnalysisReviews,
  validateDecisionAgainstSnapshot,
} from "./impact-record-validation.js";
import {
  type AnalysisReview,
  type Fingerprint,
  IMPACT_EVALUATOR_VERSION,
  IMPACT_REVIEW_PATH,
  IMPACT_REVIEW_VERSION,
  type ImpactDecision,
  type ImpactFileRecord,
  type ImpactPolicy,
  type ImpactReviewDiagnostic,
  type ImpactReviewRecord,
  assertSha256,
  fingerprint,
  parseImpactReviewRecord,
} from "./impact-review.js";
import impactReviewSchema from "./impact-review.schema.json" with {
  type: "json",
};
import {
  assertAnalysisInput,
  exactPathProjection,
  isReceiptOnlyChange,
  projectedPathEvidence,
  sideEvidence,
} from "./impact-side-evidence.js";

export type ImpactPreparationOptions = Readonly<{
  /** Resolved by the trusted host from its approved provider closure. */
  providerSetFingerprint: Fingerprint;
  /** Hash of the trusted evaluator/normalizers in the host package. */
  evaluatorFingerprint: Fingerprint;
  /** Both sides must be analyzed from snapshot bytes before preparation. */
  analyses: ReadonlyMap<string, SourceChangeAnalysis>;
}>;

export type PreparedImpactReview = Readonly<{
  policy: ImpactPolicy;
  policyFingerprint: Fingerprint;
  evaluatorFingerprint: Fingerprint;
  providerSetFingerprint: Fingerprint;
  knowledgeFingerprint: Fingerprint;
  scopeFingerprint: Fingerprint;
  files: readonly Omit<ImpactFileRecord, "decision">[];
  scopedRequirementIdsByPath: ReadonlyMap<string, readonly string[]>;
  baseEntities: ReadonlyMap<string, EntityRow>;
  headEntities: ReadonlyMap<string, EntityRow>;
  /** Exact impact record digest input, excluding only the record path. */
  scopePayload: unknown;
}>;

export type ImpactEvaluation = Readonly<{
  passed: boolean;
  scopeFingerprint?: Fingerprint;
  diagnostics: readonly ImpactReviewDiagnostic[];
  /** Local review is self-claimed and never an authorization attestation. */
  reviewerAuthority: "self-claimed-local" | "none";
}>;

/**
 * Identify the trusted evaluator by the contract it implements, not by where
 * it is installed. The identity is the evaluator contract version plus the
 * canonical JSON of every schema the evaluator and KB normalization consume.
 * Schemas are imported (and therefore inlined by bundlers), so the CLI, the
 * bundled runtime and CI compute the same value for the same release on any
 * machine or Node version. Bump IMPACT_EVALUATOR_VERSION whenever decision
 * semantics change so reviews bound to the old evaluator become stale.
 */
// implements REQ-impact-policy-stage-e-content-bound-review
export function fingerprintImpactEvaluator(): Fingerprint {
  return fingerprint({
    contractVersion: "kibi.impact-evaluator-identity.v2",
    evaluatorVersion: IMPACT_EVALUATOR_VERSION,
    schemas: {
      entity: fingerprint(entitySchema),
      impactPolicy: fingerprint(impactPolicySchema),
      impactReview: fingerprint(impactReviewSchema),
    },
  });
}

export function prepareImpactReview(
  snapshot: GitChangeSnapshot,
  options: ImpactPreparationOptions,
): PreparedImpactReview {
  assertSha256(options.providerSetFingerprint, "Provider-set fingerprint");
  assertSha256(options.evaluatorFingerprint, "Evaluator fingerprint");
  const policy = loadBaseImpactPolicy(snapshot);
  const policyFingerprint = fingerprint(policy);
  const baseEntities = entityRowsWithRelationships(snapshot, snapshot.baseTree);
  const headEntities = entityRowsWithRelationships(snapshot, snapshot.headTree);
  const knowledgeFingerprint = fingerprint({
    baseRaw: rawKnowledgeFingerprint(snapshot, snapshot.baseTree),
    headRaw: rawKnowledgeFingerprint(snapshot, snapshot.headTree),
    baseSemantic: semanticKnowledgeFingerprint(baseEntities),
    headSemantic: semanticKnowledgeFingerprint(headEntities),
  });
  const sourceInventory = impactReviewInventory(snapshot);
  const inventoryPaths = new Set(sourceInventory.map((file) => file.path));
  const receiptOnlyPaths = new Set(
    snapshot.inventory.filter(isReceiptOnlyChange).map((file) => file.path),
  );
  for (const path of options.analyses.keys())
    if (
      path !== IMPACT_REVIEW_PATH &&
      !inventoryPaths.has(path) &&
      !receiptOnlyPaths.has(path)
    )
      throw new Error(`Analysis contains an extraneous changed path: ${path}`);
  const files: Omit<ImpactFileRecord, "decision">[] = [];
  const scopeFiles: unknown[] = [];
  const scopedRequirementIdsByPath = new Map<string, readonly string[]>();
  for (const file of sourceInventory) {
    const suppliedChange = options.analyses.get(file.path);
    const projectedFile = projectedPathEvidence(
      suppliedChange?.after?.status === "ok"
        ? { ...file, analysisDepth: "symbol", disposition: "checked" }
        : file,
    );
    const change =
      file.analysisDepth === "metadata" || file.skipReason
        ? undefined
        : suppliedChange;
    assertAnalysisInput(file, change);
    const previousPath = file.oldPath ?? file.copyFromPath ?? file.path;
    const before =
      file.status === "A"
        ? null
        : sideEvidence(
            snapshot,
            snapshot.baseTree,
            previousPath,
            change?.before ?? null,
            file.previousContent,
          );
    const after =
      file.status === "D"
        ? null
        : sideEvidence(
            snapshot,
            snapshot.headTree,
            file.path,
            change?.after ?? null,
            file.content,
          );
    if (before === null && after === null)
      throw new Error(`Changed path has no captured Git side: ${file.path}`);
    const reviews: AnalysisReview[] = [];
    const reqIds = new Set<string>();
    for (const [side, evidence, path] of [
      ["before", before, previousPath],
      ["after", after, file.path],
    ] as const) {
      const sourcePaths = path === file.path ? [file.path] : [path];
      for (const id of requirementScope(baseEntities, sourcePaths))
        reqIds.add(id);
      for (const id of requirementScope(headEntities, sourcePaths))
        reqIds.add(id);
      const obligation = analysisObligation(
        side,
        evidence?.analysis,
        projectedFile.hunkRanges,
      );
      if (obligation.kind === "blocked")
        throw new Error(
          `Required source analysis cannot pass for ${file.path} (${side}): ${obligation.reason}`,
        );
      if (
        obligation.kind === "unsupported_review" &&
        !policy.allowUnsupportedReview
      )
        throw new Error(
          `Unsupported source analysis is not reviewable by policy for ${file.path} (${side})`,
        );
      // The prepared snapshot lists what a reviewer must cover; it never
      // manufactures the review itself. The record must supply rationale.
      if (
        obligation.kind === "partial_review" &&
        evidence?.analysis &&
        !approvedPartialClass(policy, evidence.analysis)
      )
        throw new Error(
          `Partial source analysis is not allowed by trusted policy for ${file.path} (${side})`,
        );
    }
    files.push({
      path: projectedFile.path,
      status: projectedFile.status,
      ...(projectedFile.oldPath ? { oldPath: projectedFile.oldPath } : {}),
      ...(projectedFile.copyFromPath
        ? { copyFromPath: projectedFile.copyFromPath }
        : {}),
      analysisDepth: projectedFile.analysisDepth,
      disposition: projectedFile.disposition,
      ...(projectedFile.skipReason
        ? { skipReason: projectedFile.skipReason }
        : {}),
      ...(projectedFile.gitMode ? { gitMode: projectedFile.gitMode } : {}),
      ...(projectedFile.previousMode
        ? { previousMode: projectedFile.previousMode }
        : {}),
      oldHunkRanges: projectedFile.oldHunkRanges ?? [],
      newHunkRanges: projectedFile.hunkRanges,
      before,
      after,
      analysisReviews: reviews,
    });
    scopeFiles.push(exactPathProjection(projectedFile, before, after));
    scopedRequirementIdsByPath.set(file.path, [...reqIds].sort());
  }
  const scopePayload = {
    contractVersion: IMPACT_EVALUATOR_VERSION,
    policyFingerprint,
    evaluatorFingerprint: options.evaluatorFingerprint,
    providerSetFingerprint: options.providerSetFingerprint,
    knowledgeFingerprint,
    files: scopeFiles,
  };
  const scopeFingerprint = fingerprint(scopePayload);
  return {
    policy,
    policyFingerprint,
    evaluatorFingerprint: options.evaluatorFingerprint,
    providerSetFingerprint: options.providerSetFingerprint,
    knowledgeFingerprint,
    scopeFingerprint,
    files,
    scopedRequirementIdsByPath,
    baseEntities,
    headEntities,
    scopePayload,
  };
}

export function createImpactReviewRecord(
  prepared: PreparedImpactReview,
  decisions: ReadonlyMap<
    string,
    Readonly<{
      decision: ImpactDecision;
      analysisReviews?: readonly AnalysisReview[];
    }>
  >,
  reviewerId: string,
  reviewedAt = new Date().toISOString(),
): ImpactReviewRecord {
  if (!reviewerId.trim()) throw new Error("Reviewer id is required");
  const expected = new Set(prepared.files.map((file) => file.path));
  if (
    decisions.size !== expected.size ||
    [...decisions.keys()].some((path) => !expected.has(path))
  )
    throw new Error(
      "Decisions must cover exactly the complete non-receipt inventory",
    );
  const files: ImpactFileRecord[] = prepared.files.map((file) => {
    const item = decisions.get(file.path);
    if (!item) throw new Error(`Missing decision for ${file.path}`);
    const authoredReviews = item.analysisReviews ?? [];
    return {
      ...file,
      analysisReviews: authoredReviews,
      decision: item.decision,
    };
  });
  for (const file of files) validateAnalysisReviews(file, prepared.policy);
  return parseImpactReviewRecord({
    contractVersion: IMPACT_REVIEW_VERSION,
    policy: {
      id: prepared.policy.id,
      version: prepared.policy.version,
      fingerprint: prepared.policyFingerprint,
    },
    evaluator: {
      contractVersion: IMPACT_EVALUATOR_VERSION,
      fingerprint: prepared.evaluatorFingerprint,
    },
    scope: {
      fingerprint: prepared.scopeFingerprint,
      knowledgeFingerprint: prepared.knowledgeFingerprint,
      providerSetFingerprint: prepared.providerSetFingerprint,
    },
    reviewer: { id: reviewerId, source: "self-claimed-local" },
    reviewedAt,
    files,
  });
}

export function evaluateImpactReview(
  snapshot: GitChangeSnapshot,
  options: ImpactPreparationOptions,
): ImpactEvaluation {
  const diagnostics: ImpactReviewDiagnostic[] = [];
  try {
    const record = recordFromCapturedTree(snapshot);
    const prepared = prepareImpactReview(snapshot, options);
    if (
      record.policy.id !== prepared.policy.id ||
      record.policy.version !== prepared.policy.version ||
      record.policy.fingerprint !== prepared.policyFingerprint
    )
      throw new Error(
        "Review policy binding does not match trusted base policy",
      );
    if (
      record.evaluator.contractVersion !== IMPACT_EVALUATOR_VERSION ||
      record.evaluator.fingerprint !== prepared.evaluatorFingerprint
    )
      throw new Error("Review evaluator binding is stale");
    if (record.scope.providerSetFingerprint !== prepared.providerSetFingerprint)
      throw new Error("Review provider-set binding is stale");
    if (record.scope.knowledgeFingerprint !== prepared.knowledgeFingerprint)
      throw new Error("Review captured-knowledge binding is stale");
    const expected = new Map(prepared.files.map((file) => [file.path, file]));
    if (record.files.length !== expected.size)
      throw new Error("Review omits or adds changed paths");
    const changedPaths = new Set(snapshot.inventory.map((file) => file.path));
    const seen = new Set<string>();
    for (const file of record.files) {
      if (seen.has(file.path))
        throw new Error(`Duplicate review path: ${file.path}`);
      seen.add(file.path);
      const captured = expected.get(file.path);
      if (!captured)
        throw new Error(`Review contains extraneous path: ${file.path}`);
      const {
        decision: _decision,
        analysisReviews: _analysisReviews,
        ...capturedEvidence
      } = file;
      const { analysisReviews: _capturedReviews, ...expectedEvidence } =
        captured;
      if (!same(capturedEvidence, expectedEvidence)) {
        const capturedFields = capturedEvidence as Record<string, unknown>;
        const expectedFields = expectedEvidence as Record<string, unknown>;
        const changedFields = [
          ...new Set([
            ...Object.keys(capturedFields),
            ...Object.keys(expectedFields),
          ]),
        ]
          .filter(
            (field) => !same(capturedFields[field], expectedFields[field]),
          )
          .sort();
        throw new Error(
          `Per-file Git or analysis fingerprint is stale: ${file.path} (${changedFields.join(", ")})`,
        );
      }
      validateAnalysisReviews(file, prepared.policy);
      validateDecisionAgainstSnapshot(
        file.path,
        file.decision,
        prepared,
        changedPaths,
      );
    }
    for (const path of expected.keys())
      if (!seen.has(path)) throw new Error(`Missing review path: ${path}`);
    if (record.scope.fingerprint !== prepared.scopeFingerprint)
      throw new Error(
        `Review scope fingerprint is stale (record ${record.scope.fingerprint}; prepared ${prepared.scopeFingerprint})`,
      );
    snapshot.assertUnchanged();
    return {
      passed: true,
      scopeFingerprint: prepared.scopeFingerprint,
      diagnostics,
      reviewerAuthority: "self-claimed-local",
    };
  } catch (error) {
    diagnostics.push({
      code: "impact_review_invalid",
      message: error instanceof Error ? error.message : String(error),
    });
    return { passed: false, diagnostics, reviewerAuthority: "none" };
  }
}

/** Verify that the transport path is unique and that no second path is excluded. */
export function impactReviewInventory(
  snapshot: GitChangeSnapshot,
): readonly StagedPath[] {
  const transport = snapshot.inventory.filter(
    (file) => file.path === IMPACT_REVIEW_PATH,
  );
  if (transport.length > 1)
    throw new Error("Duplicate impact review transport path");
  const receipt = transport[0];
  if (
    receipt &&
    ((receipt.status !== "A" && receipt.status !== "M") ||
      receipt.oldPath !== undefined ||
      receipt.copyFromPath !== undefined)
  )
    throw new Error(
      "Impact review receipt may only be added or modified at its exact path; rename/copy cannot hide another changed path",
    );
  return snapshot.inventory.filter(
    (file) => file.path !== IMPACT_REVIEW_PATH && !isReceiptOnlyChange(file),
  );
}

export {
  hasValidBaseImpactPolicy,
  impactPolicyFingerprint,
  loadBaseImpactPolicy,
} from "./impact-policy.js";
