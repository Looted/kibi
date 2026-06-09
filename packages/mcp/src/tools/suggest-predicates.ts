import { createHash } from "node:crypto";
import type { PrologProcess } from "kibi-cli/prolog";
import { parseEntityFromList, parseListOfLists } from "kibi-cli/prolog/codec";

type PredicatePolarity = "assert" | "deny";

interface PredicateUsageHints {
  use_when: string[];
  do_not_use_when: string[];
}

interface PredicateSchemaCandidate {
  id: string;
  predicate_name: string;
  title: string;
  description: string;
  argument_names: string[];
  argument_types: string[];
  keywords: string[];
  examples: string[];
  tags: string[];
  usage_hints?: PredicateUsageHints;
}

const DEFAULT_USAGE_HINTS: PredicateUsageHints = {
  use_when: [
    "Use when the prose matches this predicate signature and all required arguments can be named explicitly.",
  ],
  do_not_use_when: [
    "Do not use when a stricter scalar property, a more specific predicate, or an ontology-gap observation better preserves the claim.",
  ],
};

const USAGE_HINTS_BY_PREDICATE: Record<string, PredicateUsageHints> = {
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
  uniqueness_constraint: {
    use_when: ["Use for at-most-one or unique-per-scope constraints."],
    do_not_use_when: [
      "Do not use for numeric caps where more than one instance may be valid.",
    ],
  },
  state_membership: {
    use_when: ["Use for terminal, allowed, or enumerated state sets."],
    do_not_use_when: [
      "Do not use for one current state or a transition between states.",
    ],
  },
  temporal_order: {
    use_when: [
      "Use for before/after ordering requirements between events, states, or actions.",
    ],
    do_not_use_when: [
      "Do not use when source state, target state, and trigger are all explicit; use state_transition instead.",
    ],
  },
  conditional_behavior: {
    use_when: [
      "Use for if/when conditional prose where a condition leads to a behavior.",
    ],
    do_not_use_when: [
      "Do not use for simple boolean guards or actor permission rules.",
    ],
  },
  state_transition: {
    use_when: [
      "Use for explicit transitions from one named state to another with a trigger.",
    ],
    do_not_use_when: [
      "Do not use for a single state assertion or an allowed terminal-state set.",
    ],
  },
  rate_limit: {
    use_when: ["Use for per-window request, attempt, or action limits."],
    do_not_use_when: [
      "Do not use for resource thresholds that lack a repeated action and time window.",
    ],
  },
};

// implements REQ-mcp-suggest-predicates
export interface SuggestPredicatesArgs {
  text: string;
  requirementId?: string;
  source?: string;
  subjectHint?: string;
  maxCandidates?: number;
  minScore?: number;
  includeExistingSchemas?: boolean;
}

interface PredicateSuggestion {
  id: string;
  predicate_name: string;
  predicate_args: string[];
  canonical_key: string;
  polarity: PredicatePolarity;
  score: number;
  rationale: string;
  schema: Omit<PredicateSchemaCandidate, "keywords"> & {
    usage_hints: PredicateUsageHints;
  };
}

// implements REQ-mcp-suggest-predicates
export interface SuggestPredicatesResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    text: string;
    source: string | null;
    requirementId: string | null;
    subject: string;
    candidates: PredicateSuggestion[];
    recommendedAction: "apply_requires_predicate" | "record_ontology_gap";
    applyPlan: Array<Record<string, unknown>>;
    relationshipPlan: Record<string, unknown> | null;
    warnings: string[];
  };
  applyPlan: Array<Record<string, unknown>>;
}

const DEFAULT_MIN_SCORE = 0.35;
const DEFAULT_MAX_CANDIDATES = 5;

