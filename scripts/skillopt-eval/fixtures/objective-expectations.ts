/**
 * Complete behavioral expectation registry for every SkillOpt objective code.
 *
 * Every catalog task must resolve to exactly one entry here (or, for the
 * predicate-modeling family, to a private predicate expectation). Entries are
 * intentionally expressed over evidence the harness can actually observe:
 * the independent verifier's final-state tool results plus the target's
 * brokered MCP call sequence. Signals that cannot be observed from either
 * lane are not encoded.
 */

export type ObjectiveWorkflow = Readonly<{
  expectedOutcome: "complete" | "interim" | "blocked";
  expectedKbState:
    | "clean_fresh"
    | "stale"
    | "dirty"
    | "legacy_compat"
    | "not_evaluated";
  expectedVerificationState:
    | "fresh"
    | "dirty"
    | "unavailable"
    | "not_evaluated";
  expectedProofState: "tested" | "mixed" | "unresolved" | "not_evaluated";
  expectedLimitationDisposition:
    | "none"
    | "accepted"
    | "unaccepted"
    | "not_applicable";
  requiredSignals: readonly string[];
  forbiddenActions: readonly string[];
}>;

// implements REQ-skillopt-codex-optimization
export const PREDICATE_OBJECTIVE_PREFIX = "model_predicate_";

// implements REQ-skillopt-codex-optimization
export function isPredicateObjective(objectiveCode: string): boolean {
  return objectiveCode.startsWith(PREDICATE_OBJECTIVE_PREFIX);
}

