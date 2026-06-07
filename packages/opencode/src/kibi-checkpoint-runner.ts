// implements REQ-opencode-worktree-hard-enforcement-v1

import { DEFAULTS, type KibiConfig } from "./config.js";
import type { E2eCoverageSignal } from "./e2e-coverage-signals.js";
import {
  type EnforcementLifecycleEvent,
  type PolicyLinkedEntityResult,
  computeEnforcementPolicy,
} from "./enforcement-policy.js";
import { buildEnforcementScopeKey } from "./enforcement-scope.js";
import type { PathKind } from "./path-kind.js";
import {
  type CheckRunner,
  type SyncRunMetadata,
  type SyncRunner,
  type TimeoutHandle,
  createSyncScheduler,
} from "./scheduler.js";
import type { WorkContext } from "./work-context-resolver.js";

const HARD_CHECKPOINT_TIMEOUT_MS = 30_000;
const CHECKPOINT_REASON = "smart-enforcement.checkpoint";

const NO_E2E_SIGNAL: E2eCoverageSignal = {
  level: "none",
  evidence: [],
  reminderText: null,
};

export interface KibiCheckpointContext {
  workContext: WorkContext;
  config?: KibiConfig;
  filePath?: string;
  checkRules?: string[] | undefined;
  maintenanceDegraded?: boolean;
  hardGuidanceText?: string | null;
  lifecycleEvents?: EnforcementLifecycleEvent[];
  pathKinds?: PathKind[];
  linkedEntityResults?: PolicyLinkedEntityResult[];
  e2eSignals?: E2eCoverageSignal[];
}

export interface KibiCheckpointRunnerOptions {
  config?: KibiConfig;
  runSync?: SyncRunner;
  runCheck?: CheckRunner;
  onRunComplete?: (meta: SyncRunMetadata) => void;
  timeoutMs?: number;
  setTimeoutFn?: (fn: () => void, ms: number) => TimeoutHandle;
  clearTimeoutFn?: (handle: TimeoutHandle) => void;
}

export interface KibiCheckpointMetadata {
  fingerprint: string;
  scopeKey: string;
  worktree: string;
  branch: string;
  sessionId?: string;
  agentIdentity: string;
  guidanceRendered?: boolean;
  guidanceText?: string;
  sync?: SyncRunMetadata;
  reason?: string;
  timeoutMs?: number;
  checkRules?: string[] | undefined;
  restoreInstructions?: string;
}

export type KibiCheckpointRequestResult =
  | { kind: "requested"; metadata: KibiCheckpointMetadata }
  | { kind: "skip"; metadata: KibiCheckpointMetadata }
  | { kind: "hard_block"; metadata: KibiCheckpointMetadata };

export type KibiCheckpointRunResult =
  | { kind: "passed"; metadata: KibiCheckpointMetadata }
  | { kind: "hard_block"; metadata: KibiCheckpointMetadata }
  | { kind: "skip"; metadata: KibiCheckpointMetadata };

interface RequestedCheckpoint {
  metadata: KibiCheckpointMetadata;
  guidanceRendered: boolean;
}

// implements REQ-opencode-worktree-hard-enforcement-v1
export class KibiCheckpointRunner {
  private readonly config: KibiConfig | undefined;
  private readonly runSync: SyncRunner | undefined;
  private readonly runCheck: CheckRunner | undefined;
  private readonly onRunComplete: ((meta: SyncRunMetadata) => void) | undefined;
  private readonly timeoutMs: number;
  private readonly setTimeoutFn: (fn: () => void, ms: number) => TimeoutHandle;
  private readonly clearTimeoutFn: (handle: TimeoutHandle) => void;
  private readonly requested = new Map<string, RequestedCheckpoint>();
  private readonly passed = new Map<string, KibiCheckpointMetadata>();
  private readonly passedScopeKeysByFingerprint = new Map<
    string,
    Set<string>
  >();

  constructor(options: KibiCheckpointRunnerOptions = {}) {
    this.config = options.config;
    this.runSync = options.runSync;
    this.runCheck = options.runCheck;
    this.onRunComplete = options.onRunComplete;
    this.timeoutMs = options.timeoutMs ?? HARD_CHECKPOINT_TIMEOUT_MS;
    this.setTimeoutFn = options.setTimeoutFn ?? setTimeout;
    this.clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
  }

