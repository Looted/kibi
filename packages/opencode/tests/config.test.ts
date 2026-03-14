import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
// @ts-nocheck
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULTS, isPluginEnabled, loadConfig } from "../src/config";
import * as logger from "../src/logger";

describe("config loader", () => {
  let tmpBase: string;
  let home: string;
  let projDir: string;
  let origHome: string | undefined;

  beforeAll(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-config-test-"));
    home = path.join(tmpBase, "home");
    projDir = path.join(tmpBase, "project");
    origHome = process.env.HOME;

    fs.mkdirSync(path.join(home, ".config", "opencode"), { recursive: true });
    fs.mkdirSync(path.join(projDir, ".opencode"), { recursive: true });

    // Override HOME so os.homedir() resolves to our temp dir
    process.env.HOME = home;
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
    if (origHome !== undefined) {
      process.env.HOME = origHome;
    }
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch {}
  });

  test("global config loads correctly", () => {
    const warnSpy = spyOn(console, "warn");
    const errorSpy = spyOn(console, "error");
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ enabled: true, prompt: { hookMode: "compat" } }),
    );
    const c = loadConfig(projDir);
    expect(c.enabled).toBe(true);
    expect(c.prompt.hookMode).toBe("compat");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("project overrides global", () => {
    const warnSpy = spyOn(console, "warn");
    const errorSpy = spyOn(console, "error");
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ enabled: true, prompt: { hookMode: "compat" } }),
    );
    fs.writeFileSync(
      path.join(projDir, ".config", "opencode", "kibi.json"),
      JSON.stringify({ enabled: false }),
    );
    const c = loadConfig(projDir);
    expect(c.enabled).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("invalid config falls back to defaults with warning", () => {
    const warnSpy = spyOn(console, "warn");
    const errorSpy = spyOn(console, "error");
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      "{ not: json}",
    );
    const c = loadConfig(projDir);
    expect(c).toEqual(DEFAULTS);
    expect(warnSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("enabled false disables plugin", () => {
    const warnSpy = spyOn(console, "warn");
    const errorSpy = spyOn(console, "error");
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ enabled: false }),
    );
    const c = loadConfig(projDir);
    expect(isPluginEnabled(c)).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("prompt.hookMode validation", () => {
    const warnSpy = spyOn(console, "warn");
    const errorSpy = spyOn(console, "error");
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ prompt: { hookMode: "invalid" } }),
    );
    const c = loadConfig(projDir);
    expect(c.prompt.hookMode).toBe(DEFAULTS.prompt.hookMode);
    expect(warnSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
