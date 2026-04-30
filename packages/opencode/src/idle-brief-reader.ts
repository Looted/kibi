import * as fs from "node:fs";
import * as path from "node:path";
import { resolveBriefsDir } from "./idle-brief-paths.js";
import type { IdleBriefEnvelope } from "./idle-brief-store.js";

const BRIEF_FILENAME_RE = /^(\d+)_brief\.json$/;

/**
 * Extract the numeric timestamp prefix from a brief filename.
 * Returns null if the filename does not match the expected pattern.
 */
function extractTimestamp(filename: string): number | null {
  const match = filename.match(BRIEF_FILENAME_RE);
  if (!match) return null;
  return Number(match[1]);
}

/**
 * Select the latest unread brief for the given branch.
 *
 * Scans `.kb/briefs/` for `{timestamp}_brief.json` files, ignoring `.tmp` files
 * and invalid JSON. Filters by `branch`, `schemaVersion === "1.0"`, and
 * `unread === true`. Returns the brief with the highest filename timestamp,
 * or null if no unread briefs exist.
 */
export function selectLatestUnreadBrief( // implements REQ-opencode-kibi-briefing-v4
  workspaceRoot: string,
  branch: string
): IdleBriefEnvelope | null {
  const briefsDir = resolveBriefsDir(workspaceRoot);

  if (!fs.existsSync(briefsDir)) {
    return null;
  }

  const files = fs.readdirSync(briefsDir);

  const candidates: Array<{ timestamp: number; envelope: IdleBriefEnvelope; filePath: string }> = [];

  for (const file of files) {
    // Ignore .tmp files
    if (file.endsWith(".tmp")) continue;

    const timestamp = extractTimestamp(file);
    if (timestamp === null) continue;

    const filePath = path.join(briefsDir, file);

    let envelope: IdleBriefEnvelope;
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      envelope = JSON.parse(raw) as IdleBriefEnvelope;
    } catch {
      // Skip invalid JSON
      continue;
    }

    // Filter by branch, schemaVersion, and unread status
    if (
      envelope.branch === branch &&
      envelope.schemaVersion === "1.0" &&
      envelope.unread === true
    ) {
      candidates.push({ timestamp, envelope, filePath });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort by filename timestamp descending — latest first
  candidates.sort((a, b) => b.timestamp - a.timestamp);

  return candidates[0]!.envelope;
}

/**
 * Atomically mark a brief as read by setting `unread` to false.
 *
 * Uses the write-to-temp-then-rename pattern to ensure atomicity.
 * Preserves ALL other envelope fields (contentHash, auditCursor, etc.).
 *
 * @param workspaceRoot - The root of the workspace
 * @param briefPath - Absolute path to the brief file to mark as read
 */
export function markBriefRead( // implements REQ-opencode-kibi-briefing-v4
  const raw = fs.readFileSync(briefPath, "utf-8");
  const brief = JSON.parse(raw) as IdleBriefEnvelope;

  brief.unread = false;

  const tempPath = `${briefPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(brief, null, 2), "utf-8");
  fs.renameSync(tempPath, briefPath);
}
