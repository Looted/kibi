/**
 * kibi.semantic-classifier.v1 — lane classification over host-owned propositions.
 */

export const SEMANTIC_LANES = [
  "strict_property",
  "predicate",
  "rule",
  "observation_review",
  "none",
] as const;

export type SemanticLane = (typeof SEMANTIC_LANES)[number];

export const SEMANTIC_SIGNAL_KINDS = [
  "normative_modal",
  "numeric_cardinality",
  "numeric_threshold",
  "conditional",
  "permission",
  "state_or_default",
] as const;

export type SemanticSignalKind = (typeof SEMANTIC_SIGNAL_KINDS)[number];

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

export interface SemanticClassifierInput {
  readonly propositions: readonly SemanticClassifierProposition[];
}

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

export interface SemanticClassifierResult {
  readonly decisions: readonly SemanticClassificationDecision[];
}

export interface SemanticClassifierV1 {
  readonly id: string;
  /**
   * Optional provider model id for receipts. Hosts copy this onto provenance
   * stamps. It is not a generic plugin-options channel.
   */
  readonly model?: string;
  classify(
    input: SemanticClassifierInput,
  ): SemanticClassifierResult | Promise<SemanticClassifierResult>;
}
