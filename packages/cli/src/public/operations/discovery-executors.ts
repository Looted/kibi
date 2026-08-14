import { EngineClient } from "../../engine.js";
import {
  type IntentSearchAnalysis,
  type IntentSearchFacets,
  type IntentSearchMatch,
  type SourceLocation,
  executeIntentSearch,
  validateIntentSearchInput,
} from "../../intent-search.js";
import { rankEntities } from "../../search-ranking.js";
import type { SearchMatch } from "../../search-ranking.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import {
  type BranchStoreInspection,
  branchStoreReason,
  inspectBranchStore,
} from "../../utils/branch-store.js";
import {
  loadEntities,
  paginateResults,
  validateEntityType,
} from "./discovery-entities.js";
import { runOperationJsonQuery } from "./prolog-json.js";
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
  readonly verificationSnapshot?: string;
  readonly verificationSnapshotAvailable?: boolean;
  readonly verificationSnapshotDirty?: boolean;
  readonly verificationSnapshotFileCount?: number;
  readonly verificationSnapshotVersion?: string;
  readonly verificationSnapshotError?: string;
  readonly staleReasons?: readonly Record<string, unknown>[];
  readonly staleReasonCount?: number;
  readonly staleReasonsTruncated?: boolean;
  readonly branchAttachment?: {
    readonly gitBranch: string;
    readonly kbBranch: string;
    readonly kind: "exact" | "explicit_override" | "legacy_compat";
    readonly migrationRequired: boolean;
  };
  readonly verificationSnapshotChanges?: readonly Record<string, unknown>[];
  readonly verificationSnapshotChangeCount?: number;
  readonly verificationSnapshotChangesTruncated?: boolean;
  readonly branchStore?: BranchStoreInspection;
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
    const indexedPage = prolog.queryEntities
      ? await prolog.queryEntities({
          ...(type !== undefined ? { type } : {}),
          ...(id !== undefined ? { id } : {}),
          ...(tags !== undefined ? { tags } : {}),
          ...(sourceFile !== undefined ? { sourceFile } : {}),
          limit,
          offset,
        })
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
          results: paginated,
          count: intentResult.matches.length,
          queryAnalysis: intentResult.analysis,
        },
      };
    }
    const indexedCandidates = prolog.searchEntities
      ? await prolog.searchEntities({
          query: trimmedQuery,
          ...(type !== undefined ? { type } : {}),
          limit: 100_000,
          offset: 0,
        })
      : null;
    const entities = indexedCandidates
      ? [...indexedCandidates.entities]
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
      structuredContent: { results: paginated, count: matches.length },
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
    let store = inspectBranchStore(context.workspaceRoot, attachment.kbBranch);
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
        const prolog =
          context.prolog ??
          (() => {
            ownedEngine = new EngineClient({
              workspaceRoot: context.workspaceRoot,
              branch: attachment.kbBranch,
              timeout: 15_000,
            });
            return ownedEngine;
          })();
        payload = await runOperationJsonQuery<StatusPayload>(
          prolog,
          "status.pl",
          "status:kb_status_json(JsonString)",
          "Status execution",
        );
        if (!isStatusPayload(payload)) {
          throw new Error("Status execution query returned an invalid payload");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        store = {
          state: "unreadable",
          path: store.path,
          errorCode: "branch_store_unreadable",
          detail: message,
          recoveryRequired: true,
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
    const staleReasons = storeReason
      ? [...existingReasons, storeReason].sort((left, right) =>
          String(left.path ?? "").localeCompare(String(right.path ?? "")),
        )
      : existingReasons;
    const enrichedPayload: StatusPayload = {
      ...payload,
      branchAttachment: attachment,
      branchStore: store,
      staleReasons,
      staleReasonCount: staleReasons.length,
      staleReasonsTruncated: false,
      verificationSnapshot: snapshotEvidence.available
        ? snapshotEvidence.snapshot.hash
        : "unknown",
      verificationSnapshotAvailable: snapshotEvidence.available,
      ...(snapshotEvidence.available
        ? {
            verificationSnapshotDirty: snapshotEvidence.snapshot.dirty,
            verificationSnapshotFileCount: snapshotEvidence.snapshot.fileCount,
            verificationSnapshotVersion: snapshotEvidence.snapshot.version,
            verificationSnapshotChanges:
              snapshotEvidence.snapshot.changes ?? [],
            verificationSnapshotChangeCount:
              snapshotEvidence.snapshot.changeCount ?? 0,
            verificationSnapshotChangesTruncated:
              snapshotEvidence.snapshot.changesTruncated ?? false,
          }
        : { verificationSnapshotError: snapshotEvidence.error }),
    };
    return {
      content: [
        {
          type: "text",
          text: `Branch ${payload.branch} is ${payload.syncState} (snapshot ${payload.snapshotId}, dirty=${payload.dirty}, verificationSnapshot=${enrichedPayload.verificationSnapshot})`,
        },
      ],
      structuredContent: enrichedPayload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Status execution failed: ${message}`);
  }
}
