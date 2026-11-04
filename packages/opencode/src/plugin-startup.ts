import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import * as config from "./config.js";
import { getGuidanceCache } from "./guidance-cache.js";
import * as logger from "./logger.js";
import { detectPosture } from "./repo-posture.js";
import {
  type SchedulerOptions,
  type SyncRunMetadata,
  createSyncScheduler,
} from "./scheduler.js";
import { getSessionTracker } from "./session-tracker.js";
import {
  type EffectiveMode,
  computeEffectiveMode,
} from "./smart-enforcement.js";
import { checkWorkspaceHealth } from "./workspace-health.js";

import type { PluginInput } from "./index.js";

type PostureSnapshot = ReturnType<typeof detectPosture>;

/**
 * Latches the degraded state a finished sync reports: a failed sync unless
 * smart enforcement asked for it (a trailing run keeps its trigger's prefix),
 * and any failed check.
 */
export function latchSchedulerRunFailures(
  meta: SyncRunMetadata,
  latch: (cause: "scheduler_sync_failed" | "scheduler_check_failed") => void,
): void {
  if (meta.exitCode !== 0 && !meta.reason.startsWith("smart-enforcement.")) {
    latch("scheduler_sync_failed");
  }
  if (meta.checkExitCode !== undefined && meta.checkExitCode !== 0) {
    latch("scheduler_check_failed");
  }
}

const workspaceCacheState = new Map<
  string,
  {
    branch: string;
    posture: PostureSnapshot["state"];
    configFingerprint: string | undefined;
  }
>();

export interface RuntimeDegradedOverlay {
  degraded: boolean;
  primaryCause?:
    | "sync_disabled"
    | "scheduler_unavailable"
    | "scheduler_sync_failed"
    | "scheduler_check_failed"
    | "non_authoritative_posture";
  causes: string[];
}

export interface PluginStartupContext {
  cfg: ReturnType<typeof config.loadConfig>;
  workspaceHealth: ReturnType<typeof checkWorkspaceHealth>;
  posture: PostureSnapshot;
  currentBranch: string;
  cache: ReturnType<typeof getGuidanceCache>;
  runtimeOverlay: RuntimeDegradedOverlay;
  scheduler: ReturnType<typeof createSyncScheduler> | null;
  maintenanceDegraded: boolean;
  getMaintenanceDegraded: () => boolean;
  getEffectiveMode: () => EffectiveMode;
  latchRuntimeDegraded: (
    cause: NonNullable<RuntimeDegradedOverlay["primaryCause"]>,
  ) => void;
}

export function resolveCurrentBranch(cwd: string): string {
  // 1. Check KIBI_BRANCH env var first (highest precedence)
  const envBranch = process.env.KIBI_BRANCH?.trim();
  if (envBranch) {
    return envBranch;
  }
  // 2. Fall back to git branch
  try {
    const branch = execSync("git branch --show-current", {
      cwd,
      encoding: "utf8",
      // rationale: only keeps git's stderr out of the host terminal; the
      // branch read from stdout is the same with any valid stdio setting
      // Stryker disable next-line StringLiteral
      stdio: "pipe",
      timeout: 5000,
    }).trim();
    return branch;
  } catch {
    return "unknown";
  }
}

function readConfigFingerprint(cwd: string): string | undefined {
  try {
    return fs.readFileSync(path.join(cwd, ".kb", "manifest.json"), "utf-8");
  } catch {
    // A missing manifest has no fingerprint.
  }
  return undefined;
}

