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
            productionSymbols: stage("passed", {
              symbols: ["SYM-reset-password"],
            }),
            sourceCoordinates: stage("passed", { missingSymbols: [] }),
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
            productionSymbols: stage("passed", {
              symbols: ["SYM-trial-duration"],
            }),
            sourceCoordinates: stage("passed", { missingSymbols: [] }),
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
});
