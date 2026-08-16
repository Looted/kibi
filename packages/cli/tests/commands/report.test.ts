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
      meta: { branch: "feature/report", verificationSnapshot: "abc123" },
      rows: Array.from({ length: rowCount }, (_, index) => ({
        id: `REQ-${index + 1}`,
        title: "HTML report",
        proofStatus: "proven",
        proofGaps: [],
        verificationScopes: ["end_to_end"],
        proofStages: {
          semanticInventory: { status: "passed" },
          logicGrounding: { status: "passed" },
          contradictions: { status: "passed", conflicts: [] },
          scenarios: { status: "passed", scenarios: ["SCEN-1"] },
          productionSymbols: { status: "passed", symbols: ["SYM-report"] },
          sourceCoordinates: { status: "passed", missingSymbols: [] },
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
