import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EditEventKind = string;

export interface SessionEditEntry {
  /** Relative file path (relative to worktree root). */
  filePath: string;
  /** Hash of the file content at first sight (baseline). "<deleted>" sentinel if file was missing. */
  baselineHash: string;
  /** Current hash at last reconciliation. */
  currentHash: string;
  /** Timestamp (ms) of last reconciliation pass. */
  lastReconciledAt: number;
}

export interface SessionEditState {
  recordEventHint(filePath: string, kind: EditEventKind, timestamp?: number): void;
  reconcilePath(filePath: string): void;
  reconcileKnownPaths(): void;
  getSessionEdits(): SessionEditEntry[];
  getFocusEdit(): SessionEditEntry | null;
  hasSessionEdits(): boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SENTINEL_HASH = "<deleted>";

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createSessionEditState(opts: {
  worktree: string;
  /** Custom clock for testing. Defaults to Date.now. */
  now?: () => number;
}): SessionEditState {
  const worktree = opts.worktree;
  const now = opts.now ?? Date.now;

  // ---- Per-instance state (no module globals) ----

  /**
   * Tracked files keyed by relative path.
   * Undefined baselineHash means we haven't taken a snapshot yet.
   */
  const tracked = new Map<
    string,
    {
      baselineHash: string | undefined;
      currentHash: string | undefined;
      lastReconciledAt: number;
      eventHints: { kind: EditEventKind; timestamp: number }[];
    }
  >();

  // ---- Internal helpers ----

  function resolveToRelative(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      const rel = path.relative(worktree, filePath);
      // Normalise away any leading ./ or ../ that escapes worktree
      return rel.startsWith("..") ? filePath : rel;
    }
    return filePath;
  }

  function resolveToAbsolute(relPath: string): string {
    return path.join(worktree, relPath);
  }

  function hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  function hashFile(absPath: string): string {
    try {
      const content = fs.readFileSync(absPath, "utf-8");
      return hashContent(content);
    } catch {
      return SENTINEL_HASH;
    }
  }

  /**
   * Take a baseline snapshot if we haven't yet.
   * Returns the baseline hash.
   */
  function ensureBaseline(
    entry: {
      baselineHash: string | undefined;
      currentHash: string | undefined;
      lastReconciledAt: number;
      eventHints: { kind: EditEventKind; timestamp: number }[];
    },
    relPath: string,
  ): string {
    if (entry.baselineHash !== undefined) {
      return entry.baselineHash;
    }
    const abs = resolveToAbsolute(relPath);
    const h = hashFile(abs);
    entry.baselineHash = h;
    return h;
  }

  // ---- Public API ----

  function recordEventHint(
    filePath: string,
    kind: EditEventKind,
    timestamp?: number,
  ): void {
    const rel = resolveToRelative(filePath);
    let entry = tracked.get(rel);
    if (!entry) {
      entry = {
        baselineHash: undefined,
        currentHash: undefined,
        lastReconciledAt: 0,
        eventHints: [],
      };
      tracked.set(rel, entry);
    }
    entry.eventHints.push({ kind, timestamp: timestamp ?? now() });
  }

  function reconcilePath(filePath: string): void {
    const rel = resolveToRelative(filePath);
    let entry = tracked.get(rel);
    if (!entry) {
      entry = {
        baselineHash: undefined,
        currentHash: undefined,
        lastReconciledAt: 0,
        eventHints: [],
      };
      tracked.set(rel, entry);
    }

    // Lazy baseline snapshot
    ensureBaseline(entry, rel);

    // Current hash
    const abs = resolveToAbsolute(rel);
    const current = hashFile(abs);
    entry.currentHash = current;
    entry.lastReconciledAt = now();
  }

  function reconcileKnownPaths(): void {
    for (const relPath of tracked.keys()) {
      reconcilePath(relPath);
    }
  }

  /**
   * Return surviving session edits: files whose current hash differs from baseline.
   * Sorted by lastReconciledAt ascending (oldest first).
   */
  function getSessionEdits(): SessionEditEntry[] {
    const results: SessionEditEntry[] = [];
    for (const [relPath, entry] of tracked) {
      if (entry.baselineHash === undefined || entry.currentHash === undefined) {
        // Not yet reconciled
        continue;
      }
      if (entry.currentHash !== entry.baselineHash) {
        results.push({
          filePath: relPath,
          baselineHash: entry.baselineHash,
          currentHash: entry.currentHash,
          lastReconciledAt: entry.lastReconciledAt,
        });
      }
    }
    results.sort((a, b) => a.lastReconciledAt - b.lastReconciledAt);
    return results;
  }

  /**
   * Focus edit = the last reconciled surviving edit (highest lastReconciledAt).
   */
  function getFocusEdit(): SessionEditEntry | null {
    const edits = getSessionEdits();
    if (edits.length === 0) return null;
    // edits are sorted ascending by lastReconciledAt, so last = most recent
    return edits[edits.length - 1]!;
  }

  function hasSessionEdits(): boolean {
    for (const [, entry] of tracked) {
      if (
        entry.baselineHash !== undefined &&
        entry.currentHash !== undefined &&
        entry.currentHash !== entry.baselineHash
      ) {
        return true;
      }
    }
    return false;
  }

  return {
    recordEventHint,
    reconcilePath,
    reconcileKnownPaths,
    getSessionEdits,
    getFocusEdit,
    hasSessionEdits,
  };
}
