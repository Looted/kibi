import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EditEventKind = string;

export function pushEventHintIfKind(
  hints: Array<{ kind: string; timestamp: number }>,
  kind: string | undefined,
  timestamp: number,
): void {
  if (kind) hints.push({ kind, timestamp });
}

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
  recordEventHint(
    filePath: string,
    kind: EditEventKind,
    timestamp?: number,
  ): void;
  reconcilePath(filePath: string): void;
  reconcileKnownPaths(): void;
  getSessionEdits(): SessionEditEntry[];
  getFocusEdit(): SessionEditEntry | null;
  hasSessionEdits(): boolean;
  forceEdit(filePath: string, kind?: EditEventKind, timestamp?: number): void;
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
   * Tracked files keyed by relative path. A path only hinted at so far has no
   * snapshot (undefined) until its first reconciliation.
   */
  const tracked = new Map<string, SessionEditEntry | undefined>();

  // ---- Internal helpers ----

  function resolveToRelative(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      const rel = path.relative(worktree, filePath);
      // Keep the absolute path when it escapes the worktree
      return rel.startsWith("..") ? filePath : rel;
    }
    return filePath;
  }

  function resolveToAbsolute(relPath: string): string {
    return path.join(worktree, relPath);
  }

  function hashContent(content: string | Buffer): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  function hashFile(absPath: string): string {
    try {
      return hashContent(fs.readFileSync(absPath));
    } catch {
      return SENTINEL_HASH;
    }
  }

  // ---- Public API ----

  function recordEventHint(
    filePath: string,
    _kind: EditEventKind,
    _timestamp?: number,
  ): void {
    const rel = resolveToRelative(filePath);
    if (!tracked.has(rel)) tracked.set(rel, undefined);
  }

  function reconcilePath(filePath: string): void {
    const rel = resolveToRelative(filePath);
    const currentHash = hashFile(resolveToAbsolute(rel));
    tracked.set(rel, {
      filePath: rel,
      // Lazy baseline snapshot: the first reconciliation is the baseline.
      baselineHash: tracked.get(rel)?.baselineHash ?? currentHash,
      currentHash,
      lastReconciledAt: now(),
    });
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
    return [...tracked.values()]
      .filter(
        (entry): entry is SessionEditEntry =>
          entry !== undefined && entry.currentHash !== entry.baselineHash,
      )
      .map((entry) => ({ ...entry }))
      .sort((a, b) => a.lastReconciledAt - b.lastReconciledAt);
  }

  /**
   * Focus edit = the last reconciled surviving edit (highest lastReconciledAt).
   */
  function getFocusEdit(): SessionEditEntry | null {
    // edits are sorted ascending by lastReconciledAt, so last = most recent
    return getSessionEdits().at(-1) ?? null;
  }

  function hasSessionEdits(): boolean {
    return getSessionEdits().length > 0;
  }

  /**
   * Force a file to be treated as a session edit without requiring a prior baseline.
   * Used for eventless edits where the host signals a change via transform hook
   * but no file.edited event was emitted to establish a pre-change baseline.
   */
  function forceEdit(
    filePath: string,
    _kind?: EditEventKind,
    timestamp?: number,
  ): void {
    const rel = resolveToRelative(filePath);
    tracked.set(rel, {
      filePath: rel,
      // A synthetic baseline that will never match real file content
      baselineHash:
        tracked.get(rel)?.baselineHash ??
        hashContent(`__FORCED_BASELINE__${rel}`),
      currentHash: hashFile(resolveToAbsolute(rel)),
      lastReconciledAt: timestamp ?? now(),
    });
  }

  return {
    recordEventHint,
    reconcilePath,
    reconcileKnownPaths,
    getSessionEdits,
    getFocusEdit,
    hasSessionEdits,
    forceEdit,
  };
}
