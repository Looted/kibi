import { createHash } from "node:crypto";

export const REPAIR_PLAN_VERSION = "kibi.repair-plan.v1" as const;

type RepairPhaseDefinition = {
  readonly order: number;
  readonly objective: string;
  readonly workflowSteps: readonly string[];
  readonly validationRules: readonly string[];
  readonly writePolicy:
    | "analysis_then_sequential_upsert"
    | "review_then_sequential_upsert"
    | "sequential_upsert"
    | "execute_then_append_receipt"
    | "refresh_then_sync"
    | "runtime_recovery";
};

const REPAIR_PHASES = {
  requirement_source: {
    order: 5,
    objective:
      "Bind the requirement to its current authored source before semantic analysis.",
    workflowSteps: ["kb_query", "kb_validate_upsert", "kb_upsert", "kb_check"],
    validationRules: ["required-fields", "no-dangling-refs"],
    writePolicy: "sequential_upsert",
  },
  semantic_inventory: {
    order: 10,
    objective:
      "Produce and persist a complete source-bound proposition inventory.",
    workflowSteps: [
      "kb_semantic_advisor",
      "kb_validate_upsert",
      "kb_upsert",
      "kb_check",
    ],
    validationRules: ["semantic-completeness", "logic-coverage"],
    writePolicy: "analysis_then_sequential_upsert",
  },
  semantic_resolution: {
    order: 20,
    objective:
      "Resolve ambiguity or ontology gaps without treating unresolved prose as modeled.",
    workflowSteps: [
      "kb_semantic_advisor",
      "kb_suggest_predicates",
      "kb_model_requirement",
      "kb_validate_upsert",
      "kb_upsert",
      "kb_check",
    ],
    validationRules: [
      "semantic-completeness",
      "logic-coverage",
      "predicate-verifiability",
      "rule-safety",
      "rule-verifiability",
    ],
    writePolicy: "review_then_sequential_upsert",
  },
  ground_endpoints: {
    order: 30,
    objective:
      "Create or repair exactly one validated logical endpoint for each modeled proposition.",
    workflowSteps: [
      "kb_suggest_predicates",
      "kb_model_requirement",
      "kb_validate_upsert",
      "kb_upsert",
      "kb_check",
    ],
    validationRules: [
      "strict-fact-shape",
      "predicate-verifiability",
      "rule-safety",
      "rule-verifiability",
      "logic-coverage",
    ],
    writePolicy: "review_then_sequential_upsert",
  },
  manifest_links: {
    order: 40,
    objective:
      "Persist the exact claim manifest and link it one-to-one to existing logical endpoints.",
    workflowSteps: ["kb_query", "kb_validate_upsert", "kb_upsert", "kb_check"],
    validationRules: [
      "semantic-completeness",
      "logic-coverage",
      "predicate-verifiability",
      "rule-safety",
      "rule-verifiability",
      "no-dangling-refs",
    ],
    writePolicy: "sequential_upsert",
  },
  contradiction_resolution: {
    order: 50,
    objective:
      "Inspect exact contradiction witnesses and supersede or reconcile conflicting requirements.",
    workflowSteps: ["kb_query", "kb_validate_upsert", "kb_upsert", "kb_check"],
    validationRules: ["domain-contradictions", "logic-coverage"],
    writePolicy: "review_then_sequential_upsert",
  },
  scenario_endpoints: {
    order: 60,
    objective:
      "Create a scenario endpoint and link the requirement through specified_by.",
    workflowSteps: ["kb_query", "kb_validate_upsert", "kb_upsert", "kb_check"],
    validationRules: ["must-priority-coverage", "no-dangling-refs"],
    writePolicy: "sequential_upsert",
  },
  scenario_tests: {
    order: 70,
    objective:
      "Create or select a test endpoint and link it through the requirement scenario.",
    workflowSteps: ["kb_query", "kb_validate_upsert", "kb_upsert", "kb_check"],
    validationRules: ["must-priority-coverage", "no-dangling-refs"],
    writePolicy: "sequential_upsert",
  },
  snapshot_runtime: {
    order: 75,
    objective:
      "Use a runtime that exposes a deterministic workspace verification snapshot.",
    workflowSteps: ["kb_status", "kb_coverage"],
    validationRules: [],
    writePolicy: "runtime_recovery",
  },
  verification_evidence: {
    order: 80,
    objective:
      "Run the scenario-backed E2E test and append a fresh snapshot-bound passing receipt.",
    workflowSteps: [
      "kb_status",
      "execute_e2e",
      "kb_validate_upsert",
      "kb_upsert",
      "kb_coverage",
    ],
    validationRules: ["required-fields", "no-dangling-refs"],
    writePolicy: "execute_then_append_receipt",
  },
  executable_symbols: {
    order: 90,
    objective:
      "Link executable test symbols to every qualifying E2E test through executable_for.",
    workflowSteps: ["kb_query", "kb_validate_upsert", "kb_upsert", "kb_check"],
    validationRules: ["symbol-traceability", "no-dangling-refs"],
    writePolicy: "sequential_upsert",
  },
  production_ownership: {
    order: 100,
    objective: "Link production symbols to the requirement through implements.",
    workflowSteps: ["kb_query", "kb_validate_upsert", "kb_upsert", "kb_check"],
    validationRules: ["symbol-traceability", "no-dangling-refs"],
    writePolicy: "sequential_upsert",
  },
  production_coverage: {
    order: 110,
    objective:
      "Link every implementing production symbol to a qualifying E2E test through covered_by.",
    workflowSteps: ["kb_query", "kb_validate_upsert", "kb_upsert", "kb_check"],
    validationRules: [
      "symbol-coverage",
      "symbol-traceability",
      "no-dangling-refs",
    ],
    writePolicy: "sequential_upsert",
  },
  source_coordinates: {
    order: 120,
    objective:
      "Refresh symbol extraction and persist exact current source coordinates.",
    workflowSteps: [
      "kibi sync --refresh-symbol-coordinates",
      "kibi sync",
      "kb_check",
      "kb_coverage",
    ],
    validationRules: ["symbol-coverage", "symbol-traceability"],
    writePolicy: "refresh_then_sync",
  },
  manual_review: {
    order: 900,
    objective:
      "Review the unclassified proof gap and choose a conservative repair workflow.",
    workflowSteps: ["kb_query", "kb_check", "kb_coverage"],
    validationRules: [],
    writePolicy: "review_then_sequential_upsert",
  },
} as const satisfies Readonly<Record<string, RepairPhaseDefinition>>;

