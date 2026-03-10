import assert from "node:assert";
import { after, before, describe, it } from "node:test";
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

describe("CLI E2E: Install and Basic Commands", () => {
  let tarballs: Tarballs;
  let sandbox: TestSandbox;
  let hasProlog = false;

  before(
    async () => {
      // Check prerequisites
      hasProlog = checkPrologAvailable();
      if (!hasProlog) {
        console.warn("⚠️  SWI-Prolog not available, skipping E2E tests");
        return;
      }

      // Pack all packages
      tarballs = await packAll();

      // Create isolated sandbox
      sandbox = createSandbox();

      // Install packages
      await sandbox.install(tarballs);

      // Initialize git repo
      await sandbox.initGitRepo();
    },
    { timeout: 120000 },
  );

  after(
    async () => {
      if (sandbox) {
        await sandbox.cleanup();
      }
    },
    { timeout: 120000 },
  );

  it("should install kibi-cli and show version", async () => {
    if (!hasProlog) return;

    const { stdout, exitCode } = await kibi(sandbox, ["--version"]);

    assert.strictEqual(exitCode, 0, "kibi --version should succeed");
    assert.match(stdout, /\d+\.\d+\.\d+/, "Version should be semantic");
    console.log("  ✓ Version:", stdout.trim());
  });

  it("should run kibi doctor before init (diagnostic mode)", async () => {
    if (!hasProlog) return;

    const { stdout, stderr, exitCode } = await kibi(sandbox, ["doctor"]);

    // doctor should run but may fail because .kb/ doesn't exist yet
    // We just verify it executes and produces output
    const output = stdout + stderr;
    assert.ok(output.length > 0, "doctor should produce output");

    // Should mention SWI-Prolog check
    assert.ok(
      output.includes("SWI-Prolog") || output.includes("prolog"),
      "doctor should check for SWI-Prolog",
    );

    console.log("  ✓ Doctor ran successfully (diagnostic output captured)");
  });

  it("should initialize kibi with hooks", async () => {
    if (!hasProlog) return;

    // Hooks are installed by default, no --hooks flag needed
    const { stdout, exitCode } = await kibi(sandbox, ["init"]);

    assert.strictEqual(exitCode, 0, "kibi init should succeed");
    assert.ok(
      stdout.includes("✓") || stdout.includes("success"),
      "Init should show success indicators",
    );

    console.log("  ✓ Kibi initialized with hooks");
  });

  it("should pass kibi doctor after init", async () => {
    if (!hasProlog) return;

    const { stdout, exitCode } = await kibi(sandbox, ["doctor"]);

    assert.strictEqual(exitCode, 0, "doctor should pass after init");
    assert.ok(
      stdout.includes("passed") ||
        stdout.includes("✓") ||
        stdout.includes("All checks"),
      "doctor should report success",
    );

    console.log("  ✓ Doctor passes after init");
  });

  it("should sync entities from markdown files", async () => {
    if (!hasProlog) return;

    // Create test markdown files
    createMarkdownFile(
      sandbox,
      "documentation/requirements/REQ-001.md",
      {
        id: "REQ-001",
        title: "Test requirement",
        status: "open",
        tags: ["test"],
      },
      "This is a test requirement for E2E validation.",
    );

    createMarkdownFile(
      sandbox,
      "documentation/scenarios/SCEN-001.md",
      {
        id: "SCEN-001",
        title: "Test scenario",
        status: "draft",
      },
      "Given a test setup\nWhen something happens\nThen result occurs",
    );

    // Run sync
    const { stdout, exitCode } = await kibi(sandbox, ["sync"]);

    assert.strictEqual(exitCode, 0, "sync should succeed");
    assert.ok(
      stdout.includes("Imported") || stdout.includes("✓"),
      "sync should report import success",
    );

    console.log("  ✓ Sync imported entities");
  });

  it("should query entities after sync", async () => {
    if (!hasProlog) return;

    const { stdout, exitCode } = await kibi(sandbox, ["query", "req"]);

    assert.strictEqual(exitCode, 0, "query should succeed");
    assert.ok(
      stdout.includes("REQ-001") || stdout.includes("Test requirement"),
      "query should show the requirement",
    );

    console.log("  ✓ Query returned entities");
  });

  it("should run kibi check after sync", async () => {
    if (!hasProlog) return;

    // Run check with extended timeout - should complete successfully
    const { stdout, stderr, exitCode } = await kibi(sandbox, ["check"], {
      timeoutMs: 60000,
    });

    // Check should pass (exit code 0) or report violations (exit code 1)
    // Either is acceptable - we just need it to complete without timeout
    const output = stdout + stderr;
    assert.ok(
      exitCode === 0 || exitCode === 1,
      `check should complete with exit code 0 or 1, got ${exitCode}. Output: ${output}`,
    );

    // Should produce output (either success message or violations)
    assert.ok(output.length > 0, "check should produce output");

    if (exitCode === 0) {
      assert.ok(
        output.includes("No violations") || output.includes("✓"),
        "Successful check should indicate no violations",
      );
    }

    console.log(`  ✓ Check completed (exit code: ${exitCode})`);
  });

  it("should have created .kb directory structure", async () => {
    if (!hasProlog) return;

    // Check .kb directory exists
    const { exitCode: kbExists } = await run("test", ["-d", ".kb"], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });

    assert.strictEqual(kbExists, 0, ".kb directory should exist");

    // Check branch-specific KB exists
    const { exitCode: branchExists } = await run(
      "test",
      ["-d", ".kb/branches/develop"],
      { cwd: sandbox.repoDir, env: sandbox.env },
    );

    assert.strictEqual(branchExists, 0, ".kb/branches/develop should exist");

    console.log("  ✓ KB directory structure validated");
  });
});
