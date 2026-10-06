import { buildGuidance } from "./guidance.js";
import type {
  ActivationPolicy,
  BootstrapAction,
  BootstrapContext,
  BootstrapDeclaredContext,
  BootstrapIntentClaim,
  BootstrapKnowledgeSource,
  BootstrapPlanV1,
  Candidate,
  DiscoverySummary,
  PlanBootstrapResult,
  SourceOnlySignal,
} from "./types.js";

import {
  KNOWLEDGE_SOURCE_AUTHORITIES,
  KNOWLEDGE_SOURCE_KINDS,
  bootstrapPlanHash,
} from "./types.js";

function strings(values?: readonly string[]): readonly string[] {
  return [
    ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
  ];
}

function knowledgeSources(
  values?: readonly BootstrapKnowledgeSource[],
): readonly BootstrapKnowledgeSource[] {
  const seen = new Set<string>();
  const result: BootstrapKnowledgeSource[] = [];
  for (const value of values ?? []) {
    const id = value.id?.trim();
    const title = value.title?.trim();
    const locator = value.locator?.trim();
    if (
      !id ||
      !title ||
      !locator ||
      seen.has(id) ||
      !KNOWLEDGE_SOURCE_KINDS.includes(value.kind) ||
      !KNOWLEDGE_SOURCE_AUTHORITIES.includes(value.authority)
    )
      continue;
    seen.add(id);
    const connector = value.connector?.trim();
    const notes = value.notes?.trim();
    result.push({
      id,
      kind: value.kind,
      title,
      locator,
      authority: value.authority,
      ...(connector ? { connector } : {}),
      ...(notes ? { notes } : {}),
    });
  }
  return result;
}

