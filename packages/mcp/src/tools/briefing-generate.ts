import type { PrologProcess } from "kibi-cli/prolog";
import { rankEntities } from "kibi-cli/search-ranking";
import fs from "node:fs";
import path from "node:path";
import {
  classifyActivationState,
  type ActivationState,
} from "./autopilot-discovery.js";
import { runJsonModuleQuery, toPrologList } from "./core-module.js";
import { loadEntities } from "./entity-query.js";
import { handleKbStatus, type StatusPayload } from "./status.js";
import { resolveWorkspaceRoot } from "../workspace.js";
import { isOperationalArtifactPath } from "kibi-cli/operational-artifacts";

export interface BriefingGenerateArgs {
  taskText?: string;
  sourceFiles?: string[];
  seedIds?: string[];
}

interface BriefingCitation {
  id: string;
  type: string;
  title: string;
  source?: string;
  textRef?: string;
}

interface BriefingStatement {
  statement: string;
  citationIds: string[];
}

interface BriefingEntity extends BriefingCitation {
  status: string;
  reason: string;
  score: number;
}

interface BriefingFreshness {
  state: "fresh" | "stale" | "unknown";
  syncState: string;
  dirty: boolean;
  syncedAt: string | null;
}

interface BriefingConfidence {
  score: number;
  level: "high" | "medium" | "low";
  reasons: string[];
}

interface BriefingGenerateResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    briefingState: "ready" | "no_briefing";
    activationState: string;
    activationReason: string;
    freshness: BriefingFreshness;
    confidence: BriefingConfidence;
    tldr: string;
    promptBlock: string;
    entities: BriefingEntity[];
    constraints: BriefingStatement[];
    regressionRisks: BriefingStatement[];
    missingEvidence: BriefingStatement[];
    citations: BriefingCitation[];
  };
}

interface CandidateAccumulator {
  entity: Record<string, unknown>;
  score: number;
  reasons: string[];
}

interface GraphPayload {
  nodes: Array<Record<string, unknown>>;
  edges: Array<{ from?: string; to?: string; type?: string }>;
  truncated: boolean;
  meta?: Record<string, unknown>;
}

const ALLOWED_TYPES = [
  "req",
  "adr",
  "scenario",
  "test",
  "fact",
  "flag",
  "symbol",
] as const;

const TYPE_PRIORITY: Record<(typeof ALLOWED_TYPES)[number], number> = {
  req: 7,
  adr: 6,
  scenario: 5,
  test: 4,
  fact: 3,
  flag: 2,
  symbol: 1,
};

const GRAPH_RELATIONSHIPS = [
  "implements",
  "covered_by",
  "specified_by",
  "verified_by",
  "constrained_by",
  "constrains",
  "requires_property",
  "guards",
  "relates_to",
];

function activationReasonFor(state: ActivationState): string {
  switch (state) {
    case "vendored_only":
      return "Workspace appears to contain vendored Kibi sources only; briefing generation is disabled.";
    case "root_partial":
      return "Workspace root is partially configured; briefing generation is disabled until Kibi inputs fully resolve.";
    case "root_active_seeded":
      return "KB attached and ready for citation-backed briefing generation in a seeded workspace.";
    case "root_active_thin":
      return "KB attached but thin; briefing generation may lack enough evidence.";
    default:
      return "Workspace root is not fully initialized; briefing generation is disabled until Kibi is attached.";
  }
}

function inferTextOnlyActivationState(workspaceRoot: string): ActivationState {
  try {
    const vendoredMarkers = [
      ["kibi", "opencode.json"],
      ["kibi", "package.json"],
      ["kibi", "packages", "mcp"],
      ["kibi", "documentation"],
    ];
    const hasVendoredTree = vendoredMarkers.some((segments) =>
      pathExists(path.join(workspaceRoot, ...segments)),
    );
    const hasRootConfig = pathExists(path.join(workspaceRoot, ".kb", "config.json"));

    if (!hasRootConfig && hasVendoredTree) {
      return "vendored_only";
    }
    if (!hasRootConfig) {
      return "root_uninitialized";
    }
  } catch {
    // Fall through to the conservative thin state below.
  }

  return "root_active_thin";
}

function pathExists(candidatePath: string): boolean {
  try {
    return fs.existsSync(candidatePath);
  } catch {
    return false;
  }
}

function unknownFreshness(): BriefingFreshness {
  return {
    state: "unknown",
    syncState: "unknown",
    dirty: false,
    syncedAt: null,
  };
}

function normalizeTaskText(taskText?: string): string {
  return (taskText ?? "").trim();
}

