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
export interface BriefModel {
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
    violations: Array<{
      rule: string;
      entityId: string;
      description: string;
      suggestion?: string;
      source?: string;
    }>;
    count: number;
    diagnostics: Array<{
      category: string;
      severity: string;
      message: string;
      file?: string;
      suggestion?: string;
    }>;
  };
  briefing: {
    tldr: string;
    promptBlock: string;
    citations: Array<{
      id: string;
      type?: string;
      title?: string;
      source?: string;
      textRef?: string;
    }>;
  };
  contentHash: string;
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
      try {
        const stat = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, "utf-8");
        const brief: BriefModel = JSON.parse(content);
        return { path: fullPath, mtime: stat.mtimeMs, brief };
      } catch {
        return null;
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter(
      (item) =>
        item.brief.branch === branch && item.brief.schemaVersion === "1.0",
    )
    .sort((a, b) => b.mtime - a.mtime);

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
