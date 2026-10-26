import { describe, expect, test } from "bun:test";

import { renderKibiFaviconDataUri } from "../../src/report/brand.js";
import {
  type HtmlReportCoverage,
  KIBI_GETTING_STARTED_URL,
  REPORT_CSP,
  renderHtmlReport,
} from "../../src/report/html-report.js";

function stage(status: string, fields = {}): Record<string, unknown> {
  return { status, ...fields };
}

function provenStages(overrides: Record<string, unknown> = {}) {
  return {
    semanticInventory: stage("passed"),
    logicGrounding: stage("passed", {
      sources: [{ id: "FACT-1", path: ".kb/facts/FACT-1.md" }],
    }),
    contradictions: stage("passed", { conflicts: [] }),
    scenarios: stage("passed", {
      scenarios: ["SCEN-204"],
      sources: [{ id: "SCEN-204", path: ".kb/scenarios/SCEN-204.md" }],
    }),
    scenarioTests: stage("passed", {
      tests: ["TEST-204"],
      sources: [
        {
          id: "TEST-204",
          path: "documentation/tests/e2e/password-reset.test.ts",
          line: 10,
        },
      ],
    }),
    productionSymbols: stage("passed", {
      symbols: ["SYM-reset-password"],
      coordinates: [
        {
          id: "SYM-reset-password",
          path: "src/auth/reset.ts",
          line: 12,
          endLine: 40,
        },
      ],
    }),
    executableSymbols: stage("passed", {
      symbols: ["SYM-test-reset-password"],
      coordinates: [
        {
          id: "SYM-test-reset-password",
          path: "documentation/tests/e2e/password-reset.test.ts",
          line: 10,
        },
      ],
    }),
    sourceCoordinates: stage("passed", {
      requirementSource: "present",
      requirementPath: ".kb/requirements/REQ-204.md",
      missingSymbols: [],
      coordinates: [
        {
          id: "SYM-reset-password",
          path: "src/auth/reset.ts",
          line: 12,
          endLine: 40,
        },
      ],
    }),
    passingE2e: stage("passed", {
      receiptEvidence: [
        {
          state: "passed",
          scope: "end_to_end",
          testId: "TEST-204",
          receiptId: "VR-RESET-0001",
          finishedAt: "2026-08-15T11:42:00.000Z",
          ageSeconds: 1_080,
        },
      ],
    }),
    ...overrides,
  };
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
        proofTested: 1,
      },
      meta: {
        branch: "main",
        proofSnapshot: "1234567890abcdef",
        proofSnapshotDirty: false,
        dirty: false,
      },
      rows: [
        {
          id: "REQ-204",
          title: "Password Reset",
          source: ".kb/requirements/REQ-204.md",
          proofStatus: "tested",
          proofGaps: [],
          proofAdvisories: ["missing_verification_receipt"],
          verificationScopes: ["end_to_end"],
          proofStages: provenStages(),
        },
        {
          id: "REQ-443",
          title: 'Trial Duration </script><img src=x onerror="bad()">',
          proofStatus: "unresolved",
          proofGaps: [
            "blocking_contradiction",
            "missing_scenario",
            "stale_verification_receipt",
            "missing_production_symbol",
          ],
          proofAdvisories: [],
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
            scenarios: stage("missing", { scenarios: [], sources: [] }),
            scenarioTests: stage("missing", { tests: [], sources: [] }),
            productionSymbols: stage("missing", {
              symbols: [],
              coordinates: [],
            }),
            executableSymbols: stage("blocked", {
              symbols: [],
              coordinates: [],
            }),
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
          proofAdvisories: [],
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

function render(overrides: Record<string, unknown> = {}) {
  const fixture = coverageFixture();
  return renderHtmlReport({
    ...fixture,
    branch: "main",
    generatedAt: new Date("2026-08-15T12:00:00.000Z"),
    ...overrides,
  });
}

describe("renderHtmlReport", () => {
  test("renders a self-contained requirement health dashboard", () => {
    const html = render();

    expect(html).toContain("Kibi Requirement Health · main");
    expect(html).toContain(">50<span>%</span>");
    expect(html).toContain("Tested end to end");
    expect(html).toContain(
      "1 of 2 current requirements fully tested end-to-end",
    );
    expect(html).toContain(
      "Kibi only counts a requirement when every required proof gate passes",
    );
    expect(html).toContain('aria-label="Kibi logo"');
    expect(html).toContain('aria-label="Kibi"');
    expect(html).toContain("Intent → proof");
    expect(html).toContain("−1 blocked here");
    expect(html).toContain("Password Reset");
    expect(html).toContain("2026-08-15 11:42 UTC");
    expect(html).toContain('datetime="2026-08-15T11:42:00.000Z"');
    expect(html).toContain('datetime="2026-08-15T12:00:00.000Z"');
    expect(html).not.toContain("Generated just now");
    expect(html).not.toContain("Fresh 18 min ago");
    expect(html).not.toContain("Fresh just now");
    expect(html).toContain("14 days");
    expect(html).toContain("30 days");
    expect(html).toContain("Unmapped production symbols");
    expect(html).toContain("Requirements without implementation");
    expect(html).not.toContain("Unowned code");
    expect(html).toContain(">2</strong>");
    expect(html).toContain('data-filter="contradiction"');
    expect(html).toContain('All <span class="filter__count">2</span>');
    expect(html).toContain('Tested <span class="filter__count">1</span>');
    expect(html).toContain('data-gate="semantic"');
    expect(html).toContain('type="button" class="proof-gate');
    expect(html).toContain("1 advisory");
    expect(html).toContain(KIBI_GETTING_STARTED_URL);
    expect(html).toContain("Add requirement proof to your repo");
    expect(html).toContain(`content="${REPORT_CSP}"`);
    expect(html).toContain(renderKibiFaviconDataUri());
    expect(html).toContain('name="theme-color"');
  });

  test("keeps proven cards free of blocking proof gaps", () => {
    const fixture = coverageFixture();
    const proven = {
      ...fixture.requirements.rows[0],
      proofStatus: "tested",
      proofGaps: ["missing_verification_receipt"],
      proofAdvisories: [],
    };
    const html = renderHtmlReport({
      ...fixture,
      requirements: {
        ...fixture.requirements,
        rows: [proven, ...fixture.requirements.rows.slice(1)],
      },
      branch: "main",
      generatedAt: new Date("2026-08-15T12:00:00.000Z"),
    });
    const provenCard = html.match(
      /<article class="requirement requirement--tested"[\s\S]*?<\/article>/,
    )?.[0];
    expect(provenCard).toBeTruthy();
    expect(provenCard).toContain("Tested");
    expect(provenCard).toContain("1 advisory");
    expect(provenCard).not.toContain("proof gap");
  });

  test("renders inspectable repository and source links from structured metadata", () => {
    const html = render({
      repository: {
        identity: "Acme/Widgets",
        webUrl: "https://github.com/Acme/Widgets",
        provider: "github",
        commitSha: "782c5d97abcdef",
        branch: "main",
      },
    });
    expect(html).toContain("Kibi Requirement Health · Acme/Widgets · main");
    expect(html).toContain("Acme/Widgets");
    expect(html).toContain("782c5d97abcd");
    expect(html).toContain(
      "https://github.com/Acme/Widgets/blob/782c5d97abcdef/.kb/requirements/REQ-204.md",
    );
    expect(html).toContain(
      "https://github.com/Acme/Widgets/blob/782c5d97abcdef/src/auth/reset.ts#L12-L40",
    );
    expect(html).toContain(
      "https://github.com/Acme/Widgets/commit/782c5d97abcdef",
    );
    expect(html).toContain(">Acme/Widgets</a>");
    expect(html).toContain('<span aria-hidden="true">/</span> main');
  });

  test("keeps local coordinates when repository metadata is unavailable", () => {
    const html = render();
    expect(html).toContain("src/auth/reset.ts:12-40");
    expect(html).not.toContain("https://github.com/Acme/");
    expect(html).not.toMatch(/(?:src)=["']https?:\/\//i);
    expect(html).not.toMatch(/<link[^>]+href=["']https?:\/\//i);
  });

  test("escapes all KB-provided text and excludes non-current rows", () => {
    const html = render();
    expect(html).toContain(
      "Trial Duration &lt;/script&gt;&lt;img src=x onerror=&quot;bad()&quot;&gt;",
    );
    expect(html).not.toContain('<img src=x onerror="bad()">');
    expect(html).not.toContain("Old behavior");
    expect(html).toContain("1 non-current requirement excluded");
  });

  test("shows a component test as the proving test only where its scenario accepts that scope", () => {
    const fixture = coverageFixture();
    const row = (id: string, state: string) => ({
      ...fixture.requirements.rows[0],
      id,
      title: id,
      proofStatus: state === "passed" ? "tested" : "missing",
      proofGaps: state === "passed" ? [] : ["missing_passing_e2e"],
      proofAdvisories: [],
      proofStages: provenStages({
        passingE2e: stage(state === "passed" ? "passed" : "missing", {
          receiptEvidence: [{ state, scope: "unit", testId: `TEST-${id}` }],
        }),
      }),
    });
    const html = renderHtmlReport({
      ...fixture,
      requirements: {
        ...fixture.requirements,
        rows: [
          row("REQ-UI-PATTERN", "passed"),
          row("REQ-UI-LAYOUT", "not_end_to_end"),
        ],
      },
      branch: "main",
      generatedAt: new Date("2026-08-15T12:00:00.000Z"),
    });
    const e2eStage = (id: string) =>
      [...html.matchAll(/<article[\s\S]*?<\/article>/g)]
        .map((match) => match[0])
        .find((card) => card.includes(id))
        ?.match(
          /<li class="stage stage--(\w+)">\s*<span[^>]*>[^<]*<\/span>\s*<span class="stage__label">E2E test/,
        )?.[1];
    expect(e2eStage("REQ-UI-PATTERN")).toBe("passed");
    expect(e2eStage("REQ-UI-LAYOUT")).toBe("failed");
  });

  test("assigns each requirement to its earliest unmet proof gate", () => {
    const completeBeforeEvidence = {
      id: "REQ-EVIDENCE",
      title: "Waiting for evidence",
      proofStatus: "missing",
      proofGaps: ["missing_verification_receipt"],
      proofAdvisories: [],
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
        summary: { total: 2, proofNotApplicable: 0, proofTested: 0 },
        rows: [blockedAtSemantics, completeBeforeEvidence],
      },
      symbols: { summary: { total: 1, uncovered: 0, mixedRole: 0 }, rows: [] },
      branch: "develop",
      generatedAt: new Date("2026-08-16T12:00:00.000Z"),
    });

    expect(html).toContain(">0<span>%</span>");
    expect(html).toContain(
      "0 of 2 current requirements fully tested end-to-end",
    );
    expect(
      [...html.matchAll(/proof-gate__count">(\d+)/g)].map((match) =>
        Number(match[1]),
      ),
    ).toEqual([1, 1, 1, 1, 0, 0]);
    expect(html.match(/−1 blocked here/g)).toHaveLength(2);
    expect(html).toContain('data-gate="semantic"');
    expect(html).toContain('data-gate="implementation"');
    expect(html).toContain("timestamp unavailable");
  });

  test("renders zero, full, and empty requirement sets without fabricated freshness", () => {
    const empty = renderHtmlReport({
      requirements: {
        summary: { total: 0, proofNotApplicable: 0, proofTested: 0 },
        rows: [],
      },
      symbols: { summary: { total: 0, uncovered: 0, mixedRole: 0 }, rows: [] },
      branch: "main",
      generatedAt: new Date("2026-08-15T12:00:00.000Z"),
    });
    expect(empty).toContain("No current requirements");
    expect(empty).toContain(">0<span>%</span>");
    expect(empty).toContain('datetime="2026-08-15T12:00:00.000Z"');

    const fullFixture = coverageFixture();
    const provenRow = fullFixture.requirements.rows[0];
    expect(provenRow).toBeDefined();
    if (!provenRow) return;
    const full = render({
      requirements: {
        ...fullFixture.requirements,
        summary: { total: 1, proofNotApplicable: 0, proofTested: 1 },
        rows: [provenRow],
      },
    });
    expect(full).toContain(">100<span>%</span>");
  });

  test("covers count fallbacks, muted stages, and incomplete implementation ownership", () => {
    const html = renderHtmlReport({
      requirements: {
        summary: {
          total: "not-a-number",
          proofNotApplicable: Number.NaN,
          proofTested: Number.POSITIVE_INFINITY,
        },
        rows: [
          {
            id: "REQ-MUTED",
            title: "Muted stage",
            proofStatus: "missing",
            proofGaps: ["stale_proof_receipt"],
            proofAdvisories: [],
            proofStages: {
              semanticInventory: stage("passed"),
              logicGrounding: stage("passed"),
              contradictions: stage("not_applicable"),
              scenarios: stage("passed", { scenarios: ["SCEN-MUTED"] }),
              scenarioTests: stage("passed", { tests: ["TEST-MUTED"] }),
              productionSymbols: stage("passed", { symbols: [] }),
              executableSymbols: stage("passed", { symbols: [] }),
              sourceCoordinates: stage("missing", {
                requirementSource: "absent",
                missingSymbols: ["SYM-MISSING"],
                coordinates: [
                  { id: "SYM-NO-PATH" },
                  { path: "src/a.ts", line: 0 },
                ],
              }),
              passingE2e: stage("passed", {
                receiptEvidence: [{ state: "passed", scope: "unit" }],
              }),
            },
          },
          {
            id: "REQ-OWNED",
            title: "Partial ownership",
            proofStatus: "missing",
            proofGaps: ["missing_production_symbol"],
            proofAdvisories: [],
            proofStages: {
              semanticInventory: stage("passed"),
              logicGrounding: stage("passed"),
              contradictions: stage("passed", { conflicts: [] }),
              scenarios: stage("passed", { scenarios: ["SCEN-OWNED"] }),
              scenarioTests: stage("passed", { tests: ["TEST-OWNED"] }),
              productionSymbols: stage("passed", {
                symbols: ["SYM-OWNED", "SYM-MISSING"],
              }),
              executableSymbols: stage("passed", { symbols: [] }),
              sourceCoordinates: stage("passed", {
                requirementSource: "present",
                missingSymbols: ["SYM-MISSING"],
                coordinates: [
                  {
                    path: "src/owned.ts",
                    id: "SYM-OWNED",
                    line: 4,
                    endLine: 8,
                  },
                ],
              }),
              passingE2e: stage("passed", {
                receiptEvidence: [
                  { state: "passed", scope: "end_to_end", finishedAt: "bad" },
                ],
              }),
            },
          },
        ],
      },
      symbols: { summary: { total: 2, uncovered: 3, mixedRole: 1 }, rows: [] },
      branch: "  ",
      generatedAt: new Date("2026-08-15T12:00:00.000Z"),
      repository: {
        provider: "github",
        webUrl: "https://github.com/Looted/kibi",
        commitSha: "abcdef1234567890",
        branch: "feature/report",
      },
    });
    expect(html).toContain("No current requirements");
    expect(html).toContain("REQ-OWNED");
    expect(html).toContain("stage--muted");
    expect(html).toContain("Stale Proof Receipt");
    expect(html).toContain("timestamp unavailable");
    expect(html).toContain("--carbon:");
  });
});

describe("renderHtmlReport evidence ladder", () => {
  function ladderReport(kbCertificates?: {
    count: number;
    kinds: Record<string, number>;
    href: string;
  }) {
    const fixture = coverageFixture();
    const [tested, unresolved, old] = fixture.requirements.rows;
    const proved = {
      ...tested,
      evidenceLevel: "proved",
      evidence: [
        {
          kind: "certificate",
          scope: "code",
          level: "proved",
          tests: ["TEST-reset-exhaustive"],
          kinds: ["exhaustive"],
        },
        { kind: "e2e", scope: "code", level: "tested", tests: ["TEST-reset"] },
      ],
      evidenceFloor: { required: "proved", source: "explicit", status: "met" },
      claimSummary: {
        applicable: 2,
        proved: 2,
        attested: 0,
        tested: 0,
        unresolved: 0,
      },
    };
    const below = {
      ...unresolved,
      evidenceLevel: "asserted",
      evidenceFloor: {
        required: "tested",
        source: "firmness",
        status: "below",
      },
      certificateRejections: [
        { test: "TEST-trial-smt", reason: "the solver did not answer unsat" },
      ],
      claimBindingRejections: [
        {
          test: "TEST-trial-smt",
          claimKey: "CLAIM-trial",
          reason: "the fact changed since ingest",
        },
      ],
    };
    const pending = {
      ...tested,
      id: "REQ-205",
      title: "Session Expiry",
      proofStatus: "unresolved",
      proofGaps: ["stale_proof_receipt"],
      evidenceLevel: "asserted",
      evidenceFloor: {
        required: "tested",
        source: "firmness",
        status: "pending_reproof",
      },
    };
    const noFloor = {
      ...tested,
      id: "REQ-206",
      title: "Exploratory Note",
      evidenceLevel: "tested",
      evidenceFloor: {
        required: "unverified",
        source: "firmness",
        status: "met",
      },
    };
    return renderHtmlReport({
      ...fixture,
      requirements: {
        ...fixture.requirements,
        rows: [proved, below, pending, noFloor, old],
      },
      branch: "main",
      generatedAt: new Date("2026-08-15T12:00:00.000Z"),
      ...(kbCertificates === undefined ? {} : { kbCertificates }),
    });
  }

  function card(html: string, id: string): string {
    const match = html.match(
      new RegExp(
        `<article class="requirement[^"]*"[^>]*>(?:(?!</article>)[\\s\\S])*?${id}[\\s\\S]*?</article>`,
      ),
    );
    expect(match).toBeTruthy();
    return match?.[0] ?? "";
  }

  test("shows each requirement's floor and whether its level reaches it", () => {
    const html = ladderReport();
    expect(card(html, "REQ-204")).toContain("floor proved* · met");
    expect(card(html, "REQ-443")).toContain(
      'class="evidence-floor evidence-floor--below"',
    );
    expect(card(html, "REQ-443")).toContain("floor tested · below");
    expect(card(html, "REQ-205")).toContain("floor tested · pending re-proof");
    expect(card(html, "REQ-206")).not.toContain("evidence-floor");
    expect(html).toContain("Below evidence floor</span><strong>1</strong>");
    expect(html).toContain("Pending re-proof</span><strong>1</strong>");
    expect(html).toContain('Below floor <span class="filter__count">1</span>');
    expect(html).toContain(
      'Pending re-proof <span class="filter__count">1</span>',
    );
  });

  test("sorts a requirement below its floor right after contradictions", () => {
    const html = ladderReport();
    const order = [...html.matchAll(/<article class="requirement[^>]*>/g)].map(
      (match) => match.index ?? 0,
    );
    const at = (id: string) => html.indexOf(card(html, id));
    expect(order.length).toBe(4);
    expect(at("REQ-443")).toBeLessThan(at("REQ-205"));
    expect(at("REQ-205")).toBeLessThan(at("REQ-204"));
  });

  test("labels a proved requirement and names the certificate behind it", () => {
    const html = ladderReport();
    const proved = card(html, "REQ-204");
    expect(proved).toContain('data-state="tested proved"');
    expect(proved).toContain(
      '<span class="proof-badge proof-badge--proved">Proved</span>',
    );
    expect(proved).toContain("Certificate");
    expect(proved).toContain("exhaustive · 1 test · 2/2 claims proved");
    expect(html).toContain('Proved <span class="filter__count">1</span>');
    expect(card(html, "REQ-206")).toContain(">Tested</span>");
  });

  test("ends the proof rail at Proved and files tested-only rows there", () => {
    const html = ladderReport();
    const gates = [...html.matchAll(/proof-gate__label">([^<]+)/g)].map(
      (match) => match[1],
    );
    expect(gates).toEqual([
      "Semantic model",
      "Scenario",
      "Implementation",
      "E2E",
      "Tested",
      "Proved",
    ]);
    expect(html).toContain('class="proof-gate proof-gate--optional"');
    expect(html).toContain("1 tested, not proved");
    expect(html).toContain(
      "Every claim has a re-checked certificate · 2 of 2 claims proved",
    );
    expect(card(html, "REQ-204")).toContain('data-gate="tested"');
    expect(card(html, "REQ-206")).toContain('data-gate="proved"');
  });

  test("lays the summary tiles out as two full rows, ladder first", () => {
    const html = ladderReport();
    const labels = [
      ...html.matchAll(/<div class="metric[^"]*"><span>([^<]+)<\/span>/g),
    ].map((match) => match[1]);
    expect(labels).toEqual([
      "Requirements",
      "Proved by certificate",
      "Tested end to end",
      "Asserted, no current test",
      "Unverified",
      "Below evidence floor",
      "Pending re-proof",
      "Stale E2E evidence",
      "Missing scenarios",
      "Requirements without implementation",
      "Unmapped production symbols",
      "Contradictions",
    ]);
    expect(html).toContain("grid-template-columns: repeat(6, minmax(0, 1fr));");
  });

  test("lists certificates and claim bindings that no longer re-check", () => {
    const below = card(ladderReport(), "REQ-443");
    expect(below).toContain("2 certificate rejections");
    expect(below).toContain(
      "TEST-trial-smt: certificate rejected, the solver did not answer unsat",
    );
    expect(below).toContain(
      "TEST-trial-smt: binding for CLAIM-trial rejected, the fact changed since ingest",
    );
    expect(below).toContain("certificates do not re-check");
  });

  test("links a published KB certificate bundle", () => {
    expect(ladderReport()).not.toContain('class="kb-certificates"');
    const html = ladderReport({
      count: 3,
      kinds: { property_model: 2, predicate_model: 1 },
      href: "kb-certificates.json",
    });
    expect(html).toContain(
      "KB consistency: 3 certificates (1 predicate model, 2 property model)",
    );
    expect(html).toContain('<a href="kb-certificates.json">');
    expect(html).toContain("kibi check --certificates kb-certificates.json");
  });
});
