import { execFileSync } from "node:child_process";
import {
  createMaintenanceSourceAnalysisService,
  fingerprintMaintenanceSourceSet,
  readSnapshotSourceConfig,
} from "../../plugins/maintenance-source-analysis.js";
import { analyzeSourceChanges } from "../../plugins/source-change-analysis.js";
import type { SourceChangeAnalysis } from "../../plugins/source-change-analysis.js";
import { analysisObligation } from "../../traceability/analysis-gate.js";
import {
  captureDiffSnapshot,
  captureStagedSnapshot,
} from "../../traceability/git-change-snapshot.js";
import type { GitChangeSnapshot } from "../../traceability/git-change-snapshot.js";
import {
  type PreparedImpactReview,
  fingerprintImpactEvaluator,
  prepareImpactReview,
} from "../../traceability/impact-evaluator.js";
import {
  IMPACT_EVALUATOR_VERSION,
  IMPACT_REVIEW_VERSION,
  canonicalJson,
} from "../../traceability/impact-review.js";
import impactReviewRecordSchema from "../../traceability/impact-review.schema.json" with {
  type: "json",
};
import { readSnapshotKnowledge } from "../../traceability/snapshot-knowledge.js";
import type { OperationContext } from "./runtime-types.js";
import type { OperationResult } from "./types.js";

const FULL_COMMIT_OID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const SEMANTIC_RELATIONSHIPS = new Set([
  "constrains",
  "depends_on",
  "requires_predicate",
  "requires_property",
  "requires_rule",
  "specified_by",
  "supersedes",
  "validates",
  "verified_by",
]);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export type ImpactReviewPreparationScope =
  | Readonly<{ kind: "staged" }>
  | Readonly<{
      kind: "diff";
      baseCommit: string;
      headCommit: string;
    }>;

export type PrepareImpactReviewInput = Readonly<{
  scope: ImpactReviewPreparationScope;
}>;

type SnapshotIdentity = Readonly<{
  kind: "staged" | "diff";
  baseCommit: string | null;
  baseTree: string;
  headCommit: string | null;
  headTree: string;
  headTreeSource: "index" | "commit";
}>;

type SnapshotEntity = Readonly<{
  entity: Readonly<Record<string, unknown>>;
  relationships: readonly Readonly<{
    type: string;
    from: string;
    to: string;
  }>[];
  sourceFile?: string;
}>;

function gitText(root: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function resolveCommit(root: string, oid: string): string {
  return gitText(root, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${oid}^{commit}`,
  ]);
}

function treeForCommit(root: string, oid: string): string {
  return gitText(root, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${oid}^{tree}`,
  ]);
}

function assertExplicitDiffUnchanged(
  root: string,
  input: Extract<ImpactReviewPreparationScope, { kind: "diff" }>,
  snapshot: GitChangeSnapshot,
): void {
  const baseCommit = resolveCommit(root, input.baseCommit);
  const headCommit = resolveCommit(root, input.headCommit);
  if (
    baseCommit !== input.baseCommit ||
    headCommit !== input.headCommit ||
    snapshot.headCommit !== baseCommit ||
    treeForCommit(root, baseCommit) !== snapshot.baseTree ||
    treeForCommit(root, headCommit) !== snapshot.headTree
  )
    throw new Error(
      "Selected diff commit or tree identity changed during impact review preparation",
    );
}

function snapshotIdentity(
  scope: ImpactReviewPreparationScope,
  snapshot: GitChangeSnapshot,
): SnapshotIdentity {
  return {
    kind: scope.kind,
    baseCommit: scope.kind === "diff" ? scope.baseCommit : snapshot.headCommit,
    baseTree: snapshot.baseTree,
    headCommit: scope.kind === "diff" ? scope.headCommit : null,
    headTree: snapshot.headTree,
    headTreeSource: scope.kind === "diff" ? "commit" : "index",
  };
}

function plainEntity(
  entity: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(entity)
      .filter(
        ([key]) =>
          !["created_at", "updated_at", "proof_receipts"].includes(key),
      )
      .sort(([left], [right]) => compareText(left, right)),
  );
}

