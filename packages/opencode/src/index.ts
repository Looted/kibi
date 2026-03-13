import * as config from "./config";
import * as fileFilter from "./file-filter";
import * as logger from "./logger";
import { SENTINEL, injectPrompt } from "./prompt";
import { type SchedulerOptions, createSyncScheduler } from "./scheduler";

// implements REQ-opencode-kibi-plugin-v1

import type { Hooks, Plugin, PluginInput } from "@opencode-ai/plugin";

export type { Plugin, PluginInput, Hooks };

let scheduler: ReturnType<typeof createSyncScheduler> | null = null;
let cfg: config.KibiConfig | null = null;

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
      const filePath = (event as { type: string; properties: { file: string } }).properties.file;
      if (!filePath) return;
      if (!fileFilter.shouldHandleFile(filePath, input.worktree)) return;

      logger.info(`kibi-opencode: scheduling sync for ${filePath}`);
      scheduler!.scheduleSync("file.edited", filePath);
    };
  }

  // Setup prompt injection hook
  if (cfg.prompt.enabled) {
    const hookMode = cfg.prompt.hookMode;

    if (hookMode === "system-transform" || hookMode === "auto") {
      hooks["experimental.chat.system.transform"] = async (_input, output) => {
        const currentSystem = output.system.join("\n");
        const injected = injectPrompt(currentSystem, cfg!);
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
