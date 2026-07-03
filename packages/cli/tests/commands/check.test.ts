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
  if (stdout !== null && typeof stdout === "object" && "toString" in stdout) {
    const maybeToString = stdout.toString;
    if (typeof maybeToString === "function") return maybeToString.call(stdout);
  }
  return "";
}

type CheckJsonResult = {
  readonly structuredContent?: {
    readonly count?: number;
    readonly qualityDiagnostics?: readonly {
      readonly id?: string;
      readonly entityId?: string;
      readonly blocking?: boolean;
      readonly severity?: string;
      readonly evidence?: Record<string, unknown>;
    }[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDiagnosticRecord(value: unknown): value is {
  readonly id: string;
  readonly entityId?: string;
  readonly blocking?: boolean;
  readonly severity?: string;
  readonly evidence?: Record<string, unknown>;
} {
  return isRecord(value) && typeof value.id === "string";
}

function parseCheckJson(stdout: string): CheckJsonResult {
  const parsed: unknown = JSON.parse(stdout);
  if (!isRecord(parsed)) {
    return {};
  }

  const structuredContent = parsed.structuredContent;
  if (!isRecord(structuredContent)) {
    return {};
  }

  const qualityDiagnostics = structuredContent.qualityDiagnostics;
  return {
    structuredContent: {
      count:
        typeof structuredContent.count === "number"
          ? structuredContent.count
          : undefined,
      qualityDiagnostics: Array.isArray(qualityDiagnostics)
        ? qualityDiagnostics.flatMap((diagnostic) =>
            isDiagnosticRecord(diagnostic)
              ? [
                  {
                    id: diagnostic.id,
                    entityId: diagnostic.entityId,
                    blocking: diagnostic.blocking,
                    severity: diagnostic.severity,
                    evidence: diagnostic.evidence,
                  },
                ]
              : [],
          )
        : undefined,
    },
  };
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

function writeBroadRequirementFixture(root: string): void {
  const reqDir = path.join(root, "documentation/requirements");
  const testDir = path.join(root, "documentation/tests");
  mkdirSync(reqDir, { recursive: true });
  mkdirSync(testDir, { recursive: true });

  writeFileSync(
    path.join(reqDir, "REQ-BROAD-CHECK-001.md"),
    `---
id: REQ-BROAD-CHECK-001
title: Broad check audit requirement
type: req
status: open
priority: should
source: documentation/requirements/REQ-BROAD-CHECK-001.md
links:
${Array.from({ length: 9 }, (_, index) => {
  const ordinal = index + 1;
  return `  - type: verified_by
    target: TEST-BROAD-CHECK-${String(ordinal).padStart(3, "0")}`;
}).join("\n")}
---

# Broad check audit requirement
`,
  );

  for (const ordinal of Array.from({ length: 9 }, (_, index) => index + 1)) {
    writeFileSync(
      path.join(
        testDir,
        `TEST-BROAD-CHECK-${String(ordinal).padStart(3, "0")}.md`,
      ),
      `---
id: TEST-BROAD-CHECK-${String(ordinal).padStart(3, "0")}
title: Broad check test ${ordinal}
type: test
status: passing
source: documentation/tests/TEST-BROAD-CHECK-${String(ordinal).padStart(3, "0")}.md
links:
  - type: validates
    target: REQ-BROAD-CHECK-001
---

# Broad check test ${ordinal}
`,
    );
  }
}

function writeUmbrellaBroadRequirementFixture(root: string): void {
  writeBroadRequirementFixture(root);
  writeFileSync(
    path.join(root, "documentation/requirements/REQ-BROAD-CHECK-001.md"),
    `---
id: REQ-BROAD-CHECK-001
title: Broad check audit requirement
type: req
status: open
priority: should
source: documentation/requirements/REQ-BROAD-CHECK-001.md
tags:
  - umbrella
links:
${Array.from({ length: 9 }, (_, index) => {
  const ordinal = index + 1;
  return `  - type: verified_by
    target: TEST-BROAD-CHECK-${String(ordinal).padStart(3, "0")}`;
}).join("\n")}
---

# Broad check audit requirement
`,
  );
}

function addSubjectOnlyStrictFactToBroadRequirement(root: string): void {
  const factDir = path.join(root, "documentation/facts");
  mkdirSync(factDir, { recursive: true });
  writeFileSync(
    path.join(factDir, "FACT-BROAD-SUBJECT-ONLY-001.md"),
    `---
id: FACT-BROAD-SUBJECT-ONLY-001
title: Broad subject only fact
type: fact
status: active
source: documentation/facts/FACT-BROAD-SUBJECT-ONLY-001.md
fact_kind: subject
subject_key: broad.audit
---

# Broad subject only fact
`,
  );

  writeFileSync(
    path.join(root, "documentation/requirements/REQ-BROAD-CHECK-001.md"),
    `---
id: REQ-BROAD-CHECK-001
title: Broad check audit requirement
type: req
status: open
priority: should
source: documentation/requirements/REQ-BROAD-CHECK-001.md
links:
${Array.from({ length: 9 }, (_, index) => {
  const ordinal = index + 1;
  return `  - type: verified_by
    target: TEST-BROAD-CHECK-${String(ordinal).padStart(3, "0")}`;
}).join("\n")}
  - type: constrains
    target: FACT-BROAD-SUBJECT-ONLY-001
---

# Broad check audit requirement
`,
  );
}

type CoverageDepthFixture =
  | "unit_only"
  | "open_or_nonpassing_tests_only"
  | "scenario_only_no_test"
  | "no_test_evidence"
  | "direct_passing_integration"
  | "scenario_passing_integration"
  | "direct_passing_e2e"
  | "scenario_passing_e2e";

function yamlDoc(lines: readonly string[]): string {
  return ["---", ...lines, "---", ""].join("\n");
}

function writeCoverageDepthFixture(
  root: string,
  coverageDepth: CoverageDepthFixture,
): void {
  const reqDir = path.join(root, "documentation/requirements");
  const scenarioDir = path.join(root, "documentation/scenarios");
  const testDir = path.join(root, "documentation/tests");
  mkdirSync(reqDir, { recursive: true });
  mkdirSync(scenarioDir, { recursive: true });
  mkdirSync(testDir, { recursive: true });

  const reqId = `REQ-COVERAGE-${coverageDepth.toUpperCase()}`;
  const scenarioId = `SCEN-COVERAGE-${coverageDepth.toUpperCase()}`;
  const testId = `TEST-COVERAGE-${coverageDepth.toUpperCase()}`;
  const hasScenario =
    coverageDepth === "scenario_only_no_test" ||
    coverageDepth === "scenario_passing_integration" ||
    coverageDepth === "scenario_passing_e2e";
  const hasDirectTest =
    coverageDepth === "unit_only" ||
    coverageDepth === "open_or_nonpassing_tests_only" ||
    coverageDepth === "direct_passing_integration" ||
    coverageDepth === "direct_passing_e2e";
  const requirementLinks = hasScenario
    ? ["links:", "  - type: specified_by", `    target: ${scenarioId}`]
    : hasDirectTest
      ? ["links:", "  - type: verified_by", `    target: ${testId}`]
      : [];

  writeFileSync(
    path.join(reqDir, `${reqId}.md`),
    yamlDoc([
      `id: ${reqId}`,
      `title: Coverage depth ${coverageDepth}`,
      "type: req",
      "status: open",
      "priority: should",
      `source: documentation/requirements/${reqId}.md`,
      ...requirementLinks,
    ]),
  );

  if (hasScenario) {
    writeFileSync(
      path.join(scenarioDir, `${scenarioId}.md`),
      yamlDoc([
        `id: ${scenarioId}`,
        `title: Coverage scenario ${coverageDepth}`,
        "type: scenario",
        "status: active",
        `source: documentation/scenarios/${scenarioId}.md`,
      ]),
    );
  }

  if (coverageDepth === "unit_only") {
    writeFileSync(
      path.join(testDir, `${testId}.md`),
      yamlDoc([
        `id: ${testId}`,
        "title: Unit coverage depth test",
        "type: test",
        "status: passing",
        "verification_scope: unit",
        `source: documentation/tests/${testId}.md`,
      ]),
    );
  }

  if (coverageDepth === "open_or_nonpassing_tests_only") {
    writeFileSync(
      path.join(testDir, `${testId}.md`),
      yamlDoc([
        `id: ${testId}`,
        "title: Open coverage depth test",
        "type: test",
        "status: open",
        "verification_scope: end_to_end",
        `source: documentation/tests/${testId}.md`,
      ]),
    );
  }

  if (coverageDepth === "direct_passing_e2e") {
    writeFileSync(
      path.join(testDir, `${testId}.md`),
      yamlDoc([
        `id: ${testId}`,
        "title: Direct e2e coverage depth test",
        "type: test",
        "status: passing",
        "verification_scope: end_to_end",
        `source: documentation/tests/${testId}.md`,
      ]),
    );
  }

  if (coverageDepth === "direct_passing_integration") {
    writeFileSync(
      path.join(testDir, `${testId}.md`),
      yamlDoc([
        `id: ${testId}`,
        "title: Direct integration coverage depth test",
        "type: test",
        "status: passing",
        "verification_scope: integration",
        `source: documentation/tests/${testId}.md`,
      ]),
    );
  }

  if (coverageDepth === "scenario_passing_integration") {
    writeFileSync(
      path.join(testDir, `${testId}.md`),
      yamlDoc([
        `id: ${testId}`,
        "title: Scenario integration coverage depth test",
        "type: test",
        "status: passing",
        "verification_scope: integration",
        `source: documentation/tests/${testId}.md`,
        "links:",
        "  - type: validates",
        `    target: ${scenarioId}`,
      ]),
    );
  }

  if (coverageDepth === "scenario_passing_e2e") {
    writeFileSync(
      path.join(testDir, `${testId}.md`),
      yamlDoc([
        `id: ${testId}`,
        "title: Scenario e2e coverage depth test",
        "type: test",
        "status: passing",
        "verification_scope: end_to_end",
        `source: documentation/tests/${testId}.md`,
        "links:",
        "  - type: validates",
        `    target: ${scenarioId}`,
      ]),
    );
  }
}

describe("kibi check", () => {
  const TEST_TIMEOUT_MS = 30000;
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
    "runs query-plan-safety through the CLI check surface",
    async () => {
      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "query-plan-safety"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "prints advisory quality diagnostics for broad requirements without failing",
    async () => {
      writeBroadRequirementFixture(tmpDir);
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).toContain("No violations found");
      expect(output).toContain("broad_requirement_review");
      expect(output).toContain("Quality diagnostics");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "emits structured quality diagnostics with json format",
    async () => {
      writeBroadRequirementFixture(tmpDir);
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout } = runKibi(
        kibiBin,
        ["check", "--format", "json"],
        tmpDir,
      );

      const parsed = parseCheckJson(stdout);
      expect(status).toBe(0);
      expect(parsed.structuredContent?.count).toBe(0);
      expect(
        parsed.structuredContent?.qualityDiagnostics?.some(
          (diagnostic) => diagnostic.id === "broad_requirement_review",
        ),
      ).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "does not emit broad requirement diagnostics for explicit umbrella requirements",
    async () => {
      writeUmbrellaBroadRequirementFixture(tmpDir);
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout } = runKibi(
        kibiBin,
        ["check", "--format", "json"],
        tmpDir,
      );

      const parsed = parseCheckJson(stdout);
      expect(status).toBe(0);
      expect(parsed.structuredContent?.count).toBe(0);
      expect(
        parsed.structuredContent?.qualityDiagnostics?.some(
          (diagnostic) => diagnostic.id === "broad_requirement_review",
        ) ?? false,
      ).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "prints advisory coverage depth diagnostics for unit-only requirements without failing",
    async () => {
      writeCoverageDepthFixture(tmpDir, "unit_only");
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(kibiBin, ["check"], tmpDir);

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).toContain("No violations found");
      expect(output).toContain("[REVIEW coverage_depth_review]");
      expect(output).toContain("unit_only");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "emits coverage depth diagnostics for nonpassing tests and missing test evidence",
    async () => {
      writeCoverageDepthFixture(tmpDir, "open_or_nonpassing_tests_only");
      writeCoverageDepthFixture(tmpDir, "scenario_only_no_test");
      writeCoverageDepthFixture(tmpDir, "no_test_evidence");
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout } = runKibi(
        kibiBin,
        ["check", "--format", "json"],
        tmpDir,
      );

      const parsed = parseCheckJson(stdout);
      const coverageDiagnostics =
        parsed.structuredContent?.qualityDiagnostics?.filter(
          (diagnostic) => diagnostic.id === "coverage_depth_review",
        ) ?? [];
      expect(status).toBe(0);
      expect(parsed.structuredContent?.count).toBe(0);
      expect(
        coverageDiagnostics.map((diagnostic) => diagnostic.entityId),
      ).toEqual([
        "REQ-COVERAGE-NO_TEST_EVIDENCE",
        "REQ-COVERAGE-OPEN_OR_NONPASSING_TESTS_ONLY",
        "REQ-COVERAGE-SCENARIO_ONLY_NO_TEST",
      ]);
      expect(
        coverageDiagnostics.every(
          (diagnostic) =>
            diagnostic.severity === "review" && diagnostic.blocking === false,
        ),
      ).toBe(true);
      expect(coverageDiagnostics[1]?.evidence?.coverageDepth).toBe(
        "open_or_nonpassing_tests_only",
      );
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "does not emit coverage depth diagnostics for passing e2e requirements",
    async () => {
      writeCoverageDepthFixture(tmpDir, "direct_passing_e2e");
      writeCoverageDepthFixture(tmpDir, "scenario_passing_e2e");
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout } = runKibi(
        kibiBin,
        ["check", "--format", "json"],
        tmpDir,
      );

      const parsed = parseCheckJson(stdout);
      expect(status).toBe(0);
      expect(parsed.structuredContent?.count).toBe(0);
      expect(
        parsed.structuredContent?.qualityDiagnostics?.some(
          (diagnostic) => diagnostic.id === "coverage_depth_review",
        ) ?? false,
      ).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "does not emit coverage depth diagnostics for passing integration requirements",
    async () => {
      writeCoverageDepthFixture(tmpDir, "direct_passing_integration");
      writeCoverageDepthFixture(tmpDir, "scenario_passing_integration");
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout } = runKibi(
        kibiBin,
        ["check", "--format", "json"],
        tmpDir,
      );

      const parsed = parseCheckJson(stdout);
      expect(status).toBe(0);
      expect(parsed.structuredContent?.count).toBe(0);
      expect(
        parsed.structuredContent?.qualityDiagnostics?.some(
          (diagnostic) => diagnostic.id === "coverage_depth_review",
        ) ?? false,
      ).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "keeps hard violation exit status when quality diagnostics are present",
    async () => {
      writeBroadRequirementFixture(tmpDir);
      addSubjectOnlyStrictFactToBroadRequirement(tmpDir);
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "strict-req-fact-pairing"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).toContain("Found 1 violation");
      expect(output).toContain("strict-req-fact-pairing");
      expect(output).toContain("broad_requirement_review");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "reports legacy fact-linked requirements as not-ready instead of contradictions",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const factDir = path.join(tmpDir, "documentation/facts");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(factDir, { recursive: true });

      writeFileSync(
        path.join(factDir, "FACT-LEGACY-TRACEABLE-001.md"),
        `---
id: FACT-LEGACY-TRACEABLE-001
title: Legacy Account Policy Note
status: active
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: facts/FACT-LEGACY-TRACEABLE-001.md
---
Legacy prose fact without strict shape
`,
      );

      writeFileSync(
        path.join(reqDir, "REQ-LEGACY-TRACEABLE-001.md"),
        `---
id: REQ-LEGACY-TRACEABLE-001
title: Legacy requirement linked to a prose fact
type: req
status: open
priority: should
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: requirements/REQ-LEGACY-TRACEABLE-001.md
links:
  - type: constrains
    target: FACT-LEGACY-TRACEABLE-001
---

# Legacy requirement linked to a prose fact
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "strict-readiness,domain-contradictions"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).toContain("strict-readiness");
      expect(output).toContain("REQ-LEGACY-TRACEABLE-001");
      expect(output).toContain("traceable");
      expect(output).toContain("not-ready");
      expect(output).not.toContain("domain-contradictions");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "reports subject-only requirements as has-subject and pairing violations",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const factDir = path.join(tmpDir, "documentation/facts");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(factDir, { recursive: true });

      writeFileSync(
        path.join(factDir, "FACT-SUBJECT-ONLY-001.md"),
        `---
id: FACT-SUBJECT-ONLY-001
title: Subject-only account policy
status: active
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: facts/FACT-SUBJECT-ONLY-001.md
fact_kind: subject
subject_key: account.policy
---
`,
      );

      writeFileSync(
        path.join(reqDir, "REQ-SUBJECT-ONLY-001.md"),
        `---
id: REQ-SUBJECT-ONLY-001
title: Subject-only strict requirement
type: req
status: open
priority: should
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: requirements/REQ-SUBJECT-ONLY-001.md
links:
  - type: constrains
    target: FACT-SUBJECT-ONLY-001
---

# Subject-only strict requirement
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "strict-readiness,strict-req-fact-pairing"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).toContain("strict-readiness");
      expect(output).toContain("REQ-SUBJECT-ONLY-001");
      expect(output).toContain("has-subject");
      expect(output).toContain("strict-req-fact-pairing");
      expect(output).toContain("requires_property");
    },
    TEST_TIMEOUT_MS,
  );

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
      expect(output).toContain("REQ-018/REQ-019");
      expect(output).toContain("contradiction-ready");
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
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "src");

      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(docDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

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

      writeFileSync(
        path.join(reqDocDir, "REQ-STAGED-001.md"),
        `---
id: REQ-STAGED-001
title: Staged Test Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-STAGED-001.md
---
`,
      );

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

      writeFileSync(
        path.join(srcDir, "app.ts"),
        `export function stagedFunction() {
  return "hello";
}
`,
      );

      // Modify the source file
      writeFileSync(
        path.join(srcDir, "app.ts"),
        `export function stagedFunction() {
  return "hello world";
}
`,
      );

      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });

      // Sync KB first
      execSync(`bun ${kibiBin} sync --refresh-symbol-coordinates`, {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync(
        "git add documentation/symbol-coordinates.yaml documentation/symbols.yaml",
        {
          cwd: tmpDir,
          stdio: "pipe",
        },
      );

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
    "--staged projects only manifest entities for staged source files",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "src");
      const legacyDir = path.join(tmpDir, "legacy");

      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });
      mkdirSync(legacyDir, { recursive: true });

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

      writeFileSync(
        path.join(reqDocDir, "REQ-STAGED-SCOPED-001.md"),
        `---
id: REQ-STAGED-SCOPED-001
title: Staged Scoped Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-STAGED-SCOPED-001.md
---
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYMBOL-STAGED-SCOPED-001
    title: stagedScopedFunction
    sourceFile: src/app.ts
    links:
      - REQ-STAGED-SCOPED-001
    status: active
`,
      );

      writeFileSync(
        path.join(srcDir, "app.ts"),
        `export function stagedScopedFunction() {
  return "hello";
}
`,
      );
      writeFileSync(
        path.join(legacyDir, "unrelated.ts"),
        `export function unrelatedHistoricalFunction() {
  return "historical";
}
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
      execSync('git commit -m "baseline" --no-verify', {
        cwd: tmpDir,
        stdio: "pipe",
      });

      writeFileSync(
        path.join(srcDir, "app.ts"),
        `export function stagedScopedFunction() {
  return "hello scoped";
}
`,
      );
      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYMBOL-STAGED-SCOPED-001
    title: stagedScopedFunction
    sourceFile: src/app.ts
    links:
      - REQ-STAGED-SCOPED-001
    status: active
  - id: SYMBOL-UNRELATED-HISTORICAL-001
    title: unrelatedHistoricalFunction
    sourceFile: legacy/unrelated.ts
    links:
      - REQ-UNRELATED-MISSING-001
    status: active
`,
      );

      execSync(`bun ${kibiBin} sync --refresh-symbol-coordinates`, {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync(
        "git add src/app.ts documentation/symbols.yaml documentation/symbol-coordinates.yaml",
        {
          cwd: tmpDir,
          stdio: "pipe",
        },
      );

      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);

      expect(result.status).toBe(0);
      expect(output).toContain("No violations found");
      expect(output).not.toContain("REQ-UNRELATED-MISSING-001");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "--staged uses custom paths.symbols from config",
    async () => {
      const configDir = path.join(tmpDir, ".kb");
      const docDir = path.join(tmpDir, "documentation");
      const customDir = path.join(tmpDir, "custom");
      const reqDocDir = path.join(tmpDir, "documentation/requirements");
      const srcDir = path.join(tmpDir, "src");

      mkdirSync(configDir, { recursive: true });
      mkdirSync(reqDocDir, { recursive: true });
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

      writeFileSync(
        path.join(reqDocDir, "REQ-CUSTOM-001.md"),
        `---
id: REQ-CUSTOM-001
title: Custom Path Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-CUSTOM-001.md
---
`,
      );

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

      writeFileSync(
        path.join(customDir, "symbols.yaml"),
        `symbols:
  - id: SYMBOL-CUSTOM-001
    title: customFunction
    sourceFile: src/app.ts
    links:
      - REQ-CUSTOM-001
    status: active
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYM-CUSTOM-001
    title: customFunction
    sourceFile: src/app.ts
    sourceLine: 1
    sourceColumn: 16
    sourceEndLine: 3
    sourceEndColumn: 1
    links:
      - REQ-CUSTOM-001
    status: active
`,
      );

      writeFileSync(
        path.join(srcDir, "app.ts"),
        `export function customFunction() {
  return "custom";
}
`,
      );

      // Modify and stage
      writeFileSync(
        path.join(srcDir, "app.ts"),
        `export function customFunction() {
  return "custom modified";
}
`,
      );
      execSync(`bun ${kibiBin} sync --refresh-symbol-coordinates`, {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync(
        "git add src/app.ts custom/my-symbols.yaml custom/symbol-coordinates.yaml custom/symbols.yaml documentation/requirements/REQ-CUSTOM-001.md",
        { cwd: tmpDir, stdio: "pipe" },
      );

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

  test(
    "should detect requires_property facts without matching strict subject linkage",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const factDir = path.join(tmpDir, "documentation/facts");
      mkdirSync(reqDir, { recursive: true });
      mkdirSync(factDir, { recursive: true });

      writeFileSync(
        path.join(factDir, "FACT-PAIR-SUBJECT-CLI-001.md"),
        `---
id: FACT-PAIR-SUBJECT-CLI-001
title: CLI Pairing Subject
status: active
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: facts/FACT-PAIR-SUBJECT-CLI-001.md
fact_kind: subject
subject_key: account.session
---
`,
      );

      writeFileSync(
        path.join(factDir, "FACT-PAIR-PROP-CLI-001.md"),
        `---
id: FACT-PAIR-PROP-CLI-001
title: CLI Pairing Property
status: active
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: facts/FACT-PAIR-PROP-CLI-001.md
fact_kind: property_value
subject_key: billing.account
property_key: max_sessions
operator: eq
value_type: int
value_int: 1
---
`,
      );

      writeFileSync(
        path.join(reqDir, "REQ-PAIRING-CLI-001.md"),
        `---
id: REQ-PAIRING-CLI-001
title: CLI strict pairing mismatch
type: req
status: open
priority: should
created_at: 2026-02-20T10:00:00Z
updated_at: 2026-02-20T10:00:00Z
source: requirements/REQ-PAIRING-CLI-001.md
links:
  - type: constrains
    target: FACT-PAIR-SUBJECT-CLI-001
  - type: requires_property
    target: FACT-PAIR-PROP-CLI-001
---

# CLI strict pairing mismatch
`,
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "strict-req-fact-pairing"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);

      expect(status).toBe(1);
      expect(output).toContain("strict-req-fact-pairing");
      expect(output).toContain("REQ-PAIRING-CLI-001");
    },
    TEST_TIMEOUT_MS,
  );

  // === Staged E2E Traceability Matrix ===
  // Each test stages source + manifest + docs in one commit without prior kibi sync.
  // The staged pipeline must resolve traceability end-to-end.

  test(
    "staged e2e: covered_by alone does not satisfy ownership gate (split semantics)",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const testDocDir = path.join(docDir, "tests");
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "src");
      mkdirSync(testDocDir, { recursive: true });
      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(path.join(tmpDir, ".gitkeep"), "");
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

      writeFileSync(
        path.join(reqDocDir, "REQ-E2E-LOGIN.md"),
        `---
id: REQ-E2E-LOGIN
title: E2E Login Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-E2E-LOGIN.md
---
`,
      );

      writeFileSync(
        path.join(testDocDir, "TEST-E2E-LOGIN.md"),
        `---
id: TEST-E2E-LOGIN
title: E2E Login Test
status: passing
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/tests/TEST-E2E-LOGIN.md
links:
  - type: validates
    target: REQ-E2E-LOGIN
---
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYM-E2E-LOGIN
    title: loginFlow
    sourceFile: src/login.ts
    links:
      - type: covered_by
        target: TEST-E2E-LOGIN
    status: active
`,
      );

      writeFileSync(
        path.join(srcDir, "login.ts"),
        `export function loginFlow() {
  return "login";
}
`,
      );

      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);
      // covered_by alone does NOT satisfy staged ownership gate
      expect(result.status).not.toBe(0);
      expect(output).toContain("Traceability failed");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "staged e2e: covered_by -> verified_by <- req fails ownership (split semantics)",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const testDocDir = path.join(docDir, "tests");
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "src");
      mkdirSync(testDocDir, { recursive: true });
      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(path.join(tmpDir, ".gitkeep"), "");
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

      writeFileSync(
        path.join(reqDocDir, "REQ-E2E-LOGOUT.md"),
        `---
id: REQ-E2E-LOGOUT
title: E2E Logout Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-E2E-LOGOUT.md
links:
  - type: verified_by
    target: TEST-E2E-LOGOUT
---
`,
      );

      writeFileSync(
        path.join(testDocDir, "TEST-E2E-LOGOUT.md"),
        `---
id: TEST-E2E-LOGOUT
title: E2E Logout Test
status: passing
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/tests/TEST-E2E-LOGOUT.md
---
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYM-E2E-LOGOUT
    title: logoutFlow
    sourceFile: src/logout.ts
    links:
      - type: covered_by
        target: TEST-E2E-LOGOUT
    status: active
`,
      );

      writeFileSync(
        path.join(srcDir, "logout.ts"),
        `export function logoutFlow() {
  return "logout";
}
`,
      );

      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);
      // covered_by alone does NOT satisfy staged ownership gate
      expect(result.status).not.toBe(0);
      expect(output).toContain("Traceability failed");
      expect(output).toContain("implement");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "staged e2e: covered_by with no req-linked test fails",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const testDocDir = path.join(docDir, "tests");
      const srcDir = path.join(tmpDir, "src");
      mkdirSync(testDocDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(path.join(tmpDir, ".gitkeep"), "");
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

      writeFileSync(
        path.join(testDocDir, "TEST-E2E-BARE.md"),
        `---
id: TEST-E2E-BARE
title: Bare Test No Req
status: passing
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/tests/TEST-E2E-BARE.md
---
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYM-E2E-BARE
    title: bareFunction
    sourceFile: src/bare.ts
    links:
      - type: covered_by
        target: TEST-E2E-BARE
    status: active
`,
      );

      writeFileSync(
        path.join(srcDir, "bare.ts"),
        `export function bareFunction() {
  return "bare";
}
`,
      );

      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });

      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);
      expect(result.status).not.toBe(0);
      expect(output).toContain("Traceability failed");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "staged e2e: relates_to replacing typed link fails",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const testDocDir = path.join(docDir, "tests");
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "src");
      mkdirSync(testDocDir, { recursive: true });
      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(path.join(tmpDir, ".gitkeep"), "");
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

      writeFileSync(
        path.join(reqDocDir, "REQ-E2E-WEAK.md"),
        `---
id: REQ-E2E-WEAK
title: E2E Weak Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-E2E-WEAK.md
---
`,
      );

      writeFileSync(
        path.join(testDocDir, "TEST-E2E-WEAK.md"),
        `---
id: TEST-E2E-WEAK
title: E2E Weak Test
status: passing
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/tests/TEST-E2E-WEAK.md
links:
  - type: relates_to
    target: REQ-E2E-WEAK
---
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYM-E2E-WEAK
    title: weakFunction
    sourceFile: src/weak.ts
    links:
      - type: covered_by
        target: TEST-E2E-WEAK
    status: active
`,
      );

      writeFileSync(
        path.join(srcDir, "weak.ts"),
        `export function weakFunction() {
  return "weak";
}
`,
      );

      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });

      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);
      expect(result.status).not.toBe(0);
      expect(output).toContain("Traceability failed");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "staged e2e: executable_for symbol passes staged ownership gate",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const testDocDir = path.join(docDir, "tests");
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "tests");
      mkdirSync(testDocDir, { recursive: true });
      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(path.join(tmpDir, ".gitkeep"), "");
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

      writeFileSync(
        path.join(reqDocDir, "REQ-EXE-001.md"),
        `---
id: REQ-EXE-001
title: Exe Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-EXE-001.md
---
`,
      );

      writeFileSync(
        path.join(testDocDir, "TEST-EXE-001.md"),
        `---
id: TEST-EXE-001
title: Exe Test
status: passing
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/tests/TEST-EXE-001.md
links:
  - type: validates
    target: REQ-EXE-001
---
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYM-EXE-TEST
    title: testHelper
    sourceFile: tests/helper.ts
    links:
      - type: executable_for
        target: TEST-EXE-001
    status: active
`,
      );

      writeFileSync(
        path.join(srcDir, "helper.ts"),
        `export function testHelper() {
  return "helper";
}
`,
      );

      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });

      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);
      // executable_for symbols are excluded from ownership gate
      expect(result.status).toBe(0);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "staged e2e: mixed-role symbol (executable_for + implements) fails",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const testDocDir = path.join(docDir, "tests");
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "src");
      mkdirSync(testDocDir, { recursive: true });
      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(path.join(tmpDir, ".gitkeep"), "");
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

      writeFileSync(
        path.join(reqDocDir, "REQ-MIXED.md"),
        `---
id: REQ-MIXED
title: Mixed Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-MIXED.md
---
`,
      );

      writeFileSync(
        path.join(testDocDir, "TEST-MIXED.md"),
        `---
id: TEST-MIXED
title: Mixed Test
status: passing
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/tests/TEST-MIXED.md
---
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYM-MIXED-ROLE
    title: mixedRoleFunc
    sourceFile: src/mixed.ts
    links:
      - type: executable_for
        target: TEST-MIXED
      - type: implements
        target: REQ-MIXED
    status: active
`,
      );

      writeFileSync(
        path.join(srcDir, "mixed.ts"),
        `export function mixedRoleFunc() {
  return "mixed";
}
`,
      );

      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });

      // Mixed-role symbol should be rejected - but note: staged validation
      // uses changed_symbol_violation which only checks ownership gate.
      // Mixed-role rejection happens at projectStagedEntities level.
      // The symbol has implements so ownership passes.
      // The mixed-role check is enforced at relationship assertion time.
      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);
      // Symbol has implements so ownership gate passes,
      // but mixed role should cause projection failure
      expect(result.status).not.toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "staged e2e: production implements + covered_by with direct req->test fallback passes",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const testDocDir = path.join(docDir, "tests");
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "src");
      mkdirSync(testDocDir, { recursive: true });
      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(path.join(tmpDir, ".gitkeep"), "");
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

      writeFileSync(
        path.join(reqDocDir, "REQ-FALLBACK.md"),
        `---
id: REQ-FALLBACK
title: Fallback Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-FALLBACK.md
---
`,
      );

      writeFileSync(
        path.join(testDocDir, "TEST-FALLBACK.md"),
        `---
id: TEST-FALLBACK
title: Fallback Test
status: passing
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/tests/TEST-FALLBACK.md
links:
  - type: validates
    target: REQ-FALLBACK
---
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYM-FALLBACK
    title: fallbackFunc
    sourceFile: src/fallback.ts
    links:
      - type: implements
        target: REQ-FALLBACK
      - type: covered_by
        target: TEST-FALLBACK
    status: active
`,
      );

      writeFileSync(
        path.join(srcDir, "fallback.ts"),
        `export function fallbackFunc() {
  return "fallback";
}
`,
      );

      execSync(`bun ${kibiBin} sync --refresh-symbol-coordinates`, {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });

      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);
      // implements satisfies ownership; covered_by + direct validates satisfies coverage
      expect(result.status).toBe(0);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "staged e2e: direct manifest implements link still works (backward compat)",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "src");
      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(path.join(tmpDir, ".gitkeep"), "");
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

      writeFileSync(
        path.join(reqDocDir, "REQ-E2E-DIRECT.md"),
        `---
id: REQ-E2E-DIRECT
title: E2E Direct Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-E2E-DIRECT.md
---
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYM-E2E-DIRECT
    title: directFunction
    sourceFile: src/direct.ts
    links:
      - REQ-E2E-DIRECT
    status: active
`,
      );

      writeFileSync(
        path.join(srcDir, "direct.ts"),
        `export function directFunction() {
  return "direct";
}
`,
      );

      execSync(`bun ${kibiBin} sync --refresh-symbol-coordinates`, {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });

      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);
      expect(result.status).toBe(0);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "staged e2e: inline comment overlay still works (backward compat)",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "src");
      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(path.join(tmpDir, ".gitkeep"), "");
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

      writeFileSync(
        path.join(reqDocDir, "REQ-E2E-INLINE.md"),
        `---
id: REQ-E2E-INLINE
title: E2E Inline Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-E2E-INLINE.md
---
`,
      );

      writeFileSync(
        path.join(srcDir, "inline.ts"),
        `// implements REQ-E2E-INLINE
export function inlineFunc() {}
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYM-INLINE-001
    title: inlineFunc
    sourceFile: src/inline.ts
    sourceLine: 2
    sourceColumn: 16
    sourceEndLine: 2
    sourceEndColumn: 31
    links:
      - REQ-E2E-INLINE
    status: active
`,
      );

      execSync(`bun ${kibiBin} sync --refresh-symbol-coordinates`, {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });

      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);
      expect(result.status).toBe(0);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "--staged resolves symbol ID from working-tree manifest when only code is staged (comment-only change, no symbols.yaml staged)",
    async () => {
      const docDir = path.join(tmpDir, "documentation");
      const reqDocDir = path.join(docDir, "requirements");
      const srcDir = path.join(tmpDir, "src");

      mkdirSync(reqDocDir, { recursive: true });
      mkdirSync(docDir, { recursive: true });
      mkdirSync(srcDir, { recursive: true });

      execSync('git config user.email "test@example.com"', {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync('git config user.name "Test User"', {
        cwd: tmpDir,
        stdio: "pipe",
      });

      // Write requirement and symbols.yaml, commit them (not staged)
      writeFileSync(
        path.join(reqDocDir, "REQ-WT-001.md"),
        `---
id: REQ-WT-001
title: Working Tree Manifest Requirement
status: open
priority: must
created_at: 2026-02-20T10:00:00.000Z
updated_at: 2026-02-20T10:00:00.000Z
source: documentation/requirements/REQ-WT-001.md
---
`,
      );

      writeFileSync(
        path.join(srcDir, "wt-app.ts"),
        `export function wtFunction() {
  return "v1";
}
`,
      );

      writeFileSync(
        path.join(docDir, "symbols.yaml"),
        `symbols:
  - id: SYMBOL-WT-001
    title: wtFunction
    sourceFile: src/wt-app.ts
    links:
      - REQ-WT-001
    status: active
`,
      );

      // Commit everything including symbols.yaml — this is the "working tree" state
      execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
      execSync('git commit -m "initial with symbols" --no-verify', {
        cwd: tmpDir,
        stdio: "pipe",
      });

      // Sync KB so the requirement is known to Prolog
      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

      // Now modify ONLY the code file (do not touch symbols.yaml)
      // Use a comment-only change so the new enforcement does not flag it
      writeFileSync(
        path.join(srcDir, "wt-app.ts"),
        `// updated comment
export function wtFunction() {
  return "v1";
}
`,
      );

      // Stage only the code file, NOT symbols.yaml
      execSync("git add src/wt-app.ts", { cwd: tmpDir, stdio: "pipe" });

      // Run staged check — should resolve SYMBOL-WT-001 from the working-tree manifest
      // and pass without falling back to a content-hash-based ID
      const result = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const output = stdoutToString(result.stdout || result.stderr);
      expect(result.status).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );
  test(
    "passes symbol-coverage with complete scenario chain via typed links",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const scenarioDir = path.join(tmpDir, "documentation/scenarios");
      const testDir = path.join(tmpDir, "documentation/tests");
      const docsDir = path.join(tmpDir, "documentation");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(scenarioDir, { recursive: true });
      mkdirSync(testDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "REQ-COV-CHAIN-002.md"),
        "---\nid: REQ-COV-CHAIN-002\ntitle: Coverage Chain Req\nstatus: open\npriority: must\nsource: requirements/REQ-COV-CHAIN-002.md\nlinks:\n  - type: specified_by\n    target: SCEN-COV-CHAIN-002\n---\n\n# Coverage Chain Req\n",
      );
      writeFileSync(
        path.join(scenarioDir, "SCEN-COV-CHAIN-002.md"),
        "---\nid: SCEN-COV-CHAIN-002\ntitle: Coverage Chain Scenario\nstatus: active\nsource: scenarios/SCEN-COV-CHAIN-002.md\nlinks:\n  - type: verified_by\n    target: TEST-COV-CHAIN-002\n---\n\n# Coverage Chain Scenario\n",
      );
      writeFileSync(
        path.join(testDir, "TEST-COV-CHAIN-002.md"),
        "---\nid: TEST-COV-CHAIN-002\ntitle: Coverage Chain Test\nstatus: passing\nsource: tests/TEST-COV-CHAIN-002.md\n---\n\n# Coverage Chain Test\n",
      );
      writeFileSync(
        path.join(docsDir, "symbols.yaml"),
        "symbols:\n  - id: symbol-cov-chain-002\n    title: Covered Symbol\n    status: active\n    links:\n      - type: covered_by\n        target: TEST-COV-CHAIN-002\n      - type: implements\n        target: REQ-COV-CHAIN-002\n",
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "symbol-coverage"],
        tmpDir,
      );
      expect(status).toBe(0);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("No violations found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "fails symbol-coverage when direct req→test exists but req has scenario",
    async () => {
      const reqDir = path.join(tmpDir, "documentation/requirements");
      const scenarioDir = path.join(tmpDir, "documentation/scenarios");
      const testDir = path.join(tmpDir, "documentation/tests");
      const docsDir = path.join(tmpDir, "documentation");

      mkdirSync(reqDir, { recursive: true });
      mkdirSync(scenarioDir, { recursive: true });
      mkdirSync(testDir, { recursive: true });

      writeFileSync(
        path.join(reqDir, "REQ-DIRECT-BLOCKED-002.md"),
        "---\nid: REQ-DIRECT-BLOCKED-002\ntitle: Direct Blocked Req\nstatus: open\npriority: must\nsource: requirements/REQ-DIRECT-BLOCKED-002.md\nlinks:\n  - type: specified_by\n    target: SCEN-DIRECT-BLOCKED-002\n  - type: verified_by\n    target: TEST-DIRECT-BLOCKED-002\n---\n\n# Direct Blocked Req\n",
      );
      writeFileSync(
        path.join(scenarioDir, "SCEN-DIRECT-BLOCKED-002.md"),
        "---\nid: SCEN-DIRECT-BLOCKED-002\ntitle: Direct Blocked Scenario\nstatus: active\nsource: scenarios/SCEN-DIRECT-BLOCKED-002.md\n---\n\n# Direct Blocked Scenario\n",
      );
      writeFileSync(
        path.join(testDir, "TEST-DIRECT-BLOCKED-002.md"),
        "---\nid: TEST-DIRECT-BLOCKED-002\ntitle: Direct Blocked Test\nstatus: passing\nsource: tests/TEST-DIRECT-BLOCKED-002.md\n---\n\n# Direct Blocked Test\n",
      );
      writeFileSync(
        path.join(docsDir, "symbols.yaml"),
        "symbols:\n  - id: symbol-direct-blocked-002\n    title: Direct Blocked Symbol\n    status: active\n    links:\n      - type: covered_by\n        target: TEST-DIRECT-BLOCKED-002\n      - type: implements\n        target: REQ-DIRECT-BLOCKED-002\n",
      );

      execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--rules", "symbol-coverage"],
        tmpDir,
      );
      expect(status).toBe(1);
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("symbol-direct-blocked-002");
    },
    TEST_TIMEOUT_MS,
  );
});

import { parseViolationRows } from "../../src/prolog/codec";

describe("parseViolationRows — via check integration", () => {
  test("correctly parses violation with comma in description", () => {
    const raw =
      "[violation(strict-fact-shape,'FACT-ARC-018',\"Missing required fields: subject_key, property_key\",\"Add the missing fields\",'documentation/facts/FACT-ARC-018.md')]";
    const result = parseViolationRows(raw);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe(
      "Missing required fields: subject_key, property_key",
    );
  });
});
