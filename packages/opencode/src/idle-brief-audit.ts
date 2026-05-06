import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  parsePrologValue,
  parsePropertyList,
  splitTopLevelGeneral,
} from "kibi-cli/prolog/codec";
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
  entries: AuditEntry[];
  newCursor: AuditCursor;
  contentHash: string;
}

export interface AuditEntry {
  timestamp: string;
  operation: string;
  entityId: string;
  payload?: AuditEntityPayload | AuditRelationshipPayload | null;
}

export interface AuditEntityPayload {
  kind: "entity";
  entityType: string;
  changeKind?: "created" | "updated";
  title?: string;
  source?: string;
  textRef?: string;
  properties: Record<string, unknown>;
}

export interface AuditRelationshipPayload {
  kind: "relationship";
  relationshipType: string;
  properties: Record<string, unknown>;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// Parse a single changeset line from the audit log
function parseChangesetLine(line: string): AuditEntry | null {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith("changeset(") || !trimmedLine.endsWith(").")) {
    return null;
  }

  const argsLiteral = trimmedLine.slice("changeset(".length, -2);
  const parts = splitTopLevelGeneral(argsLiteral, ",").map((part) =>
    part.trim(),
  );
  if (parts.length < 4) {
    return null;
  }

  const timestamp = parsePrologValue(parts[0] ?? "");
  const operation = parsePrologValue(parts[1] ?? "");
  const entityId = parsePrologValue(parts[2] ?? "");
  if (
    typeof timestamp !== "string" ||
    typeof operation !== "string" ||
    typeof entityId !== "string"
  ) {
    return null;
  }

  const rawPayload = parts.slice(3).join(",");

  const payload = parsePayload(rawPayload.trim());
  return {
    timestamp,
    operation,
    entityId,
    ...(payload === undefined ? {} : { payload }),
  };
}

function parsePayload(rawPayload: string): AuditEntry["payload"] | undefined {
  if (rawPayload === "null") return null;

  const match = rawPayload.match(/^([A-Za-z0-9_]+)-(.+)$/s);
  if (!match) return null;

  const [, payloadType = "unknown", rawProps = ""] = match;
  const properties = parsePropertyList(rawProps);

  if (payloadType === "rel") {
    return {
      kind: "relationship",
      relationshipType: payloadType,
      properties,
    };
  }

  const title = asOptionalString(properties.title);
  const source = asOptionalString(properties.source);
  const textRef = asOptionalString(properties.text_ref);
  const changeKindRaw = properties.change_kind;
  const changeKind =
    changeKindRaw === "created" || changeKindRaw === "updated"
      ? changeKindRaw
      : undefined;

  return {
    kind: "entity",
    entityType: payloadType,
    ...(changeKind ? { changeKind } : {}),
    ...(title ? { title } : {}),
    ...(source ? { source } : {}),
    ...(textRef ? { textRef } : {}),
    properties,
  };
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
  if (previousCursor?.lastTimestamp) {
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
      const [rawTimestamp = "0"] = f.split("_");
      const timestamp = Number.parseInt(rawTimestamp, 10);
      return {
        path: fullPath,
        timestamp: Number.isNaN(timestamp) ? 0 : timestamp,
      };
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

export function getAuditTailCursor(
  // implements REQ-opencode-kibi-briefing-v6
  workspaceRoot: string,
  branch: string,
): AuditCursor | null {
  const auditPath = resolveAuditLogPath(workspaceRoot, branch);
  if (!fs.existsSync(auditPath)) {
    return null;
  }

  const delta = computeAuditDelta(workspaceRoot, branch, null);
  return delta.newCursor.entryCount > 0 || delta.newCursor.fileSize > 0
    ? delta.newCursor
    : null;
}

// implements REQ-opencode-kibi-briefing-v4
// Guard: abort if branch changed since idle-start
export function guardBranchChanged(
  startBranch: string,
  currentBranch: string,
): boolean {
  return startBranch !== currentBranch;
}
