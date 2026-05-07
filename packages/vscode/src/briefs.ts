/**
 * Brief module for Kibi VS Code extension
 *
 * Handles loading, parsing, and read-state management for Kibi briefing envelopes.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Memento } from "vscode";

/**
 * Canonical brief envelope shape from Kibi/OpenCode idle-brief-store
 */
export interface BriefValidationViolation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
}

export interface BriefValidationDiagnostic {
  category: string;
  severity: string;
  message: string;
  file?: string;
  suggestion?: string;
}

export interface BriefCitation {
  id: string;
  type?: string;
  title?: string;
  source?: string;
  textRef?: string;
}

export interface BriefStatement {
  statement: string;
  citationIds: string[];
}

export interface BriefModelV1 {
  schemaVersion: "1.0";
  briefId: string;
  type: "success" | "warning";
  sessionId: string;
  branch: string;
  createdAt: string;
  unread: boolean;
  auditCursor: {
    lastTimestamp: string;
    lastOperation: string;
    entryCount: number;
    fileSize: number;
  };
  summary: string;
  counts: {
    requirementsAdded: number;
    relationshipsAdded: number;
    entitiesDeleted: number;
  };
  validation: {
    violations: BriefValidationViolation[];
    count: number;
    diagnostics: BriefValidationDiagnostic[];
  };
  briefing: {
    tldr: string;
    promptBlock: string;
    citations: BriefCitation[];
    constraints?: BriefStatement[];
    regressionRisks?: BriefStatement[];
    missingEvidence?: BriefStatement[];
  };
  contentHash: string;
}

export interface BriefModelV2 {
  schemaVersion: "2.0";
  briefId: string;
  type: "success" | "warning";
  sessionId: string;
  branch: string;
  createdAt: string;
  unread: boolean;
  auditCursor: {
    lastTimestamp: string;
    lastOperation: string;
    entryCount: number;
    fileSize: number;
  };
  summary: string;
  counts: {
    entitiesAdded: number;
    entitiesModified: number;
    entitiesRemoved: number;
    relationshipsChanged: number;
  };
  changes: {
    entities: {
      added: Array<{
        id: string;
        type: string;
        title?: string;
        source?: string;
        textRef?: string;
      }>;
      modified: Array<{
        id: string;
        type: string;
        title?: string;
        source?: string;
        textRef?: string;
      }>;
      removed: Array<{
        id: string;
        type: string;
        title?: string;
        source?: string;
        textRef?: string;
      }>;
    };
    relationships: {
      changed: number;
    };
  };
  validation: {
    violations: BriefValidationViolation[];
    count: number;
    diagnostics: BriefValidationDiagnostic[];
  };
  briefing: {
    tldr: string;
    promptBlock: string;
    citations: BriefCitation[];
    changeNarrative: string[];
    constraints?: BriefStatement[];
    regressionRisks?: BriefStatement[];
    missingEvidence?: BriefStatement[];
  };
  contentHash: string;
}

export type BriefModel = BriefModelV1 | BriefModelV2;

const BRIEF_FILENAME_RE = /^(\d+)_brief\.json$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function isCitation(value: unknown): value is BriefCitation {
  return isRecord(value) && typeof value.id === "string";
}

function isStatement(value: unknown): value is BriefStatement {
  return (
    isRecord(value) &&
    typeof value.statement === "string" &&
    isStringArray(value.citationIds)
  );
}

function isValidationViolation(
  value: unknown,
): value is BriefValidationViolation {
  return (
    isRecord(value) &&
    typeof value.rule === "string" &&
    typeof value.entityId === "string" &&
    typeof value.description === "string"
  );
}

function isValidationDiagnostic(
  value: unknown,
): value is BriefValidationDiagnostic {
  return (
    isRecord(value) &&
    typeof value.category === "string" &&
    typeof value.severity === "string" &&
    typeof value.message === "string"
  );
}

function isBriefingBase(value: unknown): value is {
  tldr: string;
  promptBlock: string;
  citations: BriefCitation[];
  constraints?: BriefStatement[];
  regressionRisks?: BriefStatement[];
  missingEvidence?: BriefStatement[];
} {
  return (
    isRecord(value) &&
    typeof value.tldr === "string" &&
    typeof value.promptBlock === "string" &&
    Array.isArray(value.citations) &&
    value.citations.every(isCitation) &&
    (value.constraints === undefined ||
      (Array.isArray(value.constraints) &&
        value.constraints.every(isStatement))) &&
    (value.regressionRisks === undefined ||
      (Array.isArray(value.regressionRisks) &&
        value.regressionRisks.every(isStatement))) &&
    (value.missingEvidence === undefined ||
      (Array.isArray(value.missingEvidence) &&
        value.missingEvidence.every(isStatement)))
  );
}

function isBriefingV2(value: unknown): value is BriefModelV2["briefing"] {
  return (
    isBriefingBase(value) &&
    isStringArray((value as Record<string, unknown>).changeNarrative)
  );
}

function isValidation(value: unknown): value is {
  violations: BriefValidationViolation[];
  count: number;
  diagnostics: BriefValidationDiagnostic[];
} {
  return (
    isRecord(value) &&
    Array.isArray(value.violations) &&
    value.violations.every(isValidationViolation) &&
    typeof value.count === "number" &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every(isValidationDiagnostic)
  );
}

