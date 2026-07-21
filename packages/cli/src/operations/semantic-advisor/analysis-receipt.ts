import { type Payload, payloadHash } from "./shared.js";
import type {
  SemanticAdvisorAnalysisResult,
  SemanticAdvisorLane,
  SemanticAdvisorReadiness,
  SemanticAdvisorReceipt,
  SemanticModelingSuggestion,
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
    return "Requirement already links to strict or predicate facts; semantic advisor has no repair warning.";
  if (readiness === "not_applicable")
    return "No strong machine-checkable requirement signals were detected.";
  if (lane === "strict_property")
    return "Requirement prose appears to contain scalar, threshold, or cardinality logic that should be modeled with strict facts.";
  if (lane === "predicate")
    return "Requirement prose appears to contain relational or behavioral logic that should be modeled with ontology predicates.";
  return "Requirement prose appears normative but needs review before it can participate in logic checks.";
}

// implements REQ-mcp-semantic-advisor-preflight
export function buildAdvisorResult(
  payload: Payload,
  signals: readonly SemanticSignal[],
  modeled: boolean,
  suggestions: readonly SemanticModelingSuggestion[],
): SemanticAdvisorAnalysisResult {
  const suggestionLane = suggestions.some(
    ({ kind }) => kind === "strict_property",
  )
    ? "strict_property"
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
        : candidateLane === "observation_review"
          ? ["kb_model_requirement", "kb_suggest_predicates"]
          : [];
  const receipt: SemanticAdvisorReceipt = {
    version: "semantic-advisor-v1",
    payload_hash: payloadHash(payload),
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
    suggestions,
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
