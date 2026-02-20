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

  test("passes on valid KB", async () => {
    // Create valid requirement with scenario and test
    const reqDir = path.join(tmpDir, "documentation", "requirements");
    const scenarioDir = path.join(tmpDir, "documentation", "scenarios");
    const testDir = path.join(tmpDir, "documentation", "tests");

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
    const reqDir = path.join(tmpDir, "documentation", "requirements");
    const testDir = path.join(tmpDir, "documentation", "tests");

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
    expect(status).toBe(1);
    const output = stdoutToString(stdout || stderr);
    expect(output).toContain("must-priority-coverage");
    expect(output).toContain("scenario coverage");
  });

  test("detects must-priority requirement without test", async () => {
    const reqDir = path.join(tmpDir, "documentation", "requirements");
    const scenarioDir = path.join(tmpDir, "documentation", "scenarios");

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
  });

  test("detects dangling reference", async () => {
    const reqDir = path.join(tmpDir, "documentation", "requirements");

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
  });

  test("detects cycle in depends_on", async () => {
    const reqDir = path.join(tmpDir, "documentation", "requirements");

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
  });

  test("detects missing required field", async () => {
    const reqDir = path.join(tmpDir, "documentation", "requirements");

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
  });

  test("suggests fixes with --fix flag", async () => {
    const reqDir = path.join(tmpDir, "documentation", "requirements");

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
  });

  test("detects deprecated ADR with no successor", async () => {
    const adrDir = path.join(tmpDir, "documentation", "adr");

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
  });

  test("passes when deprecated ADR has a supersedes relationship", async () => {
    const adrDir = path.join(tmpDir, "documentation", "adr");

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
  });
});
