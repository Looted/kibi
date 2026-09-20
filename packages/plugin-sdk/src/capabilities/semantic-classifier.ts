/**
 * kibi.semantic-classifier.v1 — lane classification over host-owned propositions.
 */

// implements REQ-capability-plugin-protocol-v1
export const SEMANTIC_LANES = [
  "strict_property",
  "predicate",
  "rule",
  "observation_review",
  "none",
] as const;

// implements REQ-capability-plugin-protocol-v1
export type SemanticLane = (typeof SEMANTIC_LANES)[number];

// implements REQ-capability-plugin-protocol-v1
export const SEMANTIC_SIGNAL_KINDS = [
  "normative_modal",
  "numeric_cardinality",
  "numeric_threshold",
  "conditional",
  "permission",
  "state_or_default",
] as const;

// implements REQ-capability-plugin-protocol-v1
export type SemanticSignalKind = (typeof SEMANTIC_SIGNAL_KINDS)[number];

// implements REQ-capability-plugin-protocol-v1
export interface SemanticClassifierProposition {
  readonly claimKey: string;
  readonly statement: string;
  readonly role?: string;
  readonly normative?: boolean;
  readonly signals?: readonly {
    readonly kind: SemanticSignalKind;
    readonly evidence?: string;
    readonly confidence?: number;
  }[];
}

// implements REQ-capability-plugin-protocol-v1
export interface SemanticClassifierInput {
  readonly propositions: readonly SemanticClassifierProposition[];
}

// implements REQ-capability-plugin-protocol-v1
export interface SemanticClassificationDecision {
  readonly claimKey: string;
  readonly lane: SemanticLane;
  readonly confidence: number;
  readonly ambiguity?: {
    readonly ambiguous: boolean;
    readonly confidence: number;
  };
  readonly signals?: readonly SemanticSignalKind[];
}

// implements REQ-capability-plugin-protocol-v1
export interface SemanticClassifierResult {
  readonly decisions: readonly SemanticClassificationDecision[];
}

// implements REQ-capability-plugin-protocol-v1
export interface SemanticClassifierV1 {
  readonly id: string;
  classify(
    input: SemanticClassifierInput,
  ): SemanticClassifierResult | Promise<SemanticClassifierResult>;
}
