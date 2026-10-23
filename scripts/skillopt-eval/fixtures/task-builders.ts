import type {
  ActivationMode,
  AdversarialCase,
  ApprovalPhase,
  CanonicalSkill,
  KnowledgeState,
  RepositoryState,
  TaskSplit,
  WorktreeState,
} from "../catalog";
import { bootstrapDialogueInstruction } from "./bootstrap-user";
import {
  KIBI_ANSWER_FORMAT_INSTRUCTION,
  answerScoredObjective,
} from "./case-contracts";
import {
  type PredicateFamily,
  type PredicateSemanticClass,
  isPredicateFamily,
  predicateCaseBySplitIndex,
} from "./predicate-cases";
import type { Definition } from "./task-definition-types";
import {
  BOOTSTRAP_DEFINITIONS,
  TRACEABILITY_DEFINITIONS,
} from "./task-definitions-bootstrap";
import {
  COMMIT_REVIEW_DEFINITIONS,
  COMMIT_REVIEW_SUPPLEMENTAL_DEFINITION,
  DECISIONS_DEFINITIONS,
  DECISIONS_SUPPLEMENTAL_DEFINITION,
  DECISION_CASES,
} from "./task-definitions-decisions";
import {
  type DogfoodCase,
  SUPPLEMENTAL_CASES,
  SUPPLEMENTAL_DEFINITIONS,
} from "./task-definitions-supplemental";
import {
  FRESHNESS_DEFINITIONS,
  USAGE_DEFINITIONS,
} from "./task-definitions-usage";
type BuilderContext = Readonly<{
  skill: CanonicalSkill;
  family: string;
  split: TaskSplit;
  index: number;
}>;

export type FamilyPayload = Readonly<{
  prompt: string;
  activationMode: ActivationMode;
  initialState: Readonly<{
    repository: RepositoryState;
    kb: KnowledgeState;
    worktree: WorktreeState;
    setupBoundary: "external-kibi-adapter";
  }>;
  allowedPublicFiles: readonly string[];
  taskData: Readonly<{
    objectiveCode: string;
    sourceFile: string;
    mutation: "read-only" | "write";
    approvalPhase: ApprovalPhase;
    adversarialCases: readonly AdversarialCase[];
  }>;
}>;

const DEFINITIONS: Readonly<
  Record<CanonicalSkill, Readonly<Record<string, Definition>>>
> = {
  "kibi-usage": {
    ...USAGE_DEFINITIONS,
    ...SUPPLEMENTAL_DEFINITIONS["kibi-usage"],
  },
  "kibi-freshness": {
    ...FRESHNESS_DEFINITIONS,
    ...SUPPLEMENTAL_DEFINITIONS["kibi-freshness"],
  },
  "kibi-traceability": {
    ...TRACEABILITY_DEFINITIONS,
    ...SUPPLEMENTAL_DEFINITIONS["kibi-traceability"],
  },
  "kibi-bootstrap": {
    ...BOOTSTRAP_DEFINITIONS,
    ...SUPPLEMENTAL_DEFINITIONS["kibi-bootstrap"],
  },
  "kibi-decisions": {
    ...DECISIONS_DEFINITIONS,
    "unrecorded-change-closeout": DECISIONS_SUPPLEMENTAL_DEFINITION,
  },
  "kibi-commit-review": {
    ...COMMIT_REVIEW_DEFINITIONS,
    "merge-commit-scope": COMMIT_REVIEW_SUPPLEMENTAL_DEFINITION,
  },
};
const SKILL_FILES = [
  "skills/kibi-usage/SKILL.md",
  "skills/kibi-freshness/SKILL.md",
  "skills/kibi-traceability/SKILL.md",
  "skills/kibi-bootstrap/SKILL.md",
  "skills/kibi-decisions/SKILL.md",
  "skills/kibi-commit-review/SKILL.md",
  "skills/bundle.json",
] as const;
const BASE_FILES = [
  "package.json",
  "documentation/requirements/fixture.md",
  "src/fixture.ts",
  "fixture-state.json",
  "kibi-adapter.json",
  "task-input.json",
] as const;
const SAFE_MUTATION_FILES = [
  "documentation/tests/fixture.md",
  "mutation-request.json",
] as const;

