import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileLifecycle = "created" | "edited" | "deleted";

export type ReminderKind = "kibi_write" | "kibi_delete" | "e2e_write" | "e2e_delete";

export interface PendingLifecycleEvent {
  /** Normalized file path (relative to worktree root). */
  normalizedPath: string;
  /** Coalesced lifecycle event for this path. */
  lifecycle: FileLifecycle;
  /** Timestamp (ms) of the lifecycle event. */
  timestamp: number;
}

export interface FileOperationState {
  /** Normalize file path relative to worktree root. */
  normalizePath(filePath: string): string;
  /** Record a lifecycle event for a file, coalescing with existing events. */
  recordLifecycle(filePath: string, lifecycle: FileLifecycle, timestamp?: number): void;
  /** Peek at pending lifecycle event, preferring specified path if available. */
  peekPending(preferredPath?: string): PendingLifecycleEvent | null;
  /** Consume pending lifecycle event for a specific path. */
  consumePending(filePath: string): void;
  /** Check if a reminder has already been shown for a path/kind combo. */
  hasShown(filePath: string, reminderKind: ReminderKind): boolean;
  /** Mark a reminder as shown for a path/kind combo. */
  markShown(filePath: string, reminderKind: ReminderKind): void;
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

export function createFileOperationState(opts: {  // implements REQ-opencode-file-context-guidance-v1
  worktree: string;
  /** Custom clock for testing. Defaults to Date.now. */
  now?: () => number;
}): FileOperationState {
  const worktree = opts.worktree;
  const now = opts.now ?? Date.now;

  // ---- Per-instance state (no module globals) ----

  /**
   * Pending lifecycle events keyed by normalized path.
   * Each path has at most one coalesced lifecycle state.
   */
  const pendingLifecycleEvents = new Map<string, PendingLifecycleEvent>();

  /**
   * Reminder suppression state: (normalized path + reminder kind) -> shown flag.
   * Keeps path-aware, kind-aware suppression separate from GuidanceCache.
   */
  const reminderSuppression = new Map<string, boolean>();

  // ---- Internal helpers ----

  /**
   * Coalesce lifecycle events using precedence rules:
   * - created + edited -> created
   * - edited + edited -> edited
   * - created|edited + deleted -> deleted
   * - deleted + created|edited -> deleted
   */
  function coalesceLifecycle(
    existing: FileLifecycle | undefined,
    incoming: FileLifecycle,
  ): FileLifecycle {
    if (existing === undefined) {
      return incoming;
    }

    // created + edited -> created
    if (existing === "created" && incoming === "edited") {
      return "created";
    }

    // edited + edited -> edited
    if (existing === "edited" && incoming === "edited") {
      return "edited";
    }

    // created|edited + deleted -> deleted
    if ((existing === "created" || existing === "edited") && incoming === "deleted") {
      return "deleted";
    }

    // deleted + created|edited -> deleted
    if (existing === "deleted" && (incoming === "created" || incoming === "edited")) {
      return "deleted";
    }

    // Fallback: use incoming
    return incoming;
  }

  function normalizeSessionPath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      const relativePath = path.relative(worktree, filePath);
      // Keep absolute path if it escapes worktree
      return relativePath.startsWith("..") ? filePath : relativePath;
    }
    // Normalize leading ./ and trailing slashes
    const normalized = path.normalize(filePath);
    return normalized.startsWith("./") ? normalized.slice(2) : normalized;
  }

  function getSuppressionKey(filePath: string, kind: ReminderKind): string {
    const normalized = normalizeSessionPath(filePath);
    return `${normalized}:${kind}`;
  }

  // ---- Public API ----

  function normalizePath(filePath: string): string {
    return normalizeSessionPath(filePath);
  }

  function recordLifecycle(
    filePath: string,
    lifecycle: FileLifecycle,
    timestamp?: number,
  ): void {
    const normalized = normalizeSessionPath(filePath);
    const existing = pendingLifecycleEvents.get(normalized);
    const coalesced = coalesceLifecycle(
      existing?.lifecycle,
      lifecycle,
    );

    pendingLifecycleEvents.set(normalized, {
      normalizedPath: normalized,
      lifecycle: coalesced,
      timestamp: timestamp ?? now(),
    });
  }

  function peekPending(
    preferredPath?: string,
  ): PendingLifecycleEvent | null {
    if (preferredPath !== undefined) {
      const normalized = normalizeSessionPath(preferredPath);
      const preferred = pendingLifecycleEvents.get(normalized);
      return preferred ?? null;
    }

    // No preferred path specified, return most recent pending event
    let mostRecent: PendingLifecycleEvent | null = null;
    for (const event of pendingLifecycleEvents.values()) {
      if (mostRecent === null || event.timestamp > mostRecent.timestamp) {
        mostRecent = event;
      }
    }
    return mostRecent;
  }

  function consumePending(filePath: string): void {
    const normalized = normalizeSessionPath(filePath);
    pendingLifecycleEvents.delete(normalized);
  }

  function hasShown(filePath: string, reminderKind: ReminderKind): boolean {
    const key = getSuppressionKey(filePath, reminderKind);
    return reminderSuppression.get(key) ?? false;
  }

  function markShown(filePath: string, reminderKind: ReminderKind): void {
    const key = getSuppressionKey(filePath, reminderKind);
    reminderSuppression.set(key, true);
  }

  return {
    normalizePath,
    recordLifecycle,
    peekPending,
    consumePending,
    hasShown,
    markShown,
  };
}
