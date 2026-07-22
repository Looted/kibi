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
};

// implements REQ-mcp-suggest-predicates
export interface PredicateSuggestion {
  id: string;
  predicate_name: string;
  predicate_args: string[];
  canonical_key: string;
  polarity: PredicatePolarity;
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
    source: string | null;
    requirementId: string | null;
    subject: string;
    candidates: PredicateSuggestion[];
    recommendedAction: "apply_requires_predicate" | "record_ontology_gap";
    applyPlan: Array<Record<string, unknown>>;
    relationshipPlan: Record<string, unknown> | null;
    warnings: string[];
  };
  applyPlan: Array<Record<string, unknown>>;
}
