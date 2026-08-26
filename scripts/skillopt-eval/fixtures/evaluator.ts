import { createHash } from "node:crypto";
import type { CatalogSkill } from "../catalog";
import type { parseTaskSpec } from "./contracts";
import type { parsePrivateEvaluatorManifest } from "./evaluator-contracts";
import {
  DELETE_OBJECTIVES,
  MIGRATION_APPLY_OBJECTIVES,
  OBJECTIVE_WORKFLOWS,
  RECEIPT_INGEST_OBJECTIVES,
  RECEIPT_INSPECT_OBJECTIVES,
  isPredicateObjective,
} from "./objective-expectations";
import { predicateCaseById } from "./predicate-cases";
import { fixtureSymbolId } from "./workspace";

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
  "kibi-bootstrap": ["kb_plan_bootstrap"],
  bundle: ["kb_plan_bootstrap", "kb_search", "kb_query", "kb_check"],
};

function coordinateFinalStateRequests(taskId: string) {
  const symbolId = fixtureSymbolId(taskId);
  return [
    { tool: "kb_query", args: { type: "symbol", id: symbolId } },
    { tool: "kb_check", args: {} },
    { tool: "kb_status", args: {} },
    { tool: "kb_graph", args: { seedIds: [symbolId] } },
    { tool: "kb_coverage", args: { by: "symbol", includePassing: true } },
  ] as const;
}

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

const ADVISOR_READ_TOOLS = [
  "kb_search",
  "kb_query",
  "kb_semantic_advisor",
  "kb_suggest_predicates",
  "kb_model_requirement",
] as const;

const COORDINATE_REPAIR_CALLS = [
  "kb_search",
  "kb_query",
  "kb_status",
  "kb_coverage",
  "kb_apply_plan",
  "kb_query",
  "kb_check",
  "kb_status",
  "kb_coverage",
] as const;

function requiredTools(task: FixtureTaskSpec): readonly string[] {
  const objective = task.taskData.objectiveCode;
  if (objective === "generated_only_symbol_coordinate_repair") {
    return [...COORDINATE_REPAIR_CALLS];
  }
  if (isPredicateObjective(objective)) {
    return [...ADVISOR_READ_TOOLS, "kb_upsert", "kb_check"];
  }
  if (objective === "append_only_contract_drift") {
    return [
      "kb_search",
      "kb_query",
      "kb_status",
      "kb_ingest_verification",
      "kb_coverage",
      "kb_check",
    ];
  }
  if (RECEIPT_INGEST_OBJECTIVES.has(objective)) {
    return dedupe([
      ...READ_TOOLS[task.skill],
      "kb_status",
      "kb_ingest_verification",
      "kb_coverage",
      "kb_check",
    ]);
  }
  if (RECEIPT_INSPECT_OBJECTIVES.has(objective)) {
    return dedupe([
      ...READ_TOOLS[task.skill],
      "kb_status",
      "kb_coverage",
      "kb_check",
    ]);
  }
  if (DELETE_OBJECTIVES.has(objective)) {
    return dedupe([
      ...READ_TOOLS[task.skill],
      ...(needsStatus(task) ? ["kb_status"] : []),
      "kb_delete",
      "kb_check",
    ]);
  }
  if (MIGRATION_APPLY_OBJECTIVES.has(objective)) {
    return dedupe([
      ...READ_TOOLS[task.skill],
      "kb_status",
      "kb_apply_plan",
      "kb_check",
    ]);
  }
  const extraStatus = needsStatus(task) ? ["kb_status"] : [];
  const tools =
    task.skill === "kibi-bootstrap" &&
    task.taskData.approvalPhase === "post-approval"
      ? [
          ...READ_TOOLS[task.skill],
          ...extraStatus,
          "kb_apply_plan",
          "kb_check",
          "kb_status",
        ]
      : task.taskData.mutation === "read-only"
        ? [...READ_TOOLS[task.skill], ...extraStatus]
        : [...READ_TOOLS[task.skill], ...extraStatus, "kb_upsert", "kb_check"];
  return dedupe(tools);
}

