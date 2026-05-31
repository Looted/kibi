import path from "node:path";
import fg from "fast-glob";
import { createRepoIgnorePolicy } from "kibi-cli/ignore-policy";
/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import type { PrologProcess } from "kibi-cli/prolog";
import { resolveWorkspaceRoot } from "../workspace.js";
import {
  type Candidate,
  type SourceOnlyAuthoringSignal,
  buildGenericMarkdownCandidates,
  buildNormativeRequirementCandidates,
  buildProviderEvidenceCandidates,
  buildSymbolManifestCandidates,
  buildTypedMarkdownCandidates,
  collectSourceOnlyAuthoringSignals,
} from "./autopilot-candidates.js";
import {
  type ActivationMode,
  type ActivationState,
  type DiscoverySummary,
  discoverProviderEvidence,
  resolveActivationPolicy,
} from "./autopilot-discovery.js";
import { loadEntities } from "./entity-query.js";
import { getWorkspaceMigrationWarning } from "./model-requirement.js";

export interface AutopilotBootstrapContext {
  projectSummary?: string;
  sourceOfTruthPaths?: string[];
  sourceOfTruthNotes?: string[];
  priorityRoots?: string[];
  verificationAnchors?: string[];
}

export interface AutopilotConfidence {
  score: number;
  level: "high" | "medium" | "low";
  reasons: string[];
  policy: "full_actions" | "review_required" | "handoff_only";
}

export interface AutopilotRecommendedAction {
  order: number;
  kind: "query" | "upsert" | "check" | "handoff";
  description: string;
  candidateIds?: string[];
}

export interface AutopilotDeclaredContext {
  projectSummary?: string;
  sourceOfTruthPaths: string[];
  sourceOfTruthNotes: string[];
  priorityRoots: string[];
  verificationAnchors: string[];
}

export interface AutopilotGenerateArgs {
  includeGenericMarkdown?: boolean;
  minConfidence?: number;
  maxCandidates?: number;
  entityTypes?: Array<"req" | "scenario" | "test" | "adr" | "fact" | "symbol">;
  bootstrapContext?: AutopilotBootstrapContext;
}

interface PayoffSummary extends Record<string, unknown> {
  current: Record<string, number>;
  projectedIfAllApplied: Record<string, number>;
  delta: Record<string, number>;
}

interface AutopilotStructuredContent {
  activationState: string;
  activationMode: string;
  bootstrapMode: ActivationMode;
  activationReason: string;
  applyBlocked: boolean;
  migrationWarning: string | null;
  handoffMessage?: string;
  confidence: AutopilotConfidence;
  tldr: string;
  promptBlock: string;
  recommendedActions: AutopilotRecommendedAction[];
  declaredContext: AutopilotDeclaredContext;
  discoverySummary: DiscoverySummary;
  candidates: Array<Record<string, unknown>>;
  applyPlan: Array<Record<string, unknown>>;
  suppressedCandidates: Array<Record<string, unknown>>;
  payoffSummary: PayoffSummary;
}

export interface AutopilotGenerateResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: AutopilotStructuredContent;
  migrationWarning: string | null;
  candidates: Array<Record<string, unknown>>;
  applyPlan: Array<Record<string, unknown>>;
  suppressedCandidates: Array<Record<string, unknown>>;
  payoffSummary: PayoffSummary;
}

interface CandidateRecord extends Record<string, unknown> {
  candidateId?: string;
  entityType?: string;
  confidence?: number;
  sourcePath?: string;
  sourceKind?: string;
  applyPlan?: unknown;
}

