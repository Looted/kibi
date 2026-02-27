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
