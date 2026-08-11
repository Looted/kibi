import type { SemanticClause } from "./clauses.js";
import {
  type Payload,
  SEMANTIC_INVENTORY_VERSION,
  payloadHash,
  propertiesOf,
  semanticSourceHash,
  semanticSourceOf,
} from "./shared.js";
import type {
  SemanticAdvisorAnalysisResult,
  SemanticAdvisorLane,
  SemanticAdvisorReadiness,
  SemanticAdvisorReceipt,
  SemanticInterpretationResult,
  SemanticModelingSuggestion,
  SemanticProposition,
  SemanticShadowCue,
  SemanticSignal,
} from "./types.js";

function chooseLane(signals: readonly SemanticSignal[]): SemanticAdvisorLane {
  if (
    signals.some(
      ({ kind }) =>
        kind === "numeric_cardinality" || kind === "numeric_threshold",
    )
  )
    return "strict_property";
  if (
    signals.some(
      ({ kind }) =>
        kind === "conditional" ||
        kind === "permission" ||
        kind === "state_or_default",
    )
  )
    return "predicate";
  return signals.some(({ kind }) => kind === "normative_modal")
    ? "observation_review"
    : "none";
}

function summary(
  readiness: SemanticAdvisorReadiness,
  lane: SemanticAdvisorLane,
): string {
  if (readiness === "modeled")
    return "Requirement declares every detected atomic claim and has logical fact links; run kb_check logic-coverage to verify each manifest entry is grounded.";
  if (readiness === "not_applicable")
    return "No strong machine-checkable requirement signals were detected.";
  if (lane === "strict_property")
    return "Requirement prose appears to contain scalar, threshold, or cardinality logic that should be modeled with strict facts.";
  if (lane === "predicate")
    return "Requirement prose appears to contain relational or behavioral logic that should be modeled with ontology predicates.";
  if (lane === "rule")
    return "Requirement prose has a typed interpretation candidate; validate and persist it as a safe kibi.logic.v1 rule.";
  return "Requirement prose appears normative but needs review before it can participate in logic checks.";
}

// implements REQ-mcp-semantic-advisor-preflight
export function buildAdvisorResult(
  payload: Payload,
  signals: readonly SemanticSignal[],
  modeled: boolean,
  suggestions: readonly SemanticModelingSuggestion[],
  clauses: readonly SemanticClause[],
  propositions: readonly SemanticProposition[],
  interpretations: readonly SemanticInterpretationResult[],
  shadowAnalysis: readonly SemanticShadowCue[],
): SemanticAdvisorAnalysisResult {
  const semanticSource = semanticSourceOf(payload);
  const suggestionLane = suggestions.some(
    ({ kind }) => kind === "strict_property",
  )
    ? "strict_property"
    : suggestions.some(({ kind }) => kind === "rule")
      ? "rule"
      : suggestions.some(({ kind }) => kind === "predicate")
        ? "predicate"
        : null;
  const candidateLane = modeled
    ? "none"
    : (suggestionLane ?? chooseLane(signals));
  const readiness: SemanticAdvisorReadiness = modeled
    ? "modeled"
    : candidateLane === "none"
      ? "not_applicable"
      : "needs_modeling";
  const tools = modeled
    ? []
    : candidateLane === "strict_property"
      ? ["kb_model_requirement"]
      : candidateLane === "predicate"
        ? ["kb_suggest_predicates"]
        : candidateLane === "rule"
          ? ["kb_model_requirement"]
          : candidateLane === "observation_review"
            ? ["kb_model_requirement", "kb_suggest_predicates"]
            : [];
  const expectedClaimKeys = propositions
    .filter(
      ({ role }) => !["rationale", "example", "subjective"].includes(role),
    )
    .map(({ claim_key }) => claim_key);
  const rawDeclaredClaimKeys = propertiesOf(payload).logic_claims;
  const declaredClaimKeys = Array.isArray(rawDeclaredClaimKeys)
    ? rawDeclaredClaimKeys.filter(
        (value: unknown): value is string => typeof value === "string",
      )
    : [];
  const missingClaimKeys = expectedClaimKeys.filter(
    (claimKey) => !declaredClaimKeys.includes(claimKey),
  );
  const unresolvedClaimKeys = propositions
    .filter(({ status }) =>
      ["ambiguous", "ontology_gap", "missing"].includes(status),
    )
    .map(({ claim_key }) => claim_key);
  const coverageStatus =
    expectedClaimKeys.length === 0
      ? "not_applicable"
      : modeled
        ? "complete"
        : declaredClaimKeys.length === 0
          ? "unverified"
          : "partial";
  const receipt: SemanticAdvisorReceipt = {
    version: "semantic-advisor-v2",
    payload_hash: payloadHash(payload),
    inventory_contract: {
      version: SEMANTIC_INVENTORY_VERSION,
      source_field: semanticSource.field,
      source_hash: semanticSourceHash(semanticSource.text),
    },
    logic_readiness: readiness,
    candidate_lane: candidateLane,
    signals,
    ambiguity_witnesses: modeled
      ? []
      : signals
          .filter(({ kind }) => kind === "numeric_cardinality")
          .map((signal) => ({
            signal_kind: signal.kind,
            evidence: signal.evidence,
            interpretations: [
              "exactly",
              "at_most",
              "at_least",
              "named_membership",
              "illustrative_example",
            ],
            message:
              "Numeric cardinality prose can mean an exact count, an upper/lower bound, named membership, or an example; model it explicitly before relying on contradiction checks.",
          })),
    propositions,
    interpretations,
    shadow_analysis: shadowAnalysis,
    suggestions,
    clauses: clauses.map((clause) => ({
      ...clause,
      suggestion_indexes: suggestions.flatMap((suggestion, index) =>
        suggestion.claim_key === clause.claim_key ? [index] : [],
      ),
    })),
    logic_coverage: {
      status: coverageStatus,
      expected_claim_keys: expectedClaimKeys,
      declared_claim_keys: declaredClaimKeys,
      missing_claim_keys: missingClaimKeys,
      unresolved_claim_keys: unresolvedClaimKeys,
    },
    suggested_next_tools: tools,
    summary: summary(readiness, candidateLane),
  };
  return {
    receipt,
    warnings:
      readiness === "needs_modeling"
        ? [
            `Semantic advisor: ${receipt.summary} Next action: call ${tools.join(" or ")} before treating this requirement as Prolog-checkable.`,
          ]
        : [],
  };
}
