import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as logger from "./logger.js";

export interface KibiConfig {
  enabled: boolean;
  autoUpdate: boolean;
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
    toastStartup: boolean;
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
    smartEnforcement: {
      enabled: boolean;
      mode: "advisory" | "strict" | "hard";
      preflightTtlMs: number;
      idleResetMs: number;
      degradedMode: "warn-once" | "structured-only";
      requireRootKbForStrict: boolean;
      completionReminder: boolean;
    };
  };
  logLevel: string;
}

const DEFAULTS: KibiConfig = {
  enabled: true,
  autoUpdate: true,
  prompt: { enabled: true, hookMode: "auto" },
  sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
  ux: {
    toastStartup: true,
    toastFailures: true,
    toastSuccesses: false,
    toastCooldownMs: 10000,
  },
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
    smartEnforcement: {
      enabled: true,
      mode: "advisory",
      preflightTtlMs: 600000, // 10 minutes
      idleResetMs: 1800000, // 30 minutes
      degradedMode: "warn-once",
      requireRootKbForStrict: true,
      completionReminder: true,
    },
  },
  logLevel: "info",
};

function readJsonIfExists(filePath: string): unknown | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(String(fs.readFileSync(filePath)));
  } catch (err: unknown) {
    // fs and JSON.parse only throw Error instances.
    logger.warn(
      `Failed to read/parse config ${filePath}: ${(err as Error).message}`,
    );
    return null;
  }
}

type ConfigRecord = Record<string, unknown>;

/** A config section; property reads on a missing or primitive value find nothing. */
function section(value: unknown): ConfigRecord {
  return (value ?? {}) as ConfigRecord;
}

function pickBoolean(src: ConfigRecord, key: string, fallback: boolean) {
  const value = src[key];
  return typeof value === "boolean" ? value : fallback;
}

function pickNumber(src: ConfigRecord, key: string, fallback: number) {
  const value = src[key];
  return typeof value === "number" ? value : fallback;
}

function pickStrings(src: ConfigRecord, key: string): string[] {
  const value = src[key];
  return Array.isArray(value) ? value.map(String) : [];
}

/** `allowed` lists the accepted values besides the fallback itself. */
function pickOneOf<T extends string>(
  src: ConfigRecord,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = src[key];
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const HOOK_MODES = [
  "auto",
  "chat-params",
  "system-transform",
  "compat",
] as const;

function pickHookMode(prompt: ConfigRecord): KibiConfig["prompt"]["hookMode"] {
  const mode = prompt.hookMode;
  if (typeof mode !== "string") return DEFAULTS.prompt.hookMode;
  if ((HOOK_MODES as readonly string[]).includes(mode)) {
    return mode as KibiConfig["prompt"]["hookMode"];
  }
  logger.warn(`Invalid prompt.hookMode '${mode}', using default`);
  return DEFAULTS.prompt.hookMode;
}

export function validateAndMerge(obj: unknown): KibiConfig {
  if (!obj || typeof obj !== "object") {
    logger.warn("Config is not an object, using defaults");
    return DEFAULTS;
  }

  const src = obj as ConfigRecord;
  const prompt = section(src.prompt);
  const sync = section(src.sync);
  const ux = section(src.ux);
  const guidance = section(src.guidance);
  const commentDetection = section(guidance.commentDetection);
  const sessionSummary = section(guidance.sessionSummary);
  const smartEnforcement = section(guidance.smartEnforcement);
  const d = DEFAULTS;
  const dg = DEFAULTS.guidance;
  const dse = dg.smartEnforcement;

  return {
    enabled: pickBoolean(src, "enabled", d.enabled),
    autoUpdate: pickBoolean(src, "autoUpdate", d.autoUpdate),
    prompt: {
      enabled: pickBoolean(prompt, "enabled", d.prompt.enabled),
      hookMode: pickHookMode(prompt),
    },
    sync: {
      enabled: pickBoolean(sync, "enabled", d.sync.enabled),
      debounceMs: pickNumber(sync, "debounceMs", d.sync.debounceMs),
      ignore: pickStrings(sync, "ignore"),
      relevant: pickStrings(sync, "relevant"),
    },
    ux: {
      toastStartup: pickBoolean(ux, "toastStartup", d.ux.toastStartup),
      toastFailures: pickBoolean(ux, "toastFailures", d.ux.toastFailures),
      toastSuccesses: pickBoolean(ux, "toastSuccesses", d.ux.toastSuccesses),
      toastCooldownMs: pickNumber(ux, "toastCooldownMs", d.ux.toastCooldownMs),
    },
    guidance: {
      dynamic: pickBoolean(guidance, "dynamic", dg.dynamic),
      warnOnKbEdits: pickBoolean(guidance, "warnOnKbEdits", dg.warnOnKbEdits),
      factFirstDomainRouting: pickBoolean(
        guidance,
        "factFirstDomainRouting",
        dg.factFirstDomainRouting,
      ),
      commentDetection: {
        enabled: pickBoolean(
          commentDetection,
          "enabled",
          dg.commentDetection.enabled,
        ),
        minLines: pickNumber(
          commentDetection,
          "minLines",
          dg.commentDetection.minLines,
        ),
      },
      targetedChecks: {
        enabled: pickBoolean(
          section(guidance.targetedChecks),
          "enabled",
          dg.targetedChecks.enabled,
        ),
      },
      sessionSummary: {
        enabled: pickBoolean(
          sessionSummary,
          "enabled",
          dg.sessionSummary.enabled,
        ),
        logIntervalMs: pickNumber(
          sessionSummary,
          "logIntervalMs",
          dg.sessionSummary.logIntervalMs,
        ),
      },
      smartEnforcement: {
        enabled: pickBoolean(smartEnforcement, "enabled", dse.enabled),
        mode: pickOneOf(smartEnforcement, "mode", ["strict", "hard"], dse.mode),
        preflightTtlMs: pickNumber(
          smartEnforcement,
          "preflightTtlMs",
          dse.preflightTtlMs,
        ),
        idleResetMs: pickNumber(
          smartEnforcement,
          "idleResetMs",
          dse.idleResetMs,
        ),
        degradedMode: pickOneOf(
          smartEnforcement,
          "degradedMode",
          ["structured-only"],
          dse.degradedMode,
        ),
        requireRootKbForStrict: pickBoolean(
          smartEnforcement,
          "requireRootKbForStrict",
          dse.requireRootKbForStrict,
        ),
        completionReminder: pickBoolean(
          smartEnforcement,
          "completionReminder",
          dse.completionReminder,
        ),
      },
    },
    logLevel: typeof src.logLevel === "string" ? src.logLevel : d.logLevel,
  };
}

export function loadConfig(
  projectDir: string = process.cwd(),
  homeDir: string = os.homedir(),
): KibiConfig {
  const homeConfig = path.join(homeDir, ".config", "opencode", "kibi.json");
  const projectConfig = path.join(projectDir, ".opencode", "kibi.json");

  // Spreading a missing (null) config adds nothing.
  return validateAndMerge({
    ...(readJsonIfExists(homeConfig) as object | null),
    ...(readJsonIfExists(projectConfig) as object | null),
  });
}

export function isPluginEnabled(cfg?: KibiConfig) {
  const effective = cfg || loadConfig();
  return Boolean(effective.enabled);
}

export { DEFAULTS };
