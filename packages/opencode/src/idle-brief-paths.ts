import * as path from "node:path";
import * as fs from "node:fs";
import { loadBriefConfig } from "kibi-cli/brief-config";

const TUI_SEEN_FILE = ".tui-seen.json";

export function resolveBriefsDir(workspaceRoot: string): string { // implements REQ-opencode-kibi-briefing-v4
  return path.join(workspaceRoot, ".kb", "briefs");
}

export function resolveAuditLogPath(workspaceRoot: string, branch: string): string { // implements REQ-opencode-kibi-briefing-v4
  return path.join(workspaceRoot, ".kb", "branches", branch, "audit.log");
}

export function resolveBriefFilePath(workspaceRoot: string, timestamp: number): string { // implements REQ-opencode-kibi-briefing-v4
  return path.join(resolveBriefsDir(workspaceRoot), `${timestamp}_brief.json`);
}

export function resolveTempBriefPath(workspaceRoot: string, timestamp: number): string { // implements REQ-opencode-kibi-briefing-v4
  return path.join(resolveBriefsDir(workspaceRoot), `${timestamp}_brief.json.tmp`);
}

export function atomicWriteBrief(workspaceRoot: string, timestamp: number, content: string): void { // implements REQ-opencode-kibi-briefing-v4
  const briefsDir = resolveBriefsDir(workspaceRoot);
  if (!fs.existsSync(briefsDir)) {
    fs.mkdirSync(briefsDir, { recursive: true });
  }
  const tempPath = resolveTempBriefPath(workspaceRoot, timestamp);
  const finalPath = resolveBriefFilePath(workspaceRoot, timestamp);
  fs.writeFileSync(tempPath, content, "utf-8");
  fs.renameSync(tempPath, finalPath);
}

type StoredBrief = {
  branch?: string;
  unread?: boolean;
  contentHash?: string;
};

function extractTimestamp(fileName: string): number | null {
  const match = /^(\d+)_brief\.json$/.exec(fileName);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function pruneOldBriefs(workspaceRoot: string, branch: string): void { // implements REQ-opencode-kibi-briefing-v4
  const briefsDir = resolveBriefsDir(workspaceRoot);
  if (!fs.existsSync(briefsDir)) return;

  const shared = loadBriefConfig(workspaceRoot) as {
    retention?: { maxPerBranch?: number; maxAgeDays?: number; keepUnread?: boolean };
  };
  const maxPerBranch = Math.max(1, Number(shared.retention?.maxPerBranch ?? 200));
  const maxAgeDays = Math.max(1, Number(shared.retention?.maxAgeDays ?? 14));
  const keepUnread = shared.retention?.keepUnread ?? true;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const branchFiles: Array<{
    fullPath: string;
    timestamp: number;
    unread: boolean;
    contentHash?: string;
  }> = [];
  for (const file of fs.readdirSync(briefsDir)) {
    if (!file.endsWith("_brief.json") || file.endsWith(".tmp")) continue;
    const ts = extractTimestamp(file);
    if (ts === null) continue;
    const fullPath = path.join(briefsDir, file);
    let parsed: StoredBrief = {};
    try {
      parsed = JSON.parse(fs.readFileSync(fullPath, "utf-8")) as StoredBrief;
    } catch {
      continue;
    }
    if (parsed.branch !== branch) continue;
    const nextItem: {
      fullPath: string;
      timestamp: number;
      unread: boolean;
      contentHash?: string;
    } = {
      fullPath,
      timestamp: ts,
      unread: parsed.unread === true,
    };
    if (typeof parsed.contentHash === "string") {
      nextItem.contentHash = parsed.contentHash;
    }
    branchFiles.push(nextItem);
  }
  branchFiles.sort((a, b) => b.timestamp - a.timestamp);

  const keepSet = new Set<string>();
  for (const item of branchFiles.slice(0, maxPerBranch)) {
    keepSet.add(item.fullPath);
  }
  if (keepUnread) {
    for (const item of branchFiles) {
      if (item.unread) keepSet.add(item.fullPath);
    }
  }

  for (const item of branchFiles) {
    const olderThanThreshold = now - item.timestamp > maxAgeMs;
    if (olderThanThreshold && !(keepUnread && item.unread)) {
      keepSet.delete(item.fullPath);
    }
  }

  for (const item of branchFiles) {
    const shouldDelete = !keepSet.has(item.fullPath);
    if (!shouldDelete) continue;
    try {
      fs.unlinkSync(item.fullPath);
    } catch {
      // best-effort cleanup
    }
  }

  const remainingHashes = new Set(
    branchFiles
      .filter((item) => keepSet.has(item.fullPath))
      .map((item) => item.contentHash)
      .filter((hash): hash is string => typeof hash === "string"),
  );
  const seenPath = path.join(briefsDir, TUI_SEEN_FILE);
  try {
    const parsed = JSON.parse(fs.readFileSync(seenPath, "utf-8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    const byBranch = parsed as Record<string, unknown>;
    const existing = byBranch[branch];
    if (!Array.isArray(existing)) return;
    byBranch[branch] = existing.filter(
      (entry): entry is string =>
        typeof entry === "string" && remainingHashes.has(entry),
    );
    const tempPath = `${seenPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(byBranch, null, 2), "utf-8");
    fs.renameSync(tempPath, seenPath);
  } catch {
    // best-effort cleanup
  }
}
