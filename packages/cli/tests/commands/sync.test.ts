import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { PrologProcess } from "../../src/prolog.js";

describe("kibi sync", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-sync-"));

    // Initialize KB structure
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // Create test fixtures
    const reqDir = path.join(tmpDir, "requirements");
    const scenarioDir = path.join(tmpDir, "scenarios");

    mkdirSync(reqDir, { recursive: true });
    mkdirSync(scenarioDir, { recursive: true });

    // Requirement document
    writeFileSync(
      path.join(reqDir, "req1.md"),
      `---
title: User Authentication
type: req
status: approved
tags: [security, auth]
owner: alice
links:
  - type: relates_to
    target: scenario1
---

# User Authentication

System must support OAuth2 authentication.
`,
    );

    // Scenario document
    writeFileSync(
      path.join(scenarioDir, "scenario1.md"),
      `---
title: Login Flow
status: active
tags: [auth]
---

# Login Flow

User logs in with OAuth2 provider.
`,
    );

    // Symbol manifest
    writeFileSync(
      path.join(tmpDir, "symbols.yaml"),
      `symbols:
  - title: authenticate()
    status: implemented
    tags: [auth]
  - title: logout()
    status: implemented
    tags: [auth]
`,
    );
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("imports entities from configured paths", async () => {
    const output = execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(output).toContain("Imported");
    expect(output).toMatch(/\d+ entities/);
    expect(output).toMatch(/\d+ relationships/);

    const kbPath = path.join(tmpDir, ".kb/branches/main");
    expect(existsSync(path.join(kbPath, "kb.rdf"))).toBe(true);
  });

  test("is idempotent (no duplicate entities on re-run)", async () => {
    const firstRun = execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    const firstMatch = firstRun.match(/Imported (\d+) entities/);
    const firstCount = firstMatch ? Number.parseInt(firstMatch[1]) : 0;
    expect(firstCount).toBeGreaterThan(0);

    const secondRun = execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    const secondMatch = secondRun.match(/Imported (\d+) entities/);
    const secondCount = secondMatch ? Number.parseInt(secondMatch[1]) : 0;

    // Same count = idempotent upsert worked
    expect(secondCount).toBe(firstCount);
  });

  test("handles missing paths gracefully", async () => {
    // Add non-existent path to config
    const configPath = path.join(tmpDir, ".kb/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    config.paths.nonexistent = "nonexistent/**/*.md";
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Should warn but not crash
    const output = execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(output).toContain("Imported");
    // No error exit code
  });

  test("extracts relationships from links", async () => {
    const output = execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(output).toMatch(/\d+ entities, \d+ relationships/);
  });

  test("reports entity and relationship counts", async () => {
    const output = execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(output).toMatch(/Imported \d+ entities, \d+ relationships/);

    const match = output.match(/Imported (\d+) entities, (\d+) relationships/);
    expect(match).toBeDefined();

    if (!match) throw new Error("Output format mismatch");

    const entityCount = Number.parseInt(match[1]);
    const relCount = Number.parseInt(match[2]);

    expect(entityCount).toBeGreaterThanOrEqual(0);
    expect(relCount).toBeGreaterThanOrEqual(0);
  });
});
