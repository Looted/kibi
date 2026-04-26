import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as logger from "../src/logger.js";
import {
  DEFAULTS,
  isPluginEnabled,
  loadConfig,
  validateAndMerge,
} from "../src/config";

describe("config loader", () => {
  let tmpBase: string;
  let home: string;
  let projDir: string;
  let origHome: string | undefined;
  let loggerWarnSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let homedirSpy: ReturnType<typeof spyOn>;

  beforeAll(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-config-test-"));
    home = path.join(tmpBase, "home");
    projDir = path.join(tmpBase, "project");
    origHome = process.env.HOME;

    fs.mkdirSync(path.join(home, ".config", "opencode"), { recursive: true });
    fs.mkdirSync(path.join(projDir, ".opencode"), { recursive: true });

    process.env.HOME = home;
    homedirSpy = spyOn(os, "homedir").mockReturnValue(home);

    loggerWarnSpy = spyOn(logger, "warn");
    consoleErrorSpy = spyOn(console, "error");
  });

  beforeEach(() => {
    loggerWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    try {
      fs.rmSync(path.join(home, ".config", "opencode", "kibi.json"));
    } catch {}
    try {
      fs.rmSync(path.join(projDir, ".opencode", "kibi.json"));
    } catch {}
  });

  afterAll(() => {
    homedirSpy.mockRestore();
    if (origHome !== undefined) {
      process.env.HOME = origHome;
    }
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch {}
  });

  test("global config loads correctly", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ enabled: true, prompt: { hookMode: "compat" } }),
    );
    const c = loadConfig(projDir);
    expect(c.enabled).toBe(true);
    expect(c.prompt.hookMode).toBe("compat");
  });

  test("project overrides global", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ enabled: true, prompt: { hookMode: "compat" } }),
    );
    fs.writeFileSync(
      path.join(projDir, ".opencode", "kibi.json"),
      JSON.stringify({ enabled: false }),
    );
    const c = loadConfig(projDir);
    expect(c.enabled).toBe(false);
  });

  test("invalid config falls back to defaults with warning", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      "{ not: json}",
    );
    const c = loadConfig(projDir);
    expect(c).toEqual(DEFAULTS);
    expect(loggerWarnSpy).toHaveBeenCalled();
  });

  test("enabled false disables plugin", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ enabled: false }),
    );
    const c = loadConfig(projDir);
    expect(isPluginEnabled(c)).toBe(false);
    expect(loggerWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("prompt.hookMode validation", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ prompt: { hookMode: "invalid" } }),
    );
    const c = loadConfig(projDir);
    expect(c.prompt.hookMode).toBe(DEFAULTS.prompt.hookMode);
    expect(loggerWarnSpy).toHaveBeenCalled();
  });

  test("ux config validation merges supported values", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({
        ux: {
          toastStartup: false,
          toastFailures: false,
          toastSuccesses: true,
          toastCooldownMs: 2500,
        },
      }),
    );

    const c = loadConfig(projDir);

    expect(c.ux).toEqual({
      toastStartup: false,
      toastFailures: false,
      toastSuccesses: true,
      toastCooldownMs: 2500,
      briefs: { autoSubmit: true },
    });
  });

  test("ux toastStartup defaults to true and project config overrides global", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({
        ux: {
          toastStartup: false,
        },
      }),
    );
    fs.writeFileSync(
      path.join(projDir, ".opencode", "kibi.json"),
      JSON.stringify({
        ux: {
          toastStartup: true,
        },
      }),
    );

    const c = loadConfig(projDir);

    expect(c.ux.toastStartup).toBe(true);
    expect(c.ux.toastFailures).toBe(DEFAULTS.ux.toastFailures);
    expect(c.ux.toastSuccesses).toBe(DEFAULTS.ux.toastSuccesses);
    expect(c.ux.toastCooldownMs).toBe(DEFAULTS.ux.toastCooldownMs);
  });

  test("non-object nested ux config falls back to defaults", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({
        ux: "invalid",
      }),
    );

    const c = loadConfig(projDir);

    expect(c.ux).toEqual(DEFAULTS.ux);
  });

  test("validateAndMerge returns defaults for non-object input", () => {
    const stringResult = validateAndMerge("invalid" as unknown);
    const numberResult = validateAndMerge(42 as unknown);
    const nullResult = validateAndMerge(null);
    const undefinedResult = validateAndMerge(undefined);

    expect(stringResult).toEqual(DEFAULTS);
    expect(numberResult).toEqual(DEFAULTS);
    expect(nullResult).toEqual(DEFAULTS);
    expect(undefinedResult).toEqual(DEFAULTS);
  });

  test("validateAndMerge covers sync, guidance, logLevel nested branches", () => {
    const c = validateAndMerge({
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: {
        enabled: false,
        debounceMs: 5000,
        ignore: ["*.log"],
        relevant: ["src/**"],
      },
      guidance: {
        dynamic: false,
        warnOnKbEdits: false,
        factFirstDomainRouting: false,
        commentDetection: { enabled: false, minLines: 3 },
        targetedChecks: { enabled: false },
        sessionSummary: { enabled: false, logIntervalMs: 60000 },
        smartEnforcement: {
          enabled: false,
          mode: "strict",
          preflightTtlMs: 300000,
          idleResetMs: 900000,
          degradedMode: "structured-only",
          requireRootKbForStrict: false,
          completionReminder: false,
        },
      },
      logLevel: "debug",
    });

    expect(c.sync.enabled).toBe(false);
    expect(c.sync.debounceMs).toBe(5000);
    expect(c.sync.ignore).toEqual(["*.log"]);
    expect(c.sync.relevant).toEqual(["src/**"]);
    expect(c.guidance.dynamic).toBe(false);
    expect(c.guidance.warnOnKbEdits).toBe(false);
    expect(c.guidance.factFirstDomainRouting).toBe(false);
    expect(c.guidance.commentDetection.enabled).toBe(false);
    expect(c.guidance.commentDetection.minLines).toBe(3);
    expect(c.guidance.targetedChecks.enabled).toBe(false);
    expect(c.guidance.sessionSummary.enabled).toBe(false);
    expect(c.guidance.sessionSummary.logIntervalMs).toBe(60000);
    expect(c.guidance.smartEnforcement.enabled).toBe(false);
    expect(c.guidance.smartEnforcement.mode).toBe("strict");
    expect(c.guidance.smartEnforcement.preflightTtlMs).toBe(300000);
    expect(c.guidance.smartEnforcement.idleResetMs).toBe(900000);
    expect(c.guidance.smartEnforcement.degradedMode).toBe("structured-only");
    expect(c.guidance.smartEnforcement.requireRootKbForStrict).toBe(false);
    expect(c.guidance.smartEnforcement.completionReminder).toBe(false);
    expect(c.logLevel).toBe("debug");
  });

  test("ux.briefs config validation merges briefs block", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({
        ux: {
          briefs: {
            autoSubmit: false,
          },
        },
      }),
    );

    const c = loadConfig(projDir);

    expect(c.ux.briefs).toEqual({
      autoSubmit: false,
});
    expect(c.ux.toastStartup).toBe(DEFAULTS.ux.toastStartup);
    expect(c.ux.toastFailures).toBe(DEFAULTS.ux.toastFailures);
    expect(c.ux.toastSuccesses).toBe(DEFAULTS.ux.toastSuccesses);
    expect(c.ux.toastCooldownMs).toBe(DEFAULTS.ux.toastCooldownMs);
  });
});
