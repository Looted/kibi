import type { PredicateUsageHints } from "./predicate-types.js";

// implements REQ-mcp-suggest-predicates
export const PREDICATE_USAGE_HINTS_2: Record<string, PredicateUsageHints> = {
  offline_behavior_rule: {
    use_when: [
      "Use when synchronization or gameplay behavior must remain non-blocking or resilient during offline conditions.",
    ],
    do_not_use_when: [
      "Do not use for generic fallback behavior without an offline/resilient synchronization condition.",
    ],
  },
  release_gate_rule: {
    use_when: [
      "Use when builds or releases must pass named gates before distribution, review, or deployment.",
    ],
    do_not_use_when: [
      "Do not use for runtime dependency prerequisites; use dependency_rule for product workflow dependencies.",
    ],
  },
  platform_consistency_rule: {
    use_when: [
      "Use when a state or entitlement must synchronize across named platforms.",
    ],
    do_not_use_when: [
      "Do not use for referential integrity within one data model; use consistency_rule instead.",
    ],
  },
  preservation_rule: {
    use_when: [
      "Use when child data or feedback must be preserved across deletion/removal of a parent resource.",
    ],
    do_not_use_when: [
      "Do not use for simple archive/delete timing rules without a preservation target.",
    ],
  },
  abstraction_boundary_rule: {
    use_when: [
      "Use when persisted data, APIs, or contracts must remain neutral to a renderer, vendor, runtime, or implementation detail.",
    ],
    do_not_use_when: [
      "Do not use for generic coding standards without a boundary/contract target; use coding_standard_rule instead.",
    ],
  },
  security_configuration_rule: {
    use_when: [
      "Use when infrastructure, database, trigger, RPC, or deployment components must carry an explicit security configuration value.",
    ],
    do_not_use_when: [
      "Do not use for actor authorization decisions; use permission_rule or scoped_authorization_rule instead.",
    ],
  },
  ordered_strategy_rule: {
    use_when: [
      "Use when a subject must apply named strategies in a required priority or fallback order.",
    ],
    do_not_use_when: [
      "Do not use for unordered enum membership; use strict allowed_values or state_membership instead.",
    ],
  },
  refresh_policy_rule: {
    use_when: [
      "Use when a UI, dashboard, cache, or list must refresh a target automatically or on a named cadence/trigger.",
    ],
    do_not_use_when: [
      "Do not use for save/commit actions or notification routing; use commit_action or notification_route instead.",
    ],
  },
  scoped_authorization_rule: {
    use_when: [
      "Use when an actor is allowed or denied an action because they are assigned, unassigned, owner, member, or otherwise scoped to a resource.",
    ],
    do_not_use_when: [
      "Do not use for simple actor/action/resource permissions without a scope qualifier; use permission_rule instead.",
    ],
  },
  documentation_standard_rule: {
    use_when: [
      "Use when code symbols, APIs, tests, or project artifacts must be documented in a named documentation source.",
    ],
    do_not_use_when: [
      "Do not use for runtime persistence or user-facing display labels.",
    ],
  },
  warmup_policy_rule: {
    use_when: [
      "Use when a component, media element, cache, or service must warm up on a named entry or trigger.",
    ],
    do_not_use_when: [
      "Do not use for generic state transitions without warmup behavior.",
    ],
  },
  visual_layout_rule: {
    use_when: [
      "Use when UI elements must remain visually aligned, consistent, or layout-compatible with another element.",
    ],
    do_not_use_when: [
      "Do not use for generic acceptance outcomes without a visual/layout relationship.",
    ],
  },
  enforcement_location_rule: {
    use_when: [
      "Use when a constraint or policy must be enforced at a named layer such as database, application, edge, or client level.",
    ],
    do_not_use_when: [
      "Do not use for the constraint itself when the enforcement location is not stated.",
    ],
  },
  reconciliation_rule: {
    use_when: [
      "Use when a trigger requires reconciling a target and clearing stale or inconsistent records.",
    ],
    do_not_use_when: [
      "Do not use for ordinary archive/delete timing without reconciliation.",
    ],
  },
  throttle_policy_rule: {
    use_when: [
      "Use when handlers, operations, or streams must be throttled for high-frequency activity.",
    ],
    do_not_use_when: [
      "Do not use for numeric API request quotas; use rate_limit instead.",
    ],
  },
  has_unsaved_changes: {
    use_when: [
      "Use for dirty, draft, or unsaved local-edit state on a subject.",
    ],
    do_not_use_when: [
      "Do not use for the action that saves or discards those changes.",
    ],
  },
  commit_action: {
    use_when: [
      "Use when a trigger saves, commits, persists, or auto-saves a subject in a scope.",
    ],
    do_not_use_when: [
      "Do not use for cancel, discard, revert, or abandon behavior.",
    ],
  },
  discard_action: {
    use_when: [
      "Use when a trigger discards, cancels, reverts, or abandons changes in a scope.",
    ],
    do_not_use_when: ["Do not use for persistence or save behavior."],
  },
  accessibility_requirement: {
    use_when: [
      "Use for WCAG, keyboard, screen-reader, or accessibility target requirements.",
    ],
    do_not_use_when: [
      "Do not use for generic acceptance outcomes or performance constraints.",
    ],
  },
  retention_policy: {
    use_when: [
      "Use when records or data must be retained for a bounded duration.",
    ],
    do_not_use_when: [
      "Do not use for request rate windows, session expiry, or latency thresholds.",
    ],
  },
  resource_constraint: {
    use_when: [
      "Use for resource, latency, timeout, size, quota, or numeric threshold constraints.",
    ],
    do_not_use_when: [
      "Do not use for uniqueness, rate limits, feature gates, or actor permissions.",
    ],
  },
  feature_gate: {
    use_when: [
      "Use when behavior is controlled by a runtime/config flag, kill switch, or feature gate.",
    ],
    do_not_use_when: [
      "Do not use for actor authorization or ordinary scalar enabled/disabled properties.",
    ],
  },
  publishes_event: {
    use_when: [
      "Use when a subject publishes, emits, or raises a domain/system event.",
    ],
    do_not_use_when: [
      "Do not use for consuming events or observable UI acceptance outcomes.",
    ],
  },
  acceptance_rule: {
    use_when: [
      "Use for observable acceptance outcomes such as visible empty states or displayed results.",
    ],
    do_not_use_when: [
      "Do not use for internal state machines, event publication, or accessibility standards.",
    ],
  },
  permission_rule: {
    use_when: [
      "Use for allow/deny permission statements with an actor, action, and resource.",
    ],
    do_not_use_when: [
      "Do not use for scalar quotas, feature flags, or state transitions; choose a more specific predicate or strict property instead.",
    ],
  },
  default_value: {
    use_when: [
      "Use when behavior defines a default mode, state, status, option, or value.",
    ],
    do_not_use_when: [
      "Do not use for current-state assertions or allowed value sets.",
    ],
  },
};
