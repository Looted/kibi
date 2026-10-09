import { createHash } from "node:crypto";
import path from "node:path";

import { loadEntityIds } from "../../public/operations/discovery-entities.js";
import { executeStatus } from "../../public/operations/discovery-executors.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readWorkspaceSnapshot } from "../../public/operations/workspace-snapshot.js";
import {
  type SemanticRelationship,
  stagedLogicalGroundingError,
} from "../semantic-advisor/ingestion-boundary.js";
import {
  buildBootstrapCandidates,
  isProvenanceStubCandidate,
} from "./candidates.js";
import { discoverBootstrap } from "./discovery.js";
import { buildIntentClaimCandidates } from "./intent-claims.js";
import { normalizeBootstrapContext, presentBootstrap } from "./presentation.js";
import { SubjectKeyRegistry, shareSubjectFacts } from "./requirement-claims.js";
import type {
  Candidate,
  PlanBootstrapArgs,
  PlanBootstrapResult,
  SourceOnlySignal,
} from "./types.js";
import { validateBootstrapPayload } from "./validation.js";

export function filterSourceOnlySignals(
  signals: readonly SourceOnlySignal[],
  entityTypes: readonly string[] | undefined,
): readonly SourceOnlySignal[] {
  return entityTypes && entityTypes.length > 0
    ? signals.filter((signal) => entityTypes.includes(signal.kind))
    : signals;
}
import { bootstrapEmptyKbSnapshotId } from "./types.js";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function titleKey(candidate: Candidate): string {
  return `${candidate.entityType}::${candidate.title.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function firstUpsertId(candidate: Candidate): string {
  const first =
    candidate.applyPlan.find(
      (payload) => payload.type === candidate.entityType,
    ) ?? candidate.applyPlan[0];
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

// implements REQ-bootstrap-write-safety, REQ-bootstrap-intent-claim-accounting, REQ-bootstrap-discovered-candidate-budget, REQ-bootstrap-provenance-stubs
export function selectBootstrapCandidates(
  input: readonly Candidate[],
  existingIds: ReadonlySet<string>,
  entityTypes: readonly string[] | undefined,
  maximum: number,
): {
  readonly candidates: readonly Candidate[];
  readonly suppressed: readonly Readonly<Record<string, unknown>>[];
  readonly sourceOnlySignals: readonly SourceOnlySignal[];
  readonly diagnostics: readonly string[];
} {
  const allowed = entityTypes?.length ? new Set(entityTypes) : null;
  const lane = (candidate: Candidate): number => {
    if (candidate.sourceKind === "intent_claim") return 0;
    if (
      candidate.entityType === "req" &&
      ["typed_markdown", "generic_markdown"].includes(candidate.sourceKind)
    )
      return 1;
    // Provenance stubs state no claim, so they take the budget last: a
    // candidate with a claim is never suppressed as over_limit by a stub.
    return isProvenanceStubCandidate(candidate) ? 3 : 2;
  };
  const suppressed: Readonly<Record<string, unknown>>[] = [];
  const sourceOnlySignals: SourceOnlySignal[] = [];
  const diagnostics: string[] = [];
  const suppress = (
    candidate: Candidate,
    reason: string,
    message?: string,
  ): void => {
    suppressed.push({
      candidateId: candidate.candidateId,
      reason,
      sourcePath: candidate.sourcePath,
      entityType: candidate.entityType,
      ...(message ? { message } : {}),
    });
  };
  const writable = input
    .filter((candidate) => {
      if (allowed && !allowed.has(candidate.entityType)) {
        // A filtered claim is the caller's choice, not a dropped claim.
        if (candidate.sourceKind === "intent_claim")
          suppress(candidate, "filtered_by_entity_type");
        return false;
      }
      if (existingIds.has(firstUpsertId(candidate))) {
        suppress(candidate, "entity_exists");
        return false;
      }
      try {
        if (candidate.applyPlan.length === 0)
          throw new Error("Candidate has no write actions");
        for (const payload of candidate.applyPlan)
          validateBootstrapPayload(payload, new Date());
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        suppress(candidate, "invalid_write", message);
        diagnostics.push(
          `Invalid bootstrap candidate at ${candidate.sourcePath}: ${message}`,
        );
        sourceOnlySignals.push({
          kind: "req",
          title: `Author requirement: ${candidate.title}`,
          sourcePath: candidate.sourcePath,
          confidence: candidate.confidence,
          evidence: candidate.evidence,
        });
        return false;
      }
    })
    .sort(
      (left, right) =>
        lane(left) - lane(right) ||
        right.confidence - left.confidence ||
        left.sourcePath.localeCompare(right.sourcePath) ||
        left.candidateId.localeCompare(right.candidateId),
    );
  const typedTitles = new Set(
    writable
      .filter((candidate) => candidate.sourceKind === "typed_markdown")
      .map(titleKey),
  );
  const selected = new Map<string, Candidate>();
  for (const candidate of writable) {
    const key = titleKey(candidate);
    if (candidate.sourceKind === "generic_markdown" && typedTitles.has(key)) {
      suppress(candidate, "shadowed_by_typed_source");
    } else if (selected.has(key)) {
      suppress(candidate, "duplicate_title");
    } else selected.set(key, candidate);
  }
  // Declared intent claims are never capped and sit outside the arithmetic:
  // they are what the human pointed at, and the schema already bounds them.
  // maxCandidates is the budget for candidates Kibi discovers itself, so a
  // long list of declared intent never starves the code, test and document
  // evidence that bootstrap is meant to link it to.
  const written = new Map<string, string>();
  const staged = new Map<string, Readonly<Record<string, unknown>>>();
  const candidates: Candidate[] = [];
  let discoveredCount = 0;
  let overLimit = 0;
  let overLimitStubs = 0;
  for (const candidate of selected.values()) {
    const discovered = candidate.sourceKind !== "intent_claim";
    if (discovered && discoveredCount >= maximum) {
      const stub = isProvenanceStubCandidate(candidate);
      suppressed.push({
        candidateId: candidate.candidateId,
        reason: "over_limit",
        sourcePath: candidate.sourcePath,
        entityType: candidate.entityType,
        provenanceStub: stub,
      });
      overLimit += 1;
      if (stub) overLimitStubs += 1;
      continue;
    }
    // Two candidates that write one entity ID with different content would
    // overwrite each other mid-apply and break the earlier one's grounding.
    const conflict = candidate.applyPlan.find((payload) => {
      const id = payloadId(payload);
      const previous = id ? written.get(id) : undefined;
      return previous !== undefined && previous !== JSON.stringify(payload);
    });
    if (conflict) {
      suppress(
        candidate,
        "duplicate_entity",
        `Entity ${payloadId(conflict)} is already written by another candidate with different content.`,
      );
      continue;
    }
    const groundingError = stagedGroundingError(candidate, staged);
    if (groundingError) {
      suppress(candidate, "invalid_write", groundingError);
      diagnostics.push(
        `Invalid bootstrap candidate at ${candidate.sourcePath}: ${groundingError}`,
      );
      continue;
    }
    for (const payload of candidate.applyPlan) {
      const id = payloadId(payload);
      if (!id) continue;
      written.set(id, JSON.stringify(payload));
      staged.set(id, stagedEntity(payload));
    }
    if (discovered) discoveredCount += 1;
    candidates.push(candidate);
  }
  if (overLimit > 0)
    diagnostics.push(
      `${overLimit} discovered candidate(s) exceeded maxCandidates ${maximum} and are suppressed as over_limit, ${overLimitStubs} of them provenance stubs that state no claim (raise the limit only for the ${overLimit - overLimitStubs} with a claim); declared intent claims do not count against it.`,
    );
  return {
    candidates,
    suppressed,
    sourceOnlySignals,
    diagnostics,
  };
}

function payloadId(payload: Readonly<Record<string, unknown>>): string {
  if (typeof payload.id === "string") return payload.id;
  const properties = payload.properties;
  return properties !== null &&
    typeof properties === "object" &&
    "id" in properties &&
    typeof properties.id === "string"
    ? properties.id
    : "";
}

function stagedEntity(
  payload: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const properties =
    payload.properties !== null && typeof payload.properties === "object"
      ? (payload.properties as Readonly<Record<string, unknown>>)
      : {};
  return { ...properties, id: payloadId(payload), type: payload.type };
}

/**
 * Run the write-time claim_key grounding check against the plan's own
 * earlier writes, so a mismatch is a suppressed candidate at plan time rather
 * than a terminal partial apply. Targets outside the plan are left to apply.
 */
// implements REQ-bootstrap-intent-claim-accounting
function stagedGroundingError(
  candidate: Candidate,
  planned: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
): string | null {
  const local = new Map(planned);
  for (const payload of candidate.applyPlan) {
    const id = payloadId(payload);
    if (id) local.set(id, stagedEntity(payload));
  }
  for (const payload of candidate.applyPlan) {
    const relationships = Array.isArray(payload.relationships)
      ? (payload.relationships as readonly SemanticRelationship[])
      : [];
    const error = stagedLogicalGroundingError(payload, relationships, local);
    if (error) return error;
  }
  return null;
}

async function existingEntityIds(
  context: OperationContext,
): Promise<ReadonlySet<string>> {
  if (!context.prolog) return new Set<string>();
  try {
    // Ids only: materializing every entity (receipt histories included)
    // just to build this set exceeds the bounded engine output.
    return new Set((await loadEntityIds(context.prolog)).filter(Boolean));
  } catch (error) {
    throw new Error(
      `Bootstrap binding could not read existing entity IDs: ${error instanceof Error ? error.message : String(error)}`,
    );
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

// implements REQ-KIBI-BOOTSTRAP-PLAN, REQ-kibi-operation-interface-parity, REQ-bootstrap-discovered-candidate-budget
// implements REQ-KIBI-BOOTSTRAP-PLAN
export async function executePlanBootstrap(
  args: PlanBootstrapArgs,
  context: OperationContext,
): Promise<PlanBootstrapResult> {
  const declared = normalizeBootstrapContext(args.bootstrapContext);
  // Declared intent claims already carry the human's sources of truth, so
  // generic Markdown would mostly restate them as duplicate_title noise.
  const genericMarkdownDefaultOff =
    args.includeGenericMarkdown === undefined &&
    (declared.intentClaims?.length ?? 0) > 0;
  const includeGenericMarkdown =
    args.includeGenericMarkdown ?? !genericMarkdownDefaultOff;
  const minConfidence = clamp(args.minConfidence ?? 0.8, 0.6, 0.95);
  const maxCandidates = clamp(Math.trunc(args.maxCandidates ?? 50), 1, 200);
  const entityBindingDiagnostics: string[] = [];
  const [discovery, existingIds] = await Promise.all([
    discoverBootstrap(context),
    existingEntityIds(context).catch((error: Error) => {
      entityBindingDiagnostics.push(error.message);
      return new Set<string>();
    }),
  ]);
  // Discovery runs before planning so its evidence paths can be bound into
  // the exact plan rather than leaving the reviewer to reconstruct them.
  const bound = await expectedSnapshots(
    context,
    discovery.evidence
      .map((evidence) => evidence.relativePath)
      .filter((value): value is string => Boolean(value)),
  );
  // One registry per plan keeps subject keys distinct across repository
  // documents and declared intent claims.
  const subjectKeys = new SubjectKeyRegistry();
  const built = discovery.activation.allowCandidateGeneration
    ? buildBootstrapCandidates(
        discovery.evidence,
        new Set<string>(),
        minConfidence,
        includeGenericMarkdown,
        subjectKeys,
      )
    : {
        candidates: [],
        sourceOnlySignals: [],
        suppressed: [],
        diagnostics: [],
      };
  // Intent harvested from declared knowledge sources joins the repository
  // evidence under the same activation policy, filters, and selection.
  const claimed = discovery.activation.allowCandidateGeneration
    ? buildIntentClaimCandidates(
        declared,
        existingIds,
        minConfidence,
        subjectKeys,
      )
    : {
        candidates: [],
        sourceOnlySignals: [],
        suppressed: [],
        diagnostics: [],
      };
  const filteredSignals = filterSourceOnlySignals(
    [...built.sourceOnlySignals, ...claimed.sourceOnlySignals],
    args.entityTypes,
  );
  const selected = selectBootstrapCandidates(
    [...built.candidates, ...claimed.candidates].filter(
      (candidate) => candidate.confidence >= minConfidence,
    ),
    existingIds,
    args.entityTypes,
    maxCandidates,
  );
  // Claims about the same subject share one subject fact.
  const shared = shareSubjectFacts(selected.candidates);
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
    pluginOffers: discovery.pluginOffers,
    ...(args.bootstrapContext
      ? { bootstrapContext: args.bootstrapContext }
      : {}),
    candidates: shared.candidates,
    sourceOnlySignals: [
      ...filteredSignals,
      ...filterSourceOnlySignals(selected.sourceOnlySignals, args.entityTypes),
    ],
    suppressedCandidates: [
      ...selected.suppressed,
      ...claimed.suppressed,
      ...built.suppressed,
      ...ignored,
    ],
    expected,
    bindingDiagnostics: [...bindingDiagnostics, ...entityBindingDiagnostics],
    contextDiagnostics: [
      ...(genericMarkdownDefaultOff
        ? [
            "Generic Markdown candidates are off by default because intent claims were declared; pass includeGenericMarkdown: true to include them.",
          ]
        : []),
      ...claimed.diagnostics,
      ...built.diagnostics,
      ...selected.diagnostics,
      ...shared.diagnostics,
    ],
  });
}
