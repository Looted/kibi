/**
 * External capability plugins may be imported only from these operation
 * boundaries. sync / check / validate-upsert / upsert / migration / status /
 * proof / doctor / coverage / suggest-predicates must never import a
 * third-party plugin module — allowlisting the classifier call is not enough.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export const EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS = [
  "kb_semantic_advisor",
  "kb_compile_intent",
] as const;

// implements REQ-capability-plugin-activation-disclosure-v1
export type ExternalSemanticClassifierOperation =
  (typeof EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS)[number];

const ALLOWED = new Set<string>(EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS);

// implements REQ-capability-plugin-activation-disclosure-v1, REQ-capability-plugin-observable-behavior-v1
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
// implements REQ-kibi-vocabulary-alignment-capability
export const EXTERNAL_VOCABULARY_ALIGNMENT_OPERATIONS = [
  "kb_model_requirement",
] as const;

// implements REQ-kibi-vocabulary-alignment-capability
export function allowsExternalVocabularyAlignment(
  operationName: string,
): boolean {
  return (
    EXTERNAL_VOCABULARY_ALIGNMENT_OPERATIONS as readonly string[]
  ).includes(operationName);
}
