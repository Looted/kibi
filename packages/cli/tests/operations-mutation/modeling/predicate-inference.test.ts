import { describe, expect, test } from "bun:test";
import * as one from "../../../src/operations/modeling/predicate-inference-1.js";
import * as two from "../../../src/operations/modeling/predicate-inference-2.js";
import * as three from "../../../src/operations/modeling/predicate-inference-3.js";
import { inferArgs } from "../../../src/operations/modeling/predicate-inference.js";
import type { PredicateSchemaCandidate } from "../../../src/operations/modeling/predicate-types.js";

const schema = (predicate_name: string, argument_names: string[] = []) =>
  ({ predicate_name, argument_names }) as unknown as PredicateSchemaCandidate;
const infer = (name: string, text: string, argumentNames?: string[]) =>
  inferArgs(schema(name, argumentNames), text, "subj");

type Delegate = (text: string, subject: string) => string[];

// Each schema whose arguments come from a dedicated inference function, with
// a sentence that function reads in full.
const DELEGATES: [string, Delegate, string][] = [
  [
    "guard",
    one.inferGuardArgs,
    "Save must stay disabled until the form is valid.",
  ],
  [
    "exception_rule",
    one.inferExceptionRuleArgs,
    "Exports must be signed unless the build is local.",
  ],
  [
    "mutual_exclusion",
    one.inferMutualExclusionArgs,
    "Dark mode and contrast must be mutually exclusive.",
  ],
  [
    "dependency_rule",
    one.inferDependencyRuleArgs,
    "Deploy requires approval before release.",
  ],
  [
    "ownership_rule",
    one.inferOwnershipRuleArgs,
    "Billing is owned by finance.",
  ],
  [
    "retry_policy",
    one.inferRetryPolicyArgs,
    "Uploads must retry up to 3 times.",
  ],
  [
    "escalation_rule",
    one.inferEscalationRuleArgs,
    "Incidents must escalate to on-call after 30 minutes.",
  ],
  [
    "availability_sla",
    one.inferAvailabilitySlaArgs,
    "The API availability must be at least 99.9 percent monthly.",
  ],
  [
    "notification_route",
    one.inferNotificationRouteArgs,
    "The scheduler must notify admins by email.",
  ],
  [
    "idempotency_rule",
    one.inferIdempotencyRuleArgs,
    "Payments must be idempotent by request key.",
  ],
  [
    "data_residency_rule",
    one.inferDataResidencyRuleArgs,
    "Data must be stored in the EU region.",
  ],
  [
    "audit_event_rule",
    one.inferAuditEventRuleArgs,
    "Logins must be recorded in the audit log.",
  ],
  [
    "consent_rule",
    one.inferConsentRuleArgs,
    "Tracking must require consent before collection.",
  ],
  [
    "lifecycle_rule",
    one.inferLifecycleRuleArgs,
    "Logs must be archived after 90 days.",
  ],
  [
    "conflict_resolution_rule",
    two.inferConflictResolutionRuleArgs,
    "When edits conflict, the server wins.",
  ],
  [
    "fallback_rule",
    two.inferFallbackRuleArgs,
    "If the CDN fails, clients must fall back to origin.",
  ],
  [
    "batch_operation_rule",
    two.inferBatchOperationRuleArgs,
    "The importer must process rows in batches of 500.",
  ],
  [
    "consistency_rule",
    two.inferConsistencyRuleArgs,
    "Orders must reference an existing customer.",
  ],
  [
    "build_constraint",
    two.inferBuildConstraintArgs,
    "Bundles must be deterministic at build time.",
  ],
  [
    "environment_safety_rule",
    two.inferEnvironmentSafetyRuleArgs,
    "Debug endpoints must be forbidden in production.",
  ],
  [
    "schema_invariant_rule",
    two.inferSchemaInvariantRuleArgs,
    "Events must be immutable after publication.",
  ],
  [
    "coding_standard_rule",
    two.inferCodingStandardRuleArgs,
    "Components must use typed props.",
  ],
  [
    "migration_boundary_rule",
    two.inferMigrationBoundaryRuleArgs,
    "Legacy tables may only be read as migration input.",
  ],
  [
    "absence_requirement",
    two.inferAbsenceRequirementArgs,
    "Debug logging must be absent.",
  ],
  [
    "offline_behavior_rule",
    two.inferOfflineBehaviorRuleArgs,
    "Sync must be resilient during offline conditions.",
  ],
  [
    "release_gate_rule",
    two.inferReleaseGateRuleArgs,
    "Builds must pass review before release.",
  ],
  [
    "platform_consistency_rule",
    two.inferPlatformConsistencyRuleArgs,
    "Settings must synchronize across ios and web.",
  ],
  [
    "preservation_rule",
    two.inferPreservationRuleArgs,
    "Editors must preserve cursor position when reloading.",
  ],
  [
    "abstraction_boundary_rule",
    two.inferAbstractionBoundaryRuleArgs,
    "Diagrams must be persisted as neutral json.",
  ],
  [
    "security_configuration_rule",
    two.inferSecurityConfigurationRuleArgs,
    "Functions must have explicit search_path settings.",
  ],
  [
    "ordered_strategy_rule",
    two.inferOrderedStrategyRuleArgs,
    "Resolvers must use mirrors in priority order local, remote.",
  ],
  [
    "refresh_policy_rule",
    two.inferRefreshPolicyRuleArgs,
    "Dashboards must automatically refresh metrics without requiring manual page reload.",
  ],
  [
    "scoped_authorization_rule",
    three.inferScopedAuthorizationRuleArgs,
    "Unassigned users must be denied edit access.",
  ],
  [
    "documentation_standard_rule",
    three.inferDocumentationStandardRuleArgs,
    "Public APIs must be documented in the handbook.",
  ],
  [
    "warmup_policy_rule",
    three.inferWarmupPolicyRuleArgs,
    "The cache must warm up on startup.",
  ],
  [
    "visual_layout_rule",
    three.inferVisualLayoutRuleArgs,
    "The toolbar must remain visually aligned with the canvas.",
  ],
  [
    "enforcement_location_rule",
    three.inferEnforcementLocationRuleArgs,
    "Limits must be enforced at the gateway.",
  ],
  [
    "reconciliation_rule",
    three.inferReconciliationRuleArgs,
    "On reconnect, the client must reconcile drafts and clear stale caches.",
  ],
  [
    "throttle_policy_rule",
    three.inferThrottlePolicyRuleArgs,
    "Uploads must be throttled for free users.",
  ],
  ["permission_rule", one.inferPermissionRuleArgs, "Admins can delete posts."],
  [
    "default_value",
    three.inferDefaultValueArgs,
    "The theme defaults to dark mode.",
  ],
  [
    "uniqueness_constraint",
    three.inferUniquenessArgs,
    "There must be at most one owner per project.",
  ],
  [
    "state_membership",
    three.inferStateMembershipArgs,
    "Order states are open or closed.",
  ],
  [
    "temporal_order",
    three.inferTemporalOrderArgs,
    "The renderer initializes after the store is ready.",
  ],
  [
    "conditional_behavior",
    three.inferConditionalBehaviorArgs,
    "When the cache expires, the service must refresh tokens.",
  ],
  [
    "state_transition",
    three.inferStateTransitionArgs,
    "When saving, the editor transitions from draft to saved.",
  ],
  [
    "rate_limit",
    three.inferRateLimitArgs,
    "API requests must be rate limited to 100 calls per minute.",
  ],
];

