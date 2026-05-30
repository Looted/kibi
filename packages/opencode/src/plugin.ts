import * as path from "node:path";
import {
  type CommentAnalysisResult,
  analyzeCodeFile,
} from "./comment-analysis.js";
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
import {
  type OpenCodeConfigHookInput,
  getInitKibiCommandCapability,
  registerInitKibiCommand,
} from "./init-kibi-capability.js";
import {
  type KbFreshnessScope,
  createKbFreshnessEvidenceStore,
  evaluateKbFreshness,
} from "./kb-freshness-state.js";
import {
  type KibiCheckpointContext,
  KibiCheckpointRunner,
} from "./kibi-checkpoint-runner.js";
import * as logger from "./logger.js";
import { classifyMeaningfulChange } from "./meaningful-change-classifier.js";
import { type PathKind, analyzePath } from "./path-kind.js";
import { runPluginStartup } from "./plugin-startup.js";
import { SENTINEL, buildPrompt } from "./prompt.js";
import { isMustPriorityRequirement } from "./requirement-doc.js";
import { type RiskClass, classifyRisk } from "./risk-classifier.js";
import { type SyncScheduler, createSyncScheduler } from "./scheduler.js";
import {
  type SessionEditEntry,
  type SessionEditState,
  createSessionEditState,
} from "./session-edit-state.js";
import { type WarningCategory, getSessionTracker } from "./session-tracker.js";
import {
  type StartupNotifierClient,
  notifyStartup,
} from "./startup-notifier.js";
import type { ToastCapableClient as SendToastClient } from "./toast.js";
import { readKibiPackageVersions } from "./version-metadata.js";
import {
  type WorkContext,
  resolveWorkContext,
} from "./work-context-resolver.js";

type ToastCapableClient = SendToastClient;

interface RecentEdit {
  path: string;
  kind: PathKind;
  timestamp: number;
}

import * as fs from "node:fs";

function deriveFileBucket(kind: PathKind): string {
  return kind;
}

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
}

export type Plugin = (input: PluginInput) => Hooks | Promise<Hooks>;

type StartupNotifyScheduler = (callback: () => void, delayMs: number) => void;

const startupNotifyGlobals = globalThis as typeof globalThis & {
  __kibi_test_schedule_startup_notify?: StartupNotifyScheduler;
};

/**
 * Lint requirement documents for embedded scenarios/tests and oversized content.
 */
