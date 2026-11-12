import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  classifyExplainTarget,
  executeProofExplain,
  gapReason,
  projectRequirementExplain,
  projectSymbolExplain,
  renderProofExplain,
  requireExplainTarget,
} from "../../../src/operations/proof/explain.js";
import type {
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import * as reporting from "../../../src/public/operations/specs/reporting.js";

const savedMode = process.env.KIBI_PROOF_BINDING_MODE;
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  if (savedMode === undefined)
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
  else process.env.KIBI_PROOF_BINDING_MODE = savedMode;
  for (const spy of spies.splice(0)) spy.mockRestore();
});

/** What a call threw, as plain data. */
function thrown(run: () => unknown): unknown {
  try {
    run();
    return "ok";
  } catch (error) {
    const typed = error as Error & { code?: string; retryable?: boolean };
    return {
      name: typed.name,
      message: typed.message,
      code: typed.code,
      retryable: typed.retryable,
    };
  }
}

async function rejected(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
    return "ok";
  } catch (error) {
    const typed = error as Error & { code?: string; retryable?: boolean };
    return {
      message: typed.message,
      code: typed.code,
      retryable: typed.retryable,
    };
  }
}

const rich = {
  id: "REQ-r",
  proofVersion: "v4",
  proofStatus: "tested",
  proofGaps: [],
  evidenceLevel: 3,
  testResolutions: [
    {
      testId: "TEST-1",
      requiredProofs: [
        {
          id: "SYM-a",
          path: "src/a.ts",
          sourceFile: "ignored.ts",
          role: "production",
          exists: true,
        },
        { sourceFile: "src/b.ts", exists: false },
        { id: 7, path: 3, sourceFile: 4, role: "", exists: "yes" },
        null,
      ],
      executableFor: [{ id: "SYM-t", role: "test" }],
    },
    null,
    { testId: "TEST-2", requiredProofs: "x", executableFor: "y" },
  ],
  proofStages: {
    scenarios: { scenarios: ["SCEN-1", "SCEN-2", "SCEN-3"] },
    scenarioTests: {
      tests: ["TEST-1", "TEST-2", "", "TEST-3", 4],
      resolutions: [{ testId: "TEST-3", requiredProofs: [{ id: "unused" }] }],
      obligations: [
        { scenarioId: "SCEN-2", tests: ["TEST-2"] },
        { scenarioId: "SCEN-1", tests: ["TEST-1", "TEST-3"] },
      ],
    },
    productionSymbols: {
      explanations: [
        {
          symbolId: "SYM-a",
          classification: "production",
          status: "covered",
          reason: "qualifying",
          reasonText: "text",
          coverageCandidates: [
            {
              testId: "TEST-1",
              relationship: "covers",
              qualifies: true,
              reason: "ok",
              reasonText: "fine",
              secondaryReasons: ["a", "", 2, "b"],
              scope: "end_to_end",
              receiptState: "fresh",
            },
            {
              testId: 1,
              qualifies: "true",
              reasonText: 1,
              secondaryReasons: "a",
              scope: 2,
              receiptState: 3,
            },
          ],
        },
        { symbolId: "SYM-s", reasonText: 5, coverageCandidates: "none" },
        null,
      ],
      structuralSymbols: ["SYM-s"],
    },
  },
};