function needsStatus(task: FixtureTaskSpec): boolean {
  return [
    "exact_branch_identity",
    "legacy_branch_storage",
    "zero_blocking_but_stale",
    "stale_v2_schema",
    "stale_symbol_remap",
    "dirty_editor_config",
    "unchanged_snapshot_receipt_reuse",
    "quality_diagnostic_disposition",
    "obsolete_symbol_delete_with_replacement",
    "relationship_shard_delete",
    "same_version_export_surface_drift",
    "missing_branch_store_status",
    "safe_schema_application",
    "stale_plan_hash_rejection",
    "partial_plan_destructive_refusal",
    "exact_legacy_branch_migration",
    "legacy_shard_reconciliation",
    "extractor_owned_symbol_safety",
    "mixed_package_operator_escalation",
    "structured_quality_diagnostic_disposition",
    "classify_branch_status",
    "recover_stale_state",
    "inspect_source_impact",
    "determine_completion_outcome",
    "discover_requirement",
    "symbol_granularity",
    "trace_relationship_chain",
  ].includes(task.taskData.objectiveCode);
}

function dedupe(tools: readonly string[]): readonly string[] {
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
  const expectation = OBJECTIVE_WORKFLOWS[task.taskData.objectiveCode];
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
      expectedWorkflow?.expectedOutcome === "interim"
        ? {
            // Pre-approval phases never produce a queryable store, so the
            // generic /complete state cannot exist. Success is "the agent
            // planned read-only and stopped", scored by workflow-outcome
            // plus signals; keep a non-critical placeholder so manifests
            // retain their base-assertion shape.
            key: criticalKey,
            query: `state://${input.task.skill}/${input.task.family}/complete`,
            expected: false,
            critical: false,
          }
        : {
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
    finalStateRequests:
      input.task.taskData.objectiveCode ===
      "generated_only_symbol_coordinate_repair"
        ? coordinateFinalStateRequests(input.task.id)
        : undefined,
    fixtureSetup:
      input.task.taskData.objectiveCode ===
      "generated_only_symbol_coordinate_repair"
        ? ("generated_coordinate_divergence" as const)
        : input.task.initialState.kb === "fresh"
          ? ("seeded_fresh_kb" as const)
          : input.task.initialState.kb === "stale"
            ? ("seeded_stale_kb" as const)
            : input.task.initialState.kb === "absent"
              ? ("thin_root_kb" as const)
              : undefined,
    protocolContract:
      input.task.taskData.objectiveCode ===
      "generated_only_symbol_coordinate_repair"
        ? {
            requiredCalls: COORDINATE_REPAIR_CALLS.map((tool) => ({ tool })),
            forbiddenTools: [
              "kb_upsert",
              "kb_delete",
              "kb_ingest_verification",
              "kb_model_requirement",
              "kb_validate_upsert",
            ],
            exactMigrationApply: {
              actionCode: "symbol_refresh_coordinates",
              invocationCommandArgv: [
                "kibi",
                "sync",
                "--refresh-symbol-coordinates",
              ],
            },
          }
        : undefined,
    orderedMcpPredicates: {
      required: requiredTools(input.task).map((tool, index) => ({
        tool,
        predicate: `sequence=${index + 1}`,
      })),
      forbidden: [
        // Deletion-sanctioned objectives require kb_delete; forbidding it
        // there would make the protocol rubric unsatisfiable.
        ...(DELETE_OBJECTIVES.has(input.task.taskData.objectiveCode)
          ? []
          : [
              {
                tool: "kb_delete",
                predicate: "unless task explicitly requires removal",
              },
            ]),
        {
          tool: "kb_upsert",
          // Bootstrap tasks must never hand-replay plan actions; the
          // "unless " prefix makes any direct upsert a protocol violation.
          predicate:
            input.task.skill === "kibi-bootstrap"
              ? "unless explicitly directed by an approved kibi.bootstrap-plan.v1 action"
              : "before discovery or approval",
        },
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
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, canonicalize(item)]),
      );
    }
    return value;
  };
  return (
    JSON.stringify(canonicalize(expected)) ===
    JSON.stringify(canonicalize(manifest))
  );
}
