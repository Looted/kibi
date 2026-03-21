import {
  type CommentAnalysisResult,
  analyzeCodeFile,
} from "./comment-analysis.js";
import * as config from "./config.js";
import * as fileFilter from "./file-filter.js";
import * as logger from "./logger.js";
import { type PathKind, analyzePath } from "./path-kind.js";
import { injectPrompt } from "./prompt.js";
import { isMustPriorityRequirement } from "./requirement-doc.js";
import { type SchedulerOptions, createSyncScheduler } from "./scheduler.js";
import { type WarningCategory, getSessionTracker } from "./session-tracker.js";
import { checkWorkspaceHealth } from "./workspace-health.js";

// implements REQ-opencode-kibi-plugin-v1

interface RecentEdit {
  path: string;
  kind: PathKind;
  timestamp: number;
}

import * as fs from "node:fs";

export interface PluginInput {
  worktree: string;
  directory: string;
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
  const workspaceHealth = checkWorkspaceHealth(input.worktree);
  if (workspaceHealth.needsBootstrap) {
    logger.warn("kibi-opencode: workspace needs Kibi bootstrap");
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

  logger.info("kibi-opencode: setting up hooks");

  const hooks: Hooks = {};

  // Plugin instance state (not module globals)
  const MAX_RECENT_EDITS = 5;
  let recentEdits: RecentEdit[] = [];
  let hasRecentKbEdit = false;
  let recentCommentSuggestion: CommentAnalysisResult | null = null;
  const seenFingerprints = new Set<string>(); // For deduplication

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

    if (pathAnalysis.isUnderKb && cfg.guidance.warnOnKbEdits) {
      hasRecentKbEdit = true;
      logger.warn(`kibi-opencode: .kb edit detected for ${filePath}`);
      getSessionTracker().recordWarning(
        "kb-edit",
        filePath,
        `Manual .kb edit: ${filePath}`,
      );
    }

    if (pathAnalysis.kind === "requirement") {
      const lintWarnings = lintRequirementDoc(filePath, input.worktree);
      for (const warning of lintWarnings) {
        getSessionTracker().recordWarning(
          warning.category,
          filePath,
          warning.message,
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

    if (pathAnalysis.kind === "code" && cfg.guidance.commentDetection.enabled) {
      const resolvedPath =
        input.worktree && !filePath.startsWith("/")
          ? `${input.worktree}/${filePath}`
          : filePath;

      const suggestion = analyzeCodeFile(resolvedPath, {
        minLines: cfg.guidance.commentDetection.minLines,
      });

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

          logger.info(
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

    if (!cfg.sync.enabled) return;
    if (!fileFilter.shouldHandleFile(filePath, input.worktree)) return;

    let checkRules: string[] | undefined;
    if (cfg.guidance.targetedChecks.enabled) {
      if (pathAnalysis.kind === "requirement") {
        if (isMustPriorityRequirement(filePath, input.worktree)) {
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
      } else if (
        ["scenario", "test", "adr", "fact"].includes(pathAnalysis.kind)
      ) {
        checkRules = ["required-fields", "no-dangling-refs"];
      }
    }

    logger.info(`kibi-opencode: scheduling sync for ${filePath}`);
    scheduler?.scheduleSync("file.edited", filePath, checkRules);
  };

  if (cfg.prompt.enabled) {
    const hookMode = cfg.prompt.hookMode;

    if (hookMode === "system-transform" || hookMode === "auto") {
      hooks["experimental.chat.system.transform"] = async (_input, output) => {
        const currentSystem = output.system.join("\n");
        const injected = injectPrompt(currentSystem, cfg, {
          recentEdits,
          workspaceHealth,
          hasRecentKbEdit,
          recentCommentSuggestion,
        });
        output.system.length = 0;
        output.system.push(injected);
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
