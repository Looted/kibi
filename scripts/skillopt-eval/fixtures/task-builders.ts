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
import {
  type PredicateSemanticClass,
  predicateCaseBySplitIndex,
} from "./predicate-cases";
import type { Definition } from "./task-definition-types";
import {
  INIT_DEFINITIONS,
  TRACEABILITY_DEFINITIONS,
} from "./task-definitions-bootstrap";
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

type DogfoodCase = Readonly<{
  prompt: string;
  objectiveCode: string;
  kb: KnowledgeState;
  worktree: WorktreeState;
  adversarialCases: readonly AdversarialCase[];
  mutation?: "read-only" | "write";
  approvalPhase?: ApprovalPhase;
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
  "kibi-usage": USAGE_DEFINITIONS,
  "kibi-freshness": FRESHNESS_DEFINITIONS,
  "kibi-traceability": TRACEABILITY_DEFINITIONS,
  "init-kibi": INIT_DEFINITIONS,
};
const SKILL_FILES = [
  "skills/kibi-usage/SKILL.md",
  "skills/kibi-freshness/SKILL.md",
  "skills/kibi-traceability/SKILL.md",
  "skills/init-kibi/SKILL.md",
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

function bundle(
  instruction: string,
  objectiveCode: string,
  approvalPhase: ApprovalPhase,
): Definition {
  const stale = objectiveCode.includes("stale");
  const dirty = objectiveCode.includes("source");
  return {
    instruction,
    objectiveCode,
    sourceFile: "src/fixture.ts",
    mutation: approvalPhase === "post-approval" ? "write" : "read-only",
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: stale ? "stale" : "fresh",
    worktree: dirty ? "dirty" : "clean",
    approvalPhase,
    adversarialCases: [
      "misleading-success",
      ...(dirty ? (["dirty-state"] as const) : []),
      ...(stale ? (["stale-state"] as const) : []),
      ...(approvalPhase === "not-applicable"
        ? []
        : (["approval-boundary"] as const)),
    ],
  };
}

const BUNDLE_DEFINITIONS: Readonly<Record<string, Definition>> = {
  "bootstrap-to-discovery-01": bundle(
    "Bootstrap then discover the authored requirement.",
    "bundle_bootstrap_discovery",
    "pre-approval",
  ),
  "bootstrap-to-discovery-02": bundle(
    "Apply an approved bootstrap then perform exact discovery.",
    "bundle_bootstrap_discovery",
    "post-approval",
  ),
  "mutation-to-validation-01": bundle(
    "Apply a typed mutation then validate its final state.",
    "bundle_mutation_validation",
    "post-approval",
  ),
  "mutation-to-validation-02": bundle(
    "Recover a malformed mutation before final validation.",
    "bundle_mutation_validation_recovery",
    "post-approval",
  ),
  "source-to-freshness-01": bundle(
    "Inspect source impact then classify freshness.",
    "bundle_source_freshness",
    "not-applicable",
  ),
  "source-to-freshness-02": bundle(
    "Preserve dirty source evidence while reporting stale state.",
    "bundle_source_stale",
    "not-applicable",
  ),
  "semantic-to-test-01": bundle(
    "Model a strict claim then link executable coverage.",
    "bundle_semantic_test",
    "post-approval",
  ),
  "semantic-to-test-02": bundle(
    "Select a predicate then validate its test chain.",
    "bundle_predicate_test",
    "post-approval",
  ),
};

const DOGFOOD_CASES: Readonly<Record<string, DogfoodCase>> = {
  "kibi-freshness/branch-status-classification/held-out/0": {
    prompt:
      "Resolve the active Git branch exactly. A repository on master must use the master KB namespace; report any legacy storage mapping and never recommend renaming the Git branch.",
    objectiveCode: "exact_branch_identity",
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success"],
  },
  "kibi-freshness/stale-state-recovery/held-out/0": {
    prompt:
      "A historical KB is stored under main while Git is on master. Preview the sanctioned branch-storage migration, require explicit apply, and never edit .kb directly.",
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
      "A valid v2 receipt is rejected by a stale installed schema. Diagnose the mixed package set, repair distribution selection, and never downgrade or hand-edit the receipt.",
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
      "Use the exact verification contract and reporter artifact to record a passing v2 E2E receipt. Mark the task complete while keeping overall proof unresolved when ontology gaps remain.",
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
      "The KB check is clean, but verificationSnapshotChanges identifies a dirty editor configuration. Report the exact path and classify the task independently from that verification state.",
    objectiveCode: "dirty_editor_config",
    kb: "fresh",
    worktree: "dirty",
    adversarialCases: ["dirty-state", "misleading-success"],
  },
  "kibi-traceability/executable-coverage/held-out/1": {
    prompt:
      "A clean KB has passing E2E evidence for part of the scope and unresolved proof for the rest. Report a complete task with fresh verification and mixed proof; do not collapse the axes.",
    objectiveCode: "fresh_clean_mixed_proof",
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
      "Review every quality diagnostic by ID and record fixed, accepted, or deferred with rationale. Preserve accepted ontology and telemetry limitations without claiming proof.",
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
      "A relationship is still authored by Markdown. Attempt the sanctioned exact relationship delete, report source_owned_relationship with the source path, and do not edit a legacy shard.",
    objectiveCode: "source_owned_relationship_delete",
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
      "After an explicit legacy branch migration, verify target-path absence, journal and audit preservation, exact Git attachment, and fresh status. Never rename Git master or edit branch storage directly.",
    objectiveCode: "legacy_migration_postconditions",
    kb: "stale",
    worktree: "clean",
    adversarialCases: ["stale-state", "approval-boundary"],
    mutation: "write",
    approvalPhase: "post-approval",
  },
};

/**
 * Predicate-family cases are dispatched to the semantically distinct registry
 * so each of the seven cases carries a distinct claim-derived prompt and
 * objective. This avoids split-suffix semantics (e.g. "train case 1").
 */
function predicatePayload(
  definition: Definition,
  split: TaskSplit,
  index: number,
): FamilyPayload {
  const semanticCase = predicateCaseBySplitIndex(split, index);
  const claimPrompt = `Model the complete normative claim through Kibi's clause-complete logical workflow using only the public MCP surface. Claim: "${semanticCase.publicClaim.claimText}" Decompose every atomic obligation, preserve each advisor-issued claim key on its ground fact, and merge the complete logic_claims manifest; one correct fact is not sufficient for compound prose. Treat structured projectLocalSchemas in predicate-claim.json as approved ontology declarations; when a declared schema endpoint is absent, create that schema before its ground predicate fact. Relationship types remain graph edges, not predicate names.`;
  const objectiveByClass: Readonly<Record<PredicateSemanticClass, string>> = {
    builtin_relational: "model_predicate_builtin_relational",
    strict_scalar_counterexample: "model_predicate_strict_scalar",
    project_local_schema: "model_predicate_project_local_schema",
    deny_polarity: "model_predicate_deny_polarity",
    ambiguous: "model_predicate_ambiguous",
    ontology_gap: "model_predicate_ontology_gap",
    keyword_false_positive: "model_predicate_keyword_false_positive",
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
  const conditionalFiles = [
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
  ];
  return {
    prompt: `${special?.prompt ?? `${definition.instruction} This is ${split} case ${index + 1}; use only the public Kibi MCP surface.`}`,
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

class TaskDefinitionError extends Error {
  readonly name = "TaskDefinitionError";
}

// implements REQ-skillopt-predicate-first-requirements
// implements REQ-skillopt-codex-optimization
export function buildFamilyPayload(context: BuilderContext): FamilyPayload {
  const definition = DEFINITIONS[context.skill][context.family];
  if (definition === undefined)
    throw new TaskDefinitionError(`unknown task family: ${context.family}`);
  if (context.family === "fact-predicate-modeling") {
    return predicatePayload(definition, context.split, context.index);
  }
  const special =
    DOGFOOD_CASES[
      `${context.skill}/${context.family}/${context.split}/${context.index}`
    ];
  return payload(definition, context.split, context.index, special);
}

// implements REQ-skillopt-codex-optimization
export function buildBundlePayload(workflow: string): FamilyPayload {
  const definition = BUNDLE_DEFINITIONS[workflow];
  if (definition === undefined)
    throw new TaskDefinitionError(`unknown bundle workflow: ${workflow}`);
  return payload(
    definition,
    "held-out",
    Number.parseInt(workflow.slice(-2), 10) - 1,
  );
}