const BUILT_IN_PREDICATE_SCHEMAS: PredicateSchemaCandidate[] = [
  {
    id: "FACT-SCHEMA-STATE",
    predicate_name: "state",
    title: "State assertion",
    description: "A subject has or enters a named state.",
    argument_names: ["subject", "state"],
    argument_types: ["entity", "state"],
    keywords: ["state", "mode", "idle", "active", "draft", "edit"],
    examples: ["state(editor.annotation, idle)"],
    tags: ["state", "workflow"],
  },
  {
    id: "FACT-SCHEMA-TRANSITION",
    predicate_name: "transition",
    title: "State transition",
    description: "A subject transitions between states because of a trigger.",
    argument_names: ["subject", "from_state", "to_state", "trigger"],
    argument_types: ["entity", "state", "state", "trigger"],
    keywords: [
      "transition",
      "enter",
      "leave",
      "idle",
      "navigate",
      "navigates",
      "cancel",
      "escape",
    ],
    examples: ["transition(editor.annotation, draft, idle, navigation)"],
    tags: ["state", "workflow"],
  },
  {
    id: "FACT-SCHEMA-GUARD",
    predicate_name: "guard",
    title: "Behavior guard",
    description: "A condition gates or forbids behavior for a subject.",
    argument_names: ["subject", "condition", "expected"],
    argument_types: ["entity", "condition", "boolean"],
    keywords: ["guard", "unless", "readonly", "scrubbing", "disabled until"],
    examples: ["guard(editor.annotation, isReadOnly, false)"],
    tags: ["guard", "workflow"],
  },
  {
    id: "FACT-SCHEMA-EXCEPTION-RULE",
    predicate_name: "exception_rule",
    title: "Exception rule",
    description:
      "A required behavior is skipped when a named exception condition holds.",
    argument_names: ["subject", "behavior", "exception"],
    argument_types: ["entity", "behavior", "condition"],
    keywords: ["unless", "except", "except when", "opted out", "exception"],
    examples: [
      "exception_rule(notification.service, send_email, user_has_opted_out)",
    ],
    tags: ["exception", "conditional"],
  },
  {
    id: "FACT-SCHEMA-MUTUAL-EXCLUSION",
    predicate_name: "mutual_exclusion",
    title: "Mutual exclusion",
    description:
      "Two modes, states, options, or behaviors cannot be true or active together.",
    argument_names: ["left", "right"],
    argument_types: ["entity", "entity"],
    keywords: ["mutually exclusive", "exclusive", "cannot overlap", "not both"],
    examples: ["mutual_exclusion(practice_mode, exam_mode)"],
    tags: ["constraint", "exclusivity"],
  },
  {
    id: "FACT-SCHEMA-DEPENDENCY-RULE",
    predicate_name: "dependency_rule",
    title: "Dependency rule",
    description:
      "A subject requires a prerequisite before a dependent action or state can proceed.",
    argument_names: ["subject", "prerequisite", "dependent"],
    argument_types: ["entity", "condition", "action"],
    keywords: ["requires", "depends on", "prerequisite", "before"],
    examples: [
      "dependency_rule(checkout, payment_authorization, order_submission)",
    ],
    tags: ["dependency", "workflow"],
  },
  {
    id: "FACT-SCHEMA-OWNERSHIP-RULE",
    predicate_name: "ownership_rule",
    title: "Ownership rule",
    description:
      "A resource or behavior is owned by a service, team, role, or component.",
    argument_names: ["resource", "owner"],
    argument_types: ["entity", "owner"],
    keywords: ["owned by", "owner", "responsible for"],
    examples: ["ownership_rule(account_settings, profile_service)"],
    tags: ["ownership", "governance"],
  },
  {
    id: "FACT-SCHEMA-RETRY-POLICY",
    predicate_name: "retry_policy",
    title: "Retry policy",
    description:
      "A failed subject or action retries up to a bounded attempt count.",
    argument_names: ["subject", "count", "unit"],
    argument_types: ["entity", "number", "unit"],
    keywords: ["retry", "retries", "up to", "attempts", "times"],
    examples: ["retry_policy(failed_webhook_delivery, 3, times)"],
    tags: ["retry", "resilience"],
  },
  {
    id: "FACT-SCHEMA-ESCALATION-RULE",
    predicate_name: "escalation_rule",
    title: "Escalation rule",
    description:
      "A failed or unresolved subject escalates to an owner after a bounded delay.",
    argument_names: ["subject", "target", "delay", "unit"],
    argument_types: ["entity", "owner", "number", "unit"],
    keywords: ["escalate", "escalates", "escalation", "after", "support"],
    examples: ["escalation_rule(failed_payment_disputes, support, 48, hours)"],
    tags: ["escalation", "operations"],
  },
  {
    id: "FACT-SCHEMA-AVAILABILITY-SLA",
    predicate_name: "availability_sla",
    title: "Availability SLA",
    description:
      "A service or API must meet a minimum availability target over a reporting window.",
    argument_names: ["subject", "threshold", "unit", "window"],
    argument_types: ["entity", "number", "unit", "duration"],
    keywords: ["availability", "at least", "percent", "monthly", "sla"],
    examples: ["availability_sla(checkout_api, 99.9, percent, monthly)"],
    tags: ["sla", "availability"],
  },
  {
    id: "FACT-SCHEMA-NOTIFICATION-ROUTE",
    predicate_name: "notification_route",
    title: "Notification route",
    description:
      "A subject notifies a target recipient through a specific channel.",
    argument_names: ["subject", "recipient", "channel"],
    argument_types: ["entity", "recipient", "channel"],
    keywords: ["notify", "notifies", "notification", "by email", "by sms"],
    examples: ["notification_route(fraud_alerts, risk_operations, email)"],
    tags: ["notification", "routing"],
  },
  {
    id: "FACT-SCHEMA-IDEMPOTENCY-RULE",
    predicate_name: "idempotency_rule",
    title: "Idempotency rule",
    description:
      "A request or operation must deduplicate repeated execution by a stable idempotency key.",
    argument_names: ["subject", "key"],
    argument_types: ["entity", "key"],
    keywords: [
      "idempotent",
      "idempotency",
      "idempotency key",
      "dedupe",
      "deduplicated",
      "redundant",
      "concurrent",
    ],
    examples: ["idempotency_rule(payment_capture_requests, idempotency_key)"],
    tags: ["idempotency", "resilience"],
  },
  {
    id: "FACT-SCHEMA-DATA-RESIDENCY-RULE",
    predicate_name: "data_residency_rule",
    title: "Data residency rule",
    description:
      "A data set must be stored, processed, or kept within a named region or jurisdiction.",
    argument_names: ["subject", "region"],
    argument_types: ["entity", "region"],
    keywords: ["data residency", "stored in", "region", "jurisdiction"],
    examples: ["data_residency_rule(eu_customer_data, eu_region)"],
    tags: ["privacy", "data-residency"],
  },
  {
    id: "FACT-SCHEMA-AUDIT-EVENT-RULE",
    predicate_name: "audit_event_rule",
    title: "Audit event rule",
    description:
      "An action, change, or security-relevant event must be recorded in an audit log or audit trail.",
    argument_names: ["subject", "log"],
    argument_types: ["entity", "log"],
    keywords: ["audit log", "audit trail", "recorded", "logged", "audited"],
    examples: ["audit_event_rule(admin_access_changes, audit_log)"],
    tags: ["audit", "logging", "governance"],
  },
  {
    id: "FACT-SCHEMA-CONSENT-RULE",
    predicate_name: "consent_rule",
    title: "Consent rule",
    description:
      "An action or processing purpose requires a named consent before it proceeds.",
    argument_names: ["subject", "consent", "purpose"],
    argument_types: ["entity", "consent", "purpose"],
    keywords: ["consent", "requires consent", "before processing"],
    examples: ["consent_rule(marketing_emails, user_consent, processing)"],
    tags: ["privacy", "consent"],
  },
  {
    id: "FACT-SCHEMA-LIFECYCLE-RULE",
    predicate_name: "lifecycle_rule",
    title: "Lifecycle rule",
    description:
      "An entity must be archived, deleted, expired, or lifecycle-transitioned after a duration.",
    argument_names: ["subject", "action", "duration", "unit"],
    argument_types: ["entity", "action", "number", "unit"],
    keywords: ["archive", "archived", "delete", "deleted", "expire", "after"],
    examples: ["lifecycle_rule(expired_sessions, archived, 30, days)"],
    tags: ["lifecycle", "retention"],
  },
  {
    id: "FACT-SCHEMA-CONFLICT-RESOLUTION-RULE",
    predicate_name: "conflict_resolution_rule",
    title: "Conflict resolution rule",
    description:
      "Concurrent or synchronized updates resolve conflicts with a named strategy.",
    argument_names: ["subject", "strategy"],
    argument_types: ["entity", "strategy"],
    keywords: ["conflict", "conflicts", "latest write wins", "merge"],
    examples: ["conflict_resolution_rule(profile_updates, latest_write_wins)"],
    tags: ["sync", "conflict-resolution"],
  },
  {
    id: "FACT-SCHEMA-FALLBACK-RULE",
    predicate_name: "fallback_rule",
    title: "Fallback rule",
    description:
      "A degraded or unavailable dependency causes a subject to fall back to an alternative behavior.",
    argument_names: ["condition", "subject", "fallback"],
    argument_types: ["condition", "entity", "behavior"],
    keywords: ["fall back", "fallback", "unavailable", "degraded"],
    examples: [
      "fallback_rule(payment_provider_is_unavailable, checkout, manual_review)",
    ],
    tags: ["fallback", "resilience"],
  },
  {
    id: "FACT-SCHEMA-BATCH-OPERATION-RULE",
    predicate_name: "batch_operation_rule",
    title: "Batch operation rule",
    description:
      "A bulk operation processes a resource in batches of a bounded size.",
    argument_names: ["subject", "resource", "batch_size"],
    argument_types: ["entity", "resource", "number"],
    keywords: ["batch", "batches", "bulk", "process"],
    examples: ["batch_operation_rule(invoice_exports, records, 500)"],
    tags: ["batching", "bulk"],
  },
  {
    id: "FACT-SCHEMA-CONSISTENCY-RULE",
    predicate_name: "consistency_rule",
    title: "Consistency rule",
    description:
      "An entity reference or value must remain consistent with another existing entity or invariant.",
    argument_names: ["subject", "target"],
    argument_types: ["entity", "entity"],
    keywords: ["reference", "references", "existing", "consistent"],
    examples: ["consistency_rule(order_items, existing_order)"],
    tags: ["consistency", "referential-integrity"],
  },
  {
    id: "FACT-SCHEMA-BUILD-CONSTRAINT",
    predicate_name: "build_constraint",
    title: "Build constraint",
    description:
      "Build-time generation or deployment configuration must satisfy a deterministic property.",
    argument_names: ["subject", "property", "scope"],
    argument_types: ["entity", "property", "scope"],
    keywords: ["build time", "deterministic", "generator", "deployment"],
    examples: [
      "build_constraint(share_manifest_generation, deterministic, build_time)",
    ],
    tags: ["build", "determinism"],
  },
  {
    id: "FACT-SCHEMA-ENVIRONMENT-SAFETY-RULE",
    predicate_name: "environment_safety_rule",
    title: "Environment safety rule",
    description:
      "A named action is allowed or forbidden in a deployment environment.",
    argument_names: ["action", "decision", "environment"],
    argument_types: ["action", "decision", "environment"],
    keywords: ["production", "staging", "forbidden", "destructive"],
    examples: [
      "environment_safety_rule(destructive_operations, forbidden, production)",
    ],
    tags: ["environment", "safety"],
  },
  {
    id: "FACT-SCHEMA-SCHEMA-INVARIANT-RULE",
    predicate_name: "schema_invariant_rule",
    title: "Schema invariant rule",
    description:
      "A schema field has an invariant such as immutability, type, enum, or value range.",
    argument_names: ["field", "invariant", "scope"],
    argument_types: ["field", "invariant", "scope"],
    keywords: ["immutable", "schema", "field", "enum", "range"],
    examples: ["schema_invariant_rule(user_email, immutable, after_creation)"],
    tags: ["schema", "invariant"],
  },
  {
    id: "FACT-SCHEMA-CODING-STANDARD-RULE",
    predicate_name: "coding_standard_rule",
    title: "Coding standard rule",
    description:
      "Developer-facing code must use or avoid a framework API, pattern, or documentation practice.",
    argument_names: ["subject", "action", "target"],
    argument_types: ["entity", "action", "api"],
    keywords: ["computed", "signals", "must use", "must not use"],
    examples: ["coding_standard_rule(derived_state, use, computed_signals)"],
    tags: ["coding-standard", "agent-guidance"],
  },
  {
    id: "FACT-SCHEMA-MIGRATION-BOUNDARY-RULE",
    predicate_name: "migration_boundary_rule",
    title: "Migration boundary rule",
    description:
      "Legacy data or APIs may only be used for migration or compatibility input.",
    argument_names: ["subject", "allowed_action", "scope"],
    argument_types: ["entity", "action", "scope"],
    keywords: ["legacy", "migration input", "only be read"],
    examples: [
      "migration_boundary_rule(legacy_fabricdata, read, migration_input)",
    ],
    tags: ["migration", "compatibility"],
  },
  {
    id: "FACT-SCHEMA-ABSENCE-REQUIREMENT",
    predicate_name: "absence_requirement",
    title: "Absence requirement",
    description:
      "A component, extension, RPC, schema, or feature must be absent, removed, or not exist.",
    argument_names: ["subject", "state"],
    argument_types: ["entity", "state"],
    keywords: ["absent", "removed", "must not exist", "not exist", "no"],
    examples: ["absence_requirement(pg_graphql_extension, absent)"],
    tags: ["absence", "security"],
  },
  {
    id: "FACT-SCHEMA-OFFLINE-BEHAVIOR-RULE",
    predicate_name: "offline_behavior_rule",
    title: "Offline behavior rule",
    description:
      "Synchronization or gameplay behavior remains non-blocking or resilient during offline conditions.",
    argument_names: ["subject", "behavior", "condition"],
    argument_types: ["entity", "behavior", "condition"],
    keywords: ["offline", "non-blocking", "resilient", "synchronization"],
    examples: [
      "offline_behavior_rule(cloud_synchronization, non-blocking, offline_conditions)",
    ],
    tags: ["offline", "sync"],
  },
  {
    id: "FACT-SCHEMA-RELEASE-GATE-RULE",
    predicate_name: "release_gate_rule",
    title: "Release gate rule",
    description:
      "A build or release must pass named gates before distribution, review, or deployment.",
    argument_names: ["subject", "gate", "target"],
    argument_types: ["entity", "gate", "release_target"],
    keywords: ["release", "gates", "before", "testflight", "distribution"],
    examples: [
      "release_gate_rule(ios_builds, configuration_gates, testflight_distribution)",
    ],
    tags: ["release", "gate"],
  },
  {
    id: "FACT-SCHEMA-PLATFORM-CONSISTENCY-RULE",
    predicate_name: "platform_consistency_rule",
    title: "Platform consistency rule",
    description: "A state or entitlement synchronizes across named platforms.",
    argument_names: ["subject", "platforms"],
    argument_types: ["entity", "platform_list"],
    keywords: ["synchronize", "across", "platforms", "ios", "android", "web"],
    examples: ["platform_consistency_rule(premium_status, ios,android,web)"],
    tags: ["platform", "consistency"],
  },
  {
    id: "FACT-SCHEMA-PRESERVATION-RULE",
    predicate_name: "preservation_rule",
    title: "Preservation rule",
    description:
      "Child data or feedback is preserved across deletion or removal of a parent resource.",
    argument_names: ["subject", "preserved", "condition"],
    argument_types: ["action", "entity", "condition"],
    keywords: ["preserve", "preserved", "deletion", "removed"],
    examples: [
      "preservation_rule(soft_deletion, annotations, video_is_removed)",
    ],
    tags: ["preservation", "deletion"],
  },
  {
    id: "FACT-SCHEMA-ABSTRACTION-BOUNDARY-RULE",
    predicate_name: "abstraction_boundary_rule",
    title: "Abstraction boundary rule",
    description:
      "Persisted data, APIs, or contracts must stay neutral to a renderer, vendor, runtime, or implementation detail.",
    argument_names: ["subject", "relation", "contract"],
    argument_types: ["entity", "relation", "contract"],
    keywords: ["renderer-neutral", "contract", "runtime snapshots", "vendor"],
    examples: [
      "abstraction_boundary_rule(annotation_drawing_data, persisted_as, renderer-neutral_scene_contract)",
    ],
    tags: ["architecture", "abstraction"],
  },
  {
    id: "FACT-SCHEMA-SECURITY-CONFIGURATION-RULE",
    predicate_name: "security_configuration_rule",
    title: "Security configuration rule",
    description:
      "A security-sensitive component must have an explicit configuration value.",
    argument_names: ["subject", "setting", "value"],
    argument_types: ["entity", "setting", "value"],
    keywords: ["explicit", "search_path", "security", "configuration"],
    examples: [
      "security_configuration_rule(trigger_functions, search_path, public)",
    ],
    tags: ["security", "configuration"],
  },
  {
    id: "FACT-SCHEMA-ORDERED-STRATEGY-RULE",
    predicate_name: "ordered_strategy_rule",
    title: "Ordered strategy rule",
    description: "A subject must use strategies in a required priority order.",
    argument_names: ["subject", "strategy_kind", "ordered_values"],
    argument_types: ["entity", "strategy_kind", "ordered_list"],
    keywords: ["priority order", "selector strategies", "fallback order"],
    examples: [
      "ordered_strategy_rule(poms, selector_strategies, data-testid,visible,text)",
    ],
    tags: ["strategy", "priority"],
  },
  {
    id: "FACT-SCHEMA-REFRESH-POLICY-RULE",
    predicate_name: "refresh_policy_rule",
    title: "Refresh policy rule",
    description:
      "A subject refreshes a target automatically or by a named policy.",
    argument_names: ["subject", "target", "policy"],
    argument_types: ["entity", "target", "policy"],
    keywords: ["automatically refresh", "manual page reload", "refresh"],
    examples: ["refresh_policy_rule(dashboard, processing_videos, automatic)"],
    tags: ["refresh", "ui"],
  },
  {
    id: "FACT-SCHEMA-SCOPED-AUTHORIZATION-RULE",
    predicate_name: "scoped_authorization_rule",
    title: "Scoped authorization rule",
    description:
      "A scoped actor is allowed or denied an action because of assignment, ownership, or membership.",
    argument_names: ["actor_scope", "action", "decision"],
    argument_types: ["actor_scope", "action", "decision"],
    keywords: ["unassigned", "assigned", "denied", "scoped"],
    examples: [
      "scoped_authorization_rule(unassigned_instructors, signed_url_generation, deny)",
    ],
    tags: ["authorization", "scope"],
  },
  {
    id: "FACT-SCHEMA-DOCUMENTATION-STANDARD-RULE",
    predicate_name: "documentation_standard_rule",
    title: "Documentation standard rule",
    description:
      "A subject must be documented in a named documentation artifact.",
    argument_names: ["subject", "relation", "artifact"],
    argument_types: ["entity", "relation", "artifact"],
    keywords: ["documented", "docs", "symbols", "documentation"],
    examples: [
      "documentation_standard_rule(code_symbols, documented_in, docs_symbols_yaml)",
    ],
    tags: ["documentation", "standard"],
  },
  {
    id: "FACT-SCHEMA-WARMUP-POLICY-RULE",
    predicate_name: "warmup_policy_rule",
    title: "Warmup policy rule",
    description: "A subject must warm up on a named trigger or entry point.",
    argument_names: ["subject", "trigger"],
    argument_types: ["entity", "trigger"],
    keywords: ["warm up", "warmup", "on entry"],
    examples: ["warmup_policy_rule(editor_video, entry)"],
    tags: ["warmup", "performance"],
  },
  {
    id: "FACT-SCHEMA-VISUAL-LAYOUT-RULE",
    predicate_name: "visual_layout_rule",
    title: "Visual layout rule",
    description:
      "A UI subject must remain visually aligned or layout-consistent with a target.",
    argument_names: ["subject", "relation", "target"],
    argument_types: ["ui_entity", "relation", "ui_entity"],
    keywords: ["visually aligned", "layout", "aligned with"],
    examples: [
      "visual_layout_rule(processing_video_cards, aligned_with, ready_cards)",
    ],
    tags: ["visual", "layout"],
  },
  {
    id: "FACT-SCHEMA-ENFORCEMENT-LOCATION-RULE",
    predicate_name: "enforcement_location_rule",
    title: "Enforcement location rule",
    description:
      "A constraint or policy must be enforced at a named system layer.",
    argument_names: ["subject", "location"],
    argument_types: ["constraint", "system_layer"],
    keywords: ["enforced at", "database level", "application level"],
    examples: [
      "enforcement_location_rule(foreign_key_constraints, database_level)",
    ],
    tags: ["enforcement", "architecture"],
  },
  {
    id: "FACT-SCHEMA-RECONCILIATION-RULE",
    predicate_name: "reconciliation_rule",
    title: "Reconciliation rule",
    description:
      "A trigger reconciles a target and performs a stale-data cleanup action.",
    argument_names: ["subject", "trigger", "target", "action"],
    argument_types: ["entity", "trigger", "target", "action"],
    keywords: ["reconcile", "clear stale", "stale notifications"],
    examples: [
      "reconciliation_rule(system, login, analysis_notifications, clear_stale_notifications)",
    ],
    tags: ["reconciliation", "cleanup"],
  },
  {
    id: "FACT-SCHEMA-THROTTLE-POLICY-RULE",
    predicate_name: "throttle_policy_rule",
    title: "Throttle policy rule",
    description:
      "Handlers or operations must be throttled for a named activity class.",
    argument_names: ["subject", "condition"],
    argument_types: ["entity", "condition"],
    keywords: ["throttled", "high-frequency", "event handlers"],
    examples: [
      "throttle_policy_rule(event_handlers, high-frequency_operations)",
    ],
    tags: ["throttle", "performance"],
  },
  {
    id: "FACT-SCHEMA-HAS-UNSAVED-CHANGES",
    predicate_name: "has_unsaved_changes",
    title: "Unsaved change state",
    description: "A subject has unsaved or dirty local edits.",
    argument_names: ["subject", "expected"],
    argument_types: ["entity", "boolean"],
    keywords: ["unsaved", "dirty", "draft", "edits", "changes"],
    examples: ["has_unsaved_changes(editor.annotation, true)"],
    tags: ["state", "persistence"],
  },
  {
    id: "FACT-SCHEMA-COMMIT-ACTION",
    predicate_name: "commit_action",
    title: "Commit or save action",
    description:
      "A trigger commits, saves, or persists a subject within a scope.",
    argument_names: ["subject", "trigger", "scope"],
    argument_types: ["entity", "trigger", "scope"],
    keywords: [
      "save",
      "saves",
      "saved",
      "auto-save",
      "autosave",
      "commit",
      "persist",
      "navigation",
      "navigates",
      "draft",
    ],
    examples: ["commit_action(editor.annotation, navigation, draft)"],
    tags: ["persistence", "workflow"],
  },
  {
    id: "FACT-SCHEMA-DISCARD-ACTION",
    predicate_name: "discard_action",
    title: "Discard action",
    description:
      "A trigger discards or cancels changes for a subject within a scope.",
    argument_names: ["subject", "trigger", "scope"],
    argument_types: ["entity", "trigger", "scope"],
    keywords: ["discard", "cancel", "escape", "revert", "without save"],
    examples: ["discard_action(editor.annotation, escape, active_annotation)"],
    tags: ["persistence", "workflow"],
  },
  {
    id: "FACT-SCHEMA-ACCESSIBILITY",
    predicate_name: "accessibility_requirement",
    title: "Accessibility requirement",
    description:
      "A subject must satisfy an accessibility standard or severity target.",
    argument_names: ["subject", "standard", "severity"],
    argument_types: ["entity", "standard", "severity"],
    keywords: ["accessibility", "a11y", "wcag", "keyboard", "screen reader"],
    examples: ["accessibility_requirement(game.flow, WCAG, high)"],
    tags: ["accessibility", "quality"],
  },
  {
    id: "FACT-SCHEMA-RETENTION-POLICY",
    predicate_name: "retention_policy",
    title: "Retention policy",
    description: "A subject is retained for a bounded duration.",
    argument_names: ["subject", "duration", "unit"],
    argument_types: ["entity", "number", "unit"],
    keywords: ["retain", "retained", "retention", "days", "months", "years"],
    examples: ["retention_policy(customer.data, 7, years)"],
    tags: ["data", "policy"],
  },
  {
    id: "FACT-SCHEMA-RESOURCE-CONSTRAINT",
    predicate_name: "resource_constraint",
    title: "Resource constraint",
    description:
      "A subject constrains a resource by operator, threshold, and unit.",
    argument_names: ["subject", "resource", "operator", "threshold", "unit"],
    argument_types: ["entity", "resource", "operator", "number", "unit"],
    keywords: ["limit", "maximum", "minimum", "latency", "timeout", "size"],
    examples: ["resource_constraint(api.search, latency, lte, 200, ms)"],
    tags: ["performance", "constraint"],
  },
  {
    id: "FACT-SCHEMA-FEATURE-GATE",
    predicate_name: "feature_gate",
    title: "Feature gate",
    description: "A subject is controlled by a runtime or configuration gate.",
    argument_names: ["subject", "gate", "expected"],
    argument_types: ["entity", "flag", "boolean"],
    keywords: ["flag", "feature gate", "enabled", "disabled", "kill switch"],
    examples: ["feature_gate(checkout.v2, checkoutV2Enabled, true)"],
    tags: ["flag", "runtime"],
  },
  {
    id: "FACT-SCHEMA-EVENT-PUBLISH",
    predicate_name: "publishes_event",
    title: "Event publication",
    description: "A subject publishes a domain or system event.",
    argument_names: ["subject", "event"],
    argument_types: ["entity", "event"],
    keywords: ["publish", "publishes", "emit", "emits", "event"],
    examples: ["publishes_event(order.checkout, OrderSubmitted)"],
    tags: ["event", "architecture"],
  },
  {
    id: "FACT-SCHEMA-ACCEPTANCE-RULE",
    predicate_name: "acceptance_rule",
    title: "Acceptance rule",
    description: "A subject has an observable acceptance outcome.",
    argument_names: ["subject", "outcome"],
    argument_types: ["entity", "outcome"],
    keywords: [
      "acceptance",
      "observable",
      "outcome",
      "must show",
      "must display",
    ],
    examples: ["acceptance_rule(search.results, shows_empty_state)"],
    tags: ["acceptance", "quality"],
  },
  {
    id: "FACT-SCHEMA-PERMISSION-RULE",
    predicate_name: "permission_rule",
    title: "Permission rule",
    description: "An actor is allowed or denied an action against a resource.",
    argument_names: ["actor", "action", "resource", "decision"],
    argument_types: ["actor", "action", "resource", "decision"],
    keywords: [
      "may",
      "can",
      "allowed",
      "denied",
      "forbidden",
      "must not",
      "cannot",
      "can't",
      "export",
      "permission",
    ],
    examples: ["permission_rule(guest, export, customer_data, deny)"],
    tags: ["permission", "policy"],
  },
  {
    id: "FACT-SCHEMA-DEFAULT-VALUE",
    predicate_name: "default_value",
    title: "Default value",
    description: "A subject property defaults to a value.",
    argument_names: ["subject", "property", "value"],
    argument_types: ["entity", "property", "value"],
    keywords: ["default", "defaults", "defaulted", "initial", "mode", "tool"],
    examples: ["default_value(annotation.tool, mode, move)"],
    tags: ["default", "configuration"],
  },
  {
    id: "FACT-SCHEMA-UNIQUENESS-CONSTRAINT",
    predicate_name: "uniqueness_constraint",
    title: "Uniqueness constraint",
    description: "A subject is unique within one or more scope keys.",
    argument_names: ["subject", "scope"],
    argument_types: ["entity", "scope"],
    keywords: ["unique", "uniqueness", "at most one", "one", "per"],
    examples: ["uniqueness_constraint(annotation, video,timeKey)"],
    tags: ["constraint", "identity"],
  },
  {
    id: "FACT-SCHEMA-STATE-MEMBERSHIP",
    predicate_name: "state_membership",
    title: "State membership",
    description: "A state-valued subject has a closed set of allowed states.",
    argument_names: ["subject", "states"],
    argument_types: ["entity", "state_list"],
    keywords: ["terminal states", "states are", "one of", "ready", "anonymous"],
    examples: ["state_membership(auth.status, ready,anonymous,profile-error)"],
    tags: ["state", "workflow"],
  },
  {
    id: "FACT-SCHEMA-TEMPORAL-ORDER",
    predicate_name: "temporal_order",
    title: "Temporal order",
    description: "One event or state must occur before or after another.",
    argument_names: ["subject", "before_event", "after_event"],
    argument_types: ["entity", "event", "event"],
    keywords: ["before", "after", "saved", "completes", "navigation"],
    examples: ["temporal_order(draft.changes, saved, navigation_completes)"],
    tags: ["temporal", "workflow"],
  },
  {
    id: "FACT-SCHEMA-CONDITIONAL-BEHAVIOR",
    predicate_name: "conditional_behavior",
    title: "Conditional behavior",
    description: "A behavior follows when a condition is true.",
    argument_names: ["subject", "condition", "behavior"],
    argument_types: ["entity", "condition", "behavior"],
    keywords: ["if", "during", "becomes", "condition", "provided that"],
    examples: [
      "conditional_behavior(card, fails_during_session, becomes_tainted)",
    ],
    tags: ["conditional", "workflow"],
  },
  {
    id: "FACT-SCHEMA-STATE-TRANSITION",
    predicate_name: "state_transition",
    title: "State transition",
    description:
      "A subject moves from one state to another because of a trigger.",
    argument_names: ["subject", "from_state", "to_state", "trigger"],
    argument_types: ["entity", "state", "state", "trigger"],
    keywords: ["transitions from", "transition from", "from draft", "to idle"],
    examples: ["state_transition(editor, draft, idle, navigation_completes)"],
    tags: ["state", "workflow"],
  },
  {
    id: "FACT-SCHEMA-RATE-LIMIT",
    predicate_name: "rate_limit",
    title: "Rate limit",
    description: "An action is limited to a count within a time window.",
    argument_names: ["subject", "action", "window", "count"],
    argument_types: ["entity", "action", "duration", "number"],
    keywords: [
      "rate limited",
      "rate limit",
      "attempts",
      "per hour",
      "per minute",
    ],
    examples: ["rate_limit(password_reset.request, attempts, hour, 5)"],
    tags: ["rate-limit", "security"],
  },
];

