import { describe, expect, test } from "bun:test";

import {
  type HtmlReportCoverage,
  renderHtmlReport,
} from "../../src/report/html-report.js";

function stage(status: string, fields = {}): Record<string, unknown> {
  return { status, ...fields };
}

function coverageFixture(): {
  requirements: HtmlReportCoverage;
  symbols: HtmlReportCoverage;
} {
  return {
    requirements: {
      summary: {
        total: 3,
        proofNotApplicable: 1,
        proofProven: 1,
      },
      meta: {
        branch: "main",
        verificationSnapshot: "1234567890abcdef",
        verificationSnapshotDirty: false,
        dirty: false,
      },
      rows: [
        {
          id: "REQ-204",
          title: "Password Reset",
          proofStatus: "proven",
          proofGaps: [],
          verificationScopes: ["end_to_end"],
          proofStages: {
            semanticInventory: stage("passed"),
            logicGrounding: stage("passed"),
            contradictions: stage("passed", { conflicts: [] }),
            scenarios: stage("passed", { scenarios: ["SCEN-204"] }),
            scenarioTests: stage("passed", { tests: ["TEST-204"] }),
            productionSymbols: stage("passed", {
              symbols: ["SYM-reset-password"],
            }),
            executableSymbols: stage("passed", {
              symbols: ["SYM-test-reset-password"],
            }),
            sourceCoordinates: stage("passed", {
              requirementSource: "present",
              missingSymbols: [],
            }),
            passingE2e: stage("passed", {
              receiptEvidence: [
                {
                  state: "passed",
                  scope: "end_to_end",
                  ageSeconds: 1_080,
                },
              ],
            }),
          },
        },
        {
          id: "REQ-443",
          title: 'Trial Duration </script><img src=x onerror="bad()">',
          proofStatus: "unresolved",
          proofGaps: [
            "blocking_contradiction",
            "missing_scenario",
            "stale_verification_receipt",
          ],
          verificationScopes: ["end_to_end"],
          proofStages: {
            semanticInventory: stage("passed"),
            logicGrounding: stage("passed"),
            contradictions: stage("blocked", {
              conflicts: [
                {
                  kind: "strict_property",
                  status: "contradiction",
                  requirements: ["REQ-443", "REQ-444"],
                  propertyKey: "trial_duration_days",
                  reason: "Trial duration has incompatible values",
                  left: { term: { value: 14, unit: "days" } },
                  right: { term: { value: 30, unit: "days" } },
                },
              ],
            }),
            scenarios: stage("missing", { scenarios: [] }),
            scenarioTests: stage("missing", { tests: [] }),
            productionSymbols: stage("passed", {
              symbols: ["SYM-trial-duration"],
            }),
            executableSymbols: stage("blocked", { symbols: [] }),
            sourceCoordinates: stage("passed", {
              requirementSource: "present",
              missingSymbols: [],
            }),
            passingE2e: stage("missing", {
              receiptEvidence: [
                { state: "stale", scope: "end_to_end", receiptCount: 1 },
              ],
            }),
          },
        },
        {
          id: "REQ-OLD",
          title: "Old behavior",
          proofStatus: "not_applicable",
          proofGaps: [],
          proofStages: { applicability: stage("not_applicable") },
        },
      ],
    },
    symbols: {
      summary: {
        total: 20,
        uncovered: 3,
        mixedRole: 1,
      },
      rows: [],
    },
  };
}

describe("renderHtmlReport", () => {
  test("renders a self-contained requirement health dashboard", () => {
    const fixture = coverageFixture();
    const html = renderHtmlReport({
      ...fixture,
      branch: "main",
      generatedAt: new Date("2026-08-15T12:00:00.000Z"),
    });

    expect(html).toContain("Kibi Requirement Health · main");
    expect(html).toContain(">50<span>%</span>");
    expect(html).toContain('aria-label="Kibi logo"');
    expect(html).toContain('aria-label="Kibi"');
    expect(html).toContain("Intent → proof");
    expect(html).toContain("−1 blocked here");
    expect(html).toContain("Password Reset");
    expect(html).toContain("Fresh 18 min ago");
    expect(html).toContain("14 days");
    expect(html).toContain("30 days");
    expect(html).toContain("Unowned code");
    expect(html).toContain(">2</strong>");
    expect(html).toContain('data-filter="contradiction"');
    expect(html).not.toContain("https://");
    expect(html).not.toContain("http://");
  });

  test("escapes all KB-provided text and excludes non-current rows", () => {
    const fixture = coverageFixture();
    const html = renderHtmlReport({
      ...fixture,
      branch: "main",
      generatedAt: new Date("2026-08-15T12:00:00.000Z"),
    });

    expect(html).toContain(
      "Trial Duration &lt;/script&gt;&lt;img src=x onerror=&quot;bad()&quot;&gt;",
    );
    expect(html).not.toContain('<img src=x onerror="bad()">');
    expect(html).not.toContain("Old behavior");
    expect(html).toContain("1 non-current requirement excluded");
  });

  test("assigns each requirement to its earliest unmet proof gate", () => {
    const completeBeforeEvidence = {
      id: "REQ-EVIDENCE",
      title: "Waiting for evidence",
      proofStatus: "missing",
      proofGaps: ["missing_verification_receipt"],
      proofStages: {
        semanticInventory: stage("passed"),
        logicGrounding: stage("passed"),
        contradictions: stage("passed", { conflicts: [] }),
        scenarios: stage("passed", { scenarios: ["SCEN-EVIDENCE"] }),
        scenarioTests: stage("passed", { tests: ["TEST-EVIDENCE"] }),
        productionSymbols: stage("blocked", { symbols: ["SYM-EVIDENCE"] }),
        executableSymbols: stage("blocked", { symbols: [] }),
        sourceCoordinates: stage("passed", {
          requirementSource: "present",
          missingSymbols: [],
        }),
        passingE2e: stage("missing", {
          receiptEvidence: [
            { state: "missing", scope: "end_to_end", receiptCount: 0 },
          ],
        }),
      },
    };
    const blockedAtSemantics = {
      ...completeBeforeEvidence,
      id: "REQ-SEMANTICS",
      title: "Waiting for semantics",
      proofGaps: ["missing_semantic_inventory"],
      proofStages: {
        ...completeBeforeEvidence.proofStages,
        semanticInventory: stage("missing"),
        logicGrounding: stage("missing"),
        contradictions: stage("unresolved", { conflicts: [] }),
      },
    };

    const html = renderHtmlReport({
      requirements: {
        summary: { total: 2, proofNotApplicable: 0, proofProven: 0 },
        rows: [blockedAtSemantics, completeBeforeEvidence],
      },
      symbols: { summary: { total: 1, uncovered: 0, mixedRole: 0 }, rows: [] },
      branch: "develop",
      generatedAt: new Date("2026-08-16T12:00:00.000Z"),
    });

    expect(html).toContain(">0<span>%</span>");
    expect(html).toContain("0 of 2 current requirements");
    expect(
      [...html.matchAll(/proof-gate__count">(\d+)/g)].map((match) =>
        Number(match[1]),
      ),
    ).toEqual([1, 1, 1, 1, 0]);
    expect(html.match(/−1 blocked here/g)).toHaveLength(2);
  });
});