interface SuppressedCandidateRecord extends Record<string, unknown> {
  candidateId: string;
  reason: string;
  sourcePath: string;
  entityType: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringArray(values: string[] | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values ?? []) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function normalizeBootstrapContext(
  bootstrapContext?: AutopilotBootstrapContext,
): AutopilotDeclaredContext {
  const projectSummary = normalizeOptionalString(
    bootstrapContext?.projectSummary,
  );
  return {
    ...(projectSummary ? { projectSummary } : {}),
    sourceOfTruthPaths: normalizeStringArray(
      bootstrapContext?.sourceOfTruthPaths,
    ),
    sourceOfTruthNotes: normalizeStringArray(
      bootstrapContext?.sourceOfTruthNotes,
    ),
    priorityRoots: normalizeStringArray(bootstrapContext?.priorityRoots),
    verificationAnchors: normalizeStringArray(
      bootstrapContext?.verificationAnchors,
    ),
  };
}

function roundScore(score: number): number {
  return Math.round(clamp(score, 0, 1) * 100) / 100;
}

function toWorkspaceRelativePath(
  workspaceRoot: string,
  targetPath: string,
): string {
  const relative = path.relative(workspaceRoot, targetPath);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.split(path.sep).join("/");
  }
  return targetPath.split(path.sep).join("/");
}

function listSummary(values: string[], limit = 3): string {
  if (values.length === 0) return "workspace evidence";
  if (values.length <= limit) return values.join(", ");
  return `${values.slice(0, limit).join(", ")} +${values.length - limit} more`;
}

function countCandidatesByType(
  candidateRecords: CandidateRecord[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const candidate of candidateRecords) {
    const entityType = String(candidate.entityType ?? "unknown");
    counts[entityType] = (counts[entityType] ?? 0) + 1;
  }
  return counts;
}

function buildApplyPlan(
  candidateRecords: CandidateRecord[],
): Array<Record<string, unknown>> {
  return candidateRecords.flatMap((candidate) => {
    if (!Array.isArray(candidate.applyPlan)) return [];
    return candidate.applyPlan.filter(
      (entry): entry is Record<string, unknown> =>
        entry !== null && typeof entry === "object" && !Array.isArray(entry),
    );
  });
}

function formatCandidateTypeCounts(
  candidateRecords: CandidateRecord[],
): string {
  const counts = countCandidatesByType(candidateRecords);
  return Object.keys(counts)
    .sort()
    .map((entityType) => `${entityType} ${counts[entityType] ?? 0}`)
    .join(", ");
}

function summarizeSignalKinds(signals: SourceOnlyAuthoringSignal[]): string {
  const labels = Array.from(
    new Set(signals.map((signal) => signal.kind.toUpperCase())),
  );
  return labels.join("/");
}

function trimPromptBlock(bullets: string[]): string {
  const limitedBullets = bullets.filter(Boolean).slice(0, 5);
  let promptBlock = limitedBullets.join("\n");
  const words = promptBlock.split(/\s+/).filter(Boolean);

  if (words.length <= 120) return promptBlock;

  const truncated: string[] = [];
  let wordCount = 0;
  for (const bullet of limitedBullets) {
    const bulletWords = bullet.split(/\s+/).filter(Boolean);
    if (wordCount + bulletWords.length > 120) {
      const remaining = 120 - wordCount;
      if (remaining > 3) {
        truncated.push(`${bulletWords.slice(0, remaining).join(" ")}…`);
      }
      break;
    }
    truncated.push(bullet);
    wordCount += bulletWords.length;
  }
  promptBlock = truncated.join("\n");
  return promptBlock;
}

