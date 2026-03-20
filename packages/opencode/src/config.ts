import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as logger from "./logger.js";

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
  guidance: {
    dynamic: boolean;
    warnOnKbEdits: boolean;
    factFirstDomainRouting: boolean;
    commentDetection: {
      enabled: boolean;
      minLines: number;
    };
    targetedChecks: {
      enabled: boolean;
    };
    sessionSummary: {
      enabled: boolean;
      logIntervalMs: number;
    };
  };
  logLevel: string;
}

const DEFAULTS: KibiConfig = {
  enabled: true,
  prompt: { enabled: true, hookMode: "auto" },
  sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
  ux: { toastFailures: true, toastSuccesses: false, toastCooldownMs: 10000 },
  guidance: {
    dynamic: true,
    warnOnKbEdits: true,
    factFirstDomainRouting: true,
    commentDetection: {
      enabled: true,
      minLines: 6,
    },
    targetedChecks: {
      enabled: true,
    },
    sessionSummary: {
      enabled: true,
      logIntervalMs: 30 * 60 * 1000, // 30 minutes
    },
  },
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

  if (src.guidance && typeof src.guidance === "object") {
    const g = src.guidance as Record<string, unknown>;
    out.guidance = { ...DEFAULTS.guidance };
    if (typeof g.dynamic === "boolean") out.guidance.dynamic = g.dynamic;
    if (typeof g.warnOnKbEdits === "boolean")
      out.guidance.warnOnKbEdits = g.warnOnKbEdits;
    if (typeof g.factFirstDomainRouting === "boolean")
      out.guidance.factFirstDomainRouting = g.factFirstDomainRouting;

    if (g.commentDetection && typeof g.commentDetection === "object") {
      const cd = g.commentDetection as Record<string, unknown>;
      out.guidance.commentDetection = { ...DEFAULTS.guidance.commentDetection };
      if (typeof cd.enabled === "boolean")
        out.guidance.commentDetection.enabled = cd.enabled;
      if (typeof cd.minLines === "number")
        out.guidance.commentDetection.minLines = cd.minLines;
    }

    if (g.targetedChecks && typeof g.targetedChecks === "object") {
      const tc = g.targetedChecks as Record<string, unknown>;
      out.guidance.targetedChecks = { ...DEFAULTS.guidance.targetedChecks };
      if (typeof tc.enabled === "boolean")
        out.guidance.targetedChecks.enabled = tc.enabled;
    }

    if (g.sessionSummary && typeof g.sessionSummary === "object") {
      const ss = g.sessionSummary as Record<string, unknown>;
      out.guidance.sessionSummary = { ...DEFAULTS.guidance.sessionSummary };
      if (typeof ss.enabled === "boolean")
        out.guidance.sessionSummary.enabled = ss.enabled;
      if (typeof ss.logIntervalMs === "number")
        out.guidance.sessionSummary.logIntervalMs = ss.logIntervalMs;
    }
  }

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
