import { loadConfig, type BriefsConfig } from "../utils/config.js";

export type { BriefsConfig } from "../utils/config.js";

export function loadBriefConfig(cwd: string = process.cwd()): BriefsConfig { // implements REQ-003
  const briefs = loadConfig(cwd).briefs;

  return {
    enabled: briefs?.enabled ?? true,
    channels: {
      vscode: briefs?.channels?.vscode ?? true,
      tui: briefs?.channels?.tui ?? true,
    },
    tui: {
      toast: briefs?.tui?.toast ?? true,
      appendPrompt: briefs?.tui?.appendPrompt ?? true,
    },
  };
}
