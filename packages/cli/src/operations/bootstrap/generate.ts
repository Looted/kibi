import { createHash } from "node:crypto";
import path from "node:path";

import { loadEntities } from "../../public/operations/discovery-entities.js";
import { executeStatus } from "../../public/operations/discovery-executors.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readWorkspaceSnapshot } from "../../public/operations/workspace-snapshot.js";
import { buildBootstrapCandidates } from "./candidates.js";
import { discoverBootstrap } from "./discovery.js";
import { presentBootstrap } from "./presentation.js";
import type {
  Candidate,
  PlanBootstrapArgs,
  PlanBootstrapResult,
} from "./types.js";
import { bootstrapEmptyKbSnapshotId } from "./types.js";

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

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function selectBootstrapCandidates(
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

async function expectedSnapshots(
  context: OperationContext,
  evidencePaths: readonly string[],
): Promise<{
  readonly branch: string;
  readonly kbSnapshotId: string;
  readonly workspaceSnapshot: string;
  readonly sourceHashes: Readonly<Record<string, string | null>>;
  readonly bindingDiagnostics: readonly string[];
}> {
  const diagnostics: string[] = [];
  try {
    const result = await executeStatus({}, context);
    const status = result.structuredContent;
    const workspace = await readWorkspaceSnapshot(context);
    const sourceHashes: Record<string, string | null> = {};
    if (!context.fs) {
      diagnostics.push(
        "Bootstrap plan binding requires a filesystem-capable runtime.",
      );
    } else {
      // Bind every evidence document that can affect candidate selection. The
      // workspace hash is still authoritative for the complete checkout, but
      // these per-source hashes make the plan's evidence set inspectable.
      // Layout providers legitimately surface directory rows (for example a
      // bare `src` entry); directories carry no hashable document content and
      // must not surface as binding diagnostics, which would otherwise block
      // an otherwise-ready thin-bootstrap plan.
      for (const relative of new Set(evidencePaths)) {
        try {
          const resolved = path.resolve(context.workspaceRoot, relative);
          if (!(await context.fs.stat(resolved)).isFile()) continue;
          sourceHashes[relative] = sha256(await context.fs.readFile(resolved));
        } catch {
          sourceHashes[relative] = null;
          diagnostics.push(
            `Bootstrap evidence source is unavailable: ${relative}`,
          );
        }
      }
    }
    const branch = status?.branch ?? context.branchAttachment?.kbBranch;
    const workspaceSnapshot = workspace.available
      ? workspace.snapshot.hash
      : undefined;
    if (!branch || branch === "unknown")
      diagnostics.push(
        "Bootstrap plan binding could not determine the active Git branch.",
      );
    if (!workspaceSnapshot || !/^[a-f0-9]{64}$/i.test(workspaceSnapshot))
      diagnostics.push(
        "Bootstrap plan binding could not determine a current workspace snapshot.",
      );
    const rawSnapshot = status?.snapshotId;
    const kbSnapshotId =
      rawSnapshot === "missing" &&
      branch &&
      workspaceSnapshot &&
      /^[a-f0-9]{64}$/i.test(workspaceSnapshot)
        ? bootstrapEmptyKbSnapshotId({
            branch,
            workspaceSnapshot,
            sourceHashes,
          })
        : rawSnapshot;
    if (
      !kbSnapshotId ||
      kbSnapshotId === "unknown" ||
      kbSnapshotId === "missing" ||
      kbSnapshotId === "unavailable"
    )
      diagnostics.push(
        "Bootstrap plan binding could not determine a current KB snapshot.",
      );
    return {
      branch: branch ?? "unavailable",
      kbSnapshotId: kbSnapshotId ?? "unavailable",
      workspaceSnapshot: workspaceSnapshot ?? "unavailable",
      sourceHashes,
      bindingDiagnostics: diagnostics,
    };
  } catch {
    return {
      branch: context.branchAttachment?.kbBranch ?? "unavailable",
      kbSnapshotId: "unavailable",
      workspaceSnapshot: "unavailable",
      sourceHashes: {},
      bindingDiagnostics: [
        "Bootstrap plan binding could not read current repository state.",
      ],
    };
  }
}

// implements REQ-mcp-kibi-bootstrap-bootstrap-v1, REQ-kibi-operation-interface-parity
// implements REQ-KIBI-BOOTSTRAP-PLAN
export async function executePlanBootstrap(
  args: PlanBootstrapArgs,
  context: OperationContext,
): Promise<PlanBootstrapResult> {
  const includeGenericMarkdown = args.includeGenericMarkdown ?? true;
  const minConfidence = clamp(args.minConfidence ?? 0.8, 0.6, 0.95);
  const maxCandidates = clamp(Math.trunc(args.maxCandidates ?? 50), 1, 200);
  const [discovery, existingIds] = await Promise.all([
    discoverBootstrap(context),
    existingEntityIds(context),
  ]);
  // Discovery runs before planning so its evidence paths can be bound into
  // the exact plan rather than leaving the reviewer to reconstruct them.
  const bound = await expectedSnapshots(
    context,
    discovery.evidence
      .map((evidence) => evidence.relativePath)
      .filter((value): value is string => Boolean(value)),
  );
  const built = discovery.activation.allowCandidateGeneration
    ? buildBootstrapCandidates(
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
  const selected = selectBootstrapCandidates(
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
  const { bindingDiagnostics, ...expected } = bound;
  return presentBootstrap({
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
    expected,
    bindingDiagnostics,
  });
}
