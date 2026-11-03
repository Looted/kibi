import * as path from "node:path";
import {
  type AutoUpdateInput,
  type AutoUpdateResult,
  createAutoUpdateRunner,
  getLatestPluginVersion,
  invalidateKibiOpencodePackage,
  runBunInstallForOpenCodePlugin,
} from "./auto-update.js";
import { getE2eCoverageSignal } from "./e2e-coverage-signals.js"; // implements REQ-opencode-file-context-guidance-v1
import {
  buildDirtyRelevantFingerprint,
  buildEnforcementScopeKey,
} from "./enforcement-scope.js";
import { getFileLinkedEntityIds } from "./file-entity-links.js"; // implements REQ-opencode-file-context-guidance-v1
import * as fileFilter from "./file-filter.js";
import { deriveFileOperationReminder } from "./file-operation-reminders.js"; // implements REQ-opencode-file-context-guidance-v1
import {
  type FileLifecycle,
  type FileOperationState,
  createFileOperationState,
} from "./file-operation-state.js"; // implements REQ-opencode-file-context-guidance-v1
import type { ReminderKind } from "./file-operation-state.js";
import type { CacheKey } from "./guidance-cache.js";
import { recordOpencodeToolTelemetry } from "./hook-telemetry.js";
import {
  type KbFreshnessScope,
  createKbFreshnessEvidenceStore,
  evaluateKbFreshness,
} from "./kb-freshness-state.js";
import {
  type OpenCodeConfigHookInput,
  getKibiBootstrapCommandCapability,
  registerKibiBootstrapCommand,
} from "./kibi-bootstrap-capability.js";
import {
  type KibiCheckpointContext,
  KibiCheckpointRunner,
} from "./kibi-checkpoint-runner.js";
import * as logger from "./logger.js";
import { classifyMeaningfulChange } from "./meaningful-change-classifier.js";
import { type PathKind, analyzePath } from "./path-kind.js";
import {
  latchSchedulerRunFailures,
  runPluginStartup,
} from "./plugin-startup.js";
import { SENTINEL, buildPrompt } from "./prompt.js";
import type { RiskClass } from "./risk-classifier.js";
import { type SyncScheduler, createSyncScheduler } from "./scheduler.js";
import {
  type SessionEditState,
  createSessionEditState,
} from "./session-edit-state.js";
import { type WarningCategory, getSessionTracker } from "./session-tracker.js";
import type { SmartEnforcementState } from "./smart-enforcement-events.js";
import {
  type KibiEventEnv,
  classifyEditedFile,
  handleFileLifecycleEvent,
  handleKbToolEvent,
  isKbToolEventType,
} from "./smart-enforcement-events.js";
import {
  type StartupNotifierClient,
  knownVersions,
  notifyStartup,
} from "./startup-notifier.js";
import {
  type ToastCapableClient as SendToastClient,
  sendToast,
} from "./toast.js";
import { readKibiPackageVersions } from "./version-metadata.js";
import {
  type WorkContext,
  resolveWorkContext,
} from "./work-context-resolver.js";

type ToastCapableClient = SendToastClient;

export function resetCommentSuggestion(): null {
  return null;
}

// implements REQ-opencode-file-context-guidance-v1
export function nextRecentCommentSuggestion<T>(
  inspectingCodeComments: boolean,
  suggestion: T | null | undefined,
): T | null {
  if (inspectingCodeComments && suggestion) return suggestion;
  return resetCommentSuggestion();
}

/** Logs a checkpoint run that rejected instead of reporting a result. */
export function logCheckpointFailure(
  fingerprint: string,
): (error: unknown) => void {
  return (error) => {
    logger.errorStructuredOnly("smart-enforcement.checkpoint-failed", {
      event: "smart_enforcement_checkpoint_failed",
      fingerprint,
      error: error instanceof Error ? error.message : String(error),
    });
  };
}

export function adoptPrecomputedSuggestion<T>(
  recent: T | null,
  precomputed: T | null | undefined,
): T | null {
  return recent ?? precomputed ?? null;
}

import * as fs from "node:fs";

export interface PluginInput {
  worktree: string;
  directory: string;
  sessionId?: string;
  agentIdentity?: string;
  serverUrl?: unknown;

  workspace?: string;
  project?: unknown;
  $?: unknown;
  client?: {
    tui?: {
      toast?: (payload: {
        variant?: "info" | "success" | "warning" | "error";
        title?: string;
        message: string;
        duration?: number;
      }) => void | Promise<void>;
      showToast?: (payload: {
        body: {
          variant?: "info" | "success" | "warning" | "error";
          title?: string;
          message: string;
          duration?: number;
        };
      }) => void | Promise<void>;
      clearPrompt?: () => void | Promise<void>;
      submitPrompt?: () => void | Promise<void>;
    };
    app: { log: (payload: Record<string, unknown>) => Promise<void> };
  };
}

