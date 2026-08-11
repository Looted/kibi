import { rankEntities } from "../../search-ranking.js";
import type { SearchMatch } from "../../search-ranking.js";
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
};

export type SearchPayload = {
  readonly results: readonly SearchMatch[];
  readonly count: number;
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
  const { query, type, limit = 20, offset = 0 } = input;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error(
      "Search execution failed: query must be a non-empty string",
    );
  }
  validateEntityType(type);
  try {
    const entities = await loadEntities(requireProlog(context), {
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
    const payload = await runOperationJsonQuery<StatusPayload>(
      requireProlog(context),
      "status.pl",
      "status:kb_status_json(JsonString)",
      "Status execution",
    );
    if (!isStatusPayload(payload)) {
      throw new Error("Status execution query returned an invalid payload");
    }
    const snapshotEvidence = await readWorkspaceSnapshot(context);
    const enrichedPayload: StatusPayload = {
      ...payload,
      verificationSnapshot: snapshotEvidence.available
        ? snapshotEvidence.snapshot.hash
        : "unknown",
      verificationSnapshotAvailable: snapshotEvidence.available,
      ...(snapshotEvidence.available
        ? {
            verificationSnapshotDirty: snapshotEvidence.snapshot.dirty,
            verificationSnapshotFileCount: snapshotEvidence.snapshot.fileCount,
            verificationSnapshotVersion: snapshotEvidence.snapshot.version,
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
