import { compilerFingerprintReason } from "../../commands/sync/cache.js";
import { EngineClient } from "../../engine.js";
import {
  type IntentSearchAnalysis,
  type IntentSearchFacets,
  type IntentSearchMatch,
  type SourceLocation,
  executeIntentSearch,
  validateIntentSearchInput,
} from "../../intent-search.js";
import { classifyActivation } from "../../operations/bootstrap/activation.js";
import { SwiplResolutionError } from "../../prolog/swipl-resolver.js";
import { type SearchAnswer, buildSearchAnswer } from "../../search-answer.js";
import { rankEntities } from "../../search-ranking.js";
import type { SearchMatch } from "../../search-ranking.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import {
  type BranchStoreInspection,
  branchStoreReason,
  inspectBranchStore,
  storeLockJournalReason,
} from "../../utils/branch-store.js";
import {
  loadEntities,
  loadSearchCandidates,
  paginateResults,
  queryEntitiesViaQuery,
  reloadFullEntities,
  validateEntityType,
} from "./discovery-entities.js";
import {
  type MigrationConfigStatus,
  type MigrationPlan,
  buildActionsFromStatus,
  readMigrationConfigStatus,
} from "./migration-plan.js";
import {
  OperationJsonDecodeError,
  runOperationJsonQuery,
} from "./prolog-json.js";
import type { OperationContext, PrologPort } from "./runtime-types.js";
import type { OperationResult } from "./types.js";
import { readWorkspaceSnapshot } from "./workspace-snapshot.js";

export type QueryInput = {
  readonly type?: string;
  readonly id?: string;
  readonly tags?: readonly string[];
  readonly sourceFile?: string;
  readonly limit?: number;
  readonly offset?: number;
};

export type QueryPayload = {
  readonly entities: readonly Record<string, unknown>[];
  readonly count: number;
};

export type SearchInput = {
  readonly query: string;
  readonly type?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly rankingMode?: "legacy" | "intent-v1";
  readonly semanticFacets?: IntentSearchFacets;
  readonly sourceLocations?: readonly SourceLocation[];
  readonly minScore?: number;
  readonly fields?: "summary" | "full";
  readonly answer?: boolean;
};

export type SearchPayload = {
  readonly results: readonly (SearchMatch | IntentSearchMatch)[];
  readonly count: number;
  readonly truncated?: boolean;
  readonly queryAnalysis?: IntentSearchAnalysis;
  readonly answer?: SearchAnswer;
};

export type StatusInput = Readonly<Record<string, never>>;

export type StatusPayload = {
  readonly branch: string;
  readonly snapshotId: string;
  readonly syncedAt: string | null;
  readonly dirty: boolean;
  readonly syncState: string;
  readonly kbPath?: string;
  readonly lastSyncSource?: string;
  readonly proofSnapshot?: string;
  readonly proofSnapshotAvailable?: boolean;
  readonly proofSnapshotDirty?: boolean;
  readonly proofSnapshotFileCount?: number;
  readonly proofSnapshotVersion?: string;
  readonly proofSnapshotError?: string;
  readonly staleReasons?: readonly Record<string, unknown>[];
  readonly staleReasonCount?: number;
  readonly staleReasonsTruncated?: boolean;
  readonly branchAttachment?: {
    readonly gitBranch: string;
    readonly kbBranch: string;
    readonly kind: "exact" | "explicit_override" | "legacy_compat";
    readonly migrationRequired: boolean;
  };
  readonly proofSnapshotChanges?: readonly Record<string, unknown>[];
  readonly proofSnapshotChangeCount?: number;
  readonly proofSnapshotChangesTruncated?: boolean;
  readonly branchStore?: BranchStoreInspection;
  readonly engineStatus?: {
    readonly state: "healthy" | "unavailable";
    readonly errorCode?: string;
    readonly detail?: string;
    readonly recoveryRequired: boolean;
  };
  readonly schemaStatus?: MigrationConfigStatus;
  readonly migrationPlan?: MigrationPlan;
  readonly bootstrap?: {
    readonly activationState: string;
    readonly activationMode: string;
    readonly planEligible: boolean;
    readonly reason: string;
    readonly nextAction?: Readonly<Record<string, unknown>>;
  };
};

