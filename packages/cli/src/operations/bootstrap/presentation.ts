import { buildGuidance } from "./guidance.js";
import type {
  ActivationPolicy,
  BootstrapContext,
  BootstrapAction,
  BootstrapDeclaredContext,
  BootstrapPlanV1,
  PlanBootstrapResult,
  Candidate,
  DiscoverySummary,
  SourceOnlySignal,
} from "./types.js";

import { bootstrapPlanHash } from "./types.js";

function strings(values?: readonly string[]): readonly string[] {
  return [
    ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
  ];
}

export function normalizeBootstrapContext(
  input?: BootstrapContext,
): BootstrapDeclaredContext {
  const projectSummary = input?.projectSummary?.trim();
  return {
    ...(projectSummary ? { projectSummary } : {}),
    sourceOfTruthPaths: strings(input?.sourceOfTruthPaths),
    sourceOfTruthNotes: strings(input?.sourceOfTruthNotes),
    priorityRoots: strings(input?.priorityRoots),
    verificationAnchors: strings(input?.verificationAnchors),
  };
}

function payoff(
  candidates: readonly Candidate[],
): Readonly<Record<string, unknown>> {
  const projectedIfAllApplied: Record<string, number> = {};
  for (const candidate of candidates)
    projectedIfAllApplied[candidate.entityType] =
      (projectedIfAllApplied[candidate.entityType] ?? 0) + 1;
  return {
    current: {},
    projectedIfAllApplied,
    delta: { ...projectedIfAllApplied },
  };
}

