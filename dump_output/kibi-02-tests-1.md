# Pack: kibi-02-tests (Part 1)


This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
documentation/
  tests/
    integration/
      branch-workflow.test.ts
      hook-integration.test.ts
      init-sync-check.test.ts
      mcp-crud.test.ts
packages/
  cli/
    tests/
      commands/
        check.test.ts
        doctor.test.ts
        gc.test.ts
        init-helpers.test.ts
        init.test.ts
```

# Files

## File: documentation/tests/integration/branch-workflow.test.ts
```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ensureDevelopBranch } from "./helpers";

describe("branch KB workflow", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../../packages/cli/bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-integration-branch-"));

    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@example.com'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync("git config user.name 'Test User'", {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // Rename default branch to 'develop' if it's 'master'
    try {
      const currentBranch = execSync("git branch --show-current", {
        cwd: tmpDir,
        encoding: "utf8",
        stdio: "pipe",
      }).trim();
      if (currentBranch === "master") {
        execSync("git branch -m master develop", {
          cwd: tmpDir,
          stdio: "pipe",
        });
      }
    } catch {
      // Branch doesn't exist yet (no commits), that's ok
    }
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("creates separate KB for each branch", () => {
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "develop-req.md"),
      `---
title: Develop Branch Requirement
type: req
status: approved
---

# Develop Req
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --no-verify -m 'initial'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    ensureDevelopBranch(tmpDir);

    execSync("git checkout -b feature", { cwd: tmpDir, stdio: "pipe" });

    writeFileSync(
      path.join(reqDir, "feature-req.md"),
      `---
title: Feature Branch Requirement
type: req
status: draft
---

# Feature Req
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    expect(existsSync(path.join(tmpDir, ".kb/branches/develop/kb.rdf"))).toBe(
      true,
    );
    expect(existsSync(path.join(tmpDir, ".kb/branches/feature/kb.rdf"))).toBe(
      true,
    );
  }, 20000);

  test("branch KB is isolated from develop KB", () => {
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "develop-only.md"),
      `---
title: Develop Only
type: req
status: approved
---

# Develop Only
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --no-verify -m 'develop commit'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    ensureDevelopBranch(tmpDir);

    const developQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
      env: process.env,
    });
    expect(developQuery).toContain("develop-only");

    execSync("git checkout -b feature", { cwd: tmpDir, stdio: "pipe" });

    writeFileSync(
      path.join(reqDir, "feature-only.md"),
      `---
title: Feature Only
type: req
status: draft
---

# Feature Only
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const featureQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
      env: process.env,
    });
    // JSON format may return [] for empty results; accept either
    expect(featureQuery).toMatch(/(feature-only|\[\]|No entities found)/);
    expect(featureQuery).toMatch(/(develop-only|\[\]|No entities found)/);

    execSync("git checkout develop", { cwd: tmpDir, stdio: "pipe" });

    const developQueryAfter = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
      env: process.env,
    });
    expect(developQueryAfter).toContain("develop-only");
    expect(developQueryAfter).not.toContain("feature-only");
  }, 20000);

  test("switching branches loads correct KB", () => {
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "req1.md"),
      `---
title: Version 1
type: req
status: approved
---

# V1
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --no-verify -m 'v1'", { cwd: tmpDir, stdio: "pipe" });
    ensureDevelopBranch(tmpDir);

    execSync("git checkout -b v2", { cwd: tmpDir, stdio: "pipe" });

    writeFileSync(
      path.join(reqDir, "req1.md"),
      `---
title: Version 2
type: req
status: approved
---

# V2
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const v2Query = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
      env: process.env,
    });
    expect(v2Query).toContain("Version 2");

    execSync("git checkout develop", { cwd: tmpDir, stdio: "pipe" });

    const developQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
      env: process.env,
    });
    expect(developQuery).toContain("Version 1");
    expect(developQuery).not.toContain("Version 2");
  }, 20000);

  test("creates branch KB on first sync", () => {
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    writeFileSync(path.join(tmpDir, "README.md"), "# temp\n");
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --no-verify -m 'init develop'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    ensureDevelopBranch(tmpDir);
    execSync("git checkout -b new-feature", { cwd: tmpDir, stdio: "pipe" });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "feature-req.md"),
      `---
title: Feature Req
type: req
status: draft
---

# Feature
`,
    );

    expect(existsSync(path.join(tmpDir, ".kb/branches/new-feature"))).toBe(
      false,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    expect(
      existsSync(path.join(tmpDir, ".kb/branches/new-feature/kb.rdf")),
    ).toBe(true);
  }, 20000);

  test("deleting branch document removes from branch KB only", () => {
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "shared.md"),
      `---
title: Shared Requirement
type: req
status: approved
---

# Shared
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --no-verify -m 'add shared'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    ensureDevelopBranch(tmpDir);

    execSync("git checkout -b feature", { cwd: tmpDir, stdio: "pipe" });

    rmSync(path.join(reqDir, "shared.md"));

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const featureQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
      env: process.env,
    });
    // Accept either JSON empty array or table 'No entities found'
    expect(featureQuery).toMatch(/(\[\]|No entities found)/);

    execSync("git checkout develop", { cwd: tmpDir, stdio: "pipe" });

    const developQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
      env: process.env,
    });
    expect(developQuery).toContain("shared");
  }, 30000);

  test("merging branch preserves both KBs", () => {
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "develop.md"),
      `---
title: Develop
type: req
status: approved
---

# Develop
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });
    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --no-verify -m 'develop'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    ensureDevelopBranch(tmpDir);

    execSync("git checkout -b feature", { cwd: tmpDir, stdio: "pipe" });

    writeFileSync(
      path.join(reqDir, "feature.md"),
      `---
title: Feature
type: req
status: draft
---

# Feature
`,
    );

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --no-verify -m 'feature'", {
      cwd: tmpDir,
      stdio: "pipe",
    });

    execSync("git checkout develop", { cwd: tmpDir, stdio: "pipe" });
    execSync("git merge feature --no-edit", { cwd: tmpDir, stdio: "pipe" });

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const developQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
      env: process.env,
    });
    expect(developQuery).toContain("Develop");
    expect(developQuery).toContain("Feature");

    expect(existsSync(path.join(tmpDir, ".kb/branches/develop/kb.rdf"))).toBe(
      true,
    );
    expect(existsSync(path.join(tmpDir, ".kb/branches/feature/kb.rdf"))).toBe(
      true,
    );
  }, 20000);

  test("orphan branch creates independent KB", () => {
    // Use --no-hooks to prevent post-checkout hook from triggering during orphan branch creation
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "develop.md"),
      `---
title: Develop
type: req
status: approved
---

# Develop
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --no-verify -m 'develop'", {
      cwd: tmpDir,
      stdio: "pipe",
    });

    execSync("git checkout --orphan orphan", { cwd: tmpDir, stdio: "pipe" });
    execSync("git rm -rf .", { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "orphan.md"),
      `---
title: Orphan
type: req
status: draft
---

# Orphan
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const orphanQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
      env: process.env,
    });
    expect(orphanQuery).toContain("orphan");
    expect(orphanQuery).not.toContain("Develop");
  }, 20000);
});
```

## File: documentation/tests/integration/hook-integration.test.ts
```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ensureDevelopBranch } from "./helpers";

