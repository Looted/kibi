import { createHash } from "node:crypto";
import type { CatalogSkill } from "../catalog";
import type { parseTaskSpec } from "./contracts";
import type { parsePrivateEvaluatorManifest } from "./evaluator-contracts";
import { predicateCaseById } from "./predicate-cases";

type FixtureTaskSpec = ReturnType<typeof parseTaskSpec>;
type PrivateEvaluatorManifest = ReturnType<
  typeof parsePrivateEvaluatorManifest
>;

const BLINDING_SEED = 5417;
const VARIANTS = ["baseline", "one-shot", "skillopt"] as const;
const SLOTS = ["variant-a", "variant-b", "variant-c"] as const;
const READ_TOOLS: Readonly<Record<CatalogSkill, readonly string[]>> = {
  "kibi-usage": ["kb_search", "kb_query"],
  "kibi-freshness": ["kb_status", "kb_query", "kb_check"],
  "kibi-traceability": ["kb_search", "kb_query", "kb_graph"],
  "init-kibi": ["kb_autopilot_generate"],
  bundle: ["kb_autopilot_generate", "kb_search", "kb_query", "kb_check"],
};

class VariantOrderError extends Error {
  readonly name = "VariantOrderError";
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// implements REQ-skillopt-codex-optimization
export function blindedVariantOrder(taskId: string, skill: CatalogSkill) {
  const ordered = VARIANTS.map((variant) => ({
    variant,
    rank: sha256(`${BLINDING_SEED}:${skill}:${taskId}:${variant}`),
  })).sort((left, right) => left.rank.localeCompare(right.rank));
  const [first, second, third] = ordered;
  if (first === undefined || second === undefined || third === undefined) {
    throw new VariantOrderError(
      "canonical variant set must contain three entries",
    );
  }
  return [
    { slot: SLOTS[0], variant: first.variant },
    { slot: SLOTS[1], variant: second.variant },
    { slot: SLOTS[2], variant: third.variant },
  ] as const;
}

function assessment(input: {
  readonly task: FixtureTaskSpec;
  readonly taskCase: FixtureTaskSpec["taskData"]["adversarialCases"][number];
  readonly className:
    | "malformed-task-descriptor"
    | "prompt-injection"
    | "generated-stale-state"
    | "dirty-worktree"
    | "misleading-success-output"
    | "mid-operation-interruption"
    | "approval-boundary";
  readonly fixturePath: string;
}) {
  const applicable = input.task.taskData.adversarialCases.includes(
    input.taskCase,
  );
  return {
    class: input.className,
    applicable,
    reason: applicable
      ? `The workspace includes ${input.fixturePath}.`
      : `The ${input.task.family} family does not exercise ${input.taskCase}.`,
    fixturePath: applicable ? input.fixturePath : null,
    approvalPhase: input.task.taskData.approvalPhase,
  } as const;
}

function adversarialAssessments(task: FixtureTaskSpec) {
  return [
    assessment({
      task,
      taskCase: "malformed-input",
      className: "malformed-task-descriptor",
      fixturePath: "inputs/malformed.json",
    }),
    assessment({
      task,
      taskCase: "prompt-injection",
      className: "prompt-injection",
      fixturePath: "task-input.json",
    }),
    assessment({
      task,
      taskCase: "stale-state",
      className: "generated-stale-state",
      fixturePath: "generated/stale-snapshot.json",
    }),
    assessment({
      task,
      taskCase: "dirty-state",
      className: "dirty-worktree",
      fixturePath: "changes/uncommitted.patch",
    }),
    {
      class: "long-materialization" as const,
      applicable: false,
      reason:
        "Materialization is bounded local I/O and has no timing-based score.",
      fixturePath: null,
      approvalPhase: task.taskData.approvalPhase,
    },
    assessment({
      task,
      taskCase: "misleading-success",
      className: "misleading-success-output",
      fixturePath: "agent-output.txt",
    }),
    assessment({
      task,
      taskCase: "interruption-cleanup",
      className: "mid-operation-interruption",
      fixturePath: "interruption-plan.json",
    }),
    assessment({
      task,
      taskCase: "approval-boundary",
      className: "approval-boundary",
      fixturePath: "approval-state.json",
    }),
  ];
}

function requiredTools(task: FixtureTaskSpec): readonly string[] {
  if (task.taskData.objectiveCode === "append_only_contract_drift") {
    return [
      "kb_search",
      "kb_query",
      "kb_status",
      "kb_ingest_verification",
      "kb_coverage",
      "kb_check",
    ];
  }
  const extraStatus = [
    "exact_branch_identity",
    "legacy_branch_storage",
    "zero_blocking_but_stale",
    "stale_v2_schema",
    "stale_symbol_remap",
    "dirty_editor_config",
    "append_only_contract_drift",
    "unchanged_snapshot_receipt_reuse",
    "quality_diagnostic_disposition",
    "obsolete_symbol_delete_with_replacement",
    "source_owned_relationship_delete",
    "same_version_export_surface_drift",
    "legacy_migration_postconditions",
  ].includes(task.taskData.objectiveCode)
    ? ["kb_status"]
    : [];
  const tools =
    task.taskData.mutation === "read-only"
      ? [...READ_TOOLS[task.skill], ...extraStatus]
      : [...READ_TOOLS[task.skill], ...extraStatus, "kb_upsert", "kb_check"];
  return [...new Set(tools)];
}

function workflowExpectation(task: FixtureTaskSpec) {
  type Workflow = {
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
  };
  const expectations: Readonly<Record<string, Workflow>> = {
    exact_branch_identity: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["exact Git branch equals KB branch"],
      forbiddenActions: ["normalize master to main", "rename Git branch"],
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
      forbiddenActions: ["claim complete with stale KB"],
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
    source_owned_relationship_delete: {
      expectedOutcome: "complete",
      expectedKbState: "clean_fresh",
      expectedVerificationState: "not_evaluated",
      expectedProofState: "not_evaluated",
      expectedLimitationDisposition: "not_applicable",
      requiredSignals: ["source-owned relationship rejection"],
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
  };
  const expectation = expectations[task.taskData.objectiveCode];
  return expectation === undefined ? null : { ...expectation };
}

// implements REQ-skillopt-predicate-first-requirements
function buildPredicateExpectation(task: FixtureTaskSpec) {
  if (task.family !== "fact-predicate-modeling") {
    return null;
  }
  const semanticCase = predicateCaseById(task.id);
  const expectation = semanticCase.privateExpectation;
  return {
    semanticClass: expectation.semanticClass,
    expectedLane: expectation.expectedLane,
    expectedPredicateName: expectation.expectedPredicateName,
    expectedPredicateArgs: expectation.expectedPredicateArgs,
    expectedPolarity: expectation.expectedPolarity,
    expectedEdges: [...expectation.expectedEdges],
    expectedGroundFactKinds: [...expectation.expectedGroundFactKinds],
    expectedLogicClaimCount: expectation.expectedLogicClaimCount,
    privateRationale: expectation.privateRationale,
    coverageFamilies: [
      ...semanticCase.publicClaim.publicSchema.coverageFamilies,
    ],
  };
}

// implements REQ-skillopt-predicate-first-requirements
// implements REQ-skillopt-codex-optimization
export function buildPrivateManifest(input: {
  readonly task: FixtureTaskSpec;
  readonly publicManifestHash: string;
  readonly workspaceHash: string;
}) {
  const criticalKey = `final-${input.task.family}`;
  const workspaceKey = "workspace-isolated";
  const predicateExpectation = buildPredicateExpectation(input.task);
  const expectedWorkflow = workflowExpectation(input.task);
  const workflowAssertion = expectedWorkflow
    ? [
        {
          key: "workflow-outcome",
          query: "workflow://outcome",
          expected: expectedWorkflow.expectedOutcome,
          critical: true,
        },
        ...(
          [
            ["kb-state", expectedWorkflow.expectedKbState],
            ["verification-state", expectedWorkflow.expectedVerificationState],
            ["proof-state", expectedWorkflow.expectedProofState],
            [
              "limitation-disposition",
              expectedWorkflow.expectedLimitationDisposition,
            ],
          ] as const
        ).map(([name, expected]) => ({
          key: `workflow-${name}`,
          query: `workflow://closeout/${name}`,
          expected,
          critical: true,
        })),
        ...expectedWorkflow.requiredSignals.map((_, index) => ({
          key: `workflow-signal-${index + 1}`,
          query: `workflow://signal/${index}`,
          expected: true,
          critical: true,
        })),
        ...expectedWorkflow.forbiddenActions.map((_, index) => ({
          key: `workflow-forbidden-${index + 1}`,
          query: `workflow://forbidden/${index}`,
          expected: true,
          critical: true,
        })),
      ]
    : [];
  return {
    schemaVersion: "1.1.0" as const,
    taskId: input.task.id,
    scorerKey: `scorer-${sha256(`${input.task.scorerReference}:private`).slice(0, 16)}`,
    scorerReference: input.task.scorerReference,
    publicManifestHash: input.publicManifestHash,
    workspaceHash: input.workspaceHash,
    fixtureSeedHash: sha256(input.task.fixtureSeed),
    expectedFinalState: [
      {
        key: criticalKey,
        query: `state://${input.task.skill}/${input.task.family}/complete`,
        expected: true,
        critical: true,
      },
      ...workflowAssertion,
      {
        key: workspaceKey,
        query: "workspace://isolation/sentinel-count",
        expected: 0,
        critical: true,
      },
    ],
    orderedMcpPredicates: {
      required: requiredTools(input.task).map((tool, index) => ({
        tool,
        predicate: `sequence=${index + 1}`,
      })),
      forbidden: [
        {
          tool: "kb_delete",
          predicate: "unless task explicitly requires removal",
        },
        { tool: "kb_upsert", predicate: "before discovery or approval" },
      ],
    },
    isolationSentinels: [
      `PRIVATE_SENTINEL_${sha256(`${input.task.fixtureSeed}:private`).slice(0, 20)}`,
      `SIBLING_SENTINEL_${sha256(`${input.task.fixtureSeed}:sibling`).slice(0, 20)}`,
    ],
    rubric: [
      {
        key: "final_state" as const,
        points: 60 as const,
        criticalAssertionKeys: [
          criticalKey,
          ...(expectedWorkflow
            ? [
                "workflow-outcome",
                "workflow-kb-state",
                "workflow-verification-state",
                "workflow-proof-state",
                "workflow-limitation-disposition",
                ...expectedWorkflow.requiredSignals.map(
                  (_, index) => `workflow-signal-${index + 1}`,
                ),
                ...expectedWorkflow.forbiddenActions.map(
                  (_, index) => `workflow-forbidden-${index + 1}`,
                ),
              ]
            : []),
        ],
      },
      {
        key: "protocol" as const,
        points: 25 as const,
        criticalAssertionKeys: [],
      },
      {
        key: "isolation" as const,
        points: 15 as const,
        criticalAssertionKeys: [workspaceKey],
      },
    ],
    blindedVariants: [...blindedVariantOrder(input.task.id, input.task.skill)],
    adversarialAssessments: adversarialAssessments(input.task),
    predicateExpectation,
    workflowExpectation:
      expectedWorkflow === null
        ? null
        : {
            ...expectedWorkflow,
            closeout: {
              taskOutcome: expectedWorkflow.expectedOutcome,
              kbState: expectedWorkflow.expectedKbState,
              verificationState: expectedWorkflow.expectedVerificationState,
              proofState: expectedWorkflow.expectedProofState,
              limitationDisposition:
                expectedWorkflow.expectedLimitationDisposition,
            },
          },
  };
}

// implements REQ-skillopt-codex-optimization
export function verifyPrivateManifestIntegrity(
  task: FixtureTaskSpec,
  manifest: PrivateEvaluatorManifest,
): boolean {
  const expected = buildPrivateManifest({
    task,
    publicManifestHash: manifest.publicManifestHash,
    workspaceHash: manifest.workspaceHash,
  });
  return JSON.stringify(expected) === JSON.stringify(manifest);
}