interface OpencodeEventPayload {
  type: string;
  properties?: Record<string, unknown>;
}

interface EventHookInput {
  event: OpencodeEventPayload;
}

interface SystemTransformOutput {
  system: string[];
}

interface SystemTransformInput {
  focusFilePath?: string;
  filePath?: string;
  path?: string;
  file?: string;
  focusEdit?: {
    path?: string;
    filePath?: string;
  } | null;
}

export interface Hooks {
  event?: (input: EventHookInput) => void | Promise<void>;
  config?: (input: OpenCodeConfigHookInput) => void | Promise<void>;
  "experimental.chat.system.transform"?: (
    input: unknown,
    output: SystemTransformOutput,
  ) => void | Promise<void>;
  "chat.params"?: (input: unknown, output: unknown) => void | Promise<void>;
  "tool.execute.after"?: (
    input: { tool?: string; sessionID?: string; args?: unknown } | undefined,
    output?: unknown,
  ) => void | Promise<void>;
}

export type Plugin = (input: PluginInput) => Hooks | Promise<Hooks>;

type StartupNotifyScheduler = (callback: () => void, delayMs: number) => void;

const startupNotifyGlobals = globalThis as typeof globalThis & {
  __kibi_test_schedule_startup_notify?: StartupNotifyScheduler;
  __kibi_test_auto_update_runner?: (
    input: AutoUpdateInput,
  ) => Promise<AutoUpdateResult>;
};

/**
 * Lint requirement documents for embedded scenarios/tests and oversized content.
 */
// implements REQ-opencode-kibi-plugin-v1
export function lintRequirementDoc(
  filePath: string,
  worktree: string,
): Array<{ category: WarningCategory; message: string }> {
  const warnings: Array<{ category: WarningCategory; message: string }> = [];

  try {
    const content = String(fs.readFileSync(path.resolve(worktree, filePath)));

    // The lazy gaps absorb any further whitespace after each keyword.
    if (/given\s[\s\S]*?when\s[\s\S]*?then/i.test(content)) {
      warnings.push({
        category: "embedded-scenario-in-req",
        message: `Requirement file ${filePath} appears to contain embedded scenario (Given/When/Then). Consider extracting to a separate SCEN entity.`,
      });
    }

    if (/\b(assert|verify|expected\s+to|should\s+return)\b/i.test(content)) {
      warnings.push({
        category: "embedded-test-in-req",
        message: `Requirement file ${filePath} appears to contain embedded test assertions. Consider extracting to a separate TEST entity.`,
      });
    }

    const lines = content.split("\n");
    const contentLines = lines.filter(
      (l) => l.trim() && !l.startsWith("---") && !l.startsWith("#"),
    );
    if (contentLines.length > 50) {
      warnings.push({
        category: "missing-traceability",
        message: `Requirement file ${filePath} is very long (${contentLines.length} content lines). Consider splitting into multiple requirements or extracting scenarios/tests.`,
      });
    }
  } catch {
    // Ignore read errors
  }

  return warnings;
}

// rationale: an unreadable file must classify like text without exports; an
// emptied catch or another fallback text classifies the same, so neither
// mutant can be observed.
// Stryker disable BlockStatement,StringLiteral
function readTextOrEmpty(fullPath: string): string {
  try {
    return String(fs.readFileSync(fullPath));
  } catch {
    return "";
  }
}
// rationale: ends the exemption for the read fallback above.
// Stryker restore BlockStatement,StringLiteral

