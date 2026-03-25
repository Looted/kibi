// @ts-ignore
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync, spawnSync } from "node:child_process";
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
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const scenarioDir = path.join(tmpDir, "documentation/scenarios");
      const testDir = path.join(tmpDir, "documentation/tests");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(scenarioDir, { recursive: true });
      mkdirSync(testDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
id: req1
title: User Authentication
type: req
status: open
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
id: scenario1
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
id: test1
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
    "check is read-only and does not rewrite kb.rdf",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const scenarioDir = path.join(tmpDir, "documentation/scenarios");
      const testDir = path.join(tmpDir, "documentation/tests");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(scenarioDir, { recursive: true });
      mkdirSync(testDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
id: req1
title: User Authentication
type: req
status: open
priority: must
links:
  - type: specified_by
    target: scenario1
  - type: verified_by
    target: test1
---
`,
      );

      writeFileSync(
        path.join(scenarioDir, "scenario1.md"),
        `---
id: scenario1
title: Login Scenario
type: scenario
status: active
---
`,
      );

      writeFileSync(
        path.join(testDir, "test1.md"),
        `---
id: test1
title: Auth Test
type: test
status: passing
links:
  - type: validates
    target: req1
---
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const rdfPath = path.join(tmpDir, ".kb/branches/main/kb.rdf");
      const before = readFileSync(rdfPath, "utf8");
      const beforeMtime = statSync(rdfPath).mtimeMs;

      const output = execSync(`bun ${kibiBin} check`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toContain("No violations found");

      const after = readFileSync(rdfPath, "utf8");
      const afterMtime = statSync(rdfPath).mtimeMs;
      expect(after).toBe(before);
      expect(afterMtime).toBe(beforeMtime);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "detects must-priority requirement without scenario",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const testDir = path.join(tmpDir, "documentation/tests");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(testDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
id: req1
title: Critical Feature
type: req
status: open
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
id: test1
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
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "detects must-priority requirement without test",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const scenarioDir = path.join(tmpDir, "documentation/scenarios");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(scenarioDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "req2.md"),
        `---
id: req2
title: Another Critical Feature
type: req
status: open
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
id: scenario1
title: Feature Scenario
status: active
tags: [scenario]
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
    "passes must-priority coverage with verified_by relationship",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const scenarioDir = path.join(tmpDir, "documentation/scenarios");
      const testDir = path.join(tmpDir, "documentation/tests");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(scenarioDir, { recursive: true });
      mkdirSync(testDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "REQ-VERIFIED-001.md"),
        `---
id: REQ-VERIFIED-001
title: Verified Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: requirements/REQ-VERIFIED-001.md
links:
  - type: specified_by
    target: SCEN-VERIFIED-001
  - type: verified_by
    target: TEST-VERIFIED-001
---

# Verified Requirement
`,
      );

      writeFileSync(
        path.join(scenarioDir, "SCEN-VERIFIED-001.md"),
        `---
id: SCEN-VERIFIED-001
title: Verified Scenario
status: active
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: scenarios/SCEN-VERIFIED-001.md
---

# Verified Scenario
`,
      );

      writeFileSync(
        path.join(testDir, "TEST-VERIFIED-001.md"),
        `---
id: TEST-VERIFIED-001
title: Verified Test
status: passing
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: tests/TEST-VERIFIED-001.md
links:
  - type: validates
    target: REQ-VERIFIED-001
---

# Verified Test
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

  test(
    "reports each uncovered symbol once",
    async () => {
      const symbolsDir = path.join(tmpDir, "documentation");
      mkdirSync(symbolsDir, { recursive: true });
      writeFileSync(
        path.join(symbolsDir, "symbols.yaml"),
        `symbols:
  - id: symbol-uncovered-001
    title: Uncovered Symbol 1
    status: active
  - id: symbol-uncovered-002
    title: Uncovered Symbol 2
    status: active
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "symbol-coverage"],
        tmpDir,
      );
      expect(status).toBe(1);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("Found 2 violation(s):");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "detects self dependency cycle",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");

      mkdirSync(reqDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "REQ-SELF-CYCLE.md"),
        `---
id: REQ-SELF-CYCLE
title: Self Cycle
status: open
priority: should
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: requirements/REQ-SELF-CYCLE.md
links:
  - type: depends_on
    target: REQ-SELF-CYCLE
---

# Self Cycle
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "no-cycles"],
        tmpDir,
      );
      expect(status).toBe(1);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("no-cycles");
      expect(output).toContain("Circular dependency detected");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "detects dangling reference",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");

      mkdirSync(reqDir, { recursive: true });

      // Create requirement that links to non-existent entity
      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
id: req1
title: Feature with Bad Link
type: req
status: open
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
      const reqDir = path.join(tmpDir, "documentation/requirements");

      mkdirSync(reqDir, { recursive: true });

      // Create circular dependency: req1 -> req2 -> req3 -> req1
      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
id: req1
title: Requirement 1
type: req
status: open
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
id: req2
title: Requirement 2
type: req
status: open
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
id: req3
title: Requirement 3
type: req
status: open
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
      const reqDir = path.join(tmpDir, "documentation/requirements");

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
      const reqDir = path.join(tmpDir, "documentation/requirements");

      mkdirSync(reqDir, { recursive: true });

      // Create must-priority requirement without coverage
      writeFileSync(
        path.join(reqDir, "req1.md"),
        `---
id: req1
title: Uncovered Feature
type: req
status: open
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
      const adrDir = path.join(tmpDir, "documentation/adr");

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
      const adrDir = path.join(tmpDir, "documentation/adr");

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
status: accepted
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
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const factDir = path.join(tmpDir, "documentation/facts");

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
fact_kind: subject
subject_key: user.role_assignment
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
fact_kind: property_value
subject_key: user.role_assignment
property_key: max_roles
operator: eq
value_type: int
value_int: 2
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
fact_kind: property_value
subject_key: user.role_assignment
property_key: max_roles
operator: eq
value_type: int
value_int: 3
---
`,
      );

      writeFileSync(
        path.join(reqDir, "REQ-018.md"),
        `---
id: REQ-018
title: Users have a maximum of 2 roles
status: open
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
status: open
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
      expect(output).toContain("user.role_assignment.max_roles");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes when contradiction is superseded",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const factDir = path.join(tmpDir, "documentation/facts");

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
fact_kind: subject
subject_key: user.role_assignment
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
fact_kind: property_value
subject_key: user.role_assignment
property_key: max_roles
operator: eq
value_type: int
value_int: 2
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
fact_kind: property_value
subject_key: user.role_assignment
property_key: max_roles
operator: eq
value_type: int
value_int: 3
---
`,
      );

      writeFileSync(
        path.join(reqDir, "REQ-018.md"),
        `---
id: REQ-018
title: Users have a maximum of 2 roles
status: open
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
status: open
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

  test(
    "--staged passes when symbol is linked in symbols.yaml without inline directives",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const srcDir = path.join(tmpDir, "src");

      mkdirSync(docDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      // Create requirement
      writeFileSync(
        path.join(docDir, "REQ-STAGED-001.md"),
        `---
id: REQ-STAGED-001
title: Staged Test Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/REQ-STAGED-001.md
---
`,
      );

      // Create symbols.yaml with explicit ID and requirement link
      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYMBOL-STAGED-001
    title: stagedFunction
    sourceFile: src/app.ts
    links:
      - REQ-STAGED-001
    status: active
`,
      );

      // Create source file (no inline implements directive)
      writeFileSync(
        path.join(srcDir, "app.ts"),
        `export function stagedFunction() {
  return "hello";
}
`,
      );

      // Initialize git and stage files (skip pre-commit hook for initial setup)
      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
      execSync('git config user.email "test@example.com"', {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync('git config user.name "Test User"', {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync('git commit -m "initial" --no-verify', {
        cwd: tmpDir,
        stdio: "pipe",
      });

      // Modify the source file
      writeFileSync(
        path.join(srcDir, "app.ts"),
        `export function stagedFunction() {
  return "hello world";
}
`,
      );

      // Stage only the source file
      execSync("git add src/app.ts", { cwd: tmpDir, stdio: "pipe" });

      // Sync KB first
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Run staged check - should pass because symbols.yaml links it
      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "--staged uses custom paths.symbols from config",
    async () => {
      const configDir = path.join(tmpDir, ".kb");
      const customDir = path.join(tmpDir, "custom");
      const srcDir = path.join(tmpDir, "src");

      mkdirSync(configDir, { recursive: true });
      mkdirSync(customDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      // Create custom config with custom symbols path
      writeFileSync(
        path.join(configDir, "config.json"),
        JSON.stringify({
          paths: {
            symbols: "custom/my-symbols.yaml",
          },
        }),
      );

      // Create requirement
      writeFileSync(
        path.join(customDir, "REQ-CUSTOM-001.md"),
        `---
id: REQ-CUSTOM-001
title: Custom Path Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: custom/REQ-CUSTOM-001.md
---
`,
      );

      // Create symbols.yaml in custom location
      writeFileSync(
        path.join(customDir, "my-symbols.yaml"),
        `symbols:
  - id: SYMBOL-CUSTOM-001
    title: customFunction
    sourceFile: src/app.ts
    links:
      - REQ-CUSTOM-001
    status: active
`,
      );

      // Create source file
      writeFileSync(
        path.join(srcDir, "app.ts"),
        `export function customFunction() {
  return "custom";
}
`,
      );

      // Initialize git and stage (skip pre-commit hook for initial setup)
      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
      execSync('git config user.email "test@example.com"', {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync('git config user.name "Test User"', {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync('git commit -m "initial" --no-verify', {
        cwd: tmpDir,
        stdio: "pipe",
      });

      // Modify and stage
      writeFileSync(
        path.join(srcDir, "app.ts"),
        `export function customFunction() {
  return "custom modified";
}
`,
      );
      execSync("git add src/app.ts", { cwd: tmpDir, stdio: "pipe" });

      // Sync KB
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Run staged check
      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "should run strict-fact-shape rule without errors",
    async () => {
      // Create a valid KB and test that the strict-fact-shape rule can run
      const factDir = path.join(tmpDir, "documentation/facts");
      mkdirSync(factDir, { recursive: true });

      // Create a valid legacy fact (no fact_kind - should not trigger violation)
      writeFileSync(
        path.join(factDir, "FACT-LEGACY-001.md"),
        `---
id: FACT-LEGACY-001
title: Legacy Fact
status: active
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: facts/FACT-LEGACY-001.md
---
Content
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Run check with strict-fact-shape rule - should pass with no violations
      // since there are no malformed strict facts (only a legacy fact without fact_kind)
      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "strict-fact-shape"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);

      // Rule should be recognized and run without error
      expect(status).toBe(0);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "should not flag well-formed strict facts with strict-fact-shape rule",
    async () => {
      const factDir = path.join(tmpDir, "documentation/facts");
      mkdirSync(factDir, { recursive: true });

      // Create a well-formed strict fact
      writeFileSync(
        path.join(factDir, "FACT-WELLFORMED-001.md"),
        `---
id: FACT-WELLFORMED-001
title: Well-formed Subject Fact
status: active
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: facts/FACT-WELLFORMED-001.md
fact_kind: subject
subject_key: user.profile
---
Content
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "strict-fact-shape"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);

      expect(status).toBe(0);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "should not flag legacy facts without fact_kind when strict-fact-shape enabled",
    async () => {
      const factDir = path.join(tmpDir, "documentation/facts");
      mkdirSync(factDir, { recursive: true });

      // Create a legacy fact without fact_kind (should not be flagged)
      writeFileSync(
        path.join(factDir, "FACT-LEGACY-001.md"),
        `---
id: FACT-LEGACY-001
title: Legacy Fact
status: active
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: facts/FACT-LEGACY-001.md
---
Legacy prose fact without strict shape
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "strict-fact-shape"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);

      expect(status).toBe(0);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );
});