type RepairPhase = keyof typeof REPAIR_PHASES;

const GAP_PHASE: Readonly<Record<string, RepairPhase>> = {
  missing_requirement_source: "requirement_source",
  missing_semantic_inventory: "semantic_inventory",
  incomplete_semantic_inventory: "semantic_inventory",
  malformed_semantic_inventory: "semantic_inventory",
  unresolved_semantic_proposition: "semantic_resolution",
  missing_logic_grounding: "ground_endpoints",
  ambiguous_logic_grounding: "ground_endpoints",
  contradiction_check_incomplete: "ground_endpoints",
  missing_logic_claims: "manifest_links",
  logic_manifest_mismatch: "manifest_links",
  blocking_contradiction: "contradiction_resolution",
  missing_scenario: "scenario_endpoints",
  missing_scenario_test: "scenario_tests",
  verification_snapshot_unavailable: "snapshot_runtime",
  missing_passing_e2e: "verification_evidence",
  missing_verification_receipt: "verification_evidence",
  stale_verification_receipt: "verification_evidence",
  failed_verification_receipt: "verification_evidence",
  invalid_verification_receipt: "verification_evidence",
  missing_executable_test_symbol: "executable_symbols",
  missing_production_symbol: "production_ownership",
  missing_production_symbol_coverage: "production_coverage",
  missing_symbol_coordinates: "source_coordinates",
};

const GAP_STAGE: Readonly<Record<string, string>> = {
  missing_requirement_source: "source_coordinates",
  missing_semantic_inventory: "semantic_inventory",
  incomplete_semantic_inventory: "semantic_inventory",
  malformed_semantic_inventory: "semantic_inventory",
  unresolved_semantic_proposition: "semantic_inventory",
  missing_logic_claims: "logic_grounding",
  logic_manifest_mismatch: "logic_grounding",
  missing_logic_grounding: "logic_grounding",
  ambiguous_logic_grounding: "logic_grounding",
  blocking_contradiction: "contradictions",
  contradiction_check_incomplete: "contradictions",
  missing_scenario: "scenarios",
  missing_scenario_test: "scenario_tests",
  missing_passing_e2e: "passing_e2e",
  missing_verification_receipt: "passing_e2e",
  stale_verification_receipt: "passing_e2e",
  failed_verification_receipt: "passing_e2e",
  invalid_verification_receipt: "passing_e2e",
  verification_snapshot_unavailable: "passing_e2e",
  missing_executable_test_symbol: "executable_symbols",
  missing_production_symbol: "production_symbols",
  missing_production_symbol_coverage: "production_symbols",
  missing_symbol_coordinates: "source_coordinates",
};

