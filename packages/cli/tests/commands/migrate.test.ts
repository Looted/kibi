import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
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

function writeLegacyGranularityFixture(root: string): void {
  mkdirSync(path.join(root, "src"), { recursive: true });
  mkdirSync(path.join(root, "documentation"), { recursive: true });
  writeFileSync(
    path.join(root, "src", "greet.ts"),
    `export function greet() {
  return "hello";
}
`,
    "utf8",
  );
  writeFileSync(
    path.join(root, "documentation", "symbols.yaml"),
    `symbols:
  - id: SYM-GREET-FILE
    title: greet.ts
    sourceFile: src/greet.ts
    links:
      - REQ-GREET
    status: active
`,
    "utf8",
  );
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

  test("reports missing .kb directory as a migration error", () => {
    rmSync(path.join(tmpDir, ".kb"), { recursive: true, force: true });

    const result = runKibi(["migrate"], tmpDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing .kb/ directory");
  });

  test("reports missing config file as a migration error", () => {
    rmSync(path.join(tmpDir, ".kb", "config.json"), { force: true });

    const result = runKibi(["migrate"], tmpDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing .kb/config.json");
  });

  test("reports invalid JSON config as a migration error", () => {
    writeFileSync(path.join(tmpDir, ".kb", "config.json"), "{ nope", "utf8");

    const result = runKibi(["migrate"], tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Invalid .kb/config.json");
  });

  test("reports non-object JSON config as a migration error", () => {
    writeFileSync(path.join(tmpDir, ".kb", "config.json"), "[]", "utf8");

    const result = runKibi(["migrate"], tmpDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must contain a JSON object");
  });

  test("rejects config schema versions newer than the CLI", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const config = readJson(configPath);
    writeFileSync(
      configPath,
      `${JSON.stringify({ ...config, schemaVersion: 999 }, null, 2)}\n`,
      "utf8",
    );

    const result = runKibi(["migrate", "--yes"], tmpDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unsupported schemaVersion 999");
  });

  test("formats invalid schema versions in dry-run output", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const config = readJson(configPath);
    writeFileSync(
      configPath,
      `${JSON.stringify({ ...config, schemaVersion: "not-a-number" }, null, 2)}\n`,
      "utf8",
    );

    const result = runKibi(["migrate", "--dry-run"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('schemaVersion from invalid ("not-a-number")');
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

  test("dry-run reports legacy coarse symbol migration without writing files", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const symbolsPath = path.join(tmpDir, "documentation", "symbols.yaml");
    const config = readJson(configPath);
    writeFileSync(
      configPath,
      `${JSON.stringify({ ...config, schemaVersion: 1 }, null, 2)}\n`,
      "utf8",
    );
    writeLegacyGranularityFixture(tmpDir);
    const beforeSymbols = readFileSync(symbolsPath, "utf8");

    const result = runKibi(["migrate", "--dry-run"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("schemaVersion from 1");
    expect(result.stdout).toContain("would mark 1 legacy coarse symbol");
    expect(readFileSync(symbolsPath, "utf8")).toBe(beforeSymbols);
  });

  test("--yes marks existing coarse symbols as legacy links", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const symbolsPath = path.join(tmpDir, "documentation", "symbols.yaml");
    const auditPath = path.join(tmpDir, ".kb", "migrations", "main.json");
    const config = readJson(configPath);
    writeFileSync(
      configPath,
      `${JSON.stringify({ ...config, schemaVersion: 1 }, null, 2)}\n`,
      "utf8",
    );
    writeLegacyGranularityFixture(tmpDir);

    const result = runKibi(["migrate", "--yes"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Marked 1 existing coarse symbol");
    expect(readFileSync(symbolsPath, "utf8")).toContain(
      "granularity_reason: legacy-link",
    );
    const audit = readJson(auditPath);
    expect(audit.symbolGranularityLegacyLinks).toBe(1);
  });

  test("skips symbol granularity migration when symbols path is not a string", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const config = readJson(configPath);
    writeFileSync(
      configPath,
      `${JSON.stringify(
        { ...config, schemaVersion: 1, paths: { symbols: null } },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = runKibi(["migrate", "--dry-run"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("legacy coarse symbol");
  });

  test("skips symbol granularity migration for malformed manifests and already-reasoned symbols", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const symbolsPath = path.join(tmpDir, "documentation", "symbols.yaml");
    const config = readJson(configPath);
    writeFileSync(
      configPath,
      `${JSON.stringify({ ...config, schemaVersion: 1 }, null, 2)}\n`,
      "utf8",
    );
    mkdirSync(path.dirname(symbolsPath), { recursive: true });
    writeFileSync(
      symbolsPath,
      [
        "symbols:",
        "  - null",
        "  - id: SYM-NO-SOURCE",
        "    title: noSource",
        "  - id: SYM-NO-TITLE",
        "    sourceFile: src/missing.ts",
        "  - title: noId",
        "    sourceFile: src/missing.ts",
        "  - id: SYM-REASONED",
        "    title: reasoned",
        "    sourceFile: src/missing.ts",
        "    granularity_reason: legacy-link",
        "    links:",
        "      - REQ-REASONED",
        "  - id: SYM-NO-TRACE",
        "    title: noTrace",
        "    sourceFile: src/missing.ts",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = runKibi(["migrate", "--dry-run"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("legacy coarse symbol");
  });

  test("--yes marks semantic advisor backfill pending for schema v2 configs", () => {
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const auditPath = path.join(tmpDir, ".kb", "migrations", "main.json");
    const config = readJson(configPath);
    writeFileSync(
      configPath,
      `${JSON.stringify(
        {
          ...config,
          schemaVersion: 2,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = runKibi(["migrate", "--yes"], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("semantic advisor backfill as pending");

    const migratedConfig = readJson(configPath);
    expect(migratedConfig.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    expect(migratedConfig.semanticAdvisorBackfill).toBe("pending");

    const audit = readJson(auditPath);
    expect(audit.fromVersion).toBe(2);
    expect(audit.toVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    expect(audit.semanticAdvisorBackfill).toBe("pending");
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
