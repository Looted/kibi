import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { reportCommand } from "../../src/commands/report.js";

function reportCoverage(total = 1, rowCount = 1) {
  return {
    branch: "feature/report",
    requirements: {
      summary: {
        total,
        proofNotApplicable: 0,
        proofProven: rowCount,
      },
      meta: {
        branch: "feature/report",
        verificationSnapshot: "abc123",
        verificationSnapshotDirty: false,
      },
      rows: Array.from({ length: rowCount }, (_, index) => ({
        id: `REQ-${index + 1}`,
        title: "HTML report",
        proofStatus: "proven",
        proofGaps: [] as string[],
        verificationScopes: ["end_to_end"],
        proofStages: {
          semanticInventory: { status: "passed" },
          logicGrounding: { status: "passed" },
          contradictions: { status: "passed", conflicts: [] },
          scenarios: { status: "passed", scenarios: ["SCEN-1"] },
          scenarioTests: { status: "passed", tests: ["TEST-1"] },
          productionSymbols: { status: "passed", symbols: ["SYM-report"] },
          executableSymbols: {
            status: "passed",
            symbols: ["SYM-test-report"],
          },
          sourceCoordinates: {
            status: "passed",
            requirementSource: "present",
            missingSymbols: [],
          },
          passingE2e: {
            status: "passed",
            receiptEvidence: [
              { state: "passed", scope: "end_to_end", ageSeconds: 20 },
            ],
          },
        },
      })),
    },
    symbols: {
      summary: { total: 1, uncovered: 0, mixedRole: 0 },
      rows: [],
    },
  };
}

describe("kibi report", () => {
  let temporaryDirectory: string;
  let logSpy: Mock<typeof console.log>;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "kibi-report-"));
    logSpy = spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    if (temporaryDirectory && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("writes index.html and opens it only after generation", async () => {
    const opened: string[] = [];
    const outputPath = await reportCommand(
      { open: true },
      {
        cwd: () => temporaryDirectory,
        now: () => new Date("2026-08-15T12:00:00.000Z"),
        loadCoverage: async () => reportCoverage(),
        openReport: async (filePath) => {
          expect(existsSync(filePath)).toBe(true);
          opened.push(filePath);
        },
      },
    );

    expect(outputPath).toBe(
      path.join(temporaryDirectory, "kibi-report", "index.html"),
    );
    expect(opened).toEqual([outputPath]);
    expect(readFileSync(outputPath, "utf8")).toContain(
      "Requirement health · feature/report",
    );
    const badgePath = path.join(temporaryDirectory, "kibi-report", "badge.svg");
    const badge = readFileSync(badgePath, "utf8");
    expect(badge).toContain("100% proven");
    expect(badge).toContain("kibi</text>");
    expect(badge).toContain("Kibi requirement health: 100% proven");
    expect(badge).toContain("#a2d3f4");
    expect(badge).toMatch(/width="\d+" height="20" viewBox="0 0 \d+ 20"/);
    expect(Number(badge.match(/\bwidth="(\d+)"/)?.[1])).toBeLessThan(140);
    expect(badge).toContain('viewBox="0 0 308 309"');
    expect(badge).not.toContain('viewBox="-2 10 395 148"');
    expect(badge).not.toContain("https://");
  });

  test("accepts an explicit HTML file output", async () => {
    const outputPath = await reportCommand(
      { output: "artifacts/health.html" },
      {
        cwd: () => temporaryDirectory,
        loadCoverage: async () => reportCoverage(),
      },
    );

    expect(outputPath).toBe(
      path.join(temporaryDirectory, "artifacts", "health.html"),
    );
    expect(existsSync(outputPath)).toBe(true);
    expect(
      existsSync(
        path.join(temporaryDirectory, "artifacts", "health.badge.svg"),
      ),
    ).toBe(true);
  });

  test("renders conservative badge states from the report snapshot", async () => {
    const coverage = reportCoverage(2, 2);
    coverage.requirements.summary.proofProven = 1;
    coverage.requirements.meta.verificationSnapshotDirty = true;
    coverage.requirements.rows[0].proofGaps = ["blocking_contradiction"];

    await reportCommand(
      { output: "health" },
      {
        cwd: () => temporaryDirectory,
        loadCoverage: async () => coverage,
      },
    );

    const badge = readFileSync(
      path.join(temporaryDirectory, "health", "badge.svg"),
      "utf8",
    );
    expect(badge).toContain("50% proven");
    expect(badge).toContain("#f07178");
  });

  test("renders a valid zero-proven snapshot as strict danger", async () => {
    const coverage = reportCoverage();
    coverage.requirements.summary.proofProven = 0;
    coverage.requirements.rows[0].proofStatus = "missing";
    coverage.requirements.rows[0].proofGaps = ["missing_passing_e2e"];

    await reportCommand(
      { output: "zero-health" },
      {
        cwd: () => temporaryDirectory,
        loadCoverage: async () => coverage,
      },
    );

    const badge = readFileSync(
      path.join(temporaryDirectory, "zero-health", "badge.svg"),
      "utf8",
    );
    expect(badge).toContain("Kibi requirement health: 0% proven");
    expect(badge).toContain("#f07178");
  });

  test("rejects pagination that would make health metrics incomplete", async () => {
    await expect(
      reportCommand(
        { limit: "1" },
        {
          cwd: () => temporaryDirectory,
          loadCoverage: async () => reportCoverage(2, 1),
        },
      ),
    ).rejects.toThrow("1 of 2");

    expect(existsSync(path.join(temporaryDirectory, "kibi-report"))).toBe(
      false,
    );
  });

  test("rejects a non-integer report limit", async () => {
    await expect(
      reportCommand(
        { limit: "2rows" },
        {
          cwd: () => temporaryDirectory,
          loadCoverage: async () => reportCoverage(),
        },
      ),
    ).rejects.toThrow("integer between 1 and 100000");
  });
});
