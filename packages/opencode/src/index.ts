import * as config from "./config";
import * as fileFilter from "./file-filter";
import * as logger from "./logger";
import { type PathKind, analyzePath } from "./path-kind";
import { SENTINEL, buildPrompt, injectPrompt } from "./prompt";
import { type SchedulerOptions, createSyncScheduler } from "./scheduler";
import { type WarningCategory, getSessionTracker } from "./session-tracker";
import { checkWorkspaceHealth } from "./workspace-health";

// implements REQ-opencode-kibi-plugin-v1

interface RecentEdit {
  path: string;
  kind: PathKind;
  timestamp: number;
}

import * as fs from "node:fs";
import type { Hooks, Plugin, PluginInput } from "@opencode-ai/plugin";

/**
 * Lint requirement document for anti-patterns.
 */
function lintRequirementDoc(
  filePath: string,
): Array<{ category: WarningCategory; message: string }> {
  const warnings: Array<{ category: WarningCategory; message: string }> = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lower = content.toLowerCase();

    // Check for embedded scenarios (Given/When/Then patterns)
    if (/given\s+.*when\s+.*then/i.test(content)) {
      warnings.push({
        category: "embedded-scenario-in-req",
        message: `Requirement file ${filePath} appears to contain embedded scenario (Given/When/Then). Consider extracting to a separate SCEN entity.`,
      });
    }

    // Check for embedded tests (assert/verify patterns)
    if (/\b(assert|verify|expected\s+to|should\s+return)\b/i.test(content)) {
      warnings.push({
        category: "embedded-test-in-req",
        message: `Requirement file ${filePath} appears to contain embedded test assertions. Consider extracting to a separate TEST entity.`,
      });
    }

    // Check for very long requirement that might need splitting
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

export type { Plugin, PluginInput, Hooks };

let scheduler: ReturnType<typeof createSyncScheduler> | null = null;
let cfg: config.KibiConfig | null = null;

// Track recent edits for contextual guidance
const MAX_RECENT_EDITS = 5;
let recentEdits: RecentEdit[] = [];
let hasRecentKbEdit = false;

// implements REQ-opencode-kibi-plugin-v1
const kibiOpencodePlugin: Plugin = async (
  input: PluginInput,
): Promise<Hooks> => {
  // Load config
  cfg = config.loadConfig(input.directory);

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

  // Log session summary periodically
  const tracker = getSessionTracker();
  if (tracker.isSessionExpired()) {
    tracker.logSummary();
    tracker.reset();
  }

  logger.info("kibi-opencode: setting up hooks");

  const hooks: Hooks = {};

  // Setup file-edit triggered sync via event hook
  if (cfg.sync.enabled) {
    const schedulerOpts: SchedulerOptions = {
      worktree: input.worktree,
      config: cfg,
    };
    scheduler = createSyncScheduler(schedulerOpts);

    hooks.event = async ({ event }) => {
      if (event.type !== "file.edited") return;
      const filePath = (event as { type: string; properties: { file: string } })
        .properties.file;
      if (!filePath) return;

      // Analyze path for tracking and classification
      const pathAnalysis = analyzePath(filePath, input.worktree);

      // Check for .kb edit (loud warning)
      if (pathAnalysis.isUnderKb) {
        hasRecentKbEdit = true;
        logger.warn(`kibi-opencode: .kb edit detected for ${filePath}`);
        getSessionTracker().recordWarning(
          "kb-edit",
          filePath,
          `Manual .kb edit: ${filePath}`,
        );
      }

      // Lint requirement docs for anti-patterns
      if (pathAnalysis.kind === "requirement") {
        const lintWarnings = lintRequirementDoc(filePath);
        for (const warning of lintWarnings) {
          getSessionTracker().recordWarning(
            warning.category,
            filePath,
            warning.message,
          );
        }
      }

      // Track recent edits
      const now = Date.now();
      recentEdits.push({
        path: filePath,
        kind: pathAnalysis.kind,
        timestamp: now,
      });

      // Keep only recent edits
      if (recentEdits.length > MAX_RECENT_EDITS) {
        recentEdits = recentEdits.slice(-MAX_RECENT_EDITS);
      }

      // Only schedule sync for relevant files (not .kb)
      if (!fileFilter.shouldHandleFile(filePath, input.worktree)) return;

      // Determine targeted checks based on edit type
      let checkRules: string[] | undefined;
      if (pathAnalysis.kind === "requirement") {
        checkRules = ["required-fields", "no-dangling-refs"];
      } else if (
        ["scenario", "test", "adr", "fact"].includes(pathAnalysis.kind)
      ) {
        checkRules = ["required-fields", "no-dangling-refs"];
      }

      logger.info(`kibi-opencode: scheduling sync for ${filePath}`);
      scheduler!.scheduleSync("file.edited", filePath, checkRules);
    };
  }

  // Setup prompt injection hook
  if (cfg.prompt.enabled) {
    const hookMode = cfg.prompt.hookMode;

    if (hookMode === "system-transform" || hookMode === "auto") {
      hooks["experimental.chat.system.transform"] = async (_input, output) => {
        const currentSystem = output.system.join("\n");
        const injected = injectPrompt(currentSystem, cfg!, {
          recentEdits,
          workspaceHealth,
          hasRecentKbEdit,
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

export { config, fileFilter, createSyncScheduler, injectPrompt, SENTINEL };
