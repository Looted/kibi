/**
 * External semantic classifiers may run only from these operation boundaries.
 * sync / check / validate-upsert / upsert / migration / status / proof must
 * never invoke an external semantic classifier.
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

// implements REQ-capability-plugin-activation-disclosure-v1
export function allowsExternalSemanticClassifier(
  operationName: string,
): boolean {
  return ALLOWED.has(operationName);
}