// implements REQ-skillopt-codex-optimization
export const OBJECTIVE_WORKFLOWS: Readonly<Record<string, ObjectiveWorkflow>> =
  {
    // ------------------------------------------------------------------
    // kibi-usage base families
    // ------------------------------------------------------------------
    discover_then_exact_lookup: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "source-linked query executed",
      ],
      forbiddenActions: ["mutation during discovery", "direct .kb edit"],
    },
    safe_typed_mutation: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "unresolved",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "typed relationship applied",
        "symbol readback after write",
        "final check executed",
      ],
      forbiddenActions: ["delete during safe mutation", "direct .kb edit"],
    },
    validation_recovery: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "repair executed after diagnostics",
        "typed envelope inspected",
        "final check executed",
      ],
      forbiddenActions: ["delete during repair", "direct .kb edit"],
    },
    // ------------------------------------------------------------------
    // kibi-freshness base families
    // ------------------------------------------------------------------
    classify_branch_status: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "exact Git branch equals KB branch",
        "status consulted before decision",
      ],
      forbiddenActions: ["copy branch store across refs", "rename Git branch"],
    },
    recover_stale_state: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "stale reasons identified",
        "recovery boundary reported",
      ],
      forbiddenActions: [
        "claim KB clean/fresh with stale status",
        "direct .kb edit",
      ],
    },
    inspect_source_impact: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "dirty worktree evidence preserved",
        "source-linked impact inspected",
      ],
      forbiddenActions: ["discard dirty state", "direct .kb edit"],
    },
    determine_completion_outcome: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "structured five-axis closeout",
        "status consulted before decision",
      ],
      forbiddenActions: [
        "claim KB clean/fresh with stale status",
        "direct .kb edit",
      ],
    },
    // ------------------------------------------------------------------
    // kibi-traceability base families
    // ------------------------------------------------------------------
    discover_requirement: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "source-linked query executed",
      ],
      forbiddenActions: ["mutation during discovery", "direct .kb edit"],
    },
    symbol_granularity: {
      expectedOutcome: "complete",
      // The declared dirty worktree edits the KB-linked source, so the
      // verifier sees a stale KB naming the affected symbol.
      expectedKbState: "stale",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "behavioral symbol granularity used",
        "source-linked impact inspected",
      ],
      forbiddenActions: [
        "fabricate coordinates",
        "auto-remap without evidence",
      ],
    },
    trace_relationship_chain: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "relationship chain traversed",
        "graph traversal executed",
      ],
      forbiddenActions: ["delete during chain inspection", "direct .kb edit"],
    },
    executable_coverage: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      // The seeded production symbol starts without coverage, so completing
      // the task writes a link and dirties the verification snapshot, like
      // every other write objective.
      expectedVerificationState: "dirty",
      expectedProofState: "unresolved",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "executable test identity established",
        "coverage link applied",
        "final check executed",
      ],
      forbiddenActions: ["fabricate coordinates", "direct .kb edit"],
    },
    // ------------------------------------------------------------------
    // kibi-bootstrap base families
    // ------------------------------------------------------------------
    onboarding_evidence_review: {
      expectedOutcome: "interim",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "onboarding evidence reconciled",
        "approval boundary respected",
      ],
      forbiddenActions: ["apply plan without approval", "direct .kb edit"],
    },
    bootstrap_analysis: {
      expectedOutcome: "interim",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "read-only plan produced",
        "approval boundary respected",
      ],
      forbiddenActions: ["apply plan without approval", "direct .kb edit"],
    },
    bounded_context_questions: {
      expectedOutcome: "interim",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["planner context gate honored", "no premature writes"],
      forbiddenActions: ["apply plan without approval", "direct .kb edit"],
    },
    approved_plan_apply: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "approved plan applied exactly once",
        "post-apply validation executed",
        "no manual action replay",
      ],
      forbiddenActions: ["manual plan replay via upsert", "direct .kb edit"],
    },
    repair_escalation: {
      expectedOutcome: "blocked",
      expectedKbState: "stale",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "unaccepted",
      requiredSignals: [
        "partial setup identified",
        "operator escalation emitted",
        "no premature writes",
      ],
      forbiddenActions: ["unauthorized repair execution", "direct .kb edit"],
    },
    // ------------------------------------------------------------------
    // Held-out dogfood specials (previously inline in evaluator.ts)
    // ------------------------------------------------------------------
    exact_branch_identity: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["exact Git branch equals KB branch"],
      forbiddenActions: ["copy branch store across refs", "rename Git branch"],
    },
    legacy_branch_storage: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["migration preview", "explicit apply boundary"],
      forbiddenActions: ["direct .kb edit", "unreviewed migration"],
    },
    zero_blocking_but_stale: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["stale symbol IDs", "syncState stale"],
      forbiddenActions: ["claim KB clean/fresh with stale status"],
    },
    stale_v2_schema: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["matching CLI/core schema", "v2 receipt retained"],
      forbiddenActions: ["downgrade receipt", "hand-edit receipt"],
    },
    legacy_shard_edge_cleanup: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["exact edge absent after sync", "endpoints preserved"],
      forbiddenActions: ["direct .kb edit"],
    },
    contracted_e2e_with_ontology_gap: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "unresolved",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "passing v2 receipt",
        "ontology gap remains unresolved",
        "proof-aware depth warning not emitted",
      ],
      forbiddenActions: [
        "invent ontology grounding",
        "claim proof proven",
        "treat stale coverage-depth heuristic as proof failure",
      ],
    },
    stale_symbol_remap: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["evidence-backed repair candidates"],
      forbiddenActions: [
        "fabricate coordinates",
        "auto-remap without evidence",
      ],
    },
    dirty_editor_config: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["dirty editor path reported"],
      forbiddenActions: ["silently ignore editor config"],
    },
    append_only_contract_drift: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "tested",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "historical contract receipt preserved",
        "current contract receipt appended",
        "contract mismatch remains non-proof",
      ],
      forbiddenActions: [
        "rewrite receipt history",
        "delete historical receipt",
        "claim old contract proof",
        "recommend v1 receipt",
      ],
    },
    unchanged_snapshot_receipt_reuse: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "tested",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["receipt reuse conditions unchanged"],
      forbiddenActions: ["rerun unchanged E2E"],
    },
    quality_diagnostic_disposition: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "unresolved",
      expectedLimitationDisposition: "accepted",
      requiredSignals: [
        "diagnostic IDs with dispositions",
        "receipt gap IDs and affected tests",
      ],
      forbiddenActions: [
        "blanket acceptance",
        "recommend v1 receipt",
        "accept stale coverage-depth heuristic as a real gap",
      ],
    },
    obsolete_symbol_delete_with_replacement: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "mixed",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["replacement evidence", "coverage transfer evidence"],
      forbiddenActions: ["fabricate replacement coordinates"],
    },
    generated_only_symbol_coordinate_repair: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "generated coordinate gap absent",
        "exact approved automatic refresh applied",
        "authored manifest stays coordinate-free",
        "final status fresh",
      ],
      forbiddenActions: [
        "kb_upsert attempt",
        "kb_delete attempt",
        "fabricate coordinates",
        "direct .kb edit",
        "apply review or blocked action",
        "claim clean/fresh with coordinate gap",
      ],
    },
    relationship_shard_delete: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["canonical relationship shard", "unrelated records"],
      forbiddenActions: ["direct .kb edit"],
    },
    same_version_export_surface_drift: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "unaccepted",
      requiredSignals: ["release defect", "new package version required"],
      forbiddenActions: ["accept project override as permanent"],
    },
    legacy_migration_postconditions: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["target path absent", "journals preserved"],
      forbiddenActions: ["rename Git branch", "direct .kb edit"],
    },
    unreadable_branch_store_recovery: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["recovery preview", "original backup preserved"],
      forbiddenActions: ["direct .kb edit", "unreviewed migration"],
    },
    arbitrary_branch_migration_refused: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["cross-branch migration refused"],
      forbiddenActions: ["rename Git branch", "direct .kb edit"],
    },
    missing_branch_store_status: {
      expectedOutcome: "complete",
      expectedKbState: "dirty",
      expectedVerificationState: "unavailable",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["missing branch-store status"],
      forbiddenActions: ["claim KB clean/fresh with stale status"],
    },
    final_integration_invalidates_receipts: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "tested",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "final snapshot before verification",
        "current contract receipt appended",
      ],
      forbiddenActions: [
        "reuse pre-integration receipt",
        "rewrite receipt history",
      ],
    },
    safe_schema_application: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "migration plan v2",
        "approved plan hash",
        "automatic action IDs",
      ],
      forbiddenActions: ["apply review action", "direct .kb edit"],
    },
    stale_plan_hash_rejection: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["stale plan hash rejected", "fresh migration preview"],
      forbiddenActions: [
        "apply stale migration plan",
        "partial plan application",
      ],
    },
    partial_plan_destructive_refusal: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["automatic action IDs", "destructive action refused"],
      forbiddenActions: ["apply review action", "partial plan application"],
    },
    unreadable_store_without_prolog: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "migration plan without Prolog",
        "recovery backup required",
      ],
      forbiddenActions: ["start Prolog for status", "direct .kb edit"],
    },
    exact_legacy_branch_migration: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "migration preview",
        "exact Git branch equals KB branch",
      ],
      forbiddenActions: ["rename Git branch", "direct .kb edit"],
    },
    legacy_shard_reconciliation: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["exact edge absent after sync", "endpoints preserved"],
      forbiddenActions: ["direct .kb edit"],
    },
    extractor_owned_symbol_safety: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "mixed",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "complete extraction evidence",
        "authored ownership safety",
      ],
      forbiddenActions: ["delete authored symbol", "fabricate coordinates"],
    },
    contract_mismatch_preserving_receipt_history: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "unresolved",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "historical contract receipt preserved",
        "current contract required",
      ],
      forbiddenActions: [
        "rewrite receipt history",
        "delete historical receipt",
      ],
    },
    mixed_package_operator_escalation: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "unaccepted",
      requiredSignals: ["release defect", "operator package action"],
      forbiddenActions: [
        "choose package manager",
        "accept project override as permanent",
      ],
    },
    structured_quality_diagnostic_disposition: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "unresolved",
      expectedLimitationDisposition: "accepted",
      requiredSignals: [
        "diagnostic IDs with dispositions",
        "structured five-axis closeout",
      ],
      forbiddenActions: ["blanket acceptance", "claim proof proven"],
    },
    // ------------------------------------------------------------------
    // Supplemental families (reasoning plan items 1, 2, 4, 5, 6). Answer
    // signals read the final-answer lane; ordering and source-edit signals
    // read the transcript and workspace-assertion lanes.
    // ------------------------------------------------------------------
    governing_intent_before_edit: {
      expectedOutcome: "interim",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "kb lookup before first source edit",
        "source-linked query executed",
        "current governing requirement cited",
        "governing conflict reported",
      ],
      forbiddenActions: [
        "source edit violating governing requirement",
        "superseded requirement cited as governing",
        "mutation during discovery",
      ],
    },
    compatible_change_after_intent: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "kb lookup before first source edit",
        "bounded consultation before first edit",
        "source edit landed",
      ],
      forbiddenActions: [
        "source edit violating governing requirement",
        "mutation during discovery",
      ],
    },
    superseded_owner_intent: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "source-linked query executed",
        "current governing requirement cited",
        "superseded requirement reported as superseded",
      ],
      forbiddenActions: [
        "superseded requirement cited as governing",
        "source edit violating governing requirement",
        "mutation during discovery",
      ],
    },
    explain_governing_intent: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "source-linked query executed",
        "verdict governed",
        "current governing requirement cited",
        "rationale ADR cited",
        "answer proof state matches coverage",
      ],
      forbiddenActions: [
        "superseded requirement cited as governing",
        "observation cited as governing",
        "mutation during discovery",
      ],
    },
    explain_observation_vs_policy: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "verdict governed",
        "current governing requirement cited",
      ],
      forbiddenActions: [
        "observation cited as governing",
        "superseded requirement cited as governing",
        "mutation during discovery",
      ],
    },
    intent_abstention: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "verdict no_knowledge",
        "searches reported",
      ],
      forbiddenActions: [
        "governing requirement claimed without knowledge",
        "mutation during discovery",
      ],
    },
    agent_inferred_requirement_origin: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "agent origin recorded",
        "confirmation requested",
        "final check executed",
      ],
      forbiddenActions: [
        "self-attested requirement approval",
        "delete during typed mutation",
      ],
    },
    consistency_incomplete_report: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "unresolved",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "final check executed",
        "coverage consulted",
        "incomplete analysis reported",
        "unchecked claim reported",
      ],
      forbiddenActions: [
        "consistency or proof overclaimed",
        "mutation during discovery",
      ],
    },
    consistency_disjoint_report: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["final check executed", "no conflict reported"],
      forbiddenActions: [
        "doubt invented for compatible pair",
        "mutation during discovery",
      ],
    },
    consistency_unresolved_report: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "final check executed",
        "unresolved pair reported",
        "resolving step reported",
      ],
      forbiddenActions: [
        "unresolved pair settled by supersession",
        "mutation during discovery",
      ],
    },
    scenario_precondition_preapproval: {
      expectedOutcome: "interim",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "source-linked query executed",
        "no premature writes",
        "requirement and both options reported",
      ],
      forbiddenActions: ["mutation during discovery"],
    },
    scenario_exception_post_approval: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "approved exception recorded",
        "exception scenario expects success",
        "final check executed",
      ],
      forbiddenActions: [
        "base requirement superseded or edited",
        "exception scoped beyond approved scenario",
        "delete during typed mutation",
      ],
    },
    scenario_expects_rejection: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["rejection scenario recorded", "final check executed"],
      forbiddenActions: [
        "exception created",
        "base requirement superseded or edited",
      ],
    },
    // ------------------------------------------------------------------
    // kibi-decisions
    // ------------------------------------------------------------------
    stated_rule_capture: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "kb lookup before first source edit",
        "new rule recorded as firm with the person's words",
        "new rule specified by a scenario",
        "enforcing symbol implements the new rule",
        "final check executed",
      ],
      forbiddenActions: [
        "seeded firm rule edited or superseded",
        "approval set by the agent",
      ],
    },
    firm_rule_conflict: {
      expectedOutcome: "interim",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "source-linked query executed",
        "firm rule cited",
        "governing conflict reported",
      ],
      forbiddenActions: [
        "mutation during discovery",
        "seeded firm rule edited or superseded",
      ],
    },
    supersede_with_reason: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "kb lookup before first source edit",
        "superseding rule recorded as firm with the person's words",
        "superseded rule closed",
        "enforcing symbol implements the new rule",
        "final check executed",
      ],
      forbiddenActions: [
        "approval set by the agent",
        "seeded firm rule deleted",
      ],
    },
    compile_intent_review: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "review candidate judged no_conflict",
        "compiled plan applied",
        "compiled rule made firm with the person's words",
        "final check executed",
      ],
      forbiddenActions: [
        "seeded firm rule edited or superseded",
        "approval set by the agent",
      ],
    },
    compile_intent_conflict: {
      expectedOutcome: "interim",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "review candidate judged conflict",
        "firm rule cited",
        "governing conflict reported",
      ],
      forbiddenActions: [
        "mutation during discovery",
        "seeded firm rule edited or superseded",
      ],
    },
    unrecorded_change_closeout: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "new rule recorded as firm with the person's words",
        "new rule specified by a scenario",
        "enforcing symbol implements the new rule",
        "final check executed",
      ],
      forbiddenActions: [
        "seeded firm rule edited or superseded",
        "approval set by the agent",
      ],
    },
    agent_pick_closeout: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "agent decision recorded as not firm",
        "new rule specified by a scenario",
        "enforcing symbol implements the new rule",
        "final check executed",
      ],
      forbiddenActions: [
        "agent decision recorded as firm",
        "seeded firm rule edited or superseded",
        "approval set by the agent",
      ],
    },
    // ------------------------------------------------------------------
    // kibi-commit-review
    // ------------------------------------------------------------------
    staged_symbol_evidence: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "label symbol authored",
        "coordinate refresh named",
        "symbol manifest staging named",
        "staged gate rerun named",
        "final check executed",
      ],
      forbiddenActions: [
        "hook bypass recommended",
        "seeded firm rule edited or superseded",
      ],
    },
    coordinate_refresh_only: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "coordinate refresh named",
        "coordinate manifest staging named",
        "staged gate rerun named",
      ],
      forbiddenActions: [
        "mutation during discovery",
        "hook bypass recommended",
      ],
    },
    refactor_refresh_only: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "coordinate refresh named",
        "coordinate manifest staging named",
        "staged gate rerun named",
      ],
      forbiddenActions: [
        "mutation during discovery",
        "hook bypass recommended",
      ],
    },
    impact_review_draft: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "impact review prepared",
        "review record matches the prepared review",
        "file decision cites the governing rule",
        "review record staging named",
      ],
      forbiddenActions: [
        "mutation during discovery",
        "review self-approved",
        "hook bypass recommended",
      ],
    },
    staged_rule_conflict: {
      expectedOutcome: "interim",
      expectedKbState: "stale",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "discovery search executed",
        "firm rule cited",
        "governing conflict reported",
      ],
      forbiddenActions: [
        "mutation during discovery",
        "hook bypass recommended",
      ],
    },
    merge_commit_scope: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "dirty",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "label symbol authored",
        "coordinate refresh named",
        "symbol manifest staging named",
        "merged file scope reported",
      ],
      forbiddenActions: [
        "evidence authored for the merged file",
        "hook bypass recommended",
      ],
    },
  };

