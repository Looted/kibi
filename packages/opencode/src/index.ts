import * as path from "node:path";
import { loadBriefConfig } from "kibi-cli/brief-config";
import { computeBriefIntent } from "./brief-intent.js";
import {
  type BriefingRuntimeResult,
  type BriefingWorkspaceCtx,
  fetchBriefingResult,
} from "./briefing-runtime.js";
import {
  type CommentAnalysisResult,
  analyzeCodeFile,
} from "./comment-analysis.js";
import { getE2eCoverageSignal } from "./e2e-coverage-signals.js"; // implements REQ-opencode-file-context-guidance-v1
import { getFileLinkedEntityIds } from "./file-entity-links.js"; // implements REQ-opencode-file-context-guidance-v1
import * as fileFilter from "./file-filter.js";
import { deriveFileOperationReminder } from "./file-operation-reminders.js"; // implements REQ-opencode-file-context-guidance-v1
import {
  type FileLifecycle,
  createFileOperationState,
} from "./file-operation-state.js"; // implements REQ-opencode-file-context-guidance-v1
import type { ReminderKind } from "./file-operation-state.js";
import type { CacheKey } from "./guidance-cache.js";
import {
  type AuditCursor,
  computeAuditDelta,
  getAuditTailCursor,
  guardBranchChanged,
} from "./idle-brief-audit.js";
import { markBriefRead, selectLatestUnreadBrief } from "./idle-brief-reader.js";
import { generateIdleBrief } from "./idle-brief-runtime.js";
import * as logger from "./logger.js";
import { type PathKind, analyzePath } from "./path-kind.js";
import { runPluginStartup } from "./plugin-startup.js";
import { resolveCurrentBranch } from "./plugin-startup.js";
import { SENTINEL, buildPrompt } from "./prompt.js";
import { reconcileAuditEntries } from "./reconcile-engine.js";
import { isMustPriorityRequirement } from "./requirement-doc.js";
import { type RiskClass, classifyRisk } from "./risk-classifier.js";
import {
  type SessionEditEntry,
  createSessionEditState,
} from "./session-edit-state.js";
import {
  type SessionBaselineState,
  syncSessionBaselineState,
} from "./session-fingerprint.js";
import { type WarningCategory, getSessionTracker } from "./session-tracker.js";
import {
  type StartupNotifierClient,
  notifyStartup,
} from "./startup-notifier.js";
import {
  type ToastCapableClient as SendToastClient,
  sendToast,
} from "./toast.js";
import {
  type ToastCapableClient as BriefToastClient,
  deliverBriefTui,
} from "./tui-brief-delivery.js";