describe("projectRequirementExplain", () => {
  test("projects test resolutions, scenarios and symbol coverage", () => {
    expect(projectRequirementExplain(rich)).toStrictEqual({
      kind: "requirement",
      id: "REQ-r",
      proofVersion: "v4",
      proofStatus: "tested",
      proofGaps: [],
      scenarios: [
        { id: "SCEN-1", tests: ["TEST-1", "TEST-3"] },
        { id: "SCEN-2", tests: ["TEST-2"] },
        { id: "SCEN-3", tests: [] },
      ],
      tests: [
        {
          testId: "TEST-1",
          requiredProofs: [
            {
              id: "SYM-a",
              sourceFile: "ignored.ts",
              path: "src/a.ts",
              role: "production",
              exists: true,
            },
            { sourceFile: "src/b.ts", exists: false },
            { role: "" },
            {},
          ],
          executableFor: [{ id: "SYM-t", role: "test" }],
        },
        { testId: "TEST-2", requiredProofs: [], executableFor: [] },
        { testId: "TEST-3", requiredProofs: [], executableFor: [] },
      ],
      productionSymbols: [
        {
          symbolId: "SYM-a",
          classification: "production",
          status: "covered",
          reason: "qualifying",
          reasonText: "text",
          coverageCandidates: [
            {
              testId: "TEST-1",
              relationship: "covers",
              qualifies: true,
              reason: "ok",
              reasonText: "fine",
              secondaryReasons: ["a", "b"],
              scope: "end_to_end",
              receiptState: "fresh",
            },
            {
              testId: "",
              relationship: "covered_by",
              qualifies: false,
              reason: "",
              secondaryReasons: [],
            },
          ],
        },
        {
          symbolId: "",
          classification: "unknown",
          status: "",
          reason: "",
          coverageCandidates: [],
        },
      ],
      structuralSymbols: [
        {
          symbolId: "SYM-s",
          classification: "unknown",
          status: "",
          reason: "",
          coverageCandidates: [],
        },
      ],
    });
  });

  test("falls back to the scenario-test resolutions", () => {
    const view = projectRequirementExplain({
      proofStages: {
        scenarioTests: {
          tests: ["TEST-3"],
          resolutions: [{ testId: "TEST-3", executableFor: [{ id: "S" }] }],
        },
      },
    });
    expect(view.tests).toStrictEqual([
      { testId: "TEST-3", requiredProofs: [], executableFor: [{ id: "S" }] },
    ]);
  });

  test("projects drifted fingerprint components sorted by test", () => {
    const view = projectRequirementExplain({
      proofStages: {
        passingE2e: {
          receiptEvidence: [
            { testId: "T-b", fingerprintDrift: ["command"] },
            { testId: "T-a", fingerprintDrift: ["integration", 1, "command"] },
            { testId: "T-c", fingerprintDrift: [] },
            { testId: "T-d", fingerprintDrift: "command" },
            { testId: "T-e" },
            null,
          ],
        },
      },
    });
    expect(view.fingerprintDrift).toStrictEqual([
      { test: "T-a", components: ["integration", "command"] },
      { test: "T-b", components: ["command"] },
    ]);
    expect(renderProofExplain(view)).toContain(
      "fingerprint drift for T-a: integration, command\nfingerprint drift for T-b: command",
    );
    expect(
      projectRequirementExplain({
        proofStages: { passingE2e: { receiptEvidence: "none" } },
      }).fingerprintDrift,
    ).toBeUndefined();
    expect(
      projectRequirementExplain({
        proofStages: { passingE2e: { receiptEvidence: [] } },
      }).fingerprintDrift,
    ).toBeUndefined();
  });

  test("an empty proof has only the required fields", () => {
    expect(projectRequirementExplain({})).toStrictEqual({
      kind: "requirement",
      id: "",
      proofVersion: "",
      proofStatus: "",
      proofGaps: [],
      scenarios: [],
      tests: [],
      productionSymbols: [],
      structuralSymbols: [],
    });
    expect(
      projectRequirementExplain({
        proofStages: {
          scenarios: { scenarios: "SCEN-1" },
          scenarioTests: { obligations: "none", resolutions: "none" },
          sourceCoordinates: { missingSymbols: [] },
        },
        claimBindingRejections: [],
        unprovedClaims: "c1",
        claimEvidence: "none",
      }),
    ).toStrictEqual({
      kind: "requirement",
      id: "",
      proofVersion: "",
      proofStatus: "",
      proofGaps: [],
      scenarios: [],
      tests: [],
      productionSymbols: [],
      structuralSymbols: [],
    });
  });

  test("projects evidence, rejections, refutations, coordinates and claims", () => {
    expect(
      projectRequirementExplain({
        id: "REQ-c",
        proofGaps: ["a", "", 1],
        evidenceLevel: "proved",
        certificateRejections: [{ test: "T", reason: "r" }, null],
        claimBindingRejections: [
          { test: "T", claimKey: "c1", reason: "why" },
          null,
        ],
        claimSummary: { attested: 2, tested: 3, unresolved: 4, proved: "1" },
        unprovedClaims: ["c1", 2],
        claimEvidence: [
          {
            claimKey: "c1",
            status: "modeled",
            applicable: "true",
            level: 5,
            blocker: 5,
            notProved: 5,
            bindings: [
              { test: "T", kind: "rule", binding: "asserted", scope: "unit", reason: 5 },
              null,
            ],
          },
          {
            claimKey: "c2",
            applicable: true,
            level: "proved",
            blocker: "B",
            notProved: "requirement_not_tested",
            bindings: "none",
          },
          null,
        ],
        proofStages: { sourceCoordinates: { missingSymbols: ["SYM-x", ""] } },
      }),
    ).toStrictEqual({
      kind: "requirement",
      id: "REQ-c",
      proofVersion: "",
      proofStatus: "",
      proofGaps: ["a"],
      evidenceLevel: "proved",
      certificateRejections: [
        { test: "T", reason: "r" },
        { test: "", reason: "" },
      ],
      refutations: [
        { test: "T", claimKey: "c1", reason: "why" },
        { test: "", claimKey: "", reason: "" },
      ],
      missingCoordinateSymbols: ["SYM-x"],
      claimSummary: {
        applicable: 0,
        proved: 0,
        attested: 2,
        tested: 3,
        unresolved: 4,
      },
      unprovedClaims: ["c1"],
      claims: [
        {
          claimKey: "c1",
          status: "modeled",
          applicable: false,
          level: null,
          bindings: [
            { test: "T", kind: "rule", binding: "asserted", scope: "unit" },
            { test: "", kind: "", binding: "", scope: "" },
          ],
        },
        {
          claimKey: "c2",
          status: "",
          applicable: true,
          level: "proved",
          blocker: "B",
          notProved: "requirement_not_tested",
          bindings: [],
        },
        {
          claimKey: "",
          status: "",
          applicable: false,
          level: null,
          bindings: [],
        },
      ],
      scenarios: [],
      tests: [],
      productionSymbols: [],
      structuralSymbols: [],
    });
  });

  test("a claim summary that is not an object counts nothing", () => {
    expect(projectRequirementExplain({ claimSummary: "x" }).claimSummary).toStrictEqual({
      applicable: 0,
      proved: 0,
      attested: 0,
      tested: 0,
      unresolved: 0,
    });
  });

  test("projects present stages from any value", () => {
    const view = projectRequirementExplain({
      proofStages: { negativePath: null, dimension: 1, cases: "x" },
    });
    expect([view.negativePath, view.dimension, view.cases]).toStrictEqual([
      { status: "", negativeScenarios: [], claims: [], suggestedNegatives: [] },
      { status: "", claims: [], waivedClaims: [] },
      { status: "", cases: [], summary: {}, limitReached: false },
    ]);
  });

  test("projects stage entries that are not objects", () => {
    const view = projectRequirementExplain({
      proofStages: {
        negativePath: { suggestedNegatives: [null], waiver: { approvedBy: "x" } },
        dimension: { claims: [null], waivedClaims: [{ waiver: { reason: "r", approvedBy: 1 } }] },
        cases: { cases: [null], summary: null, limitReached: "true" },
      },
    });
    expect([view.negativePath, view.dimension, view.cases]).toStrictEqual([
      {
        status: "",
        negativeScenarios: [],
        claims: [],
        suggestedNegatives: [{ claimKey: "", factId: "", assumption: {} }],
      },
      {
        status: "",
        claims: [
          { claimKey: "", claimText: "", quantifier: "", factIds: [], rewrites: [] },
        ],
        waivedClaims: [
          {
            claimKey: "",
            claimText: "",
            quantifier: "",
            factIds: [],
            rewrites: [],
            waiver: { reason: "r" },
          },
        ],
      },
      {
        status: "",
        cases: [
          {
            caseId: "",
            claimKey: "",
            factId: "",
            generator: "",
            constraint: "",
            predicted: "",
            coverage: "",
            scenarios: [],
            assumption: {},
          },
        ],
        summary: {},
        limitReached: false,
      },
    ]);
  });
});

