import { DECISION_IDS } from "../runtime/decision-seeds";

/**
 * Per-objective evaluator contracts for the intent, consistency, scenario and
 * provenance cases: which seeded fixture they start from, the ordered protocol
 * they must follow (with argument subset predicates), and the regex
 * assertions over the final `src/` tree. Objectives without an entry keep the
 * family defaults in evaluator.ts.
 */

// implements REQ-skillopt-codex-optimization
export type FixtureSetupMode =
  | "none"
  | "generated_coordinate_divergence"
  | "seeded_fresh_kb"
  | "seeded_uncovered_kb"
  | "seeded_safe_mutation_kb"
  | "seeded_dirty_kb"
  | "seeded_partial_kb"
  | "seeded_stale_kb"
  | "thin_root_kb"
  | "seeded_governed_area_kb"
  | "seeded_precondition_kb"
  | "seeded_consistency_kb"
  | "seeded_decision_kb"
  | "seeded_unrecorded_change_kb"
  | "seeded_staged_symbol_kb"
  | "seeded_staged_coordinates_kb"
  | "seeded_staged_refactor_kb"
  | "seeded_impact_review_kb"
  | "seeded_staged_conflict_kb"
  | "seeded_merge_commit_kb";

/** A regex over one final workspace source file. */
// implements REQ-skillopt-codex-optimization
export type WorkspaceAssertion = Readonly<{
  key: string;
  /** Workspace-relative path under `src/`. */
  path: string;
  pattern: string;
  flags?: string;
  /** true: the final file must match; false: it must not. */
  expectMatch: boolean;
}>;

// implements REQ-skillopt-codex-optimization
export type RequiredCall = Readonly<{
  tool: string;
  /** Subset predicate: every listed field must match the call's arguments. */
  args?: Readonly<Record<string, unknown>>;
}>;

// implements REQ-skillopt-codex-optimization
export type CaseContract = Readonly<{
  fixtureSetup: FixtureSetupMode;
  /** Ordered catalog operations scored by the protocol rubric. */
  requiredTools: readonly string[];
  /** Ordered calls with argument predicates (protocolContract.requiredCalls). */
  requiredCalls?: readonly RequiredCall[];
  forbiddenTools?: readonly string[];
  workspaceAssertions?: readonly WorkspaceAssertion[];
}>;

/**
 * Format instruction appended to answer-scored prompts. It fixes the shape of
 * the answer, not its content: the vocabulary lists every verdict.
 */
// implements REQ-skillopt-codex-optimization
export const KIBI_ANSWER_FORMAT_INSTRUCTION =
  ' Put your user-facing answer in the final "answer" field and end it with a fenced ```kibi-answer block holding one JSON object: {"verdict": "governed" | "conflict" | "infeasible" | "unknown" | "no_knowledge" | "analysis_incomplete" | "unresolved" | "no_conflict", "governing": [current requirement IDs], "conflict": string or null, "unknowns": [strings], "nextStep": string or null, "proof": "proven" | "unresolved" | "missing" | "not_applicable" | null}.';

const GOVERNED_SOURCE = "src/fixture.ts";

const SOURCE_LINKED_SEARCH: RequiredCall = {
  tool: "kb_search",
  args: { sourceLocations: [{ path: GOVERNED_SOURCE }] },
};

const REJECTS_EMPTY_NAMES: WorkspaceAssertion = {
  key: "governing-rule-preserved",
  path: GOVERNED_SOURCE,
  pattern: "throw\\s+new\\s+Error\\s*\\(",
  expectMatch: true,
};

const CONTRADICTION_CHECK: RequiredCall = {
  tool: "kb_check",
  args: { rules: ["domain-contradictions"] },
};

const RECORD_RULE_TOOLS = ["kb_search", "kb_query", "kb_upsert", "kb_check"];

/** The firm 32-character limit survives in the governed source. */
const LIMIT_KEPT: WorkspaceAssertion = {
  key: "firm-limit-kept",
  path: GOVERNED_SOURCE,
  pattern: "\\b32\\b",
  expectMatch: true,
};

const LONG_NAMES_REJECTED: WorkspaceAssertion = {
  key: "long-names-rejected",
  path: GOVERNED_SOURCE,
  pattern: "throw\\s+new\\s+Error\\s*\\(",
  expectMatch: true,
};