const PROOF_STAGE_KEY: Readonly<Record<string, string>> = {
  semantic_inventory: "semanticInventory",
  logic_grounding: "logicGrounding",
  contradictions: "contradictions",
  scenarios: "scenarios",
  scenario_tests: "scenarioTests",
  passing_e2e: "passingE2e",
  executable_symbols: "executableSymbols",
  production_symbols: "productionSymbols",
  source_coordinates: "sourceCoordinates",
};

export type RepairPlanRepair = {
  readonly requirementId: string;
  readonly gap: string;
  readonly proofPriority: number;
  readonly proofStage: string;
  readonly action: string;
  readonly evidence: Readonly<Record<string, unknown>>;
};

export type RepairPlanBatch = {
  readonly id: string;
  readonly order: number;
  readonly phase: RepairPhase;
  readonly requirementId: string;
  readonly state: "ready" | "blocked";
  readonly dependsOn: readonly string[];
  readonly objective: string;
  readonly workflowSteps: readonly string[];
  readonly validationRules: readonly string[];
  readonly writePolicy: RepairPhaseDefinition["writePolicy"];
  readonly autoApplicable: false;
  readonly repairs: readonly RepairPlanRepair[];
};

export type RepairPlan = {
  readonly version: typeof REPAIR_PLAN_VERSION;
  readonly planId: string;
  readonly readOnly: true;
  readonly status: "no_repairs" | "ready" | "partial";
  readonly codeSnapshot: string;
  readonly scope: {
    readonly by: string;
    readonly tags: readonly string[];
    readonly offset: number;
    readonly limit: number;
    readonly complete: boolean;
    readonly actionableRequirements: number;
    readonly returnedActionableRequirements: number;
    readonly excludedByPagination: number;
  };
  readonly applicationPolicy: {
    readonly queryBeforeMutation: true;
    readonly createEndpointsBeforeRelationships: true;
    readonly validateBeforeEachWrite: true;
    readonly sequentialUpsertsOnly: true;
    readonly recheckCoverageAfterEachBatch: true;
  };
  readonly summary: {
    readonly requirementCount: number;
    readonly repairCount: number;
    readonly batchCount: number;
    readonly readyBatchCount: number;
    readonly blockedBatchCount: number;
  };
  readonly batches: readonly RepairPlanBatch[];
  readonly diagnostics: readonly string[];
};

export type RepairPlanInput = {
  readonly by?: "req" | "symbol" | "type";
  readonly tags?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
};

