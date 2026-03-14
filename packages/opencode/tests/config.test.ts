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
import { DEFAULTS, isPluginEnabled, loadConfig } from "../src/config";

describe("config loader", () => {
  let tmpBase: string;
  let home: string;
  let projDir: string;
  let origHome: string | undefined;
  let consoleWarnSpy: ReturnType<typeof spyOn>;
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

    consoleWarnSpy = spyOn(console, "warn");
    consoleErrorSpy = spyOn(console, "error");
  });

  beforeEach(() => {
    consoleWarnSpy.mockClear();
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
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  test("enabled false disables plugin", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ enabled: false }),
    );
    const c = loadConfig(projDir);
    expect(isPluginEnabled(c)).toBe(false);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("prompt.hookMode validation", () => {
    fs.writeFileSync(
      path.join(home, ".config", "opencode", "kibi.json"),
      JSON.stringify({ prompt: { hookMode: "invalid" } }),
    );
    const c = loadConfig(projDir);
    expect(c.prompt.hookMode).toBe(DEFAULTS.prompt.hookMode);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});
