import { execSync } from "node:child_process";
import * as path from "node:path";
import {
  type CommentAnalysisResult,
  analyzeCodeFile,
} from "./comment-analysis.js";
import * as config from "./config.js";
import * as fileFilter from "./file-filter.js";
import { type CacheKey, getGuidanceCache } from "./guidance-cache.js";
import * as logger from "./logger.js";
import { type PathKind, analyzePath } from "./path-kind.js";
import { SENTINEL, buildPrompt } from "./prompt.js";
import { detectPosture } from "./repo-posture.js";
import { isMustPriorityRequirement } from "./requirement-doc.js";
import { type RiskClass, classifyRisk } from "./risk-classifier.js";
import { type SchedulerOptions, createSyncScheduler } from "./scheduler.js";
import { type WarningCategory, getSessionTracker } from "./session-tracker.js";
import { checkWorkspaceHealth } from "./workspace-health.js";
import { computeEffectiveMode, type EffectiveMode } from "./smart-enforcement.js";

// implements REQ-opencode-smart-enforcement-v1, REQ-opencode-kibi-plugin-v1

interface RecentEdit {
  path: string;
  kind: PathKind;
  timestamp: number;
}

import * as fs from "node:fs";
import type { RepoPosture } from "./repo-posture.js";

function deriveFileBucket(kind: PathKind): string {
  return kind;
}

function resolveCurrentBranch(cwd: string): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function readConfigFingerprint(cwd: string): string {
  try {
    return fs.readFileSync(path.join(cwd, ".kb", "config.json"), "utf-8");
  } catch {
    return "missing";
  }
}

const workspaceCacheState = new Map<
  string,
  { branch: string; posture: RepoPosture; configFingerprint: string }
>();

