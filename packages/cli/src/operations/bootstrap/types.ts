import type { OperationResult } from "../../public/operations/types.js";
import { createHash } from "node:crypto";
import { canonicalize } from "../semantic-advisor/shared.js";

export function bootstrapPlanHash(
  plan: Readonly<Record<string, unknown>>,
): string {
  const { planHash: _ignored, ...body } = plan;
  return createHash("sha256").update(canonicalize(body)).digest("hex");
}

/** Bind a freshly initialized, not-yet-synced branch to its exact source state. */
export function bootstrapEmptyKbSnapshotId(input: {
  readonly branch: string;
  readonly workspaceSnapshot: string;
  readonly sourceHashes: Readonly<Record<string, string | null>>;
}): string {
  return `empty-source-state-${createHash("sha256")
    .update(
      canonicalize({
        version: "kibi.empty-source-state.v1",
        branch: input.branch,
        workspaceSnapshot: input.workspaceSnapshot,
        sourceHashes: input.sourceHashes,
      }),
    )
    .digest("hex")}`;
}

export type BootstrapContext = {
  readonly projectSummary?: string;
  readonly sourceOfTruthPaths?: readonly string[];
  readonly sourceOfTruthNotes?: readonly string[];
  readonly priorityRoots?: readonly string[];
  readonly verificationAnchors?: readonly string[];
};

export type PlanBootstrapArgs = {
  readonly includeGenericMarkdown?: boolean;
  readonly minConfidence?: number;
  readonly maxCandidates?: number;
  readonly entityTypes?: readonly (
    | "req"
    | "scenario"
    | "test"
    | "adr"
    | "fact"
    | "symbol"
  )[];
  readonly bootstrapContext?: BootstrapContext;
};

export type BootstrapConfidence = {
  readonly score: number;
  readonly level: "high" | "medium" | "low";
  readonly reasons: readonly string[];
  readonly policy: "full_actions" | "review_required" | "handoff_only";
};

export type BootstrapRecommendedAction = {
  readonly order: number;
  readonly kind: "query" | "plan" | "upsert" | "check" | "handoff";
  readonly description: string;
  readonly candidateIds?: readonly string[];
};

export type BootstrapDeclaredContext = {
  readonly projectSummary?: string;
  readonly sourceOfTruthPaths: readonly string[];
  readonly sourceOfTruthNotes: readonly string[];
  readonly priorityRoots: readonly string[];
  readonly verificationAnchors: readonly string[];
};

export type ActivationState =
  | "root_uninitialized"
  | "root_partial"
  | "vendored_only"
  | "root_active_thin"
  | "root_active_seeded";

export type ActivationMode =
  | "cold_start_bootstrap"
  | "repair_bootstrap"
  | "attached_thin_bootstrap"
  | "attached_thin_handoff"
  | "attached_seeded_handoff"
  | "vendored_blocked";

export const BOOTSTRAP_PROVIDER_ORDER = [
  "typed_kibi_docs",
  "generic_repo_docs",
  "repo_metadata",
  "repo_layout",
  "test_topology",
  "source_symbols",
] as const;

export type EvidenceProviderName = (typeof BOOTSTRAP_PROVIDER_ORDER)[number];
export type EvidenceKind =
  | "typed_markdown"
  | "symbol_manifest"
  | "generic_markdown"
  | "repo_metadata"
  | "repo_layout"
  | "test_topology"
  | "source_symbols";

export type ActivationPolicy = {
  readonly activationState: ActivationState;
  readonly activationMode: ActivationMode;
  readonly applyBlocked: boolean;
  readonly allowCandidateGeneration: boolean;
  readonly reason: string;
  readonly handoffMessage?: string;
};

export type BootstrapEvidence = {
  readonly provider: EvidenceProviderName;
  readonly kind: EvidenceKind;
  readonly label: string;
  readonly relativePath?: string;
  readonly absolutePath?: string;
  readonly content?: string;
  readonly data: Readonly<Record<string, unknown>>;
};