// implements REQ-opencode-kibi-plugin-v1
const kibiOpencodePlugin: Plugin = async (
  input: PluginInput,
): Promise<Hooks> => {
  // sendToast and notifyStartup only call the host's own functions on it.
  const makeToastClient = (
    client: NonNullable<typeof input.client>,
  ): ToastCapableClient => client as ToastCapableClient;

  const makeStartupClient = (
    client: NonNullable<typeof input.client>,
  ): StartupNotifierClient => client as StartupNotifierClient;

  const startup = await runPluginStartup(input);
  if (!startup) {
    return {};
  }

  const {
    cfg,
    workspaceHealth,
    posture,
    cache,
    runtimeOverlay,
    scheduler: startupScheduler,
    maintenanceDegraded,
    getMaintenanceDegraded,
    getEffectiveMode,
    latchRuntimeDegraded,
  } = startup;

  const hooks: Hooks = {};
  const kibiBootstrapCommandCapability = getKibiBootstrapCommandCapability();

  if (kibiBootstrapCommandCapability.supported) {
    hooks.config = async (configInput) => {
      registerKibiBootstrapCommand(configInput, kibiBootstrapCommandCapability);
    };
  }

  // Plugin instance state (not module globals)
  const MAX_RECENT_EDITS = 5;
  const enforcementState: SmartEnforcementState = {
    recentEditCount: 0,
    hasRecentKbEdit: false,
    recentCommentSuggestion: null,
    seenFingerprints: new Set(), // For deduplication
    lastRiskClass: null,
    lastRiskFilePath: null,
    lastRiskScopeKey: null,
  };
  const schedulerRegistry = new Map<string, SyncScheduler>();
  if (startupScheduler) {
    schedulerRegistry.set(path.resolve(input.worktree), startupScheduler);
  }
  const schedulerFactoryGlobals = globalThis as typeof globalThis & {
    __kibi_test_scheduler_factory_by_worktree?: Map<
      string,
      typeof createSyncScheduler
    >;
    __kibi_test_scheduler_factory?: typeof createSyncScheduler;
  };
  /** Per worktree and branch state, created together on first use. */
  interface ScopedState {
    sessionEdits: SessionEditState;
    fileOperations: FileOperationState;
    pathKinds: Map<string, PathKind>;
    checkpointRunner?: KibiCheckpointRunner;
  }
  const scopedStates = new Map<string, ScopedState>();
  const freshnessStore = createKbFreshnessEvidenceStore();

  function resolveScopedWorkContext(filePath?: string): WorkContext {
    return resolveWorkContext({
      inputDirectory: input.directory,
      inputWorktree: input.worktree,
      filePath,
      sessionId: input.sessionId,
      agentIdentity: input.agentIdentity,
    });
  }

  // The session and agent are fixed for the plugin instance.
  function scopedState(context: WorkContext): ScopedState {
    const key = JSON.stringify([context.worktreeRoot, context.branch]);
    let state = scopedStates.get(key);
    if (!state) {
      state = {
        sessionEdits: createSessionEditState({
          worktree: context.worktreeRoot,
        }),
        // implements REQ-opencode-file-context-guidance-v1
        fileOperations: createFileOperationState({
          worktree: context.worktreeRoot,
        }),
        pathKinds: new Map<string, PathKind>(),
      };
      scopedStates.set(key, state);
    }
    return state;
  }

  const getSessionEditState = (context: WorkContext): SessionEditState =>
    scopedState(context).sessionEdits;
  const getFileOperationState = (context: WorkContext): FileOperationState =>
    scopedState(context).fileOperations;
  const getPathKindCache = (context: WorkContext): Map<string, PathKind> =>
    scopedState(context).pathKinds;

  function getCheckpointRunnerForContext(
    context: WorkContext,
  ): KibiCheckpointRunner {
    const state = scopedState(context);
    state.checkpointRunner ??= new KibiCheckpointRunner({
      config: cfg,
      // Checkpoint runs are smart-enforcement syncs, whose sync failures
      // never latch the degraded state; failed checks do.
      onRunComplete: (meta) =>
        latchSchedulerRunFailures(meta, latchRuntimeDegraded),
    });
    return state.checkpointRunner;
  }

  function getSchedulerForContext(context: WorkContext): SyncScheduler | null {
    if (!cfg.sync.enabled) {
      return null;
    }
    const worktreeRoot = path.resolve(context.worktreeRoot);
    const existing = schedulerRegistry.get(worktreeRoot);
    if (existing) {
      return existing;
    }

    const schedulerFactory: typeof createSyncScheduler =
      schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree?.get(
        worktreeRoot,
      ) ??
      schedulerFactoryGlobals.__kibi_test_scheduler_factory ??
      createSyncScheduler;

    try {
      const scopedScheduler = schedulerFactory({
        worktree: worktreeRoot,
        config: cfg,
        onRunComplete: (meta) =>
          latchSchedulerRunFailures(meta, latchRuntimeDegraded),
      });
      schedulerRegistry.set(worktreeRoot, scopedScheduler);
      return scopedScheduler;
    } catch {
      latchRuntimeDegraded("scheduler_unavailable");
      return null;
    }
  }

  function buildScopedCacheKey(
    context: WorkContext,
    riskClass: RiskClass,
    fileBucket: string,
    dirtyRelevantInputs: Iterable<string | null | undefined>,
  ): CacheKey {
    const cacheKey: CacheKey = {
      workspaceRoot: context.worktreeRoot,
      branch: context.branch,
      posture: context.posture,
      riskClass,
      fileBucket,
    };
    if (getEffectiveMode() === "hard") {
      cacheKey.scopeKey = buildEnforcementScopeKey({
        sessionId: context.sessionId,
        agentIdentity: context.agentIdentity,
        worktreeRoot: context.worktreeRoot,
        branch: context.branch,
        dirtyRelevantFingerprint:
          buildDirtyRelevantFingerprint(dirtyRelevantInputs),
      });
    }
    return cacheKey;
  }

  const rootWorkContext = resolveScopedWorkContext();
  let degradedWarnedOnce = false;

  function normalizeSessionPath(
    filePath: string,
    worktree = input.worktree,
  ): string {
    if (path.isAbsolute(filePath)) {
      const relativePath = path.relative(worktree, filePath);
      return relativePath.startsWith("..") ? filePath : relativePath;
    }
    return filePath;
  }

  function resolveWorktreePath(
    filePath: string,
    worktree = input.worktree,
  ): string {
    return path.resolve(worktree, filePath);
  }

  function buildRiskPathScopeKey(
    context: WorkContext,
    filePath: string,
  ): string {
    return JSON.stringify([
      context.worktreeRoot,
      context.branch,
      normalizeSessionPath(filePath, context.worktreeRoot),
    ]);
  }

  function getTransformFocusFilePath(
    transformInput: unknown,
  ): string | undefined {
    // Primitives carry none of the path fields.
    const inputRecord = transformInput as SystemTransformInput | null;
    const directPath =
      inputRecord?.focusFilePath ??
      inputRecord?.filePath ??
      inputRecord?.path ??
      inputRecord?.file ??
      inputRecord?.focusEdit?.path ??
      inputRecord?.focusEdit?.filePath;
    return typeof directPath === "string" && directPath !== ""
      ? normalizeSessionPath(directPath)
      : undefined;
  }

  function readFileContent(
    filePath: string,
    worktree = input.worktree,
  ): string {
    return readTextOrEmpty(resolveWorktreePath(filePath, worktree));
  }

  function updateRecentEditsFromSession(sessionEdits: readonly unknown[]) {
    enforcementState.recentEditCount = Math.min(
      sessionEdits.length,
      MAX_RECENT_EDITS,
    );
  }

  function deriveRiskContext(
    context: WorkContext,
    filePath: string,
    scopedPathKindCache: Map<string, PathKind>,
  ): RiskClass {
    const normalizedFilePath = normalizeSessionPath(
      filePath,
      context.worktreeRoot,
    );
    const pathAnalysis = analyzePath(normalizedFilePath, context.worktreeRoot);
    scopedPathKindCache.set(normalizedFilePath, pathAnalysis.kind);
    const { precomputedSuggestion, riskClass } = classifyEditedFile(
      eventEnv,
      context.worktreeRoot,
      normalizedFilePath,
      pathAnalysis,
    );
    enforcementState.recentCommentSuggestion = precomputedSuggestion;
    enforcementState.lastRiskClass = riskClass;
    enforcementState.lastRiskFilePath = normalizedFilePath;
    enforcementState.lastRiskScopeKey = buildRiskPathScopeKey(
      context,
      normalizedFilePath,
    );
    return riskClass;
  }

  const eventEnv: KibiEventEnv = {
    input,
    cfg,
    cache,
    freshnessStore,
    fileFilter,
    log: logger,
    rootWorkContext,
    state: enforcementState,
    resolveScopedWorkContext,
    getSessionEditState,
    getFileOperationState,
    getPathKindCache,
    getSchedulerForContext,
    normalizeSessionPath,
    resolveWorktreePath,
    buildRiskPathScopeKey,
    buildScopedCacheKey,
    readFileContent,
    updateRecentEditsFromSession,
    recordWarning: (category, filePath, message) =>
      getSessionTracker().recordWarning(
        category as WarningCategory,
        filePath,
        message,
      ),
    getMaintenanceDegraded,
    getEffectiveMode,
    runtimeOverlay,
    posture,
    lintRequirementDoc,
  };

  // Opt-in usage rows for the lookup-before-first-edit telemetry metric.
  hooks["tool.execute.after"] = async (toolCall) => {
    recordOpencodeToolTelemetry({
      worktree: rootWorkContext.worktreeRoot,
      tool: toolCall?.tool,
      args: toolCall?.args,
      sessionId: toolCall?.sessionID,
      startedAt: new Date(),
    });
  };

  hooks.event = async ({ event }) => {
    if (isKbToolEventType(event.type)) {
      handleKbToolEvent(eventEnv, event, input.sessionId);
      return;
    }
    if (
      event.type === "file.created" ||
      event.type === "file.edited" ||
      event.type === "file.deleted"
    ) {
      handleFileLifecycleEvent(eventEnv, event);
    }
  };

  if (cfg.prompt.enabled) {
    const hookMode = cfg.prompt.hookMode;

    if (hookMode === "system-transform" || hookMode === "auto") {
      hooks["experimental.chat.system.transform"] = async (
        transformInput,
        output,
      ) => {
        // Skip if sentinel already present in any existing entry
        if (output.system.some((entry: string) => entry.includes(SENTINEL))) {
          return;
        }

        const maintenanceDegraded = getMaintenanceDegraded();
        const showDegradedAdvisory =
          maintenanceDegraded &&
          cfg.guidance.smartEnforcement.degradedMode === "warn-once" &&
          !degradedWarnedOnce;
        const transformFocusFilePath =
          getTransformFocusFilePath(transformInput);
        const promptWorkContext = resolveScopedWorkContext(
          transformFocusFilePath,
        );
        const promptSessionEditState = getSessionEditState(promptWorkContext);
        const promptFileOperationState =
          getFileOperationState(promptWorkContext);
        const promptPathKindCache = getPathKindCache(promptWorkContext);
        promptSessionEditState.reconcileKnownPaths();
        if (transformFocusFilePath) {
          promptSessionEditState.forceEdit(
            normalizeSessionPath(
              transformFocusFilePath,
              promptWorkContext.worktreeRoot,
            ),
          );
        }

        const transformSessionEdits = promptSessionEditState.getSessionEdits();
        const transformFocusEdit = promptSessionEditState.getFocusEdit();
        // A missing kind reaches the prompt's cache bucket as "unknown".
        const transformPromptFocusEdit = transformFocusEdit
          ? {
              path: transformFocusEdit.filePath,
              kind: promptPathKindCache.get(
                transformFocusEdit.filePath,
              ) as PathKind,
            }
          : null;
        const riskContextFilePath =
          transformFocusEdit?.filePath ?? transformFocusFilePath;
        // The last classified file's class stands unless the focus file is
        // another one (or nothing was classified yet).
        let effectiveRiskClass: RiskClass | null =
          enforcementState.lastRiskClass;
        if (
          riskContextFilePath &&
          (effectiveRiskClass === null ||
            enforcementState.lastRiskScopeKey !==
              buildRiskPathScopeKey(promptWorkContext, riskContextFilePath))
        ) {
          effectiveRiskClass = deriveRiskContext(
            promptWorkContext,
            riskContextFilePath,
            promptPathKindCache,
          );
        }

        const promptFocusFilePath: string | undefined =
          transformFocusEdit?.filePath ?? transformFocusFilePath;

        // Steps 3-4: File-operation reminder selection with suppression // implements REQ-opencode-file-context-guidance-v1
        let fileOperationReminder:
          | {
              path: string;
              lifecycleReminder: string | null;
              e2eReminder: string | null;
            }
          | undefined;
        let hardGateBlock:
          | {
              shownPaths: string[];
              remainingCount: number;
              reason?: string;
            }
          | undefined;
        let hardGateConsumedPath: string | undefined;
        let hardGateFingerprint: string | undefined;
        let hardGateReminderKindsToMark: ReminderKind[] = [];
        const focusPathForReminder =
          transformFocusFilePath ?? promptFocusFilePath;
        if (focusPathForReminder) {
          const normalizedFocusPath =
            promptFileOperationState.normalizePath(focusPathForReminder);
          const pendingLifecycle =
            promptFileOperationState.peekPending(normalizedFocusPath);
          if (pendingLifecycle) {
            // Check if any reminder kind for this lifecycle has not yet been shown
            const reminderKindsForLifecycle: ReminderKind[] =
              pendingLifecycle.lifecycle === "deleted"
                ? ["kibi_delete", "e2e_delete"]
                : ["kibi_write", "e2e_write"];
            const hasUnshownReminder = reminderKindsForLifecycle.some(
              (kind) =>
                !promptFileOperationState.hasShown(normalizedFocusPath, kind),
            );
            if (hasUnshownReminder) {
              // Resolve linked entities and e2e signal
              const linkedEntityResult = getFileLinkedEntityIds(
                promptWorkContext.worktreeRoot,
                focusPathForReminder,
              );
              const e2eSignal = getE2eCoverageSignal(
                promptWorkContext.worktreeRoot,
                focusPathForReminder,
              );
              const focusPathKind =
                promptPathKindCache.get(normalizedFocusPath) ?? "unknown";
              const effectiveMode = getEffectiveMode();
              let checkpointEvidence = false;
              let checkpointRunner: KibiCheckpointRunner | null = null;
              let checkpointContext: KibiCheckpointContext | null = null;
              const checkpointFingerprint = buildDirtyRelevantFingerprint([
                normalizedFocusPath,
                pendingLifecycle.lifecycle,
                focusPathKind,
                effectiveRiskClass ?? "safe_docs_only",
              ]);
              if (
                effectiveMode === "hard" &&
                promptWorkContext.isAuthoritative
              ) {
                checkpointRunner =
                  getCheckpointRunnerForContext(promptWorkContext);
                checkpointContext = {
                  workContext: promptWorkContext,
                  config: cfg,
                  filePath: normalizedFocusPath,
                  maintenanceDegraded,
                  lifecycleEvents: [
                    {
                      normalizedPath: normalizedFocusPath,
                      lifecycle: pendingLifecycle.lifecycle,
                    },
                  ],
                  pathKinds: [focusPathKind],
                  linkedEntityResults: [linkedEntityResult],
                  e2eSignals: [e2eSignal],
                };
                checkpointEvidence = checkpointRunner.isCheckpointPassed(
                  checkpointFingerprint,
                  checkpointContext,
                );
              }
              const reminderResult = deriveFileOperationReminder({
                normalizedPath: normalizedFocusPath,
                lifecycle: pendingLifecycle.lifecycle,
                pathKind: focusPathKind,
                linkedEntityResult,
                e2eSignal,
                currentSemanticRisk: effectiveRiskClass ?? "safe_docs_only",
                posture: promptWorkContext.posture,
                effectiveMode,
                resolvedContext: promptWorkContext,
                checkpointEvidence,
              });
              const policyResult = reminderResult.policyResult;
              if (policyResult.kind === "hard_block") {
                hardGateBlock = {
                  shownPaths: policyResult.shownPaths,
                  remainingCount: policyResult.remainingCount,
                  reason: "checkpoint_required",
                };
                hardGateConsumedPath = normalizedFocusPath;
                hardGateFingerprint = checkpointFingerprint;
                hardGateReminderKindsToMark =
                  reminderResult.reminderKindsToMark;
                if (checkpointRunner && checkpointContext) {
                  const checkpointContextWithGuidance = {
                    ...checkpointContext,
                    hardGuidanceText: reminderResult.lifecycleReminder,
                  } satisfies KibiCheckpointContext;
                  const request = checkpointRunner.requestCheckpoint(
                    checkpointContextWithGuidance,
                    checkpointFingerprint,
                  );
                  if (request.kind === "requested") {
                    void checkpointRunner
                      .runCheckpoint(
                        checkpointContextWithGuidance,
                        checkpointFingerprint,
                      )
                      .then((result) => {
                        logger.info("smart-enforcement.checkpoint", {
                          event: "smart_enforcement_checkpoint",
                          fingerprint: checkpointFingerprint,
                          result: result.kind,
                          reason: result.metadata.reason,
                        });
                      })
                      .catch(logCheckpointFailure(checkpointFingerprint));
                  }
                }
              } else {
                fileOperationReminder = {
                  path: normalizedFocusPath,
                  lifecycleReminder: reminderResult.lifecycleReminder,
                  e2eReminder: reminderResult.e2eReminder,
                };
              }
            }
          }
        }

        // Build freshness evidence for the current dirty fingerprint
        let freshnessEval: ReturnType<typeof evaluateKbFreshness> | undefined;
        const freshnessFingerprint = `${promptWorkContext.sessionId ?? ""}-${promptWorkContext.branch}`;
        const freshnessScope: KbFreshnessScope = {
          ...(promptWorkContext.sessionId !== undefined
            ? { sessionId: promptWorkContext.sessionId }
            : {}),
          agentIdentity: promptWorkContext.agentIdentity,
          worktree: promptWorkContext.worktreeRoot,
          branch: promptWorkContext.branch,
          fingerprint: freshnessFingerprint,
        };
        if (transformFocusFilePath) {
          const normalizedFocusPathForFreshness =
            promptFileOperationState.normalizePath(transformFocusFilePath);
          const focusPathKindForFreshness =
            promptPathKindCache.get(normalizedFocusPathForFreshness) ??
            "unknown";
          const pendingLifecycleForFreshness =
            promptFileOperationState.peekPending(
              normalizedFocusPathForFreshness,
            );
          const effectiveRiskClassForFreshness =
            effectiveRiskClass ?? "safe_docs_only";
          const meaningfulChange = classifyMeaningfulChange({
            normalizedPath: normalizedFocusPathForFreshness,
            pathKind: focusPathKindForFreshness,
            lifecycle: pendingLifecycleForFreshness?.lifecycle ?? "edited",
            riskClass: effectiveRiskClassForFreshness,
          });
          if (meaningfulChange === "requires-kb-evidence") {
            const freshnessEvidence = freshnessStore.getEvidence(
              freshnessScope,
              [normalizedFocusPathForFreshness],
            );
            freshnessEval = evaluateKbFreshness(freshnessEvidence);
          }
        }
        const guidance = buildPrompt({
          // Session edits always leave a focus edit, which the prompt
          // reads first, and a risk class, so the legacy edit list that only
          // serves classless prompts stays empty.
          recentEdits: [],
          focusEdit: transformPromptFocusEdit,
          workspaceHealth,
          hasRecentKbEdit: enforcementState.hasRecentKbEdit,
          recentCommentSuggestion: enforcementState.recentCommentSuggestion,
          posture: promptWorkContext.posture,
          cache,
          workspaceRoot: promptWorkContext.worktreeRoot,
          branch: promptWorkContext.branch,
          completionReminder: cfg.guidance.smartEnforcement.completionReminder,
          maintenanceDegraded,
          degradedMode: cfg.guidance.smartEnforcement.degradedMode,
          showDegradedAdvisory,
          ...(effectiveRiskClass != null
            ? { riskClass: effectiveRiskClass }
            : {}),
          ...(fileOperationReminder !== undefined
            ? { fileOperationReminder }
            : {}),
          ...(hardGateBlock !== undefined ? { hardGateBlock } : {}),
          ...(freshnessEval ? { kbFreshness: freshnessEval } : {}),
          ...(freshnessEval && transformSessionEdits.length > 0
            ? {
                freshnessChangedPaths: [
                  ...new Set(transformSessionEdits.map((e) => e.filePath)),
                ].slice(0, 5),
              }
            : {}),
        });
        logger.info("smart-enforcement.guidance", {
          event: "smart_enforcement_guidance",
          emitted: guidance.trim() !== "" && guidance.trim() !== SENTINEL,
          posture: promptWorkContext.posture,
          posture_state: promptWorkContext.posture,
          guidance_action:
            guidance.trim() !== "" && guidance.trim() !== SENTINEL
              ? "emit"
              : "skip",
          risk_class: enforcementState.lastRiskClass,
          recent_edits: enforcementState.recentEditCount,
          static_degraded: posture.maintenanceDegraded,
          runtime_degraded: runtimeOverlay.degraded,
          merged_degraded: maintenanceDegraded,
          overlay_cause: runtimeOverlay.primaryCause ?? null,
        });

        // Emit completion-reminder log only when prompt-visible reminder text is present
        const REMINDER_TEXT =
          "Kibi impact evidence is required before completion/commit: run `kb_check` before completing this task.";
        if (
          cfg.guidance.smartEnforcement.completionReminder &&
          !maintenanceDegraded &&
          guidance.includes(REMINDER_TEXT)
        ) {
          logger.info("smart-enforcement.completion-reminder", {
            event: "smart_enforcement_completion_reminder",
            risk_class: enforcementState.lastRiskClass,
            posture: promptWorkContext.posture,
            posture_state: promptWorkContext.posture,
            guidance_action: "completion_reminder",
            reminder: "kb_check",
            static_degraded: posture.maintenanceDegraded,
            runtime_degraded: runtimeOverlay.degraded,
            merged_degraded: maintenanceDegraded,
            overlay_cause: runtimeOverlay.primaryCause ?? null,
          });
        }

        // Step 6: After prompt generation, mark reminders as shown if guidance contains the text // implements REQ-opencode-file-context-guidance-v1
        if (fileOperationReminder) {
          const lifecycleReminderText = fileOperationReminder.lifecycleReminder;
          const e2eReminderText = fileOperationReminder.e2eReminder;
          const focusPathForConsume = fileOperationReminder.path;

          // Determine which reminders were actually emitted in guidance
          // The word budget can keep only a reminder's first line, which
          // still shows it.
          const emitted = (text: string | null): boolean =>
            text !== null && guidance.includes(text.split("\n")[0] ?? text);
          const lifecycleEmitted = emitted(lifecycleReminderText);
          const e2eEmitted = emitted(e2eReminderText);

          // Once guidance for the path was shown, a reminder kind that had no
          // text this time has nothing left to show for it; otherwise a later
          // event for the same path would look unshown and repeat the guidance.
          if (lifecycleEmitted || e2eEmitted) {
            const kinds =
              promptFileOperationState.peekPending(focusPathForConsume)
                ?.lifecycle === "deleted"
                ? (["kibi_delete", "e2e_delete"] as const)
                : (["kibi_write", "e2e_write"] as const);
            if (lifecycleReminderText === null) {
              promptFileOperationState.markShown(focusPathForConsume, kinds[0]);
            }
            if (e2eReminderText === null) {
              promptFileOperationState.markShown(focusPathForConsume, kinds[1]);
            }
          }

          // Mark shown and log only for reminders that were actually emitted
          if (lifecycleEmitted) {
            const kind: import("./file-operation-state.js").ReminderKind =
              promptFileOperationState.peekPending(focusPathForConsume)
                ?.lifecycle === "deleted"
                ? "kibi_delete"
                : "kibi_write";
            promptFileOperationState.markShown(focusPathForConsume, kind);
            logger.info("smart-enforcement.file-operation-reminder", {
              event: "smart_enforcement_file_operation_reminder",
              file: focusPathForConsume,
              lifecycle:
                promptFileOperationState.peekPending(focusPathForConsume)
                  ?.lifecycle ?? null,
              posture_state: promptWorkContext.posture,
              risk_class: effectiveRiskClass,
            });
          }

          if (e2eEmitted) {
            const kind: import("./file-operation-state.js").ReminderKind =
              promptFileOperationState.peekPending(focusPathForConsume)
                ?.lifecycle === "deleted"
                ? "e2e_delete"
                : "e2e_write";
            promptFileOperationState.markShown(focusPathForConsume, kind);
            const e2eSignalForLog = getE2eCoverageSignal(
              promptWorkContext.worktreeRoot,
              focusPathForConsume,
            );
            logger.info("smart-enforcement.e2e-reminder", {
              event: "smart_enforcement_e2e_reminder",
              file: focusPathForConsume,
              lifecycle:
                promptFileOperationState.peekPending(focusPathForConsume)
                  ?.lifecycle ?? null,
              signal_level: e2eSignalForLog.level,
              posture_state: promptWorkContext.posture,
              risk_class: effectiveRiskClass,
            });
          }

          // Consume pending only if at least one reminder was emitted
          if (lifecycleEmitted || e2eEmitted) {
            promptFileOperationState.consumePending(focusPathForConsume);
          }
        }

        if (
          hardGateBlock &&
          hardGateConsumedPath &&
          guidance.includes("🛑 Kibi hard gate blocked")
        ) {
          for (const kind of hardGateReminderKindsToMark) {
            promptFileOperationState.markShown(hardGateConsumedPath, kind);
          }
          promptFileOperationState.consumePending(hardGateConsumedPath);
          logger.info("smart-enforcement.hard-gate-consumed", {
            event: "smart_enforcement_hard_gate_consumed",
            file: hardGateConsumedPath,
            fingerprint: hardGateFingerprint ?? null,
            posture_state: promptWorkContext.posture,
            risk_class: effectiveRiskClass,
          });
        }

        // Latch degraded advisory warning-once state
        if (showDegradedAdvisory && guidance.includes("Maintenance degraded")) {
          degradedWarnedOnce = true;
        }

        const last =
          output.system.length > 0
            ? output.system[output.system.length - 1]
            : undefined;
        if (last !== guidance) {
          output.system.push(guidance);
        }
      };
    }

    if (hookMode === "chat-params" || hookMode === "auto") {
      hooks["chat.params"] = async (_input, _output) => {
        // chat.params only exposes model options, not prompt text.
        // In auto mode the system.transform hook handles injection;
        // this hook is a no-op but kept registered so OpenCode knows
        // the plugin is active.
        if (hookMode === "auto") {
          logger.info(
            "kibi-opencode: chat.params hook active (prompt injection via system.transform)",
          );
        }
      };
    }
  }

  logger.info("kibi-opencode: setup complete");
  if (input.client) {
    const client = input.client;
    const scheduleStartupNotify: StartupNotifyScheduler =
      startupNotifyGlobals.__kibi_test_schedule_startup_notify ??
      ((callback, delayMs) => {
        setTimeout(callback, delayMs);
      });

    scheduleStartupNotify(() => {
      const meta = readKibiPackageVersions();
      if (!maintenanceDegraded) {
        notifyStartup(makeStartupClient(client), {
          suppressToast: cfg.ux.toastStartup === false,
          directory: input.directory,
          ...knownVersions(meta),
          versionMetadataSource: meta.source,
        });
      }

      const autoUpdateRunner = createAutoUpdateRunner({
        getCurrentVersion: () =>
          meta.opencode === "unknown" ? null : meta.opencode,
        getLatestVersion: getLatestPluginVersion,
        invalidatePackage: invalidateKibiOpencodePackage,
        runInstall: runBunInstallForOpenCodePlugin,
        notify: async (message) => {
          if (cfg.ux.toastStartup !== false) {
            await sendToast(makeToastClient(client), {
              variant: "info",
              title: "Kibi OpenCode",
              message,
              duration: 8000,
            });
          }
          logger.info(message);
        },
        log: (message, metadata) => logger.info(message, metadata),
      });
      const runAutoUpdate =
        startupNotifyGlobals.__kibi_test_auto_update_runner ?? autoUpdateRunner;

      void runAutoUpdate({
        directory: input.directory,
        enabled: cfg.autoUpdate,
      }).catch((err: unknown) => {
        logger.info("auto-update: background update check failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, 2000);
  }
  return hooks;
};

export default kibiOpencodePlugin;