  // implements REQ-opencode-worktree-hard-enforcement-v1
  requestCheckpoint(
    context: KibiCheckpointContext,
    fingerprint: string,
  ): KibiCheckpointRequestResult {
    const normalizedFingerprint = normalizeFingerprint(fingerprint);
    const metadata = this.baseMetadata(context, normalizedFingerprint);

    if (!context.workContext.isAuthoritative) {
      return {
        kind: "skip",
        metadata: { ...metadata, reason: "non_authoritative" },
      };
    }

    const guidanceText = this.renderHardGuidance(context);
    if (!guidanceText) {
      return {
        kind: "hard_block",
        metadata: {
          ...metadata,
          guidanceRendered: false,
          reason: "hard_guidance_not_rendered",
        },
      };
    }

    const requested: RequestedCheckpoint = {
      guidanceRendered: true,
      metadata: {
        ...metadata,
        guidanceRendered: true,
        guidanceText,
      },
    };
    this.requested.set(metadata.scopeKey, requested);

    return { kind: "requested", metadata: requested.metadata };
  }

  // implements REQ-opencode-worktree-hard-enforcement-v1
  isCheckpointPassed(
    fingerprint: string,
    context?: KibiCheckpointContext,
  ): boolean {
    const normalizedFingerprint = normalizeFingerprint(fingerprint);
    if (context) {
      return this.passed.has(this.scopeKey(context, normalizedFingerprint));
    }
    return (
      (this.passedScopeKeysByFingerprint.get(normalizedFingerprint)?.size ??
        0) > 0
    );
  }

  // implements REQ-opencode-worktree-hard-enforcement-v1
  async runCheckpoint(
    context: KibiCheckpointContext,
    fingerprint: string,
  ): Promise<KibiCheckpointRunResult> {
    const normalizedFingerprint = normalizeFingerprint(fingerprint);
    const metadata = this.baseMetadata(context, normalizedFingerprint);

    if (!context.workContext.isAuthoritative) {
      return {
        kind: "skip",
        metadata: { ...metadata, reason: "non_authoritative" },
      };
    }

    if (context.maintenanceDegraded === true) {
      return {
        kind: "hard_block",
        metadata: {
          ...metadata,
          reason: "maintenance_degraded",
          restoreInstructions:
            "Restore Kibi maintenance for this authoritative root before continuing: ensure sync is enabled and configured KB targets resolve, then retry the hard checkpoint.",
        },
      };
    }

    const request = this.requested.get(metadata.scopeKey);
    if (!request?.guidanceRendered) {
      return {
        kind: "hard_block",
        metadata: {
          ...metadata,
          guidanceRendered: false,
          reason: "checkpoint_not_requested",
        },
      };
    }

    const completions: SyncRunMetadata[] = [];
    const scheduler = createSyncScheduler({
      worktree: context.workContext.worktreeRoot,
      config: context.config ?? this.config ?? DEFAULTS,
      ...(this.runSync ? { runSync: this.runSync } : {}),
      ...(this.runCheck ? { runCheck: this.runCheck } : {}),
      onRunComplete: (meta) => {
        completions.push(meta);
        this.onRunComplete?.(meta);
      },
    });

    try {
      scheduler.scheduleSync(
        CHECKPOINT_REASON,
        context.filePath,
        normalizedCheckRules(context),
      );

      const outcome = await this.withTimeout(scheduler.flush());
      if (outcome === "timeout") {
        scheduler.dispose();
        return {
          kind: "hard_block",
          metadata: {
            ...request.metadata,
            reason: "timeout",
            timeoutMs: this.timeoutMs,
            checkRules: normalizedCheckRules(context),
          },
        };
      }

      const sync = completions[completions.length - 1];
      if (!sync) {
        return {
          kind: "hard_block",
          metadata: {
            ...request.metadata,
            reason: "sync_not_run",
            checkRules: normalizedCheckRules(context),
          },
        };
      }

      const failureReason = checkpointFailureReason(
        sync,
        normalizedCheckRules(context),
      );
      if (failureReason) {
        return {
          kind: "hard_block",
          metadata: {
            ...request.metadata,
            sync,
            reason: failureReason,
            checkRules: normalizedCheckRules(context),
          },
        };
      }

      const passedMetadata: KibiCheckpointMetadata = {
        ...request.metadata,
        sync,
        checkRules: normalizedCheckRules(context),
      };
      this.recordPassed(passedMetadata);
      return { kind: "passed", metadata: passedMetadata };
    } finally {
      scheduler.dispose();
    }
  }