export interface PluginInput {
  worktree: string;
  directory: string;
  project?: unknown;
  serverUrl?: unknown;
  $?: unknown;
  client?: {
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
  // Load config
  const cfg = config.loadConfig(input.directory);

  if (!cfg.enabled) {
    logger.info("kibi-opencode: disabled via config");
    return {};
  }

  // Check workspace health for bootstrap nudges

  // Reset the logger client first to avoid leaking a previous invocation's
  // client into this instance, then set the new one if provided.
  logger.resetClient();
  if (input.client) {
    logger.setClient(input.client);
  }

  const workspaceHealth = checkWorkspaceHealth(input.worktree);
  if (workspaceHealth.needsBootstrap) {
    logger.error("kibi-opencode: workspace needs Kibi bootstrap");
    getSessionTracker().recordWarning(
      "bootstrap-needed",
      input.worktree,
      "Workspace missing Kibi bootstrap",
    );
  }

  // Log session summary periodically (gated on config)
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

  // Compute effective smart-enforcement mode from config + posture
  const effectiveMode: EffectiveMode = computeEffectiveMode({
    mode: cfg.guidance.smartEnforcement.mode,
    requireRootKbForStrict: cfg.guidance.smartEnforcement.requireRootKbForStrict,
    posture: posture.state,
    maintenanceDegraded: posture.maintenanceDegraded,
  });

  logger.info("smart-enforcement.posture", {
    event: "smart_enforcement_posture",
    posture: posture.state,
    posture_state: posture.state,
    maintenance_state: posture.maintenanceDegraded
      ? "maintenance_degraded"
      : "maintenance_available",
    needs_bootstrap: workspaceHealth.needsBootstrap,
    posture_reason: posture.reason,
    reason_code: posture.reason,
    smart_enforcement_mode: cfg.guidance.smartEnforcement.mode,
    effective_mode: effectiveMode,
    branch: currentBranch,
  });

  logger.info("kibi-opencode: setting up hooks");

  const hooks: Hooks = {};

  // Plugin instance state (not module globals)
  const MAX_RECENT_EDITS = 5;
  let recentEdits: RecentEdit[] = [];
  let hasRecentKbEdit = false;
  let recentCommentSuggestion: CommentAnalysisResult | null = null;
  const seenFingerprints = new Set<string>(); // For deduplication
  let lastRiskClass: RiskClass | null = null;

  // Create scheduler only if sync is enabled
  let scheduler: ReturnType<typeof createSyncScheduler> | null = null;
  if (cfg.sync.enabled) {
    const schedulerOpts: SchedulerOptions = {
      worktree: input.worktree,
      config: cfg,
    };
    scheduler = createSyncScheduler(schedulerOpts);
  }

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
      maintenance_state: posture.maintenanceDegraded
        ? "maintenance_degraded"
        : "maintenance_available",
      under_kb: pathAnalysis.isUnderKb,
      has_must_priority: hasMustPriority,
      posture: posture.state,
      reason_code: effectiveRiskClass,
      effective_mode: effectiveMode,
    });

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

    if (effectiveRiskClass === "req_policy_candidate") {
      const lintWarnings = lintRequirementDoc(filePath, input.worktree);
      for (const warning of lintWarnings) {
        getSessionTracker().recordWarning(
          warning.category,
          filePath,
          warning.message,
        );
      }

      if (
        posture.state === "vendored_only" ||
        posture.state === "root_uninitialized"
      ) {
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
          maintenance_state: "maintenance_degraded",
          reason: "non_authoritative_posture",
          reason_code: "non_authoritative_posture",
        });
      }

      if (
        cfg.sync.enabled &&
        posture.state !== "vendored_only" &&
        posture.state !== "root_uninitialized" &&
        fileFilter.shouldHandleFile(filePath, input.worktree)
      ) {
        let checkRules: string[] | undefined;
        if (cfg.guidance.targetedChecks.enabled) {
          if (hasMustPriority && effectiveMode === "strict") {
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
          effective_mode: effectiveMode,
          rules: checkRules ?? [],
        });
        logger.info(`kibi-opencode: scheduling sync for ${filePath}`);
        scheduler?.scheduleSync("file.edited", filePath, checkRules);
      }
      return;
    }

    if (effectiveRiskClass === "kb_doc_structural") {
      if (
        posture.state === "vendored_only" ||
        posture.state === "root_uninitialized"
      ) {
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
          maintenance_state: "maintenance_degraded",
          reason: "non_authoritative_posture",
          reason_code: "non_authoritative_posture",
        });
      }

      if (
        cfg.sync.enabled &&
        posture.state !== "vendored_only" &&
        posture.state !== "root_uninitialized" &&
        fileFilter.shouldHandleFile(filePath, input.worktree)
      ) {
        let checkRules: string[] | undefined;
        if (cfg.guidance.targetedChecks.enabled) {
          checkRules = ["required-fields", "no-dangling-refs"];
        }
        logger.info("smart-enforcement.targeted-checks", {
          event: "smart_enforcement_targeted_checks",
          file: filePath,
          risk_class: effectiveRiskClass,
          posture: posture.state,
          posture_state: posture.state,
          guidance_action: "targeted_checks",
          effective_mode: effectiveMode,
          rules: checkRules ?? [],
        });
        logger.info(`kibi-opencode: scheduling sync for ${filePath}`);
        scheduler?.scheduleSync("file.edited", filePath, checkRules);
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

      return;
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
          completionReminder: cfg.guidance.smartEnforcement.completionReminder,
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
        });
        // Emit completion-reminder log only when prompt-visible reminder text is present
        const REMINDER_TEXT = "Run `kb_check` before completing this task.";
        if (cfg.guidance.smartEnforcement.completionReminder && guidance.includes(REMINDER_TEXT)) {
          logger.info("smart-enforcement.completion-reminder", {
            event: "smart_enforcement_completion_reminder",
            risk_class: lastRiskClass,
            posture: posture.state,
            posture_state: posture.state,
            guidance_action: "completion_reminder",
            reminder: "kb_check",
          });
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
  return hooks;
};

export default kibiOpencodePlugin;
