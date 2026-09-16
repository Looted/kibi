import { describe, expect, test } from "bun:test";

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
} from "../../src/operations/modeling/predicate-inference-3.js";

describe("predicate inference 3 argument extractors", () => {
  test("inferScopedAuthorizationRuleArgs parses actor/action pairs and falls back", () => {
    expect(
      inferScopedAuthorizationRuleArgs(
        "Editors must be denied publishing unpublished drafts.",
      ),
    ).toEqual(["editors", "publishing_unpublished_drafts", "deny"]);
    expect(inferScopedAuthorizationRuleArgs("not a match")).toEqual([
      "actor",
      "action",
      "deny",
    ]);
  });

  test("inferDocumentationStandardRuleArgs parses documented-in artifacts", () => {
    expect(
      inferDocumentationStandardRuleArgs(
        "Public APIs must be documented in the OpenAPI spec.",
      ),
    ).toEqual(["public_apis", "documented_in", "the_openapi_spec"]);
    expect(inferDocumentationStandardRuleArgs("nope")).toEqual([
      "subject",
      "documented_in",
      "documentation",
    ]);
  });

  test("inferWarmupPolicyRuleArgs parses warmup triggers", () => {
    expect(
      inferWarmupPolicyRuleArgs("The cache must warm up on first request."),
    ).toEqual(["cache", "first_request"]);
    expect(inferWarmupPolicyRuleArgs("nope")).toEqual(["subject", "trigger"]);
  });

  test("inferVisualLayoutRuleArgs parses alignment targets", () => {
    expect(
      inferVisualLayoutRuleArgs(
        "The toolbar must remain visually aligned with the canvas.",
      ),
    ).toEqual(["the_toolbar", "aligned_with", "the_canvas"]);
    expect(inferVisualLayoutRuleArgs("nope")).toEqual([
      "subject",
      "aligned_with",
      "target",
    ]);
  });

  test("inferEnforcementLocationRuleArgs parses enforcement sites", () => {
    expect(
      inferEnforcementLocationRuleArgs(
        "Auth checks must be enforced at the gateway.",
      ),
    ).toEqual(["auth_checks", "the_gateway"]);
    expect(inferEnforcementLocationRuleArgs("nope")).toEqual([
      "subject",
      "location",
    ]);
  });

  test("inferReconciliationRuleArgs parses trigger/target/action tuples", () => {
    expect(
      inferReconciliationRuleArgs(
        "On reconnect, the client must reconcile local drafts and clear stale locks.",
      ),
    ).toEqual(["the_client", "reconnect", "local_drafts", "clear_stale_locks"]);
    expect(inferReconciliationRuleArgs("nope")).toEqual([
      "subject",
      "trigger",
      "target",
      "action",
    ]);
  });

  test("inferThrottlePolicyRuleArgs parses throttle conditions", () => {
    expect(
      inferThrottlePolicyRuleArgs(
        "Outbound mail must be throttled for burst traffic.",
      ),
    ).toEqual(["outbound_mail", "burst_traffic"]);
    expect(inferThrottlePolicyRuleArgs("nope")).toEqual([
      "subject",
      "condition",
    ]);
  });

  test("inferDefaultValueArgs prefers matched subjects and supplied fallbacks", () => {
    expect(
      inferDefaultValueArgs("The editor defaults to compact mode.", "fallback"),
    ).toEqual(["editor", "mode", "compact"]);
    expect(inferDefaultValueArgs("nope", "session")).toEqual([
      "session",
      "value",
      "value",
    ]);
  });

  test("inferUniquenessArgs joins nested per-scopes", () => {
    expect(
      inferUniquenessArgs(
        "There must be at most one session per user per workspace.",
      ),
    ).toEqual(["session", "user,workspace"]);
    expect(inferUniquenessArgs("nope")).toEqual(["subject", "scope"]);
  });

  test("inferStateMembershipArgs splits listed states", () => {
    expect(
      inferStateMembershipArgs(
        "Session terminal states are active, closed, and archived.",
        "fallback",
      ),
    ).toEqual(["session", "active,closed,archived"]);
    expect(inferStateMembershipArgs("nope", "job")).toEqual(["job", "state"]);
  });

  test("inferTemporalOrderArgs prefers initializes-after then before-after order", () => {
    expect(
      inferTemporalOrderArgs(
        "The renderer initializes after the session is ready.",
        "fallback",
      ),
    ).toEqual(["renderer", "session_ready", "initializes"]);
    expect(
      inferTemporalOrderArgs(
        "The request must be authenticated before the handler runs.",
        "fallback",
      ),
    ).toEqual(["the.request", "authenticated", "handler_runs"]);
    expect(inferTemporalOrderArgs("nope", "pipeline")).toEqual([
      "pipeline",
      "before_event",
      "after_event",
    ]);
  });

  test("inferConditionalBehaviorArgs prefers when-must then if-then forms", () => {
    expect(
      inferConditionalBehaviorArgs(
        "When the session expires, the editor must save changes.",
        "fallback",
      ),
    ).toEqual(["editor", "session_expires", "save_changes"]);
    expect(
      inferConditionalBehaviorArgs(
        "If a user logs out, they discard unsaved changes.",
        "fallback",
      ),
    ).toEqual(["user", "logs_out", "discard_unsaved_changes"]);
    expect(inferConditionalBehaviorArgs("nope", "widget")).toEqual([
      "widget",
      "condition",
      "behavior",
    ]);
  });

  test("inferStateTransitionArgs parses from/to/trigger tuples", () => {
    expect(
      inferStateTransitionArgs(
        "When the user submits, the draft transitions from open to closed.",
        "fallback",
      ),
    ).toEqual(["draft", "open", "closed", "user_submits"]);
    expect(inferStateTransitionArgs("nope", "ticket")).toEqual([
      "ticket",
      "from_state",
      "to_state",
      "unspecified_trigger",
    ]);
  });

  test("inferRateLimitArgs rewrites request subjects and falls back", () => {
    expect(
      inferRateLimitArgs(
        "API requests must be rate limited to 10 calls per minute.",
      ),
    ).toEqual(["api.request", "calls", "minute", "10"]);
    expect(inferRateLimitArgs("nope")).toEqual([
      "requirement.subject",
      "action",
      "window",
      "0",
    ]);
  });
});