  private baseMetadata(
    context: KibiCheckpointContext,
    fingerprint: string,
  ): KibiCheckpointMetadata {
    const workContext = context.workContext;
    return {
      fingerprint,
      scopeKey: this.scopeKey(context, fingerprint),
      worktree: workContext.worktreeRoot,
      branch: workContext.branch,
      ...(workContext.sessionId !== undefined
        ? { sessionId: workContext.sessionId }
        : {}),
      agentIdentity: workContext.agentIdentity,
    };
  }

  private scopeKey(
    context: KibiCheckpointContext,
    fingerprint: string,
  ): string {
    return buildEnforcementScopeKey({
      sessionId: context.workContext.sessionId,
      agentIdentity: context.workContext.agentIdentity,
      worktreeRoot: context.workContext.worktreeRoot,
      branch: context.workContext.branch,
      dirtyRelevantFingerprint: fingerprint,
    });
  }

  private renderHardGuidance(context: KibiCheckpointContext): string | null {
    if (typeof context.hardGuidanceText === "string") {
      const trimmed = context.hardGuidanceText.trim();
      return trimmed.length > 0 ? context.hardGuidanceText : null;
    }

    const policy = computeEnforcementPolicy({
      resolvedContext: context.workContext,
      effectiveMode: "hard",
      lifecycleEvents: context.lifecycleEvents ?? [
        defaultLifecycleEvent(context),
      ],
      pathKinds: context.pathKinds ?? ["code"],
      linkedEntityResults: context.linkedEntityResults ?? [
        { ids: [], source: "none" },
      ],
      e2eSignals: context.e2eSignals ?? [NO_E2E_SIGNAL],
      checkpointEvidence: false,
      posture: context.workContext.posture,
    });

    return policy.kind === "hard_block" ? policy.text : null;
  }

  private async withTimeout(
    promise: Promise<void>,
  ): Promise<"done" | "timeout"> {
    let timeoutHandle: TimeoutHandle | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timeoutHandle = this.setTimeoutFn(
        () => resolve("timeout"),
        this.timeoutMs,
      );
    });

    const result = await Promise.race([
      promise.then(() => "done" as const),
      timeout,
    ]);

    if (timeoutHandle !== undefined) {
      this.clearTimeoutFn(timeoutHandle);
    }

    return result;
  }

  private recordPassed(metadata: KibiCheckpointMetadata): void {
    this.passed.set(metadata.scopeKey, metadata);
    const existing = this.passedScopeKeysByFingerprint.get(
      metadata.fingerprint,
    );
    if (existing) {
      existing.add(metadata.scopeKey);
      return;
    }
    this.passedScopeKeysByFingerprint.set(
      metadata.fingerprint,
      new Set([metadata.scopeKey]),
    );
  }
}

function normalizeFingerprint(fingerprint: string): string {
  const trimmed = fingerprint.trim();
  return trimmed.length > 0 ? trimmed : "clean";
}

function normalizedCheckRules(
  context: KibiCheckpointContext,
): string[] | undefined {
  return context.checkRules && context.checkRules.length > 0
    ? [...context.checkRules]
    : undefined;
}

function defaultLifecycleEvent(
  context: KibiCheckpointContext,
): EnforcementLifecycleEvent {
  return {
    normalizedPath:
      context.filePath ?? context.workContext.repoRelativePath ?? "<unknown>",
    lifecycle: "edited",
  };
}

function checkpointFailureReason(
  sync: SyncRunMetadata,
  checkRules: string[] | undefined,
): string | null {
  if (sync.exitCode !== 0) {
    return "sync_failed";
  }

  if (checkRules && checkRules.length > 0 && sync.checkExitCode !== 0) {
    return "check_failed";
  }

  return null;
}
