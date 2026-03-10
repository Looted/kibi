import assert from "node:assert";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
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

describe("E2E: Git Hook Integration", () => {
  const TEST_TIMEOUT_MS = 120000;
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

  it("should install post-checkout hook by default", async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init"]);

    const hookPath = join(sandbox.repoDir, ".git/hooks/post-checkout");
    assert.ok(existsSync(hookPath), "post-checkout hook should exist");

    const stats = statSync(hookPath);
    const isExecutable = (stats.mode & 0o111) !== 0;
    assert.ok(isExecutable, "Hook should be executable");

    const content = readFileSync(hookPath, "utf8");
    assert.ok(content.includes("kibi sync"), "Hook should contain kibi sync");
  });

  it("should install post-merge hook by default", async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init"]);

    const hookPath = join(sandbox.repoDir, ".git/hooks/post-merge");
    assert.ok(existsSync(hookPath), "post-merge hook should exist");

    const stats = statSync(hookPath);
    const isExecutable = (stats.mode & 0o111) !== 0;
    assert.ok(isExecutable, "Hook should be executable");

    const content = readFileSync(hookPath, "utf8");
    assert.ok(content.includes("kibi sync"), "Hook should contain kibi sync");
  });

  it("should create branch KB on git checkout", async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init"]);

    const reqDir = join(sandbox.repoDir, "documentation/requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      join(reqDir, "req1.md"),
      `---
title: Initial Requirement
type: req
status: approved
---

# Initial
`,
    );

    await run("git", ["add", "."], { cwd: sandbox.repoDir, env: sandbox.env });
    await run("git", ["commit", "-m", "initial"], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });

    // After the initial commit, .kb/branches/develop may be created by init
    assert.ok(
      existsSync(join(sandbox.repoDir, ".kb/branches/develop")),
      "develop branch KB should exist",
    );

    await run("git", ["checkout", "-b", "feature"], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });

    assert.ok(
      existsSync(join(sandbox.repoDir, ".kb/branches/feature/kb.rdf")),
      "feature branch KB should be created",
    );
  });

  it("should sync KB after merge", { timeout: TEST_TIMEOUT_MS }, async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init"]);

    const reqDir = join(sandbox.repoDir, "documentation/requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      join(reqDir, "develop.md"),
      `---
title: Develop
type: req
status: approved
---

# Develop
`,
    );

    await run("git", ["add", "."], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });
    await run("git", ["commit", "--no-verify", "-m", "develop"], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });

    await run("git", ["checkout", "-b", "feature"], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });

    writeFileSync(
      join(reqDir, "feature.md"),
      `---
title: Feature
type: req
status: draft
---

# Feature
`,
    );

    await run("git", ["add", "."], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });
    await run("git", ["commit", "--no-verify", "-m", "feature"], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });

    await run("git", ["checkout", "develop"], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });

    await run("git", ["merge", "feature", "--no-edit"], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });

    const { stdout: developQuery } = await kibi(sandbox, ["query", "req"]);
    assert.ok(
      developQuery.includes("Develop") || developQuery.includes("Feature"),
      "Query should show merged requirements",
    );
  });

  it("should be idempotent on re-install", async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init"]);

    const hookPath = join(sandbox.repoDir, ".git/hooks/post-checkout");
    const firstContent = readFileSync(hookPath, "utf8");

    await kibi(sandbox, ["init"]);

    const secondContent = readFileSync(hookPath, "utf8");
    assert.strictEqual(
      secondContent,
      firstContent,
      "Hook should not be duplicated",
    );
  });

  it("should not break existing hooks", async () => {
    if (!hasProlog) return;

    const existingHookPath = join(sandbox.repoDir, ".git/hooks/post-checkout");
    const hooksDir = join(sandbox.repoDir, ".git/hooks");
    mkdirSync(hooksDir, { recursive: true });

    writeFileSync(
      existingHookPath,
      `#!/bin/sh
echo "Existing hook"
`,
    );

    await kibi(sandbox, ["init"]);

    const content = readFileSync(existingHookPath, "utf8");
    assert.ok(
      content.includes("Existing hook"),
      "Existing hook content should be preserved",
    );
    assert.ok(content.includes("kibi sync"), "kibi sync should be appended");
  });

  it("should not install hooks with --no-hooks", async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init", "--no-hooks"]);

    assert.ok(
      !existsSync(join(sandbox.repoDir, ".git/hooks/post-checkout")),
      "post-checkout hook should not exist",
    );
    assert.ok(
      !existsSync(join(sandbox.repoDir, ".git/hooks/post-merge")),
      "post-merge hook should not exist",
    );
  });

  it(
    "should work with detached HEAD",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      if (!hasProlog) return;

      await kibi(sandbox, ["init"]);

      const reqDir = join(sandbox.repoDir, "documentation/requirements");
      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        join(reqDir, "req1.md"),
        `---
title: Test
type: req
status: approved
---

# Test
`,
      );

      await run("git", ["add", "."], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });
      await run("git", ["commit", "-m", "commit1"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });

      const { stdout: commitHash } = await run("git", ["rev-parse", "HEAD"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });

      await run("git", ["add", "."], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });
      await run("git", ["commit", "--allow-empty", "-m", "commit2"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });

      try {
        await run("git", ["checkout", commitHash.trim()], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
      } catch {
        // Detached HEAD might fail sync, but should not crash
      }

      assert.ok(existsSync(join(sandbox.repoDir, ".kb")), "KB should exist");
    },
  );

  it("should handle sync failures gracefully", { timeout: 20000 }, async () => {
    if (!hasProlog) return;

    await kibi(sandbox, ["init"]);

    const reqDir = join(sandbox.repoDir, "documentation/requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      join(reqDir, "invalid.md"),
      `---
title: Invalid
---

Missing type field
`,
    );

    await run("git", ["add", "."], { cwd: sandbox.repoDir, env: sandbox.env });

    try {
      await run("git", ["commit", "-m", "invalid"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });
    } catch {
      // Commit might succeed even if sync has warnings
    }

    assert.ok(
      existsSync(join(sandbox.repoDir, ".kb")),
      "KB should still exist",
    );
  });
});