describe("renderProofExplain for a requirement", () => {
  test("renders tests, references and symbol coverage", () => {
    expect(renderProofExplain(projectRequirementExplain(rich))).toBe(
      [
        "Proof explain for REQ-r",
        "proofVersion: v4",
        "proofStatus: tested",
        "proofGaps: (none)",
        "",
        "Scenarios",
        "  SCEN-1 -> TEST-1, TEST-3",
        "  SCEN-2 -> TEST-2",
        "  SCEN-3 -> (no tests)",
        "",
        "TEST TEST-1",
        "  required_proofs",
        "    SYM-a src/a.ts role=production",
        "    (unresolved) src/b.ts",
        "    (unresolved)",
        "    (unresolved)",
        "  executable_for",
        "    SYM-t role=test",
        "",
        "TEST TEST-2",
        "  required_proofs",
        "    (none)",
        "  executable_for",
        "    (none)",
        "",
        "TEST TEST-3",
        "  required_proofs",
        "    (none)",
        "  executable_for",
        "    (none)",
        "",
        "Production symbols",
        "  SYM-a [production] covered qualifying",
        "    covered_by",
        "      TEST-1 qualifies=true reason=ok secondary=a,b",
        "       qualifies=false reason=",
        "   [unknown]  ",
        "    covered_by",
        "      (none)",
        "",
        "Structural symbols",
        "  SYM-s [unknown]  ",
        "    covered_by",
        "      (none)",
        "",
      ].join("\n"),
    );
  });

  test("renders an empty proof", () => {
    expect(renderProofExplain(projectRequirementExplain({}))).toBe(
      [
        "Proof explain for ",
        "proofVersion: ",
        "proofStatus: ",
        "proofGaps: (none)",
        "",
        "Scenarios",
        "  (none)",
        "",
        "Production symbols",
        "  (none)",
        "",
      ].join("\n"),
    );
  });

  test("renders claims without a summary, levels or reasons", () => {
    const view = projectRequirementExplain({
      id: "REQ-c",
      proofStatus: "untested",
      proofGaps: ["missing_scenario", "happy_path_only"],
      evidenceLevel: "tested",
      claimBindingRejections: [{ test: "T", claimKey: "c1", reason: "why" }],
      claimEvidence: [
        {
          claimKey: "c1",
          status: "modeled",
          applicable: true,
          notProved: "requirement_not_tested",
          bindings: [
            { test: "T", kind: "rule", binding: "asserted", scope: "unit" },
            { test: "U", kind: "fact", binding: "derived", scope: "code", reason: "r" },
          ],
        },
        { claimKey: "c2", status: "modeled", applicable: true, notProved: "other" },
      ],
      proofStages: { scenarios: { scenarios: ["S"] } },
    });
    expect(renderProofExplain(view)).toBe(
      [
        "Proof explain for REQ-c",
        "proofVersion: ",
        "proofStatus: untested",
        "proofGaps: missing_scenario, happy_path_only",
        "evidenceLevel: tested",
        "refuted: T refutes c1: why. The code breaks the claim, so it is not proved; fix the code (or, with the person who owns the rule, the requirement) and run kibi prove",
        "  happy_path_only follows from the refutation: a proof that derives the claim covers its failure side and edge cases, a refuted one covers none",
        "",
        "Claims",
        "  c1 unverified (modeled)",
        "    T rule: asserted",
        "    U fact: derived (code): r",
        "    not proved: the certificate derives the claim, but a claim is proved only once the requirement is tested end to end, and it is not (proofStatus untested): missing_scenario: the requirement has no scenario; happy_path_only: no scenario exercises the failure side",
        "  c2 unverified (modeled)",
        "",
        "Scenarios",
        "  S -> (no tests)",
        "",
        "Production symbols",
        "  (none)",
        "",
      ].join("\n"),
    );
  });

  test("renders an empty claim list, a refutation without certified gaps and an untested claim without gaps", () => {
    const empty = projectRequirementExplain({
      claimSummary: { applicable: 1, proved: 0, attested: 1, tested: 2, unresolved: 3 },
      claimEvidence: [],
    });
    expect(renderProofExplain(empty)).toContain(
      "proofGaps: (none)\n\nClaims (0/1 proved, 1 attested, 2 tested, 3 unresolved)\n  (none)\n\nScenarios\n",
    );
    const refuted = projectRequirementExplain({
      proofGaps: ["missing_scenario"],
      claimBindingRejections: [{ test: "T", claimKey: "c", reason: "r" }],
      claimEvidence: [
        { claimKey: "c", applicable: true, notProved: "requirement_not_tested" },
      ],
    });
    expect(renderProofExplain(refuted)).toContain(
      "run kibi prove\n\nClaims\n  c unverified ()\n    not proved: the certificate derives the claim, but a claim is proved only once the requirement is tested end to end, and it is not (proofStatus ): missing_scenario: the requirement has no scenario\n\nScenarios",
    );
    const noGaps = projectRequirementExplain({
      proofStatus: "tested",
      claimEvidence: [
        { claimKey: "c", applicable: true, notProved: "requirement_not_tested" },
      ],
    });
    expect(renderProofExplain(noGaps)).toContain(
      "and it is not (proofStatus tested)\n\nScenarios",
    );
  });

  test("a certified gap without a refutation adds no line", () => {
    const view = projectRequirementExplain({ proofGaps: ["happy_path_only"] });
    expect(renderProofExplain(view)).toBe(
      [
        "Proof explain for ",
        "proofVersion: ",
        "proofStatus: ",
        "proofGaps: happy_path_only",
        "",
        "Scenarios",
        "  (none)",
        "",
        "Production symbols",
        "  (none)",
        "",
      ].join("\n"),
    );
  });

  test("names both certified gaps a refutation leaves", () => {
    const view = projectRequirementExplain({
      proofGaps: ["uncovered_case", "happy_path_only"],
      claimBindingRejections: [{ test: "T", claimKey: "c", reason: "r" }],
    });
    expect(renderProofExplain(view)).toContain(
      "run kibi prove\n  uncovered_case and happy_path_only follow from the refutation",
    );
  });

  test("leaves out stages that are not required or empty", () => {
    const view = projectRequirementExplain({
      proofStages: {
        negativePath: { status: "not_required", waiver: { reason: "r" } },
        dimension: { status: "not_required", claims: [{ claimKey: "c" }] },
        cases: { status: "missing", cases: [] },
      },
    });
    expect(renderProofExplain(view)).toBe(
      [
        "Proof explain for ",
        "proofVersion: ",
        "proofStatus: ",
        "proofGaps: (none)",
        "",
        "Scenarios",
        "  (none)",
        "",
        "Production symbols",
        "  (none)",
        "",
      ].join("\n"),
    );
  });

  test("renders a failure side without a waiver, dimension rewrites and cases", () => {
    const view = projectRequirementExplain({
      proofStages: {
        negativePath: { status: "missing", negativeScenarios: ["N"] },
        dimension: {
          status: "missing",
          claims: [
            {
              claimKey: "c",
              claimText: "t",
              quantifier: "each",
              factIds: ["F1", "F2"],
              rewrites: ["rule", "count", "set"],
            },
          ],
        },
        cases: {
          status: "partial",
          cases: [
            {
              caseId: "C1",
              factId: "F",
              constraint: "x",
              predicted: "success",
              coverage: "uncovered",
              assumption: { x: 1 },
            },
            {
              caseId: "C2",
              factId: "F",
              constraint: "y",
              predicted: "rejection",
              coverage: "covered",
              scenarios: ["S"],
              waiver: { reason: "w", approvedBy: "a" },
            },
          ],
          summary: { covered: 1, uncovered: 2, unspecified: 3, waived: 4 },
        },
      },
    });
    expect(renderProofExplain(view)).toBe(
      [
        "Proof explain for ",
        "proofVersion: ",
        "proofStatus: ",
        "proofGaps: (none)",
        "",
        "Scenarios",
        "  (none)",
        "",
        "Failure side: missing",
        "  N expects rejection or error",
        "",
        "Quantified claims: missing",
        '  c (F1, F2): "each" is grounded on a boolean: t',
        "    ground it on a rule over a variable (every X with P must Q); or an integer count of what varies; or a set fact over the members",
        "",
        "Edge cases: partial (1 covered, 2 uncovered, 3 unspecified, 4 waived)",
        "  C1 F x -> success: uncovered",
        "  C2 F y -> rejection: covered by S",
        "",
        "Production symbols",
        "  (none)",
        "",
      ].join("\n"),
    );
  });
});

