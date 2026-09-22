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