function intentClaims(
  values?: readonly BootstrapIntentClaim[],
): readonly BootstrapIntentClaim[] {
  const seen = new Set<string>();
  const result: BootstrapIntentClaim[] = [];
  for (const value of values ?? []) {
    const statement = value.statement?.trim().replace(/\s+/g, " ");
    const sourceId = value.sourceId?.trim();
    const reference = value.reference?.trim();
    if (!statement || !sourceId || !reference) continue;
    const key = `${sourceId}\u0000${reference}\u0000${statement}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const excerpt = value.excerpt?.trim();
    result.push({
      statement,
      sourceId,
      reference,
      ...(excerpt ? { excerpt } : {}),
    });
  }
  return result;
}

export function normalizeBootstrapContext(
  input?: BootstrapContext,
): BootstrapDeclaredContext {
  const projectSummary = input?.projectSummary?.trim();
  const sources = knowledgeSources(input?.knowledgeSources);
  const claims = intentClaims(input?.intentClaims);
  return {
    ...(projectSummary ? { projectSummary } : {}),
    sourceOfTruthPaths: strings(input?.sourceOfTruthPaths),
    sourceOfTruthNotes: strings(input?.sourceOfTruthNotes),
    priorityRoots: strings(input?.priorityRoots),
    verificationAnchors: strings(input?.verificationAnchors),
    ...(sources.length > 0 ? { knowledgeSources: sources } : {}),
    ...(claims.length > 0 ? { intentClaims: claims } : {}),
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

/**
 * Suppressions per reason, most frequent first, so a plan with hundreds of
 * suppressed rows still reads as a handful of lines.
 */
// implements REQ-bootstrap-discovered-candidate-budget
export function suppressionCounts(
  rows: readonly Readonly<Record<string, unknown>>[],
): readonly { readonly reason: string; readonly count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const reason = String(row.reason ?? "unspecified");
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts]
    .map(([reason, count]) => ({ reason, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.reason.localeCompare(right.reason),
    );
}

type ClaimAccounting = {
  readonly source: BootstrapKnowledgeSource;
  readonly declared: number;
  readonly planned: number;
  readonly existing: number;
  readonly filtered: number;
};

/** Declared claims per knowledge source against what the plan writes. */
// implements REQ-bootstrap-intent-claim-accounting
function claimAccounting(
  declared: BootstrapDeclaredContext,
  candidates: readonly Candidate[],
  suppressed: readonly Readonly<Record<string, unknown>>[],
): readonly ClaimAccounting[] {
  return (declared.knowledgeSources ?? []).flatMap((source) => {
    const count = (declared.intentClaims ?? []).filter(
      (claim) => claim.sourceId === source.id,
    ).length;
    if (count === 0) return [];
    const prefix = `claim:${source.id}:`;
    const planned = candidates.filter(
      (candidate) =>
        candidate.sourceKind === "intent_claim" &&
        candidate.candidateId.startsWith(prefix),
    ).length;
    const rows = (reasons: readonly string[]): number =>
      suppressed.filter(
        (row) =>
          reasons.includes(String(row.reason)) &&
          String(row.candidateId).startsWith(prefix),
      ).length;
    const existing = rows(["entity_exists"]);
    // Claims the caller filtered out (entityTypes, minConfidence) are not lost.
    const filtered = rows(["filtered_by_entity_type", "below_min_confidence"]);
    return [{ source, declared: count, planned, existing, filtered }];
  });
}

// implements REQ-KIBI-BOOTSTRAP-PLAN, REQ-bootstrap-discovered-candidate-budget
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
  /** Advisory findings about declared context; they never block apply. */
  readonly contextDiagnostics?: readonly string[];
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
  const applyBlocked =
    input.activation.applyBlocked || bindingDiagnostics.length > 0;
  const blockedFallback =
    input.activation.activationMode === "vendored_blocked" ||
    bindingDiagnostics.length > 0
      ? `Bootstrap blocked: ${input.activation.reason}${bindingDiagnostics.length > 0 ? ` ${bindingDiagnostics[0]}` : ""}`
      : input.activation.activationMode === "attached_thin_handoff" ||
          input.activation.activationMode === "attached_seeded_handoff"
        ? `Bootstrap handoff: ${input.activation.reason}`
        : "Bootstrap output found no safe candidates; follow the recommended actions to continue.";
  const baseTldr =
    !applyBlocked &&
    input.candidates.length + input.sourceOnlySignals.length > 0
      ? `Bootstrap plan is ready for review with ${input.candidates.length} safe candidate(s) and ${input.sourceOnlySignals.length} source-only authoring follow-up(s).`
      : (input.activation.handoffMessage ?? blockedFallback);
  const suppression = suppressionCounts(input.suppressedCandidates);
  const suppressedTotal = suppression.reduce((sum, row) => sum + row.count, 0);
  const suppressionSummary =
    suppressedTotal > 0
      ? ` Suppressed ${suppressedTotal} candidate(s) by reason: ${suppression.map((row) => `${row.reason} ${row.count}`).join(", ")}.`
      : "";
  const limitSummary = suppression.some((row) => row.reason === "over_limit")
    ? " Discovered candidates over maxCandidates are over_limit; raise the limit or narrow entityTypes. Declared intent claims do not count against it."
    : "";
  const tldr =
    (confidenceLevel === "low" && !input.activation.applyBlocked
      ? `Low-confidence bootstrap (${String(guidance.confidence.score)}): review diagnostics before proceeding. ${baseTldr}`
      : baseTldr) +
    suppressionSummary +
    limitSummary;
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
          relationship &&
          typeof relationship === "object" &&
          "to" in relationship
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
  const accounting = claimAccounting(
    declaredContext,
    input.candidates,
    input.suppressedCandidates,
  );
  const droppedAuthoritative = accounting.filter(
    (row) =>
      row.source.authority === "authoritative" &&
      row.planned + row.existing + row.filtered === 0,
  );
  const status: BootstrapPlanV1["status"] =
    input.activation.activationState === "root_active_seeded"
      ? "handoff"
      : applyBlocked
        ? "blocked"
        : confidenceLevel === "high" &&
            actions.length > 0 &&
            droppedAuthoritative.length === 0
          ? "ready"
          : "needs_context";
  const contextQuestions: string[] = [];
  if (status === "needs_context") {
    if (droppedAuthoritative.length > 0)
      contextQuestions.push(
        `No declared claim from authoritative source(s) ${droppedAuthoritative.map((row) => `"${row.source.title}"`).join(", ")} could be planned; how should those claims be restated or authored before bootstrap applies?`,
      );
    if (!declaredContext.projectSummary)
      contextQuestions.push(
        "What is the one-sentence purpose of this repository?",
      );
    if (!declaredContext.knowledgeSources)
      contextQuestions.push(
        "Which knowledge sources outside the code (issue trackers, wikis, specs, decision logs) describe product intent, and which of them are authoritative?",
      );
    if (declaredContext.sourceOfTruthPaths.length === 0)
      contextQuestions.push(
        "Which repository paths are authoritative for product intent?",
      );
    if (input.sourceOnlySignals.length > 0)
      contextQuestions.push(
        "Which detected product behaviors should be prioritized for bootstrap?",
      );
    if (declaredContext.verificationAnchors.length === 0)
      contextQuestions.push(
        "Which command or test should verify the initial bootstrap?",
      );
    if (contextQuestions.length === 0)
      contextQuestions.push(
        "Which specific product behavior should this bootstrap plan prioritize before authoring knowledge?",
      );
  }
  const diagnostics = [
    ...(input.migrationWarning ? [input.migrationWarning] : []),
    ...input.discoverySummary.scanWarnings,
    ...bindingDiagnostics,
    ...strings(input.contextDiagnostics),
    ...(suppressedTotal > 0
      ? [
          `Suppressed candidates by reason: ${suppression.map((row) => `${row.reason} ${row.count}`).join(", ")} (rows in suppressedCandidates).`,
        ]
      : []),
    ...accounting.map(
      (row) =>
        `Knowledge source ${row.source.id} (${row.source.authority}): ${row.declared} declared claim(s), ${row.planned} planned, ${row.existing} already in the KB, ${row.filtered} filtered out, ${row.declared - row.planned - row.existing - row.filtered} not planned (see suppressedCandidates and source-only follow-ups).`,
    ),
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
