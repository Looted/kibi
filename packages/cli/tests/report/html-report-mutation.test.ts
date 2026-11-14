/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  type HtmlReportInput,
  certificateRejectionLines,
  earliestUnmetGate,
  firstFailingProofGate,
  renderHtmlReport,
} from "../../src/report/html-report.js";

const passed = (fields: Record<string, unknown> = {}) => ({
  status: "passed",
  ...fields,
});

const PROVED_STAGES = {
  semanticInventory: passed(),
  logicGrounding: passed({
    sources: [{ path: ".kb/facts/FACT-A.md", id: "FACT-A" }],
  }),
  contradictions: passed(),
  scenarios: passed({
    scenarios: ["SCEN-A"],
    sources: [{ path: ".kb/scenarios/SCEN-A.md", id: "SCEN-A" }],
  }),
  scenarioTests: passed({
    sources: [
      { path: "tests/e2e/a.spec.ts", id: "TEST-A", line: 4, endLine: 9 },
      { path: "tests/e2e/b.spec.ts", id: "TEST-B", line: 2 },
    ],
  }),
  productionSymbols: passed({
    symbols: ["SYM-A"],
    coordinates: [{ path: "src/a.ts", line: 3, endLine: 3 }],
  }),
  sourceCoordinates: passed({
    requirementSource: "present",
    missingSymbols: [],
  }),
  executableSymbols: passed({
    coordinates: [{ path: "tests/e2e/a.spec.ts", line: 4 }],
  }),
  passingE2e: passed({
    receiptEvidence: [
      {
        state: "passed",
        scope: "end_to_end",
        testId: "TEST-B",
        finishedAt: "2026-05-01T10:00:00.000Z",
      },
    ],
  }),
};

/** A requirement that clears every gate, with a certificate for each claim. */
function row(
  id: string,
  fields: Record<string, unknown> = {},
  stages: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    title: `Title of ${id}`,
    source: `.kb/requirements/${id}.md`,
    proofStatus: "tested",
    evidenceLevel: "proved",
    claimSummary: { applicable: 2, proved: 2 },
    evidence: [{ kind: "certificate", kinds: ["exhaustive"], tests: ["T"] }],
    ...fields,
    proofStages: { ...PROVED_STAGES, ...stages },
  };
}

const GITHUB = {
  identity: "acme/app",
  webUrl: "https://github.com/acme/app/",
  provider: "github",
  commitSha: "0123456789abcdef0123",
} as const;

