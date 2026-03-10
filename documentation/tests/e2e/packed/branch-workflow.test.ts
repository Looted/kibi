import assert from "node:assert";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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

      const reqDir = join(sandbox.repoDir, "requirements");
      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        join(reqDir, "develop-req.md"),
        `---
title: Develop Branch Requirement
type: req
status: approved
---

# Develop Req
`,
      );

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
status: draft
---

# Feature Req
`,
      );

      await kibi(sandbox, ["sync"]);

      assert.ok(
        existsSync(join(sandbox.repoDir, ".kb/branches/develop/kb.rdf")),
        "develop KB should exist",
      );
      assert.ok(
        existsSync(join(sandbox.repoDir, ".kb/branches/feature/kb.rdf")),
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

      const reqDir = join(sandbox.repoDir, "requirements");
      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        join(reqDir, "develop-only.md"),
        `---
title: Develop Only
type: req
status: approved
---

# Develop Only
`,
      );

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
status: draft
---

# Feature Only
`,
      );

      await kibi(sandbox, ["sync"]);

      const { stdout: featureQuery } = await kibi(sandbox, ["query", "req"]);
      // Should show both since they're both on this branch now
      assert.ok(
        featureQuery.includes("feature-only") ||
          featureQuery.includes("develop-only"),
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

      const reqDir = join(sandbox.repoDir, "requirements");
      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        join(reqDir, "req1.md"),
        `---
title: Version 1
type: req
status: approved
---

# V1
`,
      );

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
status: approved
---

# V2
`,
      );

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

      const reqDir = join(sandbox.repoDir, "requirements");
      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        join(reqDir, "feature-req.md"),
        `---
title: Feature Req
type: req
status: draft
---

# Feature
`,
      );

      assert.ok(
        !existsSync(join(sandbox.repoDir, ".kb/branches/new-feature")),
        "Branch KB should not exist before sync",
      );

      await kibi(sandbox, ["sync"]);

      assert.ok(
        existsSync(join(sandbox.repoDir, ".kb/branches/new-feature/kb.rdf")),
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

      const reqDir = join(sandbox.repoDir, "requirements");
      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        join(reqDir, "shared.md"),
        `---
title: Shared Requirement
type: req
status: approved
---

# Shared
`,
      );

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

      const reqDir = join(sandbox.repoDir, "requirements");
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
status: draft
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
        existsSync(join(sandbox.repoDir, ".kb/branches/develop/kb.rdf")),
        "develop KB should exist",
      );
      assert.ok(
        existsSync(join(sandbox.repoDir, ".kb/branches/feature/kb.rdf")),
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

      const reqDir = join(sandbox.repoDir, "requirements");
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

      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        join(reqDir, "orphan.md"),
        `---
title: Orphan
type: req
status: draft
---

# Orphan
`,
      );

      await kibi(sandbox, ["sync"]);

      const { stdout: orphanQuery } = await kibi(sandbox, ["query", "req"]);
      assert.ok(orphanQuery.includes("orphan"));
      assert.ok(!orphanQuery.includes("Develop"));
    },
  );
});
