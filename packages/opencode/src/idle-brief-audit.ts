import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveAuditLogPath } from "./idle-brief-paths.js";
import type { IdleBriefEnvelope } from "./idle-brief-store.js";

export interface AuditCursor {
  lastTimestamp: string;
  lastOperation: string;
  entryCount: number;
  fileSize: number;
}

export interface AuditDelta {
  hasChanges: boolean;
  entries: Array<{
    timestamp: string;
    operation: string;
    entityId: string;
  }>;
  newCursor: AuditCursor;
  contentHash: string;
}

// Parse a single changeset line from the audit log
function parseChangesetLine(
  line: string,
): { timestamp: string; operation: string; entityId: string } | null {
  // Format: changeset('TIMESTAMP',OPERATION,'ENTITY_ID',...).
  const match = line.match(/changeset\('([^']+)',([a-z_]+),'([^']+)',/);
  if (!match) return null;
  return { timestamp: match[1]!, operation: match[2]!, entityId: match[3]! };
}

// implements REQ-opencode-kibi-briefing-v4
// Read audit log and compute delta since last cursor
export function computeAuditDelta(
  workspaceRoot: string,
  branch: string,
  previousCursor: AuditCursor | null,
): AuditDelta {
  const auditPath = resolveAuditLogPath(workspaceRoot, branch);

  if (!fs.existsSync(auditPath)) {
    return {
      hasChanges: false,
      entries: [],
      newCursor: previousCursor ?? {
        lastTimestamp: "",
        lastOperation: "",
        entryCount: 0,
        fileSize: 0,
      },
      contentHash: "",
    };
  }

  const content = fs.readFileSync(auditPath, "utf-8");
  const lines = content
    .split("\n")
    .filter((l) => l.trim().includes("changeset("));
  const fileSize = Buffer.byteLength(content, "utf-8");

  // If no previous cursor or file hasn't grown, check if content changed
  if (
    previousCursor &&
    fileSize === previousCursor.fileSize &&
    lines.length === previousCursor.entryCount
  ) {
    return {
      hasChanges: false,
      entries: [],
      newCursor: previousCursor,
      contentHash: computeSimpleHash(lines),
    };
  }

  // Parse all entries
  const entries = lines
    .map(parseChangesetLine)
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .filter((e) => ["upsert", "upsert_rel", "delete"].includes(e.operation));

  // If we have a previous cursor, filter to only new entries
  let newEntries = entries;
  if (previousCursor && previousCursor.lastTimestamp) {
    const lastIdx = entries.findIndex(
      (e) =>
        e.timestamp === previousCursor.lastTimestamp &&
        e.operation === previousCursor.lastOperation,
    );
    if (lastIdx >= 0) {
      newEntries = entries.slice(lastIdx + 1);
    }
  }

  const lastEntry = entries[entries.length - 1];
  const newCursor: AuditCursor = {
    lastTimestamp: lastEntry?.timestamp ?? "",
    lastOperation: lastEntry?.operation ?? "",
    entryCount: lines.length,
    fileSize,
  };

  return {
    hasChanges: newEntries.length > 0,
    entries: newEntries,
    newCursor,
    contentHash: computeSimpleHash(lines),
  };
}

function computeSimpleHash(lines: string[]): string {
  return crypto
    .createHash("sha256")
    .update(lines.join("\n"))
    .digest("hex")
    .slice(0, 16);
}

// implements REQ-opencode-kibi-briefing-v4
// Extract the latest audit cursor from the most recent brief for this branch
export function getLatestAuditCursor(
  workspaceRoot: string,
  branch: string,
): AuditCursor | null {
  // Read .kb/briefs/ directory and find the latest brief for this branch
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  if (!fs.existsSync(briefsDir)) return null;

  const files = fs
    .readdirSync(briefsDir)
    .filter((f) => f.endsWith("_brief.json") && !f.endsWith(".tmp"))
    .map((f) => {
      const fullPath = path.join(briefsDir, f);
      const timestamp = Number.parseInt(f.split("_")[0]!, 10);
      return { path: fullPath, timestamp: isNaN(timestamp) ? 0 : timestamp };
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  for (const file of files) {
    try {
      const brief: IdleBriefEnvelope = JSON.parse(
        fs.readFileSync(file.path, "utf-8"),
      );
      if (brief.branch === branch && brief.auditCursor) {
        return brief.auditCursor;
      }
    } catch {
      // skip invalid JSON
    }
  }

  return null;
}

// implements REQ-opencode-kibi-briefing-v4
// Guard: abort if branch changed since idle-start
export function guardBranchChanged(
  startBranch: string,
  currentBranch: string,
): boolean {
  return startBranch !== currentBranch;
}
