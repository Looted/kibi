import { loadConfig, type BriefsConfig } from "../utils/config.js";

export type { BriefsConfig } from "../utils/config.js";

export function loadBriefConfig(cwd: string = process.cwd()): BriefsConfig { // implements REQ-003
  const briefs = loadConfig(cwd).briefs;

  return {
    enabled: briefs?.enabled ?? true,
    retention: {
      maxPerBranch: briefs?.retention?.maxPerBranch ?? 200,
      maxAgeDays: briefs?.retention?.maxAgeDays ?? 14,
      keepUnread: briefs?.retention?.keepUnread ?? true,
    },
    channels: {
      vscode: briefs?.channels?.vscode ?? true,
      tui: briefs?.channels?.tui ?? true,
    },
    tui: {
      toast: briefs?.tui?.toast ?? true,
      appendPrompt: briefs?.tui?.appendPrompt ?? true,
      idleDelayMs: briefs?.tui?.idleDelayMs ?? 1500,
    },
  };
}