function normalizeText(text: string): string {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    throw new Error(
      "Predicate suggestion failed: text must be a non-empty string",
    );
  }
  return normalized;
}

function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

function clampScore(value: number | undefined): number {
  const numeric =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : DEFAULT_MIN_SCORE;
  return Math.min(1, Math.max(0, numeric));
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hashId(prefix: string, parts: string[]): string {
  const digest = createHash("sha256")
    .update(parts.join("\u0000"))
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `${prefix}-${digest}`;
}

function inferSubject(text: string, subjectHint: string | undefined): string {
  const explicit = normalizeOptionalString(subjectHint);
  if (explicit) return explicit;

  const lower = text.toLowerCase();
  if (lower.includes("annotation")) return "editor.annotation";
  if (lower.includes("editor")) return "editor";
  if (lower.includes("session")) return "session";
  if (lower.includes("customer data")) return "customer.data";
  if (lower.includes("user")) return "user";
  return "requirement.subject";
}

function inferTrigger(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("navigate")) return "navigation";
  if (lower.includes("escape")) return "escape";
  if (lower.includes("cancel")) return "cancel";
  if (lower.includes("submit")) return "submit";
  return "unspecified_trigger";
}

function inferScope(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("draft")) return "draft";
  if (lower.includes("annotation")) return "active_annotation";
  if (lower.includes("session")) return "session";
  return "subject";
}