describe("gapReason", () => {
  test("explains every known gap and passes others through", () => {
    const view = {};
    expect(
      [
        "missing_passing_e2e",
        "missing_proof_receipt",
        "stale_proof_receipt",
        "failed_proof_receipt",
        "invalid_proof_receipt",
        "proof_contract_mismatch",
        "missing_production_symbol",
        "missing_production_symbol_coverage",
        "missing_executable_test_symbol",
        "missing_scenario",
        "missing_scenario_test",
        "happy_path_only",
        "uncovered_case",
        "something_else",
      ].map((gap) => gapReason(gap, view)),
    ).toStrictEqual([
      "missing_passing_e2e: no scenario-backed test has a passing end-to-end receipt (a test whose verification_scope is not end_to_end does not count)",
      "missing_proof_receipt: a scenario-backed test has no proof receipt yet",
      "stale_proof_receipt: a proof receipt is older than the current code",
      "failed_proof_receipt: a proof receipt records a failed run",
      "invalid_proof_receipt: a proof receipt cannot be checked",
      "proof_contract_mismatch: a proof receipt was recorded for an older proof contract",
      "missing_production_symbol: no production symbol implements the requirement",
      "missing_production_symbol_coverage: a production symbol is not covered by a qualifying end-to-end test (a test whose verification_scope is not end_to_end does not qualify)",
      "missing_executable_test_symbol: a scenario test has no test code linked executable_for",
      "missing_scenario: the requirement has no scenario",
      "missing_scenario_test: a scenario has no test",
      "happy_path_only: no scenario exercises the failure side",
      "uncovered_case: an edge case of the claim has no scenario",
      "something_else",
    ]);
  });

  test("names the drifted fingerprint components for stale and mismatched receipts", () => {
    const rows = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        test: `T${index + 1}`,
        components: ["integration", "command"],
      }));
    expect(
      gapReason("stale_proof_receipt", { fingerprintDrift: rows(4) }),
    ).toBe(
      "stale_proof_receipt: a proof receipt is older than the current code; execution fingerprint changed for T1 (integration, command), T2 (integration, command), T3 (integration, command)",
    );
    expect(
      gapReason("proof_contract_mismatch", { fingerprintDrift: rows(1) }),
    ).toBe(
      "proof_contract_mismatch: a proof receipt was recorded for an older proof contract; execution fingerprint changed for T1 (integration, command)",
    );
    expect(
      gapReason("failed_proof_receipt", { fingerprintDrift: rows(1) }),
    ).toBe("failed_proof_receipt: a proof receipt records a failed run");
    expect(gapReason("stale_proof_receipt", { fingerprintDrift: [] })).toBe(
      "stale_proof_receipt: a proof receipt is older than the current code",
    );
  });

  test("names up to three symbols without coordinates", () => {
    const tail = (count: string, verb: string, pronoun: string) =>
      `missing_symbol_coordinates: ${count}${verb} no source coordinates, so Kibi cannot tie the proof to its code (kibi sync --refresh-symbol-coordinates places ${pronoun}; kibi check says why a symbol cannot be placed)`;
    const reason = (symbols?: string[]) =>
      gapReason("missing_symbol_coordinates", { missingCoordinateSymbols: symbols });
    expect([
      reason(),
      reason([]),
      reason(["S1"]),
      reason(["S1", "S2"]),
      reason(["S1", "S2", "S3", "S4"]),
    ]).toStrictEqual([
      tail("a symbol ", "has", "it"),
      tail("a symbol ", "has", "it"),
      tail("S1 ", "has", "it"),
      tail("S1, S2 ", "have", "them"),
      tail("S1, S2, S3 ", "have", "them"),
    ]);
  });
});

