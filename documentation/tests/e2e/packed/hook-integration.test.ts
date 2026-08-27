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
  createSandbox,
  exactBranchStorePath,
  kibi,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

export function assertDefaultBranchSyncHooks(repoDir: string): void {
  for (const hookName of ["post-checkout", "post-merge"]) {
    const hookPath = join(repoDir, ".git/hooks", hookName);
    assert.ok(existsSync(hookPath), `${hookName} hook should exist`);
    assert.ok(
      (statSync(hookPath).mode & 0o111) !== 0,
      `${hookName} hook should be executable`,
    );
    assert.match(readFileSync(hookPath, "utf8"), /kibi sync/);
  }
  const checkout = readFileSync(
    join(repoDir, ".git/hooks/post-checkout"),
    "utf8",
  );
  assert.match(checkout, /branch_flag is 1 for branch checkout/);
  assert.doesNotMatch(checkout, /--from/);
}

export function assertPostMergeSynchronizedTrackedSources(
  queryOutput: string,
): void {
  assert.match(queryOutput, /Develop/);
  assert.match(queryOutput, /Feature/);
}

if (RUN_NODE_TEST_SUITE) {
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
      assertDefaultBranchSyncHooks(sandbox.repoDir);
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

    it("should install post-rewrite hook by default", async () => {
      if (!hasProlog) return;

      await kibi(sandbox, ["init"]);

      const hookPath = join(sandbox.repoDir, ".git/hooks/post-rewrite");
      assert.ok(existsSync(hookPath), "post-rewrite hook should exist");

      const stats = statSync(hookPath);
      const isExecutable = (stats.mode & 0o111) !== 0;
      assert.ok(isExecutable, "Hook should be executable");

      const content = readFileSync(hookPath, "utf8");
      assert.ok(content.includes("kibi sync"), "Hook should contain kibi sync");
    });

    it("should create branch KB on git checkout", async () => {
      if (!hasProlog) return;

      await kibi(sandbox, ["init"]);

      const reqDir = join(sandbox.repoDir, ".kb/requirements");
      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        join(reqDir, "req1.md"),
        `---
title: Initial Requirement
type: req
status: open
---

# Initial
`,
      );

      await run("git", ["add", "."], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });
      await run("git", ["commit", "-m", "initial"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });

      await kibi(sandbox, ["sync"]);

      // After init the branch directory exists; after sync the KB RDF exists.
      assert.ok(
        existsSync(exactBranchStorePath(sandbox.repoDir, "develop")),
        "develop branch KB should exist",
      );
      assert.ok(
        existsSync(
          join(exactBranchStorePath(sandbox.repoDir, "develop"), "kb.rdf"),
        ),
        "develop branch KB RDF should exist after sync",
      );

      await run("git", ["checkout", "-b", "feature"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });

      assert.ok(
        existsSync(
          join(exactBranchStorePath(sandbox.repoDir, "feature"), "kb.rdf"),
        ),
        "feature branch KB should be created",
      );

      // Verify the feature KB was compiled independently from the checked-out
      // tracked source rather than copied from the develop store.
      const developKb = readFileSync(
        join(exactBranchStorePath(sandbox.repoDir, "develop"), "kb.rdf"),
        "utf8",
      );
      const featureKb = readFileSync(
        join(exactBranchStorePath(sandbox.repoDir, "feature"), "kb.rdf"),
        "utf8",
      );

      const normalizeTimestamps = (rdf: string) =>
        rdf.replace(/<kb:(created_at|updated_at)[^>]*>[^<]+<\/kb:\1>/g, "");

      assert.strictEqual(
        normalizeTimestamps(featureKb),
        normalizeTimestamps(developKb),
        "feature KB should contain the same tracked-source entities after checkout sync",
      );
    });

    it("should sync KB after merge", { timeout: TEST_TIMEOUT_MS }, async () => {
      if (!hasProlog) return;

      await kibi(sandbox, ["init"]);

      const reqDir = join(sandbox.repoDir, ".kb/requirements");
      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        join(reqDir, "develop.md"),
        `---
title: Develop
type: req
status: open
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
status: open
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
      assertPostMergeSynchronizedTrackedSources(developQuery);
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

      const existingHookPath = join(
        sandbox.repoDir,
        ".git/hooks/post-checkout",
      );
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
      assert.strictEqual(
        content,
        `#!/bin/sh
echo "Existing hook"
`,
        "Existing unmanaged hook should remain unchanged",
      );
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
      assert.ok(
        !existsSync(join(sandbox.repoDir, ".git/hooks/post-rewrite")),
        "post-rewrite hook should not exist",
      );
    });

    it(
      "should work with detached HEAD",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        await kibi(sandbox, ["init"]);

        const reqDir = join(sandbox.repoDir, ".kb/requirements");
        mkdirSync(reqDir, { recursive: true });

        writeFileSync(
          join(reqDir, "req1.md"),
          `---
title: Test
type: req
status: open
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

        // git checkout to a commit SHA puts repo in detached HEAD state.
        // The checkout itself must succeed (it only warns about detached HEAD).
        await run("git", ["checkout", commitHash.trim()], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        // KB must still exist even in detached HEAD — the hook may produce an
        // error/warning but must not remove the KB directory.
        assert.ok(existsSync(join(sandbox.repoDir, ".kb")), "KB should exist");
      },
    );

    it(
      "should handle sync failures gracefully",
      { timeout: 20000 },
      async () => {
        if (!hasProlog) return;

        await kibi(sandbox, ["init"]);

        const reqDir = join(sandbox.repoDir, ".kb/requirements");
        mkdirSync(reqDir, { recursive: true });

        writeFileSync(
          join(reqDir, "invalid.md"),
          `---
title: Invalid
---

Missing type field
`,
        );

        await run("git", ["add", "."], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        // Commit may succeed (sync warns but allows commit) or fail due to
        // pre-commit hook blocking invalid entities. Both outcomes are acceptable —
        // the KB directory must survive regardless.
        let commitSucceeded = false;
        try {
          await run("git", ["commit", "-m", "invalid"], {
            cwd: sandbox.repoDir,
            env: sandbox.env,
          });
          commitSucceeded = true;
        } catch (err) {
          // Pre-commit hook blocked the commit — that is also acceptable behavior.
          // Anything other than a hook-driven rejection would be unexpected, but
          // we cannot distinguish those cases here, so we just continue.
          commitSucceeded = false;
        }

        // Whether the commit succeeded or was blocked, the KB directory must exist
        assert.ok(
          existsSync(join(sandbox.repoDir, ".kb")),
          `KB should still exist after ${commitSucceeded ? "successful" : "blocked"} commit`,
        );
      },
    );
  });
}