// implements REQ-opencode-smart-enforcement-v1, REQ-opencode-kibi-plugin-v1
export async function runPluginStartup(
  input: PluginInput,
): Promise<PluginStartupContext | null> {
  const cfg = config.loadConfig(input.directory);

  if (!cfg.enabled) {
    logger.info("kibi-opencode: disabled via config");
    return null;
  }

  // Without a client this clears the one an earlier startup set.
  logger.setClient(input.client as logger.PluginClient);

  const workspaceHealth = checkWorkspaceHealth(input.worktree);
  if (workspaceHealth.needsBootstrap) {
    logger.error("kibi-opencode: workspace needs Kibi bootstrap");
    getSessionTracker().recordWarning(
      "bootstrap-needed",
      input.worktree,
      "Workspace missing Kibi bootstrap",
    );
  }

  if (cfg.guidance.sessionSummary.enabled) {
    const tracker = getSessionTracker();
    if (tracker.isSessionExpired(cfg.guidance.sessionSummary.logIntervalMs)) {
      tracker.logSummary();
      tracker.reset();
    }
  }

  const posture = detectPosture(input.worktree);
  const currentBranch = resolveCurrentBranch(input.worktree);
  const configFingerprint = readConfigFingerprint(input.worktree);
  const cache = getGuidanceCache(
    cfg.guidance.smartEnforcement.preflightTtlMs,
    cfg.guidance.smartEnforcement.idleResetMs,
  );

  const previousCacheState = workspaceCacheState.get(input.worktree);
  if (previousCacheState) {
    if (previousCacheState.branch !== currentBranch) {
      cache.invalidateForBranch(previousCacheState.branch);
    }
    if (
      previousCacheState.posture !== posture.state ||
      previousCacheState.configFingerprint !== configFingerprint
    ) {
      cache.invalidateForWorkspace(input.worktree);
    }
  }
  workspaceCacheState.set(input.worktree, {
    branch: currentBranch,
    posture: posture.state,
    configFingerprint,
  });

  const runtimeOverlay: RuntimeDegradedOverlay = {
    degraded: false,
    causes: [],
  };
  function latchRuntimeDegraded(
    cause: NonNullable<RuntimeDegradedOverlay["primaryCause"]>,
  ): void {
    if (!runtimeOverlay.degraded) {
      runtimeOverlay.degraded = true;
      runtimeOverlay.primaryCause = cause;
      runtimeOverlay.causes.push(cause);
      logger.info("smart-enforcement.degraded", {
        event: "smart_enforcement_degraded",
        overlay_cause: cause,
        runtime_degraded: true,
        static_degraded: posture.maintenanceDegraded,
        // The overlay was just latched, so the merged state is degraded.
        merged_degraded: true,
        maintenance_state: "maintenance_degraded",
        effective_mode: getEffectiveMode(),
      });
    } else if (!runtimeOverlay.causes.includes(cause)) {
      runtimeOverlay.causes.push(cause);
    }
  }

  function getMaintenanceDegraded(): boolean {
    return posture.maintenanceDegraded || runtimeOverlay.degraded;
  }

  function getEffectiveMode(): EffectiveMode {
    return computeEffectiveMode({
      mode: cfg.guidance.smartEnforcement.mode,
      requireRootKbForStrict:
        cfg.guidance.smartEnforcement.requireRootKbForStrict,
      posture: posture.state,
      maintenanceDegraded: getMaintenanceDegraded(),
    });
  }

  if (
    posture.state === "vendored_only" ||
    posture.state === "root_uninitialized" ||
    posture.state === "root_partial"
  ) {
    latchRuntimeDegraded("non_authoritative_posture");
  }
  if (!cfg.sync.enabled) {
    latchRuntimeDegraded("sync_disabled");
  }

  const maintenanceDegraded = getMaintenanceDegraded();

  logger.info("smart-enforcement.posture", {
    event: "smart_enforcement_posture",
    posture: posture.state,
    posture_state: posture.state,
    maintenance_state: maintenanceDegraded
      ? "maintenance_degraded"
      : "maintenance_available",
    needs_bootstrap: workspaceHealth.needsBootstrap,
    posture_reason: posture.reason,
    reason_code: posture.reason,
    smart_enforcement_mode: cfg.guidance.smartEnforcement.mode,
    effective_mode: getEffectiveMode(),
    static_degraded: posture.maintenanceDegraded,
    runtime_degraded: runtimeOverlay.degraded,
    merged_degraded: maintenanceDegraded,
    overlay_cause: runtimeOverlay.primaryCause ?? null,
    branch: currentBranch,
  });

  logger.info("kibi-opencode: setting up hooks");

  const schedulerFactoryGlobals = globalThis as typeof globalThis & {
    __kibi_test_scheduler_factory_by_worktree?: Map<
      string,
      typeof createSyncScheduler
    >;
    __kibi_test_scheduler_factory?: typeof createSyncScheduler;
  };

  const schedulerFactory: typeof createSyncScheduler =
    schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree?.get(
      input.worktree,
    ) ??
    schedulerFactoryGlobals.__kibi_test_scheduler_factory ??
    createSyncScheduler;

  const scheduler: ReturnType<typeof createSyncScheduler> | null = cfg.sync
    .enabled
    ? (() => {
        try {
          const schedulerOpts: SchedulerOptions = {
            worktree: input.worktree,
            config: cfg,
            onRunComplete: (meta) =>
              latchSchedulerRunFailures(meta, latchRuntimeDegraded),
          };
          return schedulerFactory(schedulerOpts);
        } catch {
          latchRuntimeDegraded("scheduler_unavailable");
          return null;
        }
      })()
    : null;

  return {
    cfg,
    workspaceHealth,
    posture,
    currentBranch,
    cache,
    runtimeOverlay,
    scheduler,
    maintenanceDegraded,
    getMaintenanceDegraded,
    getEffectiveMode,
    latchRuntimeDegraded,
  };
}
