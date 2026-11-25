import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  bootstrapKibiEnvironment,
  inspectSecretSource,
  parseEnvContent,
  resetKibiEnvironmentBootstrapStateForTests,
  resolveKibiUserEnvPath,
  resolveKibiWorkspaceRoot,
  secretSourceFromBootstrap,
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
  resetKibiEnvironmentBootstrapStateForTests();
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
    "KIBI_KB_DEPENDENCY",
    "XDG_CONFIG_HOME",
    "BOOT_PROCESS_TOKEN",
    "BOOT_USER_TOKEN",
    "BOOT_PROJECT_TOKEN",
    "BOOT_LEGACY_TOKEN",
    "BOOT_BOTH_TOKEN",
    "BOOT_BLANK_TOKEN",
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
  resetKibiEnvironmentBootstrapStateForTests();
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

describe("bootstrapKibiEnvironment in a KB dependency checkout", () => {
  test("loads the user env file but not the checkout's own env files", () => {
    writeUserEnv("BOOT_USER_TOKEN=user-only\n");
    fs.writeFileSync(path.join(tmpDir, ".env.kibi"), "BOOT_PROJECT_TOKEN=project\n");
    fs.writeFileSync(path.join(tmpDir, ".env"), "BOOT_LEGACY_TOKEN=legacy\n");
    trackEnv("KIBI_KB_DEPENDENCY", `lib@${"a".repeat(40)}`);
    const result = bootstrapKibiEnvironment();
    expect(process.env.BOOT_USER_TOKEN).toBe("user-only");
    expect(process.env.BOOT_PROJECT_TOKEN).toBeUndefined();
    expect(process.env.BOOT_LEGACY_TOKEN).toBeUndefined();
    expect(result.keysLoadedFromProject).toEqual([]);
    expect(result.keysLoadedFromLegacy).toEqual([]);
  });
});

describe("bootstrapKibiEnvironment precedence", () => {
  test("process overrides files; project overrides user; attribution labels are correct", () => {
    trackEnv("BOOT_PROCESS_TOKEN", "from-process");
    writeUserEnv(
      ["BOOT_PROCESS_TOKEN=from-user", "BOOT_USER_TOKEN=user-only", "BOOT_BOTH_TOKEN=user"].join(
        "\n",
      ),
    );
    fs.writeFileSync(
      path.join(tmpDir, ".env.kibi"),
      [
        "BOOT_PROCESS_TOKEN=from-project",
        "BOOT_PROJECT_TOKEN=project-only",
        "BOOT_BOTH_TOKEN=project",
      ].join("\n"),
    );
    fs.writeFileSync(
      path.join(tmpDir, ".env"),
      "BOOT_LEGACY_TOKEN=legacy-only\nBOOT_PROJECT_TOKEN=legacy-should-not-win\n",
    );

    const result = bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });

    expect(process.env.BOOT_PROCESS_TOKEN).toBe("from-process");
    expect(process.env.BOOT_USER_TOKEN).toBe("user-only");
    expect(process.env.BOOT_PROJECT_TOKEN).toBe("project-only");
    expect(process.env.BOOT_BOTH_TOKEN).toBe("project");
    expect(process.env.BOOT_LEGACY_TOKEN).toBe("legacy-only");
    expect(result.sources.BOOT_PROCESS_TOKEN).toBe("process");
    expect(result.sources.BOOT_USER_TOKEN).toBe("user_env");
    expect(result.sources.BOOT_PROJECT_TOKEN).toBe("project_env");
    expect(result.sources.BOOT_BOTH_TOKEN).toBe("project_env");
    expect(result.sources.BOOT_LEGACY_TOKEN).toBe("legacy_env");
    expect(result.keysLoadedFromLegacy).toContain("BOOT_LEGACY_TOKEN");
  });

  test("re-entry keeps process attribution when project file also defines the key", () => {
    trackEnv("BOOT_PROCESS_TOKEN", "from-process");
    fs.writeFileSync(
      path.join(tmpDir, ".env.kibi"),
      "BOOT_PROCESS_TOKEN=from-project\n",
    );
    const first = bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    expect(first.sources.BOOT_PROCESS_TOKEN).toBe("process");
    expect(process.env.BOOT_PROCESS_TOKEN).toBe("from-process");

    const second = bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    expect(second.sources.BOOT_PROCESS_TOKEN).toBe("process");
    expect(process.env.BOOT_PROCESS_TOKEN).toBe("from-process");
    expect(secretSourceFromBootstrap("BOOT_PROCESS_TOKEN", second)).toBe("process");
  });

  test("blank project value does not overwrite user value", () => {
    writeUserEnv("BOOT_BLANK_TOKEN=user-value\n");
    fs.writeFileSync(path.join(tmpDir, ".env.kibi"), "BOOT_BLANK_TOKEN=\n");
    const result = bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    expect(process.env.BOOT_BLANK_TOKEN).toBe("user-value");
    expect(result.sources.BOOT_BLANK_TOKEN).toBe("user_env");
  });

  test("blank process value is unset and allows file fill", () => {
    trackEnv("BOOT_BLANK_TOKEN", "   ");
    writeUserEnv("BOOT_BLANK_TOKEN=from-user\n");
    const result = bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    expect(process.env.BOOT_BLANK_TOKEN).toBe("from-user");
    expect(result.sources.BOOT_BLANK_TOKEN).toBe("user_env");
  });

  test("user file works alone", () => {
    writeUserEnv("BOOT_USER_TOKEN=only-user\n");
    bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    expect(process.env.BOOT_USER_TOKEN).toBe("only-user");
    expect(
      inspectSecretSource("BOOT_USER_TOKEN", { xdgConfigHome: userConfigRoot }),
    ).toBe("user_env");
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
    fs.writeFileSync(path.join(tmpDir, ".env.kibi"), "BOOT_PROJECT_TOKEN=default\n");
    fs.writeFileSync(path.join(tmpDir, "custom.env"), "BOOT_PROJECT_TOKEN=custom\n");
    trackEnv("KIBI_ENV_FILE", "custom.env");
    bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    expect(process.env.BOOT_PROJECT_TOKEN).toBe("custom");
    expect(
      inspectSecretSource("BOOT_PROJECT_TOKEN", {
        startDir: tmpDir,
        xdgConfigHome: userConfigRoot,
      }),
    ).toBe("project_env");
  });

  test("legacy .env fills only gaps and attributes legacy_env", () => {
    writeUserEnv("BOOT_USER_TOKEN=user\n");
    fs.writeFileSync(
      path.join(tmpDir, ".env"),
      "BOOT_USER_TOKEN=legacy-user\nBOOT_LEGACY_TOKEN=legacy\n",
    );
    const result = bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    expect(process.env.BOOT_USER_TOKEN).toBe("user");
    expect(process.env.BOOT_LEGACY_TOKEN).toBe("legacy");
    expect(result.sources.BOOT_LEGACY_TOKEN).toBe("legacy_env");
  });

  test("serialized diagnostics never contain secret values", () => {
    writeUserEnv("SECRET_KEY=super-secret-value\n");
    const result = bootstrapKibiEnvironment({
      startDir: tmpDir,
      xdgConfigHome: userConfigRoot,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("super-secret-value");
    expect(
      inspectSecretSource("SECRET_KEY", { xdgConfigHome: userConfigRoot }),
    ).toBe("user_env");
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
