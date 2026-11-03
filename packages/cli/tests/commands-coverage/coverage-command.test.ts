import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { coverageCommand } from "../../src/commands/coverage.js";
import * as shared from "../../src/commands/discovery-shared.js";

afterEach(() => {
  mock.restore();
});

function stubReport(structuredContent: unknown): unknown[] {
  const inputs: unknown[] = [];
  spyOn(shared, "executeReportingSpec").mockImplementation((async (
    _spec: unknown,
    input: unknown,
  ) => {
    inputs.push(input);
    return { content: [], structuredContent };
  }) as never);
  return inputs;
}

function captureLog(): string[] {
  const logs: string[] = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  return logs;
}

const casesRow = {
  id: "REQ-1",
  proofStages: {
    cases: {
      status: "partial",
      summary: { covered: 1, uncovered: 2 },
      cases: [
        {
          caseId: "C1",
          factId: "F1",
          constraint: "max",
          predicted: "success",
          coverage: "covered",
          scenarios: ["SCEN-1", "SCEN-2"],
        },
        {
          caseId: "C2",
          factId: "F1",
          constraint: "min",
          predicted: "rejection",
          coverage: "uncovered",
          assumption: { amount: 0 },
        },
        {
          caseId: "C3",
          factId: "F2",
          constraint: "eq",
          predicted: "rejection",
          coverage: "uncovered",
        },
        {
          caseId: "C4",
          factId: "F2",
          constraint: "ne",
          predicted: "success",
          coverage: "covered",
        },
      ],
    },
  },
};

describe("coverageCommand --cases", () => {
  test("parses comma-separated statuses and prints the case lines", async () => {
    const inputs = stubReport({
      rows: [casesRow, { id: "REQ-2" }, { id: "REQ-3", proofStages: {} }],
    });
    const logs = captureLog();
    await coverageCommand({ cases: true, status: " open, ,active " });
    expect((inputs[0] as { statuses: string[] }).statuses).toStrictEqual([
      "open",
      "active",
    ]);
    expect(logs).toStrictEqual([
      [
        "REQ-1: partial (1 covered, 2 uncovered, 0 unspecified, 0 waived)",
        "  C1 F1 max -> success: covered by SCEN-1, SCEN-2",
        "  C2 F1 min -> rejection: uncovered",
        '    assumes {"amount":0}',
        "  C3 F2 eq -> rejection: uncovered",
        "    assumes {}",
        "  C4 F2 ne -> success: covered by ",
      ].join("\n"),
    ]);
  });

  test("defaults missing summaries to zero counts", async () => {
    stubReport({
      rows: [
        {
          id: "REQ-9",
          proofStages: {
            cases: {
              status: "open",
              cases: [casesRow.proofStages.cases.cases[3]],
            },
          },
        },
      ],
    });
    const logs = captureLog();
    await coverageCommand({ cases: true });
    expect(logs[0]?.split("\n")[0]).toBe(
      "REQ-9: open (0 covered, 0 uncovered, 0 unspecified, 0 waived)",
    );
  });

  test("prints the case stages as JSON", async () => {
    stubReport({ rows: [casesRow] });
    const logs = captureLog();
    await coverageCommand({ cases: true, format: "json" });
    expect(JSON.parse(logs[0] ?? "")).toStrictEqual({
      rows: [{ id: "REQ-1", cases: casesRow.proofStages.cases }],
    });
  });

  test("says so when no returned requirement has edge cases", async () => {
    stubReport({ notRows: true });
    const logs = captureLog();
    await coverageCommand({ cases: true });
    expect(logs).toStrictEqual([
      "No requirement in this page has derived edge cases.",
    ]);
  });
});
