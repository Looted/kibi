import type { PredicateUsageHints } from "./predicate-types.js";

// implements REQ-mcp-suggest-predicates
export const PREDICATE_USAGE_HINTS_1: Record<string, PredicateUsageHints> = {
  state: {
    use_when: [
      "Use for one subject being in, entering, or requiring one named state.",
    ],
    do_not_use_when: [
      "Do not use for allowed state sets or explicit state-to-state movement; use state_membership or state_transition instead.",
    ],
  },
  transition: {
    use_when: [
      "Use for workflow prose where a subject moves between states because of a trigger.",
    ],
    do_not_use_when: [
      "Do not use for one current state, allowed terminal states, or non-state conditional behavior.",
    ],
  },
  guard: {
    use_when: [
      "Use when a boolean condition gates whether behavior is active or permitted.",
    ],
    do_not_use_when: [
      "Do not use for explicit unless/except exceptions, actor authorization, feature flags, or scalar thresholds.",
    ],
  },
  exception_rule: {
    use_when: [
      "Use for unless/except clauses where a normally required behavior is skipped under a named exception.",
    ],
    do_not_use_when: [
      "Do not use for generic boolean guards without an exception clause, actor permissions, or feature flags.",
    ],
  },
  mutual_exclusion: {
    use_when: [
      "Use when two modes, states, options, or behaviors cannot be true or active together.",
    ],
    do_not_use_when: [
      "Do not use for uniqueness per scope, allowed state sets, or ordinary permission denials.",
    ],
  },
  dependency_rule: {
    use_when: [
      "Use when one action, state, or resource requires another prerequisite before it can proceed.",
    ],
    do_not_use_when: [
      "Do not use for temporal ordering without a required prerequisite, ownership, or feature gates.",
    ],
  },
  ownership_rule: {
    use_when: [
      "Use when a resource, domain area, or behavior is owned by a service, team, role, or component.",
    ],
    do_not_use_when: [
      "Do not use for permission to access a resource or event publication.",
    ],
  },
  retry_policy: {
    use_when: [
      "Use when a failed action must be retried a bounded number of times or attempts.",
    ],
    do_not_use_when: [
      "Do not use for rate limits, backoff timing without retries, or escalation after a delay.",
    ],
  },
  escalation_rule: {
    use_when: [
      "Use when an unresolved or failed condition is escalated to an owner, role, queue, or service after a delay.",
    ],
    do_not_use_when: [
      "Do not use for ownership assignments, retry counts, or simple notification routing.",
    ],
  },
  availability_sla: {
    use_when: [
      "Use when an API, service, or system has a minimum availability target over a reporting window.",
    ],
    do_not_use_when: [
      "Do not use for latency thresholds, retention durations, or generic resource constraints.",
    ],
  },
  notification_route: {
    use_when: [
      "Use when a subject must notify a recipient, team, or role through a specific channel.",
    ],
    do_not_use_when: [
      "Do not use for event publication, ownership assignment, or escalation after a delay.",
    ],
  },
  idempotency_rule: {
    use_when: [
      "Use when repeated, redundant, or concurrent requests or operations must be safely deduplicated by an idempotency key or equivalent identity.",
    ],
    do_not_use_when: [
      "Do not use for general uniqueness constraints, retry counts, or rate limits; choose the more specific predicate instead.",
    ],
  },
  data_residency_rule: {
    use_when: [
      "Use when data must be stored, processed, or kept within a named region or jurisdiction.",
    ],
    do_not_use_when: [
      "Do not use for retention durations, access permissions, or notification routing.",
    ],
  },
  audit_event_rule: {
    use_when: [
      "Use when an action, change, or security-relevant event must be recorded in an audit log or audit trail.",
    ],
    do_not_use_when: [
      "Do not use for user-facing notifications, event publication, or generic dirty-change state.",
    ],
  },
  consent_rule: {
    use_when: [
      "Use when an action or data-processing purpose requires explicit user consent before it proceeds.",
    ],
    do_not_use_when: [
      "Do not use for data residency, permission denials, or retention durations.",
    ],
  },
  lifecycle_rule: {
    use_when: [
      "Use when an entity must be archived, deleted, expired, or otherwise lifecycle-transitioned after a duration.",
    ],
    do_not_use_when: [
      "Do not use for passive retention duration requirements; use retention_policy when data is simply kept for a period.",
    ],
  },
  conflict_resolution_rule: {
    use_when: [
      "Use when synchronization or concurrent updates require a named conflict-resolution strategy.",
    ],
    do_not_use_when: [
      "Do not use for ordinary state transitions, dependency ordering, or fallback behavior.",
    ],
  },
  fallback_rule: {
    use_when: [
      "Use when a degraded or unavailable dependency causes a subject to fall back to a named alternative behavior.",
    ],
    do_not_use_when: [
      "Do not use for escalation after a delay, notification routing, or retry policies.",
    ],
  },
  batch_operation_rule: {
    use_when: [
      "Use when a bulk operation must process a resource in batches of a specific size.",
    ],
    do_not_use_when: [
      "Do not use for rate limits, retry counts, or general resource thresholds.",
    ],
  },
  consistency_rule: {
    use_when: [
      "Use when one entity must reference, match, or remain consistent with another existing entity or invariant.",
    ],
    do_not_use_when: [
      "Do not use for ownership, permission checks, or prerequisite workflow dependencies.",
    ],
  },
  build_constraint: {
    use_when: [
      "Use when build-time generation or deployment configuration must satisfy a deterministic property.",
    ],
    do_not_use_when: [
      "Do not use for runtime feature gates or ordinary resource thresholds.",
    ],
  },
  environment_safety_rule: {
    use_when: [
      "Use when an action is allowed or forbidden in a named environment such as production or staging.",
    ],
    do_not_use_when: [
      "Do not use for actor permissions that are independent of deployment environment.",
    ],
  },
  schema_invariant_rule: {
    use_when: [
      "Use when a schema field has an invariant such as immutability, type, enum, or value-range constraints.",
    ],
    do_not_use_when: [
      "Do not use for cross-entity references; use consistency_rule for referential integrity.",
    ],
  },
  coding_standard_rule: {
    use_when: [
      "Use when developer-facing code must use or avoid a framework API, pattern, or documentation practice.",
    ],
    do_not_use_when: [
      "Do not use for user-facing product behavior or role-based access control.",
    ],
  },
  migration_boundary_rule: {
    use_when: [
      "Use when legacy data or APIs may only be used for migration or compatibility input.",
    ],
    do_not_use_when: [
      "Do not use for general lifecycle archive/delete timing rules.",
    ],
  },
  absence_requirement: {
    use_when: [
      "Use when a component, extension, RPC, schema, or feature must be absent, removed, or not exist.",
    ],
    do_not_use_when: [
      "Do not use for denied user actions; use permission_rule for actor/action/resource denials.",
    ],
  },
};
