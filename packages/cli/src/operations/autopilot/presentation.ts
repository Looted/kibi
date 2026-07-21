import { buildGuidance } from "./guidance.js";
import type {
  ActivationPolicy,
  AutopilotBootstrapContext,
  AutopilotDeclaredContext,
  AutopilotGenerateResult,
  Candidate,
  DiscoverySummary,
  SourceOnlySignal,
} from "./types.js";

function strings(values?: readonly string[]): readonly string[] {
  return [
    ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
  ];
}

export function normalizeBootstrapContext(
  input?: AutopilotBootstrapContext,
): AutopilotDeclaredContext {
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

export function presentAutopilot(input: {
  readonly root: string;
  readonly activation: ActivationPolicy;
  readonly discoverySummary: DiscoverySummary;
  readonly migrationWarning: string | null;
  readonly bootstrapContext?: AutopilotBootstrapContext;
  readonly candidates: readonly Candidate[];
  readonly sourceOnlySignals: readonly SourceOnlySignal[];
  readonly suppressedCandidates: readonly Readonly<Record<string, unknown>>[];
}): AutopilotGenerateResult {
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
  const applyBlocked =
    input.activation.applyBlocked ||
    confidenceLevel === "medium" ||
    confidenceLevel === "low";
  const blockedFallback =
    input.activation.activationMode === "vendored_blocked"
      ? `Autopilot bootstrap blocked: ${input.activation.reason}`
      : input.activation.activationMode === "attached_thin_handoff" ||
          input.activation.activationMode === "attached_seeded_handoff"
        ? `Autopilot handoff: ${input.activation.reason}`
        : "Bootstrap output found no safe candidates; follow the recommended actions to continue.";
  const baseTldr =
    input.candidates.length + input.sourceOnlySignals.length > 0
      ? `Bootstrap output is ready with ${input.candidates.length} safe candidate(s) and ${input.sourceOnlySignals.length} source-only authoring follow-up(s).`
      : (input.activation.handoffMessage ?? blockedFallback);
  const tldr =
    confidenceLevel === "low" && !input.activation.applyBlocked
      ? `Low-confidence bootstrap (${String(guidance.confidence.score)}): review diagnostics before proceeding. ${baseTldr}`
      : baseTldr;
  const applyPlan = input.candidates.flatMap((candidate) => [
    ...candidate.applyPlan,
  ]);
  const payoffSummary = payoff(input.candidates);
  const structuredContent = {
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
    applyPlan,
    suppressedCandidates: input.suppressedCandidates,
    payoffSummary,
  };
  const text =
    applyPlan.length > 0
      ? `${tldr} Review structuredContent.applyPlan for exact sequential kb_upsert payloads before requesting approval.`
      : tldr;
  return {
    content: [{ type: "text", text }],
    structuredContent,
    migrationWarning: input.migrationWarning,
    candidates: input.candidates,
    applyPlan,
    suppressedCandidates: input.suppressedCandidates,
    payoffSummary,
  };
}
