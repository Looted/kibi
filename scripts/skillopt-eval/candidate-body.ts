import { validateCandidateBody } from "./variants";

const MIN_COMPLETE_BODY_BYTES = 1_000;
const REQUIRED_BODY_GUIDANCE = [
  "npx --no-install kibi",
  "bunx --no-install kibi",
  "Do not read or edit files inside `.kb` directly",
  "kb_search",
  "kb_query",
  "kb_upsert",
  "kb_check",
  "kb_semantic_advisor",
  "kb_suggest_predicates",
  "kb_model_requirement",
  "fact_kind: predicate",
  "predicate_name",
  "predicate_args",
  "canonical_key",
  "polarity",
  "predicate_schema",
  "requires_predicate",
  "logic_claims",
  "semantic_inventory",
  "claim_key",
  "claim_text",
  "propositions",
  "interpretations",
  "projectLocalSchemas",
  "nonlogical",
  "review:ambiguity",
  "review:ontology-gap",
  "polarity: deny",
  "kibi.logic.v1",
  "fact_kind: rule_schema",
  "fact_kind: rule",
  "requires_rule",
  "rule-safety",
  "rule-verifiability",
  "semantic-completeness",
  "logic-coverage",
  "taskOutcome",
  "kbState",
  "verificationState",
  "proofState",
  "limitationDisposition",
  "quality diagnostic",
  "fixed",
  "accepted",
  "deferred",
  "contract hash",
  "freshness window",
  "temporary",
] as const;
const REPOSITORY_POLICY_LEAKS = [
  /bun run version-packages/i,
  /(?:branch|merge|merged|merging)[^\n]{0,80}`(?:develop|master)`/i,
  /`(?:develop|master)`[^\n]{0,80}(?:branch|merge|merged|merging)/i,
  /public training trajectories/i,
  /kibi-usage-[a-z0-9-]+-(?:train|development|held-out)-\d+/i,
  /publishable package set/i,
] as const;

// implements REQ-skillopt-codex-optimization
export class CodexOptimizerError extends Error {
  // implements REQ-skillopt-codex-optimization
  readonly name = "CodexOptimizerError";
}

// implements REQ-skillopt-codex-optimization
export function missingRequiredGuidance(body: string): readonly string[] {
  return REQUIRED_BODY_GUIDANCE.filter((guidance) => !body.includes(guidance));
}

// implements REQ-skillopt-codex-optimization
export function validateCompleteCandidateBody(body: string): void {
  validateCandidateBody(body);
  if (
    Buffer.byteLength(body, "utf8") < MIN_COMPLETE_BODY_BYTES ||
    missingRequiredGuidance(body).length > 0
  ) {
    throw new CodexOptimizerError("optimizer_output_incomplete_body");
  }
  validateRepositoryPolicyLeaks(body);
}

// implements REQ-skillopt-codex-optimization
export function validateRepositoryPolicyLeaks(body: string): void {
  if (REPOSITORY_POLICY_LEAKS.some((pattern) => pattern.test(body))) {
    throw new CodexOptimizerError("optimizer_output_repository_policy_leak");
  }
}