function buildPromptBlock(
  workspaceRoot: string,
  activationState: ActivationState,
  activationMode: ActivationMode,
  activationReason: string,
  applyBlocked: boolean,
  declaredContext: AutopilotDeclaredContext,
  candidateRecords: CandidateRecord[],
  sourceOnlySignals: SourceOnlyAuthoringSignal[],
  scanWarnings: string[],
): string {
  const signalPaths = Array.from(
    new Set(
      sourceOnlySignals.map((signal) =>
        toWorkspaceRelativePath(workspaceRoot, signal.sourcePath),
      ),
    ),
  );
  const bullets: string[] = [];

  bullets.push(
    applyBlocked
      ? `- Apply blocked: ${activationReason}`
      : `- Mode: ${activationMode} (${activationState}).`,
  );
  if (declaredContext.projectSummary) {
    bullets.push(`- Summary: ${declaredContext.projectSummary}`);
  }
  if (declaredContext.sourceOfTruthPaths.length > 0) {
    bullets.push(
      `- Source of truth: ${listSummary(declaredContext.sourceOfTruthPaths, 3)}.`,
    );
  }
  if (candidateRecords.length > 0) {
    bullets.push(
      `- Safe candidates: ${candidateRecords.length} (${formatCandidateTypeCounts(candidateRecords)}).`,
    );
  }
  if (sourceOnlySignals.length > 0) {
    bullets.push(
      `- Author ${summarizeSignalKinds(sourceOnlySignals)} manually from ${listSummary(signalPaths, 3)}; keep them out of speculative candidate output.`,
    );
  } else if (declaredContext.verificationAnchors.length > 0) {
    bullets.push(
      `- Verify after kb_check with ${listSummary(declaredContext.verificationAnchors, 2)}.`,
    );
  }
  if (
    activationMode === "attached_thin_handoff" ||
    activationMode === "attached_seeded_handoff"
  ) {
    bullets.push(
      "- Handoff: use kb_search, kb_query, or gap/coverage tools to work with existing KB.",
    );
  }
  if (scanWarnings.length > 0) {
    bullets.push(
      `- Scan diagnostics: ${scanWarnings.length} warning(s) during evidence collection.`,
    );
  }

  return trimPromptBlock(bullets);
}

function buildPayoffSummary(
  candidateRecords: CandidateRecord[],
): PayoffSummary {
  const current: Record<string, number> = {};
  const projectedIfAllApplied = { ...current };
  for (const candidate of candidateRecords) {
    const entityType = String(candidate.entityType ?? "unknown");
    projectedIfAllApplied[entityType] =
      (projectedIfAllApplied[entityType] ?? 0) + 1;
  }

  const delta: Record<string, number> = {};
  for (const entityType of Object.keys(projectedIfAllApplied)) {
    delta[entityType] =
      (projectedIfAllApplied[entityType] ?? 0) - (current[entityType] ?? 0);
  }

  return { current, projectedIfAllApplied, delta };
}

function buildSourceOnlyActionDescription(
  workspaceRoot: string,
  sourceOnlySignals: SourceOnlyAuthoringSignal[],
): string {
  const paths = Array.from(
    new Set(
      sourceOnlySignals.map((signal) =>
        toWorkspaceRelativePath(workspaceRoot, signal.sourcePath),
      ),
    ),
  );
  return `Author ${summarizeSignalKinds(sourceOnlySignals)} entities manually from source-only evidence in ${listSummary(paths, 3)}; do not auto-create them from scan output.`;
}

function buildCheckDescription(
  declaredContext: AutopilotDeclaredContext,
): string {
  if (declaredContext.verificationAnchors.length > 0) {
    return `After approved kb_upsert calls, run kb_check and verify ${listSummary(declaredContext.verificationAnchors, 2)}.`;
  }
  return "After approved kb_upsert calls, run kb_check to validate the resulting graph.";
}