function requireProlog(context: OperationContext): PrologPort {
  if (!context.prolog) {
    throw new Error("Discovery operation requires a Prolog context");
  }
  return context.prolog;
}

function isStatusPayload(value: unknown): value is StatusPayload {
  if (value === null || typeof value !== "object") return false;
  const record = Object.fromEntries(Object.entries(value));
  return (
    typeof record.branch === "string" &&
    typeof record.snapshotId === "string" &&
    (typeof record.syncedAt === "string" || record.syncedAt === null) &&
    typeof record.dirty === "boolean" &&
    typeof record.syncState === "string"
  );
}

export async function executeQuery(
  input: QueryInput,
  context: OperationContext,
): Promise<OperationResult<QueryPayload>> {
  // implements REQ-kibi-operation-interface-parity
  const { type, id, tags, sourceFile, limit = 100, offset = 0 } = input;
  try {
    validateEntityType(type);
    const prolog = requireProlog(context);
    const signal = context.signal;
    const pageInput = {
      ...(type !== undefined ? { type } : {}),
      ...(id !== undefined ? { id } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(sourceFile !== undefined ? { sourceFile } : {}),
      limit,
      offset,
    };
    // Both paths return one bounded page plus the total count. Ports without
    // the engine method page kb_query_entities through `query` instead of
    // materializing every matching entity (receipt histories make an
    // all-tests answer exceed the bounded engine output).
    const indexedPage = prolog.queryEntities
      ? await prolog.queryEntities(pageInput, signal)
      : await queryEntitiesViaQuery(prolog, pageInput, signal);
    const paginated = indexedPage.entities;
    const text =
      indexedPage.count === 0
        ? `No entities found${type ? ` of type '${type}'` : ""}.`
        : `Found ${indexedPage.count} entities${type ? ` of type '${type}'` : ""}. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${paginated
            .map((entity) => {
              const entityId = String(entity.id ?? "").replace(
                /^file:\/\/.*\//,
                "",
              );
              return `${entityId} (${String(entity.title ?? "")}, status=${String(entity.status ?? "")})`;
            })
            .join(", ")}`;
    return {
      content: [{ type: "text", text }],
      structuredContent: { entities: paginated, count: indexedPage.count },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Query execution failed: ${message}`);
  }
}

/**
 * Identifying metadata a caller needs to decide which hits to open.
 *
 * Search is a discovery step, so returning complete entity bodies for every
 * hit spends a large share of an agent's context before it has chosen
 * anything. Full bodies stay available through `fields: "full"` or a follow-up
 * kb_query for the exact ids.
 */
const SUMMARY_ENTITY_FIELDS = [
  "id",
  "type",
  "title",
  "status",
  "priority",
  "tags",
  "source",
  "sourceFile",
  "updated_at",
] as const;

function summarizeMatch<TMatch extends { readonly entity: unknown }>(
  match: TMatch,
): TMatch {
  const entity = match.entity;
  if (entity === null || typeof entity !== "object" || Array.isArray(entity)) {
    return match;
  }
  const row = entity as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  for (const field of SUMMARY_ENTITY_FIELDS) {
    if (row[field] !== undefined) summary[field] = row[field];
  }
  return { ...match, entity: summary };
}

// Candidates are projected rows, so `fields: "full"` reloads the final page's
// complete entities by id (one bounded query each).
async function projectMatches<
  TMatch extends { readonly entity: Record<string, unknown> },
>(
  prolog: Pick<PrologPort, "query">,
  matches: readonly TMatch[],
  fields: SearchInput["fields"],
): Promise<readonly TMatch[]> {
  return fields === "full"
    ? reloadFullEntities(prolog, matches)
    : matches.map(summarizeMatch);
}

export async function executeSearch(
  input: SearchInput,
  context: OperationContext,
): Promise<OperationResult<SearchPayload>> {
  // implements REQ-kibi-operation-interface-parity, REQ-mcp-search-discovery
  const {
    query,
    type,
    limit = 20,
    offset = 0,
    rankingMode = "intent-v1",
    semanticFacets,
    sourceLocations,
    minScore,
    fields = "summary",
    answer,
  } = input;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error(
      "Search execution failed: query must be a non-empty string",
    );
  }
  validateEntityType(type);
  try {
    const prolog = requireProlog(context);
    const intentMode =
      rankingMode === "intent-v1" ||
      semanticFacets !== undefined ||
      sourceLocations !== undefined;
    if (intentMode) {
      const intentInput = {
        query: trimmedQuery,
        ...(type !== undefined ? { type } : {}),
        ...(semanticFacets !== undefined ? { semanticFacets } : {}),
        ...(sourceLocations !== undefined ? { sourceLocations } : {}),
        ...(minScore !== undefined ? { minScore } : {}),
      } as const;
      validateIntentSearchInput(intentInput);
      const intentResult = await executeIntentSearch(
        intentInput,
        prolog,
        context.workspaceRoot,
      );
      const paginated = paginateResults(intentResult.matches, limit, offset);
      // The answer layer summarizes the whole ranking, so it belongs to the
      // first page only.
      const answerLayer =
        (answer ?? true) && offset === 0 && intentResult.matches.length > 0
          ? await buildSearchAnswer(prolog, intentResult.matches, {
              workspaceRoot: context.workspaceRoot,
              branch: context.branchAttachment?.kbBranch ?? null,
            })
          : undefined;
      // The structured payload carries every row; the text is a short
      // human-readable digest instead of a second copy of the results.
      const text =
        intentResult.matches.length === 0
          ? `No intent search results for '${trimmedQuery}' (abstained).`
          : `Found ${intentResult.matches.length} intent search results for '${trimmedQuery}'${intentResult.analysis.ambiguous ? " (top matches are close; confirm before relying on one)" : ""}. Top: ${paginated
              .slice(0, 5)
              .map((match) => String(match.entity.id ?? ""))
              .join(
                ", ",
              )}${answerLayer ? `. Governing: ${answerLayer.governing.map((req) => req.id).join(", ") || "none found"}` : ""}.`;
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          results: await projectMatches(prolog, paginated, fields),
          count: intentResult.matches.length,
          truncated: offset + paginated.length < intentResult.matches.length,
          queryAnalysis: intentResult.analysis,
          ...(answerLayer ? { answer: answerLayer } : {}),
        },
      };
    }
    // Candidates are projected rows (no receipt histories or other large
    // structured properties); ports without the engine method run the same
    // bounded Prolog search through `query`.
    const entities = await loadSearchCandidates(
      prolog,
      {
        query: trimmedQuery,
        ...(type !== undefined ? { type } : {}),
      },
      context.signal,
    );
    const matches = await rankEntities(
      entities,
      trimmedQuery,
      context.workspaceRoot,
    );
    const paginated = paginateResults(matches, limit, offset);
    const text =
      matches.length === 0
        ? `No search results for '${trimmedQuery}'.`
        : `Found ${matches.length} search results for '${trimmedQuery}'. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${paginated
            .map(
              (match) =>
                `${String(match.entity.id ?? "")} [${match.reasons.join(", ")}]`,
            )
            .join(", ")}`;
    return {
      content: [{ type: "text", text }],
      structuredContent: {
        results: await projectMatches(prolog, paginated, fields),
        count: matches.length,
        truncated: offset + paginated.length < matches.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("Search execution failed:")) throw error;
    throw new Error(`Search execution failed: ${message}`);
  }
}

export async function executeStatus(
  _input: StatusInput,
  context: OperationContext,
): Promise<OperationResult<StatusPayload>> {
  // implements REQ-kibi-operation-interface-parity, REQ-cli-status-pre-first-sync
  try {
    const attachment =
      context.branchAttachment ??
      resolveBranchAttachment(context.workspaceRoot);
    if ("error" in attachment) {
      throw new Error(`Failed to resolve active branch: ${attachment.error}`);
    }
    let payload: StatusPayload;
    const store = inspectBranchStore(
      context.workspaceRoot,
      attachment.kbBranch,
    );
    let engineStatus: StatusPayload["engineStatus"];
    let ownedEngine: EngineClient | undefined;
    if (store.state !== "healthy") {
      // Status is deliberately safe before first sync and during recovery. Starting
      // EngineClient would initialise (or attempt to repair) the store, which turns
      // a diagnostic read into an accidental mutation.
      payload = {
        branch: attachment.kbBranch,
        snapshotId: store.state === "missing" ? "missing" : "unavailable",
        syncedAt: null,
        dirty: true,
        syncState: "unknown",
        kbPath: store.path,
        lastSyncSource: "unavailable",
        staleReasons: [],
        staleReasonCount: 0,
        staleReasonsTruncated: false,
      };
    } else
      try {
        // Prefer an injected or session-backed engine so MCP status shares the
        // same client as discovery tools. Only spawn an owned fallback when no
        // host session is available (CLI status without a live runtime port).
        let prolog = context.prolog;
        if (!prolog && context.ensureProlog) {
          prolog = await context.ensureProlog();
        }
        if (!prolog) {
          ownedEngine = new EngineClient({
            workspaceRoot: context.workspaceRoot,
            branch: attachment.kbBranch,
            timeout: 15_000,
          });
          prolog = ownedEngine;
        }
        payload = await runOperationJsonQuery<StatusPayload>(
          prolog,
          "status.pl",
          "status:kb_status_json(JsonString)",
          "Status execution",
          context.signal,
        );
        if (!isStatusPayload(payload)) {
          throw new Error("Status execution query returned an invalid payload");
        }
        // The Prolog status module sees the compiled directory key. The public
        // contract exposes the exact Git branch identity instead.
        payload = { ...payload, branch: attachment.kbBranch };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        engineStatus = {
          state: "unavailable",
          errorCode:
            error instanceof OperationJsonDecodeError
              ? error.code
              : error instanceof SwiplResolutionError
                ? error.code
                : "engine_status_unavailable",
          detail: message,
          recoveryRequired: false,
        };
        payload = {
          branch: attachment.kbBranch,
          snapshotId: "unavailable",
          syncedAt: null,
          dirty: true,
          syncState: "unknown",
          kbPath: store.path,
          lastSyncSource: "unavailable",
          staleReasons: [],
          staleReasonCount: 0,
          staleReasonsTruncated: false,
        };
      } finally {
        await ownedEngine?.terminate();
      }
    const snapshotEvidence = await readWorkspaceSnapshot(context);
    const existingReasons = payload.staleReasons ?? [];
    const storeReason = branchStoreReason(store);
    const lockReason = storeLockJournalReason(store.path);
    const compilerReason = compilerFingerprintReason(store.path);
    const engineReason = engineStatus
      ? {
          code: engineStatus.errorCode ?? "engine_status_unavailable",
          path: store.path,
          entityIds: [],
          detail:
            engineStatus.detail ??
            "The branch store is structurally readable but the engine status response is unavailable.",
          // implements REQ-prolog-doctor-runtime-report
          // A missing or unusable SWI-Prolog is not fixed by restarting the
          // engine; point at the diagnostic that reports the resolution.
          remediation: {
            command_argv: engineStatus.errorCode?.startsWith("swipl_")
              ? ["kibi", "doctor"]
              : ["kibi", "engine", "stop"],
            applyRequired: false,
          },
        }
      : null;
    const staleReasons = [
      ...existingReasons,
      ...(storeReason ? [storeReason] : []),
      ...(lockReason ? [lockReason] : []),
      ...(compilerReason ? [compilerReason] : []),
      ...(engineReason ? [engineReason] : []),
    ].sort((left, right) =>
      String(left.path ?? "").localeCompare(String(right.path ?? "")),
    );
    const enrichedPayload: StatusPayload = {
      ...payload,
      // Source hashes can all match while the compilation itself is lossy, so
      // a compiler contract change alone makes the store stale.
      ...(compilerReason ? { syncState: "stale", dirty: true } : {}),
      branchAttachment: attachment,
      branchStore: store,
      ...(engineStatus ? { engineStatus } : {}),
      staleReasons,
      staleReasonCount: staleReasons.length,
      staleReasonsTruncated: false,
      proofSnapshot: snapshotEvidence.available
        ? snapshotEvidence.snapshot.hash
        : "unknown",
      proofSnapshotAvailable: snapshotEvidence.available,
      ...(snapshotEvidence.available
        ? {
            proofSnapshotDirty: snapshotEvidence.snapshot.dirty,
            proofSnapshotFileCount: snapshotEvidence.snapshot.fileCount,
            proofSnapshotVersion: snapshotEvidence.snapshot.version,
            proofSnapshotChanges: snapshotEvidence.snapshot.changes ?? [],
            proofSnapshotChangeCount:
              snapshotEvidence.snapshot.changeCount ?? 0,
            proofSnapshotChangesTruncated:
              snapshotEvidence.snapshot.changesTruncated ?? false,
          }
        : { proofSnapshotError: snapshotEvidence.error }),
    };
    const schemaStatus = readMigrationConfigStatus(context.workspaceRoot);
    const migrationPlan = buildActionsFromStatus({
      workspaceRoot: context.workspaceRoot,
      branchAttachment: attachment,
      branchStore: store,
      staleReasons,
      proofSnapshotAvailable: snapshotEvidence.available,
      ...(snapshotEvidence.available
        ? { proofSnapshotDirty: snapshotEvidence.snapshot.dirty }
        : {}),
      kbSnapshotId: payload.snapshotId,
      workspaceSnapshot: snapshotEvidence.available
        ? snapshotEvidence.snapshot.hash
        : null,
      configStatus: schemaStatus,
    });
    const listed = context.fs?.glob
      ? await context.fs.glob(
          [
            ".kb/requirements/**/*.md",
            ".kb/scenarios/**/*.md",
            ".kb/tests/**/*.md",
            ".kb/adrs/**/*.md",
            ".kb/adr/**/*.md",
            ".kb/flags/**/*.md",
            ".kb/events/**/*.md",
            ".kb/facts/**/*.md",
          ],
          { cwd: context.workspaceRoot },
        )
      : [];
    const bootstrapSourceFiles = Array.isArray(listed) ? listed : [];
    const bootstrapActivation = await classifyActivation(
      context,
      bootstrapSourceFiles,
    );
    const statusWithPlan: StatusPayload = {
      ...enrichedPayload,
      schemaStatus,
      migrationPlan,
      bootstrap: {
        activationState: bootstrapActivation.activationState,
        activationMode: bootstrapActivation.activationMode,
        planEligible:
          bootstrapActivation.activationState === "root_active_thin" &&
          !bootstrapActivation.applyBlocked,
        reason: bootstrapActivation.reason,
        nextAction:
          bootstrapActivation.activationState === "root_uninitialized"
            ? {
                operation: "kibi init",
                reason: bootstrapActivation.reason,
                required: true,
              }
            : bootstrapActivation.activationState === "root_partial"
              ? {
                  operation: "kibi doctor",
                  reason: bootstrapActivation.reason,
                  required: true,
                }
              : bootstrapActivation.activationState === "vendored_only"
                ? {
                    operation: "move-to-project-root",
                    reason: bootstrapActivation.reason,
                    required: true,
                  }
                : bootstrapActivation.activationState === "root_active_thin"
                  ? {
                      operation: "kb_plan_bootstrap",
                      reason: bootstrapActivation.reason,
                      required: true,
                    }
                  : {
                      operation: "continue-kibi-workflow",
                      reason: bootstrapActivation.reason,
                      required: false,
                    },
      },
    };
    return {
      content: [
        {
          type: "text",
          text: `Branch ${payload.branch} is ${payload.syncState} (snapshot ${payload.snapshotId}, dirty=${payload.dirty}, proofSnapshot=${enrichedPayload.proofSnapshot})`,
        },
      ],
      structuredContent: statusWithPlan,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Status execution failed: ${message}`);
  }
}
