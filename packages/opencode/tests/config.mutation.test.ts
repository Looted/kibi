import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULTS,
  type KibiConfig,
  loadConfig,
  validateAndMerge,
} from "../src/config";
import { resetClient, setClient } from "../src/logger";

let warnings: string[] = [];

beforeEach(() => {
  warnings = [];
  setClient({
    app: {
      log: async (payload) => {
        const body = payload.body as { level: string; message: string };
        if (body.level === "warn") warnings.push(body.message);
      },
    },
  });
});

afterEach(() => {
  resetClient();
});

const EXPECTED_DEFAULTS: KibiConfig = {
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
    commentDetection: { enabled: true, minLines: 6 },
    targetedChecks: { enabled: true },
    sessionSummary: { enabled: true, logIntervalMs: 1800000 },
    smartEnforcement: {
      enabled: true,
      mode: "advisory",
      preflightTtlMs: 600000,
      idleResetMs: 1800000,
      degradedMode: "warn-once",
      requireRootKbForStrict: true,
      completionReminder: true,
    },
  },
  logLevel: "info",
};

const OVERRIDES = {
  enabled: false,
  autoUpdate: false,
  prompt: { enabled: false, hookMode: "compat" },
  sync: { enabled: false, debounceMs: 5, ignore: ["a", 1], relevant: ["b"] },
  ux: {
    toastStartup: false,
    toastFailures: false,
    toastSuccesses: true,
    toastCooldownMs: 7,
  },
  guidance: {
    dynamic: false,
    warnOnKbEdits: false,
    factFirstDomainRouting: false,
    commentDetection: { enabled: false, minLines: 2 },
    targetedChecks: { enabled: false },
    sessionSummary: { enabled: false, logIntervalMs: 9 },
    smartEnforcement: {
      enabled: false,
      mode: "hard",
      preflightTtlMs: 1,
      idleResetMs: 2,
      degradedMode: "structured-only",
      requireRootKbForStrict: false,
      completionReminder: false,
    },
  },
  logLevel: "debug",
};

describe("validateAndMerge", () => {
  test("an empty object gives the defaults", () => {
    expect(validateAndMerge({})).toStrictEqual(EXPECTED_DEFAULTS);
    expect(DEFAULTS).toStrictEqual(EXPECTED_DEFAULTS);
    expect(warnings).toStrictEqual([]);
  });

  test("every valid setting overrides its default", () => {
    // The overrides hold a non-string ignore entry, which the merge turns
    // into a string.
    expect(validateAndMerge(OVERRIDES)).toStrictEqual({
      ...OVERRIDES,
      sync: { ...OVERRIDES.sync, ignore: ["a", "1"] },
    } as KibiConfig);
  });

  test("other strict values are accepted", () => {
    const config = validateAndMerge({
      prompt: { hookMode: "chat-params" },
      guidance: {
        smartEnforcement: { mode: "strict", degradedMode: "warn-once" },
      },
    });
    expect(config.prompt.hookMode).toBe("chat-params");
    expect(config.guidance.smartEnforcement.mode).toBe("strict");
    expect(
      validateAndMerge({ prompt: { hookMode: "system-transform" } }).prompt
        .hookMode,
    ).toBe("system-transform");
    expect(
      validateAndMerge({ guidance: { smartEnforcement: { mode: "advisory" } } })
        .guidance.smartEnforcement.mode,
    ).toBe("advisory");
  });

  test("wrongly typed settings keep their defaults", () => {
    const wrong = (value: unknown) => ({
      enabled: value,
      autoUpdate: value,
      prompt: { enabled: value },
      sync: {
        enabled: value,
        debounceMs: value,
        ignore: value,
        relevant: value,
      },
      ux: {
        toastStartup: value,
        toastFailures: value,
        toastSuccesses: value,
        toastCooldownMs: value,
      },
      guidance: {
        dynamic: value,
        warnOnKbEdits: value,
        factFirstDomainRouting: value,
        commentDetection: { enabled: value, minLines: value },
        targetedChecks: { enabled: value },
        sessionSummary: { enabled: value, logIntervalMs: value },
        smartEnforcement: {
          enabled: value,
          mode: value,
          preflightTtlMs: value,
          idleResetMs: value,
          degradedMode: value,
          requireRootKbForStrict: value,
          completionReminder: value,
        },
      },
      logLevel: 1,
    });
    expect(validateAndMerge(wrong("x"))).toStrictEqual(EXPECTED_DEFAULTS);
    expect(warnings).toStrictEqual([]);
  });

  test("sections that are not objects are ignored", () => {
    expect(
      validateAndMerge({
        prompt: "x",
        sync: null,
        ux: 3,
        guidance: { commentDetection: "x", sessionSummary: null },
      }),
    ).toStrictEqual(EXPECTED_DEFAULTS);
  });

  test("an unknown hook mode warns and keeps the default", () => {
    expect(
      validateAndMerge({ prompt: { hookMode: "nope" } }).prompt.hookMode,
    ).toBe("auto");
    expect(warnings).toStrictEqual([
      "Invalid prompt.hookMode 'nope', using default",
    ]);
  });

  test.each([null, undefined, "x", 0])("%p is not a config object", (value) => {
    expect(validateAndMerge(value)).toBe(DEFAULTS);
    expect(warnings).toStrictEqual(["Config is not an object, using defaults"]);
  });
});

describe("loadConfig", () => {
  const dirs: string[] = [];

  function tmp(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-config-"));
    dirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of dirs.splice(0))
      fs.rmSync(dir, { recursive: true, force: true });
  });

  function write(file: string, content: string): void {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }

  test("the project config overrides the home config", () => {
    const home = tmp();
    const project = tmp();
    write(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ logLevel: "warn", autoUpdate: false }),
    );
    write(
      path.join(project, ".opencode", "kibi.json"),
      JSON.stringify({ logLevel: "debug" }),
    );
    const config = loadConfig(project, home);
    expect(config.logLevel).toBe("debug");
    expect(config.autoUpdate).toBe(false);
    expect(warnings).toStrictEqual([]);
  });

  test("missing files give the defaults without warnings", () => {
    expect(loadConfig(tmp(), tmp())).toStrictEqual(EXPECTED_DEFAULTS);
    expect(warnings).toStrictEqual([]);
  });

  test("unparseable files warn with the parse error", () => {
    const project = tmp();
    const file = path.join(project, ".opencode", "kibi.json");
    write(file, "{nope");
    let message = "";
    try {
      JSON.parse("{nope");
    } catch (err) {
      message = (err as Error).message;
    }
    expect(loadConfig(project, tmp())).toStrictEqual(EXPECTED_DEFAULTS);
    expect(warnings).toStrictEqual([
      `Failed to read/parse config ${file}: ${message}`,
    ]);
  });
});