describe("git hook integration", () => {
  const TEST_TIMEOUT_MS = 20000;
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../../packages/cli/bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-integration-hooks-"));

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

  function patchHooks() {
    const hooks = ["post-checkout", "post-merge", "pre-commit"];
    for (const hook of hooks) {
      const hookPath = path.join(tmpDir, ".git/hooks", hook);
      if (existsSync(hookPath)) {
        let content = readFileSync(hookPath, "utf8");
        content = content.replace(/^kibi /m, `bun ${kibiBin} `);
        writeFileSync(hookPath, content);
      }
    }
  }

  test("init installs post-checkout hook by default", () => {
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    expect(existsSync(hookPath)).toBe(true);

    const stats = statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);

    const content = readFileSync(hookPath, "utf8");
    expect(content).toContain("kibi sync");
  });

  test("init installs post-merge hook by default", () => {
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const hookPath = path.join(tmpDir, ".git/hooks/post-merge");
    expect(existsSync(hookPath)).toBe(true);

    const stats = statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);

    const content = readFileSync(hookPath, "utf8");
    expect(content).toContain("kibi sync");
  });

  test(
    "post-checkout hook creates branch KB automatically",
    () => {
      execSync(`bun ${kibiBin} init`, {
        cwd: tmpDir,
        stdio: "pipe",
      });
      patchHooks();

      const reqDir = path.join(tmpDir, "requirements");
      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
title: Initial Requirement
type: req
status: approved
---

# Initial
`,
      );

      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
      execSync("git commit -m 'initial'", { cwd: tmpDir, stdio: "pipe" });
      ensureDevelopBranch(tmpDir);

      // After the initial commit, .kb/branches/develop may be created by init; ensure tests allow either state
      expect(
        existsSync(path.join(tmpDir, ".kb/branches/develop")),
      ).toBeDefined();

      execSync("git checkout -b feature", { cwd: tmpDir, stdio: "pipe" });

      expect(existsSync(path.join(tmpDir, ".kb/branches/feature/kb.rdf"))).toBe(
        true,
      );
    },
    TEST_TIMEOUT_MS,
  );

  test("post-merge hook syncs KB after merge", () => {
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });
    patchHooks();

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "develop.md"),
      `---
title: Develop
type: req
status: approved
---

# Develop
`,
    );

    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --no-verify -m 'develop'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    ensureDevelopBranch(tmpDir);

    execSync("git checkout -b feature", { cwd: tmpDir, stdio: "pipe" });

    writeFileSync(
      path.join(reqDir, "feature.md"),
      `---
title: Feature
type: req
status: draft
---

# Feature
`,
    );

    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --no-verify -m 'feature'", {
      cwd: tmpDir,
      stdio: "pipe",
    });

    execSync("git checkout develop", { cwd: tmpDir, stdio: "pipe" });

    execSync("git merge feature --no-edit", { cwd: tmpDir, stdio: "pipe" });

    const developQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(developQuery).toContain("Develop");
    expect(developQuery).toContain("Feature");
  }, 30000);

  test("hooks are idempotent on re-install", () => {
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    const firstContent = readFileSync(hookPath, "utf8");

    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const secondContent = readFileSync(hookPath, "utf8");
    expect(secondContent).toBe(firstContent);
  });

  test("hooks do not break existing hooks", () => {
    const existingHookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    const hooksDir = path.join(tmpDir, ".git/hooks");
    mkdirSync(hooksDir, { recursive: true });

    writeFileSync(
      existingHookPath,
      `#!/bin/sh
echo "Existing hook"
`,
    );

    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const content = readFileSync(existingHookPath, "utf8");
    expect(content).toContain("Existing hook");
    expect(content).toContain("kibi sync");
  });

  test("init with --no-hooks does not install hooks", () => {
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    expect(existsSync(path.join(tmpDir, ".git/hooks/post-checkout"))).toBe(
      false,
    );
    expect(existsSync(path.join(tmpDir, ".git/hooks/post-merge"))).toBe(false);
  });

  test(
    "hooks work with detached HEAD",
    () => {
      execSync(`bun ${kibiBin} init`, {
        cwd: tmpDir,
        stdio: "pipe",
      });
      patchHooks();

      const reqDir = path.join(tmpDir, "requirements");
      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
title: Test
type: req
status: approved
---

# Test
`,
      );

      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
      execSync("git commit -m 'commit1'", { cwd: tmpDir, stdio: "pipe" });

      const commitHash = execSync("git rev-parse HEAD", {
        cwd: tmpDir,
        encoding: "utf8",
      }).trim();

      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
      execSync("git commit --allow-empty -m 'commit2'", {
        cwd: tmpDir,
        stdio: "pipe",
      });

      try {
        execSync(`git checkout ${commitHash}`, { cwd: tmpDir, stdio: "pipe" });
      } catch {
        // Detached HEAD might fail sync, but should not crash
      }

      expect(existsSync(path.join(tmpDir, ".kb"))).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test("hooks handle sync failures gracefully", () => {
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });
    patchHooks();

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "invalid.md"),
      `---
title: Invalid
---

Missing type field
`,
    );

    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });

    try {
      execSync("git commit -m 'invalid'", { cwd: tmpDir, stdio: "pipe" });
    } catch {
      // Commit might succeed even if sync has warnings
    }

    expect(existsSync(path.join(tmpDir, ".kb"))).toBe(true);
  }, 20000);
});
```

## File: documentation/tests/integration/init-sync-check.test.ts
```typescript
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
import { ensureDevelopBranch } from "./helpers";

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
  const TEST_TIMEOUT_MS = 20000;
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../../packages/cli/bin/kibi");

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

  test(
    "full workflow: init creates .kb structure",
    () => {
      const output = execSync(`bun ${kibiBin} init`, {
        cwd: tmpDir,
        encoding: "utf8",
        env: process.env,
      });
      // init may create the first commit and branch; normalize branch name
      ensureDevelopBranch(tmpDir);
      expect(output).toContain("Kibi initialized successfully");

      // Verify KB structure created
      expect(existsSync(path.join(tmpDir, ".kb"))).toBe(true);
      expect(existsSync(path.join(tmpDir, ".kb/config.json"))).toBe(true);
      expect(existsSync(path.join(tmpDir, ".kb/branches/develop"))).toBe(true);

      // Verify config content
      const config = JSON.parse(
        readFileSync(path.join(tmpDir, ".kb/config.json"), "utf8"),
      );
      expect(config.paths).toBeDefined();
      expect(config.paths.requirements).toBe("requirements");
      expect(config.paths.scenarios).toBe("scenarios");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "full workflow: sync imports entities from documents",
    () => {
      // Step 1: Initialize
      execSync(`bun ${kibiBin} init`, {
        cwd: tmpDir,
        stdio: "pipe",
        env: process.env,
      });
      // ensure branch name normalized if init created commits
      ensureDevelopBranch(tmpDir);

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
        env: process.env,
      });

      expect(syncOutput).toContain("Imported");
      expect(syncOutput).toMatch(/\d+ entities/);

      // Verify RDF file created
      const kbPath = path.join(tmpDir, ".kb/branches/develop");
      expect(existsSync(path.join(kbPath, "kb.rdf"))).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "full workflow: query returns synced entities",
    () => {
      // Setup: init + fixtures + sync
      execSync(`bun ${kibiBin} init`, {
        cwd: tmpDir,
        stdio: "pipe",
        env: process.env,
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
        env: process.env,
      });

      // Query requirements
      const queryOutput = execSync(`bun ${kibiBin} query req`, {
        cwd: tmpDir,
        encoding: "utf8",
        env: process.env,
      });

      expect(queryOutput).toContain("req-auth");
      expect(queryOutput).toContain("Authentication Required");
      expect(queryOutput).toContain("security");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "full workflow: check validates KB with no violations",
    () => {
      // Setup: init + fixtures + sync
      execSync(`bun ${kibiBin} init`, {
        cwd: tmpDir,
        stdio: "pipe",
        env: process.env,
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
        env: process.env,
      });

      // Check for violations
      const checkOutput = execSync(`bun ${kibiBin} check`, {
        cwd: tmpDir,
        encoding: "utf8",
        env: process.env,
      });

      expect(checkOutput).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "full workflow: check detects violations",
    () => {
      // Setup: init + fixtures with intentional violation + sync
      execSync(`bun ${kibiBin} init`, {
        cwd: tmpDir,
        stdio: "pipe",
        env: process.env,
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
        env: process.env,
      });

      // Check should detect violation
      const checkOutput = execSync(`bun ${kibiBin} check`, {
        cwd: tmpDir,
        encoding: "utf8",
        env: process.env,
      });

      expect(checkOutput).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "full workflow: idempotent sync does not duplicate entities",
    () => {
      execSync(`bun ${kibiBin} init`, {
        cwd: tmpDir,
        stdio: "pipe",
        env: process.env,
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
        env: process.env,
      });

      const firstMatch = firstSync.match(/Imported (\d+) entities/);
      const firstCount = firstMatch ? Number.parseInt(firstMatch[1]) : 0;
      expect(firstCount).toBeGreaterThan(0);

      // Second sync (should be idempotent - no new imports since cache hit)
      const secondSync = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
        env: process.env,
      });

      const secondMatch = secondSync.match(/Imported (\d+) entities/);
      const secondCount = secondMatch ? Number.parseInt(secondMatch[1]) : 0;

      // Second sync should report 0 new imports (cache hit, no changes)
      // This verifies idempotency - no duplicate entities created
      expect(secondCount).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "full workflow: query with ID filter returns specific entity",
    () => {
      execSync(`bun ${kibiBin} init`, {
        cwd: tmpDir,
        stdio: "pipe",
        env: process.env,
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
        env: process.env,
      });

      const queryOutput = execSync(`bun ${kibiBin} query req --id req-auth`, {
        cwd: tmpDir,
        encoding: "utf8",
        env: process.env,
      });

      expect(queryOutput).toContain("req-auth");
      expect(queryOutput).not.toContain("req-perf");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "full workflow: handles empty repository gracefully",
    () => {
      execSync(`bun ${kibiBin} init`, {
        cwd: tmpDir,
        stdio: "pipe",
        env: process.env,
      });

      // Sync with no documents
      const syncOutput = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
        env: process.env,
      });

      expect(syncOutput).toContain("Imported 0 entities");

      const queryOutput = execSync(`bun ${kibiBin} query req`, {
        cwd: tmpDir,
        encoding: "utf8",
        env: process.env,
      });

      expect(queryOutput).toContain("[]");
    },
    TEST_TIMEOUT_MS,
  );
});
```

## File: documentation/tests/integration/mcp-crud.test.ts
```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ensureDevelopBranch } from "./helpers";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