function inferArgs(
  schema: PredicateSchemaCandidate,
  text: string,
  subject: string,
): string[] {
  const lower = text.toLowerCase();
  switch (schema.predicate_name) {
    case "state":
      return [subject, lower.includes("idle") ? "idle" : "active"];
    case "transition":
      return [
        subject,
        lower.includes("edit") ? "edit" : "draft",
        lower.includes("idle") ? "idle" : "active",
        inferTrigger(text),
      ];
    case "guard":
      return inferGuardArgs(text, subject);
    case "exception_rule":
      return inferExceptionRuleArgs(text, subject);
    case "mutual_exclusion":
      return inferMutualExclusionArgs(text);
    case "dependency_rule":
      return inferDependencyRuleArgs(text);
    case "ownership_rule":
      return inferOwnershipRuleArgs(text);
    case "retry_policy":
      return inferRetryPolicyArgs(text);
    case "escalation_rule":
      return inferEscalationRuleArgs(text);
    case "availability_sla":
      return inferAvailabilitySlaArgs(text);
    case "notification_route":
      return inferNotificationRouteArgs(text);
    case "idempotency_rule":
      return inferIdempotencyRuleArgs(text);
    case "data_residency_rule":
      return inferDataResidencyRuleArgs(text);
    case "audit_event_rule":
      return inferAuditEventRuleArgs(text);
    case "consent_rule":
      return inferConsentRuleArgs(text);
    case "lifecycle_rule":
      return inferLifecycleRuleArgs(text);
    case "conflict_resolution_rule":
      return inferConflictResolutionRuleArgs(text);
    case "fallback_rule":
      return inferFallbackRuleArgs(text);
    case "batch_operation_rule":
      return inferBatchOperationRuleArgs(text);
    case "consistency_rule":
      return inferConsistencyRuleArgs(text);
    case "build_constraint":
      return inferBuildConstraintArgs(text);
    case "environment_safety_rule":
      return inferEnvironmentSafetyRuleArgs(text);
    case "schema_invariant_rule":
      return inferSchemaInvariantRuleArgs(text);
    case "coding_standard_rule":
      return inferCodingStandardRuleArgs(text);
    case "migration_boundary_rule":
      return inferMigrationBoundaryRuleArgs(text);
    case "absence_requirement":
      return inferAbsenceRequirementArgs(text);
    case "offline_behavior_rule":
      return inferOfflineBehaviorRuleArgs(text);
    case "release_gate_rule":
      return inferReleaseGateRuleArgs(text);
    case "platform_consistency_rule":
      return inferPlatformConsistencyRuleArgs(text);
    case "preservation_rule":
      return inferPreservationRuleArgs(text);
    case "abstraction_boundary_rule":
      return inferAbstractionBoundaryRuleArgs(text);
    case "security_configuration_rule":
      return inferSecurityConfigurationRuleArgs(text);
    case "ordered_strategy_rule":
      return inferOrderedStrategyRuleArgs(text);
    case "refresh_policy_rule":
      return inferRefreshPolicyRuleArgs(text);
    case "scoped_authorization_rule":
      return inferScopedAuthorizationRuleArgs(text);
    case "documentation_standard_rule":
      return inferDocumentationStandardRuleArgs(text);
    case "warmup_policy_rule":
      return inferWarmupPolicyRuleArgs(text);
    case "visual_layout_rule":
      return inferVisualLayoutRuleArgs(text);
    case "enforcement_location_rule":
      return inferEnforcementLocationRuleArgs(text);
    case "reconciliation_rule":
      return inferReconciliationRuleArgs(text);
    case "throttle_policy_rule":
      return inferThrottlePolicyRuleArgs(text);
    case "has_unsaved_changes":
      return [subject, lower.includes("no unsaved") ? "false" : "true"];
    case "commit_action":
    case "discard_action":
      return [subject, inferTrigger(text), inferScope(text)];
    case "accessibility_requirement":
      return [
        subject,
        lower.includes("wcag") ? "WCAG" : "accessibility",
        "required",
      ];
    case "retention_policy":
      return [subject, inferDuration(text), inferDurationUnit(text)];
    case "resource_constraint":
      return [
        subject,
        inferResource(text),
        inferOperator(text),
        inferNumber(text),
        inferUnit(text),
      ];
    case "feature_gate":
      return [
        subject,
        inferGate(text),
        lower.includes("disabled") ? "false" : "true",
      ];
    case "publishes_event":
      return [subject, inferEvent(text)];
    case "acceptance_rule":
      return [subject, slug(text).slice(0, 64) || "observable_outcome"];
    case "permission_rule":
      return inferPermissionRuleArgs(text);
    case "default_value":
      return inferDefaultValueArgs(text, subject);
    case "uniqueness_constraint":
      return inferUniquenessArgs(text);
    case "state_membership":
      return inferStateMembershipArgs(text, subject);
    case "temporal_order":
      return inferTemporalOrderArgs(text, subject);
    case "conditional_behavior":
      return inferConditionalBehaviorArgs(text, subject);
    case "state_transition":
      return inferStateTransitionArgs(text, subject);
    case "rate_limit":
      return inferRateLimitArgs(text);
    default:
      return schema.argument_names.map((name) =>
        name === "subject" ? subject : "unknown",
      );
  }
}

