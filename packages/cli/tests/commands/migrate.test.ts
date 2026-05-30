import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");

interface KibiResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runKibi(args: string[], cwd: string): KibiResult {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function initializeGitRepo(cwd: string): void {
  spawnSync("git", ["init", "-b", "main"], { cwd, encoding: "utf8" });
  spawnSync("git", ["config", "user.email", "test@example.com"], {
    cwd,
    encoding: "utf8",
  });
  spawnSync("git", ["config", "user.name", "Kibi Test"], {
    cwd,
    encoding: "utf8",
  });
  spawnSync("git", ["commit", "--allow-empty", "-m", "init"], {
    cwd,
    encoding: "utf8",
  });
}

function removeSchemaVersion(configPath: string): string {
  const config = JSON.parse(readFileSync(configPath, "utf8")) as {
    schemaVersion?: unknown;
    [key: string]: unknown;
  };

  const { schemaVersion: _schemaVersion, ...legacyConfig } = config;
  const serialized = JSON.stringify(legacyConfig, null, 2);
  writeFileSync(configPath, serialized, "utf8");
  return serialized;
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

describe("kibi migrate", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-migrate-"));
    initializeGitRepo(tmpDir);

    const initResult = runKibi(["init", "--no-hooks"], tmpDir);
    expect(initResult.status).toBe(0);
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("dry-run reports schema migration without writing files", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const auditPath = path.join(tmpDir, ".kb", "migrations", "main.json");
    const beforeConfig = removeSchemaVersion(configPath);

    const result = runKibi(["migrate", "--dry-run"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("schemaVersion");
    expect(result.stdout).toContain("dry run");
    expect(readFileSync(configPath, "utf8")).toBe(beforeConfig);
    expect(existsSync(auditPath)).toBe(false);
  });

  test("without --yes warns and exits 0 without writing files", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const auditPath = path.join(tmpDir, ".kb", "migrations", "main.json");
    const beforeConfig = removeSchemaVersion(configPath);

    const result = runKibi(["migrate"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      `Warning: Migration required for ${path.join(".kb", "config.json")}.`,
    );
    expect(result.stdout).toContain("No changes applied.");
    expect(result.stdout).toContain(
      "Use --dry-run to preview or --yes to apply the migration.",
    );
    expect(readFileSync(configPath, "utf8")).toBe(beforeConfig);
    expect(existsSync(auditPath)).toBe(false);
  });

  test("--yes upgrades legacy config and writes migration audit metadata", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const auditPath = path.join(tmpDir, ".kb", "migrations", "main.json");

    removeSchemaVersion(configPath);

    const result = runKibi(["migrate", "--yes"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Migrated");
    expect(result.stdout).toContain("schemaVersion");

    const config = readJson(configPath);
    expect(config.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);

    expect(existsSync(auditPath)).toBe(true);
    const audit = readJson(auditPath);
    expect(audit.fromVersion).toBeNull();
    expect(audit.toVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    expect(audit.branch).toBe("main");
    expect(audit.migratedAt).toEqual(expect.any(String));
    expect(audit.warning).toEqual(expect.any(String));
  });

  test("second --yes run is a no-op", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const auditPath = path.join(tmpDir, ".kb", "migrations", "main.json");

    removeSchemaVersion(configPath);

    const firstRun = runKibi(["migrate", "--yes"], tmpDir);
    expect(firstRun.status).toBe(0);

    const configBefore = readFileSync(configPath, "utf8");
    const auditBefore = readFileSync(auditPath, "utf8");
    const auditMtimeBefore = statSync(auditPath).mtimeMs;

    const secondRun = runKibi(["migrate", "--yes"], tmpDir);

    expect(secondRun.status).toBe(0);
    expect(secondRun.stdout).toContain("No migration needed");
    expect(secondRun.stdout).toContain(
      `already at schemaVersion ${LATEST_KB_SCHEMA_VERSION}`,
    );
    expect(readFileSync(configPath, "utf8")).toBe(configBefore);
    expect(readFileSync(auditPath, "utf8")).toBe(auditBefore);
    expect(statSync(auditPath).mtimeMs).toBe(auditMtimeBefore);
  });
});
