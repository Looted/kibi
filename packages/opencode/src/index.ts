import * as path from "node:path";
import {
  type CommentAnalysisResult,
  analyzeCodeFile,
} from "./comment-analysis.js";
import * as fileFilter from "./file-filter.js";
import type { CacheKey } from "./guidance-cache.js";
import * as logger from "./logger.js";
import { type PathKind, analyzePath } from "./path-kind.js";
import { SENTINEL, buildPrompt } from "./prompt.js";
import { isMustPriorityRequirement } from "./requirement-doc.js";
import { type RiskClass, classifyRisk } from "./risk-classifier.js";
import { type WarningCategory, getSessionTracker } from "./session-tracker.js";
import { notifyStartup } from "./startup-notifier.js";
import { runPluginStartup } from "./plugin-startup.js";

// implements REQ-opencode-smart-enforcement-v1, REQ-opencode-kibi-plugin-v1

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
  project?: unknown;
  serverUrl?: unknown;
  $?: unknown;
  client?: {
    tui?: {
      toast?: (payload: {
        variant?: "info" | "success" | "warning" | "error";
        title?: string;
        message: string;
        duration?: number;
      }) => void | Promise<void>;
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

export interface Hooks {
  event?: (input: EventHookInput) => void | Promise<void>;
  "experimental.chat.system.transform"?: (
    input: unknown,
    output: SystemTransformOutput,
  ) => void | Promise<void>;
  "chat.params"?: (input: unknown, output: unknown) => void | Promise<void>;
}

export type Plugin = (input: PluginInput) => Hooks | Promise<Hooks>;

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
  let lastRiskClass: RiskClass | null = null;
  let degradedWarnedOnce = false;

  hooks.event = async ({ event }) => {
    if (event.type !== "file.edited") return;
    const filePath = (event as { type: string; properties: { file: string } })
      .properties.file;
    if (!filePath) return;

    const pathAnalysis = analyzePath(filePath, input.worktree);

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

    const now = Date.now();

    recentEdits.push({
      path: filePath,
      kind: pathAnalysis.kind,
      timestamp: now,
    });

    if (recentEdits.length > MAX_RECENT_EDITS) {
      recentEdits = recentEdits.slice(-MAX_RECENT_EDITS);
    }

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
      return;
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
            ];
            logger.info(
              `kibi-opencode: must-priority requirement detected, scheduling elevated checks for ${filePath}`,
            );
          } else {
            checkRules = ["required-fields", "no-dangling-refs"];
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
    }

    return;
  };

  if (cfg.prompt.enabled) {
    const hookMode = cfg.prompt.hookMode;

    if (hookMode === "system-transform" || hookMode === "auto") {
      hooks["experimental.chat.system.transform"] = async (_input, output) => {
        // Skip if sentinel already present in any existing entry
        if (output.system.some((entry: string) => entry.includes(SENTINEL))) {
          return;
        }

        const maintenanceDegraded = getMaintenanceDegraded();
        const showDegradedAdvisory =
          maintenanceDegraded &&
          cfg.guidance.smartEnforcement.degradedMode === "warn-once" &&
          !degradedWarnedOnce;

        // Build only the guidance block and append it; existing entries are preserved
        const guidance = buildPrompt({
          recentEdits,
          workspaceHealth,
          hasRecentKbEdit,
          recentCommentSuggestion,
          posture: posture.state,
          riskClass: lastRiskClass ?? undefined,
          cache,
          workspaceRoot: input.worktree,
          branch: currentBranch,
          completionReminder: cfg.guidance.smartEnforcement.completionReminder,
          maintenanceDegraded,
          degradedMode: cfg.guidance.smartEnforcement.degradedMode,
          showDegradedAdvisory,
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
    notifyStartup(input.client, {
      suppressToast: cfg.ux.toastStartup === false,
    });
  }
  return hooks;
};

export default kibiOpencodePlugin;