describe("inferArgs", () => {
  for (const [name, delegate, text] of DELEGATES) {
    test(`${name} uses its inference function`, () => {
      const expected = delegate(text, "subj");
      expect(expected.length).toBeGreaterThan(0);
      expect(infer(name, text)).toStrictEqual(expected);
    });
  }

  test("exact launcher sentences take the reviewed bindings first", () => {
    expect(
      infer(
        "dependency_resolution_policy",
        "The VS Code extension must resolve and execute the kibi CLI without downloading packages or using a global or plugin-local runtime.",
        ["subject"],
      ),
    ).toStrictEqual([
      "the_vs_code_extension",
      "kibi_CLI",
      "consumer_local",
      "no_download",
    ]);
  });

  test("state and transition read idle and edit cues", () => {
    expect(infer("state", "Goes IDLE.")).toStrictEqual(["subj", "idle"]);
    expect(infer("state", "Runs.")).toStrictEqual(["subj", "active"]);
    expect(infer("transition", "Edit then idle on submit.")).toStrictEqual([
      "subj",
      "edit",
      "idle",
      "submit",
    ]);
    expect(infer("transition", "Moves.")).toStrictEqual([
      "subj",
      "draft",
      "active",
      "unspecified_trigger",
    ]);
  });

  test("unsaved changes, commit and discard", () => {
    expect(
      infer("has_unsaved_changes", "There are NO UNSAVED edits."),
    ).toStrictEqual(["subj", "false"]);
    expect(infer("has_unsaved_changes", "Unsaved edits.")).toStrictEqual([
      "subj",
      "true",
    ]);
    for (const name of ["commit_action", "discard_action"]) {
      expect(infer(name, "Cancel the draft.")).toStrictEqual([
        "subj",
        "cancel",
        "draft",
      ]);
    }
  });

  test("accessibility, retention and resource constraints", () => {
    expect(infer("accessibility_requirement", "Meet wcag AA.")).toStrictEqual([
      "subj",
      "WCAG",
      "required",
    ]);
    expect(infer("accessibility_requirement", "Be usable.")).toStrictEqual([
      "subj",
      "accessibility",
      "required",
    ]);
    expect(infer("retention_policy", "Keep for 30 days.")).toStrictEqual([
      "subj",
      "30",
      "days",
    ]);
    expect(
      infer("resource_constraint", "Latency must be at least 20 ms."),
    ).toStrictEqual(["subj", "latency", "gte", "20", "ms"]);
  });

  test("feature gates, events and acceptance rules", () => {
    expect(
      infer("feature_gate", "Behind 'beta' while DISABLED."),
    ).toStrictEqual(["subj", "beta", "false"]);
    expect(infer("feature_gate", "Behind a flag.")).toStrictEqual([
      "subj",
      "feature_gate",
      "true",
    ]);
    expect(infer("publishes_event", "Emits OrderPlacedEvent.")).toStrictEqual([
      "subj",
      "OrderPlacedEvent",
    ]);
    expect(infer("acceptance_rule", "Shows a toast!")).toStrictEqual([
      "subj",
      "shows_a_toast",
    ]);
    expect(infer("acceptance_rule", "x".repeat(70))).toStrictEqual([
      "subj",
      "x".repeat(64),
    ]);
    expect(infer("acceptance_rule", "!!!")).toStrictEqual([
      "subj",
      "observable_outcome",
    ]);
  });

  test("other schemas bind only the subject slot", () => {
    expect(
      infer("project_rule", "Anything.", ["subject", "target", "subject"]),
    ).toStrictEqual(["subj", "unknown", "subj"]);
    expect(infer("project_rule", "Anything.")).toStrictEqual([]);
  });
});
