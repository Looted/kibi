import assert from "node:assert";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";

describe("E2E: Init-Sync-Check Workflow", () => {
  const TEST_TIMEOUT_MS = 120000;
  let tarballs: Tarballs;
  let sandbox: TestSandbox;
  let hasProlog = false;

  before(
    async () => {
      hasProlog = checkPrologAvailable();
      if (!hasProlog) {
        console.warn("⚠️  SWI-Prolog not available, skipping workflow tests");
        return;
      }

      tarballs = await packAll();
    },
    { timeout: 120000 },
  );

  beforeEach(
    async () => {
      if (!hasProlog) return;
      sandbox = createSandbox();
      await sandbox.install(tarballs);
      await sandbox.initGitRepo();
    },
    { timeout: 120000 },
  );

  afterEach(
    async () => {
      if (sandbox) {
        await sandbox.cleanup();
      }
    },
    { timeout: 120000 },
  );

  it("should init creates .kb structure", async () => {
    if (!hasProlog) return;

    const { stdout } = await kibi(sandbox, ["init"]);

    assert.ok(
      stdout.includes("initialized") || stdout.includes("success"),
      "Should indicate success",
    );

    assert.ok(existsSync(join(sandbox.repoDir, ".kb")), ".kb should exist");
    assert.ok(
      existsSync(join(sandbox.repoDir, ".kb/config.json")),
      "config.json should exist",
    );
    assert.ok(
      existsSync(join(sandbox.repoDir, ".kb/branches/develop")),
      "develop branch should exist",
    );

    const config = JSON.parse(
      readFileSync(join(sandbox.repoDir, ".kb/config.json"), "utf8"),
    );
    assert.ok(config.paths);
    assert.strictEqual(config.paths.requirements, "documentation/requirements");
    assert.strictEqual(config.paths.scenarios, "documentation/scenarios");
  });

  it("should sync imports entities from documents", async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init"]);

    const reqDir = join(sandbox.repoDir, "requirements");
    const scenarioDir = join(sandbox.repoDir, "scenarios");
    mkdirSync(reqDir, { recursive: true });
    mkdirSync(scenarioDir, { recursive: true });

    createMarkdownFile(
      sandbox,
      "requirements/req1.md",
      {
        title: "User Login",
        type: "req",
        status: "approved",
        tags: ["auth", "security"],
        owner: "alice",
      },
      "System must authenticate users via OAuth2.",
    );

    createMarkdownFile(
      sandbox,
      "scenarios/login.md",
      {
        title: "Login Flow",
        type: "scenario",
        status: "active",
        tags: ["auth"],
      },
      "User clicks login button and authenticates with provider.",
    );

    const { stdout } = await kibi(sandbox, ["sync"]);

    assert.ok(stdout.includes("Imported") || stdout.includes("✓"));
    assert.ok(/\d+ entities/.test(stdout));

    assert.ok(
      existsSync(join(sandbox.repoDir, ".kb/branches/develop/kb.rdf")),
      "RDF file should be created",
    );
  });

  it("should query returns synced entities", { timeout: 20000 }, async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init"]);

    createMarkdownFile(
      sandbox,
      "requirements/req-auth.md",
      {
        id: "req-auth",
        title: "Authentication Required",
        type: "req",
        status: "approved",
        tags: ["security"],
      },
      "All API endpoints require authentication.",
    );

    await kibi(sandbox, ["sync"]);

    const { stdout } = await kibi(sandbox, ["query", "req"]);

    assert.ok(stdout.includes("Authentication Required"));
    assert.ok(stdout.includes("security"));
  });

  it(
    "should check validates KB with no violations",
    { timeout: 20000 },
    async () => {
      if (!hasProlog) return;

      await kibi(sandbox, ["init"]);

      createMarkdownFile(
        sandbox,
        "requirements/valid-req.md",
        {
          title: "Valid Requirement",
          type: "req",
          status: "approved",
          tags: ["feature"],
          owner: "bob",
        },
        "This requirement has all required fields.",
      );

      await kibi(sandbox, ["sync"]);

      const { stdout, stderr, exitCode } = await kibi(sandbox, ["check"]);
      const output = stdout + stderr;

      assert.strictEqual(exitCode, 0);
      assert.ok(
        output.includes("No violations") || output.includes("KB is valid"),
        `Expected no violations, got: ${output}`,
      );
    },
  );

  it("should idempotent sync does not duplicate entities", async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init"]);

    createMarkdownFile(
      sandbox,
      "requirements/req1.md",
      {
        title: "Test Requirement",
        type: "req",
        status: "draft",
      },
      "Content.",
    );

    const firstSync = await kibi(sandbox, ["sync"]);
    const firstMatch = firstSync.stdout.match(/Imported (\d+) entities/);
    const firstCount = firstMatch?.[1] ? Number.parseInt(firstMatch[1]) : 0;
    assert.ok(firstCount > 0, "First sync should import entities");

    const secondSync = await kibi(sandbox, ["sync"]);
    const secondMatch = secondSync.stdout.match(/Imported (\d+) entities/);
    const secondCount = secondMatch?.[1] ? Number.parseInt(secondMatch[1]) : 0;

    assert.strictEqual(
      secondCount,
      0,
      "Second sync should report 0 new imports (cache hit)",
    );
  });

  it(
    "should query with ID filter returns specific entity",
    { timeout: 20000 },
    async () => {
      if (!hasProlog) return;

      await kibi(sandbox, ["init"]);

      createMarkdownFile(
        sandbox,
        "requirements/req-auth.md",
        {
          id: "req-auth",
          title: "Auth Requirement",
          type: "req",
          status: "approved",
          tags: ["auth", "security"],
        },
        "# Auth",
      );

      createMarkdownFile(
        sandbox,
        "requirements/req-perf.md",
        {
          id: "req-perf",
          title: "Performance Requirement",
          type: "req",
          status: "approved",
          tags: ["performance"],
        },
        "# Performance",
      );

      await kibi(sandbox, ["sync"]);

      const { stdout } = await kibi(sandbox, [
        "query",
        "req",
        "--id",
        "req-auth",
      ]);

      assert.ok(stdout.includes("Auth Requirement"));
      assert.ok(!stdout.includes("Performance Requirement"));
    },
  );

  it("should handle empty repository gracefully", async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init"]);

    const syncResult = await kibi(sandbox, ["sync"]);
    assert.ok(
      syncResult.stdout.includes("Imported 0 entities") ||
        syncResult.stdout.includes("0 entities"),
    );

    const { stdout } = await kibi(sandbox, ["query", "req"]);
    assert.ok(stdout.includes("[]") || stdout.includes("No entities"));
  });
});
