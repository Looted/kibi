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

describe("kibi check", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-check-"));

    // Initialize KB structure
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("passes on valid KB", async () => {
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
links:
  - type: specified_by
    target: req1
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
  });

  test("detects must-priority requirement without scenario", async () => {
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
    try {
      execSync(`bun ${kibiBin} check`, { cwd: tmpDir, encoding: "utf8" });
      throw new Error("Should have failed");
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      expect(output).toContain("must-priority-coverage");
      expect(output).toContain("req1");
      expect(output).toContain("scenario");
    }
  });

  test("detects must-priority requirement without test", async () => {
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
    try {
      execSync(`bun ${kibiBin} check`, { cwd: tmpDir, encoding: "utf8" });
      throw new Error("Should have failed");
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      expect(output).toContain("must-priority-coverage");
      expect(output).toContain("req2");
      expect(output).toContain("test");
    }
  });

  test("detects dangling reference", async () => {
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

    // Check should fail
    try {
      execSync(`bun ${kibiBin} check`, { cwd: tmpDir, encoding: "utf8" });
      throw new Error("Should have failed");
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      expect(output).toContain("no-dangling-refs");
      expect(output).toContain("nonexistent-req");
    }
  });

  test("detects cycle in depends_on", async () => {
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
    try {
      execSync(`bun ${kibiBin} check`, { cwd: tmpDir, encoding: "utf8" });
      throw new Error("Should have failed");
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      expect(output).toContain("no-cycles");
      expect(output).toMatch(/req1.*req2.*req3/);
    }
  });

  test("detects missing required field", async () => {
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

    // Check should fail
    try {
      execSync(`bun ${kibiBin} check`, { cwd: tmpDir, encoding: "utf8" });
      throw new Error("Should have failed");
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      expect(output).toContain("required-fields");
      expect(output).toContain("title");
    }
  });

  test("suggests fixes with --fix flag", async () => {
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
    try {
      execSync(`bun ${kibiBin} check --fix`, { cwd: tmpDir, encoding: "utf8" });
      throw new Error("Should have failed");
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      expect(output).toContain("Suggestion:");
      expect(output).toContain("scenario");
      expect(output).toContain("test");
    }
  });
});
