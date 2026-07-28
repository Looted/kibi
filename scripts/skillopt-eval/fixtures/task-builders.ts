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
  const claimPrompt = `Model the following normative claim through the predicate-first Kibi workflow using only the public MCP surface. Claim: "${semanticCase.publicClaim.claimText}"`;
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
): FamilyPayload {
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
  ];
  return {
    prompt: `${definition.instruction} This is ${split} case ${index + 1}; use only the public Kibi MCP surface.`,
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
      objectiveCode: definition.objectiveCode,
      sourceFile: definition.sourceFile,
      mutation: definition.mutation,
      approvalPhase: definition.approvalPhase,
      adversarialCases: definition.adversarialCases,
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
  return payload(definition, context.split, context.index);
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