function entityMap(
  snapshot: GitChangeSnapshot,
  tree: string,
): Map<string, SnapshotEntity> {
  return new Map(
    readSnapshotKnowledge(snapshot.readGit, tree, snapshot.readBlobs).map(
      (row) => [
        row.entity.id,
        {
          entity: row.entity as unknown as Readonly<Record<string, unknown>>,
          relationships: row.relationships.map(({ type, from, to }) => ({
            type,
            from,
            to,
          })),
          ...(row.sourceFile ? { sourceFile: row.sourceFile } : {}),
        },
      ],
    ),
  );
}

function requirementContext(
  id: string,
  rows: ReadonlyMap<string, SnapshotEntity>,
  entities: PreparedImpactReview["baseEntities"],
  allRows: ReadonlyMap<string, SnapshotEntity>,
): Record<string, unknown> {
  const row = rows.get(id);
  const binding = entities.get(id);
  if (!row || !binding) {
    return {
      id,
      state: "absent",
      entityFingerprint: null,
      artifactPath: null,
      sourcePath: null,
      relationships: [],
      relatedEntities: [],
    };
  }
  const relationships = [...allRows.entries()]
    .flatMap(([ownerId, candidate]) =>
      candidate.relationships
        .filter(
          (relationship) =>
            SEMANTIC_RELATIONSHIPS.has(relationship.type) &&
            (relationship.from === id || relationship.to === id),
        )
        .map((relationship) => ({ ownerId, ...relationship })),
    )
    .sort((left, right) =>
      compareText(canonicalJson(left), canonicalJson(right)),
    );
  const relatedIds = [
    ...new Set(
      relationships
        .flatMap(({ from, to }) => [from, to])
        .filter((relatedId) => relatedId !== id),
    ),
  ].sort();
  return {
    id,
    state: "present",
    entityFingerprint: binding.fingerprint,
    artifactPath: binding.artifactPath,
    sourcePath: binding.sourcePath ?? row.sourceFile ?? null,
    entity: plainEntity(row.entity),
    relationships: relationships.map(({ ownerId: _ownerId, ...edge }) => edge),
    relatedEntities: relatedIds.flatMap((relatedId) => {
      const related = allRows.get(relatedId);
      if (!related) return [];
      const relatedBinding = entities.get(relatedId);
      return [
        {
          id: relatedId,
          type: related.entity.type ?? null,
          entityFingerprint: relatedBinding?.fingerprint ?? null,
          artifactPath: relatedBinding?.artifactPath ?? null,
          sourcePath: relatedBinding?.sourcePath ?? related.sourceFile ?? null,
          entity: plainEntity(related.entity),
        },
      ];
    }),
  };
}

function requirementScopes(
  prepared: PreparedImpactReview,
  snapshot: GitChangeSnapshot,
): readonly Record<string, unknown>[] {
  const before = entityMap(snapshot, snapshot.baseTree);
  const after = entityMap(snapshot, snapshot.headTree);
  return [...prepared.scopedRequirementIdsByPath.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([path, requirementIds]) => ({
      path,
      requirementIds: [...requirementIds].sort(),
      before: [...requirementIds]
        .sort()
        .map((id) =>
          requirementContext(id, before, prepared.baseEntities, before),
        ),
      after: [...requirementIds]
        .sort()
        .map((id) =>
          requirementContext(id, after, prepared.headEntities, after),
        ),
    }));
}

