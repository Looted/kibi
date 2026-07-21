import {
  type PredicateRule,
  normalizeKey,
  normalizePredicateToken,
} from "./predicate-rule.js";

export const POLICY_PREDICATE_RULES = [
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:stored|processed|kept)\s+in\s+(?:the\s+)?(?<region>.+?\b(?:region|jurisdiction|country|zone|area))\.?$/i,
    name: "data_residency_rule",
    args: (g) => [normalizeKey(g.subject ?? ""), normalizeKey(g.region ?? "")],
    rationale:
      "Data residency prose defines regional storage or processing constraints and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:recorded|logged|audited)\s+in\s+(?:the\s+)?(?<log>audit\s+(?:log|trail))\.?$/i,
    name: "audit_event_rule",
    args: (g) => [normalizeKey(g.subject ?? ""), normalizeKey(g.log ?? "")],
    rationale:
      "Audit logging prose defines durable audit evidence and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+require\s+(?<consent>.+?consent)\s+before\s+(?<purpose>.+?)\.?$/i,
    name: "consent_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.consent ?? ""),
      normalizePredicateToken(g.purpose ?? ""),
    ],
    rationale:
      "Consent prose defines a privacy prerequisite and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<action>archived|deleted|expired)\s+after\s+(?<duration>\d+)\s+(?<unit>[a-z]+)\.?$/i,
    name: "lifecycle_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.action ?? ""),
      g.duration ?? "",
      normalizeKey(g.unit ?? ""),
    ],
    rationale:
      "Lifecycle prose defines archive/delete/expiry behavior over time and should be queryable as a predicate.",
  },
  {
    pattern:
      /^when\s+(?<subject>.+?)\s+conflicts?,\s+(?:the\s+)?(?<strategy>.+?)\.?$/i,
    name: "conflict_resolution_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.strategy ?? ""),
    ],
    rationale:
      "Conflict-resolution prose defines synchronization merge behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^if\s+(?<condition>.+?),\s+(?<subject>.+?)\s+(?:must|shall|should)\s+fall\s+back\s+to\s+(?<target>.+?)\.?$/i,
    name: "fallback_rule",
    args: (g) => [
      normalizePredicateToken(g.condition ?? ""),
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.target ?? ""),
    ],
    rationale:
      "Fallback prose defines degraded behavior under a condition and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+process\s+(?<resource>.+?)\s+in\s+batches\s+of\s+(?<size>\d+)\.?$/i,
    name: "batch_operation_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.resource ?? ""),
      g.size ?? "",
    ],
    rationale:
      "Batching prose defines bounded bulk-processing behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+reference\s+(?<target>an?\s+existing\s+.+?)\.?$/i,
    name: "consistency_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.target ?? ""),
    ],
    rationale:
      "Consistency prose defines reference integrity and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<property>deterministic)\s+at\s+(?<scope>build\s+time)\.?$/i,
    name: "build_constraint",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.property ?? "property"),
      normalizePredicateToken(g.scope ?? "scope"),
    ],
    rationale:
      "Build-time prose defines deterministic generation or deployment constraints and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<action>.+?)\s+(?:must|shall|should)\s+be\s+(?<decision>forbidden|read-only|allowed)\s+in\s+(?<environment>production|staging|development)\.?$/i,
    name: "environment_safety_rule",
    args: (g) => [
      normalizeKey(g.action ?? ""),
      normalizePredicateToken(g.decision ?? "decision"),
      normalizeKey(g.environment ?? ""),
    ],
    rationale:
      "Environment safety prose defines action permissions by deployment environment and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<field>.+?)\s+(?:must|shall|should)\s+be\s+(?<kind>immutable)\s+after\s+(?<scope>.+?)\.?$/i,
    name: "schema_invariant_rule",
    args: (g) => [
      normalizeKey(g.field ?? ""),
      normalizePredicateToken(g.kind ?? "invariant"),
      normalizePredicateToken(`after ${g.scope ?? ""}`),
    ],
    rationale:
      "Schema invariant prose defines a field-level invariant and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?<action>use|avoid)\s+(?<target>.+?)\.?$/i,
    name: "coding_standard_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.action ?? "action"),
      normalizePredicateToken(g.target ?? ""),
    ],
    rationale:
      "Coding-standard prose defines developer-facing API or pattern requirements and should be queryable as a predicate.",
    accepts: (statement) =>
      /\b(?:api|apis|code|component|computed|framework|hook|pattern|signal|schema|type)\b/i.test(
        statement,
      ),
  },
  {
    pattern:
      /^(?<subject>.+?)\s+may\s+only\s+be\s+(?<action>read)\s+as\s+(?<scope>migration\s+input)(?:\s+by\s+.+?)?\.?$/i,
    name: "migration_boundary_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.action ?? "action"),
      normalizePredicateToken(g.scope ?? ""),
    ],
    rationale:
      "Migration-boundary prose defines legacy input usage limits and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<state>absent|removed)\.?$/i,
    name: "absence_requirement",
    args: (g) => [
      normalizePredicateToken(g.subject ?? ""),
      normalizePredicateToken(g.state ?? ""),
    ],
    rationale:
      "Absence prose defines negative existence requirements and should be queryable as a predicate.",
  },
  {
    pattern: /^no\s+(?<subject>.+?)\.?$/i,
    name: "absence_requirement",
    args: (g) => [normalizePredicateToken(g.subject ?? ""), "absent"],
    rationale:
      "Declarative no-X prose defines a negative existence requirement and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<behavior>non-blocking|resilient)\s+during\s+(?<condition>offline\s+conditions)\.?$/i,
    name: "offline_behavior_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.behavior ?? "behavior"),
      normalizePredicateToken(g.condition ?? ""),
    ],
    rationale:
      "Offline behavior prose defines resilient/non-blocking behavior under offline conditions and should be queryable as a predicate.",
  },
] as const satisfies readonly PredicateRule[];