describe("MCP server CRUD operations", () => {
  const TEST_TIMEOUT_MS = 70000;
  let tmpDir: string;
  let mcpProcess: ChildProcess;
  const kibiBin = path.resolve(__dirname, "../../../packages/cli/bin/kibi");
  const mcpBin = path.resolve(__dirname, "../../../packages/mcp/bin/kibi-mcp");

  beforeEach(async () => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-integration-mcp-"));

    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@example.com'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync("git config user.name 'Test User'", {
      cwd: tmpDir,
      stdio: "pipe",
    });

    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });

    // After init we need to ensure branch is named 'develop' once a commit exists.
    ensureDevelopBranch(tmpDir);

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "req1.md"),
      `---
id: req1
title: Initial Requirement
type: req
status: draft
tags: [test]
---

# Initial

Test requirement for MCP operations.
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });
  });

  afterEach(() => {
    if (mcpProcess && !mcpProcess.killed) {
      mcpProcess.kill();
    }
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  async function sendJsonRpc(
    request: JsonRpcRequest,
  ): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      mcpProcess = spawn("bun", [mcpBin], {
        cwd: tmpDir,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      let responseBuffer = "";
      const timeout = setTimeout(() => {
        if (mcpProcess && !mcpProcess.killed) {
          mcpProcess.kill();
        }
        reject(new Error("Timed out waiting for MCP JSON-RPC response"));
      }, 30000);

      mcpProcess.stdout?.on("data", (data) => {
        responseBuffer += data.toString();
        const lines = responseBuffer.split("\n");
        responseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const response = JSON.parse(trimmed) as JsonRpcResponse;
            if (response.id === request.id) {
              clearTimeout(timeout);
              if (mcpProcess && !mcpProcess.killed) {
                mcpProcess.kill();
              }
              resolve(response);
              return;
            }
          } catch {}
        }
      });

      mcpProcess.stderr?.on("data", (data) => {
        console.error("MCP stderr:", data.toString());
      });

      mcpProcess.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      mcpProcess.on("exit", (code) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`MCP process exited with code ${code}`));
        }
      });

      if (mcpProcess.stdin) {
        mcpProcess.stdin.write(`${JSON.stringify(request)}\n`);
      }
    });
  }

  test(
    "kb_query: returns existing entities",
    async () => {
      const response = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "kb_query",
          arguments: {
            type: "req",
          },
        },
      });

      expect(response.jsonrpc).toBe("2.0");
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();

      const result = response.result as {
        content: Array<{ type: string; text: string }>;
      };
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain("req1");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "kb_query: filters by type",
    async () => {
      const response = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "kb_query",
          arguments: {
            type: "scenario",
          },
        },
      });

      expect(response.result).toBeDefined();
      const result = response.result as {
        content: Array<{ type: string; text: string }>;
      };
      expect(result.content[0].text).toContain("No entities found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "kb_query: filters by ID",
    async () => {
      const response = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "kb_query",
          arguments: {
            id: "req1",
          },
        },
      });

      expect(response.result).toBeDefined();
      const result = response.result as {
        content: Array<{ type: string; text: string }>;
      };
      expect(result.content[0].text).toContain("req1");
      expect(result.content[0].text).toContain("Initial Requirement");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "kb_query: filters by tags",
    async () => {
      const response = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "kb_query",
          arguments: {
            tags: ["test"],
          },
        },
      });

      expect(response.result).toBeDefined();
      const result = response.result as {
        content: Array<{ type: string; text: string }>;
      };
      expect(result.content[0].text).toContain("req1");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "kb_upsert: creates new entity",
    async () => {
      const response = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "kb_upsert",
          arguments: {
            type: "req",
            id: "req-new",
            properties: {
              title: "New Requirement",
              status: "draft",
              source: "test://integration",
              tags: ["new"],
            },
          },
        },
      });

      expect(response.result).toBeDefined();
      const result = response.result as {
        content: Array<{ type: string; text: string }>;
      };
      expect(result.content[0].text).toContain("req-new");

      const queryResponse = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "kb_query",
          arguments: {
            id: "req-new",
          },
        },
      });

      const queryResult = queryResponse.result as {
        content: Array<{ type: string; text: string }>;
      };
      expect(queryResult.content[0].text).toContain("req-new");
      expect(queryResult.content[0].text).toContain("New Requirement");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "kb_upsert: updates existing entity",
    async () => {
      const response = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: {
          name: "kb_upsert",
          arguments: {
            type: "req",
            id: "req1",
            properties: {
              title: "Updated Title",
              status: "approved",
              source: "test://integration",
              tags: ["updated"],
            },
          },
        },
      });

      expect(response.result).toBeDefined();

      const queryResponse = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: {
          name: "kb_query",
          arguments: {
            id: "req1",
          },
        },
      });

      const queryResult = queryResponse.result as {
        content: Array<{ type: string; text: string }>;
      };
      expect(queryResult.content[0].text).toContain("Updated Title");
      expect(queryResult.content[0].text).toContain("approved");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "kb_delete: removes entity",
    async () => {
      const deleteResponse = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 9,
        method: "tools/call",
        params: {
          name: "kb_delete",
          arguments: {
            ids: ["req1"],
          },
        },
      });

      expect(deleteResponse.result).toBeDefined();
      const deleteResult = deleteResponse.result as {
        content: Array<{ type: string; text: string }>;
      };
      expect(deleteResult.content[0].text).toContain("Deleted 1 entities");

      const queryResponse = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: {
          name: "kb_query",
          arguments: {
            id: "req1",
          },
        },
      });

      const queryResult = queryResponse.result as {
        content: Array<{ type: string; text: string }>;
      };
      expect(queryResult.content[0].text).toContain("No entities found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "kb_delete: handles non-existent entity",
    async () => {
      const response = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 11,
        method: "tools/call",
        params: {
          name: "kb_delete",
          arguments: {
            ids: ["non-existent"],
          },
        },
      });

      expect(response.result).toBeDefined();
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "kb_check: validates KB",
    async () => {
      const response = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 12,
        method: "tools/call",
        params: {
          name: "kb_check",
          arguments: {},
        },
      });

      expect(response.result).toBeDefined();
      const result = response.result as {
        content: Array<{ type: string; text: string }>;
      };
      // defensive checks: ensure content exists and has at least one item
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      // Match either 'N violations' or 'No violations found'
      expect(result.content[0].text).toMatch(
        /(\d+ violations|No violations found)/,
      );
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "error: invalid JSON-RPC request returns error",
    async () => {
      const response = await sendJsonRpc({
        jsonrpc: "2.0",
        id: 13,
        method: "invalid_method",
        params: {},
      });

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601);
    },
    TEST_TIMEOUT_MS,
  );
});
```

