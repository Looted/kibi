import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as logger from "./logger";

// implements REQ-opencode-kibi-plugin-v1
export interface KibiConfig {
  enabled: boolean;
  prompt: {
    enabled: boolean;
    hookMode: "auto" | "chat-params" | "system-transform" | "compat";
  };
  sync: {
    enabled: boolean;
    debounceMs: number;
    ignore: string[];
    relevant: string[];
  };
  ux: {
    toastFailures: boolean;
    toastSuccesses: boolean;
    toastCooldownMs: number;
  };
  logLevel: string;
}

const DEFAULTS: KibiConfig = {
  enabled: true,
  prompt: { enabled: true, hookMode: "auto" },
  sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
  ux: { toastFailures: true, toastSuccesses: false, toastCooldownMs: 10000 },
  logLevel: "info",
};

function readJsonIfExists(filePath: string): unknown | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "message" in err
        ? (err as any).message
        : String(err);
    logger.warn(`Failed to read/parse config ${filePath}: ${msg}`);
    return null;
  }
}

function validateAndMerge(obj: unknown): KibiConfig {
  if (!obj || typeof obj !== "object") {
    logger.warn("Config is not an object, using defaults");
    return DEFAULTS;
  }

  const src = obj as Record<string, unknown>;
  const out: KibiConfig = { ...DEFAULTS };

  if (typeof src.enabled === "boolean") out.enabled = src.enabled;

  if (src.prompt && typeof src.prompt === "object") {
    const p = src.prompt as Record<string, unknown>;
    out.prompt = { ...DEFAULTS.prompt };
    if (typeof p.enabled === "boolean") out.prompt.enabled = p.enabled;
    if (typeof p.hookMode === "string") {
      const modes = ["auto", "chat-params", "system-transform", "compat"];
      if (modes.includes(p.hookMode))
        out.prompt.hookMode = p.hookMode as
          | "auto"
          | "chat-params"
          | "system-transform"
          | "compat";
      else
        logger.warn(`Invalid prompt.hookMode '${p.hookMode}', using default`);
    }
  }

  if (src.sync && typeof src.sync === "object") {
    const s = src.sync as Record<string, unknown>;
    out.sync = { ...DEFAULTS.sync };
    if (typeof s.enabled === "boolean") out.sync.enabled = s.enabled;
    if (typeof s.debounceMs === "number") out.sync.debounceMs = s.debounceMs;
    if (Array.isArray(s.ignore)) out.sync.ignore = s.ignore.map(String);
    if (Array.isArray(s.relevant)) out.sync.relevant = s.relevant.map(String);
  }

  if (src.ux && typeof src.ux === "object") {
    const u = src.ux as Record<string, unknown>;
    out.ux = { ...DEFAULTS.ux };
    if (typeof u.toastFailures === "boolean")
      out.ux.toastFailures = u.toastFailures;
    if (typeof u.toastSuccesses === "boolean")
      out.ux.toastSuccesses = u.toastSuccesses;
    if (typeof u.toastCooldownMs === "number")
      out.ux.toastCooldownMs = u.toastCooldownMs;
  }

  if (typeof src.logLevel === "string") out.logLevel = src.logLevel;

  return out;
}

// implements REQ-opencode-kibi-plugin-v1
export function loadConfig(projectDir = process.cwd()): KibiConfig {
  const homeConfig = path.join(
    os.homedir(),
    ".config",
    "opencode",
    "kibi.json",
  );
  const projectConfig = path.join(projectDir, ".opencode", "kibi.json");

  const globalObj = readJsonIfExists(homeConfig);
  const projectObj = readJsonIfExists(projectConfig);

  let merged = {};
  if (globalObj) merged = { ...merged, ...globalObj };
  if (projectObj) merged = { ...merged, ...projectObj };

  const validated = validateAndMerge(merged);
  if (!validated) {
    logger.warn("Configuration invalid, falling back to defaults");
    return DEFAULTS;
  }
  return validated;
}

// implements REQ-opencode-kibi-plugin-v1
export function isPluginEnabled(cfg?: KibiConfig) {
  const effective = cfg || loadConfig();
  return Boolean(effective.enabled);
}

export { DEFAULTS };