const DOGFOOD_CASES: Readonly<Record<string, DogfoodCase>> = {
  "kibi-freshness/branch-status-classification/held-out/0": {
    prompt:
      "Resolve the active Git branch exactly, including slash, Unicode, @, main, and master refs. Materialize only that branch's hashed store; report any legacy mapping and never recommend renaming or copying a store.",
    objectiveCode: "exact_branch_identity",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success"],
  },
  "kibi-freshness/stale-state-recovery/held-out/0": {
    prompt:
      "A historical literal-path KB is attached while Git uses an exact slash or Unicode ref. Preview the explicit old/new migration, require hash-bound apply, and never edit .kb directly.",
    objectiveCode: "legacy_branch_storage",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
  },
  "kibi-freshness/completion-outcome/held-out/0": {
    prompt:
      "Classify a run with zero blocking checks but stale sync caused by deleted symbol files. Report the exact stale symbols, mark the task complete, and report KB state stale separately.",
    objectiveCode: "zero_blocking_but_stale",
    kb: "stale",
    worktree: "dirty",
    adversarialCases: ["stale-state", "dirty-state", "misleading-success"],
  },
  "kibi-usage/validation-recovery/held-out/0": {
    prompt:
      "A valid v2 receipt is rejected by a stale installed schema. Diagnose the mixed package set through the versioned envelope, repair distribution selection, and never downgrade, hand-edit, or retry a committed mutation.",
    objectiveCode: "stale_v2_schema",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["malformed-input", "misleading-success"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-traceability/relationship-chain/held-out/0": {
    prompt:
      "Remove one exact legacy-shard relationship through the sanctioned delete operation, preserve both endpoints, sync, and verify that the edge stays absent.",
    objectiveCode: "legacy_shard_edge_cleanup",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-traceability/executable-coverage/held-out/0": {
    prompt:
      "Use the exact proof contract through kibi prove to append a passing kibi.proof-receipt.v1. Mark the task complete while keeping overall proof unresolved when ontology gaps remain, and do not accept a contradictory coverage-depth warning when current passingE2e evidence is present.",
    objectiveCode: "contracted_e2e_with_ontology_gap",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-traceability/symbol-impact-granularity/held-out/0": {
    prompt:
      "A catalogued symbol points at a deleted production file. Produce evidence-backed remap or obsolete-delete options and never invent coordinates.",
    objectiveCode: "stale_symbol_remap",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "misleading-success"],
  },
  "kibi-freshness/completion-outcome/held-out/1": {
    prompt:
      "The KB check is clean, but proofSnapshotChanges identifies a dirty editor configuration. Report the exact path and classify the task independently from that proof state.",
    objectiveCode: "dirty_editor_config",
    kb: "fresh",
    worktree: "dirty",
    adversarialCases: ["dirty-state", "misleading-success"],
  },
  "kibi-traceability/executable-coverage/held-out/1": {
    prompt:
      "A test has append-only passing receipts for an earlier verification contract, and the contract has now changed. Preserve the historical receipts, keep proof unresolved for the mismatch, run the exact current contract, append its receipt, and verify that only current-contract evidence proves the test.",
    objectiveCode: "append_only_contract_drift",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-traceability/executable-coverage/held-out/2": {
    prompt:
      "The live snapshot, contract hash, freshness window, and required cases are unchanged since the passing receipt. Reuse the receipt, do not rerun the E2E command, and explain the evidence.",
    objectiveCode: "unchanged_snapshot_receipt_reuse",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-usage/validation-recovery/held-out/1": {
    prompt:
      "Review every quality diagnostic by ID and record fixed, accepted, or deferred with rationale. Preserve accepted ontology and telemetry limitations without claiming proof. For receipt freshness, identify affected requirement/test IDs and direct the agent to kibi prove with current proof receipts; distinguish a stale coverage-depth heuristic from an independent proof gap.",
    objectiveCode: "quality_diagnostic_disposition",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-traceability/symbol-impact-granularity/held-out/1": {
    prompt:
      "An obsolete extracted symbol has a verified replacement. Delete only the obsolete symbol through Kibi, transfer coverage only where test evidence supports it, sync, and read back the result.",
    objectiveCode: "obsolete_symbol_delete_with_replacement",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-traceability/relationship-chain/held-out/1": {
    prompt:
      "A relationship is authored in a tracked YAML shard. Apply the sanctioned exact relationship delete through Kibi, preserve comments/order and unrelated records, and verify the source diff and compiled state from the typed result envelope.",
    objectiveCode: "relationship_shard_delete",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["approval-boundary", "misleading-success"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-usage/validation-recovery/held-out/2": {
    prompt:
      "Local and registry artifacts share a version but expose different exports. Diagnose this as a release defect, require a new package version, and label the project override temporary; do not downgrade receipts.",
    objectiveCode: "same_version_export_surface_drift",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["malformed-input", "misleading-success"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-freshness/branch-status-classification/held-out/1": {
    prompt:
      "After an explicit legacy literal-store migration, verify hashed target identity, journal and audit preservation, exact Git attachment, and fresh status. Never rename a Git ref or edit branch storage directly.",
    objectiveCode: "legacy_migration_postconditions",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-freshness/stale-state-recovery/held-out/1": {
    prompt:
      "A branch store cannot be attached because legacy migration validation fails. Inspect status, preview the sanctioned branch recovery, preserve the original backup, and never move .kb by hand.",
    objectiveCode: "unreadable_branch_store_recovery",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-freshness/branch-status-classification/held-out/2": {
    prompt:
      "Git is on develop and a healthy master KB exists. Refuse to use branch migrate as a cross-branch clone; explain the supported ensure or recovery boundaries without editing .kb.",
    objectiveCode: "arbitrary_branch_migration_refused",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success"],
  },
  "kibi-freshness/branch-status-classification/held-out/3": {
    prompt:
      "The exact branch has no KB store or sync metadata. Report the structured missing-store status and the sanctioned initialization command; never call the state clean or fresh.",
    objectiveCode: "missing_branch_store_status",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "misleading-success"],
  },
  "kibi-traceability/symbol-impact-granularity/held-out/2": {
    prompt:
      "A catalogued symbol still matches complete current extraction, but its persisted RDF entity lost the generated source coordinates while source, artifact, and cache still agree. Discover the exact automatic coordinate-refresh action, apply it once with the unchanged plan, exact approved hash, and only that ready automatic action ID. Verify with exact symbol readback, clean check, fresh status, unchanged graph, and symbol coverage showing no coordinate gap. Never upsert, delete, remap, fabricate coordinates, or touch .kb directly.",
    objectiveCode: "generated_only_symbol_coordinate_repair",
    kb: "fresh",
    worktree: "clean",
    // Divergence is created by evaluator-owned setup, not a stale snapshot
    // fixture, so the stale-state artifact pair stays unused here.
    adversarialCases: ["misleading-success", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-traceability/executable-coverage/held-out/3": {
    prompt:
      "A standardization branch has passing receipts, but final integration also merges dependency pins. Merge and establish the final snapshot first, then run only the exact current contracts and append receipts; never reuse pre-integration evidence as proof.",
    objectiveCode: "final_integration_invalidates_receipts",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-usage/discovery-exact-lookup/held-out/0": {
    prompt:
      "Preview a kibi.migration-plan.v2 for a legacy schema and apply only ready automatic actions with the exact approved plan hash; keep semantic work out of safe application.",
    objectiveCode: "safe_schema_application",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-usage/discovery-exact-lookup/held-out/1": {
    prompt:
      "A migration plan was regenerated after a source change. Reject the stale approved plan hash and require a fresh preview; never apply a partial or unlisted action set.",
    objectiveCode: "stale_plan_hash_rejection",
    kb: "stale",
    worktree: "dirty",
    adversarialCases: ["stale-state", "dirty-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-freshness/source-linked-impact/held-out/0": {
    prompt:
      "A migration plan contains a destructive review action and one safe automatic action. Apply only the explicit automatic action IDs and refuse the partial plan that would include the destructive action.",
    objectiveCode: "partial_plan_destructive_refusal",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-freshness/source-linked-impact/held-out/1": {
    prompt:
      "The branch store is unreadable. Produce the migration plan without starting Prolog, preserve the recovery backup requirement, and apply only the sanctioned recovery action after approval.",
    objectiveCode: "unreadable_store_without_prolog",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-traceability/requirement-discovery/held-out/0": {
    prompt:
      "On an exact Git ref with only a historical literal store, preview and explicitly apply the old/new migration. Keep the Git ref unchanged and verify the hashed manifest attachment afterward.",
    objectiveCode: "exact_legacy_branch_migration",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-traceability/requirement-discovery/held-out/1": {
    prompt:
      "Reconcile a stale legacy-shard relationship only when current authored sources prove it absent. Preserve endpoints, sync, and read back the exact edge deletion through Kibi.",
    objectiveCode: "legacy_shard_reconciliation",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-bootstrap/bootstrap-analysis/held-out/0": {
    prompt:
      "An extractor-owned symbol disappeared from complete current extraction. Delete it only when it has no authored ownership or live relationships; never delete an authored symbol automatically.",
    objectiveCode: "extractor_owned_symbol_safety",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-bootstrap/bootstrap-analysis/held-out/1": {
    prompt:
      "Historical receipts disagree with the current verification contract. Preserve append-only history, report the mismatch, and require a current-contract run without rewriting receipt records.",
    objectiveCode: "contract_mismatch_preserving_receipt_history",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
  "kibi-bootstrap/bounded-context-questions/held-out/0": {
    prompt:
      "Mixed Kibi package versions expose incompatible APIs. Escalate an operator release action with exact versions and exports; do not choose a package manager or treat a local override as permanent.",
    objectiveCode: "mixed_package_operator_escalation",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["malformed-input", "misleading-success"],
  },
  "kibi-bootstrap/bounded-context-questions/held-out/1": {
    prompt:
      "For every quality diagnostic, return an ID-specific fixed, accepted, or deferred disposition with rationale. Keep accepted limitations separate from proof and include the structured five-axis closeout.",
    objectiveCode: "structured_quality_diagnostic_disposition",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
};

/**
 * Predicate-family cases are dispatched to the semantically distinct registry
 * so each case carries a distinct claim-derived prompt and
 * objective. This avoids split-suffix semantics (e.g. "train case 1").
 */
function predicatePayload(
  definition: Definition,
  family: PredicateFamily,
  split: TaskSplit,
  index: number,
): FamilyPayload {
  const semanticCase = predicateCaseBySplitIndex(split, index, family);
  const claimPrompt = `Model the complete normative claim through Kibi's clause-complete logical workflow using only the public MCP surface. Before any kb_upsert (including a dryRun: true validation), call kb_search then kb_query. Claim: "${semanticCase.publicClaim.claimText}" Decompose the claim into its atomic obligations: compound prose with independent obligations needs one ground fact and claim key per obligation, while one obligation that relates several arguments stays a single fact with a single claim key. Preserve each advisor-issued claim key on its ground fact and merge the complete logic_claims manifest. Treat structured projectLocalSchemas in predicate-claim.json as approved ontology declarations; when a declared schema endpoint is absent, create that schema before its ground predicate fact. Relationship types remain graph edges, not predicate names.`;
  const objectiveByClass: Readonly<Record<PredicateSemanticClass, string>> = {
    builtin_relational: "model_predicate_builtin_relational",
    strict_scalar_counterexample: "model_predicate_strict_scalar",
    project_local_schema: "model_predicate_project_local_schema",
    deny_polarity: "model_predicate_deny_polarity",
    ambiguous: "model_predicate_ambiguous",
    ontology_gap: "model_predicate_ontology_gap",
    keyword_false_positive: "model_predicate_keyword_false_positive",
    necessary_condition: "model_predicate_necessary_condition",
    compound_obligations: "model_predicate_compound_obligations",
    exception_unless: "model_predicate_exception_unless",
  };
  const conditionalFiles = [
    ...(definition.worktree === "dirty" ? ["changes/uncommitted.patch"] : []),
    ...(definition.kb === "stale" ? ["generated/stale-snapshot.json"] : []),
    ...(definition.approvalPhase === "not-applicable"
      ? []
      : ["approval-state.json"]),
    ...(definition.adversarialCases.includes("malformed-input")
      ? ["inputs/malformed.json"]
      : []),
    ...(definition.adversarialCases.includes("misleading-success")
      ? ["agent-output.txt"]
      : []),
    ...(definition.adversarialCases.includes("interruption-cleanup")
      ? ["interruption-plan.json"]
      : []),
    "predicate-claim.json",
  ];
  return {
    prompt: claimPrompt,
    activationMode: definition.activationMode,
    initialState: {
      repository: definition.repository,
      kb: definition.kb,
      worktree: definition.worktree,
      setupBoundary: "external-kibi-adapter",
    },
    allowedPublicFiles: [
      ...BASE_FILES,
      ...SKILL_FILES,
      ...conditionalFiles,
    ].sort(),
    taskData: {
      objectiveCode: objectiveByClass[semanticCase.semanticClass],
      sourceFile: definition.sourceFile,
      mutation: definition.mutation,
      approvalPhase: definition.approvalPhase,
      adversarialCases: definition.adversarialCases,
    },
  };
}

function payload(
  definition: Definition,
  split: TaskSplit,
  index: number,
  special?: DogfoodCase,
): FamilyPayload {
  const effectiveAdversarialCases =
    special?.adversarialCases ?? definition.adversarialCases;
  const effectiveApprovalPhase =
    special?.approvalPhase ?? definition.approvalPhase;
  const effectiveObjectiveCode =
    special?.objectiveCode ?? definition.objectiveCode;
  const dialogue = bootstrapDialogueInstruction(effectiveObjectiveCode, split);
  const conditionalFiles = [
    ...(dialogue !== undefined ? ["documentation/library-policy.md"] : []),
    ...(effectiveObjectiveCode === "onboarding_evidence_review"
      ? ["src/onboarding-review.json"]
      : []),
    ...((special?.worktree ?? definition.worktree) === "dirty"
      ? ["changes/uncommitted.patch"]
      : []),
    ...((special?.kb ?? definition.kb) === "stale"
      ? ["generated/stale-snapshot.json"]
      : []),
    ...(effectiveApprovalPhase === "not-applicable"
      ? []
      : ["approval-state.json"]),
    ...(effectiveAdversarialCases.includes("malformed-input")
      ? ["inputs/malformed.json"]
      : []),
    ...(effectiveAdversarialCases.includes("misleading-success")
      ? ["agent-output.txt"]
      : []),
    ...(effectiveAdversarialCases.includes("interruption-cleanup")
      ? ["interruption-plan.json"]
      : []),
    ...(effectiveObjectiveCode === "safe_typed_mutation"
      ? SAFE_MUTATION_FILES
      : []),
    ...(effectiveObjectiveCode === "generated_only_symbol_coordinate_repair"
      ? COORDINATE_REPAIR_FILES
      : []),
  ];
  const searchThenQuery =
    (special?.mutation ?? definition.mutation) === "write"
      ? " Before kb_upsert (including a dryRun: true validation), kb_apply_plan, or kb_check, call kb_search then kb_query."
      : "";
  const answerFormat = answerScoredObjective(effectiveObjectiveCode)
    ? KIBI_ANSWER_FORMAT_INSTRUCTION
    : "";
  return {
    prompt: `${special?.prompt ?? `${dialogue ?? definition.instruction} This is ${split} case ${index + 1}; ${dialogue !== undefined || effectiveObjectiveCode === "onboarding_evidence_review" ? "use ordinary file-reading tools for the supplied source files and the public Kibi MCP surface for knowledge-base operations." : "use only the public Kibi MCP surface."}`}${searchThenQuery}${answerFormat}`,
    activationMode: definition.activationMode,
    initialState: {
      repository: definition.repository,
      kb: special?.kb ?? definition.kb,
      worktree: special?.worktree ?? definition.worktree,
      setupBoundary: "external-kibi-adapter",
    },
    allowedPublicFiles: [
      ...BASE_FILES,
      ...SKILL_FILES,
      ...conditionalFiles,
    ].sort(),
    taskData: {
      objectiveCode: effectiveObjectiveCode,
      sourceFile: definition.sourceFile,
      mutation: special?.mutation ?? definition.mutation,
      approvalPhase: effectiveApprovalPhase,
      adversarialCases: effectiveAdversarialCases,
    },
  };
}

const COORDINATE_REPAIR_FILES = ["symbol-coordinate-repair.json"] as const;

class TaskDefinitionError extends Error {
  readonly name = "TaskDefinitionError";
}

// implements REQ-skillopt-predicate-first-requirements
// implements REQ-skillopt-codex-optimization
export function buildFamilyPayload(context: BuilderContext): FamilyPayload {
  const definition = DEFINITIONS[context.skill][context.family];
  if (definition === undefined)
    throw new TaskDefinitionError(`unknown task family: ${context.family}`);
  if (isPredicateFamily(context.family)) {
    return predicatePayload(
      definition,
      context.family,
      context.split,
      context.index,
    );
  }
  const slot = `${context.skill}/${context.family}/${context.split}/${context.index}`;
  const special =
    DOGFOOD_CASES[slot] ?? SUPPLEMENTAL_CASES[slot] ?? DECISION_CASES[slot];
  return payload(definition, context.split, context.index, special);
}
