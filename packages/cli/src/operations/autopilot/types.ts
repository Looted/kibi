import type { OperationResult } from "../../public/operations/types.js";

export type AutopilotBootstrapContext = {
  readonly projectSummary?: string;
  readonly sourceOfTruthPaths?: readonly string[];
  readonly sourceOfTruthNotes?: readonly string[];
  readonly priorityRoots?: readonly string[];
  readonly verificationAnchors?: readonly string[];
};

export type AutopilotGenerateArgs = {
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
  readonly bootstrapContext?: AutopilotBootstrapContext;
};

export type AutopilotConfidence = {
  readonly score: number;
  readonly level: "high" | "medium" | "low";
  readonly reasons: readonly string[];
  readonly policy: "full_actions" | "review_required" | "handoff_only";
};

export type AutopilotRecommendedAction = {
  readonly order: number;
  readonly kind: "query" | "upsert" | "check" | "handoff";
  readonly description: string;
  readonly candidateIds?: readonly string[];
};

export type AutopilotDeclaredContext = {
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
  | "attached_thin_handoff"
  | "attached_seeded_handoff"
  | "vendored_blocked";

export const AUTOPILOT_PROVIDER_ORDER = [
  "typed_kibi_docs",
  "generic_repo_docs",
  "repo_metadata",
  "repo_layout",
  "test_topology",
  "source_symbols",
] as const;

export type EvidenceProviderName = (typeof AUTOPILOT_PROVIDER_ORDER)[number];
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

export type AutopilotEvidence = {
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
  readonly evidence: readonly AutopilotEvidence[];
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

export type SourceOnlySignal = {
  readonly kind: "req" | "scenario" | "test";
  readonly title: string;
  readonly sourcePath: string;
  readonly confidence: number;
  readonly evidence: readonly string[];
};

export type AutopilotStructuredContent = Readonly<Record<string, unknown>> & {
  readonly candidates: readonly Readonly<Record<string, unknown>>[];
  readonly applyPlan: readonly Readonly<Record<string, unknown>>[];
  readonly suppressedCandidates: readonly Readonly<Record<string, unknown>>[];
};

export type AutopilotGenerateResult =
  OperationResult<AutopilotStructuredContent> & {
    readonly migrationWarning: string | null;
    readonly candidates: readonly Readonly<Record<string, unknown>>[];
    readonly applyPlan: readonly Readonly<Record<string, unknown>>[];
    readonly suppressedCandidates: readonly Readonly<Record<string, unknown>>[];
    readonly payoffSummary: Readonly<Record<string, unknown>>;
  };
