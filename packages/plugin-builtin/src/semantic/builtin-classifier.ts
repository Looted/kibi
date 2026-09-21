/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import type {
  SemanticClassificationDecision,
  SemanticClassifierInput,
  SemanticClassifierResult,
  SemanticClassifierV1,
  SemanticLane,
  SemanticSignalKind,
} from "kibi-plugin-sdk";

type SignalPattern = {
  readonly kind: SemanticSignalKind;
  readonly candidateLane: SemanticLane;
  readonly confidence: number;
  readonly pattern: RegExp;
};

/** Same patterns as CLI analyze-prose SIGNAL_PATTERNS. */
const SIGNAL_PATTERNS = [
  {
    kind: "numeric_cardinality",
    candidateLane: "strict_property",
    confidence: 0.92,
    pattern:
      /\b(?:(?:at\s+most|at\s+least|exactly|no\s+more\s+than|up\s+to|cap(?:ped)?\s+at)\s+)?(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  },
  {
    kind: "numeric_threshold",
    candidateLane: "strict_property",
    confidence: 0.86,
    pattern:
      /\b(?:maximum|minimum|under|within|below|above|expires?|retained\s+for)\s+(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  },
  {
    kind: "conditional",
    candidateLane: "predicate",
    confidence: 0.82,
    pattern: /\b(?:if|when|unless|except|only\s+if|provided\s+that)\b/i,
  },
  {
    kind: "permission",
    candidateLane: "predicate",
    confidence: 0.8,
    pattern:
      /\b(?:only|may|can|allowed|denied|forbidden|must\s+not|cannot|can't)\b/i,
  },
  {
    kind: "state_or_default",
    candidateLane: "predicate",
    confidence: 0.74,
    pattern:
      /\b(?:state|mode|defaults?\s+to|ready|disabled|enabled|terminal)\b/i,
  },
  {
    kind: "normative_modal",
    candidateLane: "observation_review",
    confidence: 0.65,
    // Modal-free validity, rejection, prohibition, and failure-outcome
    // assertions are normative even when they omit must/shall.
    pattern:
      /\b(?:must|shall|should|may|must\s+not|cannot|can't|invalid|unresolved|reject(?:ed|ion)?|prohibited|forbidden|fail(?:s|ed|ure)?\s+(?:clearly|explicitly|with)|required\s+outcome)\b/i,
  },
] as const satisfies readonly SignalPattern[];

interface DetectedSignal {
  readonly kind: SemanticSignalKind;
  readonly evidence: string;
  readonly candidateLane: SemanticLane;
  readonly confidence: number;
}

// implements REQ-capability-plugin-builtin-parity-v1
export function detectSignals(prose: string): readonly DetectedSignal[] {
  const seen = new Set<SemanticSignalKind>();
  return SIGNAL_PATTERNS.flatMap((candidate) => {
    const evidence = prose.match(candidate.pattern)?.[0];
    if (!evidence || seen.has(candidate.kind)) return [];
    seen.add(candidate.kind);
    return [
      {
        kind: candidate.kind,
        evidence,
        candidateLane: candidate.candidateLane,
        confidence: candidate.confidence,
      },
    ];
  });
}

/** Lane selection shared with the host analysis receipt. */
// implements REQ-capability-plugin-builtin-parity-v1
export function chooseLane(signals: readonly DetectedSignal[]): SemanticLane {
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

function confidenceForLane(
  lane: SemanticLane,
  signals: readonly DetectedSignal[],
): number {
  if (lane === "none" || signals.length === 0) return 0;
  const relevant =
    lane === "strict_property"
      ? signals.filter(
          ({ kind }) =>
            kind === "numeric_cardinality" || kind === "numeric_threshold",
        )
      : lane === "predicate"
        ? signals.filter(
            ({ kind }) =>
              kind === "conditional" ||
              kind === "permission" ||
              kind === "state_or_default",
          )
        : lane === "observation_review"
          ? signals.filter(({ kind }) => kind === "normative_modal")
          : signals;
  const pool = relevant.length > 0 ? relevant : signals;
  return Math.max(...pool.map((signal) => signal.confidence));
}

// implements REQ-capability-plugin-builtin-parity-v1
export class BuiltinSemanticClassifier implements SemanticClassifierV1 {
  readonly id = "kibi-plugin-builtin.classifier";

  classify(input: SemanticClassifierInput): SemanticClassifierResult {
    const decisions: SemanticClassificationDecision[] = input.propositions.map(
      (proposition) => {
        const signals = detectSignals(proposition.statement);
        const lane = chooseLane(signals);
        const decision: SemanticClassificationDecision = {
          claimKey: proposition.claimKey,
          lane,
          confidence: confidenceForLane(lane, signals),
        };
        if (signals.length > 0) {
          return {
            ...decision,
            signals: signals.map((signal) => signal.kind),
          };
        }
        return decision;
      },
    );
    return { decisions };
  }
}

// implements REQ-capability-plugin-builtin-parity-v1
export function createBuiltinSemanticClassifier(): SemanticClassifierV1 {
  return new BuiltinSemanticClassifier();
}