// implements REQ-KIBI-BOOTSTRAP-PLAN
export function presentBootstrap(input: {
  readonly root: string;
  readonly activation: ActivationPolicy;
  readonly discoverySummary: DiscoverySummary;
  readonly migrationWarning: string | null;
  readonly bootstrapContext?: BootstrapContext;
  readonly candidates: readonly Candidate[];
  readonly sourceOnlySignals: readonly SourceOnlySignal[];
  readonly suppressedCandidates: readonly Readonly<Record<string, unknown>>[];
  readonly expected: BootstrapPlanV1["expected"];
  readonly bindingDiagnostics?: readonly string[];
}): PlanBootstrapResult {
  const declaredContext = normalizeBootstrapContext(input.bootstrapContext);
  const guidance = buildGuidance({
    root: input.root,
    activation: input.activation,
    declared: declaredContext,
    candidates: input.candidates,
    signals: input.sourceOnlySignals,
    warnings: input.discoverySummary.scanWarnings,
  });
  const confidenceLevel = String(guidance.confidence.level);
  const bindingDiagnostics = strings(input.bindingDiagnostics);
  const applyBlocked = input.activation.applyBlocked || bindingDiagnostics.length > 0;
  const blockedFallback =
    input.activation.activationMode === "vendored_blocked" || bindingDiagnostics.length > 0
      ? `Bootstrap blocked: ${input.activation.reason}${bindingDiagnostics.length > 0 ? ` ${bindingDiagnostics[0]}` : ""}`
      : input.activation.activationMode === "attached_thin_handoff" ||
          input.activation.activationMode === "attached_seeded_handoff"
        ? `Bootstrap handoff: ${input.activation.reason}`
        : "Bootstrap output found no safe candidates; follow the recommended actions to continue.";
  const baseTldr =
    !applyBlocked && input.candidates.length + input.sourceOnlySignals.length > 0
      ? `Bootstrap plan is ready for review with ${input.candidates.length} safe candidate(s) and ${input.sourceOnlySignals.length} source-only authoring follow-up(s).`
      : (input.activation.handoffMessage ?? blockedFallback);
  const tldr =
    confidenceLevel === "low" && !input.activation.applyBlocked
      ? `Low-confidence bootstrap (${String(guidance.confidence.score)}): review diagnostics before proceeding. ${baseTldr}`
      : baseTldr;
  const rawActions = input.candidates.flatMap((candidate) =>
    candidate.applyPlan.map((payload) => ({ candidate, payload })),
  );
  const actionIds = new Map<string, string>();
  rawActions.forEach(({ payload }, index) => {
    const id =
      typeof payload.id === "string"
        ? payload.id
        : typeof payload.properties === "object" &&
            payload.properties !== null &&
            "id" in payload.properties &&
            typeof payload.properties.id === "string"
          ? payload.properties.id
          : `candidate-${index + 1}`;
    actionIds.set(id, `bootstrap-upsert-${String(index + 1).padStart(4, "0")}`);
  });
  const actions: BootstrapAction[] = rawActions.map(
    ({ candidate, payload }, index) => {
      const id = `bootstrap-upsert-${String(index + 1).padStart(4, "0")}`;
      const relationships = Array.isArray(payload.relationships)
        ? payload.relationships
        : [];
      const dependsOn = relationships
        .map((relationship) =>
          relationship && typeof relationship === "object" && "to" in relationship
            ? actionIds.get(String(relationship.to))
            : undefined,
        )
        .filter((value): value is string => value !== undefined && value !== id)
        .sort();
      return {
        id,
        kind: "upsert",
        dependsOn: [...new Set(dependsOn)],
        payload,
        candidateId: candidate.candidateId,
      };
    },
  );
  const status: BootstrapPlanV1["status"] =
    input.activation.activationState === "root_active_seeded"
      ? "handoff"
      : applyBlocked
        ? "blocked"
        : confidenceLevel === "high" && actions.length > 0
          ? "ready"
          : "needs_context";
  const contextQuestions: string[] = [];
  if (status === "needs_context") {
    if (!declaredContext.projectSummary)
      contextQuestions.push("What is the one-sentence purpose of this repository?");
    if (declaredContext.sourceOfTruthPaths.length === 0)
      contextQuestions.push("Which repository paths are authoritative for product intent?");
    if (input.sourceOnlySignals.length > 0)
      contextQuestions.push("Which detected product behaviors should be prioritized for bootstrap?");
    if (declaredContext.verificationAnchors.length === 0)
      contextQuestions.push("Which command or test should verify the initial bootstrap?");
    if (contextQuestions.length === 0)
      contextQuestions.push(
        "Which specific product behavior should this bootstrap plan prioritize before authoring knowledge?",
      );
  }
  const diagnostics = [
    ...(input.migrationWarning ? [input.migrationWarning] : []),
    ...input.discoverySummary.scanWarnings,
    ...bindingDiagnostics,
  ];
  const planBody = {
    version: "kibi.bootstrap-plan.v1" as const,
    status,
    expected: input.expected,
    activation: {
      activationState: input.activation.activationState,
      activationMode: input.activation.activationMode,
      applyBlocked,
      reason: input.activation.reason,
    },
    declaredContext,
    contextQuestions: contextQuestions.slice(0, 4),
    confidence: guidance.confidence,
    discoverySummary: input.discoverySummary,
    candidates: input.candidates,
    actions,
    sourceWrites: [],
    suppressedCandidates: input.suppressedCandidates,
    payoffSummary: payoff(input.candidates),
    diagnostics,
  } satisfies Omit<BootstrapPlanV1, "planHash">;
  const hash = bootstrapPlanHash(planBody);
  const plan = { ...planBody, planHash: hash } satisfies BootstrapPlanV1;
  const payoffSummary = payoff(input.candidates);
  const structuredContent = {
    plan,
    version: plan.version,
    planHash: hash,
    status,
    expected: input.expected,
    activation: plan.activation,
    contextQuestions: plan.contextQuestions,
    activationState: input.activation.activationState,
    activationMode: input.activation.activationMode,
    bootstrapMode: input.activation.activationMode,
    activationReason: input.activation.reason,
    applyBlocked,
    migrationWarning: input.migrationWarning,
    ...(input.activation.handoffMessage
      ? { handoffMessage: input.activation.handoffMessage }
      : {}),
    confidence: guidance.confidence,
    tldr,
    promptBlock: guidance.promptBlock,
    recommendedActions: guidance.actions,
    declaredContext,
    discoverySummary: input.discoverySummary,
    candidates: input.candidates,
    actions,
    sourceWrites: [],
    suppressedCandidates: input.suppressedCandidates,
    payoffSummary,
    diagnostics,
  };
  const text =
    status === "ready"
      ? `${tldr} Review plan ${hash.slice(0, 12)} and request explicit approval before calling kb_apply_plan.`
      : tldr;
  return {
    content: [{ type: "text", text }],
    structuredContent,
  };
}