function normalizePredicateToken(value: string): string {
  return value
    .trim()
    .replace(/\b(?:a|an|the)\b\s*/gi, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function singularize(value: string): string {
  if (["changes", "status", "results"].includes(value)) return value;
  return value.endsWith("s") && value.length > 3 ? value.slice(0, -1) : value;
}

function normalizeSubjectKey(value: string): string {
  return slug(value).split("_").map(singularize).join(".");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(
  text: string,
  lowerText: string,
  keyword: string,
): boolean {
  const normalized = keyword.toLowerCase();
  if (/^[a-z0-9\s-]+$/.test(normalized)) {
    const pattern = escapeRegExp(normalized).replace(/\s+/g, "\\s+");
    return new RegExp(`\\b${pattern}\\b`, "i").test(text);
  }
  return lowerText.includes(normalized);
}

function inferPermissionRuleArgs(text: string): string[] {
  const prohibition = text.match(
    /^(?<actor>[a-z][a-z\s_-]*?)\s+(?:must\s+not|cannot|can't|is\s+forbidden\s+to)\s+(?<action>[a-z][a-z_-]*)\s+(?<resource>.+?)\.?$/i,
  );
  if (prohibition?.groups) {
    return [
      singularize(slug(prohibition.groups.actor ?? "actor")),
      normalizePredicateToken(prohibition.groups.action ?? "action"),
      normalizePredicateToken(prohibition.groups.resource ?? "resource"),
      "deny",
    ];
  }

  const permission = text.match(
    /^(?:only\s+)?(?<actor>[a-z][a-z\s_-]*?)\s+(?:may|can|is\s+allowed\s+to)\s+(?<action>[a-z][a-z_-]*)\s+(?<resource>.+?)(?:\s+when\s+.+)?\.?$/i,
  );
  return [
    singularize(slug(permission?.groups?.actor ?? "actor")),
    normalizePredicateToken(permission?.groups?.action ?? "action"),
    normalizePredicateToken(permission?.groups?.resource ?? "resource"),
    "assert",
  ];
}

function inferGuardArgs(text: string, subject: string): string[] {
  const disabledUntil = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)?\s*(?:stay|remain)?\s*disabled\s+until\s+(?<condition>.+?)\.?$/i,
  );
  if (disabledUntil?.groups?.subject && disabledUntil.groups.condition) {
    return [
      slug(disabledUntil.groups.subject),
      normalizePredicateToken(disabledUntil.groups.condition),
      "disabled",
    ];
  }

  const lower = text.toLowerCase();
  return [
    subject,
    lower.includes("readonly") ? "isReadOnly" : "condition",
    "true",
  ];
}

function inferExceptionRuleArgs(text: string, subject: string): string[] {
  const exception = text.match(
    /^(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+(?:must|shall|should)\s+(?<behavior>.+?)\s+unless\s+(?:the\s+)?(?<exception>.+?)\.?$/i,
  );
  return [
    exception?.groups?.subject
      ? normalizeSubjectKey(exception.groups.subject)
      : subject,
    normalizePredicateToken(exception?.groups?.behavior ?? "behavior"),
    normalizePredicateToken(exception?.groups?.exception ?? "exception"),
  ];
}

function inferMutualExclusionArgs(text: string): string[] {
  const exclusion = text.match(
    /^(?<left>.+?)\s+and\s+(?<right>.+?)\s+(?:must|shall|should)\s+be\s+mutually\s+exclusive\.?$/i,
  );
  return [
    slug(exclusion?.groups?.left ?? "left"),
    slug(exclusion?.groups?.right ?? "right"),
  ];
}

function inferDependencyRuleArgs(text: string): string[] {
  const dependency = text.match(
    /^(?<subject>.+?)\s+requires\s+(?<prerequisite>.+?)\s+before\s+(?<dependent>.+?)\.?$/i,
  );
  return [
    slug(dependency?.groups?.subject ?? "subject"),
    normalizePredicateToken(dependency?.groups?.prerequisite ?? "prerequisite"),
    normalizePredicateToken(dependency?.groups?.dependent ?? "dependent"),
  ];
}

function inferOwnershipRuleArgs(text: string): string[] {
  const ownership = text.match(
    /^(?<resource>.+?)\s+(?:is|are)\s+owned\s+by\s+(?:the\s+)?(?<owner>.+?)\.?$/i,
  );
  return [
    slug(ownership?.groups?.resource ?? "resource"),
    slug(ownership?.groups?.owner ?? "owner"),
  ];
}

function inferRetryPolicyArgs(text: string): string[] {
  const retry = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+retry\s+up\s+to\s+(?<count>\d+)\s+(?<unit>times|attempts?)\.?$/i,
  );
  return [
    slug(retry?.groups?.subject ?? "subject"),
    retry?.groups?.count ?? "0",
    slug(retry?.groups?.unit ?? "times"),
  ];
}

function inferEscalationRuleArgs(text: string): string[] {
  const escalation = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+escalate\s+to\s+(?<target>.+?)\s+after\s+(?<delay>\d+)\s+(?<unit>[a-z]+)\.?$/i,
  );
  return [
    slug(escalation?.groups?.subject ?? "subject"),
    slug(escalation?.groups?.target ?? "target"),
    escalation?.groups?.delay ?? "0",
    slug(escalation?.groups?.unit ?? "unit"),
  ];
}

function inferAvailabilitySlaArgs(text: string): string[] {
  const availability = text.match(
    /^(?<subject>.+?)\s+availability\s+(?:must|shall|should)\s+be\s+at\s+least\s+(?<threshold>\d+(?:\.\d+)?)\s+(?<unit>percent|%)\s+(?<window>[a-z]+)\.?$/i,
  );
  return [
    slug(availability?.groups?.subject ?? "subject"),
    availability?.groups?.threshold ?? "0",
    availability?.groups?.unit === "%"
      ? "percent"
      : slug(availability?.groups?.unit ?? "percent"),
    slug(availability?.groups?.window ?? "window"),
  ];
}

function inferNotificationRouteArgs(text: string): string[] {
  const notification = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+notify\s+(?<recipient>.+?)\s+by\s+(?<channel>[a-z]+)\.?$/i,
  );
  return [
    slug(notification?.groups?.subject ?? "subject"),
    slug(notification?.groups?.recipient ?? "recipient"),
    slug(notification?.groups?.channel ?? "channel"),
  ];
}

