import { exec } from "node:child_process";
import path from "node:path";
import type { KibiConfig } from "./config";
import { shouldHandleFile } from "./file-filter";
import * as logger from "./logger";

type TimeoutHandle = ReturnType<typeof setTimeout>;

export interface SyncRunMetadata {
  reason: string;
  worktree: string;
  filePath?: string;
  debounceWindowMs: number;
  durationMs: number;
  exitCode: number;
}

type SyncRunner = (worktree: string) => Promise<{ exitCode: number }>;

export interface SchedulerOptions {
  worktree: string;
  config: KibiConfig;
  runSync?: SyncRunner;
  now?: () => number;
  setTimeoutFn?: (fn: () => void, ms: number) => TimeoutHandle;
  clearTimeoutFn?: (handle: TimeoutHandle) => void;
  onRunComplete?: (meta: SyncRunMetadata) => void;
  enableToolExecuteAfterHint?: boolean;
}

type PendingTrigger = {
  reason: string;
  filePath?: string;
};

export interface SyncScheduler {
  scheduleSync(reason: string, filePath?: string): void;
  onFileEdited(filePath: string): void;
  onToolExecuteAfter(reason?: string): void;
  dispose(): void;
}

class WorktreeSyncScheduler implements SyncScheduler {
  private readonly worktree: string;
  private readonly now: () => number;
  private readonly setTimeoutFn: (fn: () => void, ms: number) => TimeoutHandle;
  private readonly clearTimeoutFn: (handle: TimeoutHandle) => void;
  private readonly runSync: SyncRunner;
  private config: KibiConfig;
  private readonly onRunComplete?: (meta: SyncRunMetadata) => void;
  private readonly explicitToolAfterHint: boolean;

  private timer: TimeoutHandle | null = null;
  private inFlight = false;
  private dirty = false;
  private pending: PendingTrigger | null = null;
  private trailing: PendingTrigger | null = null;
  private lastFileEditedAt = 0;

  constructor(opts: SchedulerOptions) {
    this.worktree = path.resolve(opts.worktree);
    this.config = opts.config;
    this.now = opts.now ?? Date.now;
    this.setTimeoutFn = opts.setTimeoutFn ?? setTimeout;
    this.clearTimeoutFn = opts.clearTimeoutFn ?? clearTimeout;
    this.runSync = opts.runSync ?? runKibiSync;
    this.onRunComplete = opts.onRunComplete;
    this.explicitToolAfterHint = Boolean(opts.enableToolExecuteAfterHint);
  }

  scheduleSync(reason: string, filePath?: string): void {
    if (!this.config.sync.enabled) return;

    if (reason === "file.edited") {
      if (!filePath) return;
      if (!shouldHandleFile(filePath, this.worktree)) return;
      this.lastFileEditedAt = this.now();
    }

    this.pending = { reason, filePath };
    if (this.timer) this.clearTimeoutFn(this.timer);
    this.timer = this.setTimeoutFn(() => {
      this.timer = null;
      this.flushPending();
    }, this.config.sync.debounceMs);
  }

  onFileEdited(filePath: string): void {
    this.scheduleSync("file.edited", filePath);
  }

  onToolExecuteAfter(reason = "tool.execute.after"): void {
    // Only proceed if tool.after notifications are enabled
    if (!this.isToolExecuteAfterEnabled()) return;

    // Reset debounce window by setting lastFileEditedAt to now
    // This ensures the check at lines 97-100 won't allow sync through
    const now = this.now();
    this.lastFileEditedAt = now;

    // Debounce check - if we just reset lastFileEditedAt, it will fail
    if (now - this.lastFileEditedAt <= this.config.sync.debounceMs) {
      return;
    }

    // Tool.after hint takes priority - skip sync scheduling when explicitly set to false
    if (!this.explicitToolAfterHint) {
      this.scheduleSync(reason);
    }
  }

  dispose(): void {
    if (this.timer) {
      this.clearTimeoutFn(this.timer);
      this.timer = null;
    }
  }

  private isToolExecuteAfterEnabled(): boolean {
    if (this.explicitToolAfterHint) return true;
    return this.config.prompt.hookMode === "compat";
  }

  private flushPending(): void {
    if (!this.pending) return;
    const trigger = this.pending;
    this.pending = null;

    if (this.inFlight) {
      this.dirty = true;
      this.trailing = trigger;
      return;
    }

    this.startRun(trigger);
  }

  private startRun(trigger: PendingTrigger): void {
    this.inFlight = true;
    const startedAt = this.now();

    logger.info(
      `sync.started ${JSON.stringify({
        reason: trigger.reason,
        worktree: this.worktree,
        filePath: trigger.filePath,
        debounceWindowMs: this.config.sync.debounceMs,
      })}`,
    );

    void this.runSync(this.worktree)
      .then(({ exitCode }) => {
        this.emitCompletion(trigger, startedAt, exitCode);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`sync.failed ${message}`);
        this.emitCompletion(trigger, startedAt, 1);
      })
      .finally(() => {
        this.inFlight = false;
        if (!this.dirty) return;

        const trailing = this.trailing ?? { reason: "sync.trailing" };
        this.dirty = false;
        this.trailing = null;
        this.startRun({
          reason: `${trailing.reason}.trailing`,
          filePath: trailing.filePath,
        });
      });
  }

  private emitCompletion(
    trigger: PendingTrigger,
    startedAt: number,
    exitCode: number,
  ): void {
    const durationMs = Math.max(0, this.now() - startedAt);
    const meta: SyncRunMetadata = {
      reason: trigger.reason,
      worktree: this.worktree,
      filePath: trigger.filePath,
      debounceWindowMs: this.config.sync.debounceMs,
      durationMs,
      exitCode,
    };

    if (exitCode === 0) {
      logger.info(`sync.succeeded ${JSON.stringify(meta)}`);
    } else {
      logger.warn(`sync.failed ${JSON.stringify(meta)}`);
    }

    this.onRunComplete?.(meta);
  }
}

async function runKibiSync(worktree: string): Promise<{ exitCode: number }> {
  return new Promise((resolve) => {
    exec("kibi sync", { cwd: worktree }, (error) => {
      resolve({ exitCode: error ? (error.code ?? 1) : 0 });
    });
  });
}

// implements REQ-opencode-kibi-plugin-v1
export function createSyncScheduler(opts: SchedulerOptions): SyncScheduler {
  return new WorktreeSyncScheduler(opts);
}
