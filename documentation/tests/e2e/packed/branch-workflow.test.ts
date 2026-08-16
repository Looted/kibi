import assert from "node:assert";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

function branchKbPath(repoDir: string, branch: string): string {
  const key = createHash("sha256").update(branch).digest("hex");
  return join(repoDir, `.kb/branches/${key}`);
}

function stageSources(sandbox: TestSandbox): Promise<unknown> {
  return run("git", ["add", "documentation"], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
  });
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: Branch KB Workflow", () => {
    const TEST_TIMEOUT_MS = 30000;
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) {
          console.warn(
            "⚠️  SWI-Prolog not available, skipping branch workflow tests",
          );
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

    it(
      "should create separate KB for each branch",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        await kibi(sandbox, ["init", "--no-hooks"]);

        const reqDir = join(sandbox.repoDir, "documentation/requirements");
        mkdirSync(reqDir, { recursive: true });

        writeFileSync(
          join(reqDir, "develop-req.md"),
          `---
title: Develop Branch Requirement
type: req
status: open
---

# Develop Req
`,
        );

        await stageSources(sandbox);
        await kibi(sandbox, ["sync"]);

        await run("git", ["add", "."], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        await run("git", ["commit", "--no-verify", "-m", "initial"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        await run("git", ["checkout", "-b", "feature"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        writeFileSync(
          join(reqDir, "feature-req.md"),
          `---
title: Feature Branch Requirement
type: req
status: open
---

# Feature Req
`,
        );

        await stageSources(sandbox);
        await kibi(sandbox, ["sync"]);

        assert.ok(
          existsSync(join(branchKbPath(sandbox.repoDir, "develop"), "kb.rdf")),
          "develop KB should exist",
        );
        assert.ok(
          existsSync(join(branchKbPath(sandbox.repoDir, "feature"), "kb.rdf")),
          "feature KB should exist",
        );
      },
    );

    it(
      "should isolate branch KB from develop KB",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        await kibi(sandbox, ["init", "--no-hooks"]);

        const reqDir = join(sandbox.repoDir, "documentation/requirements");
        mkdirSync(reqDir, { recursive: true });

        writeFileSync(
          join(reqDir, "develop-only.md"),
          `---
title: Develop Only
type: req
status: open
---

# Develop Only
`,
        );

        await stageSources(sandbox);
        await kibi(sandbox, ["sync"]);

        await run("git", ["add", "."], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        await run("git", ["commit", "--no-verify", "-m", "develop commit"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        const { stdout: developQuery } = await kibi(sandbox, ["query", "req"]);
        assert.ok(developQuery.includes("develop-only"));

        await run("git", ["checkout", "-b", "feature"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        writeFileSync(
          join(reqDir, "feature-only.md"),
          `---
title: Feature Only
type: req
status: open
---

# Feature Only
`,
        );

        await stageSources(sandbox);
        await kibi(sandbox, ["sync"]);

        const { stdout: featureQuery } = await kibi(sandbox, ["query", "req"]);
        // Should show both: develop-only was committed before checkout and
        // feature-only was added on this branch
        assert.ok(
          featureQuery.includes("feature-only"),
          "feature branch should show feature-only entity",
        );
        assert.ok(
          featureQuery.includes("develop-only"),
          "feature branch should still show develop-only entity (both files exist here)",
        );

        await run("git", ["checkout", "develop"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        const { stdout: developQueryAfter } = await kibi(sandbox, [
          "query",
          "req",
        ]);
        assert.ok(developQueryAfter.includes("develop-only"));
        assert.ok(!developQueryAfter.includes("feature-only"));
      },
    );

    it(
      "should load correct KB when switching branches",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        await kibi(sandbox, ["init", "--no-hooks"]);

        const reqDir = join(sandbox.repoDir, "documentation/requirements");
        mkdirSync(reqDir, { recursive: true });

        writeFileSync(
          join(reqDir, "req1.md"),
          `---
title: Version 1
type: req
status: open
---

# V1
`,
        );

        await stageSources(sandbox);
        await kibi(sandbox, ["sync"]);

        await run("git", ["add", "."], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        await run("git", ["commit", "--no-verify", "-m", "v1"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        await run("git", ["checkout", "-b", "v2"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        writeFileSync(
          join(reqDir, "req1.md"),
          `---
title: Version 2
type: req
status: open
---

# V2
`,
        );

        await stageSources(sandbox);
        await kibi(sandbox, ["sync"]);

        const { stdout: v2Query } = await kibi(sandbox, ["query", "req"]);
        assert.ok(v2Query.includes("Version 2"));

        await run("git", ["checkout", "develop"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        const { stdout: developQuery } = await kibi(sandbox, ["query", "req"]);
        assert.ok(developQuery.includes("Version 1"));
        assert.ok(!developQuery.includes("Version 2"));
      },
    );

    it(
      "should create branch KB on first sync",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        await kibi(sandbox, ["init", "--no-hooks"]);

        writeFileSync(join(sandbox.repoDir, "README.md"), "# temp\n");
        await run("git", ["add", "."], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        await run("git", ["commit", "--no-verify", "-m", "init develop"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        await run("git", ["checkout", "-b", "new-feature"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        const reqDir = join(sandbox.repoDir, "documentation/requirements");
        mkdirSync(reqDir, { recursive: true });

        writeFileSync(
          join(reqDir, "feature-req.md"),
          `---
title: Feature Req
type: req
status: open
---

# Feature
`,
        );

        assert.ok(
          !existsSync(branchKbPath(sandbox.repoDir, "new-feature")),
          "Branch KB should not exist before sync",
        );

        await stageSources(sandbox);
        await kibi(sandbox, ["sync"]);

        assert.ok(
          existsSync(
            join(branchKbPath(sandbox.repoDir, "new-feature"), "kb.rdf"),
          ),
          "Branch KB should be created after sync",
        );
      },
    );

    it(
      "should delete branch document only from branch KB",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        await kibi(sandbox, ["init", "--no-hooks"]);

        const reqDir = join(sandbox.repoDir, "documentation/requirements");
        mkdirSync(reqDir, { recursive: true });

        writeFileSync(
          join(reqDir, "shared.md"),
          `---
title: Shared Requirement
type: req
status: open
---

# Shared
`,
        );

        await stageSources(sandbox);
        await kibi(sandbox, ["sync"]);

        await run("git", ["add", "."], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        await run("git", ["commit", "--no-verify", "-m", "add shared"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        await run("git", ["checkout", "-b", "feature"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        rmSync(join(reqDir, "shared.md"));

        await kibi(sandbox, ["sync"]);

        const { stdout: featureQuery } = await kibi(sandbox, ["query", "req"]);
        assert.ok(
          featureQuery.includes("No entities") || featureQuery.includes("[]"),
          "Feature branch should have no requirements",
        );

        await run("git", ["checkout", "develop"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        const { stdout: developQuery } = await kibi(sandbox, ["query", "req"]);
        assert.ok(
          developQuery.includes("shared"),
          "Develop should still have shared",
        );
      },
    );

    it(
      "should preserve both KBs after merge",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        await kibi(sandbox, ["init", "--no-hooks"]);

        const reqDir = join(sandbox.repoDir, "documentation/requirements");
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

        await stageSources(sandbox);
        await kibi(sandbox, ["sync"]);

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

        await kibi(sandbox, ["sync"]);

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

        await kibi(sandbox, ["sync"]);

        const { stdout: developQuery } = await kibi(sandbox, ["query", "req"]);
        assert.ok(developQuery.includes("Develop"));
        assert.ok(developQuery.includes("Feature"));

        assert.ok(
          existsSync(join(branchKbPath(sandbox.repoDir, "develop"), "kb.rdf")),
          "develop KB should exist",
        );
        assert.ok(
          existsSync(join(branchKbPath(sandbox.repoDir, "feature"), "kb.rdf")),
          "feature KB should still exist",
        );
      },
    );

    it(
      "should orphan branch creates independent KB",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        await kibi(sandbox, ["init", "--no-hooks"]);

        const reqDir = join(sandbox.repoDir, "documentation/requirements");
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

        await stageSources(sandbox);
        await kibi(sandbox, ["sync"]);

        await run("git", ["add", "."], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        await run("git", ["commit", "--no-verify", "-m", "develop"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        await run("git", ["checkout", "--orphan", "orphan"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        await run("git", ["rm", "-rf", "."], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        await kibi(sandbox, ["init", "--no-hooks"]);

        mkdirSync(reqDir, { recursive: true });

        writeFileSync(
          join(reqDir, "orphan.md"),
          `---
title: Orphan
type: req
status: open
---

# Orphan
`,
        );

        await stageSources(sandbox);
        const staged = await run("git", ["ls-files"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        assert.match(staged.stdout, /documentation\/requirements\/orphan\.md/);
        const syncResult = await kibi(sandbox, ["sync"]);
        assert.equal(syncResult.exitCode, 0, syncResult.stderr);
        assert.match(
          syncResult.stdout,
          /orphan|Imported|entities/i,
          syncResult.stdout,
        );

        const { stdout: orphanQuery } = await kibi(sandbox, ["query", "req"]);
        assert.ok(
          orphanQuery.includes("orphan"),
          `${syncResult.stdout}\n${orphanQuery}`,
        );
        assert.ok(
          !orphanQuery.includes("Develop"),
          `${syncResult.stdout}\n${orphanQuery}`,
        );
      },
    );
    it(
      "should compile an independent exact-branch KB via post-checkout hook",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        // Use real hooks so the post-checkout hook fires on branch creation
        await kibi(sandbox, ["init"]);

        const reqDir = join(sandbox.repoDir, "documentation/requirements");
        mkdirSync(reqDir, { recursive: true });

        writeFileSync(
          join(reqDir, "develop-req.md"),
          `---
title: Develop Seed
type: req
status: open
---

# Develop Seed
`,
        );

        await kibi(sandbox, ["sync"]);

        await run("git", ["add", "."], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        await run("git", ["commit", "-m", "seed develop"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        // The post-checkout hook fires here and compiles the exact feature
        // branch from the tracked checkout. It must not copy the develop store.
        await run("git", ["checkout", "-b", "feature-hook-copy"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        const featureKbPath = join(
          branchKbPath(sandbox.repoDir, "feature-hook-copy"),
          "kb.rdf",
        );
        assert.ok(
          existsSync(featureKbPath),
          "feature branch KB should be created by hook",
        );

        // The checkout contains the develop source, so the independent
        // feature store should already contain it without a cross-branch copy.
        const kbContent = readFileSync(featureKbPath, "utf8");
        assert.ok(kbContent.length > 0, "compiled KB should not be empty");
      },
    );
  });
}