function buildRecommendedActions(
  workspaceRoot: string,
  activationMode: ActivationMode,
  activationReason: string,
  handoffMessage: string | undefined,
  applyBlocked: boolean,
  declaredContext: AutopilotDeclaredContext,
  candidateRecords: CandidateRecord[],
  sourceOnlySignals: SourceOnlyAuthoringSignal[],
): AutopilotRecommendedAction[] {
  const actions: AutopilotRecommendedAction[] = [];
  let order = 1;
  const reviewTargets = Array.from(
    new Set([
      ...declaredContext.sourceOfTruthPaths,
      ...declaredContext.priorityRoots,
      ...sourceOnlySignals.map((signal) =>
        toWorkspaceRelativePath(workspaceRoot, signal.sourcePath),
      ),
    ]),
  );
  const candidateIds = candidateRecords
    .map((candidate) => String(candidate.candidateId ?? ""))
    .filter(Boolean);
  const isActiveRepo =
    activationMode === "attached_thin_handoff" ||
    activationMode === "attached_seeded_handoff";

  actions.push({
    order: order++,
    kind: "query",
    description:
      reviewTargets.length > 0
        ? `Review ${listSummary(reviewTargets, 3)} before authoring or applying bootstrap output.`
        : "Review the workspace evidence and any existing KB records before authoring or applying bootstrap output.",
  });

  if (isActiveRepo) {
    actions.push({
      order: order++,
      kind: "handoff",
      description:
        "Use kb_search to explore existing KB entities and understand current coverage.",
    });
    actions.push({
      order: order++,
      kind: "handoff",
      description:
        "Use kb_query or kb_graph with task-relevant IDs to inspect cited KB context.",
    });
    actions.push({
      order: order++,
      kind: "handoff",
      description:
        activationMode === "attached_thin_handoff"
          ? "Use kb_find_gaps to identify coverage holes and guide incremental KB growth."
          : "Use kb_coverage to review traceability and identify areas needing attention.",
    });
  }

  if (applyBlocked) {
    actions.push({
      order: order++,
      kind: "handoff",
      description:
        handoffMessage ??
        blockedActivationMessage(activationMode, activationReason),
    });
  } else if (candidateIds.length > 0) {
    actions.push({
      order: order++,
      kind: "upsert",
      description: `Review and optionally upsert ${candidateIds.length} safe candidate(s) from typed or deterministic evidence.`,
      candidateIds,
    });
  }

  if (sourceOnlySignals.length > 0) {
    actions.push({
      order: order++,
      kind: "handoff",
      description: buildSourceOnlyActionDescription(
        workspaceRoot,
        sourceOnlySignals,
      ),
    });
  }

  actions.push({
    order: order++,
    kind: "check",
    description: buildCheckDescription(declaredContext),
  });

  return actions;
}

function buildConfidence(
  activationMode: ActivationMode,
  applyBlocked: boolean,
  declaredContext: AutopilotDeclaredContext,
  candidateRecords: CandidateRecord[],
  sourceOnlySignals: SourceOnlyAuthoringSignal[],
  promptBlock: string,
): AutopilotConfidence {
  const reasons: string[] = [];
  let score = candidateRecords.length > 0 ? 0.68 : 0.44;

  if (applyBlocked) {
    score -= 0.24;
    reasons.push("Current workspace posture blocks direct application.");
  } else {
    score += 0.12;
    reasons.push("Workspace posture allows read-only bootstrap synthesis.");
  }

  switch (activationMode) {
    case "cold_start_bootstrap":
      score += 0.1;
      reasons.push("Cold-start mode is a strong fit for bootstrap synthesis.");
      break;
    case "repair_bootstrap":
      score -= 0.05;
      reasons.push("Repair mode favors staged recovery before apply.");
      break;
    case "attached_thin_handoff":
      score -= 0.12;
      reasons.push("Thin attached KB favors handoff/query guidance.");
      break;
    case "attached_seeded_handoff":
      score -= 0.18;
      reasons.push(
        "Seeded attached KB already has enough history to prefer handoff guidance.",
      );
      break;
    case "vendored_blocked":
      score -= 0.25;
      reasons.push(
        "Vendored-only posture blocks bootstrap output from becoming actionable.",
      );
      break;
  }

  if (
    declaredContext.projectSummary ||
    declaredContext.sourceOfTruthPaths.length > 0 ||
    declaredContext.sourceOfTruthNotes.length > 0 ||
    declaredContext.priorityRoots.length > 0 ||
    declaredContext.verificationAnchors.length > 0
  ) {
    score += 0.08;
    reasons.push("Declared bootstrap context grounds the output.");
  } else {
    reasons.push("No declared bootstrap context was supplied.");
  }

  if (sourceOnlySignals.length > 0) {
    score += 0.04;
    reasons.push(
      "Source-only evidence was routed into authoring guidance instead of speculative REQ/SCEN/TEST candidates.",
    );
  }

  if (candidateRecords.length === 0) {
    score -= 0.08;
    reasons.push("No safe candidates were synthesized from current evidence.");
  } else {
    reasons.push(
      `${candidateRecords.length} safe candidate(s) are ready for review.`,
    );
  }

  if (!promptBlock) {
    score -= 0.05;
    reasons.push(
      "Prompt block could not be assembled within the handoff budget.",
    );
  }

  const rounded = roundScore(score);
  const level: "high" | "medium" | "low" =
    rounded > 0.7 ? "high" : rounded >= 0.4 ? "medium" : "low";
  const policy: "full_actions" | "review_required" | "handoff_only" =
    level === "high"
      ? "full_actions"
      : level === "medium"
        ? "review_required"
        : "handoff_only";
  if (policy === "review_required") {
    reasons.push("Medium confidence: review recommended before applying.");
  } else if (policy === "handoff_only") {
    reasons.push(
      "Low confidence: handoff-only output with diagnostic guidance.",
    );
  }
  return {
    score: rounded,
    level,
    reasons,
    policy,
  };
}

