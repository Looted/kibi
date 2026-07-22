import type { PredicateSchemaCandidate } from "./predicate-types.js";

// implements REQ-mcp-suggest-predicates
export function scoreExactPredicates1(
  schema: PredicateSchemaCandidate,
  text: string,
): number | null {
  if (schema.predicate_name === "guard") {
    if (
      /^.+?\s+(?:must|shall|should)?\s*(?:stay|remain)?\s*disabled\s+until\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0.98;
    }
  }
  if (schema.predicate_name === "conditional_behavior") {
    if (
      /^if\s+(?:(?:a|an|the)\s+)?[a-z][a-z_-]*\s+.+?,\s*(?:it|they|the\s+[a-z][a-z\s_-]*?)\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0.98;
    }
    if (
      /^when\s+.+?,\s*(?:the\s+)?.+?\s+(?:must|shall|should)\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0.36;
    }
    return 0;
  }
  if (schema.predicate_name === "exception_rule") {
    if (
      !/^(?:the\s+)?[a-z][a-z\s_-]*?\s+(?:must|shall|should)\s+.+?\s+unless\s+(?:the\s+)?.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "mutual_exclusion") {
    if (
      !/^.+?\s+and\s+.+?\s+(?:must|shall|should)\s+be\s+mutually\s+exclusive\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "dependency_rule") {
    if (!/^.+?\s+requires\s+.+?\s+before\s+.+?\.?$/i.test(text)) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "ownership_rule") {
    if (!/^.+?\s+(?:is|are)\s+owned\s+by\s+(?:the\s+)?.+?\.?$/i.test(text)) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "retry_policy") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+retry\s+up\s+to\s+\d+\s+(?:times|attempts?)\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "escalation_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+escalate\s+to\s+.+?\s+after\s+\d+\s+[a-z]+\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "availability_sla") {
    if (
      !/^.+?\s+availability\s+(?:must|shall|should)\s+be\s+at\s+least\s+\d+(?:\.\d+)?\s+(?:percent|%)\s+[a-z]+\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "notification_route") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+notify\s+.+?\s+by\s+[a-z]+\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "idempotency_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+idempotent\s+by\s+.+?\.?$/i.test(
        text,
      ) &&
      !/^.+?\s+(?:must|shall|should)\s+be\s+deduplicated\s+to\s+prevent\s+redundant\s+requests\s+during\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "data_residency_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+(?:stored|processed|kept)\s+in\s+(?:the\s+)?.+?\b(?:region|jurisdiction|country|zone|area)\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "audit_event_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+(?:recorded|logged|audited)\s+in\s+(?:the\s+)?audit\s+(?:log|trail)\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "consent_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+require\s+.+?consent\s+before\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "lifecycle_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+(?:archived|deleted|expired)\s+after\s+\d+\s+[a-z]+\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "conflict_resolution_rule") {
    if (!/^when\s+.+?\s+conflicts?,\s+(?:the\s+)?.+?\.?$/i.test(text)) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "fallback_rule") {
    if (
      !/^if\s+.+?,\s+.+?\s+(?:must|shall|should)\s+fall\s+back\s+to\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "batch_operation_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+process\s+.+?\s+in\s+batches\s+of\s+\d+\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "consistency_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+reference\s+an?\s+existing\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  return null;
}