// implements REQ-opencode-kibi-plugin-v1
function lintRequirementDoc(
  filePath: string,
  worktree?: string,
): Array<{ category: WarningCategory; message: string }> {
  const warnings: Array<{ category: WarningCategory; message: string }> = [];

  try {
    const resolvedPath =
      worktree && !filePath.startsWith("/")
        ? `${worktree}/${filePath}`
        : filePath;
    const content = fs.readFileSync(resolvedPath, "utf-8");

    if (/given\s+[\s\S]*?when\s+[\s\S]*?then/i.test(content)) {
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

// implements REQ-opencode-kibi-plugin-v1
const kibiOpencodePlugin: Plugin = async (
  input: PluginInput,
): Promise<Hooks> => {
  const makeToastClient = (
    client: NonNullable<typeof input.client>,
  ): ToastCapableClient => {
    const tui = client.tui as ToastCapableClient["tui"] | undefined;
    if (!tui) return {};
    const mappedTui: NonNullable<ToastCapableClient["tui"]> = {};
    if (typeof tui.toast === "function") {
      mappedTui.toast = tui.toast.bind(tui);
    }
    if (typeof tui.showToast === "function") {
      mappedTui.showToast = tui.showToast.bind(tui);
    }
    if (typeof tui.executeCommand === "function") {
      mappedTui.executeCommand = tui.executeCommand.bind(tui);
    }
    if (typeof tui.clearPrompt === "function") {
      mappedTui.clearPrompt = tui.clearPrompt.bind(tui);
    }
    if (typeof tui.submitPrompt === "function") {
      mappedTui.submitPrompt = tui.submitPrompt.bind(tui);
    }
    return { tui: mappedTui };
  };

  const makeStartupClient = (
    client: NonNullable<typeof input.client>,
  ): StartupNotifierClient => ({
    ...makeToastClient(client),
    app: client.app,
  });

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
  const initKibiCommandCapability = getInitKibiCommandCapability();

  if (initKibiCommandCapability.supported) {
    hooks.config = async (configInput) => {
      registerInitKibiCommand(configInput, initKibiCommandCapability);
    };
  }

  // Plugin instance state (not module globals)
  const MAX_RECENT_EDITS = 5;
  let recentEdits: RecentEdit[] = [];
  let hasRecentKbEdit = false;
  let recentCommentSuggestion: CommentAnalysisResult | null = null;
  const seenFingerprints = new Set<string>(); // For deduplication
  let lastRiskClass: RiskClass | null = null;
  let lastRiskFilePath: string | null = null;
  let lastRiskScopeKey: string | null = null;
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
  const sessionEditStateRegistry = new Map<string, SessionEditState>();
  const fileOperationStateRegistry = new Map<string, FileOperationState>();
  const checkpointRunnerRegistry = new Map<string, KibiCheckpointRunner>();
  const pathKindCacheRegistry = new Map<string, Map<string, PathKind>>();
  const freshnessStore = createKbFreshnessEvidenceStore();

  function resolveScopedWorkContext(filePath?: string): WorkContext {
    return resolveWorkContext({
      inputDirectory: input.directory,
      inputWorktree: input.worktree,
      ...(filePath !== undefined ? { filePath } : {}),
      ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
      ...(input.agentIdentity !== undefined
        ? { agentIdentity: input.agentIdentity }
        : {}),
    });
  }

  function buildStateScopeKey(context: WorkContext, lane: string): string {
    return buildEnforcementScopeKey({
      sessionId: context.sessionId,
      agentIdentity: context.agentIdentity,
      worktreeRoot: context.worktreeRoot,
      branch: context.branch,
      dirtyRelevantFingerprint: lane,
    });
  }

  function getSessionEditState(context: WorkContext): SessionEditState {
    const key = buildStateScopeKey(context, "session-edits");
    let state = sessionEditStateRegistry.get(key);
    if (!state) {
      state = createSessionEditState({ worktree: context.worktreeRoot });
      sessionEditStateRegistry.set(key, state);
    }
    return state;
  }

  function getFileOperationState(context: WorkContext): FileOperationState {
    const key = buildStateScopeKey(context, "file-operations");
    let state = fileOperationStateRegistry.get(key);
    if (!state) {
      state = createFileOperationState({
        worktree: context.worktreeRoot,
      }); // implements REQ-opencode-file-context-guidance-v1
      fileOperationStateRegistry.set(key, state);
    }
    return state;
  }

  function getCheckpointRunnerForContext(
    context: WorkContext,
  ): KibiCheckpointRunner {
    const key = buildStateScopeKey(context, "checkpoint-runner");
    let runner = checkpointRunnerRegistry.get(key);
    if (!runner) {
      runner = new KibiCheckpointRunner({
        config: cfg,
        onRunComplete: (meta) => {
          const normalizedReason = meta.reason.endsWith(".trailing")
            ? meta.reason.slice(0, -".trailing".length)
            : meta.reason;
          const isSmartEnforcementSync =
            normalizedReason.startsWith("smart-enforcement.");
          if (meta.exitCode !== 0 && !isSmartEnforcementSync) {
            latchRuntimeDegraded("scheduler_sync_failed");
          }
          if (meta.checkExitCode !== undefined && meta.checkExitCode !== 0) {
            latchRuntimeDegraded("scheduler_check_failed");
          }
        },
      });
      checkpointRunnerRegistry.set(key, runner);
    }
    return runner;
  }

  function getPathKindCache(context: WorkContext): Map<string, PathKind> {
    const key = buildStateScopeKey(context, "path-kind-cache");
    let scopedCache = pathKindCacheRegistry.get(key);
    if (!scopedCache) {
      scopedCache = new Map<string, PathKind>();
      pathKindCacheRegistry.set(key, scopedCache);
    }
    return scopedCache;
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
        onRunComplete: (meta) => {
          const normalizedReason = meta.reason.endsWith(".trailing")
            ? meta.reason.slice(0, -".trailing".length)
            : meta.reason;
          const isSmartEnforcementSync =
            normalizedReason.startsWith("smart-enforcement.");
          if (meta.exitCode !== 0 && !isSmartEnforcementSync) {
            latchRuntimeDegraded("scheduler_sync_failed");
          }
          if (meta.checkExitCode !== undefined && meta.checkExitCode !== 0) {
            latchRuntimeDegraded("scheduler_check_failed");
          }
        },
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
  const fileOperationState = getFileOperationState(rootWorkContext);
  const scheduler = getSchedulerForContext(rootWorkContext);
  let degradedWarnedOnce = false;
  const pathKindCache = getPathKindCache(rootWorkContext);

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
    return worktree && !path.isAbsolute(filePath)
      ? path.join(worktree, filePath)
      : filePath;
  }

  function buildRiskPathScopeKey(
    context: WorkContext,
    filePath: string,
  ): string {
    return `${buildStateScopeKey(context, "risk")}:${normalizeSessionPath(filePath, context.worktreeRoot)}`;
  }

  function getTransformFocusFilePath(transformInput: unknown): string | null {
    if (!transformInput || typeof transformInput !== "object") {
      return null;
    }
    const inputRecord = transformInput as SystemTransformInput;
    const directPath =
      inputRecord.focusFilePath ??
      inputRecord.filePath ??
      inputRecord.path ??
      inputRecord.file ??
      inputRecord.focusEdit?.path ??
      inputRecord.focusEdit?.filePath;
    if (typeof directPath !== "string" || directPath.length === 0) {
      return null;
    }
    return normalizeSessionPath(directPath);
  }

  function readFileContent(
    filePath: string,
    worktree = input.worktree,
  ): string {
    try {
      return fs.readFileSync(resolveWorktreePath(filePath, worktree), "utf-8");
    } catch {
      return "";
    }
  }

  function updateRecentEditsFromSession(
    sessionEdits: SessionEditEntry[],
    scopedPathKindCache: Map<string, PathKind>,
  ): RecentEdit[] {
    recentEdits = sessionEdits.slice(-MAX_RECENT_EDITS).map((entry) => ({
      path: entry.filePath,
      kind: scopedPathKindCache.get(entry.filePath) ?? "unknown",
      timestamp: entry.lastReconciledAt,
    }));
    return recentEdits;
  }

  function deriveRiskContext(
    context: WorkContext,
    filePath: string,
    scopedPathKindCache: Map<string, PathKind>,
  ): {
    effectiveRiskClass: RiskClass;
    pathAnalysis: ReturnType<typeof analyzePath>;
    hasMustPriority: boolean;
    precomputedSuggestion: CommentAnalysisResult | null;
  } {
    const normalizedFilePath = normalizeSessionPath(
      filePath,
      context.worktreeRoot,
    );
    const pathAnalysis = analyzePath(normalizedFilePath, context.worktreeRoot);
    scopedPathKindCache.set(normalizedFilePath, pathAnalysis.kind);
    const fileContent = readFileContent(
      normalizedFilePath,
      context.worktreeRoot,
    );
    const hasMustPriority =
      pathAnalysis.kind === "requirement"
        ? isMustPriorityRequirement(normalizedFilePath, context.worktreeRoot)
        : false;
    let precomputedSuggestion: CommentAnalysisResult | null = null;
    if (pathAnalysis.kind === "code" && cfg.guidance.commentDetection.enabled) {
      precomputedSuggestion = analyzeCodeFile(
        resolveWorktreePath(normalizedFilePath, context.worktreeRoot),
        {
          minLines: cfg.guidance.commentDetection.minLines,
        },
      );
    }
    const { riskClass } = classifyRisk({
      pathKind: pathAnalysis.kind,
      isUnderKb: pathAnalysis.isUnderKb,
      hasMustPriority,
      hasDurableComment: !!precomputedSuggestion,
      fileContent,
    });
    const effectiveRiskClass: RiskClass =
      riskClass === "safe_docs_only" && precomputedSuggestion
        ? "traceability_candidate"
        : riskClass;
    recentCommentSuggestion =
      pathAnalysis.kind === "code" ? precomputedSuggestion : null;
    lastRiskClass = effectiveRiskClass;
    lastRiskFilePath = normalizedFilePath;
    lastRiskScopeKey = buildRiskPathScopeKey(context, normalizedFilePath);
    return {
      effectiveRiskClass,
      pathAnalysis,
      hasMustPriority,
      precomputedSuggestion,
    };
  }

  hooks.event = async ({ event }) => {
    // Observe KB tool execution events for freshness evidence (best-effort)
    const TOOL_EVENT_TYPES = new Set([
      "tool.execute.after",
      "tool.executed",
      "tool.call.completed",
      "tool.Execute.after",
      "tool.Call.completed",
    ]);
    if (TOOL_EVENT_TYPES.has(event.type)) {
      const props =
        (event as { properties?: Record<string, unknown> }).properties ?? {};
      const toolName = (props.tool ??
        props.toolName ??
        props.name ??
        (props.call as Record<string, unknown> | undefined)?.name ??
        (props.input as Record<string, unknown> | undefined)?.tool) as
        | string
        | undefined;
      if (typeof toolName === "string" && toolName.startsWith("kb_")) {
        const scope: KbFreshnessScope = {
          ...(input.sessionId !== undefined
            ? { sessionId: input.sessionId }
            : {}),
          agentIdentity: input.agentIdentity ?? "unknown",
          worktree: input.worktree,
          branch: rootWorkContext.branch,
          fingerprint: `${input.sessionId ?? ""}-${rootWorkContext.branch}`,
        };
        try {
          freshnessStore.recordToolEvidence(scope, toolName);
          logger.info("kb-freshness.tool-evidence", {
            event: "kb_freshness_tool_evidence",
            tool: toolName,
          });
        } catch {
          // best-effort, never crash the event handler
        }
      }
      return; // tool events don't need file lifecycle processing
    }

    // Accept file.created, file.edited, and file.deleted lifecycle events
    const isFileLifecycle =
      event.type === "file.created" ||
      event.type === "file.edited" ||
      event.type === "file.deleted";
    if (!isFileLifecycle) return;
    const filePath = (event as { type: string; properties: { file: string } })
      .properties.file;
    if (!filePath) return;
    const eventContext = resolveScopedWorkContext(filePath);
    const scopedSessionEditState = getSessionEditState(eventContext);
    const scopedFileOperationState = getFileOperationState(eventContext);
    const scopedPathKindCache = getPathKindCache(eventContext);
    const scopedScheduler = getSchedulerForContext(eventContext);
    const normalizedFilePath = normalizeSessionPath(
      filePath,
      eventContext.worktreeRoot,
    );

    // Record lifecycle event into file-operation-state // implements REQ-opencode-file-context-guidance-v1
    const lifecycle: FileLifecycle =
      event.type === "file.created"
        ? "created"
        : event.type === "file.deleted"
          ? "deleted"
          : "edited";
    scopedFileOperationState.recordLifecycle(filePath, lifecycle, Date.now());
    scopedFileOperationState.normalizePath(filePath);

    const pathAnalysis = analyzePath(
      normalizedFilePath,
      eventContext.worktreeRoot,
    );

    // For file.deleted: derive path kind without reading content, classify for reminder routing only
    if (lifecycle === "deleted") {
      // Preserve last known semantic risk if path was already tracked during session
      const lastKnownKind = scopedPathKindCache.get(normalizedFilePath);
      if (lastKnownKind) {
        // Path was tracked — preserve last known semantic risk for reminder routing
        scopedPathKindCache.set(normalizedFilePath, pathAnalysis.kind);
      } else {
        // Not tracked — classify only for reminder routing.
        scopedPathKindCache.set(normalizedFilePath, pathAnalysis.kind);
      }
      scopedSessionEditState.recordEventHint(
        normalizedFilePath,
        pathAnalysis.kind,
        Date.now(),
      );
      scopedSessionEditState.reconcilePath(normalizedFilePath);
      const sessionEdits = scopedSessionEditState.getSessionEdits();
      updateRecentEditsFromSession(sessionEdits, scopedPathKindCache);
      // Schedule background sync for deleted files that pass shouldHandleFile // implements REQ-opencode-file-context-guidance-v1
      if (
        cfg.sync.enabled &&
        scopedScheduler &&
        fileFilter.shouldHandleFile(
          normalizedFilePath,
          eventContext.worktreeRoot,
        )
      ) {
        scopedScheduler.scheduleSync("file.deleted", normalizedFilePath);
      }

      return;
    }

    scopedSessionEditState.recordEventHint(
      normalizedFilePath,
      pathAnalysis.kind,
      Date.now(),
    );
    scopedSessionEditState.reconcilePath(normalizedFilePath);
    scopedPathKindCache.set(normalizedFilePath, pathAnalysis.kind);
    const sessionEdits = scopedSessionEditState.getSessionEdits();
    const focusEdit = scopedSessionEditState.getFocusEdit();

    // Schedule background sync for file.created/file.edited that pass shouldHandleFile // implements REQ-opencode-file-context-guidance-v1
    if (
      cfg.sync.enabled &&
      scopedScheduler &&
      fileFilter.shouldHandleFile(normalizedFilePath, eventContext.worktreeRoot)
    ) {
      scopedScheduler.scheduleSync(
        lifecycle === "created" ? "file.created" : "file.edited",
        normalizedFilePath,
      );
    }

    const fileContent = readFileContent(
      normalizedFilePath,
      eventContext.worktreeRoot,
    );

    const hasMustPriority =
      pathAnalysis.kind === "requirement"
        ? isMustPriorityRequirement(
            normalizedFilePath,
            eventContext.worktreeRoot,
          )
        : false;

    let precomputedSuggestion: CommentAnalysisResult | null = null;
    if (pathAnalysis.kind === "code" && cfg.guidance.commentDetection.enabled) {
      precomputedSuggestion = analyzeCodeFile(
        resolveWorktreePath(normalizedFilePath, eventContext.worktreeRoot),
        {
          minLines: cfg.guidance.commentDetection.minLines,
        },
      );
    }

    const { riskClass } = classifyRisk({
      pathKind: pathAnalysis.kind,
      isUnderKb: pathAnalysis.isUnderKb,
      hasMustPriority,
      hasDurableComment: !!precomputedSuggestion,
      fileContent,
    });

    const effectiveRiskClass: RiskClass =
      riskClass === "safe_docs_only" && precomputedSuggestion
        ? "traceability_candidate"
        : riskClass;
    lastRiskClass = effectiveRiskClass;
    lastRiskFilePath = normalizedFilePath;
    lastRiskScopeKey = buildRiskPathScopeKey(eventContext, normalizedFilePath);

    logger.info("smart-enforcement.risk", {
      event: "smart_enforcement_risk",
      file: normalizedFilePath,
      path_kind: pathAnalysis.kind,
      risk_class: effectiveRiskClass,
      posture_state: eventContext.posture,
      maintenance_state: getMaintenanceDegraded()
        ? "maintenance_degraded"
        : "maintenance_available",
      under_kb: pathAnalysis.isUnderKb,
      has_must_priority: hasMustPriority,
      posture: eventContext.posture,
      reason_code: effectiveRiskClass,
      effective_mode: getEffectiveMode(),
      static_degraded: posture.maintenanceDegraded,
      runtime_degraded: runtimeOverlay.degraded,
      merged_degraded: getMaintenanceDegraded(),
      overlay_cause: runtimeOverlay.primaryCause ?? null,
    });

    const targetedChecksBlocked =
      getMaintenanceDegraded() ||
      runtimeOverlay.primaryCause === "sync_disabled" ||
      runtimeOverlay.primaryCause === "scheduler_unavailable" ||
      runtimeOverlay.primaryCause === "scheduler_sync_failed" ||
      runtimeOverlay.primaryCause === "scheduler_check_failed";

    if (
      !targetedChecksBlocked &&
      cfg.sync.enabled &&
      scopedScheduler &&
      cfg.guidance.targetedChecks.enabled
    ) {
      const traceabilityRules =
        effectiveRiskClass === "traceability_candidate"
          ? ["symbol-traceability"]
          : null;
      const kbStructuralRules =
        effectiveRiskClass === "kb_doc_structural" &&
        fileFilter.shouldHandleFile(
          normalizedFilePath,
          eventContext.worktreeRoot,
        )
          ? [
              "required-fields",
              "no-dangling-refs",
              ...(pathAnalysis.kind === "fact" ? ["strict-fact-shape"] : []),
              ...(pathAnalysis.kind === "requirement"
                ? ["strict-req-fact-pairing"]
                : []),
            ]
          : null;

      const checkRules = traceabilityRules ?? kbStructuralRules;
      if (checkRules) {
        logger.info("smart-enforcement.targeted-checks", {
          event: "smart_enforcement_targeted_checks",
          file: normalizedFilePath,
          risk_class: effectiveRiskClass,
          posture: eventContext.posture,
          posture_state: eventContext.posture,
          guidance_action: "targeted_checks",
          effective_mode: getEffectiveMode(),
          rules: checkRules,
          static_degraded: posture.maintenanceDegraded,
          runtime_degraded: runtimeOverlay.degraded,
          merged_degraded: getMaintenanceDegraded(),
          overlay_cause: runtimeOverlay.primaryCause ?? null,
        });
        logger.info(`kibi-opencode: scheduling sync for ${normalizedFilePath}`);
        scopedScheduler.scheduleSync(
          effectiveRiskClass === "traceability_candidate"
            ? "smart-enforcement.traceability"
            : "smart-enforcement.kb-doc",
          normalizedFilePath,
          checkRules,
        );
      }
    }

    updateRecentEditsFromSession(sessionEdits, scopedPathKindCache);

    if (
      effectiveRiskClass === "safe_docs_only" ||
      effectiveRiskClass === "safe_test_only"
    ) {
      recentCommentSuggestion = null;
      return;
    }

    const cacheKey = buildScopedCacheKey(
      eventContext,
      effectiveRiskClass,
      deriveFileBucket(pathAnalysis.kind),
      [normalizedFilePath, pathAnalysis.kind, effectiveRiskClass],
    );

    // Always process manual_kb_edit before cache check — this is a critical safety signal
    if (effectiveRiskClass === "manual_kb_edit") {
      hasRecentKbEdit = true;
      if (cfg.guidance.warnOnKbEdits) {
        logger.warn(
          `kibi-opencode: .kb edit detected for ${normalizedFilePath}`,
        );
        getSessionTracker().recordWarning(
          "kb-edit",
          normalizedFilePath,
          `Manual .kb edit: ${normalizedFilePath}`,
        );
      }
      return;
    }

    // Always emit requirement lint warnings before cache check — these are safety signals
    if (effectiveRiskClass === "req_policy_candidate") {
      const lintWarnings = lintRequirementDoc(
        normalizedFilePath,
        eventContext.worktreeRoot,
      );
      for (const warning of lintWarnings) {
        getSessionTracker().recordWarning(
          warning.category,
          normalizedFilePath,
          warning.message,
        );
      }
    }

    // Cache check: after critical signals have been emitted
    if (cache.isSatisfied(cacheKey)) {
      logger.info("smart-enforcement.cache", {
        event: "smart_enforcement_cache",
        cache_hit: true,
        cache_state: "hit",
        file: normalizedFilePath,
        risk_class: effectiveRiskClass,
        posture: eventContext.posture,
        posture_state: eventContext.posture,
      });
      return;
    }

    logger.info("smart-enforcement.cache", {
      event: "smart_enforcement_cache",
      cache_hit: false,
      cache_state: "miss",
      file: normalizedFilePath,
      risk_class: effectiveRiskClass,
      posture: eventContext.posture,
      posture_state: eventContext.posture,
    });

    if (effectiveRiskClass === "req_policy_candidate") {
      if (getMaintenanceDegraded()) {
        const logFn =
          cfg.guidance.smartEnforcement.degradedMode === "warn-once"
            ? logger.warn
            : logger.info;
        logFn("smart-enforcement.degraded", {
          event: "smart_enforcement_degraded",
          file: normalizedFilePath,
          risk_class: effectiveRiskClass,
          posture: eventContext.posture,
          posture_state: eventContext.posture,
          maintenance_state: getMaintenanceDegraded()
            ? "maintenance_degraded"
            : "maintenance_available",
          reason: runtimeOverlay.primaryCause ?? "non_authoritative_posture",
          reason_code:
            runtimeOverlay.primaryCause ?? "non_authoritative_posture",
          static_degraded: posture.maintenanceDegraded,
          runtime_degraded: runtimeOverlay.degraded,
          merged_degraded: getMaintenanceDegraded(),
          overlay_cause: runtimeOverlay.primaryCause ?? null,
          effective_mode: getEffectiveMode(),
        });
      }

      if (
        !getMaintenanceDegraded() &&
        cfg.sync.enabled &&
        scopedScheduler &&
        fileFilter.shouldHandleFile(
          normalizedFilePath,
          eventContext.worktreeRoot,
        )
      ) {
        let checkRules: string[] | undefined;
        if (cfg.guidance.targetedChecks.enabled) {
          if (hasMustPriority && getEffectiveMode() === "strict") {
            checkRules = [
              "required-fields",
              "no-dangling-refs",
              "must-priority-coverage",
              "strict-req-fact-pairing",
            ];
            logger.info(
              `kibi-opencode: must-priority requirement detected, scheduling elevated checks for ${normalizedFilePath}`,
            );
          } else {
            checkRules = [
              "required-fields",
              "no-dangling-refs",
              "strict-req-fact-pairing",
            ];
          }
        }
        logger.info("smart-enforcement.targeted-checks", {
          event: "smart_enforcement_targeted_checks",
          file: normalizedFilePath,
          risk_class: effectiveRiskClass,
          posture: eventContext.posture,
          posture_state: eventContext.posture,
          guidance_action: "targeted_checks",
          effective_mode: getEffectiveMode(),
          rules: checkRules ?? [],
          static_degraded: posture.maintenanceDegraded,
          runtime_degraded: runtimeOverlay.degraded,
          merged_degraded: getMaintenanceDegraded(),
          overlay_cause: runtimeOverlay.primaryCause ?? null,
        });
        scopedScheduler.scheduleSync(
          "file.edited",
          normalizedFilePath,
          checkRules,
        );
      }
      return;
    }

    if (effectiveRiskClass === "kb_doc_structural") {
      if (getMaintenanceDegraded()) {
        const logFn =
          cfg.guidance.smartEnforcement.degradedMode === "warn-once"
            ? logger.warn
            : logger.info;
        logFn("smart-enforcement.degraded", {
          event: "smart_enforcement_degraded",
          file: normalizedFilePath,
          risk_class: effectiveRiskClass,
          posture: eventContext.posture,
          posture_state: eventContext.posture,
          maintenance_state: getMaintenanceDegraded()
            ? "maintenance_degraded"
            : "maintenance_available",
          reason: runtimeOverlay.primaryCause ?? "non_authoritative_posture",
          reason_code:
            runtimeOverlay.primaryCause ?? "non_authoritative_posture",
          static_degraded: posture.maintenanceDegraded,
          runtime_degraded: runtimeOverlay.degraded,
          merged_degraded: getMaintenanceDegraded(),
          overlay_cause: runtimeOverlay.primaryCause ?? null,
          effective_mode: getEffectiveMode(),
        });
      }

      return;
    }

    if (
      effectiveRiskClass === "behavior_candidate" ||
      effectiveRiskClass === "traceability_candidate"
    ) {
      if (
        pathAnalysis.kind === "code" &&
        cfg.guidance.commentDetection.enabled
      ) {
        const suggestion = precomputedSuggestion;

        if (suggestion) {
          recentCommentSuggestion = suggestion;

          const dedupeKey = `${buildRiskPathScopeKey(eventContext, normalizedFilePath)}:${suggestion.suggestionType}:${suggestion.fingerprint}`;
          if (!seenFingerprints.has(dedupeKey)) {
            seenFingerprints.add(dedupeKey);

            const warningCategory: WarningCategory =
              suggestion.suggestionType === "fact"
                ? "long-comment-missed-fact"
                : suggestion.suggestionType === "adr"
                  ? "long-comment-missed-adr"
                  : "missing-traceability";

            logger.warn(
              `kibi-opencode: detected durable ${suggestion.suggestionType} knowledge in ${normalizedFilePath}`,
            );
            getSessionTracker().recordWarning(
              warningCategory,
              normalizedFilePath,
              `Consider routing this ${suggestion.suggestionType} knowledge to Kibi instead of inline comments: ${suggestion.reasoning}`,
            );
          }
        } else {
          recentCommentSuggestion = null;
        }
      } else {
        recentCommentSuggestion = null;
      }
    }

    return;
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
          transformFocusFilePath ?? undefined,
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
        const transformRecentEdits = transformSessionEdits
          .slice(-MAX_RECENT_EDITS)
          .map((e) => ({
            path: e.filePath,
            kind: promptPathKindCache.get(e.filePath) ?? "unknown",
          }));
        const transformPromptFocusEdit = transformFocusEdit
          ? {
              path: transformFocusEdit.filePath,
              kind:
                promptPathKindCache.get(transformFocusEdit.filePath) ??
                "unknown",
            }
          : null;
        const riskContextFilePath =
          transformFocusEdit?.filePath ?? transformFocusFilePath;
        const riskScopeKey = riskContextFilePath
          ? buildRiskPathScopeKey(promptWorkContext, riskContextFilePath)
          : null;
        let effectiveRiskClass: RiskClass | null =
          riskScopeKey !== null && lastRiskScopeKey === riskScopeKey
            ? lastRiskClass
            : null;
        if (
          riskContextFilePath &&
          (lastRiskClass === null || lastRiskScopeKey !== riskScopeKey)
        ) {
          const riskCtx = deriveRiskContext(
            promptWorkContext,
            riskContextFilePath,
            promptPathKindCache,
          );
          effectiveRiskClass = riskCtx.effectiveRiskClass;
          if (!recentCommentSuggestion && riskCtx.precomputedSuggestion) {
            recentCommentSuggestion = riskCtx.precomputedSuggestion;
          }
        }
        if (effectiveRiskClass === null && lastRiskClass !== null) {
          effectiveRiskClass = lastRiskClass;
        }

        const promptFocusFilePath: string | undefined =
          transformFocusEdit?.filePath ?? transformFocusFilePath ?? undefined;

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
                : pendingLifecycle.lifecycle === "created"
                  ? ["kibi_write", "e2e_write"]
                  : ["e2e_write"];
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
              if (reminderResult.policyDecision === "hard_block") {
                const policyResult = reminderResult.policyResult;
                hardGateBlock = {
                  shownPaths:
                    "shownPaths" in policyResult
                      ? policyResult.shownPaths
                      : [normalizedFocusPath],
                  remainingCount:
                    "remainingCount" in policyResult
                      ? policyResult.remainingCount
                      : 0,
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
                          reason:
                            "reason" in result.metadata
                              ? result.metadata.reason
                              : undefined,
                        });
                      })
                      .catch((error) => {
                        logger.errorStructuredOnly(
                          "smart-enforcement.checkpoint-failed",
                          {
                            event: "smart_enforcement_checkpoint_failed",
                            fingerprint: checkpointFingerprint,
                            error:
                              error instanceof Error
                                ? error.message
                                : String(error),
                          },
                        );
                      });
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
          recentEdits: transformRecentEdits,
          focusEdit: transformPromptFocusEdit,
          workspaceHealth,
          hasRecentKbEdit,
          recentCommentSuggestion,
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
          risk_class: lastRiskClass,
          recent_edits: recentEdits.length,
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
            risk_class: lastRiskClass,
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
          const lifecycleEmitted =
            lifecycleReminderText !== null &&
            guidance.includes(lifecycleReminderText);
          const e2eEmitted =
            e2eReminderText !== null && guidance.includes(e2eReminderText);

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
  if (input.client && !maintenanceDegraded) {
    const client = input.client;
    const scheduleStartupNotify: StartupNotifyScheduler =
      startupNotifyGlobals.__kibi_test_schedule_startup_notify ??
      ((callback, delayMs) => {
        setTimeout(callback, delayMs);
      });

    scheduleStartupNotify(() => {
      const meta = readKibiPackageVersions();
      const versions: Record<string, string> = {};
      for (const key of ["opencode", "mcp", "cli", "core"] as const) {
        if (meta[key] !== "unknown") versions[key] = meta[key];
      }
      notifyStartup(makeStartupClient(client), {
        suppressToast: cfg.ux.toastStartup === false,
        directory: input.directory,
        ...(Object.keys(versions).length > 0 ? { versions } : {}),
        versionMetadataSource: meta.source,
      });
    }, 2000);
  }
  return hooks;
};

export default kibiOpencodePlugin;
