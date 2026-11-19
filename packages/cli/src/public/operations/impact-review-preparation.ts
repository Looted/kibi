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
  IMPACT_REVIEW_PATH,
  IMPACT_REVIEW_VERSION,
  canonicalJson,
} from "../../traceability/impact-review.js";
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

/** The items in code-unit order of their keys, equal keys kept in order. */
function sortedBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = key(item);
    groups.set(name, [...(groups.get(name) ?? []), item]);
  }
  return [...groups.keys()].sort().flatMap((name) => groups.get(name) as T[]);
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
  /** Paths whose complete evidence and requirement context to return. */
  paths?: readonly string[];
  /** The first file row to return. */
  offset?: number;
}>;

/** Where the authored review record lives, and the schema it follows. */
export const IMPACT_REVIEW_SCHEMA_ID = "urn:kibi:impact-review:v1";
export const IMPACT_REVIEW_SCHEMA_RESOURCE =
  "resources/impact-review.schema.json";

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
    // rationale: the streams only keep git's own complaint off the console
    // Stryker disable next-line ArrayDeclaration
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
    // A diff snapshot is checked to start at the selected base commit.
    baseCommit: snapshot.headCommit,
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
    sortedBy(
      Object.entries(entity).filter(
        ([key]) =>
          !["created_at", "updated_at", "proof_receipts"].includes(key),
      ),
      ([key]) => key,
    ),
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
  const relationships = sortedBy(
    [...allRows.entries()].flatMap(([ownerId, candidate]) =>
      candidate.relationships
        .filter(
          (relationship) =>
            SEMANTIC_RELATIONSHIPS.has(relationship.type) &&
            (relationship.from === id || relationship.to === id),
        )
        .map((relationship) => ({ ownerId, ...relationship })),
    ),
    canonicalJson,
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
  return sortedBy(obligations, (row) => `${row.path}\0${row.side}`);
}

export function withoutAnalysisReviews<T extends { analysisReviews: unknown }>(
  file: T,
): Omit<T, "analysisReviews"> {
  const { analysisReviews: _analysisReviews, ...evidence } = file;
  return evidence;
}