type ToastCapableClient = SendToastClient & BriefToastClient;

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
    const tui = client.tui;
    if (!tui) return {};
    const mappedTui: NonNullable<ToastCapableClient["tui"]> = {};
    if (typeof tui.toast === "function") {
      mappedTui.toast = tui.toast.bind(tui);
    }
    if (typeof tui.showToast === "function") {
      mappedTui.showToast = tui.showToast.bind(tui);
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
    currentBranch,
    cache,
    runtimeOverlay,
    scheduler,
    maintenanceDegraded,
    getMaintenanceDegraded,
    getEffectiveMode,
    latchRuntimeDegraded,
  } = startup;

  const hooks: Hooks = {};

  // Plugin instance state (not module globals)
  const MAX_RECENT_EDITS = 5;
  let recentEdits: RecentEdit[] = [];
  let hasRecentKbEdit = false;
  let recentCommentSuggestion: CommentAnalysisResult | null = null;
  const seenFingerprints = new Set<string>(); // For deduplication
  // NOTE: autoBriefResults is ONLY for prompt-time auto-brief guidance (file.edited flow).
  // Idle-brief runtime (session.idle flow) writes directly to .kb/briefs/ via generateIdleBrief()
  // and MUST NEVER store results in this map or leak into prompt guidance.
  const autoBriefResults = new Map<string, BriefingRuntimeResult>();
  const toastedFingerprints = new Set<string>();
  let lastRiskClass: RiskClass | null = null;
  let lastRiskFilePath: string | null = null;
  const sessionEditState = createSessionEditState({ worktree: input.worktree });
  const fileOperationState = createFileOperationState({
    worktree: input.worktree,
  }); // implements REQ-opencode-file-context-guidance-v1
  let degradedWarnedOnce = false;
  const pathKindCache = new Map<string, PathKind>();

  // Idle-brief state — dedupe via semantic contentHash (persisted envelope is the delivery authority)
  let idleBriefInFlight = false;
  let idleBriefTrailingRerun = false;
  const idleBriefDeliveredHashes = new Set<string>();
  const replayedBriefContentHashes = new Set<string>();
  // Session-local baseline cursor: captured once per session/worktree/branch from the audit-log tail,
  // so the first idle brief in a fresh session only reports post-baseline changes.
  let sessionBaselineCursor: AuditCursor | null = null;
  let sessionBaselineFingerprint: string | null = null;

  function syncSessionBaseline(branch: string): void {
    const nextState = syncSessionBaselineState<AuditCursor>(
      {
        fingerprint: sessionBaselineFingerprint,
        cursor: sessionBaselineCursor,
      } satisfies SessionBaselineState<AuditCursor>,
      {
        sessionId: input.sessionId,
        branch,
        worktree: input.worktree,
      },
      () => getAuditTailCursor(input.worktree, branch),
    );

    sessionBaselineFingerprint = nextState.fingerprint;
    sessionBaselineCursor = nextState.cursor;
  }

  syncSessionBaseline(currentBranch);

  function normalizeSessionPath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      const relativePath = path.relative(input.worktree, filePath);
      return relativePath.startsWith("..") ? filePath : relativePath;
    }
    return filePath;
  }

  function resolveWorktreePath(filePath: string): string {
    return input.worktree && !path.isAbsolute(filePath)
      ? path.join(input.worktree, filePath)
      : filePath;
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

  function readFileContent(filePath: string): string {
    try {
      return fs.readFileSync(resolveWorktreePath(filePath), "utf-8");
    } catch {
      return "";
    }
  }

  function updateRecentEditsFromSession(
    sessionEdits: SessionEditEntry[],
  ): RecentEdit[] {
    recentEdits = sessionEdits.slice(-MAX_RECENT_EDITS).map((entry) => ({
      path: entry.filePath,
      kind: pathKindCache.get(entry.filePath) ?? "unknown",
      timestamp: entry.lastReconciledAt,
    }));
    return recentEdits;
  }

  function deriveRiskContext(filePath: string): {
    effectiveRiskClass: RiskClass;
    pathAnalysis: ReturnType<typeof analyzePath>;
    hasMustPriority: boolean;
    precomputedSuggestion: CommentAnalysisResult | null;
  } {
    const normalizedFilePath = normalizeSessionPath(filePath);
    const pathAnalysis = analyzePath(normalizedFilePath, input.worktree);
    pathKindCache.set(normalizedFilePath, pathAnalysis.kind);
    const fileContent = readFileContent(normalizedFilePath);
    const hasMustPriority =
      pathAnalysis.kind === "requirement"
        ? isMustPriorityRequirement(normalizedFilePath, input.worktree)
        : false;
    let precomputedSuggestion: CommentAnalysisResult | null = null;
    if (pathAnalysis.kind === "code" && cfg.guidance.commentDetection.enabled) {
      precomputedSuggestion = analyzeCodeFile(
        resolveWorktreePath(normalizedFilePath),
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
    return {
      effectiveRiskClass,
      pathAnalysis,
      hasMustPriority,
      precomputedSuggestion,
    };
  }

  function buildBriefingWorkspaceContext(): BriefingWorkspaceCtx {
    return {
      workspaceRoot: input.worktree,
      branch: currentBranch,
      directory: input.directory,
      ...(input.workspace !== undefined ? { workspace: input.workspace } : {}),
    };
  }

  function buildWorkspaceContextForBranch(
    branch: string,
  ): BriefingWorkspaceCtx {
    return {
      ...buildBriefingWorkspaceContext(),
      branch,
    };
  }

  function queueBriefingFetch(
    intentResult: ReturnType<typeof computeBriefIntent>,
    options: { skipIfCachedResultExists?: boolean } = {},
  ): void {
    if (
      !intentResult.eligible ||
      !input.client ||
      getMaintenanceDegraded() ||
      (posture.state !== "root_active" &&
        posture.state !== "hybrid_root_plus_vendored")
    ) {
      return;
    }
    if (
      options.skipIfCachedResultExists === true &&
      autoBriefResults.has(intentResult.fingerprint)
    ) {
      return;
    }
    const client = input.client;
    const fingerprint = intentResult.fingerprint;
    const workspaceCtx = buildBriefingWorkspaceContext();
    void fetchBriefingResult(client, workspaceCtx, intentResult).then(
      (result) => {
        autoBriefResults.set(fingerprint, result);
        if (!toastedFingerprints.has(fingerprint)) {
          toastedFingerprints.add(fingerprint);
          void sendToast(makeToastClient(client), {
            message: result.toastMessage,
          });
        }
      },
    );
  }

  hooks.event = async ({ event }) => {
    const activeBranch = resolveCurrentBranch(input.worktree);
    syncSessionBaseline(activeBranch);

    // Handle session.idle for idle-brief generation
    if (event.type === "session.idle") {
      if (!input.client || getMaintenanceDegraded()) return;

      const idleBranch = activeBranch;
      const idleWorkspaceRoot = input.worktree;

      // Single-flight guard
      if (idleBriefInFlight) {
        idleBriefTrailingRerun = true;
        return;
      }

      idleBriefInFlight = true;
      idleBriefTrailingRerun = false;

      const runIdleBrief = async () => {
        try {
          // Gather session edits
          const sessionEdits = sessionEditState.getSessionEdits();
          const sourceFiles = sessionEdits.map((e) => e.filePath);

          if (sourceFiles.length === 0) return;

          const auditDelta = computeAuditDelta(
            idleWorkspaceRoot,
            idleBranch,
            sessionBaselineCursor,
          );

          if (!auditDelta.hasChanges) return;

          // Branch switch guard
          const currentBranchNow = resolveCurrentBranch(input.worktree);
          if (guardBranchChanged(idleBranch, currentBranchNow)) {
            logger.info("idle-brief.branch-changed", {
              event: "idle_brief_branch_changed",
              idleBranch,
              currentBranch: currentBranchNow,
            });
            return;
          }

          // Generate brief
          const workspaceCtx = buildWorkspaceContextForBranch(idleBranch);
          const client = input.client;
          if (!client) return;
          const reconciled = reconcileAuditEntries(auditDelta.entries);
          const changedEntityIds = [
            ...reconciled.added.map((e) => e.id),
            ...reconciled.modified.map((e) => e.id),
            ...reconciled.removed.map((e) => e.id),
          ];
          const result = await generateIdleBrief(
            input.client,
            workspaceCtx,
            auditDelta,
            input.sessionId ?? "unknown",
            { sourceFiles, changedEntityIds },
          );

          if (result.success && result.envelope) {
            const envelope = result.envelope;
            // Dedupe by semantic contentHash — persisted envelope is the delivery authority
            const dedupeKey = `${idleWorkspaceRoot}:${idleBranch}:tui:${envelope.contentHash}`;
            if (!idleBriefDeliveredHashes.has(dedupeKey)) {
              idleBriefDeliveredHashes.add(dedupeKey);
              const sharedPolicy = { briefs: loadBriefConfig(input.worktree) };
              const localConfig = {
                autoSubmit: cfg.ux?.briefs?.autoSubmit ?? true,
              };
              if (client) {
                try {
                  const deliveryResult = await deliverBriefTui(
                    makeToastClient(client),
                    envelope,
                    sharedPolicy,
                    localConfig,
                  );
                  if (deliveryResult.delivered && result.briefPath) {
                    markBriefRead(idleWorkspaceRoot, result.briefPath);
                  }
                } catch (err) {
                  logger.error("idle-brief.delivery-failed", {
                    event: "idle_brief_delivery_failed",
                    error: err instanceof Error ? err.message : String(err),
                  });
                }
              }
            }
          } else {
            logger.info("idle-brief.no-brief-generated", {
              event: "idle_brief_no_brief_generated",
              success: result.success,
              hasEnvelope: !!result.envelope,
            });
          }
        } catch (error) {
          logger.error("idle-brief.error", {
            event: "idle_brief_error",
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          idleBriefInFlight = false;
          // If trailing rerun was requested, run again
          if (idleBriefTrailingRerun) {
            idleBriefTrailingRerun = false;
            void runIdleBrief();
          }
        }
      };

      // Fire-and-forget: do NOT await
      void runIdleBrief();
      return;
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

    // Record lifecycle event into file-operation-state // implements REQ-opencode-file-context-guidance-v1
    const lifecycle: FileLifecycle =
      event.type === "file.created"
        ? "created"
        : event.type === "file.deleted"
          ? "deleted"
          : "edited";
    fileOperationState.recordLifecycle(filePath, lifecycle, Date.now());
    fileOperationState.normalizePath(filePath);

    const pathAnalysis = analyzePath(filePath, input.worktree);

    // For file.deleted: derive path kind without reading content, classify for reminder routing only
    if (lifecycle === "deleted") {
      // Preserve last known semantic risk if path was already tracked during session
      const lastKnownKind = pathKindCache.get(filePath);
      if (lastKnownKind) {
        // Path was tracked — preserve last known semantic risk for reminder routing
        pathKindCache.set(filePath, pathAnalysis.kind);
      } else {
        // Not tracked — classify only for reminder routing, not auto-briefing
        pathKindCache.set(filePath, pathAnalysis.kind);
      }
      sessionEditState.recordEventHint(filePath, pathAnalysis.kind, Date.now());
      sessionEditState.reconcilePath(filePath);
      const sessionEdits = sessionEditState.getSessionEdits();
      recentEdits = sessionEdits.slice(-MAX_RECENT_EDITS).map((e) => ({
        path: e.filePath,
        kind: pathKindCache.get(e.filePath) ?? "unknown",
        timestamp: e.lastReconciledAt,
      }));
      // Schedule background sync for deleted files that pass shouldHandleFile // implements REQ-opencode-file-context-guidance-v1
      if (
        cfg.sync.enabled &&
        scheduler &&
        fileFilter.shouldHandleFile(filePath, input.worktree)
      ) {
        scheduler.scheduleSync("file.deleted", filePath);
      }

      return;
    }

    sessionEditState.recordEventHint(filePath, pathAnalysis.kind, Date.now());
    sessionEditState.reconcilePath(filePath);
    pathKindCache.set(filePath, pathAnalysis.kind);
    const sessionEdits = sessionEditState.getSessionEdits();
    const focusEdit = sessionEditState.getFocusEdit();

    // Schedule background sync for file.created/file.edited that pass shouldHandleFile // implements REQ-opencode-file-context-guidance-v1
    if (
      cfg.sync.enabled &&
      scheduler &&
      fileFilter.shouldHandleFile(filePath, input.worktree)
    ) {
      scheduler.scheduleSync(
        lifecycle === "created" ? "file.created" : "file.edited",
        filePath,
      );
    }

    let fileContent = "";
    try {
      const resolvedPath =
        input.worktree && !path.isAbsolute(filePath)
          ? path.join(input.worktree, filePath)
          : filePath;
      fileContent = fs.readFileSync(resolvedPath, "utf-8");
    } catch {}

    const hasMustPriority =
      pathAnalysis.kind === "requirement"
        ? isMustPriorityRequirement(filePath, input.worktree)
        : false;

    let precomputedSuggestion: CommentAnalysisResult | null = null;
    if (pathAnalysis.kind === "code" && cfg.guidance.commentDetection.enabled) {
      const resolvedPath =
        input.worktree && !path.isAbsolute(filePath)
          ? path.join(input.worktree, filePath)
          : filePath;

      precomputedSuggestion = analyzeCodeFile(resolvedPath, {
        minLines: cfg.guidance.commentDetection.minLines,
      });
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
    const isAutoBriefRisk =
      effectiveRiskClass === "behavior_candidate" ||
      effectiveRiskClass === "traceability_candidate";
    lastRiskClass = effectiveRiskClass;

    logger.info("smart-enforcement.risk", {
      event: "smart_enforcement_risk",
      file: filePath,
      path_kind: pathAnalysis.kind,
      risk_class: effectiveRiskClass,
      posture_state: posture.state,
      maintenance_state: getMaintenanceDegraded()
        ? "maintenance_degraded"
        : "maintenance_available",
      under_kb: pathAnalysis.isUnderKb,
      has_must_priority: hasMustPriority,
      posture: posture.state,
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
      scheduler &&
      cfg.guidance.targetedChecks.enabled
    ) {
      const traceabilityRules =
        effectiveRiskClass === "traceability_candidate"
          ? ["symbol-traceability"]
          : null;
      const kbStructuralRules =
        effectiveRiskClass === "kb_doc_structural" &&
        fileFilter.shouldHandleFile(filePath, input.worktree)
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
          file: filePath,
          risk_class: effectiveRiskClass,
          posture: posture.state,
          posture_state: posture.state,
          guidance_action: "targeted_checks",
          effective_mode: getEffectiveMode(),
          rules: checkRules,
          static_degraded: posture.maintenanceDegraded,
          runtime_degraded: runtimeOverlay.degraded,
          merged_degraded: getMaintenanceDegraded(),
          overlay_cause: runtimeOverlay.primaryCause ?? null,
        });
        logger.info(`kibi-opencode: scheduling sync for ${filePath}`);
        scheduler.scheduleSync(
          effectiveRiskClass === "traceability_candidate"
            ? "smart-enforcement.traceability"
            : "smart-enforcement.kb-doc",
          filePath,
          checkRules,
        );
      }
    }

    recentEdits = sessionEdits.slice(-MAX_RECENT_EDITS).map((e) => ({
      path: e.filePath,
      kind: pathKindCache.get(e.filePath) ?? "unknown",
      timestamp: e.lastReconciledAt,
    }));

    if (
      effectiveRiskClass === "safe_docs_only" ||
      effectiveRiskClass === "safe_test_only"
    ) {
      recentCommentSuggestion = null;
      return;
    }

    const cacheKey: CacheKey = {
      workspaceRoot: input.worktree,
      branch: currentBranch,
      posture: posture.state,
      riskClass: effectiveRiskClass,
      fileBucket: deriveFileBucket(pathAnalysis.kind),
    };

    // Always process manual_kb_edit before cache check — this is a critical safety signal
    if (effectiveRiskClass === "manual_kb_edit") {
      hasRecentKbEdit = true;
      if (cfg.guidance.warnOnKbEdits) {
        logger.warn(`kibi-opencode: .kb edit detected for ${filePath}`);
        getSessionTracker().recordWarning(
          "kb-edit",
          filePath,
          `Manual .kb edit: ${filePath}`,
        );
      }
      return;
    }

    // Always emit requirement lint warnings before cache check — these are safety signals
    if (effectiveRiskClass === "req_policy_candidate") {
      const lintWarnings = lintRequirementDoc(filePath, input.worktree);
      for (const warning of lintWarnings) {
        getSessionTracker().recordWarning(
          warning.category,
          filePath,
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
        file: filePath,
        risk_class: effectiveRiskClass,
        posture: posture.state,
        posture_state: posture.state,
      });
      if (!isAutoBriefRisk) {
        return;
      }
    }

    logger.info("smart-enforcement.cache", {
      event: "smart_enforcement_cache",
      cache_hit: false,
      cache_state: "miss",
      file: filePath,
      risk_class: effectiveRiskClass,
      posture: posture.state,
      posture_state: posture.state,
    });

    if (effectiveRiskClass === "req_policy_candidate") {
      if (getMaintenanceDegraded()) {
        const logFn =
          cfg.guidance.smartEnforcement.degradedMode === "warn-once"
            ? logger.warn
            : logger.info;
        logFn("smart-enforcement.degraded", {
          event: "smart_enforcement_degraded",
          file: filePath,
          risk_class: effectiveRiskClass,
          posture: posture.state,
          posture_state: posture.state,
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
        scheduler &&
        fileFilter.shouldHandleFile(filePath, input.worktree)
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
              `kibi-opencode: must-priority requirement detected, scheduling elevated checks for ${filePath}`,
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
          file: filePath,
          risk_class: effectiveRiskClass,
          posture: posture.state,
          posture_state: posture.state,
          guidance_action: "targeted_checks",
          effective_mode: getEffectiveMode(),
          rules: checkRules ?? [],
          static_degraded: posture.maintenanceDegraded,
          runtime_degraded: runtimeOverlay.degraded,
          merged_degraded: getMaintenanceDegraded(),
          overlay_cause: runtimeOverlay.primaryCause ?? null,
        });
        scheduler?.scheduleSync("file.edited", filePath, checkRules);
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
          file: filePath,
          risk_class: effectiveRiskClass,
          posture: posture.state,
          posture_state: posture.state,
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

    if (isAutoBriefRisk) {
      if (
        pathAnalysis.kind === "code" &&
        cfg.guidance.commentDetection.enabled
      ) {
        const suggestion = precomputedSuggestion;

        if (suggestion) {
          recentCommentSuggestion = suggestion;

          const dedupeKey = `${filePath}:${suggestion.suggestionType}:${suggestion.fingerprint}`;
          if (!seenFingerprints.has(dedupeKey)) {
            seenFingerprints.add(dedupeKey);

            const warningCategory: WarningCategory =
              suggestion.suggestionType === "fact"
                ? "long-comment-missed-fact"
                : suggestion.suggestionType === "adr"
                  ? "long-comment-missed-adr"
                  : "missing-traceability";

            logger.warn(
              `kibi-opencode: detected durable ${suggestion.suggestionType} knowledge in ${filePath}`,
            );
            getSessionTracker().recordWarning(
              warningCategory,
              filePath,
              `Consider routing this ${suggestion.suggestionType} knowledge to Kibi instead of inline comments: ${suggestion.reasoning}`,
            );
          }
        } else {
          recentCommentSuggestion = null;
        }
      } else {
        recentCommentSuggestion = null;
      }

      if (!focusEdit) {
        // No surviving edits (all reverted to baseline) — skip auto-brief fetch
        return;
      }

      const sessionSourceFiles = sessionEdits.map((e) => e.filePath);

      const intentResult = computeBriefIntent({
        riskClass: effectiveRiskClass,
        posture: posture.state,
        maintenanceDegraded: getMaintenanceDegraded(),
        sourceFiles: sessionSourceFiles,
        focusFilePath: focusEdit.filePath,
        worktreeRoot: input.worktree,
        branch: currentBranch,
      });

      queueBriefingFetch(intentResult);
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
        sessionEditState.reconcileKnownPaths();
        if (transformFocusFilePath) {
          sessionEditState.forceEdit(transformFocusFilePath);
        }

        const transformSessionEdits = sessionEditState.getSessionEdits();
        const transformFocusEdit = sessionEditState.getFocusEdit();
        const transformRecentEdits = transformSessionEdits
          .slice(-MAX_RECENT_EDITS)
          .map((e) => ({
            path: e.filePath,
            kind: pathKindCache.get(e.filePath) ?? "unknown",
          }));
        const transformPromptFocusEdit = transformFocusEdit
          ? {
              path: transformFocusEdit.filePath,
              kind: pathKindCache.get(transformFocusEdit.filePath) ?? "unknown",
            }
          : null;
        const riskContextFilePath =
          transformFocusEdit?.filePath ?? transformFocusFilePath;
        let effectiveRiskClass: RiskClass | null =
          riskContextFilePath && lastRiskFilePath === riskContextFilePath
            ? lastRiskClass
            : null;
        if (
          riskContextFilePath &&
          (lastRiskClass === null || lastRiskFilePath !== riskContextFilePath)
        ) {
          const riskCtx = deriveRiskContext(riskContextFilePath);
          effectiveRiskClass = riskCtx.effectiveRiskClass;
          if (!recentCommentSuggestion && riskCtx.precomputedSuggestion) {
            recentCommentSuggestion = riskCtx.precomputedSuggestion;
          }
        }
        if (effectiveRiskClass === null && lastRiskClass !== null) {
          effectiveRiskClass = lastRiskClass;
        }

        const promptSourceFiles = transformSessionEdits.map(
          (entry) => entry.filePath,
        );
        const promptFocusFilePath: string | undefined =
          transformFocusEdit?.filePath ?? transformFocusFilePath ?? undefined;
        const intentResult = effectiveRiskClass
          ? computeBriefIntent({
              riskClass: effectiveRiskClass,
              posture: posture.state,
              maintenanceDegraded,
              sourceFiles: promptSourceFiles,
              worktreeRoot: input.worktree,
              branch: currentBranch,
              ...(promptFocusFilePath !== undefined
                ? {
                    focusFilePath: promptFocusFilePath,
                  }
                : {}),
            })
          : null;
        const autoBriefResult = intentResult
          ? autoBriefResults.get(intentResult.fingerprint)
          : undefined;
        const isAutoBriefRisk =
          effectiveRiskClass === "behavior_candidate" ||
          effectiveRiskClass === "traceability_candidate";
        if (!autoBriefResult && isAutoBriefRisk && intentResult) {
          queueBriefingFetch(intentResult, { skipIfCachedResultExists: true });
        }

        // Replay latest unread idle brief if available // implements REQ-opencode-kibi-briefing-v4
        if (input.worktree && currentBranch && input.client) {
          const unreadBrief = selectLatestUnreadBrief(
            input.worktree,
            currentBranch,
          );
          if (
            unreadBrief &&
            !replayedBriefContentHashes.has(unreadBrief.envelope.contentHash)
          ) {
            const sharedPolicy = { briefs: loadBriefConfig(input.worktree) };
            const localConfig = {
              autoSubmit: cfg.ux?.briefs?.autoSubmit ?? true,
            };
            const client = input.client;
            try {
              const deliveryResult = await deliverBriefTui(
                makeToastClient(client),
                unreadBrief.envelope,
                sharedPolicy,
                localConfig,
              );
              if (deliveryResult.delivered) {
                markBriefRead(input.worktree, unreadBrief.filePath);
                replayedBriefContentHashes.add(
                  unreadBrief.envelope.contentHash,
                );
              }
            } catch (err) {
              logger.error("idle-brief.replay-failed", {
                event: "idle_brief_replay_failed",
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }

        // Steps 3-4: File-operation reminder selection with suppression // implements REQ-opencode-file-context-guidance-v1
        let fileOperationReminder:
          | {
              path: string;
              lifecycleReminder: string | null;
              e2eReminder: string | null;
            }
          | undefined;
        const focusPathForReminder =
          transformFocusFilePath ?? promptFocusFilePath;
        if (focusPathForReminder) {
          const normalizedFocusPath =
            fileOperationState.normalizePath(focusPathForReminder);
          const pendingLifecycle =
            fileOperationState.peekPending(normalizedFocusPath);
          if (pendingLifecycle) {
            // Check if any reminder kind for this lifecycle has not yet been shown
            const reminderKindsForLifecycle: ReminderKind[] =
              pendingLifecycle.lifecycle === "deleted"
                ? ["kibi_delete", "e2e_delete"]
                : pendingLifecycle.lifecycle === "created"
                  ? ["kibi_write", "e2e_write"]
                  : ["e2e_write"];
            const hasUnshownReminder = reminderKindsForLifecycle.some(
              (kind) => !fileOperationState.hasShown(normalizedFocusPath, kind),
            );
            if (hasUnshownReminder) {
              // Resolve linked entities and e2e signal
              const linkedEntityResult = getFileLinkedEntityIds(
                input.worktree,
                focusPathForReminder,
              );
              const e2eSignal = getE2eCoverageSignal(
                input.worktree,
                focusPathForReminder,
              );
              const focusPathKind =
                pathKindCache.get(normalizedFocusPath) ?? "unknown";
              const reminderResult = deriveFileOperationReminder({
                normalizedPath: normalizedFocusPath,
                lifecycle: pendingLifecycle.lifecycle,
                pathKind: focusPathKind as import("./path-kind.js").PathKind,
                linkedEntityResult,
                e2eSignal,
                currentSemanticRisk: effectiveRiskClass ?? "safe_docs_only",
                posture: posture.state,
              });
              fileOperationReminder = {
                path: normalizedFocusPath,
                lifecycleReminder: reminderResult.lifecycleReminder,
                e2eReminder: reminderResult.e2eReminder,
              };
            }
          }
        }

        const guidance = buildPrompt({
          recentEdits: transformRecentEdits,
          focusEdit: transformPromptFocusEdit,
          workspaceHealth,
          hasRecentKbEdit,
          recentCommentSuggestion,
          posture: posture.state,
          cache,
          workspaceRoot: input.worktree,
          branch: currentBranch,
          completionReminder: cfg.guidance.smartEnforcement.completionReminder,
          maintenanceDegraded,
          degradedMode: cfg.guidance.smartEnforcement.degradedMode,
          showDegradedAdvisory,
          ...(autoBriefResult !== undefined ? { autoBriefResult } : {}),
          ...(effectiveRiskClass != null
            ? { riskClass: effectiveRiskClass }
            : {}),
          ...(fileOperationReminder !== undefined
            ? { fileOperationReminder }
            : {}),
        });

        logger.info("smart-enforcement.guidance", {
          event: "smart_enforcement_guidance",
          emitted: guidance.trim() !== "" && guidance.trim() !== SENTINEL,
          posture: posture.state,
          posture_state: posture.state,
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
        const REMINDER_TEXT = "Run `kb_check` before completing this task.";
        if (
          cfg.guidance.smartEnforcement.completionReminder &&
          !maintenanceDegraded &&
          guidance.includes(REMINDER_TEXT)
        ) {
          logger.info("smart-enforcement.completion-reminder", {
            event: "smart_enforcement_completion_reminder",
            risk_class: lastRiskClass,
            posture: posture.state,
            posture_state: posture.state,
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
              fileOperationState.peekPending(focusPathForConsume)?.lifecycle ===
              "deleted"
                ? "kibi_delete"
                : "kibi_write";
            fileOperationState.markShown(focusPathForConsume, kind);
            logger.info("smart-enforcement.file-operation-reminder", {
              event: "smart_enforcement_file_operation_reminder",
              file: focusPathForConsume,
              lifecycle:
                fileOperationState.peekPending(focusPathForConsume)
                  ?.lifecycle ?? null,
              posture_state: posture.state,
              risk_class: effectiveRiskClass,
            });
          }

          if (e2eEmitted) {
            const kind: import("./file-operation-state.js").ReminderKind =
              fileOperationState.peekPending(focusPathForConsume)?.lifecycle ===
              "deleted"
                ? "e2e_delete"
                : "e2e_write";
            fileOperationState.markShown(focusPathForConsume, kind);
            const e2eSignalForLog = getE2eCoverageSignal(
              input.worktree,
              focusPathForConsume,
            );
            logger.info("smart-enforcement.e2e-reminder", {
              event: "smart_enforcement_e2e_reminder",
              file: focusPathForConsume,
              lifecycle:
                fileOperationState.peekPending(focusPathForConsume)
                  ?.lifecycle ?? null,
              signal_level: e2eSignalForLog.level,
              posture_state: posture.state,
              risk_class: effectiveRiskClass,
            });
          }

          // Consume pending only if at least one reminder was emitted
          if (lifecycleEmitted || e2eEmitted) {
            fileOperationState.consumePending(focusPathForConsume);
          }
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
      notifyStartup(makeStartupClient(client), {
        suppressToast: cfg.ux.toastStartup === false,
        directory: input.directory,
      });
    }, 2000);
  }
  return hooks;
};

export default kibiOpencodePlugin;
