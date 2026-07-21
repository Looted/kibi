import { loadEntities } from "../../public/operations/discovery-entities.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { buildAutopilotCandidates } from "./candidates.js";
import { discoverAutopilot } from "./discovery.js";
import { presentAutopilot } from "./presentation.js";
import type {
  AutopilotGenerateArgs,
  AutopilotGenerateResult,
  Candidate,
} from "./types.js";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function titleKey(candidate: Candidate): string {
  return `${candidate.entityType}::${candidate.title.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function firstUpsertId(candidate: Candidate): string {
  const first = candidate.applyPlan[0];
  if (typeof first?.id === "string") return first.id;
  const properties = first?.properties;
  return properties !== null &&
    typeof properties === "object" &&
    "id" in properties &&
    typeof properties.id === "string"
    ? properties.id
    : "";
}

export function selectAutopilotCandidates(
  input: readonly Candidate[],
  existingIds: ReadonlySet<string>,
  entityTypes: readonly string[] | undefined,
  maximum: number,
): {
  readonly candidates: readonly Candidate[];
  readonly suppressed: readonly Readonly<Record<string, unknown>>[];
} {
  const allowed =
    entityTypes && entityTypes.length > 0 ? new Set(entityTypes) : null;
  const sorted = input
    .filter((candidate) => allowed?.has(candidate.entityType) ?? true)
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        left.sourcePath.localeCompare(right.sourcePath),
    )
    .slice(0, maximum);
  const typedTitles = new Set(
    sorted
      .filter((candidate) => candidate.sourceKind === "typed_markdown")
      .map(titleKey),
  );
  const selected = new Map<string, Candidate>();
  const suppressed: Readonly<Record<string, unknown>>[] = [];
  const suppress = (candidate: Candidate, reason: string): void => {
    suppressed.push({
      candidateId: candidate.candidateId,
      reason,
      sourcePath: candidate.sourcePath,
      entityType: candidate.entityType,
    });
  };
  for (const candidate of sorted) {
    if (existingIds.has(firstUpsertId(candidate))) {
      suppress(candidate, "entity_exists");
      continue;
    }
    const key = titleKey(candidate);
    if (candidate.sourceKind === "generic_markdown" && typedTitles.has(key)) {
      suppress(candidate, "shadowed_by_typed_source");
      continue;
    }
    const previous = selected.get(key);
    if (!previous) {
      selected.set(key, candidate);
      continue;
    }
    const keepCandidate =
      candidate.confidence > previous.confidence ||
      (candidate.confidence === previous.confidence &&
        candidate.sourcePath < previous.sourcePath);
    suppress(keepCandidate ? previous : candidate, "duplicate_title");
    if (keepCandidate) selected.set(key, candidate);
  }
  return { candidates: [...selected.values()], suppressed };
}

async function existingEntityIds(
  context: OperationContext,
): Promise<ReadonlySet<string>> {
  if (!context.prolog) return new Set<string>();
  try {
    const entities = await loadEntities(context.prolog, {});
    return new Set(
      entities.map((entity) => String(entity.id ?? "")).filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
}

// implements REQ-mcp-init-kibi-autopilot-v1, REQ-kibi-operation-interface-parity
export async function executeAutopilotGenerate(
  args: AutopilotGenerateArgs,
  context: OperationContext,
): Promise<AutopilotGenerateResult> {
  const includeGenericMarkdown = args.includeGenericMarkdown ?? true;
  const minConfidence = clamp(args.minConfidence ?? 0.8, 0.6, 0.95);
  const maxCandidates = clamp(Math.trunc(args.maxCandidates ?? 50), 1, 200);
  const [discovery, existingIds] = await Promise.all([
    discoverAutopilot(context),
    existingEntityIds(context),
  ]);
  const built = discovery.activation.allowCandidateGeneration
    ? buildAutopilotCandidates(
        discovery.evidence,
        existingIds,
        minConfidence,
        includeGenericMarkdown,
      )
    : { candidates: [], sourceOnlySignals: [] };
  const filteredSignals =
    args.entityTypes && args.entityTypes.length > 0
      ? built.sourceOnlySignals.filter((signal) =>
          args.entityTypes?.includes(signal.kind),
        )
      : built.sourceOnlySignals;
  const selected = selectAutopilotCandidates(
    built.candidates.filter(
      (candidate) => candidate.confidence >= minConfidence,
    ),
    existingIds,
    args.entityTypes,
    maxCandidates,
  );
  const ignored = discovery.ignoredSources.map((sourcePath) => ({
    candidateId: "",
    reason: "ignored_source",
    sourcePath,
    entityType: "",
  }));
  return presentAutopilot({
    root: context.workspaceRoot,
    activation: discovery.activation,
    discoverySummary: discovery.summary,
    migrationWarning: discovery.migrationWarning,
    ...(args.bootstrapContext
      ? { bootstrapContext: args.bootstrapContext }
      : {}),
    candidates: selected.candidates,
    sourceOnlySignals: filteredSignals,
    suppressedCandidates: [...selected.suppressed, ...ignored],
  });
}