function residualReviewObligations(
  prepared: PreparedImpactReview,
): readonly Record<string, unknown>[] {
  const obligations: Record<string, unknown>[] = [];
  for (const file of prepared.files) {
    for (const side of ["before", "after"] as const) {
      const analysis = file[side]?.analysis;
      if (!analysis) continue;
      const obligation = analysisObligation(side, analysis, file.newHunkRanges);
      if (obligation.kind === "unsupported_review") {
        obligations.push({
          path: file.path,
          side,
          status: analysis.status,
          diagnosticCodes: [...analysis.diagnosticCodes].sort(),
          kind: "unsupported_review",
          wholeFile: true,
          pending: true,
        });
        continue;
      }
      if (obligation.kind !== "partial_review") continue;
      const limitationClasses = new Set<string>();
      for (const code of analysis.diagnosticCodes) {
        const allowed = prepared.policy.allowedPartial.find(
          (entry) =>
            entry.providerId === analysis.providerId &&
            entry.providerFingerprint === analysis.providerFingerprint &&
            entry.diagnosticCode === code,
        );
        if (allowed) limitationClasses.add(allowed.limitationClass);
      }
      const limitationClass = [...limitationClasses][0];
      if (limitationClasses.size !== 1 || limitationClass === undefined)
        throw new Error(
          `Partial review obligation is not covered by the trusted policy: ${file.path} (${side})`,
        );
      obligations.push({
        path: file.path,
        side,
        status: analysis.status,
        diagnosticCodes: [...analysis.diagnosticCodes].sort(),
        kind: "partial_review",
        limitationClass,
        ranges: obligation.ranges.map((range) => ({ ...range })),
        pending: true,
      });
    }
  }
  return obligations.sort((left, right) =>
    compareText(`${left.path}\0${left.side}`, `${right.path}\0${right.side}`),
  );
}

function cloneRecordSchema(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(impactReviewRecordSchema)) as Record<
    string,
    unknown
  >;
}

function cloneRecordTemplateSchema(): Record<string, unknown> {
  const schema = cloneRecordSchema();
  schema.$id = "urn:kibi:impact-review-authoring-record-template:v1";
  const properties = schema.properties as Record<string, unknown>;
  properties.reviewedAt = { type: "null" };
  const definitions = schema.$defs as Record<string, unknown>;
  const reviewer = definitions.reviewer as {
    properties: Record<string, unknown>;
  };
  reviewer.properties.id = { type: "null" };
  const file = definitions.file as {
    properties: Record<string, unknown>;
  };
  file.properties.analysisReviews = {
    anyOf: [file.properties.analysisReviews, { type: "null" }],
  };
  file.properties.decision = {
    anyOf: [file.properties.decision, { type: "null" }],
  };
  return schema;
}

function authoringContract(
  prepared: PreparedImpactReview,
): Record<string, unknown> {
  const recordHeaders = {
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
  };
  return {
    templateVersion: "kibi.impact-review-authoring-template.v1",
    isValidImpactReviewRecord: false,
    instructions:
      "This template is reviewer input only. Author every decision, required analysis review, rationale, reviewer id, and reviewedAt before strict record validation. It is not an approval, signature, or proof receipt.",
    authoredFields: [
      "files[].decision",
      "files[].analysisReviews",
      "reviewer.id",
      "reviewedAt",
    ],
    recordSchema: cloneRecordSchema(),
    decisionSchema: { $ref: "urn:kibi:impact-review:v1#/$defs/decision" },
    analysisReviewSchema: {
      oneOf: [
        { $ref: "urn:kibi:impact-review:v1#/$defs/unsupportedReview" },
        { $ref: "urn:kibi:impact-review:v1#/$defs/partialReview" },
      ],
    },
    templateSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "urn:kibi:impact-review-authoring-template:v1",
      type: "object",
      additionalProperties: false,
      required: ["templateVersion", "isValidImpactReviewRecord", "record"],
      properties: {
        templateVersion: {
          const: "kibi.impact-review-authoring-template.v1",
        },
        isValidImpactReviewRecord: { const: false },
        record: cloneRecordTemplateSchema(),
      },
    },
    recordTemplate: {
      templateVersion: "kibi.impact-review-authoring-template.v1",
      isValidImpactReviewRecord: false,
      record: {
        ...recordHeaders,
        reviewer: { id: null, source: "self-claimed-local" },
        reviewedAt: null,
        files: prepared.files
          .slice()
          .sort((left, right) => compareText(left.path, right.path))
          .map((file) => ({
            ...withoutAnalysisReviews(file),
            analysisReviews: null,
            decision: null,
          })),
      },
    },
  };
}

