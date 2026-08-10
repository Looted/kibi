import {
  inferAuditEventRuleArgs,
  inferAvailabilitySlaArgs,
  inferConsentRuleArgs,
  inferDataResidencyRuleArgs,
  inferDependencyRuleArgs,
  inferEscalationRuleArgs,
  inferExceptionRuleArgs,
  inferGuardArgs,
  inferIdempotencyRuleArgs,
  inferLifecycleRuleArgs,
  inferMutualExclusionArgs,
  inferNotificationRouteArgs,
  inferOwnershipRuleArgs,
  inferPermissionRuleArgs,
  inferRetryPolicyArgs,
} from "./predicate-inference-1.js";
import {
  inferAbsenceRequirementArgs,
  inferAbstractionBoundaryRuleArgs,
  inferBatchOperationRuleArgs,
  inferBuildConstraintArgs,
  inferCodingStandardRuleArgs,
  inferConflictResolutionRuleArgs,
  inferConsistencyRuleArgs,
  inferEnvironmentSafetyRuleArgs,
  inferFallbackRuleArgs,
  inferMigrationBoundaryRuleArgs,
  inferOfflineBehaviorRuleArgs,
  inferOrderedStrategyRuleArgs,
  inferPlatformConsistencyRuleArgs,
  inferPreservationRuleArgs,
  inferRefreshPolicyRuleArgs,
  inferReleaseGateRuleArgs,
  inferSchemaInvariantRuleArgs,
  inferSecurityConfigurationRuleArgs,
} from "./predicate-inference-2.js";
import {
  inferConditionalBehaviorArgs,
  inferDefaultValueArgs,
  inferDocumentationStandardRuleArgs,
  inferEnforcementLocationRuleArgs,
  inferRateLimitArgs,
  inferReconciliationRuleArgs,
  inferScopedAuthorizationRuleArgs,
  inferStateMembershipArgs,
  inferStateTransitionArgs,
  inferTemporalOrderArgs,
  inferThrottlePolicyRuleArgs,
  inferUniquenessArgs,
  inferVisualLayoutRuleArgs,
  inferWarmupPolicyRuleArgs,
} from "./predicate-inference-3.js";
import type { PredicateSchemaCandidate } from "./predicate-types.js";
import {
  inferDuration,
  inferDurationUnit,
  inferEvent,
  inferGate,
  inferNumber,
  inferOperator,
  inferResource,
  inferScope,
  inferSubject,
  inferTrigger,
  inferUnit,
  normalizePredicateToken,
  slug,
} from "./predicate-utils.js";

// implements REQ-mcp-suggest-predicates
export function inferArgs(
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
      return schema.argument_names.map((name) => {
        if (name === "subject") return subject;
        const normalized = normalizePredicateToken(name);
        const words = normalized.split("_").filter((word) => word.length > 2);
        // Project-local schemas often use the exact domain vocabulary in
        // their ordered argument names. Reuse that declared value when the
        // complete name (or all meaningful words) occurs in the claim; keep
        // genuinely unbound arguments explicit instead of guessing.
        const phrase = words.join(" ");
        return phrase.length > 0 &&
          (lower.includes(phrase) ||
            words.every((word) => lower.includes(word)))
          ? normalized
          : "unknown";
      });
  }
}

// implements REQ-mcp-suggest-predicates
export { inferSubject };
