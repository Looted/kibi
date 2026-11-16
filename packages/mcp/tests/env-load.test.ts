import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  getBranchOverride,
  getCoreModulePathOverride,
  getKbPlPathOverride,
  isMcpDebugEnabled,
  loadDefaultEnvFile,
} from "../src/env.js";
import { restoreProcessEnv } from "./helpers/process-env.js";

const originalCwd = process.cwd();
const originalEnv = { ...process.env };

let tmpDir = "";

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-env-"));
  restoreProcessEnv(originalEnv);
});

afterEach(() => {
  process.chdir(originalCwd);
  restoreProcessEnv(originalEnv);
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  mock.restore();
});

describe("env loading", () => {
  test("loadDefaultEnvFile resolves workspace root and loads .env.kibi by default", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".env.kibi"),
      "DEFAULT_KEY=from-default\n",
    );
    Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    Reflect.deleteProperty(process.env, "KIBI_PROJECT_ROOT");
    Reflect.deleteProperty(process.env, "KIBI_ROOT");
    Reflect.deleteProperty(process.env, "KIBI_ENV_FILE");
    Reflect.deleteProperty(process.env, "DEFAULT_KEY");
    process.chdir(tmpDir);

    const result = loadDefaultEnvFile();

    expect(result.envFilePath).toBe(path.join(tmpDir, ".env.kibi"));
    expect(result.keysLoaded).toContain("DEFAULT_KEY");
    expect(process.env.DEFAULT_KEY).toBe("from-default");
  });

  test("loadDefaultEnvFile honors KIBI_ENV_FILE override and legacy .env gap-fill", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".env.custom"),
      "DEFAULT_KEY=from-default\n",
    );
    fs.writeFileSync(path.join(tmpDir, ".env"), "LEGACY_ONLY=legacy\n");
    Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    Reflect.deleteProperty(process.env, "KIBI_PROJECT_ROOT");
    Reflect.deleteProperty(process.env, "KIBI_ROOT");
    Reflect.deleteProperty(process.env, "DEFAULT_KEY");
    Reflect.deleteProperty(process.env, "LEGACY_ONLY");
    process.env.KIBI_ENV_FILE = " .env.custom ";
    process.chdir(tmpDir);

    const result = loadDefaultEnvFile();

    expect(result.envFilePath).toBe(path.join(tmpDir, ".env.custom"));
    expect(result.keysLoaded).toContain("DEFAULT_KEY");
    expect(result.keysLoaded).toContain("LEGACY_ONLY");
    expect(process.env.DEFAULT_KEY).toBe("from-default");
    expect(process.env.LEGACY_ONLY).toBe("legacy");
  });

  test("getCoreModulePathOverride normalizes non-word characters in filenames", () => {
    process.env.KIBI_FOO_BAR_BAZ_PL_PATH = "/tmp/foo-bar-baz.pl";

    expect(getCoreModulePathOverride("foo-bar.baz.pl")).toBe(
      "/tmp/foo-bar-baz.pl",
    );
  });

  test("falls back when override env vars are unset, empty, or whitespace", () => {
    Reflect.deleteProperty(process.env, "KIBI_ENV_FILE");
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
    Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    Reflect.deleteProperty(process.env, "KIBI_DISCOVERY_PL_PATH");

    expect(getBranchOverride()).toBeUndefined();
    expect(isMcpDebugEnabled()).toBe(false);
    expect(getKbPlPathOverride()).toBeUndefined();
    expect(getCoreModulePathOverride("discovery.pl")).toBeUndefined();

    process.env.KIBI_ENV_FILE = "   ";
    process.env.KIBI_BRANCH = "";
    expect(getBranchOverride()).toBeUndefined();
  });
});
