// implements REQ-kibi-html-health-report
import { afterEach, describe, expect, test } from "bun:test";
import {
  earliestUnmetGate,
  firstFailingProofGate,
  renderHtmlReport,
} from "../../src/report/html-report.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];
const previousExitCode = process.exitCode;

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (typeof previousExitCode === "number") process.exitCode = previousExitCode;
  else if (typeof process.exitCode === "number") process.exitCode = 0;
});

function stage(status: string, fields: Record<string, unknown> = {}) {
  return { status, ...fields };
}

describe("renderHtmlReport leftover evidence and term branches", () => {
  test("renders stale, contract, snapshot, failed, polarity, and extra sources", () => {
    restores.push(isolateKibiEnv());
    const html = renderHtmlReport({
      requirements: {
        summary: {
          total: -3,
          proofNotApplicable: Number.NaN,
          proofProven: -1,
        },
        meta: { branch: "develop", dirty: true },
        rows: [
          {
            id: "REQ-STALE",
            title: "Stale evidence",
            proofStatus: "missing",
            proofGaps: ["stale_proof_receipt"],
            proofStages: {
              semanticInventory: stage("passed"),
              logicGrounding: stage("passed", {
                sources: [
                  { path: ".kb/facts/FACT-1.md", id: "FACT-1" },
                  { path: ".kb/facts/FACT-2.md", id: "FACT-2" },
                  { path: ".kb/facts/FACT-3.md", id: "FACT-3" },
                  { id: "FACT-NO-PATH" },
                ],
              }),
              contradictions: stage("passed", {
                conflicts: [
                  {
                    kind: "strict_property",
                    status: "contradiction",
                    requirements: ["REQ-STALE", "REQ-OTHER"],
                    predicateName: "allows_login",
                    reason: "Polarity clash",
                    left: { term: { polarity: "assert" } },
                    right: { claimText: "deny login", factId: "FACT-DENY" },
                  },
                  {
                    kind: "strict_property",
                    status: "note",
                    reason: "ignored",
                  },
                ],
              }),
              scenarios: stage("passed", { scenarios: ["SCEN-1"] }),
              scenarioTests: stage("passed", {
                tests: ["TEST-1"],
                sources: "not-an-array",
              }),
              productionSymbols: stage("warning", {
                symbols: ["SYM-A"],
                coordinates: [{ path: "src/a.ts", line: 2 }],
              }),
              executableSymbols: stage("missing", { symbols: [] }),
              sourceCoordinates: stage("passed", {
                requirementSource: "present",
                missingSymbols: [],
              }),
              passingE2e: stage("warning", {
                receiptEvidence: [{ state: "stale", scope: "end_to_end" }],
              }),
            },
          },
          {
            id: "REQ-CONTRACT",
            title: "Contract mismatch",
            proofStatus: "missing",
            proofGaps: [],
            proofStages: {
              semanticInventory: stage("passed"),
              logicGrounding: stage("passed"),
              contradictions: stage("passed", {
                conflicts: [
                  {
                    kind: "value",
                    status: "contradiction",
                    propertyKey: "retries",
                    left: { term: { value: ["one", "two"], unit: "tries" } },
                    right: { term: { value: 0 } },
                  },
                ],
              }),
              scenarios: stage("passed", { scenarios: ["SCEN-2"] }),
              scenarioTests: stage("passed", { tests: ["TEST-2"] }),
              productionSymbols: stage("passed", { symbols: ["SYM-B"] }),
              executableSymbols: stage("passed", { symbols: [] }),
              sourceCoordinates: stage("missing", {
                requirementSource: "absent",
                missingSymbols: [],
              }),
              passingE2e: stage("warning", {
                receiptEvidence: [
                  { state: "contract_mismatch", scope: "end_to_end" },
                ],
              }),
            },
          },
          {
            id: "REQ-SNAP",
            title: "Snapshot unavailable",
            proofStatus: "missing",
            proofGaps: [],
            proofStages: {
              semanticInventory: stage("passed"),
              logicGrounding: stage("passed"),
              contradictions: stage("unresolved"),
              scenarios: stage("passed", { scenarios: ["SCEN-3"] }),
              scenarioTests: stage("passed", { tests: ["TEST-3"] }),
              productionSymbols: stage("passed", { symbols: [] }),
              executableSymbols: stage("passed", { symbols: [] }),
              sourceCoordinates: stage("passed", {
                requirementSource: "present",
                missingSymbols: [],
              }),
              passingE2e: stage("warning", {
                receiptEvidence: [
                  { state: "snapshot_unavailable", scope: "end_to_end" },
                ],
              }),
            },
          },
          {
            id: "REQ-FAIL",
            title: "Failed receipt",
            proofStatus: "missing",
            proofGaps: [],
            proofStages: {
              semanticInventory: stage("passed"),
              logicGrounding: stage("passed"),
              contradictions: stage("passed", { conflicts: [] }),
              scenarios: stage("passed", { scenarios: ["SCEN-4"] }),
              scenarioTests: stage("passed", { tests: ["TEST-4"] }),
              productionSymbols: stage("passed", {
                symbols: ["SYM-C"],
                coordinates: [{ path: "src/c.ts", line: 1, endLine: 4 }],
              }),
              executableSymbols: stage("passed", { symbols: ["SYM-TEST"] }),
              sourceCoordinates: stage("passed", {
                requirementSource: "present",
                missingSymbols: [],
              }),
              passingE2e: stage("failed", {
                receiptEvidence: [
                  {
                    state: "invalid",
                    scope: "end_to_end",
                    testId: "TEST-4",
                  },
                ],
              }),
            },
          },
          {
            id: "REQ-GATES",
            title: "All gates pass without proven status",
            proofStatus: "missing",
            proofGaps: [],
            proofStages: {
              semanticInventory: stage("passed"),
              logicGrounding: stage("passed"),
              contradictions: stage("passed", { conflicts: [] }),
              scenarios: stage("passed", { scenarios: ["SCEN-5"] }),
              scenarioTests: stage("passed", { tests: ["TEST-5"] }),
              productionSymbols: stage("passed", {
                symbols: ["SYM-D"],
                coordinates: [{ path: "src/d.ts" }],
              }),
              executableSymbols: stage("passed", { symbols: ["SYM-TEST-D"] }),
              sourceCoordinates: stage("passed", {
                requirementSource: "present",
                missingSymbols: [],
                coordinates: [{ path: "src/d.ts", line: 3 }],
              }),
              passingE2e: stage("passed", {
                receiptEvidence: [
                  {
                    state: "passed",
                    scope: "end_to_end",
                    testId: "TEST-5",
                    finishedAt: "2026-08-15T11:42:00.000Z",
                  },
                ],
              }),
            },
          },
        ],
      },
      symbols: { summary: { total: 4, uncovered: 1, mixedRole: 0 }, rows: [] },
      branch: "develop",
      generatedAt: new Date("2026-08-15T12:00:00.000Z"),
      repository: {
        identity: "Acme/Widgets",
        webUrl: "https://github.com/Acme/Widgets",
        provider: "github",
        commitSha: "abcdef1234567890",
        branch: "develop",
      },
    });
    expect(html).toContain("E2E receipt stale");
    expect(html).toContain("older verification contract");
    expect(html).toContain("Code snapshot unavailable");
    expect(html).toContain("Invalid E2E receipt");
    expect(html).toContain("assert");
    expect(html).toContain("one, two tries");
    expect(html).toContain("+1 more");
    expect(html).toContain("Ownership present; proof coverage is incomplete");
  });

  test("earliestUnmetGate returns proven when every listed gate already passes", () => {
    restores.push(isolateKibiEnv());
    expect(earliestUnmetGate({ proofStatus: "proven" })).toBe("proven");
    const allPassed = {
      proofStatus: "missing",
      proofStages: {
        semanticInventory: { status: "passed" },
        logicGrounding: { status: "passed" },
        contradictions: { status: "passed" },
        scenarios: { status: "passed" },
        scenarioTests: { status: "passed" },
        productionSymbols: { status: "passed", symbols: ["SYM-A"] },
        executableSymbols: { status: "passed", symbols: [] },
        sourceCoordinates: {
          status: "passed",
          requirementSource: "present",
          missingSymbols: [],
        },
        passingE2e: { status: "passed" },
      },
    };
    expect(["proven", "evidence", "e2e", "implementation"]).toContain(
      earliestUnmetGate(allPassed),
    );
    expect(
      firstFailingProofGate(
        ["semantic", "scenario", "implementation", "e2e", "evidence"],
        () => true,
      ),
    ).toBe("proven");
    expect(
      firstFailingProofGate(["semantic", "e2e"], (gate) => gate !== "e2e"),
    ).toBe("e2e");
  });
});