function withoutAnalysisReviews<T extends { analysisReviews: unknown }>(
  file: T,
): Omit<T, "analysisReviews"> {
  const { analysisReviews: _analysisReviews, ...evidence } = file;
  return evidence;
}

function completeFileEvidence(
  prepared: PreparedImpactReview,
): readonly Record<string, unknown>[] {
  return prepared.files
    .slice()
    .sort((left, right) => compareText(left.path, right.path))
    .map((file) => withoutAnalysisReviews(file));
}

function buildPreparation(
  scope: ImpactReviewPreparationScope,
  snapshot: GitChangeSnapshot,
  prepared: PreparedImpactReview,
): Record<string, unknown> {
  return {
    preparationVersion: "kibi.impact-review-preparation.v1",
    status: "ready_for_authoring",
    snapshot: snapshotIdentity(scope, snapshot),
    recordHeaders: {
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
    },
    files: completeFileEvidence(prepared),
    requirementScopes: requirementScopes(prepared, snapshot),
    residualReviewObligations: residualReviewObligations(prepared),
    authorship: authoringContract(prepared),
  };
}

function validateDiffInput(scope: ImpactReviewPreparationScope): void {
  if (
    scope.kind === "diff" &&
    (!FULL_COMMIT_OID.test(scope.baseCommit) ||
      !FULL_COMMIT_OID.test(scope.headCommit))
  )
    throw new Error(
      "Diff scope requires full lowercase hexadecimal baseCommit and headCommit object IDs",
    );
}

export async function executePrepareImpactReview(
  input: PrepareImpactReviewInput,
  context: OperationContext,
): Promise<OperationResult<Record<string, unknown>>> {
  validateDiffInput(input.scope);
  const workspaceRoot = context.workspaceRoot;
  const snapshot =
    input.scope.kind === "staged"
      ? captureStagedSnapshot(workspaceRoot)
      : captureDiffSnapshot(
          workspaceRoot,
          input.scope.baseCommit,
          input.scope.headCommit,
        );
  if (input.scope.kind === "diff")
    assertExplicitDiffUnchanged(workspaceRoot, input.scope, snapshot);

  const trustedConfig = readSnapshotSourceConfig(snapshot, snapshot.baseTree);
  const providerSetFingerprint = fingerprintMaintenanceSourceSet(
    workspaceRoot,
    trustedConfig,
  );
  const evaluatorFingerprint = fingerprintImpactEvaluator();
  const service = createMaintenanceSourceAnalysisService(
    workspaceRoot,
    trustedConfig,
  );
  const analyses: ReadonlyMap<string, SourceChangeAnalysis> =
    await analyzeSourceChanges(snapshot.inventory, service);
  const prepared = prepareImpactReview(snapshot, {
    providerSetFingerprint,
    evaluatorFingerprint,
    analyses,
  });

  // Build all KB-derived context before the final snapshot/closure checks.
  // Projection can be substantial, so checking only before it could return
  // evidence for a workspace or evaluator closure that changed mid-projection.
  const data = buildPreparation(input.scope, snapshot, prepared);

  snapshot.assertUnchanged();
  if (input.scope.kind === "diff")
    assertExplicitDiffUnchanged(workspaceRoot, input.scope, snapshot);
  const finalProviderFingerprint = fingerprintMaintenanceSourceSet(
    workspaceRoot,
    trustedConfig,
  );
  const finalEvaluatorFingerprint = fingerprintImpactEvaluator();
  if (
    finalProviderFingerprint !== providerSetFingerprint ||
    finalEvaluatorFingerprint !== evaluatorFingerprint
  )
    throw new Error(
      "Trusted source-provider or impact-evaluator closure changed during impact review preparation",
    );
  snapshot.assertUnchanged();
  if (input.scope.kind === "diff")
    assertExplicitDiffUnchanged(workspaceRoot, input.scope, snapshot);

  return {
    content: [
      {
        type: "text",
        text: `Prepared complete ${input.scope.kind} impact-review authoring inputs; every review decision remains unauthored.`,
      },
    ],
    structuredContent: data,
  };
}