describe("symbol explain", () => {
  test("projects a symbol and falls back to its id", () => {
    expect(projectSymbolExplain({ id: "SYM-z", executableTest: "true" })).toStrictEqual({
      kind: "symbol",
      id: "SYM-z",
      role: "unknown",
      executableTest: false,
      implementingRequirements: [],
      executableFor: [],
      coveredBy: [],
      proofs: [],
    });
    expect(
      projectSymbolExplain({ symbolId: "SYM-a", id: "other", proofs: [null] }),
    ).toMatchObject({ id: "SYM-a", proofs: [{ kind: "requirement", id: "" }] });
  });

  test("renders a symbol with its requirements", () => {
    const view = projectSymbolExplain({
      symbolId: "SYM-a",
      role: "production",
      executableTest: true,
      implementingRequirements: ["REQ-1", "REQ-2"],
      executableFor: ["T1", "T2"],
      coveredBy: ["T3"],
      proofs: [{ id: "REQ-1", proofStatus: "tested" }],
    });
    expect(renderProofExplain(view)).toBe(
      [
        "Proof explain for SYM-a",
        "role: production",
        "executable_test: true",
        "implementing requirements: REQ-1, REQ-2",
        "executable_for",
        "  T1",
        "  T2",
        "covered_by",
        "  T3",
        "",
        "Requirement REQ-1 (tested)",
        "Proof explain for REQ-1",
        "proofVersion: ",
        "proofStatus: tested",
        "proofGaps: (none)",
        "",
        "Scenarios",
        "  (none)",
        "",
        "Production symbols",
        "  (none)",
        "",
      ].join("\n"),
    );
  });

  test("renders an empty symbol", () => {
    expect(renderProofExplain(projectSymbolExplain({}))).toBe(
      [
        "Proof explain for ",
        "role: unknown",
        "executable_test: false",
        "implementing requirements: (none)",
        "executable_for",
        "  (none)",
        "covered_by",
        "  (none)",
        "",
      ].join("\n"),
    );
  });
});