function buildTldr(
  activationMode: ActivationMode,
  applyBlocked: boolean,
  candidateRecords: CandidateRecord[],
  sourceOnlySignals: SourceOnlyAuthoringSignal[],
  activationReason: string,
  handoffMessage?: string,
): string {
  if (applyBlocked) {
    if (candidateRecords.length > 0 || sourceOnlySignals.length > 0) {
      return `Bootstrap guidance is ready in ${activationMode}: ${candidateRecords.length} safe candidate(s), ${sourceOnlySignals.length} source-only authoring follow-up(s), and apply remains blocked.`;
    }
    return (
      handoffMessage ??
      blockedActivationMessage(activationMode, activationReason)
    );
  }

  if (candidateRecords.length > 0 || sourceOnlySignals.length > 0) {
    return `Bootstrap output is ready with ${candidateRecords.length} safe candidate(s) and ${sourceOnlySignals.length} source-only authoring follow-up(s).`;
  }

  return "Bootstrap output found no safe candidates; follow the recommended actions to continue.";
}

function extractTextRefFromApplyPlan(applyPlan: unknown): string {
  if (!Array.isArray(applyPlan) || applyPlan.length === 0) return "";
  const first = applyPlan[0];
  if (!first || typeof first !== "object") return "";
  const firstRecord = first as Record<string, unknown>;
  const properties = firstRecord.properties;
  if (!properties || typeof properties !== "object") return "";
  const propsRecord = properties as Record<string, unknown>;
  const textRef = propsRecord.text_ref;
  return typeof textRef === "string" ? textRef : "";
}

function toSuppressedCandidate(
  reason: string,
  candidate: CandidateRecord,
): SuppressedCandidateRecord {
  return {
    candidateId: String(candidate.candidateId ?? ""),
    reason,
    sourcePath: String(candidate.sourcePath ?? ""),
    entityType: String(candidate.entityType ?? ""),
  };
}

function blockedActivationMessage(
  activationMode: ActivationMode,
  activationReason: string,
  handoffMessage?: string,
): string {
  switch (activationMode) {
    case "vendored_blocked":
      return `Autopilot bootstrap blocked: ${activationReason}`;
    case "attached_thin_handoff":
    case "attached_seeded_handoff":
      return handoffMessage
        ? `Autopilot handoff: ${handoffMessage}`
        : `Autopilot handoff: ${activationReason}`;
    default:
      return `Autopilot bootstrap blocked: ${activationReason}`;
  }
}

function splitDiscoveredSources(workspaceRoot: string, candidates: string[]) {
  const markdownFiles: string[] = [];
  const manifestFiles: string[] = [];

  for (const relativePath of candidates) {
    const absolutePath = path.resolve(workspaceRoot, relativePath);
    if (/symbols\.ya?ml$/i.test(relativePath)) {
      manifestFiles.push(absolutePath);
      continue;
    }
    if (/\.md$/i.test(relativePath)) {
      markdownFiles.push(absolutePath);
    }
  }

  return { markdownFiles, manifestFiles };
}

