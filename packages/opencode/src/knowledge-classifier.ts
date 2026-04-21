// implements REQ-opencode-kibi-plugin-v1

/**
 * Heuristic classifier for routing durable knowledge prose to appropriate Kibi entity types.
 * This is guidance-only and does not auto-create entities.
 */

export type KnowledgeSuggestion = {
  type: "fact" | "req" | "adr" | "scenario" | "test";
  confidence: "low" | "medium" | "high";
  reasoning: string;
};

/**
 * Cues for FACT entities (domain invariants, properties, limits, cardinalities)
 */
const FACT_CUES = [
  "must be unique",
  "at most",
  "exactly one",
  "default",
  "default is",
  "expires after",
  "cannot exceed",
  "maximum of",
  "minimum of",
  "always",
  "never",
  "state is",
  "invariant",
  "property value",
  "cardinality",
  "limit is",
  "uniqueness constraint",
];

/**
 * Cues for REQ entities (system behavior, capabilities, obligations)
 */
const REQ_CUES = [
  "system must",
  "user can",
  "user should",
  "should allow",
  "shall",
  "must support",
  "capability",
  "permission",
];

/**
 * Cues for ADR entities (technical decisions, tradeoffs, rationale)
 */
const ADR_CUES = [
  "decision",
  "tradeoff",
  "trade-off",
  "we chose",
  "because",
  "rationale",
  "constraint",
  "architecture decision",
  "design decision",
];

/**
 * Cues for SCENARIO entities (behavior examples, flows)
 */
const SCENARIO_CUES = [
  "given",
  "then",
  "user flow",
  "example interaction",
  "acceptance criteria",
];

/**
 * Cues for TEST entities (verification language, assertions)
 */
const TEST_CUES = [
  "verify",
  "assert",
  "expected",
  "test case",
  "asserts that",
  "should verify",
];

/**
 * Analyze a comment or prose block and suggest most appropriate entity type.
 */
export function classifyKnowledge(text: string): KnowledgeSuggestion | null { // implements REQ-opencode-kibi-plugin-v1
  if (!text || text.trim().length < 50) {
    return null;
  }

  const lower = text.toLowerCase();
  let bestMatch: KnowledgeSuggestion | null = null;
  let maxMatches = 0;

  function scoreMatches(cues: string[], target: string): number {
    return cues.filter((cue) => lower.includes(cue)).length;
  }

  const factScore = scoreMatches(FACT_CUES, text);
  const reqScore = scoreMatches(REQ_CUES, text);
  const adrScore = scoreMatches(ADR_CUES, text);
  const scenarioScore = scoreMatches(SCENARIO_CUES, text);
  const testScore = scoreMatches(TEST_CUES, text);

  // Determine the best match with some tie-breaking logic
  // Confidence: 3+ matches = high, 1-2 matches = medium, 0 = no result
  if (factScore > maxMatches) {
    maxMatches = factScore;
    bestMatch = {
      type: "fact",
      confidence: factScore >= 3 ? "high" : "medium",
      reasoning:
        'Contains strict domain fact cues (invariants, properties, limits, cardinalities) for the strict fact lane',
    };
  }

  if (reqScore > maxMatches) {
    maxMatches = reqScore;
    bestMatch = {
      type: "req",
      confidence: reqScore >= 3 ? "high" : "medium",
      reasoning:
        'Contains system behavior or obligation cues like "system must", "user can", or "shall"',
    };
  }

  if (adrScore > maxMatches) {
    maxMatches = adrScore;
    bestMatch = {
      type: "adr",
      confidence: adrScore >= 3 ? "high" : "medium",
      reasoning:
        'Contains decision or tradeoff cues like "we chose", "because", or "constraint"',
    };
  }

  if (scenarioScore > maxMatches) {
    maxMatches = scenarioScore;
    bestMatch = {
      type: "scenario",
      confidence: scenarioScore >= 3 ? "high" : "medium",
      reasoning:
        'Contains behavior example cues like "given/when/then" or "user flow"',
    };
  }

  if (testScore > maxMatches) {
    maxMatches = testScore;
    bestMatch = {
      type: "test",
      confidence: testScore >= 3 ? "high" : "medium",
      reasoning:
        'Contains verification cues like "verify", "assert", or "expected"',
    };
  }

  // Return best match (any match with at least 1 cue is medium+ confidence)
  if (bestMatch) {
    return bestMatch;
  }

  return null;
}