describe("classifyExplainTarget", () => {
  test("prefers the options, then the id prefix", () => {
    expect([
      classifyExplainTarget("SYM-x", { requirement: "REQ-1" }),
      classifyExplainTarget("REQ-x", { symbol: "SYM-1" }),
      classifyExplainTarget(undefined, { symbol: "SYM-1" }),
      classifyExplainTarget("REQ-x", {}),
      classifyExplainTarget("SYM-x", {}),
      classifyExplainTarget("REQ-x", { requirement: "", symbol: "" }),
    ]).toStrictEqual([
      { kind: "requirement", id: "REQ-1" },
      { kind: "symbol", id: "SYM-1" },
      { kind: "symbol", id: "SYM-1" },
      { kind: "requirement", id: "REQ-x" },
      { kind: "symbol", id: "SYM-x" },
      { kind: "requirement", id: "REQ-x" },
    ]);
  });

  test("refuses both options, another prefix and no id", () => {
    expect([
      thrown(() => classifyExplainTarget(undefined, { requirement: "R", symbol: "S" })),
      thrown(() => classifyExplainTarget("ADR-1", {})),
      thrown(() => classifyExplainTarget("req-1", {})),
      thrown(() => classifyExplainTarget(undefined, {})),
    ]).toStrictEqual([
      {
        name: "InputError",
        message: "proof explain: choose either --requirement or --symbol, not both",
        code: "INVALID_TARGET",
        retryable: false,
      },
      {
        name: "InputError",
        message:
          "proof explain: ADR-1 is not a REQ-* or SYM-* id; pass --requirement <id> or --symbol <id> to explain an entity with another id",
        code: "INVALID_TARGET",
        retryable: false,
      },
      {
        name: "InputError",
        message:
          "proof explain: req-1 is not a REQ-* or SYM-* id; pass --requirement <id> or --symbol <id> to explain an entity with another id",
        code: "INVALID_TARGET",
        retryable: false,
      },
      {
        name: "InputError",
        message:
          "proof explain: pass a requirement or symbol id, for example kibi proof explain REQ-login (or --requirement <id> / --symbol <id>)",
        code: "INVALID_TARGET",
        retryable: false,
      },
    ]);
  });
});

