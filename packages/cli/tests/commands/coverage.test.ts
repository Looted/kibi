import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "../helpers/isolated-env.js";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderCoverageTable } from "../../src/commands/discovery-shared.js";
import type { LegacyMigrationPlan } from "../../src/public/operations/legacy-migration-plan.js";
import { branchStorePath } from "../../src/utils/branch-store-locator.js";

describe("kibi coverage", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-coverage-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(path.join(tmpDir, ".kb", "requirements"), {
      recursive: true,
    });

    writeFileSync(
      path.join(tmpDir, ".kb", "requirements", "REQ-001.md"),
      `---
id: REQ-001
title: User authentication
status: open
priority: must
---

When a user authenticates, the system must create a session.
`,
    );

    writeFileSync(
      path.join(tmpDir, ".kb", "requirements", "REQ-002.md"),
      `---
id: REQ-002
title: Optional telemetry hints
status: open
---
`,
    );

    mkdirSync(path.join(tmpDir, ".kb", "facts"), {
      recursive: true,
    });
    writeFileSync(
      path.join(tmpDir, ".kb", "facts", "FACT-SCHEMA-AUTH-SESSION.md"),
      `---
id: FACT-SCHEMA-AUTH-SESSION
type: fact
title: Authentication session rule
status: active
fact_kind: predicate_schema
predicate_name: authentication_session_rule
predicate_namespace: test
predicate_arity: 2
argument_names: [user, session]
argument_types: [user, session]
aliases: [authenticate user session]
examples: [When a user authenticates the system creates a session]
tags: [authentication, session]
---
`,
    );

    mkdirSync(path.join(tmpDir, ".kb", "tests"), {
      recursive: true,
    });

    execSync("git add .kb", { cwd: tmpDir, stdio: "pipe" });

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
        proofVersion: string;
        proofStatus: string;
        proofGaps: string[];
        proofAdvisories: string[];
      }>;
      repairPlan: {
        version: string;
        readOnly: boolean;
        status: string;
        scope: { complete: boolean };
        batches: Array<{
          phase: string;
          state: string;
          autoApplicable: boolean;
        }>;
      };
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
    expect(req1Row?.proofVersion).toBe("kibi.requirement-proof.v2");
    expect(req1Row?.proofStatus).toBe("missing");
    expect(req1Row?.proofGaps).toContain("missing_semantic_inventory");
    expect(req1Row?.proofAdvisories).toEqual([]);
    expect(result.repairPlan.version).toBe("kibi.repair-plan.v1");
    expect(result.repairPlan.readOnly).toBe(true);
    expect(result.repairPlan.status).toBe("ready");
    expect(result.repairPlan.scope.complete).toBe(true);
    expect(result.repairPlan.batches[0]?.phase).toBe("semantic_inventory");
    expect(result.repairPlan.batches[0]?.state).toBe("ready");
    expect(
      result.repairPlan.batches.every((batch) => !batch.autoApplicable),
    ).toBe(true);
    const req2Row = result.rows.find((row) => row.id === "REQ-002");
    expect(req2Row?.coverageStatus).toBe("not_applicable");
    expect(req2Row?.coverageDepth).toBe("no_test_evidence");
  }, 30000); // 30 second test timeout
  test("previews one source-bound migration batch without mutating the KB", () => {
    const kbPath = path.join(branchStorePath(tmpDir, "main"), "kb.rdf");
    const before = readFileSync(kbPath, "utf8");
    const command = `bun ${kibiBin} coverage --by req --include-migration-preview --migration-predicate-min-score 0 --format json`;
    const first = JSON.parse(
      execSync(command, {
        cwd: tmpDir,
        encoding: "utf8",
        timeout: 15000,
      }),
    ) as { legacyMigrationPlan: LegacyMigrationPlan };
    const second = JSON.parse(
      execSync(command, {
        cwd: tmpDir,
        encoding: "utf8",
        timeout: 15000,
      }),
    ) as { legacyMigrationPlan: LegacyMigrationPlan };
    const migration = first.legacyMigrationPlan;

    expect(migration).toMatchObject({
      version: "kibi.legacy-migration-plan.v1",
      readOnly: true,
      status: "ready",
      scope: {
        repairPlanComplete: true,
        candidateRequirements: 2,
        selectedRequirements: 1,
        offset: 0,
        limit: 1,
        selectionComplete: false,
        nextOffset: 1,
      },
    });
    expect(migration.planId).toBe(second.legacyMigrationPlan.planId);
    expect(migration.batches[0]).toMatchObject({
      requirementId: "REQ-001",
      state: "ready_for_review",
      autoApplicable: false,
      sourceBinding: {
        status: "compatible",
        sourceKind: "authored_markdown_body",
        persistedField: "semantic_text",
      },
      sourceText:
        "When a user authenticates, the system must create a session.",
    });
    expect(migration.batches[0].sourceBinding.sourceHash).toHaveLength(64);
    expect(migration.batches[0].requirementPropertyPatchPreview).toMatchObject({
      semantic_text:
        "When a user authenticates, the system must create a session.",
      semantic_source_field: "semantic_text",
    });
    expect(migration.batches[0].propositions[0].span).toEqual({
      start: 0,
      end: 59,
    });
    expect(
      migration.batches[0].propositions[0].predicateCandidates,
    ).toContainEqual(
      expect.objectContaining({
        schemaId: "FACT-SCHEMA-AUTH-SESSION",
        origin: "project_local",
        predicateName: "authentication_session_rule",
        writeEligible: false,
      }),
    );
    expect(readFileSync(kbPath, "utf8")).toBe(before);

    const table = execSync(
      `bun ${kibiBin} coverage --by req --include-migration-preview`,
      {
        cwd: tmpDir,
        encoding: "utf8",
        timeout: 15000,
      },
    );
    expect(table).toContain("Legacy migration preview");
    expect(table).toContain("REQ-001");
  }, 45000);
  test("shows table output by default and exposes no-include-transitive option", () => {
    const tableOutput = execSync(`bun ${kibiBin} coverage --by req`, {
      cwd: tmpDir,
      encoding: "utf8",
      timeout: 10000, // 10 second timeout for the command
    });
    expect(tableOutput).toContain("ID");
    expect(tableOutput).toContain("Coverage");
    expect(tableOutput).toContain("Depth");
    expect(tableOutput).toContain("Proof");
    expect(tableOutput).toContain("no_test_evidence");
    expect(tableOutput).toContain("REQ-001");
    expect(tableOutput).toContain("Repair plan");
    expect(tableOutput).toContain("semantic_inventory");

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
          proofStatus: "missing",
          proofGaps: ["missing_semantic_inventory"],
          scenarioCount: 0,
          testCount: 1,
          transitiveSymbolCount: 0,
          gaps: ["missing_scenario_and_test"],
        },
      ],
    });

    expect(rendered).toContain("open_or_nonpassing_tests_only");
    expect(rendered).toContain("missing_semantic_inventory");
  });
});
