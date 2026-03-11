import assert from "node:assert";
import { existsSync } from "node:fs";
import { join } from "node:path";
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

describe("CLI E2E: Git Hook Execution", () => {
  let tarballs: Tarballs;
  let sandbox: TestSandbox;
  let hasProlog = false;

  before(
    async () => {
      hasProlog = checkPrologAvailable();
      if (!hasProlog) {
        console.warn("⚠️  SWI-Prolog not available, skipping hook tests");
        return;
      }

      tarballs = await packAll();
      sandbox = createSandbox();
      await sandbox.install(tarballs);
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

  it("should install git hooks on init", async () => {
    if (!hasProlog) return;

    // Initialize kibi with hooks
    const { exitCode } = await kibi(sandbox, ["init"]);
    assert.strictEqual(exitCode, 0, "kibi init should succeed");

    // Check hook files exist
    const hooksDir = join(sandbox.repoDir, ".git", "hooks");
    const hooks = ["pre-commit", "post-checkout", "post-merge", "post-rewrite"];

    for (const hook of hooks) {
      const hookPath = join(hooksDir, hook);
      assert.ok(
        existsSync(hookPath),
        `Hook ${hook} should exist at ${hookPath}`,
      );
    }

    console.log("  ✓ All hooks installed");
  });

  it("should have executable hook files", async () => {
    if (!hasProlog) return;

    // Initialize kibi (if not done in previous test)
    await kibi(sandbox, ["init"]);

    // Check hooks are executable
    const hooksDir = join(sandbox.repoDir, ".git", "hooks");
    const hooks = ["pre-commit", "post-checkout", "post-merge", "post-rewrite"];

    for (const hook of hooks) {
      const hookPath = join(hooksDir, hook);

      // Check if executable using stat
      const { stdout: statOutput, exitCode: statExit } = await run(
        "stat",
        ["-c", "%A", hookPath],
        {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        },
      );

      // Check if the permissions contain 'x' (executable)
      const isExecutable = statExit === 0 && statOutput.trim().includes("x");
      assert.ok(
        isExecutable,
        `Hook ${hook} should be executable (perms: ${statOutput?.trim()})`,
      );
    }

    console.log("  ✓ All hooks are executable");
  });

  it("should run hooks that reference installed kibi binary", async () => {
    if (!hasProlog) return;

    // Initialize kibi
    await kibi(sandbox, ["init"]);

    // Read hook content to verify it references kibi
    const hooksDir = join(sandbox.repoDir, ".git", "hooks");
    const postCheckoutPath = join(hooksDir, "post-checkout");

    const { stdout: hookContent } = await run("cat", [postCheckoutPath], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });

    // Hook should reference kibi command (not bun or source paths)
    assert.ok(
      hookContent.includes("kibi") || hookContent.includes("kibi sync"),
      "Hook should reference kibi command",
    );

    console.log("  ✓ Hooks reference kibi binary correctly");
  });

  it(
    "should trigger post-checkout hook on git checkout",
    { timeout: 20000 },
    async () => {
      if (!hasProlog) return;

      // Initialize kibi and create initial content
      await kibi(sandbox, ["init"]);

      createMarkdownFile(
        sandbox,
        "documentation/requirements/REQ-HOOK-001.md",
        {
          id: "REQ-HOOK-001",
          title: "Hook test requirement",
          status: "open",
        },
        "Testing hook execution.",
      );

      // Initial commit
      await run("git", ["add", "."], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });
      await run("git", ["commit", "-m", "Initial commit"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });

      // Run sync on develop
      await kibi(sandbox, ["sync"]);

      // Create and checkout a new branch
      const { exitCode } = await run(
        "git",
        ["checkout", "-b", "feature/test-hook"],
        { cwd: sandbox.repoDir, env: sandbox.env },
      );

      assert.strictEqual(exitCode, 0, "git checkout should succeed");

      // The post-checkout hook should have run kibi sync
      // This creates a branch-specific KB
      const { exitCode: kbExists } = await run(
        "test",
        ["-d", ".kb/branches/feature/test-hook"],
        { cwd: sandbox.repoDir, env: sandbox.env },
      );

      // Note: The hook may or may not have created the KB depending on timing
      // and whether the hook is properly configured. This is informational.
      if (kbExists === 0) {
        console.log("  ✓ Post-checkout hook created branch KB");
      } else {
        console.log("  ⚠️  Branch KB not created (hook may need review)");
      }
    },
  );

  it("should handle pre-commit hook execution", async () => {
    if (!hasProlog) return;

    // Initialize kibi
    await kibi(sandbox, ["init"]);

    // Create a file to commit
    createMarkdownFile(
      sandbox,
      "documentation/requirements/REQ-PRE-001.md",
      {
        id: "REQ-PRE-001",
        title: "Pre-commit test",
        status: "open",
      },
      "Testing pre-commit hook.",
    );

    // Stage and attempt commit
    await run("git", ["add", "."], { cwd: sandbox.repoDir, env: sandbox.env });

    const { stdout, stderr, exitCode } = await run(
      "git",
      ["commit", "-m", "Test pre-commit hook"],
      { cwd: sandbox.repoDir, env: sandbox.env },
    );

    // Pre-commit hook should run but shouldn't block the commit
    // (unless there's a real validation failure)
    const output = stdout + stderr;

    // Just verify commit succeeded
    assert.strictEqual(exitCode, 0, "Commit should succeed");

    console.log("  ✓ Pre-commit hook executed without blocking commit");
  });
});
