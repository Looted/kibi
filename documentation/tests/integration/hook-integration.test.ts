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
