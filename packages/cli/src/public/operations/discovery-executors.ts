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
  paginateResults,
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
};

export type SearchPayload = {
  readonly results: readonly (SearchMatch | IntentSearchMatch)[];
  readonly count: number;
  readonly queryAnalysis?: IntentSearchAnalysis;
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
    const prolog = requireProlog(context);
    const signal = context.signal;
    const indexedPage = prolog.queryEntities
      ? await prolog.queryEntities(
          {
            ...(type !== undefined ? { type } : {}),
            ...(id !== undefined ? { id } : {}),
            ...(tags !== undefined ? { tags } : {}),
            ...(sourceFile !== undefined ? { sourceFile } : {}),
            limit,
            offset,
          },
          signal,
        )
      : null;
    if (indexedPage !== null) {
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
    }
    const entities = await loadEntities(requireProlog(context), {
      ...(type !== undefined ? { type } : {}),
      ...(id !== undefined ? { id } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(sourceFile !== undefined ? { sourceFile } : {}),
    });
    const paginated = paginateResults(entities, limit, offset);
    const text =
      entities.length === 0
        ? `No entities found${type ? ` of type '${type}'` : ""}.`
        : `Found ${entities.length} entities${type ? ` of type '${type}'` : ""}. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${paginated
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
      structuredContent: { entities: paginated, count: entities.length },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Query execution failed: ${message}`);
  }
}

/**
 * Lexical ranking scores the whole candidate set, so every candidate must be
 * read before results can be ordered or counted. Reading them in one request
 * serializes the entire matching corpus into a single Prolog response, which
 * overflows the bounded output buffer (ENOBUFS) on a mature KB and makes the
 * request cost scale with stored entity size rather than with the query.
 * Paging keeps each response small while preserving the same candidate set,
 * ranking, and total count.
 */
const SEARCH_CANDIDATE_PAGE_SIZE = 250;
const SEARCH_CANDIDATE_LIMIT = 100_000;

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

function projectMatches<TMatch extends { readonly entity: unknown }>(
  matches: readonly TMatch[],
  fields: SearchInput["fields"],
): readonly TMatch[] {
  return fields === "full" ? matches : matches.map(summarizeMatch);
}

async function loadSearchCandidates(
  prolog: PrologPort,
  query: string,
  type: string | undefined,
  signal: AbortSignal | undefined,
): Promise<Record<string, unknown>[]> {
  const searchEntities = prolog.searchEntities;
  if (!searchEntities) return [];

  const entities: Record<string, unknown>[] = [];
  for (
    let offset = 0;
    offset < SEARCH_CANDIDATE_LIMIT;
    offset += SEARCH_CANDIDATE_PAGE_SIZE
  ) {
    const page = await searchEntities.call(
      prolog,
      {
        query,
        ...(type !== undefined ? { type } : {}),
        limit: Math.min(
          SEARCH_CANDIDATE_PAGE_SIZE,
          SEARCH_CANDIDATE_LIMIT - offset,
        ),
        offset,
      },
      signal,
    );
    entities.push(...page.entities);
    if (page.entities.length < SEARCH_CANDIDATE_PAGE_SIZE) break;
  }
  return entities;
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
    rankingMode = "legacy",
    semanticFacets,
    sourceLocations,
    minScore,
    fields = "summary",
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
      const text =
        intentResult.matches.length === 0
          ? `No intent search results for '${trimmedQuery}' (abstained).`
          : `Found ${intentResult.matches.length} intent search results for '${trimmedQuery}'. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${paginated
              .map(
                (match) =>
                  `${String(match.entity.id ?? "")} [${match.reasons.join(", ")}]`,
              )
              .join(", ")}`;
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          results: projectMatches(paginated, fields),
          count: intentResult.matches.length,
          queryAnalysis: intentResult.analysis,
        },
      };
    }
    const entities = prolog.searchEntities
      ? await loadSearchCandidates(prolog, trimmedQuery, type, context.signal)
      : await loadEntities(prolog, {
          ...(type !== undefined ? { type } : {}),
        });
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
        results: projectMatches(paginated, fields),
        count: matches.length,
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
    const engineReason = engineStatus
      ? {
          code: engineStatus.errorCode ?? "engine_status_unavailable",
          path: store.path,
          entityIds: [],
          detail:
            engineStatus.detail ??
            "The branch store is structurally readable but the engine status response is unavailable.",
          remediation: {
            command_argv: ["kibi", "engine", "stop"],
            applyRequired: false,
          },
        }
      : null;
    const staleReasons = [
      ...existingReasons,
      ...(storeReason ? [storeReason] : []),
      ...(lockReason ? [lockReason] : []),
      ...(engineReason ? [engineReason] : []),
    ].sort((left, right) =>
      String(left.path ?? "").localeCompare(String(right.path ?? "")),
    );
    const enrichedPayload: StatusPayload = {
      ...payload,
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