type CoverageForRepairPlan = {
  readonly summary?: Readonly<Record<string, number>>;
  readonly rows?: readonly Readonly<Record<string, unknown>>[];
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "checkedAt" && key !== "ageSeconds")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function numberField(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function actionForRepair(
  repair: Readonly<Record<string, unknown>> | undefined,
  phase: RepairPhase,
): string {
  return typeof repair?.action === "string"
    ? repair.action
    : REPAIR_PHASES[phase].objective;
}

function stageEvidence(
  row: Readonly<Record<string, unknown>>,
  proofStage: string,
): Readonly<Record<string, unknown>> {
  const stages = isRecord(row.proofStages) ? row.proofStages : {};
  const key = PROOF_STAGE_KEY[proofStage];
  const evidence = key === undefined ? undefined : stages[key];
  const stable = stableValue(evidence);
  return isRecord(stable) ? stable : {};
}

function batchId(requirementId: string, phase: RepairPhase): string {
  const order = String(REPAIR_PHASES[phase].order).padStart(3, "0");
  const safeRequirementId = requirementId.replace(/[^A-Za-z0-9_-]/g, "-");
  return `repair-${order}-${safeRequirementId}-${phase}`;
}

function buildRequirementBatches(
  row: Readonly<Record<string, unknown>>,
): RepairPlanBatch[] {
  const requirementId =
    typeof row.id === "string" ? row.id : "unknown-requirement";
  const gaps = [...new Set(stringList(row.proofGaps))].sort();
  const repairs = Array.isArray(row.proofRepairs)
    ? row.proofRepairs.filter(isRecord)
    : [];
  const repairByGap = new Map(
    repairs.flatMap((repair) =>
      typeof repair.gap === "string" ? [[repair.gap, repair] as const] : [],
    ),
  );
  const byPhase = new Map<RepairPhase, RepairPlanRepair[]>();

  for (const gap of gaps) {
    const phase = GAP_PHASE[gap] ?? "manual_review";
    const sourceRepair = repairByGap.get(gap);
    const proofStage =
      typeof sourceRepair?.stage === "string"
        ? sourceRepair.stage
        : (GAP_STAGE[gap] ?? "manual_review");
    const repair: RepairPlanRepair = {
      requirementId,
      gap,
      proofPriority: numberField(
        sourceRepair?.priority,
        REPAIR_PHASES[phase].order,
      ),
      proofStage,
      action: actionForRepair(sourceRepair, phase),
      evidence: stageEvidence(row, proofStage),
    };
    const phaseRepairs = byPhase.get(phase) ?? [];
    phaseRepairs.push(repair);
    byPhase.set(phase, phaseRepairs);
  }

  const phases = [...byPhase.keys()].sort(
    (left, right) =>
      REPAIR_PHASES[left].order - REPAIR_PHASES[right].order ||
      left.localeCompare(right),
  );
  const priorBatchIds: string[] = [];
  return phases.map((phase) => {
    const definition = REPAIR_PHASES[phase];
    const id = batchId(requirementId, phase);
    const batch: RepairPlanBatch = {
      id,
      order: definition.order,
      phase,
      requirementId,
      state: priorBatchIds.length === 0 ? "ready" : "blocked",
      dependsOn: [...priorBatchIds],
      objective: definition.objective,
      workflowSteps: definition.workflowSteps,
      validationRules: definition.validationRules,
      writePolicy: definition.writePolicy,
      autoApplicable: false,
      repairs: (byPhase.get(phase) ?? []).sort(
        (left, right) =>
          left.proofPriority - right.proofPriority ||
          left.gap.localeCompare(right.gap),
      ),
    };
    priorBatchIds.push(id);
    return batch;
  });
}

function actionableRequirementTotal(
  summary: Readonly<Record<string, number>>,
  fallback: number,
): number {
  const missing = summary.proofMissing;
  const unresolved = summary.proofUnresolved;
  if (typeof missing === "number" && typeof unresolved === "number") {
    return Math.max(0, missing + unresolved);
  }
  return fallback;
}

export function buildRepairPlan(
  payload: CoverageForRepairPlan,
  input: RepairPlanInput,
  codeSnapshot: string,
): RepairPlan | undefined {
  const by = input.by ?? "req";
  if (by !== "req") return undefined;

  const rows = payload.rows ?? [];
  const requirementRows = rows.filter(
    (row) => typeof row.id === "string" && stringList(row.proofGaps).length > 0,
  );
  const batches = requirementRows
    .flatMap(buildRequirementBatches)
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.requirementId.localeCompare(right.requirementId) ||
        left.id.localeCompare(right.id),
    );
  const requirementCount = new Set(batches.map((batch) => batch.requirementId))
    .size;
  const summary = payload.summary ?? {};
  const actionableRequirements = actionableRequirementTotal(
    summary,
    requirementCount,
  );
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 100;
  const complete = offset === 0 && requirementCount >= actionableRequirements;
  const excludedByPagination = Math.max(
    0,
    actionableRequirements - requirementCount,
  );
  const repairCount = batches.reduce(
    (count, batch) => count + batch.repairs.length,
    0,
  );
  const readyBatchCount = batches.filter(
    (batch) => batch.state === "ready",
  ).length;
  const blockedBatchCount = batches.length - readyBatchCount;
  const diagnostics = complete
    ? []
    : [
        `Repair plan is partial: ${excludedByPagination} actionable requirement(s) were excluded by coverage pagination; rerun with offset 0 and a larger limit.`,
      ];
  const planCore = {
    version: REPAIR_PLAN_VERSION,
    codeSnapshot,
    scope: {
      by,
      tags: [...(input.tags ?? [])].sort(),
      offset,
      limit,
      complete,
      actionableRequirements,
      returnedActionableRequirements: requirementCount,
      excludedByPagination,
    },
    batches,
  };
  const planId = `repair-plan-${createHash("sha256")
    .update(stableStringify(planCore))
    .digest("hex")
    .slice(0, 24)}`;

  return {
    version: REPAIR_PLAN_VERSION,
    planId,
    readOnly: true,
    status:
      repairCount === 0 && complete
        ? "no_repairs"
        : complete
          ? "ready"
          : "partial",
    codeSnapshot,
    scope: planCore.scope,
    applicationPolicy: {
      queryBeforeMutation: true,
      createEndpointsBeforeRelationships: true,
      validateBeforeEachWrite: true,
      sequentialUpsertsOnly: true,
      recheckCoverageAfterEachBatch: true,
    },
    summary: {
      requirementCount,
      repairCount,
      batchCount: batches.length,
      readyBatchCount,
      blockedBatchCount,
    },
    batches,
    diagnostics,
  };
}
