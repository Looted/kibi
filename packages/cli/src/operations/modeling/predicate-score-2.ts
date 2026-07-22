import type { PredicateSchemaCandidate } from "./predicate-types.js";

// implements REQ-mcp-suggest-predicates
export function scoreExactPredicates2(
  schema: PredicateSchemaCandidate,
  text: string,
): number | null {
  if (schema.predicate_name === "build_constraint") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+deterministic\s+at\s+build\s+time\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "environment_safety_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+(?:forbidden|read-only|allowed)\s+in\s+(?:production|staging|development)\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "schema_invariant_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+immutable\s+after\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "coding_standard_rule") {
    if (!/^.+?\s+(?:must|shall|should)\s+(?:use|avoid)\s+.+?\.?$/i.test(text)) {
      return 0;
    }
    if (
      !/\b(?:api|apis|code|component|computed|framework|hook|pattern|signal|schema|type)\b/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "migration_boundary_rule") {
    if (
      !/^.+?\s+may\s+only\s+be\s+read\s+as\s+migration\s+input(?:\s+by\s+.+?)?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "absence_requirement") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+(?:absent|removed)\.?$/i.test(
        text,
      ) &&
      !/^no\s+.+?\.?$/i.test(text)
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "offline_behavior_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+(?:non-blocking|resilient)\s+during\s+offline\s+conditions\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "release_gate_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+pass\s+.+?\s+before\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    if (
      !/\b(?:app store|build|deployment|distribution|release|testflight)\b/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "platform_consistency_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+synchronize\s+across\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "preservation_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+preserve\s+.+?\s+when\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "abstraction_boundary_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+persisted\s+as\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    if (!/\b(?:neutral|contract|renderer|runtime|vendor)\b/i.test(text)) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "security_configuration_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+have\s+explicit\s+[A-Za-z0-9_.-]+\s+[A-Za-z0-9_.-]+\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    if (
      !/\b(?:database|deployment|function|rpc|search_path|security|trigger)\b/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "ordered_strategy_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+use\s+.+?\s+in\s+priority\s+order\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "refresh_policy_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+automatically\s+refresh\s+.+?\s+without\s+requiring\s+manual\s+page\s+reload\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "scoped_authorization_rule") {
    if (!/^.+?\s+(?:must|shall|should)\s+be\s+denied\s+.+?\.?$/i.test(text)) {
      return 0;
    }
    if (!/\b(?:assigned|unassigned|owner|member|scoped)\b/i.test(text)) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "documentation_standard_rule") {
    if (
      !/^.+?\s+(?:must|shall|should)\s+be\s+documented\s+in\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  if (schema.predicate_name === "warmup_policy_rule") {
    if (
      !/^(?:the\s+)?.+?\s+(?:must|shall|should)\s+warm\s+up\s+on\s+.+?\.?$/i.test(
        text,
      )
    ) {
      return 0;
    }
    return 0.98;
  }
  return null;
}
