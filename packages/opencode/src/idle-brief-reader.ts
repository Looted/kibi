import * as fs from "node:fs";
import * as path from "node:path";
import { resolveBriefsDir } from "./idle-brief-paths.js";
import {
  type IdleBriefEnvelope,
  isIdleBriefEnvelope,
} from "./idle-brief-store.js";

const BRIEF_FILENAME_RE = /^(\d+)_brief\.json$/;
const TUI_SEEN_FILE = ".tui-seen.json";

function resolveTuiSeenPath(workspaceRoot: string): string {
  return path.join(resolveBriefsDir(workspaceRoot), TUI_SEEN_FILE);
}

function readTuiSeenHashes(workspaceRoot: string, branch: string): Set<string> {
  const seenPath = resolveTuiSeenPath(workspaceRoot);
  try {
    const parsed = JSON.parse(fs.readFileSync(seenPath, "utf-8")) as unknown;
    if (!parsed || typeof parsed !== "object") return new Set();
    const byBranch = parsed as Record<string, unknown>;
    const values = byBranch[branch];
    if (!Array.isArray(values)) return new Set();
    return new Set(values.filter((entry): entry is string => typeof entry === "string"));
  } catch {
    return new Set();
  }
}

export function hasTuiSeenBrief(
  workspaceRoot: string,
  branch: string,
  contentHash: string,
): boolean { // implements REQ-opencode-kibi-briefing-v4
  return readTuiSeenHashes(workspaceRoot, branch).has(contentHash);
}

export function markBriefTuiSeen(
  workspaceRoot: string,
  branch: string,
  contentHash: string,
): void { // implements REQ-opencode-kibi-briefing-v4
  const briefsDir = resolveBriefsDir(workspaceRoot);
  fs.mkdirSync(briefsDir, { recursive: true });
  const seenPath = resolveTuiSeenPath(workspaceRoot);
  let parsed: Record<string, string[]> = {};
  try {
    const raw = JSON.parse(fs.readFileSync(seenPath, "utf-8")) as unknown;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      parsed = raw as Record<string, string[]>;
    }
  } catch {}

  const existing = Array.isArray(parsed[branch]) ? parsed[branch] : [];
  const next = [contentHash, ...existing.filter((entry) => entry !== contentHash)].slice(0, 100);
  parsed[branch] = next;
  const tempPath = `${seenPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(parsed, null, 2), "utf-8");
  fs.renameSync(tempPath, seenPath);
}

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
 * and invalid JSON. Filters by `branch`, supported schema version, and
 * `unread === true`. Returns the brief with the highest filename timestamp,
 * or null if no unread briefs exist.
 */
export function selectLatestUnreadBrief(
  // implements REQ-opencode-kibi-briefing-v4
  workspaceRoot: string,
  branch: string,
): { envelope: IdleBriefEnvelope; filePath: string } | null {
  const briefsDir = resolveBriefsDir(workspaceRoot);

  if (!fs.existsSync(briefsDir)) {
    return null;
  }

  const files = fs.readdirSync(briefsDir);

  const candidates: Array<{
    timestamp: number;
    envelope: IdleBriefEnvelope;
    filePath: string;
  }> = [];

  for (const file of files) {
    // Ignore .tmp files
    if (file.endsWith(".tmp")) continue;

    const timestamp = extractTimestamp(file);
    if (timestamp === null) continue;

    const filePath = path.join(briefsDir, file);

    let envelope: IdleBriefEnvelope;
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (!isIdleBriefEnvelope(parsed)) {
        continue;
      }
      envelope = parsed;
    } catch {
      // Skip invalid JSON
      continue;
    }

    // Filter by branch, schemaVersion, and unread status
    if (
      envelope.branch === branch &&
      (envelope.schemaVersion === "1.0" || envelope.schemaVersion === "2.0") &&
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

  const latest = candidates[0];
  if (!latest) {
    return null;
  }

  return {
    envelope: latest.envelope,
    filePath: latest.filePath,
  };
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
export function markBriefRead(
  // implements REQ-opencode-kibi-briefing-v4
  workspaceRoot: string,
  briefPath: string,
): void {
  const briefsDir = resolveBriefsDir(workspaceRoot);
  const resolvedBriefPath = path.resolve(briefPath);
  const resolvedBriefsDir = path.resolve(briefsDir);

  // Security: ensure the brief path is within the expected briefs directory
  if (!resolvedBriefPath.startsWith(resolvedBriefsDir + path.sep)) {
    throw new Error(
      `Invalid brief path: ${briefPath} is not inside ${briefsDir}`,
    );
  }

  const raw = fs.readFileSync(briefPath, "utf-8");
  const brief = JSON.parse(raw) as IdleBriefEnvelope;

  brief.unread = false;

  const tempPath = `${briefPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(brief, null, 2), "utf-8");
  fs.renameSync(tempPath, briefPath);
}
