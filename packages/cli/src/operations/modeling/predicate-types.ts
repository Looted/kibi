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
  score: number;
  rationale: string;
  schema: Omit<PredicateSchemaCandidate, "keywords"> & {
    usage_hints: PredicateUsageHints;
  };
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
      | "record_ontology_gap";
    applyPlan: Array<Record<string, unknown>>;
    relationshipPlan: Record<string, unknown> | null;
    warnings: string[];
  };
  applyPlan: Array<Record<string, unknown>>;
}
