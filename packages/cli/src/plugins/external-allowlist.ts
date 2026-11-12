/**
 * External capability plugins may be imported only from these operation
 * boundaries. sync / check / validate-upsert / upsert / migration / status /
 * proof / doctor / coverage / suggest-predicates must never import a
 * third-party plugin module — allowlisting the classifier call is not enough.
 */
export const EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS = [
  "kb_semantic_advisor",
  "kb_compile_intent",
] as const;

export type ExternalSemanticClassifierOperation =
  (typeof EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS)[number];

const ALLOWED = new Set<string>(EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS);

export function allowsExternalSemanticClassifier(
  operationName: string,
): boolean {
  return ALLOWED.has(operationName);
}

/**
 * Operations that may call external kibi.vocabulary-alignment.v1 providers.
 * kb_check and every other operation stay builtin-only: vocabulary alignment is
 * modeling-time advice and never participates in pass/fail checks.
 */
export const EXTERNAL_VOCABULARY_ALIGNMENT_OPERATIONS = [
  "kb_model_requirement",
] as const;

export function allowsExternalVocabularyAlignment(
  operationName: string,
): boolean {
  return (
    EXTERNAL_VOCABULARY_ALIGNMENT_OPERATIONS as readonly string[]
  ).includes(operationName);
}

/**
 * Operations that may call external kibi.search-hints.v1 providers. Hints are
 * advice next to a search answer; checks, proofs and every write stay
 * builtin-only.
 */
export const EXTERNAL_SEARCH_HINTS_OPERATIONS = ["kb_search"] as const;

export function allowsExternalSearchHints(operationName: string): boolean {
  return (EXTERNAL_SEARCH_HINTS_OPERATIONS as readonly string[]).includes(
    operationName,
  );
}