function normalizeSeedIds(seedIds?: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const seedId of seedIds ?? []) {
    const trimmed = String(seedId ?? "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}

function normalizeSourceFiles(
  workspaceRoot: string,
  sourceFiles?: string[],
): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  const normalizedRoot = path.resolve(workspaceRoot);

  for (const sourceFile of sourceFiles ?? []) {
    const trimmed = String(sourceFile ?? "").trim();
    if (!trimmed) continue;

    const candidateAbsolute = path.resolve(
      path.isAbsolute(trimmed)
        ? trimmed
        : path.join(normalizedRoot, trimmed),
    );
    const relative = path.relative(normalizedRoot, candidateAbsolute);
    const repoRelative = !relative.startsWith("..") && !path.isAbsolute(relative)
      ? relative
      : trimmed;
    const normalizedPath = repoRelative
      .split(path.sep)
      .join("/")
      .replace(/^\.\//, "")
      .replace(/^\//, "");

    if (!normalizedPath || seen.has(normalizedPath) || isOperationalArtifactPath(normalizedPath)) continue;
    seen.add(normalizedPath);
    normalized.push(normalizedPath);
  }

  return normalized;
}

function isAllowedType(type: string): type is (typeof ALLOWED_TYPES)[number] {
  return ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number]);
}

function stripOuterSingleQuotes(value: string): string {
  return value.startsWith("'") && value.endsWith("'") && value.length >= 2
    ? value.slice(1, -1)
    : value;
}

function candidateKey(entity: Record<string, unknown>): string {
  return `${String(entity.type ?? "")}::${String(entity.id ?? "")}`;
}

function normalizeEntity(entity: Record<string, unknown>): Record<string, unknown> | null {
  const type = stripOuterSingleQuotes(String(entity.type ?? "").trim());
  if (!isAllowedType(type)) return null;

  const source = entity.source ? String(entity.source).trim().split(path.sep).join("/") : undefined;
  if (source && isOperationalArtifactPath(source)) return null;

  return {
    ...entity,
    id: String(entity.id ?? "").trim(),
    type,
    title: String(entity.title ?? "").trim(),
    status: String(entity.status ?? "").trim(),
    source,
    textRef: entity.textRef
      ? String(entity.textRef).trim()
      : entity.text_ref
        ? String(entity.text_ref).trim()
        : undefined,
  };
}

function addCandidate(
  candidates: Map<string, CandidateAccumulator>,
  entity: Record<string, unknown>,
  scoreDelta: number,
  reason: string,
): void {
  const normalizedEntity = normalizeEntity(entity);
  if (!normalizedEntity) return;

  const key = candidateKey(normalizedEntity);
  const existing = candidates.get(key);
  if (existing) {
    existing.score += scoreDelta;
    if (!existing.reasons.includes(reason)) {
      existing.reasons.push(reason);
    }
    return;
  }

  candidates.set(key, {
    entity: normalizedEntity,
    score: scoreDelta,
    reasons: [reason],
  });
}

function toFreshness(statusPayload: StatusPayload): BriefingFreshness {
  const syncState = String(statusPayload.syncState ?? "unknown");
  if (statusPayload.dirty || syncState === "stale") {
    return {
      state: "stale",
      syncState,
      dirty: Boolean(statusPayload.dirty),
      syncedAt: statusPayload.syncedAt ?? null,
    };
  }
  if (syncState === "fresh") {
    return {
      state: "fresh",
      syncState,
      dirty: Boolean(statusPayload.dirty),
      syncedAt: statusPayload.syncedAt ?? null,
    };
  }
  return {
    state: "unknown",
    syncState,
    dirty: Boolean(statusPayload.dirty),
    syncedAt: statusPayload.syncedAt ?? null,
  };
}

function summarizeCandidateReason(reasons: string[]): string {
  return reasons.join(", ");
}

function sortedEntities(
  candidates: Map<string, CandidateAccumulator>,
): BriefingEntity[] {
  return Array.from(candidates.values())
    .map(({ entity, score, reasons }) => {
      const type = String(entity.type) as (typeof ALLOWED_TYPES)[number];
      const typeBonus = TYPE_PRIORITY[type] ?? 0;
      return {
        id: String(entity.id ?? ""),
        type,
        title: String(entity.title ?? ""),
        status: String(entity.status ?? ""),
        ...(entity.source ? { source: String(entity.source) } : {}),
        ...(entity.textRef ? { textRef: String(entity.textRef) } : {}),
        score: score + typeBonus,
        reason: summarizeCandidateReason(reasons),
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      const leftPriority = TYPE_PRIORITY[left.type as keyof typeof TYPE_PRIORITY] ?? 0;
      const rightPriority = TYPE_PRIORITY[right.type as keyof typeof TYPE_PRIORITY] ?? 0;
      if (rightPriority !== leftPriority) {
        return rightPriority - leftPriority;
      }
      return left.id.localeCompare(right.id);
    })
    .slice(0, 8);
}

function selectCitationIds(
  entities: BriefingEntity[],
  predicate: (entity: BriefingEntity) => boolean,
): string[] {
  return entities.filter(predicate).map((entity) => entity.id);
}

function asSearchableText(entity: BriefingEntity): string {
  return `${entity.title} ${entity.source ?? ""} ${entity.textRef ?? ""}`.toLowerCase();
}

function buildConstraints(entities: BriefingEntity[]): BriefingStatement[] {
  const statements: BriefingStatement[] = [];

  const adrCitationIds = selectCitationIds(
    entities,
    (entity) =>
      entity.type === "adr" &&
      asSearchableText(entity).includes("read-only") &&
      asSearchableText(entity).includes("mcp"),
  );
  if (adrCitationIds.length > 0) {
    statements.push({
      statement: "Keep the briefing generator read-only and MCP-owned.",
      citationIds: adrCitationIds,
    });
  }

  const deterministicCitationIds = selectCitationIds(
    entities,
    (entity) => {
      if (entity.type !== "req" && entity.type !== "test") return false;
      const searchable = asSearchableText(entity);
      return searchable.includes("deterministic") || searchable.includes("citation");
    },
  );
  if (deterministicCitationIds.length > 0) {
    statements.push({
      statement: "Return deterministic, citation-backed start-task output.",
      citationIds: deterministicCitationIds,
    });
  }

  return statements;
}

function buildRegressionRisks(entities: BriefingEntity[]): BriefingStatement[] {
  const statements: BriefingStatement[] = [];

  const orderingCitationIds = selectCitationIds(
    entities,
    (entity) =>
      entity.type === "test" &&
      (asSearchableText(entity).includes("deterministic") ||
        asSearchableText(entity).includes("briefing output")),
  );
  if (orderingCitationIds.length > 0) {
    statements.push({
      statement: "Do not let repeated calls change entity, citation, or prompt ordering.",
      citationIds: orderingCitationIds,
    });
  }

  const budgetCitationIds = selectCitationIds(
    entities,
    (entity) =>
      entity.type === "fact" &&
      (asSearchableText(entity).includes("prompt") ||
        asSearchableText(entity).includes("budget")),
  );
  if (budgetCitationIds.length > 0) {
    statements.push({
      statement: "Do not exceed the OpenCode prompt budget.",
      citationIds: budgetCitationIds,
    });
  }

  return statements;
}

function buildMissingEvidence(_entities: BriefingEntity[]): BriefingStatement[] {
  return [];
}

function bulletForEntity(entity: BriefingEntity): string | null {
  const searchable = asSearchableText(entity);

  if (
    entity.type === "req" &&
    searchable.includes("deterministic") &&
    searchable.includes("citation")
  ) {
    return `- ${entity.id}: Keep start-task briefings deterministic and citation-backed.`;
  }
  if (
    entity.type === "adr" &&
    searchable.includes("read-only") &&
    searchable.includes("mcp")
  ) {
    return `- ${entity.id}: Keep the MCP tool read-only; do not repair or mutate the workspace.`;
  }
  if (
    entity.type === "test" &&
    (searchable.includes("deterministic") || searchable.includes("briefing output"))
  ) {
    return `- ${entity.id}: Repeated calls must preserve entity, citation, and prompt ordering.`;
  }
  if (
    entity.type === "fact" &&
    (searchable.includes("prompt") || searchable.includes("budget"))
  ) {
    return `- ${entity.id}: Keep the prompt block within 120 words and 5 bullets.`;
  }

  return null;
}

function buildPromptBlock(entities: BriefingEntity[]): string {
  if (entities.length === 0) {
    return "";
  }

  const allBullets = entities
    .map((entity) => bulletForEntity(entity))
    .filter((bullet): bullet is string => bullet !== null);

  if (allBullets.length === 0) {
    return "";
  }

  const bullets = allBullets.slice(0, 5);
  let promptBlock = bullets.join("\n");
  let words = promptBlock.split(/\s+/).filter(Boolean);

  if (words.length > 120) {
    // Hard-truncate to 120 words, preserving whole bullets where possible
    const truncated: string[] = [];
    let wordCount = 0;
    for (const bullet of bullets) {
      const bulletWords = bullet.split(/\s+/).filter(Boolean);
      if (wordCount + bulletWords.length > 120) {
        // Take a partial bullet that fits within budget
        const remaining = 120 - wordCount;
        if (remaining > 3) {
          truncated.push(bulletWords.slice(0, remaining).join(" ") + "\u2026");
        }
        break;
      }
      truncated.push(bullet);
      wordCount += bulletWords.length;
    }
    promptBlock = truncated.join("\n");
  }

  return promptBlock;
}

function buildCitations(entities: BriefingEntity[]): BriefingCitation[] {
  return entities
    .filter((entity) => {
      if (entity.source && isOperationalArtifactPath(entity.source)) return false;
      if (entity.textRef && isOperationalArtifactPath(entity.textRef)) return false;
      return true;
    })
    .map((entity) => ({
      id: entity.id,
      type: entity.type,
      title: entity.title,
      ...(entity.source ? { source: entity.source } : {}),
      ...(entity.textRef ? { textRef: entity.textRef } : {}),
    }));
}

function roundScore(score: number): number {
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

function buildConfidence(
  activationState: ActivationState,
  freshness: BriefingFreshness,
  entities: BriefingEntity[],
  missingEvidence: BriefingStatement[],
  promptBlock: string,
): BriefingConfidence {
  const reasons: string[] = [];
  let score = entities.length > 0 ? 0.82 : 0.35;

  if (activationState === "root_active_seeded") {
    score += 0.13;
    reasons.push("Seeded workspace provides broad KB evidence.");
  } else if (activationState === "root_active_thin") {
    score -= 0.2;
    reasons.push("Thin workspace reduces available evidence.");
  } else {
    score -= 0.4;
    reasons.push("Workspace posture does not support reliable briefing generation.");
  }

  if (freshness.state !== "fresh") {
    score -= 0.25;
    reasons.push("KB freshness is not clean enough for a ready briefing.");
  }
  if (freshness.dirty) {
    score -= 0.1;
    reasons.push("Workspace is dirty, so citations may be stale.");
  }
  if (missingEvidence.length > 0) {
    score -= 0.15;
    reasons.push("Some briefing claims are missing supporting evidence.");
  }
  if (!promptBlock) {
    score -= 0.1;
    reasons.push("Prompt block could not be assembled within the prompt budget.");
  }

  const rounded = roundScore(score);
  return {
    score: rounded,
    level: rounded >= 0.8 ? "high" : rounded >= 0.55 ? "medium" : "low",
    reasons,
  };
}

async function expandGraphNeighbors(
  prolog: PrologProcess,
  seedIds: string[],
): Promise<Map<string, Record<string, unknown>>> {
  if (seedIds.length === 0) {
    return new Map();
  }

  const payload = await runJsonModuleQuery<GraphPayload>(
    prolog,
    "discovery.pl",
    `discovery:graph_expand_json(${toPrologList(seedIds)}, ${toPrologList(GRAPH_RELATIONSHIPS)}, 'both', 1, [], 200, 500, JsonString)`,
    "Briefing graph expansion",
  );

  const seedSet = new Set(seedIds);
  const connected = new Set<string>();
  for (const edge of payload.edges ?? []) {
    const from = String(edge.from ?? "");
    const to = String(edge.to ?? "");
    if (seedSet.has(from) && to) connected.add(to);
    if (seedSet.has(to) && from) connected.add(from);
  }

  const neighbors = new Map<string, Record<string, unknown>>();
  for (const node of payload.nodes ?? []) {
    const normalized = normalizeEntity(node);
    if (!normalized) continue;
    const nodeId = String(normalized.id ?? "");
    if (seedSet.has(nodeId) || !connected.has(nodeId)) continue;
    neighbors.set(nodeId, normalized);
  }

  return neighbors;
}

async function loadByIds(
  prolog: PrologProcess,
  ids: string[],
): Promise<Record<string, unknown>[]> {
  const groups = await Promise.all(ids.map((id) => loadEntities(prolog, { id })));
  return groups.flat();
}

async function loadBySourceFiles(
  prolog: PrologProcess,
  sourceFiles: string[],
): Promise<Record<string, unknown>[]> {
  const groups = await Promise.all(
    sourceFiles.map((sourceFile) => loadEntities(prolog, { sourceFile })),
  );
  return groups.flat();
}

function buildTldr(briefingState: "ready" | "no_briefing", entities: BriefingEntity[]): string {
  if (briefingState === "ready") {
    const citedIds = entities.slice(0, 4).map((entity) => entity.id).join(", ");
    return `Ready briefing assembled from ${entities.length} cited entities: ${citedIds}.`;
  }
  return "No reliable briefing is available from the current workspace posture and freshness state.";
}

export async function handleKbBriefingGenerate( // implements REQ-mcp-kibi-briefing-v1
  prolog: PrologProcess,
  args: BriefingGenerateArgs,
): Promise<BriefingGenerateResult> {
  const workspaceRoot = resolveWorkspaceRoot();
  const taskText = normalizeTaskText(args.taskText);
  const sourceFiles = normalizeSourceFiles(workspaceRoot, args.sourceFiles);
  const seedIds = normalizeSeedIds(args.seedIds);

  if (!taskText && sourceFiles.length === 0 && seedIds.length === 0) {
    throw new Error(
      "Briefing generation failed: at least one of taskText, sourceFiles, or seedIds must be provided",
    );
  }

  const useTextOnlyFastPath = taskText.length > 0 && sourceFiles.length === 0 && seedIds.length === 0;
  const activationState = useTextOnlyFastPath
    ? inferTextOnlyActivationState(workspaceRoot)
    : await classifyActivationState(workspaceRoot, prolog);
  const activationReason = activationReasonFor(activationState);
  const freshness = useTextOnlyFastPath
    ? unknownFreshness()
    : toFreshness((await handleKbStatus(prolog, {})).structuredContent as StatusPayload);

  if (
    activationState === "root_uninitialized" ||
    activationState === "root_partial" ||
    activationState === "vendored_only" ||
    freshness.state === "stale"
  ) {
    const confidence = buildConfidence(
      activationState,
      freshness,
      [],
      [],
      "",
    );
    return {
      content: [{ type: "text", text: "No briefing is available." }],
      structuredContent: {
        briefingState: "no_briefing",
        activationState,
        activationReason,
        freshness,
        confidence,
        tldr: buildTldr("no_briefing", []),
        promptBlock: "",
        entities: [],
        constraints: [],
        regressionRisks: [],
        missingEvidence: [],
        citations: [],
      },
    };
  }

  const candidates = new Map<string, CandidateAccumulator>();

  for (const entity of await loadByIds(prolog, seedIds)) {
    addCandidate(candidates, entity, 100, "seed hit");
  }

  for (const entity of await loadBySourceFiles(prolog, sourceFiles)) {
    addCandidate(candidates, entity, 90, "source-file hit");
  }

  const rankedIds: string[] = [];
  if (taskText) {
    const allEntities = (await loadEntities(prolog, {})).filter((entity) =>
      isAllowedType(String(entity.type ?? "")),
    );
    const matches = await rankEntities(allEntities, taskText, workspaceRoot);
    matches.forEach((match, index) => {
      rankedIds.push(String(match.entity.id ?? ""));
      addCandidate(
        candidates,
        match.entity,
        70 - index,
        `text-search hit (#${index + 1})`,
      );
    });
  }

  const graphSeeds = Array.from(
    new Set([
      ...seedIds,
      ...sourceFiles.flatMap(() => []),
      ...Array.from(candidates.values()).map((candidate) => String(candidate.entity.id ?? "")),
      ...rankedIds,
    ].filter(Boolean)),
  );
  const graphNeighbors = await expandGraphNeighbors(prolog, graphSeeds);
  for (const neighbor of graphNeighbors.values()) {
    addCandidate(candidates, neighbor, 40, "graph neighbor");
  }

  const entities = sortedEntities(candidates);
  const constraints = buildConstraints(entities);
  const regressionRisks = buildRegressionRisks(entities);
  const missingEvidence = buildMissingEvidence(entities);
  const promptBlock = buildPromptBlock(entities);
  const citations = buildCitations(entities);
  const confidence = buildConfidence(
    activationState,
    freshness,
    entities,
    missingEvidence,
    promptBlock,
  );
  const briefingState = confidence.score >= 0.55 ? "ready" : "no_briefing";

  if (briefingState === "no_briefing") {
    return {
      content: [{ type: "text", text: "No briefing is available." }],
      structuredContent: {
        briefingState,
        activationState,
        activationReason,
        freshness,
        confidence,
        tldr: buildTldr("no_briefing", []),
        promptBlock: "",
        entities: [],
        constraints: [],
        regressionRisks: [],
        missingEvidence: [],
        citations: [],
      },
    };
  }

  return {
    content: [{ type: "text", text: `Briefing ready with ${entities.length} cited entities.` }],
    structuredContent: {
      briefingState,
      activationState,
      activationReason,
      freshness,
      confidence,
      tldr: buildTldr(briefingState, entities),
      promptBlock,
      entities,
      constraints,
      regressionRisks,
      missingEvidence,
      citations,
    },
  };
}
