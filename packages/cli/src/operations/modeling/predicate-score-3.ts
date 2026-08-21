import type { PredicateSchemaCandidate } from "./predicate-types.js";

// implements REQ-mcp-suggest-predicates
export function scoreExactPredicates3(
  schema: PredicateSchemaCandidate,
  text: string,
): number | null {
  if (schema.predicate_name === "visual_layout_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+remain\s+visually\s+aligned\s+with\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "enforcement_location_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+enforced\s+at\s+.+?\.?$/i.test(text)
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "reconciliation_rule") {
    if (
      !/^on\s+.+?,\s*.+?\s+(?:must|shall|should)\s+reconcile\s+.+?\s+and\s+clear\s+stale\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "throttle_policy_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+throttled\s+for\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "temporal_order") {
    if (
      /^(?:the\s+)?.+?\s+initializes\s+after\s+(?:the\s+)?.+?\s+is\s+ready\.?$/i.test(
        text,
      )
    ) {
      return 0.98;
    }
  }
  if (schema.predicate_name === "state_transition") {
    if (
      !/^when\s+.+?,\s*(?:the\s+)?[a-z][a-z\s_-]*?\s+transitions?\s+from\s+[a-z][a-z0-9_-]*\s+to\s+[a-z][a-z0-9_-]*\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (
    schema.predicate_name === "state_transition" ||
    schema.predicate_name === "conditional_behavior"
  ) {
    return 0.98;
  }
  if (schema.predicate_name === "commit_action") {
    if (/\b(?:auto-save|autosave|commit|persist)\b/i.test(text)) {
      return 0.98;
    }
    if (
      /\b(?:save|saves)\b/i.test(text) &&
      !/\bwithout\s+save\b/i.test(text) &&
      !/\bsaved\s+before\b/i.test(text)
    ) {
      return 0.98;
    }
    return 0;
  }
  if (schema.predicate_name === "permission_rule") {
    if (
      /^(?:only\s+)?[a-z][a-z\s_-]*\s+(?:may|can|is\s+allowed\s+to|must\s+not|cannot|can't|is\s+forbidden\s+to)\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0.98;
    }
    return 0;
  }
  return null;
}
