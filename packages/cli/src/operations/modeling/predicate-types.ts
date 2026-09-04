// implements REQ-mcp-suggest-predicates
export type PredicatePolarity = "assert" | "deny";

// implements REQ-mcp-suggest-predicates
export interface PredicateUsageHints {
  use_when: string[];
  do_not_use_when: string[];
}

// implements REQ-mcp-suggest-predicates
export interface PredicateSchemaCandidate {
  id: string;
  predicate_name: string;
  title: string;
  description: string;
  argument_names: string[];
  argument_types: string[];
  /** Optional human-readable descriptions aligned with argument_names. */
  argument_descriptions?: string[];
  keywords: string[];
  /** Human-language aliases and controlled paraphrase templates used for deterministic retrieval. */
  aliases?: string[];
  paraphrase_templates?: string[];
  examples: string[];
  tags: string[];
  usage_hints?: PredicateUsageHints;
}

// implements REQ-mcp-suggest-predicates
export type SuggestPredicatesArgs = Readonly<Record<string, unknown>> & {
  readonly text: string;
  readonly requirementId?: string;
  readonly source?: string;
  readonly subjectHint?: string;
  readonly maxCandidates?: number;
  readonly minScore?: number;
  readonly includeExistingSchemas?: boolean;
  /** Exact reviewed schema candidate ID to select instead of lexical ranking. */
  readonly schemaId?: string;
  /** Exact values keyed by the selected predicate schema's argument_names. */
  readonly argumentBindings?: Readonly<Record<string, string>>;
  /** Reviewed polarity override for negation-scope false positives. */
  readonly polarityHint?: PredicatePolarity;
  /** Existing requirement claim manifest. Relationship guidance merges this list. */
  readonly existingLogicClaims?: readonly string[];
};

// implements REQ-mcp-suggest-predicates
export interface PredicateSuggestion {
  id: string;
  predicate_name: string;
  predicate_args: string[];
  canonical_key: string;
  polarity: PredicatePolarity;
  binding_status: "complete" | "incomplete";
  unbound_arguments: string[];
  /** Conservative aggregate: the least-reviewable provenance across bindings. */
  binding_provenance: BindingProvenance;
  /** Per-argument provenance retained for review and deterministic diagnostics. */
  binding_provenance_by_argument: Record<string, BindingProvenance>;
  eligibility: "eligible" | "rejected";
  rejection_reasons: string[];
  applicability_score: number;
  score_components: PredicateScoreComponents;
  score: number;
  rationale: string;
  schema: Omit<PredicateSchemaCandidate, "keywords"> & {
    usage_hints: PredicateUsageHints;
  };
}

export type BindingProvenance =
  | "explicit"
  | "extracted"
  | "inferred"
  | "placeholder";

export interface PredicateScoreComponents {
  exact_pattern: number;
  keyword_hits: number;
  descriptor_overlap: number;
  usage_match: number;
  negative_evidence: number;
  broad_token_penalty: number;
  specificity_bonus: number;
  total: number;
}

export interface RecommendedPredicateSchema {
  predicate_name: string;
  title: string;
  description: string;
  argument_names: string[];
  argument_types: string[];
  argument_descriptions?: string[];
  candidate_bindings: Record<string, string>;
  unresolved_bindings: string[];
  rationale: string;
  reuse_scope: string;
}

// implements REQ-mcp-suggest-predicates
export interface SuggestPredicatesResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    text: string;
    claimKey: string;
    logicClaims: string[];
    source: string | null;
    requirementId: string | null;
    subject: string;
    candidates: PredicateSuggestion[];
    recommendedAction:
      | "apply_requires_predicate"
      | "provide_argument_bindings"
      | "resolve_schema_reference"
      | "record_ontology_gap"
      | "review_nonlogical";
    recommendedPredicateSchema: RecommendedPredicateSchema | null;
    applyPlan: Array<Record<string, unknown>>;
    relationshipPlan: Record<string, unknown> | null;
    warnings: string[];
  };
  applyPlan: Array<Record<string, unknown>>;
}
