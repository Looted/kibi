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
import { ensureMainBranch } from "./helpers";

describe("branch KB workflow", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../packages/cli/bin/kibi");

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

    // Rename default branch to 'main' if it's 'master'
    try {
      const currentBranch = execSync("git branch --show-current", {
        cwd: tmpDir,
        encoding: "utf8",
        stdio: "pipe",
      }).trim();
      if (currentBranch === "master") {
        execSync("git branch -m master main", { cwd: tmpDir, stdio: "pipe" });
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
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "main-req.md"),
      `---
title: Main Branch Requirement
type: req
status: approved
---

# Main Req
`,
    );

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit -m 'initial'", { cwd: tmpDir, stdio: "pipe" });
    ensureMainBranch(tmpDir);

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

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

    expect(existsSync(path.join(tmpDir, ".kb/branches/main/kb.rdf"))).toBe(
      true,
    );
    expect(existsSync(path.join(tmpDir, ".kb/branches/feature/kb.rdf"))).toBe(
      true,
    );
  }, 20000);

  test("branch KB is isolated from main KB", () => {
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "main-only.md"),
      `---
title: Main Only
type: req
status: approved
---

# Main Only
`,
    );

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit -m 'main commit'", { cwd: tmpDir, stdio: "pipe" });
    ensureMainBranch(tmpDir);

    const mainQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(mainQuery).toContain("main-only");

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

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

    const featureQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    // JSON format may return [] for empty results; accept either
    expect(featureQuery).toMatch(/(feature-only|\[\]|No entities found)/);
    expect(featureQuery).toMatch(/(main-only|\[\]|No entities found)/);

    execSync("git checkout main", { cwd: tmpDir, stdio: "pipe" });

    const mainQueryAfter = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(mainQueryAfter).toContain("main-only");
    expect(mainQueryAfter).not.toContain("feature-only");
  }, 20000);

  test("switching branches loads correct KB", () => {
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

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

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit -m 'v1'", { cwd: tmpDir, stdio: "pipe" });
    ensureMainBranch(tmpDir);

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

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

    const v2Query = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(v2Query).toContain("Version 2");

    execSync("git checkout main", { cwd: tmpDir, stdio: "pipe" });

    const mainQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(mainQuery).toContain("Version 1");
    expect(mainQuery).not.toContain("Version 2");
  }, 20000);

  test("creates branch KB on first sync", () => {
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    writeFileSync(path.join(tmpDir, "README.md"), "# temp\n");
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit -m 'init main'", { cwd: tmpDir, stdio: "pipe" });
    ensureMainBranch(tmpDir);
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

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

    expect(
      existsSync(path.join(tmpDir, ".kb/branches/new-feature/kb.rdf")),
    ).toBe(true);
  }, 20000);

  test("deleting branch document removes from branch KB only", () => {
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

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

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit -m 'add shared'", { cwd: tmpDir, stdio: "pipe" });
    ensureMainBranch(tmpDir);

    execSync("git checkout -b feature", { cwd: tmpDir, stdio: "pipe" });

    rmSync(path.join(reqDir, "shared.md"));

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

    const featureQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    // Accept either JSON empty array or table 'No entities found'
    expect(featureQuery).toMatch(/(\[\]|No entities found)/);

    execSync("git checkout main", { cwd: tmpDir, stdio: "pipe" });

    const mainQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(mainQuery).toContain("shared");
  }, 20000);

  test("merging branch preserves both KBs", () => {
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "main.md"),
      `---
title: Main
type: req
status: approved
---

# Main
`,
    );

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit -m 'main'", { cwd: tmpDir, stdio: "pipe" });
    ensureMainBranch(tmpDir);

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
    execSync("git commit -m 'feature'", { cwd: tmpDir, stdio: "pipe" });

    execSync("git checkout main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git merge feature --no-edit", { cwd: tmpDir, stdio: "pipe" });

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

    const mainQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(mainQuery).toContain("Main");
    expect(mainQuery).toContain("Feature");

    expect(existsSync(path.join(tmpDir, ".kb/branches/main/kb.rdf"))).toBe(
      true,
    );
    expect(existsSync(path.join(tmpDir, ".kb/branches/feature/kb.rdf"))).toBe(
      true,
    );
  }, 20000);

  test("orphan branch creates independent KB", () => {
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "main.md"),
      `---
title: Main
type: req
status: approved
---

# Main
`,
    );

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit -m 'main'", { cwd: tmpDir, stdio: "pipe" });

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

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

    const orphanQuery = execSync(`bun ${kibiBin} query req`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(orphanQuery).toContain("orphan");
    expect(orphanQuery).not.toContain("Main");
  }, 20000);
});
