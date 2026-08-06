export type SemanticAdvisorLane =
  | "strict_property"
  | "predicate"
  | "observation_review"
  | "none";

export type SemanticAdvisorReadiness =
  | "modeled"
  | "needs_modeling"
  | "not_applicable";
export type SemanticLogicCoverageStatus =
  | "complete"
  | "partial"
  | "unverified"
  | "not_applicable";
export type SemanticSignalKind =
  | "normative_modal"
  | "numeric_cardinality"
  | "numeric_threshold"
  | "conditional"
  | "permission"
  | "state_or_default";

export interface SemanticSignal {
  readonly kind: SemanticSignalKind;
  readonly evidence: string;
  readonly candidate_lane: SemanticAdvisorLane;
  readonly confidence: number;
}

export interface SemanticAmbiguityWitness {
  readonly signal_kind: SemanticSignalKind;
  readonly evidence: string;
  readonly interpretations: readonly string[];
  readonly message: string;
}

export interface SemanticStrictPropertyClaim {
  readonly subject_key: string;
  readonly property_key: string;
  readonly operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
  readonly value_type: "string" | "int" | "number" | "bool";
  readonly value_string?: string;
  readonly value_int?: number;
  readonly value_number?: number;
  readonly value_bool?: boolean;
  readonly unit?: string;
}

export interface SemanticPredicateClaim {
  readonly predicate_name: string;
  readonly predicate_args: readonly string[];
  readonly canonical_key: string;
  readonly polarity: "assert" | "deny";
}

export type SemanticModelingSuggestion =
  | {
      readonly kind: "strict_property";
      readonly claim_key: string;
      readonly claim_text: string;
      readonly confidence: number;
      readonly evidence: string;
      readonly rationale: string;
      readonly suggested_next_tool: "kb_model_requirement";
      readonly claim: SemanticStrictPropertyClaim;
      readonly rejected_alternatives: readonly string[];
      readonly applyPlan: readonly Readonly<Record<string, unknown>>[];
    }
  | {
      readonly kind: "predicate";
      readonly claim_key: string;
      readonly claim_text: string;
      readonly confidence: number;
      readonly evidence: string;
      readonly rationale: string;
      readonly suggested_next_tool: "kb_suggest_predicates";
      readonly predicate: SemanticPredicateClaim;
      readonly rejected_alternatives: readonly string[];
      readonly applyPlan: readonly Readonly<Record<string, unknown>>[];
      readonly relationshipPlan: Readonly<Record<string, unknown>> | null;
    }
  | {
      readonly kind: "ambiguity_observation";
      readonly claim_key: string;
      readonly claim_text: string;
      readonly confidence: number;
      readonly evidence: string;
      readonly rationale: string;
      readonly ambiguity: readonly string[];
      readonly suggested_next_tool:
        | "kb_model_requirement"
        | "kb_suggest_predicates";
      readonly applyPlan: readonly Readonly<Record<string, unknown>>[];
    }
  | {
      readonly kind: "ontology_gap";
      readonly claim_key: string;
      readonly claim_text: string;
      readonly confidence: number;
      readonly evidence: string;
      readonly rationale: string;
      readonly suggested_next_tool: "kb_suggest_predicates";
      readonly recommendedPredicateSchema: {
        readonly predicate_name: string;
        readonly argument_names: readonly string[];
        readonly argument_types: readonly string[];
      } | null;
      readonly applyPlan: readonly Readonly<Record<string, unknown>>[];
    };

export interface SemanticAdvisorReceipt {
  readonly version: string;
  readonly payload_hash: string;
  readonly logic_readiness: SemanticAdvisorReadiness;
  readonly candidate_lane: SemanticAdvisorLane;
  readonly signals: readonly SemanticSignal[];
  readonly ambiguity_witnesses: readonly SemanticAmbiguityWitness[];
  readonly suggestions: readonly SemanticModelingSuggestion[];
  readonly clauses: readonly {
    readonly claim_key: string;
    readonly text: string;
    readonly index: number;
    readonly normative: boolean;
    readonly source: "detected" | "supplied";
    readonly suggestion_indexes: readonly number[];
  }[];
  readonly logic_coverage: {
    readonly status: SemanticLogicCoverageStatus;
    readonly expected_claim_keys: readonly string[];
    readonly declared_claim_keys: readonly string[];
    readonly missing_claim_keys: readonly string[];
    readonly unresolved_claim_keys: readonly string[];
  };
  readonly suggested_next_tools: readonly string[];
  readonly summary: string;
}

export interface SemanticAdvisorInput {
  readonly payload: Readonly<Record<string, unknown>>;
  readonly clauses?: readonly string[];
}

export interface SemanticAdvisorAnalysisResult {
  readonly receipt: SemanticAdvisorReceipt;
  readonly warnings: readonly string[];
}

export interface SemanticAdvisorArgs {
  readonly text: string;
  readonly clauses?: readonly string[];
  readonly type?: string;
  readonly id?: string;
  readonly title?: string;
  readonly source?: string;
  readonly status?: string;
}

export interface SemanticAdvisorOperationResult {
  readonly content: readonly { readonly type: "text"; readonly text: string }[];
  readonly structuredContent: {
    readonly receipt: SemanticAdvisorReceipt;
    readonly warnings: readonly string[];
  };
}