function inferIdempotencyRuleArgs(text: string): string[] {
  const idempotency = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+idempotent\s+by\s+(?<key>.+?)\.?$/i,
  );
  const deduplicated = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+deduplicated\s+to\s+prevent\s+redundant\s+requests\s+during\s+(?<key>.+?)\.?$/i,
  );
  return [
    slug(
      idempotency?.groups?.subject ??
        deduplicated?.groups?.subject ??
        "subject",
    ),
    slug(
      idempotency?.groups?.key ??
        deduplicated?.groups?.key ??
        "idempotency_key",
    ),
  ];
}

function inferDataResidencyRuleArgs(text: string): string[] {
  const residency = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:stored|processed|kept)\s+in\s+(?:the\s+)?(?<region>.+?\b(?:region|jurisdiction|country|zone|area))\.?$/i,
  );
  return [
    slug(residency?.groups?.subject ?? "data"),
    slug(residency?.groups?.region ?? "region"),
  ];
}

function inferAuditEventRuleArgs(text: string): string[] {
  const audit = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:recorded|logged|audited)\s+in\s+(?:the\s+)?(?<log>audit\s+(?:log|trail))\.?$/i,
  );
  return [
    slug(audit?.groups?.subject ?? "subject"),
    slug(audit?.groups?.log ?? "audit_log"),
  ];
}

function inferConsentRuleArgs(text: string): string[] {
  const consent = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+require\s+(?<consent>.+?consent)\s+before\s+(?<purpose>.+?)\.?$/i,
  );
  return [
    slug(consent?.groups?.subject ?? "subject"),
    slug(consent?.groups?.consent ?? "consent"),
    normalizePredicateToken(consent?.groups?.purpose ?? "purpose"),
  ];
}

function inferLifecycleRuleArgs(text: string): string[] {
  const lifecycle = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<action>archived|deleted|expired)\s+after\s+(?<duration>\d+)\s+(?<unit>[a-z]+)\.?$/i,
  );
  return [
    slug(lifecycle?.groups?.subject ?? "subject"),
    slug(lifecycle?.groups?.action ?? "action"),
    lifecycle?.groups?.duration ?? "0",
    slug(lifecycle?.groups?.unit ?? "unit"),
  ];
}

function inferConflictResolutionRuleArgs(text: string): string[] {
  const conflict = text.match(
    /^when\s+(?<subject>.+?)\s+conflicts?,\s+(?:the\s+)?(?<strategy>.+?)\.?$/i,
  );
  return [
    slug(conflict?.groups?.subject ?? "subject"),
    normalizePredicateToken(conflict?.groups?.strategy ?? "strategy"),
  ];
}

function inferFallbackRuleArgs(text: string): string[] {
  const fallback = text.match(
    /^if\s+(?<condition>.+?),\s+(?<subject>.+?)\s+(?:must|shall|should)\s+fall\s+back\s+to\s+(?<target>.+?)\.?$/i,
  );
  return [
    normalizePredicateToken(fallback?.groups?.condition ?? "condition"),
    slug(fallback?.groups?.subject ?? "subject"),
    normalizePredicateToken(fallback?.groups?.target ?? "fallback"),
  ];
}

function inferBatchOperationRuleArgs(text: string): string[] {
  const batch = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+process\s+(?<resource>.+?)\s+in\s+batches\s+of\s+(?<size>\d+)\.?$/i,
  );
  return [
    slug(batch?.groups?.subject ?? "subject"),
    slug(batch?.groups?.resource ?? "resource"),
    batch?.groups?.size ?? "0",
  ];
}

function inferConsistencyRuleArgs(text: string): string[] {
  const consistency = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+reference\s+(?<target>an?\s+existing\s+.+?)\.?$/i,
  );
  return [
    slug(consistency?.groups?.subject ?? "subject"),
    normalizePredicateToken(consistency?.groups?.target ?? "target"),
  ];
}

function inferBuildConstraintArgs(text: string): string[] {
  const build = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<property>deterministic)\s+at\s+(?<scope>build\s+time)\.?$/i,
  );
  return [
    slug(build?.groups?.subject ?? "subject"),
    normalizePredicateToken(build?.groups?.property ?? "property"),
    normalizePredicateToken(build?.groups?.scope ?? "build_time"),
  ];
}

function inferEnvironmentSafetyRuleArgs(text: string): string[] {
  const safety = text.match(
    /^(?<action>.+?)\s+(?:must|shall|should)\s+be\s+(?<decision>forbidden|read-only|allowed)\s+in\s+(?<environment>production|staging|development)\.?$/i,
  );
  return [
    slug(safety?.groups?.action ?? "action"),
    normalizePredicateToken(safety?.groups?.decision ?? "decision"),
    slug(safety?.groups?.environment ?? "environment"),
  ];
}

function inferSchemaInvariantRuleArgs(text: string): string[] {
  const invariant = text.match(
    /^(?<field>.+?)\s+(?:must|shall|should)\s+be\s+(?<kind>immutable)\s+after\s+(?<scope>.+?)\.?$/i,
  );
  return [
    slug(invariant?.groups?.field ?? "field"),
    normalizePredicateToken(invariant?.groups?.kind ?? "invariant"),
    normalizePredicateToken(
      invariant?.groups?.scope ? `after ${invariant.groups.scope}` : "scope",
    ),
  ];
}

function inferCodingStandardRuleArgs(text: string): string[] {
  const standard = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?<action>use|avoid)\s+(?<target>.+?)\.?$/i,
  );
  return [
    slug(standard?.groups?.subject ?? "subject"),
    normalizePredicateToken(standard?.groups?.action ?? "action"),
    normalizePredicateToken(standard?.groups?.target ?? "target"),
  ];
}

function inferMigrationBoundaryRuleArgs(text: string): string[] {
  const migration = text.match(
    /^(?<subject>.+?)\s+may\s+only\s+be\s+(?<action>read)\s+as\s+(?<scope>migration\s+input)(?:\s+by\s+.+?)?\.?$/i,
  );
  return [
    slug(migration?.groups?.subject ?? "legacy_input"),
    normalizePredicateToken(migration?.groups?.action ?? "action"),
    normalizePredicateToken(migration?.groups?.scope ?? "migration_input"),
  ];
}

function inferAbsenceRequirementArgs(text: string): string[] {
  const absence = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<state>absent|removed)\.?$/i,
  );
  const declarativeAbsence = text.match(/^no\s+(?<subject>.+?)\.?$/i);
  return [
    normalizePredicateToken(
      absence?.groups?.subject ??
        declarativeAbsence?.groups?.subject ??
        "subject",
    ),
    normalizePredicateToken(absence?.groups?.state ?? "absent"),
  ];
}

function inferOfflineBehaviorRuleArgs(text: string): string[] {
  const offline = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<behavior>non-blocking|resilient)\s+during\s+(?<condition>offline\s+conditions)\.?$/i,
  );
  return [
    slug(offline?.groups?.subject ?? "subject"),
    normalizePredicateToken(offline?.groups?.behavior ?? "behavior"),
    normalizePredicateToken(offline?.groups?.condition ?? "offline_conditions"),
  ];
}

function inferReleaseGateRuleArgs(text: string): string[] {
  const release = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+pass\s+(?<gate>.+?)\s+before\s+(?<target>.+?)\.?$/i,
  );
  return [
    slug(release?.groups?.subject ?? "builds"),
    normalizePredicateToken(release?.groups?.gate ?? "gate"),
    slug(release?.groups?.target ?? "target"),
  ];
}

function inferPlatformConsistencyRuleArgs(text: string): string[] {
  const platform = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+synchronize\s+across\s+(?<platforms>.+?)\.?$/i,
  );
  const platforms = (platform?.groups?.platforms ?? "platform")
    .split(/,|\band\b/i)
    .map((part) => slug(part.trim()))
    .filter((part) => part.length > 0)
    .join(",");
  return [slug(platform?.groups?.subject ?? "subject"), platforms];
}

function inferPreservationRuleArgs(text: string): string[] {
  const preservation = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+preserve\s+(?<preserved>.+?)\s+when\s+(?:the\s+)?(?<condition>.+?)\.?$/i,
  );
  return [
    slug(preservation?.groups?.subject ?? "subject"),
    slug(preservation?.groups?.preserved ?? "preserved"),
    normalizePredicateToken(preservation?.groups?.condition ?? "condition"),
  ];
}

function inferAbstractionBoundaryRuleArgs(text: string): string[] {
  const boundary = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+persisted\s+as\s+(?<contract>.+?)\.?$/i,
  );
  return [
    slug(boundary?.groups?.subject ?? "subject"),
    "persisted_as",
    normalizePredicateToken(boundary?.groups?.contract ?? "contract"),
  ];
}

function inferSecurityConfigurationRuleArgs(text: string): string[] {
  const config = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+have\s+explicit\s+(?<setting>[A-Za-z0-9_.-]+)\s+(?<value>[A-Za-z0-9_.-]+)\.?$/i,
  );
  return [
    slug(config?.groups?.subject ?? "subject"),
    slug(config?.groups?.setting ?? "setting"),
    slug(config?.groups?.value ?? "value"),
  ];
}

function inferOrderedStrategyRuleArgs(text: string): string[] {
  const ordered = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+use\s+(?<kind>.+?)\s+in\s+priority\s+order\s+(?<values>.+?)\.?$/i,
  );
  const values = (ordered?.groups?.values ?? "")
    .split(/,|>/)
    .map((value) => normalizePredicateToken(value))
    .filter((value) => value.length > 0)
    .join(",");
  return [
    slug(ordered?.groups?.subject ?? "subject"),
    slug(ordered?.groups?.kind ?? "strategy"),
    values || "ordered_values",
  ];
}

