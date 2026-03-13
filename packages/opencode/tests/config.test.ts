import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULTS, isPluginEnabled, loadConfig } from "../src/config";
import * as logger from "../src/logger";

describe("config loader", () => {
  const home = path.join(os.homedir(), ".config", "opencode");
  const projDir = path.join(process.cwd(), "tmp-project");

  beforeAll(() => {
    try {
      fs.mkdirSync(home, { recursive: true });
    } catch {}
    try {
      fs.mkdirSync(path.join(projDir, ".opencode"), { recursive: true });
    } catch {}
  });

  afterEach(() => {
    try {
      fs.rmSync(path.join(home, "kibi.json"));
    } catch {}
    try {
      fs.rmSync(path.join(projDir, ".opencode", "kibi.json"));
    } catch {}
  });

  test("global config loads correctly", () => {
    fs.writeFileSync(
      path.join(home, "kibi.json"),
      JSON.stringify({ enabled: true, prompt: { hookMode: "compat" } }),
    );
    const c = loadConfig(projDir);
    expect(c.enabled).toBe(true);
    expect(c.prompt.hookMode).toBe("compat");
  });

  test("project overrides global", () => {
    fs.writeFileSync(
      path.join(home, "kibi.json"),
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
    const warnSpy = jest.spyOn(logger, "warn");
    fs.writeFileSync(path.join(home, "kibi.json"), "{ not: json");
    const c = loadConfig(projDir);
    expect(c).toEqual(DEFAULTS);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("enabled false disables plugin", () => {
    fs.writeFileSync(
      path.join(home, "kibi.json"),
      JSON.stringify({ enabled: false }),
    );
    const c = loadConfig(projDir);
    expect(isPluginEnabled(c)).toBe(false);
  });

  test("prompt.hookMode validation", () => {
    fs.writeFileSync(
      path.join(home, "kibi.json"),
      JSON.stringify({ prompt: { hookMode: "invalid" } }),
    );
    const warnSpy = jest.spyOn(logger, "warn");
    const c = loadConfig(projDir);
    expect(c.prompt.hookMode).toBe(DEFAULTS.prompt.hookMode);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