type Answer = { success: boolean; bindings?: Record<string, unknown>; error?: string };

function fakeProlog(answer: (goal: string) => Answer) {
  const goals: string[] = [];
  const prolog = {
    oneShotMode: true,
    query: async (goal: string) => {
      goals.push(goal);
      const result = answer(goal);
      return { bindings: {}, ...result };
    },
  } as unknown as PrologPort;
  return { prolog, goals };
}

describe("requireExplainTarget", () => {
  test("accepts an entity of the asked-for type", async () => {
    const { prolog, goals } = fakeProlog(() => ({ success: true }));
    await requireExplainTarget(prolog, { kind: "requirement", id: "REQ-'1" });
    await requireExplainTarget(prolog, { kind: "symbol", id: "SYM-1" });
    expect(goals).toStrictEqual([
      "once(kb_entity('REQ-''1', req, _))",
      "once(kb_entity('SYM-1', symbol, _))",
    ]);
  });

  test("refuses an entity of another type", async () => {
    const { prolog, goals } = fakeProlog((goal) => ({
      success: !goal.includes(", req, "),
    }));
    expect(
      await rejected(() => requireExplainTarget(prolog, { kind: "requirement", id: "ADR-1" })),
    ).toStrictEqual({
      message:
        "proof explain: ADR-1 is not a req; proof explain covers requirements (req) and symbols",
      code: "INVALID_TARGET",
      retryable: false,
    });
    expect(goals).toStrictEqual([
      "once(kb_entity('ADR-1', req, _))",
      "once(kb_entity('ADR-1', _, _))",
    ]);
  });

  test("refuses an id the KB does not hold", async () => {
    const { prolog } = fakeProlog(() => ({ success: false }));
    expect([
      await rejected(() => requireExplainTarget(prolog, { kind: "requirement", id: "REQ-9" })),
      await rejected(() => requireExplainTarget(prolog, { kind: "symbol", id: "SYM-9" })),
    ]).toStrictEqual([
      {
        message:
          "proof explain: no req REQ-9 in the KB for this branch. Check the id with kibi query req; if its file was just written or pulled, run kibi sync first.",
        code: "ENTITY_NOT_FOUND",
        retryable: false,
      },
      {
        message:
          "proof explain: no symbol SYM-9 in the KB for this branch. Check the id with kibi query symbol; if its file was just written or pulled, run kibi sync first.",
        code: "ENTITY_NOT_FOUND",
        retryable: false,
      },
    ]);
  });
});

