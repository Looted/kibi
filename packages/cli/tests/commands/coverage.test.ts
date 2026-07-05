import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderCoverageTable } from "../../src/commands/discovery-shared.js";

describe("kibi coverage", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-coverage-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(path.join(tmpDir, "documentation", "requirements"), {
      recursive: true,
    });

    writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
      `---
id: REQ-001
title: User authentication
status: open
priority: must
---
`,
    );

    writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-002.md"),
      `---
id: REQ-002
title: Optional telemetry hints
status: open
---
`,
    );

    mkdirSync(path.join(tmpDir, "documentation", "tests"), {
      recursive: true,
    });

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
  }, 30000); // kibi init + sync can take ~10s; allow 30s for slower CI environments

  afterAll(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("reports missing scenario coverage for must requirements", () => {
    const output = execSync(`bun ${kibiBin} coverage --by req --format json`, {
      cwd: tmpDir,
      encoding: "utf8",
      timeout: 10000, // 10 second timeout for the command
    });

    const result = JSON.parse(output) as {
      summary: {
        total: number;
        missingScenarioAndTest: number;
        fullyCovered: number;
        notApplicable: number;
      };
      rows: Array<{
        id: string;
        gaps: string[];
        evaluated: boolean;
        coverageStatus: string;
        coverageDepth: string;
        coverage_depth: string;
        directTests: string[];
        scenarioTests: string[];
        testStatuses: string[];
        verificationScopes: string[];
      }>;
    };
    expect(result.summary.total).toBe(2);
    expect(result.summary.fullyCovered).toBe(0);
    expect(result.summary.notApplicable).toBe(1);
    expect(result.rows[0]?.id).toBe("REQ-001");
    expect(result.rows[0]?.gaps).toContain("missing_scenario_and_test");
    expect(result.rows.some((row) => row.id === "REQ-002")).toBe(true);
    expect(result.rows.find((row) => row.id === "REQ-002")?.evaluated).toBe(
      false,
    );
    expect(
      result.rows.find((row) => row.id === "REQ-002")?.coverageStatus,
    ).toBe("not_applicable");

    // Stabilize JSON contract for packed parity checks
    const req1Row = result.rows.find((row) => row.id === "REQ-001");
    expect(req1Row?.gaps).toContain("missing_scenario_and_test");
    expect(req1Row?.coverageStatus).not.toBe("fully_covered");
    expect(req1Row?.coverageDepth).toBe("no_test_evidence");
    expect(req1Row?.coverage_depth).toBe("no_test_evidence");
    expect(req1Row?.directTests).toEqual([]);
    expect(req1Row?.scenarioTests).toEqual([]);
    expect(req1Row?.testStatuses).toEqual([]);
    expect(req1Row?.verificationScopes).toEqual([]);
    const req2Row = result.rows.find((row) => row.id === "REQ-002");
    expect(req2Row?.coverageStatus).toBe("not_applicable");
    expect(req2Row?.coverageDepth).toBe("no_test_evidence");
  }, 30000); // 30 second test timeout
  test("shows table output by default and exposes no-include-transitive option", () => {
    const tableOutput = execSync(`bun ${kibiBin} coverage --by req`, {
      cwd: tmpDir,
      encoding: "utf8",
      timeout: 10000, // 10 second timeout for the command
    });
    expect(tableOutput).toContain("ID");
    expect(tableOutput).toContain("Coverage");
    expect(tableOutput).toContain("Depth");
    expect(tableOutput).toContain("no_test_evidence");
    expect(tableOutput).toContain("REQ-001");

    const helpOutput = execSync(`bun ${kibiBin} coverage --help`, {
      cwd: tmpDir,
      encoding: "utf8",
      timeout: 5000,
    });
    expect(helpOutput).toContain("--no-include-transitive");
  }, 30000); // 30 second test timeout

  test("renders full coverage depth labels in the human table", () => {
    const rendered = renderCoverageTable({
      summary: {
        evaluated: 1,
        fullyCovered: 0,
        missingScenario: 0,
        missingScenarioAndTest: 1,
        missingTest: 0,
        notApplicable: 0,
        total: 1,
        uncovered: 1,
      },
      rows: [
        {
          id: "REQ-001",
          status: "open",
          priority: "must",
          coverageStatus: "uncovered",
          coverageDepth: "open_or_nonpassing_tests_only",
          scenarioCount: 0,
          testCount: 1,
          transitiveSymbolCount: 0,
          gaps: ["missing_scenario_and_test"],
        },
      ],
    });

    expect(rendered).toContain("open_or_nonpassing_tests_only");
  });
});