/** The record headers that bind a review to its policy, evaluator and scope. */
export function recordHeaders(
  prepared: PreparedImpactReview,
): Record<string, unknown> {
  return {
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
}

type FileEvidence = PreparedImpactReview["files"][number];

function analysisStatus(file: FileEvidence, side: "before" | "after") {
  return file[side]?.analysis?.status ?? null;
}

/** A file as a list needs it: what changed and what its review still needs. */
export function fileRow(
  file: FileEvidence,
  requirementIds: readonly string[],
  obligations: readonly Record<string, unknown>[],
): Record<string, unknown> {
  return {
    path: file.path,
    status: file.status,
    disposition: file.disposition,
    analysisDepth: file.analysisDepth,
    analysis: {
      before: analysisStatus(file, "before"),
      after: analysisStatus(file, "after"),
    },
    requirementIds: [...requirementIds].sort(),
    pendingObligations: obligations.filter((row) => row.path === file.path)
      .length,
  };
}

/** One side of a requirement, by the fingerprint a decision binds to. */
function requirementSide(
  id: string,
  entities: PreparedImpactReview["baseEntities"],
): Record<string, unknown> {
  const binding = entities.get(id);
  return binding
    ? {
        state: "present",
        entityFingerprint: binding.fingerprint,
        artifactPath: binding.artifactPath,
      }
    : { state: "absent", entityFingerprint: null, artifactPath: null };
}

/**
 * Each scoped requirement once, with the fingerprints an `updated` decision
 * names. Its statement and links are one kb_query away, or in a named path's
 * evidence.
 */
export function requirementBindings(
  prepared: PreparedImpactReview,
  paths: readonly string[],
): readonly Record<string, unknown>[] {
  const ids = new Set(
    paths.flatMap(
      (path) => prepared.scopedRequirementIdsByPath.get(path) ?? [],
    ),
  );
  return [...ids].sort().map((id) => ({
    id,
    before: requirementSide(id, prepared.baseEntities),
    after: requirementSide(id, prepared.headEntities),
  }));
}

/** Full evidence and requirement context for the paths a call names. */
export function namedEvidence(
  prepared: PreparedImpactReview,
  snapshot: GitChangeSnapshot,
  paths: readonly string[],
): readonly Record<string, unknown>[] {
  const files = new Map(prepared.files.map((file) => [file.path, file]));
  const unknown = paths.filter((path) => !files.has(path));
  if (unknown.length > 0)
    throw new Error(
      `Not in the captured review inventory: ${unknown.join(", ")}`,
    );
  const before = entityMap(snapshot, snapshot.baseTree);
  const after = entityMap(snapshot, snapshot.headTree);
  return [...new Set(paths)].sort().map((path) => {
    const requirementIds = [
      ...(prepared.scopedRequirementIdsByPath.get(path) ?? []),
    ].sort();
    return {
      ...withoutAnalysisReviews(files.get(path) as FileEvidence),
      requirements: {
        before: requirementIds.map((id) =>
          requirementContext(id, before, prepared.baseEntities, before),
        ),
        after: requirementIds.map((id) =>
          requirementContext(id, after, prepared.headEntities, after),
        ),
      },
    };
  });
}

/** What the reviewer authors, and how the record is written. */
const AUTHORING = {
  operation: "kb_author_impact_review",
  recordPath: IMPACT_REVIEW_PATH,
  authoredFields: [
    "files[].decision",
    "files[].analysisReviews",
    "reviewer.id",
    "reviewedAt",
  ],
  schema: {
    id: IMPACT_REVIEW_SCHEMA_ID,
    skill: "kibi-commit-review",
    resource: IMPACT_REVIEW_SCHEMA_RESOURCE,
  },
  instructions:
    "Decide each file, then send the decisions with recordHeaders.scope.fingerprint to kb_author_impact_review; Kibi adds the evidence, validates the record and writes it. Stage the record with git add -f. Kibi generates no decision, approval, signature or proof.",
} as const;

export function buildPreparation(
  input: PrepareImpactReviewInput,
  snapshot: GitChangeSnapshot,
  prepared: PreparedImpactReview,
): Record<string, unknown> {
  const files = sortedBy(prepared.files, (file) => file.path);
  const offset = input.offset ?? 0;
  const page = files.slice(offset);
  const pagePaths = page.map((file) => file.path);
  const obligations = residualReviewObligations(prepared).filter((row) =>
    pagePaths.includes(String(row.path)),
  );
  return {
    preparationVersion: "kibi.impact-review-preparation.v2",
    status: "ready_for_authoring",
    snapshot: snapshotIdentity(input.scope, snapshot),
    recordHeaders: recordHeaders(prepared),
    fileCount: files.length,
    files: page.map((file) =>
      fileRow(
        file,
        prepared.scopedRequirementIdsByPath.get(file.path) ?? [],
        obligations,
      ),
    ),
    requirements: requirementBindings(prepared, pagePaths),
    residualReviewObligations: obligations,
    ...(input.paths && input.paths.length > 0
      ? { evidence: namedEvidence(prepared, snapshot, input.paths) }
      : {}),
    authoring: AUTHORING,
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

/** A captured review scope, and the check that it held while it was used. */
export type CapturedImpactReview = Readonly<{
  snapshot: GitChangeSnapshot;
  prepared: PreparedImpactReview;
  /** Throws when the snapshot or the trusted closures changed since capture. */
  assertUnchanged: () => void;
}>;

/**
 * Captures the scope, analyzes both sides of every changed file and binds
 * the trusted policy, provider and evaluator closures. Callers build their
 * result first and then call assertUnchanged, so nothing is returned for a
 * workspace or closure that changed mid-way.
 */
export async function captureImpactReview(
  scope: ImpactReviewPreparationScope,
  workspaceRoot: string,
): Promise<CapturedImpactReview> {
  validateDiffInput(scope);
  const snapshot =
    scope.kind === "staged"
      ? captureStagedSnapshot(workspaceRoot)
      : captureDiffSnapshot(workspaceRoot, scope.baseCommit, scope.headCommit);
  if (scope.kind === "diff")
    assertExplicitDiffUnchanged(workspaceRoot, scope, snapshot);

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
  const assertUnchanged = () => {
    snapshot.assertUnchanged();
    if (scope.kind === "diff")
      assertExplicitDiffUnchanged(workspaceRoot, scope, snapshot);
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
    if (scope.kind === "diff")
      assertExplicitDiffUnchanged(workspaceRoot, scope, snapshot);
  };
  return { snapshot, prepared, assertUnchanged };
}

export async function executePrepareImpactReview(
  input: PrepareImpactReviewInput,
  context: OperationContext,
): Promise<OperationResult<Record<string, unknown>>> {
  const { snapshot, prepared, assertUnchanged } = await captureImpactReview(
    input.scope,
    context.workspaceRoot,
  );
  // Build all KB-derived context before the final snapshot/closure checks.
  // Projection can be substantial, so checking only before it could return
  // evidence for a workspace or evaluator closure that changed mid-projection.
  const data = buildPreparation(input, snapshot, prepared);
  assertUnchanged();
  const files = data.files as readonly unknown[];
  return {
    content: [
      {
        type: "text",
        text: `Prepared the complete ${input.scope.kind} impact-review scope: ${String(data.fileCount)} file(s), ${files.length} listed from offset ${input.offset ?? 0}; every review decision remains unauthored.`,
      },
    ],
    structuredContent: data,
  };
}
