// implements REQ-mcp-suggest-predicates
import { describe, expect, test } from "bun:test";
import { inferArgs } from "../../src/operations/modeling/predicate-inference.js";
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
  matchesKeyword,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
} from "../../src/operations/modeling/predicate-utils.js";
import type { PredicateSchemaCandidate } from "../../src/operations/modeling/predicate-types.js";

function schema(
  predicateName: string,
  argumentNames: string[] = ["subject"],
): PredicateSchemaCandidate {
  return {
    id: `FACT-SCHEMA-${predicateName}`,
    predicate_name: predicateName,
    title: predicateName,
    description: predicateName,
    argument_names: argumentNames,
    argument_types: argumentNames.map(() => "entity"),
    keywords: [predicateName],
    examples: [],
    tags: [],
  };
}

describe("predicate inference coverage", () => {
  test("inferArgs covers built-in predicates and the unknown fallback", () => {
    const cases: Array<[string, string, string]> = [
      ["state", "The editor is idle.", "editor"],
      ["state", "The editor is active.", "editor"],
      ["transition", "Navigate from edit to idle.", "editor"],
      ["transition", "Draft becomes active.", "editor"],
      ["guard", "Save must stay disabled until dirty.", "save"],
      ["guard", "The field is readonly.", "field"],
      ["exception_rule", "The admin is the only exception to the lock.", "admin"],
      ["exception_rule", "The worker must continue unless the queue is empty.", "worker"],
      ["mutual_exclusion", "Plan A and plan B must be mutually exclusive.", "plans"],
      ["dependency_rule", "Deploy requires tests before release.", "deploy"],
      ["ownership_rule", "The ledger is owned by the finance team.", "ledger"],
      ["retry_policy", "The client must retry up to 3 times.", "client"],
      ["escalation_rule", "Support must escalate to oncall after 15 minutes.", "support"],
      [
        "availability_sla",
        "API availability must be at least 99.9 percent monthly.",
        "api",
      ],
      ["notification_route", "Alerts must notify oncall by email.", "alerts"],
      ["idempotency_rule", "The webhook must be idempotent by request id.", "webhook"],
      [
        "idempotency_rule",
        "The webhook must be deduplicated to prevent redundant requests during retries.",
        "webhook",
      ],
      [
        "data_residency_rule",
        "Customer data must be stored in the eu region.",
        "customer data",
      ],
      [
        "audit_event_rule",
        "Admin actions must be recorded in the audit log.",
        "admin actions",
      ],
      [
        "consent_rule",
        "The form must require explicit consent before marketing.",
        "form",
      ],
      ["lifecycle_rule", "Drafts must be archived after 30 days.", "drafts"],
      ["conflict_resolution_rule", "Conflicts use last write wins.", "docs"],
      ["fallback_rule", "Use cached data as fallback.", "cache"],
      ["batch_operation_rule", "Imports run as a batch.", "imports"],
      ["consistency_rule", "Replicas stay consistent.", "replicas"],
      ["build_constraint", "Release builds must stay green.", "build"],
      ["environment_safety_rule", "Prod writes are forbidden in staging.", "env"],
      ["schema_invariant_rule", "Ids remain unique.", "schema"],
      ["coding_standard_rule", "Files must use typescript.", "code"],
      ["migration_boundary_rule", "Legacy stores stay isolated.", "migrate"],
      ["absence_requirement", "Secrets must be absent from logs.", "logs"],
      ["offline_behavior_rule", "The app works offline.", "app"],
      ["release_gate_rule", "Release requires a green gate.", "release"],
      ["platform_consistency_rule", "CLI and MCP stay aligned.", "platform"],
      ["preservation_rule", "History must be preserved.", "history"],
      ["abstraction_boundary_rule", "UI must not import core.", "ui"],
      ["security_configuration_rule", "TLS must be required.", "tls"],
      ["ordered_strategy_rule", "Try cache then origin.", "fetch"],
      ["refresh_policy_rule", "Tokens refresh every hour.", "tokens"],
      ["scoped_authorization_rule", "Editors may edit drafts only.", "editors"],
      ["documentation_standard_rule", "Docs must include examples.", "docs"],
      ["warmup_policy_rule", "Caches warmup on boot.", "cache"],
      ["visual_layout_rule", "The sidebar stays left.", "sidebar"],
      ["enforcement_location_rule", "Checks run in CI.", "ci"],
      ["reconciliation_rule", "Stores reconcile after sync.", "stores"],
      ["throttle_policy_rule", "APIs throttle after 100 requests.", "api"],
      ["has_unsaved_changes", "The editor has unsaved changes.", "editor"],
      ["has_unsaved_changes", "The editor has no unsaved changes.", "editor"],
      ["commit_action", "Submit the draft changes.", "editor"],
      ["discard_action", "Cancel the session.", "editor"],
      ["accessibility_requirement", "Pages must meet WCAG.", "pages"],
      ["accessibility_requirement", "Pages must stay accessible.", "pages"],
      ["retention_policy", "Logs must be retained for 7 years.", "logs"],
      ["resource_constraint", "Latency must not exceed 200 ms.", "api"],
      ["resource_constraint", "Size must be at least 10 mb.", "payload"],
      ["feature_gate", "Flag `beta_mode` stays disabled.", "flag"],
      ["feature_gate", "Flag stays enabled.", "flag"],
      ["publishes_event", "Checkout publishes CheckoutCompletedEvent.", "checkout"],
      ["acceptance_rule", "A passing receipt is observed.", "proof"],
      ["permission_rule", "Agents must not edit compiled stores.", "agents"],
      ["permission_rule", "Owners may approve the change.", "owners"],
      ["default_value", "Timeout defaults to 30.", "timeout"],
      ["uniqueness_constraint", "Emails must be unique.", "email"],
      ["state_membership", "The job is in queued.", "job"],
      ["temporal_order", "Validate before save.", "save"],
      ["conditional_behavior", "Save when dirty.", "save"],
      ["state_transition", "Draft becomes published.", "doc"],
      ["rate_limit", "Clients may send 10 requests per second.", "clients"],
      ["project_local", "Custom claim.", "subject"],
    ];

    for (const [name, text, subject] of cases) {
      const args = inferArgs(schema(name, ["subject", "other"]), text, subject);
      expect(args.length).toBeGreaterThan(0);
      expect(args.every((value) => typeof value === "string")).toBe(true);
    }
    expect(
      inferArgs(schema("project_local", ["subject", "other"]), "x", "keep"),
    ).toEqual(["keep", "unknown"]);
  });

  test("predicate utils cover subject, trigger, scope, and metric helpers", () => {
    expect(inferSubject("annotation overlay", undefined)).toBe(
      "editor.annotation",
    );
    expect(inferSubject("the editor window", undefined)).toBe("editor");
    expect(inferSubject("session start", undefined)).toBe("session");
    expect(inferSubject("customer data retention", undefined)).toBe(
      "customer.data",
    );
    expect(inferSubject("the user profile", undefined)).toBe("user");
    expect(inferSubject("something else", undefined)).toBe(
      "requirement.subject",
    );
    expect(inferSubject("ignored", "explicit")).toBe("explicit");
    expect(inferTrigger("navigate away")).toBe("navigation");
    expect(inferTrigger("press escape")).toBe("escape");
    expect(inferTrigger("cancel the job")).toBe("cancel");
    expect(inferTrigger("submit the form")).toBe("submit");
    expect(inferTrigger("other")).toBe("unspecified_trigger");
    expect(inferScope("draft mode")).toBe("draft");
    expect(inferScope("annotation overlay")).toBe("active_annotation");
    expect(inferScope("session start")).toBe("session");
    expect(inferScope("unsaved changes")).toBe("changes");
    expect(inferScope("other")).toBe("subject");
    expect(normalizePredicateToken("  the user's name  ")).toBe("users_name");
    expect(singularize("changes")).toBe("changes");
    expect(singularize("results")).toBe("results");
    expect(singularize("widgets")).toBe("widget");
    expect(normalizeSubjectKey("the widgets")).toBe("the.widget");
    expect(matchesKeyword("Hello world", "hello world", "hello world")).toBe(
      true,
    );
    expect(matchesKeyword("Hello!", "hello!", "!")).toBe(true);
    expect(inferDuration("keep 7 years")).toBe("7");
    expect(inferDuration("none")).toBe("1");
    expect(inferDurationUnit("7 years")).toBe("years");
    expect(inferDurationUnit("2 months")).toBe("months");
    expect(inferDurationUnit("30 days")).toBe("days");
    expect(inferDurationUnit("forever")).toBe("unit");
    expect(inferResource("p99 latency")).toBe("latency");
    expect(inferResource("request timeout")).toBe("timeout");
    expect(inferResource("payload size")).toBe("size");
    expect(inferResource("other")).toBe("resource");
    expect(inferOperator("at least 2")).toBe("gte");
    expect(inferOperator("no more than 2")).toBe("lte");
    expect(inferOperator("must not equal")).toBe("neq");
    expect(inferOperator("bounded")).toBe("lte");
    expect(inferNumber("wait 1.5 seconds")).toBe("1.5");
    expect(inferNumber("none")).toBe("0");
    expect(inferUnit("200 ms")).toBe("ms");
    expect(inferUnit("2 seconds")).toBe("seconds");
    expect(inferUnit("10 mb")).toBe("mb");
    expect(inferUnit("other")).toBe("unit");
    expect(inferGate('flag "beta_mode"')).toBe("beta_mode");
    expect(inferGate("no quote")).toBe("feature_gate");
    expect(inferEvent("emits CheckoutCompletedEvent")).toBe(
      "CheckoutCompletedEvent",
    );
    expect(inferEvent("emits something")).toBe("domain_event");
  });
});