function inferRefreshPolicyRuleArgs(text: string): string[] {
  const refresh = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+automatically\s+refresh\s+(?<target>.+?)\s+without\s+requiring\s+manual\s+page\s+reload\.?$/i,
  );
  return [
    slug(refresh?.groups?.subject ?? "subject"),
    slug(refresh?.groups?.target ?? "target"),
    "automatic",
  ];
}

function inferScopedAuthorizationRuleArgs(text: string): string[] {
  const scoped = text.match(
    /^(?<actor>.+?)\s+(?:must|shall|should)\s+be\s+denied\s+(?<action>.+?)\.?$/i,
  );
  return [
    slug(scoped?.groups?.actor ?? "actor"),
    slug(scoped?.groups?.action ?? "action"),
    "deny",
  ];
}

function inferDocumentationStandardRuleArgs(text: string): string[] {
  const docs = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+documented\s+in\s+(?<artifact>.+?)\.?$/i,
  );
  return [
    slug(docs?.groups?.subject ?? "subject"),
    "documented_in",
    slug(docs?.groups?.artifact ?? "documentation"),
  ];
}

function inferWarmupPolicyRuleArgs(text: string): string[] {
  const warmup = text.match(
    /^(?:the\s+)?(?<subject>.+?)\s+(?:must|shall|should)\s+warm\s+up\s+on\s+(?<trigger>.+?)\.?$/i,
  );
  return [
    slug(warmup?.groups?.subject ?? "subject"),
    slug(warmup?.groups?.trigger ?? "trigger"),
  ];
}

function inferVisualLayoutRuleArgs(text: string): string[] {
  const layout = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+remain\s+visually\s+aligned\s+with\s+(?<target>.+?)\.?$/i,
  );
  return [
    slug(layout?.groups?.subject ?? "subject"),
    "aligned_with",
    slug(layout?.groups?.target ?? "target"),
  ];
}

function inferEnforcementLocationRuleArgs(text: string): string[] {
  const enforcement = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+enforced\s+at\s+(?<location>.+?)\.?$/i,
  );
  return [
    slug(enforcement?.groups?.subject ?? "subject"),
    slug(enforcement?.groups?.location ?? "location"),
  ];
}

function inferReconciliationRuleArgs(text: string): string[] {
  const reconciliation = text.match(
    /^on\s+(?<trigger>.+?),\s*(?<subject>.+?)\s+(?:must|shall|should)\s+reconcile\s+(?<target>.+?)\s+and\s+(?<action>clear\s+stale\s+.+?)\.?$/i,
  );
  return [
    slug(reconciliation?.groups?.subject ?? "subject"),
    slug(reconciliation?.groups?.trigger ?? "trigger"),
    slug(reconciliation?.groups?.target ?? "target"),
    slug(reconciliation?.groups?.action ?? "action"),
  ];
}

function inferThrottlePolicyRuleArgs(text: string): string[] {
  const throttle = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+throttled\s+for\s+(?<condition>.+?)\.?$/i,
  );
  return [
    slug(throttle?.groups?.subject ?? "subject"),
    normalizePredicateToken(throttle?.groups?.condition ?? "condition"),
  ];
}

function inferDefaultValueArgs(text: string, subject: string): string[] {
  const defaultValue = text.match(
    /^(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+defaults?\s+to\s+(?<value>[a-z][a-z0-9\s_-]*?)(?:\s+(?<property>mode|state|status))?\.?$/i,
  );
  return [
    defaultValue?.groups?.subject
      ? normalizeSubjectKey(defaultValue.groups.subject)
      : subject,
    slug(defaultValue?.groups?.property ?? "value"),
    slug(defaultValue?.groups?.value ?? "value"),
  ];
}

function inferUniquenessArgs(text: string): string[] {
  const uniqueness = text.match(
    /^(?:there\s+)?(?:must|shall|should)\s+be\s+at\s+most\s+one\s+(?<subject>[a-z][a-z\s_-]*?)\s+per\s+(?<scope>.+?)\.?$/i,
  );
  const scope = (uniqueness?.groups?.scope ?? "scope")
    .split(/\s+per\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(normalizePredicateToken)
    .join(",");
  return [slug(uniqueness?.groups?.subject ?? "subject"), scope];
}

function inferStateMembershipArgs(text: string, subject: string): string[] {
  const stateMembership = text.match(
    /^(?<subject>.+?)\s+(?:terminal\s+)?states\s+are\s+(?<states>.+?)\.?$/i,
  );
  const states = (stateMembership?.groups?.states ?? "state")
    .split(/,|\band\b|\bor\b/i)
    .map((state) => state.trim())
    .filter((state) => state.length > 0)
    .map(normalizePredicateToken)
    .join(",");
  return [
    stateMembership?.groups?.subject
      ? normalizeSubjectKey(stateMembership.groups.subject)
      : subject,
    states,
  ];
}

function inferTemporalOrderArgs(text: string, subject: string): string[] {
  const initializesAfter = text.match(
    /^(?:the\s+)?(?<subject>.+?)\s+initializes\s+after\s+(?:the\s+)?(?<ready>.+?)\s+is\s+ready\.?$/i,
  );
  if (initializesAfter?.groups?.subject && initializesAfter.groups.ready) {
    return [
      slug(initializesAfter.groups.subject),
      `${slug(initializesAfter.groups.ready)}_ready`,
      "initializes",
    ];
  }

  const temporal = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<before>[a-z][a-z\s_-]*?)\s+before\s+(?<after>.+?)\.?$/i,
  );
  return [
    temporal?.groups?.subject
      ? slug(temporal.groups.subject).replace(/_/g, ".")
      : subject,
    normalizePredicateToken(temporal?.groups?.before ?? "before_event"),
    normalizePredicateToken(temporal?.groups?.after ?? "after_event"),
  ];
}

function inferConditionalBehaviorArgs(text: string, subject: string): string[] {
  const whenMust = text.match(
    /^when\s+(?<condition>.+?),\s*(?:the\s+)?(?<subject>.+?)\s+(?:must|shall|should)\s+(?<behavior>.+?)\.?$/i,
  );
  if (whenMust?.groups?.condition && whenMust.groups.subject) {
    return [
      slug(whenMust.groups.subject),
      normalizePredicateToken(whenMust.groups.condition),
      normalizePredicateToken(whenMust.groups.behavior ?? "behavior"),
    ];
  }

  const conditional = text.match(
    /^if\s+(?:(?:a|an|the)\s+)?(?<conditionSubject>[a-z][a-z_-]*)\s+(?<condition>.+?),\s*(?:it|they|the\s+[a-z][a-z\s_-]*?)\s+(?<behavior>.+?)\.?$/i,
  );
  return [
    conditional?.groups?.conditionSubject
      ? singularize(slug(conditional.groups.conditionSubject))
      : subject,
    normalizePredicateToken(conditional?.groups?.condition ?? "condition"),
    normalizePredicateToken(conditional?.groups?.behavior ?? "behavior"),
  ];
}

function inferStateTransitionArgs(text: string, subject: string): string[] {
  const transition = text.match(
    /^when\s+(?<trigger>.+?),\s*(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+transitions?\s+from\s+(?<from>[a-z][a-z0-9_-]*)\s+to\s+(?<to>[a-z][a-z0-9_-]*)\.?$/i,
  );
  return [
    transition?.groups?.subject
      ? normalizeSubjectKey(transition.groups.subject)
      : subject,
    normalizePredicateToken(transition?.groups?.from ?? "from_state"),
    normalizePredicateToken(transition?.groups?.to ?? "to_state"),
    normalizePredicateToken(transition?.groups?.trigger ?? inferTrigger(text)),
  ];
}

function inferRateLimitArgs(text: string): string[] {
  const rateLimit = text.match(
    /^(?<subject>.+?)\s+must\s+be\s+rate\s+limited\s+to\s+(?<count>\d+)\s+(?<action>[a-z][a-z\s_-]*?)\s+per\s+(?<window>[a-z]+)\.?$/i,
  );
  const subject = rateLimit?.groups?.subject
    ? slug(rateLimit.groups.subject).replace(/_requests?$/, ".request")
    : "requirement.subject";
  return [
    subject,
    normalizePredicateToken(rateLimit?.groups?.action ?? "action"),
    normalizePredicateToken(rateLimit?.groups?.window ?? "window"),
    rateLimit?.groups?.count ?? "0",
  ];
}

function inferDuration(text: string): string {
  return text.match(/\b\d+\b/)?.[0] ?? "1";
}

function inferDurationUnit(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("year")) return "years";
  if (lower.includes("month")) return "months";
  if (lower.includes("day")) return "days";
  return "unit";
}

function inferResource(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("latency")) return "latency";
  if (lower.includes("timeout")) return "timeout";
  if (lower.includes("size")) return "size";
  return "resource";
}

function inferOperator(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("minimum") || lower.includes("at least")) return "gte";
  if (
    lower.includes("not exceed") ||
    lower.includes("not be more than") ||
    lower.includes("no more than") ||
    lower.includes("at most") ||
    lower.includes("maximum")
  ) {
    return "lte";
  }
  if (lower.includes("not")) return "neq";
  return "lte";
}

function inferNumber(text: string): string {
  return text.match(/\b\d+(?:\.\d+)?\b/)?.[0] ?? "0";
}