const FULL_ROWS: Record<string, unknown>[] = [
  row(
    "REQ-PROVED",
    {
      title: "Proved <login> & 'quotes'",
      evidenceFloor: { required: "proved", source: "explicit", status: "met" },
      evidence: [
        { kind: "note" },
        { kind: "certificate", kinds: ["exhaustive", "regex"], tests: ["T1"] },
      ],
    },
    {
      sourceCoordinates: passed({
        requirementSource: "present",
        missingSymbols: [],
        requirementPath: ".kb/requirements/proved.md",
      }),
    },
  ),
  row("REQ-TESTED", {
    evidenceLevel: "tested",
    claimSummary: { applicable: 3, proved: 1 },
    evidence: [{ kind: "certificate", tests: ["T1", "T2"] }],
    certificateRejections: [{ test: "TEST-X", reason: "drifted" }, {}],
    proofGaps: ["stale_proof_receipt", "weak_claim"],
    proofAdvisories: ["weak_claim"],
    evidenceFloor: { required: "tested", source: "firmness", status: "met" },
  }),
  row("REQ-ATTESTED", {
    evidenceLevel: "tested",
    claimSummary: { applicable: 1, proved: 0, attested: 1 },
    evidence: [],
    proofAdvisories: ["one_advisory"],
  }),
  row("REQ-PLAIN", {
    evidenceLevel: "tested",
    claimSummary: { applicable: 0 },
    evidence: [],
    evidenceFloor: { required: "unverified" },
  }),
  row("REQ-REJECTED", {
    evidenceLevel: "tested",
    claimSummary: {},
    evidence: [],
    claimBindingRejections: [
      { test: "TEST-Y", claimKey: "CLAIM-1", reason: "moved" },
    ],
  }),
  row("REQ-REJECTED-TWO", {
    evidenceLevel: "tested",
    claimSummary: { proved: "x" },
    evidence: [],
    certificateRejections: [{}],
    claimBindingRejections: [{}],
  }),
  row(
    "REQ-CONTRA",
    {
      proofStatus: "missing",
      evidenceLevel: "asserted",
      proofGaps: ["blocking_contradiction"],
      claimSummary: { applicable: 2, proved: 1.7 },
    },
    {
      contradictions: {
        status: "unresolved",
        conflicts: [
          {
            status: "contradiction",
            kind: "strict_property",
            reason: "Limits disagree",
            requirements: ["REQ-OTHER", "REQ-CONTRA"],
            propertyKey: "max_login_attempts",
            left: { term: { value: 3, unit: "tries" } },
            right: { term: { value: [4, 5] } },
          },
          {
            status: "contradiction",
            kind: "polarity",
            predicateName: "allows_guest",
            left: { term: { polarity: "allow" } },
            right: { claimText: "Guests are denied" },
          },
          {
            status: "contradiction",
            kind: "other",
            left: { factId: "FACT-L" },
            right: {},
          },
          { status: "note", reason: "ignored" },
        ],
      },
    },
  ),
  row(
    "REQ-CONTRA-DUP",
    { proofStatus: "missing", evidenceLevel: "asserted" },
    {
      contradictions: {
        status: "blocked",
        conflicts: [
          {
            status: "contradiction",
            kind: "strict_property",
            reason: "Limits disagree",
            requirements: ["REQ-CONTRA", "REQ-OTHER"],
            left: {},
            right: {},
          },
        ],
      },
    },
  ),
  row(
    "REQ-BELOW",
    {
      proofStatus: "missing",
      evidenceLevel: "asserted",
      evidenceFloor: { required: "proved" },
      proofGaps: ["missing_scenario", "missing_production_symbol"],
    },
    {
      semanticInventory: { status: "failed" },
      scenarios: { status: "failed" },
      productionSymbols: { status: "failed" },
    },
  ),
  row(
    "REQ-PENDING",
    {
      proofStatus: "missing",
      evidenceLevel: "unverified",
      evidenceFloor: {
        required: "tested",
        source: "explicit",
        status: "pending_reproof",
      },
      proofGaps: ["stale_proof_receipt"],
    },
    {
      logicGrounding: { status: "not_applicable" },
      contradictions: { status: "stale" },
      scenarioTests: { status: "failed" },
      productionSymbols: { status: "warning", symbols: ["SYM-1"] },
      sourceCoordinates: {
        status: "failed",
        requirementSource: "present",
        missingSymbols: ["SYM-1"],
      },
      passingE2e: { receiptEvidence: [{ state: "stale" }] },
    },
  ),
  row(
    "REQ-WEIRD-FLOOR",
    {
      proofStatus: "missing",
      evidenceLevel: "asserted",
      evidenceFloor: { required: "tested", status: "odd_state" },
    },
    {
      contradictions: { status: "not_applicable" },
      productionSymbols: { status: "failed", symbols: ["S1", "S2"] },
      sourceCoordinates: {
        status: "failed",
        requirementSource: "present",
        missingSymbols: ["S1", "S2"],
      },
      passingE2e: { receiptEvidence: [{ state: "contract_mismatch" }] },
    },
  ),
  row(
    "REQ-OWNED",
    { proofStatus: "missing", evidenceLevel: "asserted" },
    {
      productionSymbols: { status: "warning", symbols: ["S1"] },
      sourceCoordinates: { status: "passed", requirementSource: "missing" },
      executableSymbols: { status: "missing" },
      passingE2e: { receiptEvidence: [{ state: "snapshot_unavailable" }] },
    },
  ),
  row(
    "REQ-FAILED-RECEIPT",
    { proofStatus: "missing", evidenceLevel: "asserted" },
    {
      productionSymbols: {
        status: "passed",
        symbols: ["S1", "S2"],
        coordinates: [],
      },
      scenarioTests: passed(),
      executableSymbols: passed({
        coordinates: [{ path: "tests/x.spec.ts", line: 0 }],
      }),
      passingE2e: {
        receiptEvidence: [{ state: "failed", scope: "end_to_end" }],
      },
    },
  ),
  row(
    "REQ-INVALID-RECEIPT",
    { proofStatus: "missing", evidenceLevel: "asserted" },
    {
      productionSymbols: {
        status: "passed",
        symbols: ["S1"],
        coordinates: [],
      },
      scenarioTests: passed({ sources: [] }),
      executableSymbols: passed(),
      passingE2e: {
        receiptEvidence: [{ state: "invalid", scope: "unit" }],
      },
    },
  ),
  row(
    "REQ-NO-RECEIPT",
    { proofStatus: "missing", evidenceLevel: "asserted" },
    {
      scenarioTests: passed({
        sources: [
          { path: "tests/1.spec.ts" },
          { path: "tests/2.spec.ts" },
          { path: "tests/3.spec.ts" },
          { path: "tests/4.spec.ts" },
        ],
      }),
      passingE2e: {
        receiptEvidence: [{ state: "not_end_to_end", scope: "end_to_end" }],
      },
    },
  ),
  row(
    "REQ-COMPONENT",
    { proofStatus: "missing", evidenceLevel: "asserted" },
    {
      passingE2e: {
        receiptEvidence: [
          { state: "passed", scope: "unit", finishedAt: "not a date" },
        ],
      },
    },
  ),
  {
    id: "REQ-BARE",
    proofStatus: "missing",
    proofStages: "garbage",
    claimSummary: [],
  },
  { proofStatus: "not_applicable", id: "REQ-RETIRED" },
  {},
];

