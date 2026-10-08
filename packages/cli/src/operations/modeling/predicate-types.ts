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
  /** Closed vocabularies: allowed constants keyed by argument name. */
  argument_constants?: Record<string, string[]>;
  /** Legacy spellings keyed by argument name, each mapped to a constant. */
  argument_aliases?: Record<string, Record<string, string>>;
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
  | "requirement"
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

/**
 * What an agent needs to bind one unbound predicate argument: its type, the
 * declared constants of a closed vocabulary, schema example values and why
 * the current value was not accepted.
 */
// implements REQ-model-predicates-binding-placeholders
export interface BindingHint {
  argument: string;
  position: number;
  type: string;
  description?: string;
  allowedValues?: string[];
  examples: string[];
  currentValue: string;
  provenance: BindingProvenance;
  reason: string;
}

/** A logical grounding relationship an existing requirement has for a claim. */
// implements REQ-model-predicates-grounding-aware-v2
export interface ExistingClaimGrounding {
  relationship: { type: string; from: string; to: string };
  factId: string;
  factKind: string | null;
  claimKey: string;
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
      | "review_nonlogical"
      | "replace_grounding";
    recommendedPredicateSchema: RecommendedPredicateSchema | null;
    applyPlan: Array<Record<string, unknown>>;
    relationshipPlan: Record<string, unknown> | null;
    /** The planned predicate fact id a requires_predicate link must target (never a candidate id). */
    relationshipTarget?: string | null;
    existingGrounding?: ExistingClaimGrounding[];
    replacementPlan?: Record<string, unknown> | null;
    /** On provide_argument_bindings: one hint per unbound argument of the recommended candidate. */
    bindingHints?: BindingHint[];
    warnings: string[];
  };
  applyPlan: Array<Record<string, unknown>>;
}