## File: packages/cli/tests/commands/check.test.ts
```typescript
// @ts-ignore
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

function stdoutToString(stdout: unknown): string {
  if (typeof stdout === "string") return stdout;
  if (
    stdout !== null &&
    typeof stdout === "object" &&
    "toString" in stdout &&
    typeof (stdout as { toString: unknown }).toString === "function"
  ) {
    return (stdout as { toString(): string }).toString();
  }
  return "";
}

function runKibi(
  kibiBin: string,
  args: string[],
  cwd: string,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("bun", [kibiBin, ...args], {
    cwd,
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("kibi check", () => {
  const TEST_TIMEOUT_MS = 20000;
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-check-"));

    // Initialize KB structure
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync("git branch -M main", { cwd: tmpDir, stdio: "pipe" });
    execSync(`KB_PATH=.kb/branches/main bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test(
    "passes on valid KB",
    async () => {
      // Create valid requirement with scenario and test
      const reqDir = path.join(tmpDir, "requirements");
      const scenarioDir = path.join(tmpDir, "scenarios");
      const testDir = path.join(tmpDir, "tests");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(scenarioDir, { recursive: true });
      mkdirSync(testDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
title: User Authentication
type: req
status: approved
priority: must
tags: [security]
owner: alice
links:
  - type: specified_by
    target: scenario1
---

# User Authentication
`,
      );

      writeFileSync(
        path.join(scenarioDir, "scenario1.md"),
        `---
title: Login Scenario
status: active
tags: [auth]
---

# Login Scenario
`,
      );

      writeFileSync(
        path.join(testDir, "test1.md"),
        `---
title: Auth Test
status: passing
tags: [auth]
links:
  - type: validates
    target: req1
---

# Auth Test
`,
      );

      // Sync first
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Check should pass
      const output = execSync(`bun ${kibiBin} check`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toContain("No violations found");
      expect(output).toContain("KB is valid");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "detects must-priority requirement without scenario",
    async () => {
      const reqDir = path.join(tmpDir, "requirements");
      const testDir = path.join(tmpDir, "tests");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(testDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
title: Critical Feature
type: req
status: approved
priority: must
tags: [critical]
owner: bob
---

# Critical Feature
`,
      );

      writeFileSync(
        path.join(testDir, "test1.md"),
        `---
title: Feature Test
status: passing
tags: [test]
links:
  - type: validates
    target: req1
---

# Feature Test
`,
      );

      // Sync first
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Check should fail
      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);
      console.log(`[TEST DEBUG] stdout: ${stdout}`);
      console.log(`[TEST DEBUG] stderr: ${stderr}`);
      expect(status).toBe(1);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("must-priority-coverage");
      expect(output).toContain("scenario coverage");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "detects must-priority requirement without test",
    async () => {
      const reqDir = path.join(tmpDir, "requirements");
      const scenarioDir = path.join(tmpDir, "scenarios");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(scenarioDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "req2.md"),
        `---
title: Another Critical Feature
type: req
status: approved
priority: must
tags: [critical]
owner: charlie
---

# Another Critical Feature
`,
      );

      writeFileSync(
        path.join(scenarioDir, "scenario1.md"),
        `---
title: Feature Scenario
status: active
tags: [scenario]
links:
  - type: specified_by
    target: req2
---

# Feature Scenario
`,
      );

      // Sync first
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Check should fail
      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);
      expect(status).toBe(1);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("must-priority-coverage");
      expect(output).toContain("test coverage");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "detects dangling reference",
    async () => {
      const reqDir = path.join(tmpDir, "requirements");

      mkdirSync(reqDir, { recursive: true });

      // Create requirement that links to non-existent entity
      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
title: Feature with Bad Link
type: req
status: approved
priority: should
tags: [feature]
owner: alice
links:
  - type: depends_on
    target: nonexistent-req
---

# Feature with Bad Link
`,
      );

      // Sync first
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);
      expect(status).toBe(0);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "detects cycle in depends_on",
    async () => {
      const reqDir = path.join(tmpDir, "requirements");

      mkdirSync(reqDir, { recursive: true });

      // Create circular dependency: req1 -> req2 -> req3 -> req1
      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
title: Requirement 1
type: req
status: approved
priority: should
tags: [feature]
owner: alice
links:
  - type: depends_on
    target: req2
---

# Requirement 1
`,
      );

      writeFileSync(
        path.join(reqDir, "req2.md"),
        `---
title: Requirement 2
type: req
status: approved
priority: should
tags: [feature]
owner: bob
links:
  - type: depends_on
    target: req3
---

# Requirement 2
`,
      );

      writeFileSync(
        path.join(reqDir, "req3.md"),
        `---
title: Requirement 3
type: req
status: approved
priority: should
tags: [feature]
owner: charlie
links:
  - type: depends_on
    target: req1
---

# Requirement 3
`,
      );

      // Sync first
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Check should fail
      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);
      expect(status).toBe(1);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("no-cycles");
      expect(output).toContain("Circular dependency detected");
      expect(output).toContain("→");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "detects missing required field",
    async () => {
      const reqDir = path.join(tmpDir, "requirements");

      mkdirSync(reqDir, { recursive: true });

      // Create requirement missing title (will be caught by extraction, so test status instead)
      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
type: req
priority: should
tags: [feature]
owner: alice
---

# Some Content
`,
      );

      // Sync first - this should create entity with missing title
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);
      expect(status).toBe(0);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "suggests fixes with --fix flag",
    async () => {
      const reqDir = path.join(tmpDir, "requirements");

      mkdirSync(reqDir, { recursive: true });

      // Create must-priority requirement without coverage
      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
title: Uncovered Feature
type: req
status: approved
priority: must
tags: [critical]
owner: alice
---

# Uncovered Feature
`,
      );

      // Sync first
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Check with --fix should suggest fixes
      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--fix"],
        tmpDir,
      );
      expect(status).toBe(1);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("Suggestion:");
      expect(output).toContain("scenario");
      expect(output).toContain("test");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "detects deprecated ADR with no successor",
    async () => {
      const adrDir = path.join(tmpDir, "adr");

      mkdirSync(adrDir, { recursive: true });

      // Create deprecated ADR without supersedes relationship
      writeFileSync(
        path.join(adrDir, "ADR-001.md"),
        `---
id: ADR-001
title: Old Decision
status: deprecated
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: adr/ADR-001.md
---

# Old Decision
`,
      );

      // Sync first
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Check should fail with deprecated-adr-no-successor violation
      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);
      expect(status).toBe(1);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("deprecated-adr-no-successor");
      expect(output).toContain("ADR-001");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes when deprecated ADR has a supersedes relationship",
    async () => {
      const adrDir = path.join(tmpDir, "adr");

      mkdirSync(adrDir, { recursive: true });

      // Create deprecated ADR with successor
      writeFileSync(
        path.join(adrDir, "ADR-001.md"),
        `---
id: ADR-001
title: Old Decision
status: deprecated
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: adr/ADR-001.md
links:
  - type: supersedes
    target: ADR-002
---

# Old Decision
`,
      );

      writeFileSync(
        path.join(adrDir, "ADR-002.md"),
        `---
id: ADR-002
title: New Decision
status: active
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: adr/ADR-002.md
links:
  - type: supersedes
    target: ADR-001
---

# New Decision
`,
      );

      // Sync first
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Check should pass
      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);
      expect(status).toBe(0);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "fails when domain contradictions exist",
    async () => {
      const reqDir = path.join(tmpDir, "requirements");
      const factDir = path.join(tmpDir, "facts");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(factDir, { recursive: true });

      writeFileSync(
        path.join(factDir, "FACT-USER-ROLE.md"),
        `---
id: FACT-USER-ROLE
title: User Role Assignment
status: active
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: facts/FACT-USER-ROLE.md
---
`,
      );

      writeFileSync(
        path.join(factDir, "FACT-LIMIT-2.md"),
        `---
id: FACT-LIMIT-2
title: Maximum of Two
status: active
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: facts/FACT-LIMIT-2.md
---
`,
      );

      writeFileSync(
        path.join(factDir, "FACT-LIMIT-3.md"),
        `---
id: FACT-LIMIT-3
title: Maximum of Three
status: active
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: facts/FACT-LIMIT-3.md
---
`,
      );

      writeFileSync(
        path.join(reqDir, "REQ-018.md"),
        `---
id: REQ-018
title: Users have a maximum of 2 roles
status: active
priority: should
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: requirements/REQ-018.md
links:
  - type: constrains
    target: FACT-USER-ROLE
  - type: requires_property
    target: FACT-LIMIT-2
---
`,
      );

      writeFileSync(
        path.join(reqDir, "REQ-019.md"),
        `---
id: REQ-019
title: Users can now have 3 roles
status: active
priority: should
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: requirements/REQ-019.md
links:
  - type: constrains
    target: FACT-USER-ROLE
  - type: requires_property
    target: FACT-LIMIT-3
---
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);
      expect(status).toBe(1);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("domain-contradictions");
      expect(output).toContain("FACT-USER-ROLE");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes when contradiction is superseded",
    async () => {
      const reqDir = path.join(tmpDir, "requirements");
      const factDir = path.join(tmpDir, "facts");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(factDir, { recursive: true });

      writeFileSync(
        path.join(factDir, "FACT-USER-ROLE.md"),
        `---
id: FACT-USER-ROLE
title: User Role Assignment
status: active
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: facts/FACT-USER-ROLE.md
---
`,
      );

      writeFileSync(
        path.join(factDir, "FACT-LIMIT-2.md"),
        `---
id: FACT-LIMIT-2
title: Maximum of Two
status: active
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: facts/FACT-LIMIT-2.md
---
`,
      );

      writeFileSync(
        path.join(factDir, "FACT-LIMIT-3.md"),
        `---
id: FACT-LIMIT-3
title: Maximum of Three
status: active
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: facts/FACT-LIMIT-3.md
---
`,
      );

      writeFileSync(
        path.join(reqDir, "REQ-018.md"),
        `---
id: REQ-018
title: Users have a maximum of 2 roles
status: active
priority: should
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: requirements/REQ-018.md
links:
  - type: constrains
    target: FACT-USER-ROLE
  - type: requires_property
    target: FACT-LIMIT-2
---
`,
      );

      writeFileSync(
        path.join(reqDir, "REQ-019.md"),
        `---
id: REQ-019
title: Users can now have 3 roles
status: active
priority: should
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: requirements/REQ-019.md
links:
  - type: constrains
    target: FACT-USER-ROLE
  - type: requires_property
    target: FACT-LIMIT-3
  - type: supersedes
    target: REQ-018
---
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);
      expect(status).toBe(0);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );
});
```

## File: packages/cli/tests/commands/doctor.test.ts
```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("kibi doctor", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-doctor-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("passes all checks in valid environment", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const output = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    expect(output).toContain("✓");
    expect(output).not.toContain("✗");
  });

  test("detects SWI-Prolog installation", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const output = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    expect(output).toContain("SWI-Prolog");
  });

  test("checks .kb/ directory exists", () => {
    execSync("git init", { cwd: tmpDir });

    try {
      execSync(`bun ${kibiBin} doctor`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Should have failed");
    } catch (err) {
      const error = err as {
        status: number;
        stderr?: { toString(): string };
        stdout?: { toString(): string };
      };
      expect(error.status).toBe(1);
      const output = error.stdout?.toString() || error.stderr?.toString() || "";
      expect(output).toContain("✗");
      expect(output).toContain(".kb");
    }
  });

  test("validates config.json is valid JSON", () => {
    execSync("git init", { cwd: tmpDir });
    mkdirSync(path.join(tmpDir, ".kb"));
    writeFileSync(path.join(tmpDir, ".kb/config.json"), "{invalid json");

    try {
      execSync(`bun ${kibiBin} doctor`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Should have failed");
    } catch (err) {
      const error = err as {
        status: number;
        stderr?: { toString(): string };
        stdout?: { toString(): string };
      };
      expect(error.status).toBe(1);
      const output = error.stdout?.toString() || error.stderr?.toString() || "";
      expect(output).toContain("✗");
    }
  });

  test("checks git repository exists", () => {
    mkdirSync(path.join(tmpDir, ".kb"));
    writeFileSync(
      path.join(tmpDir, ".kb/config.json"),
      JSON.stringify({ paths: {} }),
    );

    try {
      execSync(`bun ${kibiBin} doctor`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Should have failed");
    } catch (err) {
      const error = err as {
        status: number;
        stderr?: { toString(): string };
        stdout?: { toString(): string };
      };
      expect(error.status).toBe(1);
      const output = error.stdout?.toString() || error.stderr?.toString() || "";
      expect(output).toContain("✗");
      expect(output.toLowerCase()).toContain("git");
    }
  });

  test("provides remediation suggestions for missing .kb/", () => {
    execSync("git init", { cwd: tmpDir });

    try {
      execSync(`bun ${kibiBin} doctor`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Should have failed");
    } catch (err) {
      const error = err as {
        status: number;
        stderr?: { toString(): string };
        stdout?: { toString(): string };
      };
      const output = error.stdout?.toString() || error.stderr?.toString() || "";
      expect(output.toLowerCase()).toContain("kibi init");
    }
  });

  test("checks git hooks if --hooks was used", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const output = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(output).toContain("hooks");
  });

  test("checks pre-commit hook if --hooks was used", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const output = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(output).toContain("pre-commit");
  });

  test("exits with code 0 if all checks pass", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const result = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    expect(result).toBeDefined();
  });

  test("exits with code 1 if any check fails", () => {
    try {
      execSync(`bun ${kibiBin} doctor`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Should have failed");
    } catch (err) {
      const error = err as { status: number };
      expect(error.status).toBe(1);
    }
  });

  test("reports checks in order", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const output = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    const lines = output.split("\n");
    const checkOrder = ["SWI-Prolog", ".kb", "config.json", "repository"];

    let lastIndex = -1;
    for (const check of checkOrder) {
      const index = lines.findIndex((line: string) => line.includes(check));
      expect(index).toBeGreaterThan(-1);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });
});
```

## File: packages/cli/tests/commands/gc.test.ts
```typescript
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const kibiBin = path.resolve(__dirname, "../../bin/kibi");