export type DiscoverySummary = {
  readonly activationState: ActivationState;
  readonly activationMode: ActivationMode;
  readonly applyBlocked: boolean;
  readonly reason: string;
  readonly handoffMessage?: string;
  readonly vendored?: readonly string[];
  readonly providersRun: readonly EvidenceProviderName[];
  readonly providerCounts: Readonly<Record<string, number>>;
  readonly detectedLanguages: readonly string[];
  readonly detectedTestFrameworks: readonly string[];
  readonly excludedRoots: readonly string[];
  readonly truncated: boolean;
  readonly scanWarnings: readonly string[];
};

export type DiscoveryResult = {
  readonly activation: ActivationPolicy;
  readonly evidence: readonly BootstrapEvidence[];
  readonly ignoredSources: readonly string[];
  readonly summary: DiscoverySummary;
  readonly migrationWarning: string | null;
};

export type Candidate = {
  readonly candidateId: string;
  readonly entityType: string;
  readonly title: string;
  readonly sourceKind: string;
  readonly sourcePath: string;
  readonly confidence: number;
  readonly confidenceBand: string;
  readonly evidence: readonly string[];
  readonly relationships: readonly {
    readonly type: string;
    readonly from: string;
    readonly to: string;
  }[];
  readonly applyPlan: readonly Readonly<Record<string, unknown>>[];
};

export type BootstrapAction = Readonly<{
  readonly id: string;
  readonly kind: "upsert";
  readonly dependsOn: readonly string[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly candidateId?: string;
}>;

export type BootstrapPlanV1 = Readonly<{
  readonly version: "kibi.bootstrap-plan.v1";
  readonly planHash: string;
  readonly status: "ready" | "needs_context" | "blocked" | "handoff";
  readonly expected: Readonly<{
    readonly branch: string;
    readonly kbSnapshotId: string;
    readonly workspaceSnapshot: string;
    readonly sourceHashes: Readonly<Record<string, string | null>>;
  }>;
  readonly activation: Readonly<{
    readonly activationState: ActivationState;
    readonly activationMode: ActivationMode;
    readonly applyBlocked: boolean;
    readonly reason: string;
  }>;
  readonly declaredContext: BootstrapDeclaredContext;
  readonly contextQuestions: readonly string[];
  readonly confidence: Readonly<Record<string, unknown>>;
  readonly discoverySummary: DiscoverySummary;
  readonly candidates: readonly Readonly<Record<string, unknown>>[];
  readonly actions: readonly BootstrapAction[];
  readonly sourceWrites: readonly Readonly<Record<string, unknown>>[];
  readonly suppressedCandidates: readonly Readonly<Record<string, unknown>>[];
  readonly payoffSummary: Readonly<Record<string, unknown>>;
  readonly diagnostics: readonly string[];
}>;

export type SourceOnlySignal = {
  readonly kind: "req" | "scenario" | "test";
  readonly title: string;
  readonly sourcePath: string;
  readonly confidence: number;
  readonly evidence: readonly string[];
};

export type BootstrapStructuredContent = Readonly<Record<string, unknown>> & {
  /** The exact hash-bound plan returned by this read-only operation. */
  readonly plan: BootstrapPlanV1;
  readonly version: "kibi.bootstrap-plan.v1";
  readonly planHash: string;
  readonly status: BootstrapPlanV1["status"];
  readonly tldr: string;
  readonly activationReason: string;
  readonly candidates: readonly Readonly<Record<string, unknown>>[];
  readonly actions: readonly BootstrapAction[];
  readonly suppressedCandidates: readonly Readonly<Record<string, unknown>>[];
  readonly diagnostics: readonly string[];
};

export type PlanBootstrapResult =
  OperationResult<BootstrapStructuredContent> & {
    readonly structuredContent: BootstrapStructuredContent;
  };