function isBriefModel(value: unknown): value is BriefModel {
  if (!isRecord(value)) return false;

  const hasBase =
    (value.schemaVersion === "1.0" || value.schemaVersion === "2.0") &&
    typeof value.briefId === "string" &&
    (value.type === "success" || value.type === "warning") &&
    typeof value.sessionId === "string" &&
    typeof value.branch === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.unread === "boolean" &&
    isRecord(value.auditCursor) &&
    typeof value.auditCursor.lastTimestamp === "string" &&
    typeof value.auditCursor.lastOperation === "string" &&
    typeof value.auditCursor.entryCount === "number" &&
    typeof value.auditCursor.fileSize === "number" &&
    typeof value.summary === "string" &&
    isValidation(value.validation) &&
    typeof value.contentHash === "string";

  if (!hasBase) return false;

  if (value.schemaVersion === "1.0") {
    return (
      isRecord(value.counts) &&
      typeof value.counts.requirementsAdded === "number" &&
      typeof value.counts.relationshipsAdded === "number" &&
      typeof value.counts.entitiesDeleted === "number" &&
      isBriefingBase(value.briefing)
    );
  }

  return (
    isRecord(value.counts) &&
    typeof value.counts.entitiesAdded === "number" &&
    typeof value.counts.entitiesModified === "number" &&
    typeof value.counts.entitiesRemoved === "number" &&
    typeof value.counts.relationshipsChanged === "number" &&
    isRecord(value.changes) &&
    isRecord(value.changes.relationships) &&
    typeof value.changes.relationships.changed === "number" &&
    isBriefingV2(value.briefing)
  );
}

function extractFilenameTimestamp(filename: string): number | null {
  const match = filename.match(BRIEF_FILENAME_RE);
  if (!match) return null;

  return Number(match[1]);
}

/**
 * Generates the key for storing seen brief IDs in workspace state
 */
function getSeenKey(workspaceRoot: string, branch: string): string {
  return `kibi.briefs.seen::${workspaceRoot}::${branch}`;
}

/**
 * implements REQ-vscode-kibi-briefing-v1
 * Parses all brief JSON files in the workspace briefs directory and returns the latest valid one.
 *
 * @param workspaceRoot - The workspace root path
 * @param branch - The branch name to filter by
 * @returns The latest brief model or null if no valid brief found
 */
export function parseLatestBrief(
  workspaceRoot: string,
  branch: string,
): BriefModel | null {
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  if (!fs.existsSync(briefsDir)) {
    return null;
  }

  const files = fs.readdirSync(briefsDir);
  const parsed = files
    .filter((f) => f.endsWith("_brief.json") && !f.endsWith(".tmp"))
    .map((f) => {
      const fullPath = path.join(briefsDir, f);
      const timestamp = extractFilenameTimestamp(f);
      if (timestamp === null) {
        return null;
      }
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const brief = JSON.parse(content);
        if (!isBriefModel(brief)) {
          return null;
        }
        return { path: fullPath, timestamp, brief };
      } catch {
        return null;
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter(
      (item) =>
        item.brief.branch === branch &&
        (item.brief.schemaVersion === "1.0" ||
          item.brief.schemaVersion === "2.0"),
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  return parsed[0]?.brief ?? null;
}

/**
 * implements REQ-vscode-kibi-briefing-v1
 * Returns the latest brief for the given workspace root and branch.
 * This is a convenience alias for parseLatestBrief.
 */
export function selectLatestBrief(
  workspaceRoot: string,
  branch: string,
): BriefModel | null {
  return parseLatestBrief(workspaceRoot, branch);
}

/**
 * implements REQ-vscode-kibi-briefing-v1
 * Reads the previously seen brief ID for a workspace/branch from workspace state.
 *
 * @param workspaceState - VS Code Memento storage
 * @param workspaceRoot - The workspace root path
 * @param branch - The branch name
 * @returns The seen brief ID or undefined if none recorded
 */
export function readBriefId(
  workspaceState: Memento,
  workspaceRoot: string,
  branch: string,
): string | undefined {
  const key = getSeenKey(workspaceRoot, branch);
  return workspaceState.get<string>(key);
}

/**
 * Records semantic brief content as seen for a workspace/branch without
 * mutating the brief file's unread flag.
 */
// implements REQ-vscode-kibi-briefing-v1
export function markBriefSeen(
  workspaceState: Memento,
  workspaceRoot: string,
  branch: string,
  contentHash: string,
): void {
  const key = getSeenKey(workspaceRoot, branch);
  workspaceState.update(key, contentHash);
}

/**
 * implements REQ-vscode-kibi-briefing-v1
 * Marks a brief as read by updating workspace state AND atomically updating
 * the JSON file's unread field to false.
 *
 * @param workspaceState - VS Code Memento storage
 * @param workspaceRoot - The workspace root path
 * @param branch - The branch name
 * @param briefId - The brief ID to mark as read
 * @param briefPath - The path to the brief JSON file
 */
export function markBriefRead(
  workspaceState: Memento,
  workspaceRoot: string,
  branch: string,
  briefId: string,
  briefPath: string,
): void {
  // Update workspaceState
  const key = getSeenKey(workspaceRoot, branch);
  workspaceState.update(key, briefId);

  // Atomically update the JSON file's unread field
  try {
    const content = fs.readFileSync(briefPath, "utf-8");
    const brief: BriefModel = JSON.parse(content);
    brief.unread = false;
    const tempPath = `${briefPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(brief, null, 2), "utf-8");
    fs.renameSync(tempPath, briefPath);
  } catch {
    // If file update fails, workspaceState still records the read
  }
}