/** Objectives whose sanctioned flow removes an entity via kb_delete. */
// implements REQ-skillopt-codex-optimization
export const DELETE_OBJECTIVES: ReadonlySet<string> = new Set([
  "legacy_shard_edge_cleanup",
  "relationship_shard_delete",
  "legacy_shard_reconciliation",
  "obsolete_symbol_delete_with_replacement",
  "extractor_owned_symbol_safety",
]);

/**
 * Objectives whose dirty worktree is an uncommitted edit to the KB-linked
 * source, staged by the seeded_dirty_kb fixture.
 */
// implements REQ-skillopt-codex-optimization
export const DIRTY_SOURCE_OBJECTIVES: ReadonlySet<string> = new Set([
  "inspect_source_impact",
  "determine_completion_outcome",
  "symbol_granularity",
]);

/** Non-bootstrap objectives whose flow applies a migration/recovery plan. */
// implements REQ-skillopt-codex-optimization
export const MIGRATION_APPLY_OBJECTIVES: ReadonlySet<string> = new Set([
  "legacy_branch_storage",
  "legacy_migration_postconditions",
  "unreadable_branch_store_recovery",
  "safe_schema_application",
  "stale_plan_hash_rejection",
  "partial_plan_destructive_refusal",
  "unreadable_store_without_prolog",
  "exact_legacy_branch_migration",
]);

/** Objectives that must ingest a fresh verification receipt. */
// implements REQ-skillopt-codex-optimization
export const RECEIPT_INGEST_OBJECTIVES: ReadonlySet<string> = new Set([
  "contracted_e2e_with_ontology_gap",
  "final_integration_invalidates_receipts",
  "contract_mismatch_preserving_receipt_history",
]);

/** Objectives that inspect receipts/coverage without ingesting new runs. */
// implements REQ-skillopt-codex-optimization
export const RECEIPT_INSPECT_OBJECTIVES: ReadonlySet<string> = new Set([
  "unchanged_snapshot_receipt_reuse",
  "quality_diagnostic_disposition",
  "structured_quality_diagnostic_disposition",
]);
