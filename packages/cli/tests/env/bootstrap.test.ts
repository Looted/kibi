// implements REQ-002
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  bootstrapKibiEnvironment,
  inspectSecretSource,
  parseEnvContent,
  resolveKibiUserEnvPath,
  resolveKibiWorkspaceRoot,
} from "../../src/env/bootstrap.js";

const originalCwd = process.cwd();
let tmpDir = "";
let userConfigRoot = "";
const touchedKeys = new Set<string>();

function trackEnv(key: string, value: string | undefined): void {
  touchedKeys.add(key);
  if (value === undefined) Reflect.deleteProperty(process.env, key);
  else process.env[key] = value;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-env-boot-"));
  userConfigRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-env-user-"));
  fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
  process.chdir(tmpDir);
  for (const key of [
    "KIBI_WORKSPACE",
    "KIBI_PROJECT_ROOT",
    "KIBI_ROOT",
    "KIBI_ENV_FILE",
    "XDG_CONFIG_HOME",
    "BOOT_PROCESS",
    "BOOT_USER",
    "BOOT_PROJECT",
    "BOOT_LEGACY",
    "BOOT_BOTH",
    "SECRET_KEY",
  ]) {
    trackEnv(key, undefined);
  }
});

afterEach(() => {
  process.chdir(originalCwd);
  for (const key of touchedKeys) {
    Reflect.deleteProperty(process.env, key);
  }
  touchedKeys.clear();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(userConfigRoot, { recursive: true, force: true });
});

function writeUserEnv(content: string): string {
  const dir = path.join(userConfigRoot, "kibi");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "env");
  fs.writeFileSync(filePath, content);
  trackEnv("XDG_CONFIG_HOME", userConfigRoot);
  return filePath;
}

describe("bootstrapKibiEnvironment precedence", () => {
  test("process overrides files; project overrides user; attribution labels are correct", () => {
    trackEnv("BOOT_PROCESS", "from-process");
    writeUserEnv(
      ["BOOT_PROCESS=from-user", "BOOT_USER=user-only", "BOOT_BOTH=user"].join(
        "\n",
      ),
    );
    fs.writeFileSync(
      path.join(tmpDir, ".env.kibi"),
      ["BOOT_PROCESS=from-project", "BOOT_PROJECT=project-only", "BOOT_BOTH=project"].join(
        "\n",
      ),
    );
    fs.writeFileSync(
      path.join(tmpDir, ".env"),
      "BOOT_LEGACY=legacy-only\nBOOT_PROJECT=legacy-should-not-win\n",
    );

    const result = bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });

    expect(process.env.BOOT_PROCESS).toBe("from-process");
    expect(process.env.BOOT_USER).toBe("user-only");
    expect(process.env.BOOT_PROJECT).toBe("project-only");
    expect(process.env.BOOT_BOTH).toBe("project");
    expect(process.env.BOOT_LEGACY).toBe("legacy-only");
    expect(result.sources.BOOT_PROCESS).toBe("process");
    expect(result.sources.BOOT_USER).toBe("user_env");
    expect(result.sources.BOOT_PROJECT).toBe("project_env");
    expect(result.sources.BOOT_BOTH).toBe("project_env");
    expect(result.keysLoadedFromLegacy).toContain("BOOT_LEGACY");
  });

  test("user file works alone", () => {
    writeUserEnv("BOOT_USER=only-user\n");
    bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    expect(process.env.BOOT_USER).toBe("only-user");
    expect(inspectSecretSource("BOOT_USER", { xdgConfigHome: userConfigRoot })).toBe(
      "user_env",
    );
  });

  test("missing stays missing", () => {
    expect(
      inspectSecretSource("SECRET_KEY", {
        startDir: tmpDir,
        xdgConfigHome: userConfigRoot,
      }),
    ).toBe("missing");
  });

  test("KIBI_ENV_FILE replaces the project slot", () => {
    fs.writeFileSync(path.join(tmpDir, ".env.kibi"), "BOOT_PROJECT=default\n");
    fs.writeFileSync(path.join(tmpDir, "custom.env"), "BOOT_PROJECT=custom\n");
    trackEnv("KIBI_ENV_FILE", "custom.env");
    bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    expect(process.env.BOOT_PROJECT).toBe("custom");
    expect(
      inspectSecretSource("BOOT_PROJECT", {
        startDir: tmpDir,
        xdgConfigHome: userConfigRoot,
      }),
    ).toBe("project_env");
  });

  test("legacy .env fills only gaps", () => {
    writeUserEnv("BOOT_USER=user\n");
    fs.writeFileSync(
      path.join(tmpDir, ".env"),
      "BOOT_USER=legacy-user\nBOOT_LEGACY=legacy\n",
    );
    bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    expect(process.env.BOOT_USER).toBe("user");
    expect(process.env.BOOT_LEGACY).toBe("legacy");
  });

  test("serialized diagnostics never contain secret values", () => {
    writeUserEnv("SECRET_KEY=super-secret-value\n");
    const result = bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("super-secret-value");
    expect(inspectSecretSource("SECRET_KEY", { xdgConfigHome: userConfigRoot })).toBe(
      "user_env",
    );
  });

  test("resolveKibiWorkspaceRoot honors KIBI_WORKSPACE over cwd", () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-ws-"));
    fs.mkdirSync(path.join(other, ".kb"), { recursive: true });
    trackEnv("KIBI_WORKSPACE", other);
    expect(resolveKibiWorkspaceRoot(tmpDir)).toBe(path.resolve(other));
    fs.rmSync(other, { recursive: true, force: true });
  });

  test("resolveKibiUserEnvPath uses XDG_CONFIG_HOME", () => {
    expect(resolveKibiUserEnvPath({ xdgConfigHome: userConfigRoot })).toBe(
      path.join(userConfigRoot, "kibi", "env"),
    );
  });

  test("parseEnvContent strips quotes and skips comments", () => {
    expect(parseEnvContent("# c\nA=1\nB=\"two\"\nC='three'\n")).toEqual([
      { key: "A", value: "1" },
      { key: "B", value: "two" },
      { key: "C", value: "three" },
    ]);
  });
});
