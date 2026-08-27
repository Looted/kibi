import type { ProseCoverageCase } from "kibi-cli/operations/semantic-advisor/prose-coverage-evaluator";

export const PROSE_COVERAGE_CORPUS: ProseCoverageCase[] = [
  {
    id: "dogfood-project-a-annotation-timekey-slot-precision",
    source: "/tmp/dogfood-project-a/docs/requirements/annotation-timekey.md",
    text: "Raw browser currentTime values must normalize into canonical integer decisecond timeKey values.",
    expected: {
      kind: "strict_property",
      property_key: "slot_precision",
      operator: "eq",
    },
  },
  {
    id: "dogfood-project-a-annotation-timekey-merge-policy",
    source:
      "/tmp/dogfood-project-a/docs/facts/FACT-ANNOTATION-TIMEKEY-MERGE-POLICY.md",
    text: "Drawing, text, and voice data saved in the same tenth-second slot must merge into one annotation instead of creating multiple selectable annotations.",
    expected: {
      kind: "predicate",
      predicate_name: "merge_policy",
    },
  },
  {
    id: "strict-cardinality-active-sessions",
    text: "Users may have at most two active sessions.",
    expected: {
      kind: "strict_property",
      property_key: "active_count",
      operator: "lte",
    },
  },
  {
    id: "predicate-permission-deny-export",
    text: "Users must not export customer data.",
    expected: {
      kind: "predicate",
      predicate_name: "permission_rule",
    },
  },
  {
    id: "predicate-default-mode",
    text: "The annotation tool defaults to move mode.",
    expected: {
      kind: "predicate",
      predicate_name: "default_value",
    },
  },
  {
    id: "predicate-exception-unless",
    text: "The notification service must send email unless the user has opted out.",
    expected: {
      kind: "predicate",
      predicate_name: "exception_rule",
    },
  },
  {
    id: "predicate-mutual-exclusion",
    text: "Practice mode and exam mode must be mutually exclusive.",
    expected: {
      kind: "predicate",
      predicate_name: "mutual_exclusion",
    },
  },
  {
    id: "predicate-rate-limit",
    text: "Password reset requests must be rate limited to 5 attempts per hour.",
    expected: {
      kind: "predicate",
      predicate_name: "rate_limit",
    },
  },
  {
    id: "predicate-dependency-prerequisite",
    text: "Checkout requires payment authorization before order submission.",
    expected: {
      kind: "predicate",
      predicate_name: "dependency_rule",
    },
  },
  {
    id: "predicate-ownership-assignment",
    text: "Account settings are owned by the profile service.",
    expected: {
      kind: "predicate",
      predicate_name: "ownership_rule",
    },
  },
  {
    id: "predicate-retry-policy",
    text: "Failed webhook delivery must retry up to 3 times.",
    expected: {
      kind: "predicate",
      predicate_name: "retry_policy",
    },
  },
  {
    id: "predicate-escalation-rule",
    text: "Failed payment disputes must escalate to support after 48 hours.",
    expected: {
      kind: "predicate",
      predicate_name: "escalation_rule",
    },
  },
  {
    id: "predicate-availability-sla",
    text: "Checkout API availability must be at least 99.9 percent monthly.",
    expected: {
      kind: "predicate",
      predicate_name: "availability_sla",
    },
  },
  {
    id: "predicate-notification-route",
    text: "Fraud alerts must notify risk operations by email.",
    expected: {
      kind: "predicate",
      predicate_name: "notification_route",
    },
  },
  {
    id: "predicate-idempotency-rule",
    text: "Payment capture requests must be idempotent by idempotency key.",
    expected: {
      kind: "predicate",
      predicate_name: "idempotency_rule",
    },
  },
  {
    id: "predicate-data-residency-rule",
    text: "EU customer data must be stored in the EU region.",
    expected: {
      kind: "predicate",
      predicate_name: "data_residency_rule",
    },
  },
  {
    id: "predicate-audit-event-rule",
    text: "Admin access changes must be recorded in the audit log.",
    expected: {
      kind: "predicate",
      predicate_name: "audit_event_rule",
    },
  },
  {
    id: "predicate-consent-rule",
    text: "Marketing emails must require user consent before processing.",
    expected: {
      kind: "predicate",
      predicate_name: "consent_rule",
    },
  },
  {
    id: "predicate-lifecycle-rule",
    text: "Expired sessions must be archived after 30 days.",
    expected: {
      kind: "predicate",
      predicate_name: "lifecycle_rule",
    },
  },
  {
    id: "predicate-conflict-resolution-rule",
    text: "When profile updates conflict, the latest write wins.",
    expected: {
      kind: "predicate",
      predicate_name: "conflict_resolution_rule",
    },
  },
  {
    id: "predicate-fallback-rule",
    text: "If the payment provider is unavailable, checkout must fall back to manual review.",
    expected: {
      kind: "predicate",
      predicate_name: "fallback_rule",
    },
  },
  {
    id: "predicate-batch-operation-rule",
    text: "Invoice exports must process records in batches of 500.",
    expected: {
      kind: "predicate",
      predicate_name: "batch_operation_rule",
    },
  },
  {
    id: "predicate-consistency-rule",
    text: "Order items must reference an existing order.",
    expected: {
      kind: "predicate",
      predicate_name: "consistency_rule",
    },
  },
  {
    id: "predicate-build-constraint",
    text: "Share manifest generation must be deterministic at build time.",
    expected: { kind: "predicate", predicate_name: "build_constraint" },
  },
  {
    id: "predicate-environment-safety-rule",
    text: "Destructive operations must be forbidden in production.",
    expected: { kind: "predicate", predicate_name: "environment_safety_rule" },
  },
  {
    id: "predicate-schema-invariant-rule",
    text: "User email must be immutable after creation.",
    expected: { kind: "predicate", predicate_name: "schema_invariant_rule" },
  },
  {
    id: "predicate-coding-standard-rule",
    text: "Derived state must use computed signals.",
    expected: { kind: "predicate", predicate_name: "coding_standard_rule" },
  },
  {
    id: "predicate-migration-boundary-rule",
    text: "Legacy fabricData may only be read as migration input.",
    expected: { kind: "predicate", predicate_name: "migration_boundary_rule" },
  },
  {
    id: "predicate-absence-requirement",
    text: "The pg_graphql extension must be absent.",
    expected: { kind: "predicate", predicate_name: "absence_requirement" },
  },
  {
    id: "predicate-offline-behavior-rule",
    text: "Cloud synchronization must be non-blocking during offline conditions.",
    expected: { kind: "predicate", predicate_name: "offline_behavior_rule" },
  },
  {
    id: "predicate-release-gate-rule",
    text: "iOS builds must pass configuration gates before TestFlight distribution.",
    expected: { kind: "predicate", predicate_name: "release_gate_rule" },
  },
  {
    id: "predicate-platform-consistency-rule",
    text: "Premium status must synchronize across iOS, Android, and Web.",
    expected: {
      kind: "predicate",
      predicate_name: "platform_consistency_rule",
    },
  },
  {
    id: "predicate-preservation-rule",
    text: "Soft deletion must preserve annotations when the video is removed.",
    expected: { kind: "predicate", predicate_name: "preservation_rule" },
  },
  {
    id: "strict-cap-at-level",
    text: "Review non-writing rounds cap at level 4.",
    expected: {
      kind: "strict_property",
      property_key: "level_cap",
      operator: "lte",
    },
  },
  {
    id: "predicate-no-declarative-absence",
    text: "No user identity on public pages.",
    expected: { kind: "predicate", predicate_name: "absence_requirement" },
  },
  {
    id: "predicate-disabled-until-guard",
    text: "Analytics and Sentry must stay disabled until users grant consent.",
    expected: { kind: "predicate", predicate_name: "guard" },
  },
  {
    id: "predicate-when-subject-must-conditional",
    text: "When returned email already exists, the system must prevent silent account duplication.",
    expected: { kind: "predicate", predicate_name: "conditional_behavior" },
  },
  {
    id: "predicate-deduplicated-idempotency",
    text: "Profile fetching must be deduplicated to prevent redundant requests during concurrent auth state changes.",
    expected: { kind: "predicate", predicate_name: "idempotency_rule" },
  },
  {
    id: "predicate-abstraction-boundary-rule",
    text: "Annotation drawing data must be persisted as a renderer-neutral scene contract.",
    expected: {
      kind: "predicate",
      predicate_name: "abstraction_boundary_rule",
    },
  },
  {
    id: "predicate-security-configuration-rule",
    text: "Trigger functions must have explicit search_path public.",
    expected: {
      kind: "predicate",
      predicate_name: "security_configuration_rule",
    },
  },
  {
    id: "predicate-ordered-strategy-rule",
    text: "POMs must use selector strategies in priority order data-testid, visible, text.",
    expected: { kind: "predicate", predicate_name: "ordered_strategy_rule" },
  },
  {
    id: "predicate-refresh-policy-rule",
    text: "Dashboard must automatically refresh processing videos without requiring manual page reload.",
    expected: { kind: "predicate", predicate_name: "refresh_policy_rule" },
  },
  {
    id: "predicate-scoped-authorization-rule",
    text: "Unassigned instructors must be denied signed URL generation.",
    expected: {
      kind: "predicate",
      predicate_name: "scoped_authorization_rule",
    },
  },
  {
    id: "predicate-migration-boundary-with-mapper",
    text: "Legacy fabricData may only be read as migration input by the annotation scene mapper.",
    expected: { kind: "predicate", predicate_name: "migration_boundary_rule" },
  },
  {
    id: "predicate-coding-standard-avoid-api",
    text: "Reactivity must avoid manual change detection APIs.",
    expected: { kind: "predicate", predicate_name: "coding_standard_rule" },
  },
  {
    id: "predicate-documentation-standard-rule",
    text: "Code symbols must be documented in docs/symbols.yaml.",
    expected: {
      kind: "predicate",
      predicate_name: "documentation_standard_rule",
    },
  },
  {
    id: "predicate-warmup-policy-rule",
    text: "The editor video must warm up on entry.",
    expected: { kind: "predicate", predicate_name: "warmup_policy_rule" },
  },
  {
    id: "predicate-visual-layout-rule",
    text: "Processing video cards must remain visually aligned with ready cards.",
    expected: { kind: "predicate", predicate_name: "visual_layout_rule" },
  },
  {
    id: "predicate-enforcement-location-rule",
    text: "Foreign key constraints must be enforced at database level.",
    expected: {
      kind: "predicate",
      predicate_name: "enforcement_location_rule",
    },
  },
  {
    id: "predicate-reconciliation-rule",
    text: "On login, system must reconcile analysis notifications and clear stale notifications.",
    expected: { kind: "predicate", predicate_name: "reconciliation_rule" },
  },
  {
    id: "predicate-initializes-after-temporal-order",
    text: "The configured canvas provider initializes after the video layout is ready.",
    expected: { kind: "predicate", predicate_name: "temporal_order" },
  },
  {
    id: "predicate-throttle-policy-rule",
    text: "Event handlers must be throttled for high-frequency operations.",
    expected: { kind: "predicate", predicate_name: "throttle_policy_rule" },
  },
  {
    id: "cursor-launcher-dependency-resolution",
    text: "The published kibi-cursor plugin must resolve and execute the consumer project's project-local kibi-mcp package without downloading packages or using a global or plugin-local runtime",
    expected: {
      kind: "predicate",
      predicate_name: "dependency_resolution_policy",
    },
  },
  {
    id: "cursor-launcher-ordered-resolution",
    text: "It must resolve the consumer workspace in deterministic order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd demonstrably contains project-local kibi-mcp",
    expected: {
      kind: "predicate",
      predicate_name: "ordered_resolution_strategy",
    },
  },
  {
    id: "cursor-launcher-resolution-failure",
    text: "unresolved placeholders are invalid and ambiguous multiple usable roots fail clearly",
    expected: {
      kind: "predicate",
      predicate_name: "resolution_failure_policy",
    },
  },
  {
    id: "cursor-launcher-package-manager-exception",
    text: "The launcher must resolve kibi-mcp through consumer-scoped Node package semantics including exports-restricted and pnpm-style layouts, and reject packages outside consumer scope unless active package-manager semantics authorize it",
    expected: { kind: "predicate", predicate_name: "exception_rule" },
  },
  {
    id: "cursor-launcher-process-contract",
    text: "It must spawn the declared kibi-mcp bin with cwd and KIBI_WORKSPACE set to the consumer workspace, preserve stdio, and propagate child exit codes and termination signals",
    expected: {
      kind: "predicate",
      predicate_name: "process_delegation_contract",
    },
  },
  {
    id: "cursor-launcher-missing-dependency",
    text: "Missing project-local kibi-mcp must produce a concise actionable error",
    expected: { kind: "predicate", predicate_name: "failure_behavior" },
  },
];
