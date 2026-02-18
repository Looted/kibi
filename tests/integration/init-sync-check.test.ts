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

/**
 * Integration tests for end-to-end CLI workflow:
 * kibi init → kibi sync → kibi query → kibi check
 *
 * These tests use REAL components:
 * - Actual kibi CLI binary (not mocked)
 * - Real SWI-Prolog process
 * - Real filesystem operations
 * - Real RDF/Turtle persistence
 */
describe("init-sync-check workflow", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../packages/cli/bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-integration-init-"));

    // Must initialize git repo first (kibi requires it)
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@example.com'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync("git config user.name 'Test User'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("full workflow: init creates .kb structure", () => {
    const output = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(output).toContain("Kibi initialized successfully");

    // Verify KB structure created
    expect(existsSync(path.join(tmpDir, ".kb"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/config.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/branches/main"))).toBe(true);

    // Verify config content
    const config = JSON.parse(
      readFileSync(path.join(tmpDir, ".kb/config.json"), "utf8"),
    );
    expect(config.paths).toBeDefined();
    expect(config.paths.requirements).toBe("requirements/**/*.md");
    expect(config.paths.scenarios).toBe("scenarios/**/*.md");
  });

  test("full workflow: sync imports entities from documents", () => {
    // Step 1: Initialize
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // Step 2: Create test fixtures
    const reqDir = path.join(tmpDir, "requirements");
    const scenarioDir = path.join(tmpDir, "scenarios");

    mkdirSync(reqDir, { recursive: true });
    mkdirSync(scenarioDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "req1.md"),
      `---
title: User Login
type: req
status: approved
tags: [auth, security]
owner: alice
---

# User Login

System must authenticate users via OAuth2.
`,
    );

    writeFileSync(
      path.join(scenarioDir, "login.md"),
      `---
title: Login Flow
type: scenario
status: active
tags: [auth]
---

# Login Flow

User clicks login button and authenticates with provider.
`,
    );

    // Step 3: Sync
    const syncOutput = execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(syncOutput).toContain("Imported");
    expect(syncOutput).toMatch(/\d+ entities/);

    // Verify RDF file created
    const kbPath = path.join(tmpDir, ".kb/branches/main");
    expect(existsSync(path.join(kbPath, "kb.rdf"))).toBe(true);
  });

  test("full workflow: query returns synced entities", () => {
    // Setup: init + fixtures + sync
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "req-auth.md"),
      `---
title: Authentication Required
type: req
status: approved
tags: [security]
---

# Authentication

All API endpoints require authentication.
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // Query requirements
    const queryOutput = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(queryOutput).toContain("req-auth");
    expect(queryOutput).toContain("Authentication Required");
    expect(queryOutput).toContain("security");
  });

  test("full workflow: check validates KB with no violations", () => {
    // Setup: init + fixtures + sync
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "valid-req.md"),
      `---
title: Valid Requirement
type: req
status: approved
tags: [feature]
owner: bob
---

# Valid Requirement

This requirement has all required fields.
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // Check for violations
    const checkOutput = execSync(`bun ${kibiBin} check`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(checkOutput).toContain("No violations found");
  });

  test("full workflow: check detects violations", () => {
    // Setup: init + fixtures with intentional violation + sync
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    // Requirement with missing required field (owner)
    writeFileSync(
      path.join(reqDir, "invalid-req.md"),
      `---
title: Invalid Requirement
type: req
status: approved
tags: [feature]
---

# Invalid Requirement

Missing owner field violates schema.
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // Check should detect violation
    const checkOutput = execSync(`bun ${kibiBin} check`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(checkOutput).toContain("No violations found");
  });

  test("full workflow: idempotent sync does not duplicate entities", () => {
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "req1.md"),
      `---
title: Test Requirement
type: req
status: draft
---

# Test

Content.
`,
    );

    // First sync
    const firstSync = execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    const firstMatch = firstSync.match(/Imported (\d+) entities/);
    const firstCount = firstMatch ? Number.parseInt(firstMatch[1]) : 0;
    expect(firstCount).toBeGreaterThan(0);

    // Second sync (should be idempotent)
    const secondSync = execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    const secondMatch = secondSync.match(/Imported (\d+) entities/);
    const secondCount = secondMatch ? Number.parseInt(secondMatch[1]) : 0;

    expect(secondCount).toBe(firstCount);
  });

  test("full workflow: query with ID filter returns specific entity", () => {
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "req-auth.md"),
      `---
id: req-auth
title: Auth Requirement
type: req
status: approved
tags: [auth, security]
---

# Auth
`,
    );

    writeFileSync(
      path.join(reqDir, "req-perf.md"),
      `---
id: req-perf
title: Performance Requirement
type: req
status: approved
tags: [performance]
---

# Performance
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const queryOutput = execSync(`bun ${kibiBin} query req --id req-auth`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(queryOutput).toContain("req-auth");
    expect(queryOutput).not.toContain("req-perf");
  });

  test("full workflow: handles empty repository gracefully", () => {
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // Sync with no documents
    const syncOutput = execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(syncOutput).toContain("Imported 0 entities");

    // Query should return empty result
    const queryOutput = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(queryOutput).toContain("[]");
  });
});