export async function handleKbAutopilotGenerate(
  // implements REQ-mcp-init-kibi-autopilot-v1
  _prolog: PrologProcess,
  args: AutopilotGenerateArgs,
): Promise<AutopilotGenerateResult> {
  const {
    includeGenericMarkdown = true,
    minConfidence = 0.8,
    maxCandidates = 50,
    entityTypes,
    bootstrapContext,
  } = args;
  const normalizedMinConfidence = clamp(minConfidence, 0.6, 0.95);
  const normalizedMaxCandidates = clamp(maxCandidates, 1, 200);
  const prolog = _prolog;

  // Gather existing entity ids to suppress duplicates
  let existingIds = new Set<string>();
  try {
    const entities = await loadEntities(prolog, {});
    for (const e of entities) {
      const id = String(e.id ?? "");
      if (id) existingIds.add(id);
    }
  } catch (error) {
    // If we can't list entities, proceed with empty set
    existingIds = new Set<string>();
  }

  const workspaceRoot = resolveWorkspaceRoot();
  const activation = await resolveActivationPolicy(workspaceRoot, prolog);
  const activationState = activation.activationState;
  const activationDiscovery = discoverProviderEvidence(
    workspaceRoot,
    activation,
  );
  const migrationWarning = await getWorkspaceMigrationWarning(workspaceRoot);
  const declaredContext = normalizeBootstrapContext(bootstrapContext);
  const discoveredCandidatePaths = activationDiscovery.evidence.reduce<
    string[]
  >((acc, item) => {
    const relativePath = item.relativePath;
    if (
      typeof relativePath === "string" &&
      (relativePath.endsWith(".md") || /symbols\.ya?ml$/i.test(relativePath))
    ) {
      acc.push(relativePath);
    }
    return acc;
  }, []);
  const discovery = splitDiscoveredSources(
    workspaceRoot,
    discoveredCandidatePaths,
  );

  const candidateDiscovery = {
    ...discovery,
    evidence: activationDiscovery.evidence,
  };
  const guidanceDiscovery = includeGenericMarkdown
    ? candidateDiscovery
    : {
        ...candidateDiscovery,
        markdownFiles: [],
        evidence: candidateDiscovery.evidence.filter(
          (item) => item.kind !== "generic_markdown",
        ),
      };
  let sourceOnlySignals = collectSourceOnlyAuthoringSignals(
    guidanceDiscovery,
    {
      ids: existingIds,
      workspaceRoot,
    },
    normalizedMinConfidence,
  );
  if (entityTypes && entityTypes.length > 0) {
    const allowedSignals = new Set(entityTypes as string[]);
    sourceOnlySignals = sourceOnlySignals.filter((signal) =>
      allowedSignals.has(signal.kind),
    );
  }

  let typedMarkdownCandidates: Candidate[] = [];
  let manifestCandidates: Candidate[] = [];
  let genericCandidates: Candidate[] = [];
  let normativeRequirementCandidates: Candidate[] = [];
  let providerEvidenceCandidates: Candidate[] = [];
  let allCandidates: Candidate[] = [];
  const seenByKey = new Map<string, CandidateRecord>();
  const suppressed: SuppressedCandidateRecord[] = [];
  // Helpers
  function normalizeTitle(entityType: string, title: string) {
    return `${entityType}::${String(title).trim().toLowerCase().replace(/\s+/g, " ")}`;
  }

  if (activation.allowCandidateGeneration) {
    typedMarkdownCandidates = buildTypedMarkdownCandidates(candidateDiscovery, {
      ids: existingIds,
      workspaceRoot,
    });
    manifestCandidates = buildSymbolManifestCandidates(candidateDiscovery, {
      ids: existingIds,
      workspaceRoot,
    });
    if (includeGenericMarkdown) {
      genericCandidates = buildGenericMarkdownCandidates(
        candidateDiscovery,
        {
          ids: existingIds,
          workspaceRoot,
        },
        normalizedMinConfidence,
      );
      normativeRequirementCandidates = buildNormativeRequirementCandidates(
        candidateDiscovery,
        {
          ids: existingIds,
          workspaceRoot,
        },
        normalizedMinConfidence,
      );
    }
    providerEvidenceCandidates = buildProviderEvidenceCandidates(
      candidateDiscovery,
      {
        ids: existingIds,
        workspaceRoot,
      },
      normalizedMinConfidence,
    );

    allCandidates = [
      ...typedMarkdownCandidates,
      ...manifestCandidates,
      ...genericCandidates,
      ...normativeRequirementCandidates,
      ...providerEvidenceCandidates,
    ];
    if (entityTypes && entityTypes.length > 0) {
      const allowed = new Set(entityTypes as string[]);
      allCandidates = allCandidates.filter((candidate) =>
        allowed.has(candidate.entityType),
      );
    }
    allCandidates = allCandidates.filter(
      (candidate) => candidate.confidence >= normalizedMinConfidence,
    );

    allCandidates.sort((left, right) => {
      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence;
      }
      if (left.sourcePath < right.sourcePath) return -1;
      if (left.sourcePath > right.sourcePath) return 1;
      return 0;
    });
    allCandidates = allCandidates.slice(0, normalizedMaxCandidates);

    const typedTitleKeys = new Set(
      typedMarkdownCandidates.map((candidate) =>
        normalizeTitle(
          String(candidate.entityType || ""),
          String(candidate.title || ""),
        ),
      ),
    );

    for (const candidate of allCandidates) {
      const record: CandidateRecord = { ...candidate };
      const entityType = String(candidate.entityType || "");
      const title = String(candidate.title || "");
      const sourceKind = String(candidate.sourceKind || "");
      const sourcePath = String(candidate.sourcePath || "");
      const textRef = extractTextRefFromApplyPlan(candidate.applyPlan);
      const titleKey = normalizeTitle(entityType, title);

      const upsert = Array.isArray(candidate.applyPlan)
        ? candidate.applyPlan[0]
        : null;
      let upsertId = "";
      if (upsert && typeof upsert === "object") {
        const upsertRecord = upsert as Record<string, unknown>;
        const directId = upsertRecord.id;
        if (typeof directId === "string" && directId.length > 0) {
          upsertId = directId;
        } else {
          const properties = upsertRecord.properties;
          if (properties && typeof properties === "object") {
            const nestedId = (properties as Record<string, unknown>).id;
            if (typeof nestedId === "string" && nestedId.length > 0) {
              upsertId = nestedId;
            }
          }
        }
      }
      if (existingIds.has(upsertId)) {
        suppressed.push(toSuppressedCandidate("entity_exists", record));
        continue;
      }

      if (sourceKind === "generic_markdown" && typedTitleKeys.has(titleKey)) {
        suppressed.push(
          toSuppressedCandidate("shadowed_by_typed_source", record),
        );
        continue;
      }

      const existing = seenByKey.get(titleKey);
      if (existing) {
        const existingConf = Number(existing.confidence ?? 0);
        const thisConf = Number(candidate.confidence ?? 0);
        if (thisConf > existingConf) {
          suppressed.push(toSuppressedCandidate("duplicate_title", existing));
          seenByKey.set(titleKey, record);
        } else if (thisConf < existingConf) {
          suppressed.push(toSuppressedCandidate("duplicate_title", record));
        } else {
          const existingRef = `${String(existing.sourcePath ?? "")}::${extractTextRefFromApplyPlan(existing.applyPlan)}`;
          const thisRef = `${sourcePath}::${textRef}`;
          if (thisRef < existingRef) {
            suppressed.push(toSuppressedCandidate("duplicate_title", existing));
            seenByKey.set(titleKey, record);
          } else {
            suppressed.push(toSuppressedCandidate("duplicate_title", record));
          }
        }
        continue;
      }

      seenByKey.set(titleKey, record);
    }
  }

  // Detect repository files that would be candidate inputs but are ignored by
  // the repo ignore policy (e.g. .sisyphus drafts, .gitignore entries). Add
  // them to suppressedCandidates with reason `ignored_source` so callers see
  // why those files were omitted from candidate output.
  try {
    const repoIgnore = createRepoIgnorePolicy(workspaceRoot);
    const potentialFiles = fg.sync(["**/*.md", "**/symbols.{yml,yaml}"], {
      cwd: workspaceRoot,
      absolute: true,
      onlyFiles: true,
      unique: true,
      dot: true,
      suppressErrors: true,
    });

    for (const absPath of potentialFiles) {
      const rel = toWorkspaceRelativePath(workspaceRoot, absPath);
      const explain = repoIgnore.explain(rel);
      if (explain.ignored) {
        // avoid duplicating existing suppressed entries for the same source
        if (
          !suppressed.some(
            (s) =>
              String(s.sourcePath ?? "") === rel &&
              s.reason === "ignored_source",
          )
        ) {
          suppressed.push({
            candidateId: String("") /* no candidate id for ignored source */,
            reason: "ignored_source",
            sourcePath: rel,
            entityType: String("") /* unknown at this stage */,
            detail: explain.reason,
          } as unknown as SuppressedCandidateRecord);
        }
      }
    }
  } catch {
    // best-effort only; ignore failures here so generation can continue
  }

  const candidateRecords: CandidateRecord[] = Array.from(seenByKey.values());
  const applyPlan = buildApplyPlan(candidateRecords);
  const payoffSummary = buildPayoffSummary(candidateRecords);
  const promptBlock = buildPromptBlock(
    workspaceRoot,
    activationState,
    activation.activationMode,
    activation.reason,
    activation.applyBlocked,
    declaredContext,
    candidateRecords,
    sourceOnlySignals,
    activationDiscovery.summary.scanWarnings,
  );
  const confidence = buildConfidence(
    activation.activationMode,
    activation.applyBlocked,
    declaredContext,
    candidateRecords,
    sourceOnlySignals,
    promptBlock,
  );
  const recommendedActions = buildRecommendedActions(
    workspaceRoot,
    activation.activationMode,
    activation.reason,
    activation.handoffMessage,
    activation.applyBlocked,
    declaredContext,
    candidateRecords,
    sourceOnlySignals,
  );
  const tldr = buildTldr(
    activation.activationMode,
    activation.applyBlocked,
    candidateRecords,
    sourceOnlySignals,
    activation.reason,
    activation.handoffMessage,
  );
  // Apply confidence policy: medium and low confidence force applyBlocked
  const effectiveApplyBlocked =
    activation.applyBlocked ||
    confidence.level === "medium" ||
    confidence.level === "low";
  const effectiveTldr =
    confidence.level === "low" && !activation.applyBlocked
      ? `Low-confidence bootstrap (${confidence.score}): review diagnostics before proceeding. ${tldr}`
      : tldr;
  const effectiveText =
    applyPlan.length > 0
      ? `${effectiveTldr} Review structuredContent.applyPlan for exact sequential kb_upsert payloads before requesting approval.`
      : effectiveTldr;
  const structuredContent: AutopilotStructuredContent = {
    activationState,
    activationMode: activation.activationMode,
    bootstrapMode: activation.activationMode,
    activationReason: activation.reason,
    applyBlocked: effectiveApplyBlocked,
    migrationWarning,
    ...(activation.handoffMessage
      ? { handoffMessage: activation.handoffMessage }
      : {}),
    confidence,
    tldr,
    promptBlock,
    recommendedActions,
    declaredContext,
    discoverySummary: activationDiscovery.summary,
    candidates: candidateRecords,
    applyPlan,
    suppressedCandidates: suppressed,
    payoffSummary,
  };

  return {
    content: [
      {
        type: "text",
        text: effectiveText,
      },
    ],
    structuredContent,
    migrationWarning,
    candidates: candidateRecords,
    applyPlan,
    suppressedCandidates: suppressed,
    payoffSummary,
  };
}