const FULL: HtmlReportInput = {
  requirements: {
    summary: { total: 20, proofNotApplicable: 1, proofTested: 6 },
    rows: FULL_ROWS,
    meta: {
      dirty: true,
      proofSnapshotDirty: true,
      proofSnapshot: "abcdef0123456789abcdef",
    },
  },
  symbols: { summary: { uncovered: 7, mixedRole: 2 }, rows: [] },
  branch: "main",
  generatedAt: new Date("2026-05-02T03:04:05.000Z"),
  repository: GITHUB,
  kbCertificates: {
    count: 3,
    kinds: { set_closure: 2, arithmetic: 1 },
    href: "certificates/kb.json",
  },
};

const EMPTY: HtmlReportInput = {
  requirements: { summary: {}, rows: [] },
  symbols: { summary: {}, rows: [] },
  branch: " ",
  generatedAt: new Date("2026-05-02T03:04:05.000Z"),
};

const golden = (name: string) =>
  readFileSync(
    path.join(import.meta.dir, `html-report-mutation.${name}.html.golden`),
    "utf8",
  );

describe("renderHtmlReport pages", () => {
  test("renders a full report", () => {
    expect(renderHtmlReport(FULL)).toBe(golden("full"));
  });

  test("renders an empty local report", () => {
    expect(renderHtmlReport(EMPTY)).toBe(golden("empty"));
  });
});

function page(
  rows: readonly Record<string, unknown>[],
  extra: Partial<HtmlReportInput> = {},
): string {
  return renderHtmlReport({
    requirements: { summary: { total: rows.length }, rows },
    symbols: { summary: {}, rows: [] },
    branch: "main",
    generatedAt: new Date("2026-05-02T03:04:05.000Z"),
    repository: GITHUB,
    ...extra,
  });
}

function article(html: string, id: string): string {
  const start = html.indexOf(`<article class="requirement`, 0);
  const marker = html.indexOf(`>${id}`, start);
  const open = html.lastIndexOf("<article", marker);
  return html.slice(open, html.indexOf("</article>", marker));
}

function gateOf(row: Record<string, unknown>): string {
  const match = /data-gate="([^"]*)"/.exec(
    article(page([row]), String(row.id)),
  );
  return (match as RegExpExecArray)[1] as string;
}

function stageDetail(html: string, label: string): string {
  const at = html.indexOf(`<span class="stage__label">${label}</span>`);
  const start = html.indexOf('<span class="stage__detail">', at) + 28;
  return html.slice(start, html.indexOf("</span>\n  </li>", start));
}