function inferUnit(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("ms")) return "ms";
  if (lower.includes("seconds")) return "seconds";
  if (lower.includes("mb")) return "mb";
  return "unit";
}

function inferGate(text: string): string {
  const quoted = text.match(/[`'"](?<gate>[A-Za-z0-9_.:-]+)[`'"]/)?.groups
    ?.gate;
  return quoted ?? "feature_gate";
}

function inferEvent(text: string): string {
  const eventName = text.match(/\b[A-Z][A-Za-z0-9]+Event\b/)?.[0];
  return eventName ?? "domain_event";
}

function scoreSchema(schema: PredicateSchemaCandidate, text: string): number {
  const lower = text.toLowerCase();
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
  const keywordHits = schema.keywords.filter((keyword) =>
    matchesKeyword(text, lower, keyword),
  ).length;
  if (keywordHits === 0) return 0;

  const normalized = keywordHits / Math.max(3, schema.keywords.length / 2);
  const score = Math.min(0.98, 0.24 + normalized * 0.5 + keywordHits * 0.06);
  return Math.round(score * 100) / 100;
}

function schemaForCandidate(schema: PredicateSchemaCandidate): Omit<
  PredicateSchemaCandidate,
  "keywords"
> & {
  usage_hints: PredicateUsageHints;
} {
  return {
    id: schema.id,
    predicate_name: schema.predicate_name,
    title: schema.title,
    description: schema.description,
    argument_names: schema.argument_names,
    argument_types: schema.argument_types,
    examples: schema.examples,
    tags: schema.tags,
    usage_hints:
      schema.usage_hints ??
      USAGE_HINTS_BY_PREDICATE[schema.predicate_name] ??
      DEFAULT_USAGE_HINTS,
  };
}

async function loadExistingPredicateSchemas(
  prolog: PrologProcess | null,
  includeExistingSchemas: boolean,
  warnings: string[],
): Promise<PredicateSchemaCandidate[]> {
  if (!includeExistingSchemas || prolog === null) {
    return [];
  }

  try {
    const queryResult = await prolog.query(
      "findall([Id,'fact',Props], (kb_entity(Id, 'fact', Props), member(fact_kind=predicate_schema, Props)), Results)",
    );
    if (!queryResult.success) {
      throw new Error(queryResult.error || "Query failed with unknown error");
    }

    const facts = queryResult.bindings.Results
      ? parseListOfLists(queryResult.bindings.Results).map(parseEntityFromList)
      : [];
    return facts.flatMap((fact) => predicateSchemaFromEntity(fact));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(
      `Existing predicate_schema facts could not be loaded: ${message}`,
    );
    return [];
  }
}

function predicateSchemaFromEntity(
  entity: Record<string, unknown>,
): PredicateSchemaCandidate[] {
  if (entity.fact_kind !== "predicate_schema") return [];
  const predicateName = normalizeOptionalString(
    typeof entity.predicate_name === "string"
      ? entity.predicate_name
      : undefined,
  );
  if (!predicateName) return [];
  const usageHints = usageHintsFromEntity(entity);

  return [
    {
      id: String(entity.id ?? hashId("FACT-SCHEMA", [predicateName])),
      predicate_name: predicateName,
      title: String(entity.title ?? predicateName),
      description: String(
        entity.description ??
          `Project-local ${predicateName} predicate schema.`,
      ),
      argument_names: stringArray(entity.argument_names),
      argument_types: stringArray(entity.argument_types),
      keywords: [
        predicateName,
        ...stringArray(entity.aliases),
        ...stringArray(entity.tags),
      ],
      examples: stringArray(entity.examples),
      tags: stringArray(entity.tags),
      ...(usageHints ? { usage_hints: usageHints } : {}),
    },
  ];
}

function usageHintsFromEntity(
  entity: Record<string, unknown>,
): PredicateUsageHints | undefined {
  const useWhen = stringArray(entity.use_when);
  const doNotUseWhen = stringArray(entity.do_not_use_when);
  if (useWhen.length === 0 || doNotUseWhen.length === 0) {
    return undefined;
  }
  return { use_when: useWhen, do_not_use_when: doNotUseWhen };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const normalized = normalizeOptionalString(
      typeof item === "string" ? item : undefined,
    );
    return normalized ? [normalized] : [];
  });
}

function buildSuggestion(
  schema: PredicateSchemaCandidate,
  text: string,
  subject: string,
  score: number,
): PredicateSuggestion {
  const predicateArgs = inferArgs(schema, text, subject);
  const canonicalKey = `${schema.predicate_name}(${predicateArgs.join(",")})`;
  return {
    id: hashId("SUGGEST", [schema.id, canonicalKey, text]),
    predicate_name: schema.predicate_name,
    predicate_args: predicateArgs,
    canonical_key: canonicalKey,
    polarity: "assert",
    score,
    rationale: `Matched ${schema.predicate_name} because the prose overlaps with ${schema.tags.join(", ")} cues.`,
    schema: schemaForCandidate(schema),
  };
}

function buildPredicateApplyPlan(
  suggestion: PredicateSuggestion,
  args: SuggestPredicatesArgs,
): Array<Record<string, unknown>> {
  const factId = hashId("FACT-PRED", [
    args.requirementId ?? "",
    args.source ?? "",
    suggestion.canonical_key,
  ]);
  return [
    {
      type: "fact",
      id: factId,
      properties: {
        title: `Predicate: ${suggestion.canonical_key}`,
        status: "active",
        source: args.source ?? "mcp://kibi/suggest-predicates",
        text_ref: args.source,
        tags: [
          "lane:ontology",
          "predicate-suggestion",
          ...suggestion.schema.tags.map((tag) => `predicate:${tag}`),
        ],
        fact_kind: "predicate",
        predicate_name: suggestion.predicate_name,
        predicate_args: suggestion.predicate_args,
        canonical_key: suggestion.canonical_key,
        polarity: suggestion.polarity,
      },
      relationships: [],
    },
  ];
}

function buildRelationshipPlan(
  factId: string | undefined,
  requirementId: string | undefined,
): Record<string, unknown> | null {
  if (!factId || !requirementId) return null;
  return {
    applyAfter: factId,
    requiresExistingReq: requirementId,
    relationship: {
      type: "requires_predicate",
      from: requirementId,
      to: factId,
    },
    instructions:
      "Apply the predicate fact first, then attach this relationship from the existing requirement without overwriting requirement metadata.",
  };
}

function buildGapApplyPlan(
  text: string,
  args: SuggestPredicatesArgs,
): Array<Record<string, unknown>> {
  const factId = hashId("FACT-ONTOLOGY-GAP", [
    args.requirementId ?? "",
    args.source ?? "",
    text,
  ]);
  return [
    {
      type: "fact",
      id: factId,
      properties: {
        title: "Ontology gap: predicate schema needed",
        status: "active",
        source: args.source ?? "mcp://kibi/suggest-predicates",
        text_ref: args.source,
        tags: ["review:ontology-gap", "needs_schema_extension"],
        fact_kind: "observation",
        value_string: text,
      },
      relationships: [],
    },
  ];
}

// implements REQ-mcp-suggest-predicates
export async function handleKbSuggestPredicates(
  prolog: PrologProcess | null,
  args: SuggestPredicatesArgs,
): Promise<SuggestPredicatesResult> {
  const text = normalizeText(args.text);
  const maxCandidates = clampInteger(
    args.maxCandidates,
    DEFAULT_MAX_CANDIDATES,
    1,
    20,
  );
  const minScore = clampScore(args.minScore);
  const warnings: string[] = [];
  const subject = inferSubject(text, args.subjectHint);
  const existingSchemas = await loadExistingPredicateSchemas(
    prolog,
    args.includeExistingSchemas ?? true,
    warnings,
  );
  const schemas = [...existingSchemas, ...BUILT_IN_PREDICATE_SCHEMAS];
  const candidates = schemas
    .map((schema) => ({ schema, score: scoreSchema(schema, text) }))
    .filter((scored) => scored.score >= minScore)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.schema.predicate_name.localeCompare(
        right.schema.predicate_name,
      );
    })
    .slice(0, maxCandidates)
    .map((scored) =>
      buildSuggestion(scored.schema, text, subject, scored.score),
    );
  if (candidates.length === 0) {
    warnings.push(
      "No predicate candidate met minScore. If this is recurring domain language, create a fact_kind=predicate_schema fact; otherwise keep the generated review:ontology-gap observation. Do not invent unsupported predicate names without a predicate_schema.",
    );
  }

  const recommendedAction =
    candidates.length > 0 ? "apply_requires_predicate" : "record_ontology_gap";
  const firstCandidate = candidates[0];
  const applyPlan = firstCandidate
    ? buildPredicateApplyPlan(firstCandidate, args)
    : buildGapApplyPlan(text, args);
  const relationshipPlan = firstCandidate
    ? buildRelationshipPlan(String(applyPlan[0]?.id ?? ""), args.requirementId)
    : null;
  const textSummary =
    candidates.length > 0
      ? `Suggested ${candidates.length} predicate candidate(s). Top match: ${candidates[0]?.predicate_name}. Apply structured predicate facts before falling back to prose.`
      : "No predicate candidate met the confidence threshold; record an ontology gap instead of silently writing prose.";

  return {
    content: [{ type: "text", text: textSummary }],
    structuredContent: {
      text,
      source: args.source ?? null,
      requirementId: args.requirementId ?? null,
      subject,
      candidates,
      recommendedAction,
      applyPlan,
      relationshipPlan,
      warnings,
    },
    applyPlan,
  };
}
