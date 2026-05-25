import * as fs from "node:fs";
import * as path from "node:path";

export interface PendingBriefMarkerIssue {
  filePath: string;
  reason: "parse" | "schema" | "delete";
}

export interface PendingBriefMarkersResult {
  entityIds: string[];
  relationships: Array<{ from: string; to: string; type: string }>;
  markerPaths: string[];
  issues: PendingBriefMarkerIssue[];
}

interface PendingBriefMarkerPayload {
  branch: string;
  entityIds: string[];
  relationships: Array<{ from: string; to: string; type: string }>;
}

// implements REQ-opencode-kibi-briefing-v2
export function loadPendingBriefMarkers(
  workspaceRoot: string,
  branch: string,
): PendingBriefMarkersResult {
  const pendingDir = path.join(workspaceRoot, ".kb", "briefs", "pending");
  if (!fs.existsSync(pendingDir)) {
    return { entityIds: [], relationships: [], markerPaths: [], issues: [] };
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(pendingDir, { withFileTypes: true });
  } catch {
    return { entityIds: [], relationships: [], markerPaths: [], issues: [] };
  }

  const issues: PendingBriefMarkerIssue[] = [];
  const markerPaths: string[] = [];
  const entityIds: string[] = [];
  const seenEntityIds = new Set<string>();
  const relationshipMap = new Map<string, { from: string; to: string; type: string }>();

  for (const entry of entries
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const filePath = path.join(pendingDir, entry.name);
    let payload: PendingBriefMarkerPayload;

    try {
      payload = parsePendingBriefMarker(
        JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown,
      );
    } catch (error) {
      issues.push({
        filePath,
        reason: error instanceof SyntaxError ? "parse" : "schema",
      });
      continue;
    }

    if (payload.branch !== branch) {
      continue;
    }

    markerPaths.push(filePath);
    for (const entityId of payload.entityIds) {
      if (seenEntityIds.has(entityId)) {
        continue;
      }
      seenEntityIds.add(entityId);
      entityIds.push(entityId);
    }
    for (const relationship of payload.relationships) {
      relationshipMap.set(
        `${relationship.type}\u0000${relationship.from}\u0000${relationship.to}`,
        relationship,
      );
    }
  }

  return {
    entityIds,
    relationships: [...relationshipMap.values()],
    markerPaths,
    issues,
  };
}

// implements REQ-opencode-kibi-briefing-v2
export async function deletePendingBriefMarkers(
  markerPaths: string[],
): Promise<{ deletedCount: number; issues: PendingBriefMarkerIssue[] }> {
  let deletedCount = 0;
  const issues: PendingBriefMarkerIssue[] = [];

  for (const markerPath of markerPaths) {
    try {
      const existedBeforeDelete = fs.existsSync(markerPath);
      await fs.promises.rm(markerPath, { force: true });
      if (existedBeforeDelete && !fs.existsSync(markerPath)) {
        deletedCount += 1;
      }
    } catch {
      issues.push({ filePath: markerPath, reason: "delete" });
    }
  }

  return { deletedCount, issues };
}

function parsePendingBriefMarker(value: unknown): PendingBriefMarkerPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid marker payload");
  }

  const record = value as Record<string, unknown>;
  const branch = typeof record.branch === "string" ? record.branch.trim() : "";
  const entityIds = Array.isArray(record.entityIds)
    ? record.entityIds.filter((item): item is string => typeof item === "string" && item.length > 0)
    : null;
  const relationships = Array.isArray(record.relationships)
    ? record.relationships
        .filter(
          (
            item,
          ): item is {
            from: string;
            to: string;
            type: string;
          } =>
            !!item &&
            typeof item === "object" &&
            typeof (item as { from?: unknown }).from === "string" &&
            typeof (item as { to?: unknown }).to === "string" &&
            typeof (item as { type?: unknown }).type === "string" &&
            (item as { from: string }).from.length > 0 &&
            (item as { to: string }).to.length > 0 &&
            (item as { type: string }).type.length > 0,
        )
        .map((item) => ({ from: item.from, to: item.to, type: item.type }))
    : [];

  if (!branch || !entityIds) {
    throw new Error("Invalid marker schema");
  }

  return { branch, entityIds, relationships };
}