const BLOB = "https://github.com/acme/app/blob/0123456789abcdef0123";
const link = (href: string, label: string) =>
  `<a class="source-link" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;

describe("renderHtmlReport rows", () => {
  test("reads null and malformed fields as empty", () => {
    const html = page([
      {
        id: "REQ-NULL",
        title: '  Quoted "title"  ',
        proofStatus: "missing",
        proofStages: null,
        claimSummary: null,
        proofGaps: ["missing_scenario", 5],
      },
    ]);
    const row = article(html, "REQ-NULL");
    expect(row).toContain("<h3>Quoted &quot;title&quot;</h3>");
    expect(row).toContain(
      '<details class="proof-gaps"><summary>1 proof gap</summary><ul><li>Missing Scenario</li></ul></details>',
    );
  });

  test("names where each evidence floor comes from", () => {
    const floor = (source: string | undefined) =>
      row(`REQ-${source}`, {
        evidenceFloor: { required: "tested", source, status: "met" },
      });
    const html = page([floor("approval"), floor("firm"), floor("explicit")]);
    expect(article(html, "REQ-approval")).toContain(
      'title="Evidence floor: tested, the default floor for an approved requirement">floor tested · met</span>',
    );
    expect(article(html, "REQ-firm")).toContain(
      'title="Evidence floor: tested, the default floor for a firm requirement">floor tested · met</span>',
    );
    expect(article(html, "REQ-explicit")).toContain(
      'title="Evidence floor: tested, set by required_evidence">floor tested* · met</span>',
    );
  });

  test("counts only finite numbers", () => {
    const html = renderHtmlReport({
      requirements: {
        summary: { total: 4, proofTested: "3", proofNotApplicable: 2 },
        rows: [],
      },
      symbols: { summary: { uncovered: "9" }, rows: [] },
      branch: "main",
      generatedAt: new Date("2026-05-02T03:04:05.000Z"),
    });
    expect(html).toContain('<div class="score__value">0<span>%</span></div>');
    expect(html).toContain(
      "<span>Unmapped production symbols</span><strong>0</strong>",
    );
    expect(html).toContain(" · 2 non-current requirements excluded</span>");
  });

  test("lists source coordinates with lines and a remainder", () => {
    const html = page([
      row(
        "REQ-SRC",
        {},
        {
          logicGrounding: passed({
            sources: [
              { id: "NO-PATH" },
              { path: "a.md", line: 1 },
              { path: "b.md", line: "3", endLine: 2 },
              { path: "c.md" },
              { path: "d.md" },
            ],
          }),
        },
      ),
    ]);
    expect(stageDetail(html, "Semantic model")).toBe(
      `${link(`${BLOB}/a.md#L1`, "a.md:1")}, ${link(`${BLOB}/b.md#L3`, "b.md:3")} +2 more`,
    );
  });

  test("falls back to stage summaries without sources", () => {
    const html = page([
      row(
        "REQ-NOSRC",
        {},
        {
          logicGrounding: passed(),
          scenarios: passed({ scenarios: ["S1", "S2"] }),
        },
      ),
    ]);
    expect(stageDetail(html, "Semantic model")).toBe(
      "Complete, grounded, and coherent",
    );
    expect(stageDetail(html, "Scenario")).toBe("2 specified");
  });

  test("flags a missing executable symbol and unbound coordinates", () => {
    const html = page([
      row(
        "REQ-EXEC",
        { proofStatus: "missing" },
        {
          executableSymbols: {},
          sourceCoordinates: { status: "failed", requirementSource: "present" },
        },
      ),
    ]);
    expect(stageDetail(html, "E2E test")).toBe(
      "Test exists; executable symbol is missing",
    );
    expect(stageDetail(html, "Implementation")).toBe(
      "Ownership present; proof coverage is incomplete",
    );
    expect(html).toContain(
      '<li class="stage stage--warning">\n    <span class="stage__icon" aria-hidden="true">!</span>\n    <span class="stage__label">E2E test</span>',
    );
  });

  test("reads receipt scope when a receipt has no state", () => {
    const receipts = (receiptEvidence: unknown[]) =>
      gateOf(
        row(
          "REQ-SCOPE",
          { proofStatus: "missing" },
          {
            passingE2e: { receiptEvidence },
          },
        ),
      );
    expect(receipts([{ scope: "end_to_end" }])).toBe("evidence");
    expect(receipts([{ scope: "unit" }])).toBe("e2e");
    expect(receipts([{ state: "not_end_to_end" }, { state: "passed" }])).toBe(
      "evidence",
    );
    expect(receipts([])).toBe("e2e");
  });

  test("needs every production symbol to be source-bound", () => {
    const owned = (symbols: string[], missingSymbols: string[]) =>
      gateOf(
        row(
          "REQ-OWN",
          { proofStatus: "missing" },
          {
            productionSymbols: passed({ symbols }),
            sourceCoordinates: passed({
              requirementSource: "present",
              missingSymbols,
            }),
          },
        ),
      );
    expect(owned([], [])).toBe("implementation");
    expect(owned(["S1", "S2"], ["S1"])).toBe("implementation");
    expect(owned(["S1", "S2"], ["S3"])).toBe("evidence");
  });

  test("lets a tested requirement pass the strict gates", () => {
    const stages = { semanticInventory: { status: "failed" } };
    expect(gateOf(row("REQ-T", { evidenceLevel: "tested" }, stages))).toBe(
      "proved",
    );
    expect(gateOf(row("REQ-T", {}, stages))).toBe("tested");
    expect(earliestUnmetGate({ proofStatus: "tested" })).toBe("tested");
    expect(earliestUnmetGate({ proofStatus: "missing" })).toBe("semantic");
    expect(firstFailingProofGate(["semantic", "e2e"], () => true)).toBe(
      "tested",
    );
    expect(
      firstFailingProofGate(["semantic", "e2e"], (gate) => gate !== "e2e"),
    ).toBe("e2e");
  });

  test("dedupes contradictions by sorted requirement list", () => {
    const conflict = (requirements: string[]) => ({
      status: "contradiction",
      kind: "k",
      reason: "r",
      requirements,
    });
    const html = page([
      row(
        "REQ-C",
        { proofStatus: "missing" },
        {
          contradictions: {
            status: "unresolved",
            conflicts: [
              conflict(["REQ-A", "REQ-B"]),
              conflict(["REQ-B", "REQ-A"]),
              conflict(["REQ-AREQ-B"]),
            ],
          },
        },
      ),
    ]);
    expect(html).toContain("<span>Contradictions</span><strong>2</strong>");
  });

  test("summarizes certificates and claims", () => {
    const certificate = page([
      row("REQ-CERT", { claimSummary: { applicable: 0 } }),
    ]);
    expect(stageDetail(certificate, "Certificate")).toBe("exhaustive · 1 test");
    const partial = page([
      row("REQ-PART", {
        evidenceLevel: "tested",
        evidence: [],
        claimSummary: { applicable: 2, proved: 1 },
      }),
    ]);
    expect(stageDetail(partial, "Certificate")).toBe("1/2 claims proved");
    expect(partial).toContain(
      '<li class="stage stage--warning">\n    <span class="stage__icon" aria-hidden="true">!</span>\n    <span class="stage__label">Certificate</span>',
    );
    const odd = page([
      row("REQ-ODD", { claimSummary: { applicable: 2, proved: "x" } }),
    ]);
    expect(odd).toContain(
      '<span class="claims-proved" title="Requirement claims a re-checked certificate derives">0/2 claims proved</span>',
    );
    expect(
      certificateRejectionLines({
        certificateRejections: [{ test: "T", reason: "r" }],
        claimBindingRejections: [{}],
      }),
    ).toStrictEqual([
      "T: certificate rejected, r",
      "test: binding for claim rejected, no reason given",
    ]);
  });

  test("renders a single KB certificate without kinds", () => {
    const html = page([], {
      kbCertificates: { count: 1, kinds: {}, href: "kb.json" },
    });
    expect(html).toContain(
      '<p class="kb-certificates">KB consistency: 1 certificate · <a href="kb.json">kb.json</a> · re-check with <code>kibi check --certificates kb.json</code></p>',
    );
  });

  test("links sources at the repository branch or the report branch", () => {
    const gitlab = {
      identity: "acme/app",
      webUrl: "https://gitlab.com/acme/app",
      provider: "gitlab",
    } as const;
    const rows = [row("REQ-GL")];
    expect(
      page(rows, { repository: { ...gitlab, branch: "feature/x" } }),
    ).toContain(
      link(
        "https://gitlab.com/acme/app/-/blob/feature%2Fx/.kb/requirements/REQ-GL.md",
        "REQ-GL",
      ),
    );
    const html = page(rows, { repository: gitlab, branch: "dev" });
    expect(html).toContain(
      link(
        "https://gitlab.com/acme/app/-/blob/dev/.kb/requirements/REQ-GL.md",
        "REQ-GL",
      ),
    );
    expect(html).toContain(
      `<div class="snapshot">${link("https://gitlab.com/acme/app", "acme/app")} <span aria-hidden="true">/</span> dev</div>`,
    );
  });
});
