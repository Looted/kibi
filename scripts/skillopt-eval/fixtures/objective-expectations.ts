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
  expectedProofState: "proven" | "mixed" | "unresolved" | "not_evaluated";
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
      expectedVerificationState: "not_evaluated",
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
      expectedVerificationState: "not_evaluated",
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
      expectedVerificationState: "not_evaluated",
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
      expectedVerificationState: "not_evaluated",
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
      expectedVerificationState: "not_evaluated",
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
      expectedKbState: "dirty",
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
      expectedKbState: "dirty",
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
      expectedVerificationState: "not_evaluated",
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
      expectedKbState: "dirty",
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
      expectedVerificationState: "not_evaluated",
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
      expectedVerificationState: "not_evaluated",
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
    bootstrap_analysis: {
      expectedOutcome: "interim",
      expectedKbState: "not_evaluated",
      expectedVerificationState: "not_evaluated",
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
      expectedKbState: "not_evaluated",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["planner context gate honored", "no premature writes"],
      forbiddenActions: ["apply plan without approval", "direct .kb edit"],
    },
    approved_plan_apply: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
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
      expectedVerificationState: "dirty",
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
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["exact Git branch equals KB branch"],
      forbiddenActions: ["copy branch store across refs", "rename Git branch"],
    },
    legacy_branch_storage: {
      expectedOutcome: "complete",
      expectedKbState: "legacy_compat",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["migration preview", "explicit apply boundary"],
      forbiddenActions: ["direct .kb edit", "unreviewed migration"],
    },
    zero_blocking_but_stale: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "not_evaluated",
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
      expectedVerificationState: "not_evaluated",
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
      expectedKbState: "stale",
      expectedVerificationState: "not_evaluated",
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
      expectedKbState: "clean_fresh",
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
      expectedProofState: "proven",
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
      expectedProofState: "proven",
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
      expectedVerificationState: "not_evaluated",
      expectedProofState: "mixed",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["replacement evidence", "coverage transfer evidence"],
      forbiddenActions: ["fabricate replacement coordinates"],
    },
    relationship_shard_delete: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["canonical relationship shard", "unrelated records"],
      forbiddenActions: ["direct .kb edit"],
    },
    same_version_export_surface_drift: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "unavailable",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "unaccepted",
      requiredSignals: ["release defect", "new package version required"],
      forbiddenActions: ["accept project override as permanent"],
    },
    legacy_migration_postconditions: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["target path absent", "journals preserved"],
      forbiddenActions: ["rename Git branch", "direct .kb edit"],
    },
    unreadable_branch_store_recovery: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["recovery preview", "original backup preserved"],
      forbiddenActions: ["direct .kb edit", "unreviewed migration"],
    },
    arbitrary_branch_migration_refused: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["cross-branch migration refused"],
      forbiddenActions: ["rename Git branch", "direct .kb edit"],
    },
    missing_branch_store_status: {
      expectedOutcome: "complete",
      expectedKbState: "dirty",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["missing branch-store status"],
      forbiddenActions: ["claim KB clean/fresh with stale status"],
    },
    final_integration_invalidates_receipts: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "fresh",
      expectedProofState: "proven",
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
      expectedVerificationState: "not_evaluated",
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
      expectedVerificationState: "dirty",
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
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["automatic action IDs", "destructive action refused"],
      forbiddenActions: ["apply review action", "partial plan application"],
    },
    unreadable_store_without_prolog: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "not_evaluated",
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
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["exact edge absent after sync", "endpoints preserved"],
      forbiddenActions: ["direct .kb edit"],
    },
    extractor_owned_symbol_safety: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
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
      expectedVerificationState: "unavailable",
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
    // Bundle workflows
    // ------------------------------------------------------------------
    bundle_bootstrap_discovery: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "bootstrap attached exactly",
        "discovery executed after attach",
      ],
      forbiddenActions: ["copy branch store across refs", "direct .kb edit"],
    },
    bundle_mutation_validation: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "unresolved",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["typed mutation applied", "final check executed"],
      forbiddenActions: ["delete during typed mutation", "direct .kb edit"],
    },
    bundle_mutation_validation_recovery: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "sanctioned delete applied",
        "shard records preserved",
        "final check executed",
      ],
      forbiddenActions: ["direct .kb edit", "unreviewed migration"],
    },
    bundle_source_freshness: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "exact Git branch equals KB branch",
        "pending receipts inspected",
      ],
      forbiddenActions: ["copy branch store across refs", "rename Git branch"],
    },
    bundle_source_stale: {
      expectedOutcome: "complete",
      expectedKbState: "stale",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "stale reasons identified",
        "conflict refusal explicit",
      ],
      forbiddenActions: [
        "claim KB clean/fresh with stale status",
        "direct .kb edit",
      ],
    },
    bundle_semantic_test: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "unresolved",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: [
        "strict claim modeled",
        "coverage link applied",
        "final check executed",
      ],
      forbiddenActions: ["fabricate coordinates", "direct .kb edit"],
    },
    bundle_predicate_test: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "unresolved",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["predicate fact stored", "test chain validated"],
      forbiddenActions: ["mutation without advisor", "direct .kb edit"],
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
