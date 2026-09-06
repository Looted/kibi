// implements REQ-mcp-suggest-predicates
import { describe, expect, test } from "bun:test";
import { scoreExactPredicates1 } from "../../src/operations/modeling/predicate-score-1.js";
import { scoreExactPredicates2 } from "../../src/operations/modeling/predicate-score-2.js";
import type { PredicateSchemaCandidate } from "../../src/operations/modeling/predicate-types.js";

function schema(predicate_name: string): PredicateSchemaCandidate {
  return {
    id: predicate_name,
    predicate_name,
    title: predicate_name,
    description: predicate_name,
    argument_names: ["subject"],
    argument_types: ["atom"],
    keywords: [],
    examples: [],
    tags: [],
  };
}

describe("scoreExactPredicates1 exact lanes", () => {
  test("scores matching and rejecting prose for every named rule", () => {
    expect(scoreExactPredicates1(schema("guard"), "The flag must stay disabled until review.")).toBe(0.98);
    expect(scoreExactPredicates1(schema("guard"), "unrelated prose")).toBeNull();

    expect(
      scoreExactPredicates1(
        schema("conditional_behavior"),
        "If a user submits a form, it stores the draft.",
      ),
    ).toBe(0.98);
    expect(
      scoreExactPredicates1(
        schema("conditional_behavior"),
        "When the network fails, the client must retry locally.",
      ),
    ).toBe(0.36);
    expect(scoreExactPredicates1(schema("conditional_behavior"), "plain sentence.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("exception_rule"),
        "The exporter must skip drafts unless the operator approves.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("exception_rule"), "The exporter skips drafts.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("mutual_exclusion"),
        "Draft mode and publish mode must be mutually exclusive.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("mutual_exclusion"), "Draft mode is optional.")).toBe(0);

    expect(
      scoreExactPredicates1(schema("dependency_rule"), "Sync requires login before compile."),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("dependency_rule"), "Sync happens later.")).toBe(0);

    expect(
      scoreExactPredicates1(schema("ownership_rule"), "The requirement is owned by the author."),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("ownership_rule"), "The requirement has an author.")).toBe(0);

    expect(
      scoreExactPredicates1(schema("retry_policy"), "The client must retry up to 3 times."),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("retry_policy"), "The client retries forever.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("escalation_rule"),
        "The pager must escalate to ops after 15 minutes.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("escalation_rule"), "The pager notifies ops.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("availability_sla"),
        "The API availability must be at least 99.9 percent monthly.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("availability_sla"), "The API should stay up.")).toBe(0);

    expect(
      scoreExactPredicates1(schema("notification_route"), "The bot must notify owners by email."),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("notification_route"), "The bot talks to owners.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("idempotency_rule"),
        "The webhook must be idempotent by request id.",
      ),
    ).toBe(0.98);
    expect(
      scoreExactPredicates1(
        schema("idempotency_rule"),
        "The webhook must be deduplicated to prevent redundant requests during retry storms.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("idempotency_rule"), "The webhook is unique.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("data_residency_rule"),
        "Customer records must be stored in the eu region.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("data_residency_rule"), "Customer records are encrypted.")).toBe(
      0,
    );

    expect(
      scoreExactPredicates1(
        schema("audit_event_rule"),
        "Admin actions must be recorded in the audit log.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("audit_event_rule"), "Admin actions are visible.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("consent_rule"),
        "The form must require explicit consent before sharing.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("consent_rule"), "The form collects email.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("lifecycle_rule"),
        "Session tokens must be expired after 30 days.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("lifecycle_rule"), "Session tokens last a while.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("conflict_resolution_rule"),
        "When two edits conflict, the latest write wins.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("conflict_resolution_rule"), "Edits can collide.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("fallback_rule"),
        "If the primary store fails, the reader must fall back to the replica.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("fallback_rule"), "The reader uses the replica.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("batch_operation_rule"),
        "The importer must process rows in batches of 100.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("batch_operation_rule"), "The importer reads rows.")).toBe(0);

    expect(
      scoreExactPredicates1(
        schema("consistency_rule"),
        "Each scenario must reference an existing requirement.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates1(schema("consistency_rule"), "Each scenario is named.")).toBe(0);

    expect(scoreExactPredicates1(schema("unknown_rule"), "anything")).toBeNull();
  });
});

describe("scoreExactPredicates2 exact lanes", () => {
  test("scores matching, keyword-rejecting, and rejecting prose", () => {
    expect(
      scoreExactPredicates2(
        schema("build_constraint"),
        "The lockfile must be deterministic at build time.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("build_constraint"), "The lockfile is pinned.")).toBe(0);

    expect(
      scoreExactPredicates2(
        schema("environment_safety_rule"),
        "Debug endpoints must be forbidden in production.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("environment_safety_rule"), "Debug endpoints exist.")).toBe(0);

    expect(
      scoreExactPredicates2(
        schema("schema_invariant_rule"),
        "The snapshot hash must be immutable after publish.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("schema_invariant_rule"), "The snapshot hash changes.")).toBe(
      0,
    );

    expect(
      scoreExactPredicates2(
        schema("coding_standard_rule"),
        "Hook authors must use the typed schema.",
      ),
    ).toBe(0.98);
    expect(
      scoreExactPredicates2(schema("coding_standard_rule"), "Authors must use bananas."),
    ).toBe(0);
    expect(scoreExactPredicates2(schema("coding_standard_rule"), "Authors like hooks.")).toBe(0);

    expect(
      scoreExactPredicates2(
        schema("migration_boundary_rule"),
        "Legacy YAML may only be read as migration input by the importer.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("migration_boundary_rule"), "Legacy YAML is deleted.")).toBe(
      0,
    );

    expect(
      scoreExactPredicates2(schema("absence_requirement"), "The temporary cache must be absent."),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("absence_requirement"), "No leftover cache.")).toBe(0.98);
    expect(scoreExactPredicates2(schema("absence_requirement"), "The cache is optional.")).toBe(0);

    expect(
      scoreExactPredicates2(
        schema("offline_behavior_rule"),
        "The editor must be non-blocking during offline conditions.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("offline_behavior_rule"), "The editor works offline.")).toBe(
      0,
    );

    expect(
      scoreExactPredicates2(
        schema("release_gate_rule"),
        "The package must pass the release suite before distribution.",
      ),
    ).toBe(0.98);
    expect(
      scoreExactPredicates2(
        schema("release_gate_rule"),
        "The package must pass review before lunch.",
      ),
    ).toBe(0);
    expect(scoreExactPredicates2(schema("release_gate_rule"), "The package is published.")).toBe(0);

    expect(
      scoreExactPredicates2(
        schema("platform_consistency_rule"),
        "Theme tokens must synchronize across ios and android.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("platform_consistency_rule"), "Theme tokens differ.")).toBe(0);

    expect(
      scoreExactPredicates2(
        schema("preservation_rule"),
        "Audit rows must preserve actor identity when the user is deleted.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("preservation_rule"), "Audit rows stay around.")).toBe(0);

    expect(
      scoreExactPredicates2(
        schema("abstraction_boundary_rule"),
        "Layout state must be persisted as a vendor-neutral contract.",
      ),
    ).toBe(0.98);
    expect(
      scoreExactPredicates2(
        schema("abstraction_boundary_rule"),
        "Layout state must be persisted as json blobs.",
      ),
    ).toBe(0);
    expect(scoreExactPredicates2(schema("abstraction_boundary_rule"), "Layout state is saved.")).toBe(
      0,
    );

    expect(
      scoreExactPredicates2(
        schema("security_configuration_rule"),
        "Database functions must have explicit search_path public.",
      ),
    ).toBe(0.98);
    expect(
      scoreExactPredicates2(
        schema("security_configuration_rule"),
        "Widgets must have explicit foo bar.",
      ),
    ).toBe(0);
    expect(scoreExactPredicates2(schema("security_configuration_rule"), "Search path is default.")).toBe(
      0,
    );

    expect(
      scoreExactPredicates2(
        schema("ordered_strategy_rule"),
        "The resolver must use backends in priority order cache, origin.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("ordered_strategy_rule"), "The resolver picks a backend.")).toBe(
      0,
    );

    expect(
      scoreExactPredicates2(
        schema("refresh_policy_rule"),
        "The tree must automatically refresh symbols without requiring manual page reload.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("refresh_policy_rule"), "The tree refreshes sometimes.")).toBe(
      0,
    );

    expect(
      scoreExactPredicates2(
        schema("scoped_authorization_rule"),
        "Unassigned members must be denied write access.",
      ),
    ).toBe(0.98);
    expect(
      scoreExactPredicates2(schema("scoped_authorization_rule"), "Guests must be denied write access."),
    ).toBe(0);
    expect(scoreExactPredicates2(schema("scoped_authorization_rule"), "Guests cannot write.")).toBe(0);

    expect(
      scoreExactPredicates2(
        schema("documentation_standard_rule"),
        "Public tools must be documented in the mcp reference.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("documentation_standard_rule"), "Public tools have names.")).toBe(
      0,
    );

    expect(
      scoreExactPredicates2(schema("warmup_policy_rule"), "The daemon must warm up on first query."),
    ).toBe(0.98);
    expect(scoreExactPredicates2(schema("warmup_policy_rule"), "The daemon starts quickly.")).toBe(0);

    expect(scoreExactPredicates2(schema("unknown_rule"), "anything")).toBeNull();
  });
});