describe("executeProofExplain", () => {
  const CHECKED = "'2026-10-09T00:00:00.000Z', 604800";
  const context = (
    prolog: PrologPort | undefined,
    snapshot?: () => Promise<unknown>,
  ) =>
    ({
      workspaceRoot: "/nonexistent-kibi-workspace",
      signal: new AbortController().signal,
      clock: () => new Date("2026-10-09T00:00:00Z"),
      prolog,
      ...(snapshot === undefined ? {} : { git: { workspaceSnapshot: snapshot } }),
    }) as unknown as OperationContext;
  const json = (payload: unknown) => (goal: string): Answer =>
    goal.startsWith("once(")
      ? { success: true }
      : { success: true, bindings: { JsonString: JSON.stringify(payload) } };
  const moduleGoal = (goal: string) =>
    /^\(use_module\('[^']*\/discovery\.pl'\), (.*)\)$/.exec(goal)?.[1];

  test("runs the requirement query with the workspace snapshot", async () => {
    process.env.KIBI_PROOF_BINDING_MODE = "strict-snapshot";
    const { prolog, goals } = fakeProlog(json({ proofStatus: "tested", id: "x" }));
    const result = await executeProofExplain(
      { kind: "requirement", id: "REQ-1" },
      context(prolog, async () => ({ hash: "abc" })),
    );
    expect(result.payload).toStrictEqual({ id: "x", proofStatus: "tested" });
    expect(result.view).toStrictEqual(projectRequirementExplain(result.payload));
    expect(goals.map((goal) => moduleGoal(goal) ?? goal)).toStrictEqual([
      "once(kb_entity('REQ-1', req, _))",
      `discovery:requirement_proof_json('REQ-1', strict_snapshot, _{}, 'abc', ${CHECKED}, JsonString)`,
    ]);
  });

  test("runs the symbol query with per-contract bindings", async () => {
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
    spies.push(
      spyOn(reporting, "perContractTestBindings").mockResolvedValue("_{'T': h}"),
    );
    const { prolog, goals } = fakeProlog(json({ symbolId: "SYM-1", role: "production" }));
    const result = await executeProofExplain(
      { kind: "symbol", id: "SYM-1" },
      context(prolog),
    );
    expect(result.payload).toStrictEqual({ symbolId: "SYM-1", role: "production" });
    expect(result.view).toStrictEqual(projectSymbolExplain(result.payload));
    expect(goals.map((goal) => moduleGoal(goal) ?? goal)).toStrictEqual([
      "once(kb_entity('SYM-1', symbol, _))",
      `discovery:symbol_proof_json('SYM-1', per_contract, _{'T': h}, 'unknown', ${CHECKED}, JsonString)`,
    ]);
  });

  test("labels a failed proof query", async () => {
    process.env.KIBI_PROOF_BINDING_MODE = "strict-snapshot";
    const { prolog } = fakeProlog((goal) =>
      goal.startsWith("once(") ? { success: true } : { success: false, error: "boom" },
    );
    expect([
      await rejected(() =>
        executeProofExplain({ kind: "requirement", id: "REQ-1" }, context(prolog)),
      ),
      await rejected(() =>
        executeProofExplain({ kind: "symbol", id: "SYM-1" }, context(prolog)),
      ),
    ]).toStrictEqual([
      { message: "Proof explain query failed: boom", code: undefined, retryable: undefined },
      { message: "Proof explain query failed: boom", code: undefined, retryable: undefined },
    ]);
  });

  test("requires a Prolog runtime", async () => {
    process.env.KIBI_PROOF_BINDING_MODE = "strict-snapshot";
    expect(
      await rejected(() =>
        executeProofExplain({ kind: "requirement", id: "REQ-1" }, context(undefined)),
      ),
    ).toStrictEqual({
      message: "Proof explain requires a Prolog runtime",
      code: "PROLOG_UNAVAILABLE",
      retryable: true,
    });
  });
});