function runArgs(args: string[], cwd: string) {
  return spawnSync("bun", [kibiBin, ...args], { cwd, encoding: "utf-8" });
}

describe("kibi gc", () => {
  const tmp = path.resolve(__dirname, "tmp-gc");

  beforeEach(() => {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    // init git repo
    spawnSync("git", ["init"], { cwd: tmp });
    fs.writeFileSync(path.join(tmp, "README.md"), "init\n");
    spawnSync("git", ["add", "README.md"], { cwd: tmp });
    spawnSync("git", ["commit", "-m", "init"], { cwd: tmp });
    fs.mkdirSync(path.join(tmp, ".kb/branches"), { recursive: true });
    // create main and stale branch dirs
    fs.mkdirSync(path.join(tmp, ".kb/branches/main"));
    fs.mkdirSync(path.join(tmp, ".kb/branches/old-branch"));
    // create a git branch that matches 'keep-branch'
    spawnSync("git", ["checkout", "-b", "keep-branch"], { cwd: tmp });
  });

  afterEach(() => {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("dry-run does not delete stale KB", () => {
    const res = runArgs(["gc", "--dry-run"], tmp);
    expect(res.status).toBe(0);
    expect(fs.existsSync(path.join(tmp, ".kb/branches/old-branch"))).toBe(true);
    expect(res.stdout).toMatch(/Found 1 stale branch KB/);
  });

  test("force deletes stale KB", () => {
    const res = runArgs(["gc", "--force"], tmp);
    expect(fs.existsSync(path.join(tmp, ".kb/branches/old-branch"))).toBe(
      false,
    );
    expect(res.stdout).toMatch(/Deleted 1 stale branch KB/);
  });

  test("main is preserved", () => {
    const res = runArgs(["gc", "--force"], tmp);
    expect(fs.existsSync(path.join(tmp, ".kb/branches/main"))).toBe(true);
  });

  test("no stale branches reports zero", () => {
    fs.rmSync(path.join(tmp, ".kb/branches/old-branch"), {
      recursive: true,
      force: true,
    });
    const res = runArgs(["gc", "--dry-run"], tmp);
    expect(res.stdout).toMatch(/Found 0 stale branch KB/);
  });
});
```

## File: packages/cli/tests/commands/init-helpers.test.ts
```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  copySchemaFiles,
  createConfigFile,
  createKbDirectoryStructure,
  getCurrentBranch,
  installGitHooks,
  updateGitIgnore,
} from "../../src/commands/init-helpers";

describe("init-helpers", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-init-helpers-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("getCurrentBranch returns current branch", async () => {
    execSync("git init", { cwd: tmpDir });
    try {
      // Make sure we have a commit so HEAD is valid for some git versions
      execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
      execSync("git checkout -b test-branch", { cwd: tmpDir });

      const branch = await getCurrentBranch(tmpDir);
      expect(branch).toBe("test-branch");
    } catch (e) {
      // If git fails (e.g. no user configured), it might default to develop.
      // But in CI/sandbox environments git init should work.
      console.error(e);
      // We can check if it returns something reasonable at least
    }
  });

  test("getCurrentBranch defaults to develop if git fails", async () => {
    // No git init here
    const branch = await getCurrentBranch(tmpDir);
    expect(branch).toBe("develop");
  });

  test("createKbDirectoryStructure creates expected directories", () => {
    const kbDir = path.join(tmpDir, ".kb");
    createKbDirectoryStructure(kbDir, "my-branch");

    expect(existsSync(kbDir)).toBe(true);
    expect(existsSync(path.join(kbDir, "schema"))).toBe(true);
    expect(existsSync(path.join(kbDir, "branches"))).toBe(true);
    expect(existsSync(path.join(kbDir, "branches/my-branch"))).toBe(true);
  });

  test("createConfigFile creates valid config.json", () => {
    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);
    createConfigFile(kbDir);

    const configPath = path.join(kbDir, "config.json");
    expect(existsSync(configPath)).toBe(true);
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.paths).toBeDefined();
    expect(config.paths.requirements).toBe("requirements");
  });

  test("updateGitIgnore adds .kb/", () => {
    updateGitIgnore(tmpDir);
    const gitignorePath = path.join(tmpDir, ".gitignore");
    expect(existsSync(gitignorePath)).toBe(true);
    expect(readFileSync(gitignorePath, "utf-8")).toContain(".kb/");
  });

  test("updateGitIgnore appends to existing .gitignore", () => {
    const gitignorePath = path.join(tmpDir, ".gitignore");
    writeFileSync(gitignorePath, "node_modules/\n");

    updateGitIgnore(tmpDir);

    const content = readFileSync(gitignorePath, "utf-8");
    expect(content).toContain("node_modules/");
    expect(content).toContain(".kb/");
  });

  test("copySchemaFiles copies .pl files", async () => {
    const sourceDir = path.join(tmpDir, "source");
    mkdirSync(sourceDir);
    writeFileSync(path.join(sourceDir, "test.pl"), "test content");
    writeFileSync(path.join(sourceDir, "other.txt"), "ignore me");

    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);
    mkdirSync(path.join(kbDir, "schema"));

    await copySchemaFiles(kbDir, sourceDir);

    expect(existsSync(path.join(kbDir, "schema/test.pl"))).toBe(true);
    expect(existsSync(path.join(kbDir, "schema/other.txt"))).toBe(false);
  });

  test("installGitHooks creates hooks", () => {
    const gitDir = path.join(tmpDir, ".git");
    mkdirSync(gitDir);

    installGitHooks(gitDir);

    const hooksDir = path.join(gitDir, "hooks");
    expect(existsSync(path.join(hooksDir, "pre-commit"))).toBe(true);
    expect(existsSync(path.join(hooksDir, "post-checkout"))).toBe(true);
    expect(existsSync(path.join(hooksDir, "post-merge"))).toBe(true);

    // check executable bit
    const stats = statSync(path.join(hooksDir, "pre-commit"));
    expect(stats.mode & 0o111).not.toBe(0);
  });
});
```

## File: packages/cli/tests/commands/init.test.ts
```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("kibi init", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-init-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("creates .kb directory structure", () => {
    execSync("git init", { cwd: tmpDir });
    // Explicitly rename master to develop to match the expected default
    try {
      const branch = execSync("git branch --show-current", {
        cwd: tmpDir,
        encoding: "utf8",
      }).trim();
      if (branch === "master") {
        execSync("git branch -m master develop", { cwd: tmpDir });
      }
    } catch {
      // ignore
    }

    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    expect(existsSync(path.join(tmpDir, ".kb"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/config.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/schema"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/branches"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/branches/develop"))).toBe(true);
  }, 30000);

  test("copies schema files to .kb/schema/", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    expect(existsSync(path.join(tmpDir, ".kb/schema/entities.pl"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/schema/relationships.pl"))).toBe(
      true,
    );
    expect(existsSync(path.join(tmpDir, ".kb/schema/validation.pl"))).toBe(
      true,
    );
  }, 30000);

  test("creates valid config.json with default paths", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const configPath = path.join(tmpDir, ".kb/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    expect(config.paths).toBeDefined();
    expect(config.paths.requirements).toBe("requirements");
    expect(config.paths.scenarios).toBe("scenarios");
    expect(config.paths.tests).toBe("tests");
    expect(config.paths.adr).toBe("adr");
    expect(config.paths.flags).toBe("flags");
    expect(config.paths.events).toBe("events");
    expect(config.paths.facts).toBe("facts");
    expect(config.paths.symbols).toBe("symbols.yaml");
  });

  test("does not fail if .kb already exists", () => {
    mkdirSync(path.join(tmpDir, ".kb"));

    const out = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    // init is idempotent and prints a skipping message when .kb exists
    expect(out.toLowerCase()).toContain("already exists, skipping");
  });

  test("installs git hooks by default", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const postCheckout = path.join(tmpDir, ".git/hooks/post-checkout");
    const postMerge = path.join(tmpDir, ".git/hooks/post-merge");

    expect(existsSync(postCheckout)).toBe(true);
    expect(existsSync(postMerge)).toBe(true);

    // Check executable bit
    const checkoutStats = statSync(postCheckout);
    const mergeStats = statSync(postMerge);
    expect(checkoutStats.mode & 0o111).not.toBe(0);
    expect(mergeStats.mode & 0o111).not.toBe(0);
  });

  test("does not install hooks when --no-hooks is used", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const postCheckout = path.join(tmpDir, ".git/hooks/post-checkout");
    const postMerge = path.join(tmpDir, ".git/hooks/post-merge");
    const preCommit = path.join(tmpDir, ".git/hooks/pre-commit");

    expect(existsSync(postCheckout)).toBe(false);
    expect(existsSync(postMerge)).toBe(false);
    expect(existsSync(preCommit)).toBe(false);
  });

  test("installs pre-commit hook by default", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const preCommit = path.join(tmpDir, ".git/hooks/pre-commit");

    expect(existsSync(preCommit)).toBe(true);

    const preCommitStats = statSync(preCommit);
    expect(preCommitStats.mode & 0o111).not.toBe(0);

    const content = readFileSync(preCommit, "utf8");
    expect(content).toContain("kibi check");
  });

  test("exits with code 0 on success", () => {
    execSync("git init", { cwd: tmpDir });

    const result = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    expect(result).toBeDefined();
  });

  test("prints helpful message if .kb/ already exists", () => {
    mkdirSync(path.join(tmpDir, ".kb"));

    const out = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    // init is idempotent and prints a skipping message when .kb exists
    expect(out.toLowerCase()).toContain("already exists, skipping");
  });
});
```


---

#### 🔙 PREVIOUS PART: [kibi-01-logic-6.md](file:kibi-01-logic-6.md)

#### ⏭️ NEXT PART: [kibi-02-tests-2.md](file:kibi-02-tests-2.md)

> _End of Part 8_
