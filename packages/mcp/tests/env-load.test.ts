import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  getCoreModulePathOverride,
  loadDefaultEnvFile,
  loadEnvFile,
} from "../src/env.js";

const originalCwd = process.cwd();
const originalEnv = { ...process.env };

let tmpDir = "";

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-env-"));
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.chdir(originalCwd);
  process.env = { ...originalEnv };
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  mock.restore();
});

describe("env loading", () => {
  test("loadEnvFile loads valid entries, preserves existing env, and strips quotes", () => {
    const envPath = path.join(tmpDir, ".env.test");
    fs.writeFileSync(
      envPath,
      [
        "# comment",
        "NEW_KEY=value",
        'QUOTED_KEY="quoted value"',
        "SINGLE='single value'",
        "COMPLEX=foo=bar",
        "INVALID_LINE",
        "=missing_key",
        "EXISTING_KEY=should_not_override",
      ].join("\n"),
    );
    process.env.EXISTING_KEY = "keep-me";

    const result = loadEnvFile({ envFileName: ".env.test", workspaceRoot: tmpDir });

    expect(result).toEqual({
      loaded: true,
      envFilePath: envPath,
      keysLoaded: ["NEW_KEY", "QUOTED_KEY", "SINGLE", "COMPLEX"],
    });
    expect(process.env.NEW_KEY).toBe("value");
    expect(process.env.QUOTED_KEY).toBe("quoted value");
    expect(process.env.SINGLE).toBe("single value");
    expect(process.env.COMPLEX).toBe("foo=bar");
    expect(process.env.EXISTING_KEY).toBe("keep-me");
  });

  test("loadEnvFile returns unloaded result when file is missing", () => {
    const result = loadEnvFile({ envFileName: ".env.missing", workspaceRoot: tmpDir });

    expect(result).toEqual({
      loaded: false,
      envFilePath: path.join(tmpDir, ".env.missing"),
      keysLoaded: [],
    });
  });

  test("loadEnvFile handles read failures and logs error", () => {
    const envPath = path.join(tmpDir, ".env.broken");
    fs.mkdirSync(envPath, { recursive: true });
    const consoleError = mock(() => {});
    console.error = consoleError;

    const result = loadEnvFile({ envFileName: ".env.broken", workspaceRoot: tmpDir });
    expect(result).toEqual({
      loaded: false,
      envFilePath: envPath,
      keysLoaded: [],
    });
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining(`[Kibi] Unable to load environment file ${envPath}:`),
    );
  });

  test("loadDefaultEnvFile resolves workspace root and env file name from environment", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".env.custom"), "DEFAULT_KEY=from-default\n");
    process.env.KIBI_ENV_FILE = " .env.custom ";
    process.chdir(tmpDir);

    const result = loadDefaultEnvFile();

    expect(result).toEqual({
      loaded: true,
      envFilePath: path.join(tmpDir, ".env.custom"),
      keysLoaded: ["DEFAULT_KEY"],
    });
    expect(process.env.DEFAULT_KEY).toBe("from-default");
  });

  test("getCoreModulePathOverride normalizes non-word characters in filenames", () => {
    process.env.KIBI_FOO_BAR_BAZ_PL_PATH = "/tmp/foo-bar-baz.pl";

    expect(getCoreModulePathOverride("foo-bar.baz.pl")).toBe("/tmp/foo-bar-baz.pl");
  });
});
