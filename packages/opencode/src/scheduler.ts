import { exec } from "node:child_process";
import path from "node:path";
import type { KibiConfig } from "./config.js";
import { shouldHandleFile } from "./file-filter.js";
import * as logger from "./logger.js";

export type TimeoutHandle = ReturnType<typeof setTimeout>;

export interface SyncRunMetadata {
  reason: string;
  worktree: string;
  filePath?: string;
  debounceWindowMs: number;
  durationMs: number;
  exitCode: number;
  checkExitCode?: number;
  checkRules?: string[];
}

export type SyncRunner = (worktree: string) => Promise<{ exitCode: number }>;

export type CheckRunner = (
  worktree: string,
  rules: string[],
) => Promise<{ exitCode: number }>;

export interface SchedulerOptions {
  worktree: string;
  config: KibiConfig;
  runSync?: SyncRunner;
  runCheck?: CheckRunner;
  now?: () => number;
  setTimeoutFn?: (fn: () => void, ms: number) => TimeoutHandle;
  clearTimeoutFn?: (handle: TimeoutHandle) => void;
  onRunComplete?: (meta: SyncRunMetadata) => void;
  enableToolExecuteAfterHint?: boolean;
}

export type PendingTrigger = {
  reason: string;
  filePath?: string;
  checkRules?: string[];
};

export interface SyncScheduler {
  scheduleSync(reason: string, filePath?: string, checkRules?: string[]): void;
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
  private readonly runCheck: CheckRunner;
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
    this.runCheck = opts.runCheck ?? runKibiCheck;
    this.onRunComplete = opts.onRunComplete;
    this.explicitToolAfterHint = Boolean(opts.enableToolExecuteAfterHint);
  }

  scheduleSync(reason: string, filePath?: string, checkRules?: string[]): void {
    if (!this.config.sync.enabled) return;

    if (reason === "file.edited") {
      if (!filePath) return;
      if (!shouldHandleFile(filePath, this.worktree)) return;
      this.lastFileEditedAt = this.now();
    }

    this.pending = { reason, filePath, checkRules };
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

  private async startRun(trigger: PendingTrigger): Promise<void> {
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

    let syncExitCode = 0;
    let checkExitCode: number | undefined;
    let checkRules: string[] | undefined;

    try {
      const syncResult = await this.runSync(this.worktree);
      syncExitCode = syncResult.exitCode;

      // Run targeted checks if sync succeeded and rules specified
      if (
        syncExitCode === 0 &&
        trigger.checkRules &&
        trigger.checkRules.length > 0
      ) {
        checkRules = trigger.checkRules;
        logger.info(`check.started ${JSON.stringify({ rules: checkRules })}`);
        const checkResult = await this.runCheck(this.worktree, checkRules);
        checkExitCode = checkResult.exitCode;
        if (checkExitCode !== 0) {
          logger.warn(
            `check.failed ${JSON.stringify({ rules: checkRules, exitCode: checkExitCode })}`,
          );
        } else {
          logger.info(
            `check.succeeded ${JSON.stringify({ rules: checkRules })}`,
          );
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`sync.failed ${message}`);
      syncExitCode = 1;
    } finally {
      this.emitCompletion(
        trigger,
        startedAt,
        syncExitCode,
        checkExitCode,
        checkRules,
      );
      this.inFlight = false;

      if (this.dirty) {
        const trailing = this.trailing ?? { reason: "sync.trailing" };
        this.dirty = false;
        this.trailing = null;
        void this.startRun({
          reason: `${trailing.reason}.trailing`,
          filePath: trailing.filePath,
          checkRules: trailing.checkRules,
        });
      }
    }
  }

  private emitCompletion(
    trigger: PendingTrigger,
    startedAt: number,
    exitCode: number,
    checkExitCode?: number,
    checkRules?: string[],
  ): void {
    const durationMs = Math.max(0, this.now() - startedAt);
    const meta: SyncRunMetadata = {
      reason: trigger.reason,
      worktree: this.worktree,
      filePath: trigger.filePath,
      debounceWindowMs: this.config.sync.debounceMs,
      durationMs,
      exitCode,
      checkExitCode,
      checkRules,
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

async function runKibiCheck(
  worktree: string,
  rules: string[],
): Promise<{ exitCode: number }> {
  return new Promise((resolve) => {
    const rulesArg = rules.join(",");
    exec(`kibi check --rules ${rulesArg}`, { cwd: worktree }, (error) => {
      resolve({ exitCode: error ? (error.code ?? 1) : 0 });
    });
  });
}

// implements REQ-opencode-kibi-plugin-v1
export function createSyncScheduler(opts: SchedulerOptions): SyncScheduler {
  return new WorktreeSyncScheduler(opts);
}
