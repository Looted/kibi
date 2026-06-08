export type SemanticAdvisorLane =
  | "strict_property"
  | "predicate"
  | "observation_review"
  | "none";

export type SemanticAdvisorReadiness =
  | "modeled"
  | "needs_modeling"
  | "not_applicable";

export type SemanticSignalKind =
  | "normative_modal"
  | "numeric_cardinality"
  | "numeric_threshold"
  | "conditional"
  | "permission"
  | "state_or_default";

export interface SemanticSignal {
  kind: SemanticSignalKind;
  evidence: string;
  candidate_lane: SemanticAdvisorLane;
  confidence: number;
}

export interface SemanticAmbiguityWitness {
  signal_kind: SemanticSignalKind;
  evidence: string;
  interpretations: string[];
  message: string;
}

export interface SemanticAdvisorReceipt {
  version: string;
  payload_hash: string;
  logic_readiness: SemanticAdvisorReadiness;
  candidate_lane: SemanticAdvisorLane;
  signals: SemanticSignal[];
  ambiguity_witnesses: SemanticAmbiguityWitness[];
  suggestions: SemanticModelingSuggestion[];
  suggested_next_tools: string[];
  summary: string;
}

export type SemanticModelingSuggestion =
  | SemanticStrictPropertySuggestion
  | SemanticPredicateSuggestion
  | SemanticAmbiguityObservationSuggestion
  | SemanticOntologyGapSuggestion;

export interface SemanticStrictPropertyClaim {
  subject_key: string;
  property_key: string;
  operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
  value_type: "string" | "int" | "number" | "bool";
  value_string?: string;
  value_int?: number;
  value_number?: number;
  value_bool?: boolean;
  unit?: string;
}

export interface SemanticStrictPropertySuggestion {
  kind: "strict_property";
  confidence: number;
  evidence: string;
  rationale: string;
  suggested_next_tool: "kb_model_requirement";
  claim: SemanticStrictPropertyClaim;
  rejected_alternatives: string[];
  applyPlan: Array<Record<string, unknown>>;
}

export interface SemanticPredicateClaim {
  predicate_name: string;
  predicate_args: string[];
  canonical_key: string;
  polarity: "assert" | "deny";
}

export interface SemanticPredicateSuggestion {
  kind: "predicate";
  confidence: number;
  evidence: string;
  rationale: string;
  suggested_next_tool: "kb_suggest_predicates";
  predicate: SemanticPredicateClaim;
  rejected_alternatives: string[];
  applyPlan: Array<Record<string, unknown>>;
  relationshipPlan: Record<string, unknown> | null;
}

export interface SemanticAmbiguityObservationSuggestion {
  kind: "ambiguity_observation";
  confidence: number;
  evidence: string;
  rationale: string;
  ambiguity: string[];
  suggested_next_tool: "kb_model_requirement" | "kb_suggest_predicates";
  applyPlan: Array<Record<string, unknown>>;
}

export interface SemanticOntologyGapSuggestion {
  kind: "ontology_gap";
  confidence: number;
  evidence: string;
  rationale: string;
  suggested_next_tool: "kb_suggest_predicates";
  recommendedPredicateSchema: {
    predicate_name: string;
    argument_names: string[];
    argument_types: string[];
  };
  applyPlan: Array<Record<string, unknown>>;
}

export interface SemanticAdvisorInput {
  payload: Record<string, unknown>;
}

export interface SemanticAdvisorResult {
  receipt: SemanticAdvisorReceipt;
  warnings: string[];
}
