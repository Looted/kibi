import { loadConfig, type BriefsConfig } from "../utils/config.js";

export type { BriefsConfig } from "../utils/config.js";

export function loadBriefConfig(cwd: string = process.cwd()): BriefsConfig { // implements REQ-003
  return loadConfig(cwd).briefs as BriefsConfig;
}