// implements REQ-skillopt-codex-optimization
export const OBJECTIVE_CASE_CONTRACTS: Readonly<Record<string, CaseContract>> =
  {
    onboarding_evidence_review: {
      fixtureSetup: "seeded_fresh_kb",
      requiredTools: ["kb_status"],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    // Item 1: consult governing intent before changing behavior.
    governing_intent_before_edit: {
      fixtureSetup: "seeded_governed_area_kb",
      requiredTools: ["kb_search", "kb_query"],
      requiredCalls: [SOURCE_LINKED_SEARCH, { tool: "kb_query" }],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
      workspaceAssertions: [REJECTS_EMPTY_NAMES],
    },
    compatible_change_after_intent: {
      fixtureSetup: "seeded_governed_area_kb",
      requiredTools: ["kb_search", "kb_query"],
      requiredCalls: [SOURCE_LINKED_SEARCH, { tool: "kb_query" }],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
      workspaceAssertions: [
        REJECTS_EMPTY_NAMES,
        {
          key: "logging-added",
          path: GOVERNED_SOURCE,
          pattern: "console\\.(?:log|info|debug|warn)\\s*\\(|logger\\.",
          expectMatch: true,
        },
      ],
    },
    superseded_owner_intent: {
      fixtureSetup: "seeded_governed_area_kb",
      requiredTools: ["kb_search", "kb_query"],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
      workspaceAssertions: [REJECTS_EMPTY_NAMES],
    },
    // Item 5: layered explanations; current vs superseded; policy vs notes.
    explain_governing_intent: {
      fixtureSetup: "seeded_governed_area_kb",
      requiredTools: ["kb_search", "kb_query"],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    explain_observation_vs_policy: {
      fixtureSetup: "seeded_governed_area_kb",
      requiredTools: ["kb_search", "kb_query"],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    intent_abstention: {
      fixtureSetup: "seeded_governed_area_kb",
      requiredTools: ["kb_search"],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    // Item 6: provenance of agent-inferred requirements.
    agent_inferred_requirement_origin: {
      fixtureSetup: "seeded_fresh_kb",
      requiredTools: ["kb_search", "kb_query", "kb_upsert", "kb_check"],
      forbiddenTools: ["kb_delete", "kb_apply_plan"],
    },
    // Item 2: three-valued consistency outcomes.
    consistency_incomplete_report: {
      fixtureSetup: "seeded_consistency_kb",
      requiredTools: ["kb_query", "kb_check", "kb_coverage"],
      requiredCalls: [
        { tool: "kb_query" },
        CONTRADICTION_CHECK,
        { tool: "kb_coverage" },
      ],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    consistency_disjoint_report: {
      fixtureSetup: "seeded_consistency_kb",
      requiredTools: ["kb_query", "kb_check"],
      requiredCalls: [{ tool: "kb_query" }, CONTRADICTION_CHECK],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    // Item 4: scenarios with intended outcomes, preconditions, exceptions.
    scenario_precondition_preapproval: {
      fixtureSetup: "seeded_precondition_kb",
      requiredTools: ["kb_search", "kb_query"],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    scenario_exception_post_approval: {
      fixtureSetup: "seeded_precondition_kb",
      requiredTools: ["kb_search", "kb_query", "kb_upsert", "kb_check"],
      forbiddenTools: ["kb_delete", "kb_apply_plan"],
    },
    scenario_expects_rejection: {
      fixtureSetup: "seeded_precondition_kb",
      requiredTools: ["kb_search", "kb_query", "kb_upsert", "kb_check"],
      forbiddenTools: ["kb_delete", "kb_apply_plan"],
    },
    // kibi-decisions: read the firm rule, record stated rules, ask on conflict.
    stated_rule_capture: {
      fixtureSetup: "seeded_decision_kb",
      requiredTools: RECORD_RULE_TOOLS,
      forbiddenTools: ["kb_delete", "kb_apply_plan"],
      workspaceAssertions: [LIMIT_KEPT],
    },
    firm_rule_conflict: {
      fixtureSetup: "seeded_decision_kb",
      requiredTools: ["kb_search", "kb_query"],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
      workspaceAssertions: [LIMIT_KEPT, LONG_NAMES_REJECTED],
    },
    supersede_with_reason: {
      fixtureSetup: "seeded_decision_kb",
      requiredTools: RECORD_RULE_TOOLS,
      forbiddenTools: ["kb_delete", "kb_apply_plan"],
      workspaceAssertions: [
        { ...LIMIT_KEPT, key: "old-limit-removed", expectMatch: false },
      ],
    },
    compile_intent_review: {
      fixtureSetup: "seeded_decision_kb",
      requiredTools: [
        "kb_search",
        "kb_query",
        "kb_compile_intent",
        "kb_compile_intent",
        "kb_apply_plan",
        "kb_upsert",
        "kb_check",
      ],
      requiredCalls: [
        { tool: "kb_search" },
        { tool: "kb_query" },
        { tool: "kb_compile_intent" },
        {
          tool: "kb_compile_intent",
          args: { conflictReviews: [{ requirementId: DECISION_IDS.rule }] },
        },
        { tool: "kb_apply_plan" },
        { tool: "kb_upsert" },
        { tool: "kb_check" },
      ],
      forbiddenTools: ["kb_delete"],
    },
    compile_intent_conflict: {
      fixtureSetup: "seeded_decision_kb",
      requiredTools: ["kb_compile_intent", "kb_compile_intent"],
      requiredCalls: [
        { tool: "kb_compile_intent" },
        {
          tool: "kb_compile_intent",
          args: {
            conflictReviews: [
              { requirementId: DECISION_IDS.rule, verdict: "conflict" },
            ],
          },
        },
      ],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    unrecorded_change_closeout: {
      fixtureSetup: "seeded_unrecorded_change_kb",
      requiredTools: RECORD_RULE_TOOLS,
      forbiddenTools: ["kb_delete", "kb_apply_plan"],
      workspaceAssertions: [LIMIT_KEPT],
    },
    agent_pick_closeout: {
      fixtureSetup: "seeded_unrecorded_change_kb",
      requiredTools: RECORD_RULE_TOOLS,
      forbiddenTools: ["kb_delete", "kb_apply_plan"],
      workspaceAssertions: [LIMIT_KEPT],
    },
    // kibi-commit-review: read the gate, author or refresh evidence, name the
    // commands the person runs (the sandbox has no shell or kibi CLI).
    staged_symbol_evidence: {
      fixtureSetup: "seeded_staged_symbol_kb",
      requiredTools: ["kb_search", "kb_query", "kb_upsert", "kb_check"],
      requiredCalls: [
        SOURCE_LINKED_SEARCH,
        { tool: "kb_query" },
        { tool: "kb_upsert" },
        { tool: "kb_check" },
      ],
      forbiddenTools: ["kb_delete", "kb_apply_plan"],
    },
    coordinate_refresh_only: {
      fixtureSetup: "seeded_staged_coordinates_kb",
      requiredTools: ["kb_search", "kb_query"],
      requiredCalls: [SOURCE_LINKED_SEARCH, { tool: "kb_query" }],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    refactor_refresh_only: {
      fixtureSetup: "seeded_staged_refactor_kb",
      requiredTools: ["kb_search", "kb_query"],
      requiredCalls: [SOURCE_LINKED_SEARCH, { tool: "kb_query" }],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    impact_review_draft: {
      fixtureSetup: "seeded_impact_review_kb",
      requiredTools: ["kb_prepare_impact_review"],
      requiredCalls: [
        {
          tool: "kb_prepare_impact_review",
          args: { scope: { kind: "staged" } },
        },
      ],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    staged_rule_conflict: {
      fixtureSetup: "seeded_staged_conflict_kb",
      requiredTools: ["kb_search", "kb_query"],
      requiredCalls: [SOURCE_LINKED_SEARCH, { tool: "kb_query" }],
      forbiddenTools: ["kb_upsert", "kb_delete", "kb_apply_plan"],
    },
    merge_commit_scope: {
      fixtureSetup: "seeded_merge_commit_kb",
      requiredTools: ["kb_search", "kb_query", "kb_upsert", "kb_check"],
      requiredCalls: [
        SOURCE_LINKED_SEARCH,
        { tool: "kb_query" },
        { tool: "kb_upsert" },
        { tool: "kb_check" },
      ],
      forbiddenTools: ["kb_delete", "kb_apply_plan"],
    },
  };

/** Objectives whose prompt carries the `kibi-answer` format instruction. */
// implements REQ-skillopt-codex-optimization
export function answerScoredObjective(objectiveCode: string): boolean {
  return (
    objectiveCode !== "onboarding_evidence_review" &&
    Object.hasOwn(OBJECTIVE_CASE_CONTRACTS, objectiveCode)
  );
}
