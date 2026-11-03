import { afterEach, describe, expect, test } from "bun:test";
import {
  classifyExplainTarget,
  executeProofExplain,
  projectRequirementExplain,
  projectSymbolExplain,
  renderProofExplain,
} from "../../../src/operations/proof/explain.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

const savedMode = process.env.KIBI_PROOF_BINDING_MODE;
afterEach(() => {
  if (savedMode === undefined)
    Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
  else process.env.KIBI_PROOF_BINDING_MODE = savedMode;
});

const proof = {
  id: "REQ-a",
  proofVersion: "v3",
  proofStatus: "untested",
  proofGaps: ["happy_path_only", "uncovered_case"],
  evidenceLevel: "tested",
  certificateRejections: [{ test: "TEST-1", reason: "no certificate" }, "junk"],
  claimBindingRejections: [
    { test: "TEST-1", claimKey: "c1", reason: "limit is 7" },
  ],
  claimSummary: { applicable: 2, proved: 1 },
  claimEvidence: [
    {
      claimKey: "c1",
      status: "modeled",
      applicable: true,
      level: "tested",
      blocker: "TEST-1",
      notProved: "requirement_not_tested",
      bindings: [
        { test: "TEST-1", kind: "rule", binding: "derived", scope: "code", reason: "ok" },
      ],
    },
    { claimKey: "c2", status: "nonlogical", applicable: false },
  ],
  proofStages: {
    negativePath: {
      status: "missing",
      negativeScenarios: ["SCEN-neg"],
      claims: ["c1"],
      suggestedNegatives: [
        { claimKey: "c1", factId: "FACT-1", assumption: { limit: 9 } },
      ],
      waiver: { reason: "accepted risk" },
    },
    dimension: {
      status: "missing",
      claims: [
        {
          claimKey: "c1",
          claimText: "every user can log in",
          quantifier: "for_all",
          factIds: ["FACT-1"],
          rewrites: ["bound", "custom rewrite"],
          waiver: { reason: "pending" },
        },
        {
          claimKey: "c3",
          claimText: "x",
          quantifier: "some",
          factIds: [],
          rewrites: [],
        },
      ],
      waivedClaims: [
        { claimKey: "c4", waiver: { reason: "fine", approvedBy: "alice" } },
        { claimKey: "c5" },
      ],
    },
    cases: {
      status: "missing",
      cases: [
        {
          caseId: "CASE-1",
          claimKey: "c1",
          factId: "FACT-1",
          generator: "boundary",
          constraint: "limit <= 5",
          predicted: "rejection",
          coverage: "uncovered",
          scenarios: [],
          assumption: { limit: 6 },
          waiver: { reason: "later" },
        },
        {
          caseId: "CASE-2",
          factId: "FACT-1",
          constraint: "limit <= 5",
          predicted: "acceptance",
          coverage: "covered",
          scenarios: ["SCEN-1", "SCEN-2"],
          waiver: { reason: "done", approvedBy: "bob" },
        },
      ],
      summary: { covered: 1, uncovered: 1, note: "text" },
      limitReached: true,
    },
  },
};

describe("requirement explain", () => {
  test("projects and renders every stage", () => {
    const view = projectRequirementExplain(proof);
    expect(view.certificateRejections).toStrictEqual([
      { test: "TEST-1", reason: "no certificate" },
      { test: "", reason: "" },
    ]);
    expect(view.negativePath).toStrictEqual({
      status: "missing",
      negativeScenarios: ["SCEN-neg"],
      claims: ["c1"],
      suggestedNegatives: [
        { claimKey: "c1", factId: "FACT-1", assumption: { limit: 9 } },
      ],
      waiver: { reason: "accepted risk" },
    });
    expect(view.cases?.summary).toStrictEqual({ covered: 1, uncovered: 1 });
    expect(view.cases?.limitReached).toBe(true);
    expect(view.dimension?.waivedClaims[0]?.waiver).toStrictEqual({
      reason: "fine",
      approvedBy: "alice",
    });
    expect(renderProofExplain(view)).toBe(
      [
        "Proof explain for REQ-a",
        "proofVersion: v3",
        "proofStatus: untested",
        "proofGaps: happy_path_only, uncovered_case",
        "evidenceLevel: tested",
        "certificate rejected for TEST-1: no certificate",
        "certificate rejected for : ",
        "refuted: TEST-1 refutes c1: limit is 7. The code breaks the claim, so it is not proved; fix the code (or, with the person who owns the rule, the requirement) and run kibi prove",
        "  happy_path_only and uncovered_case follow from the refutation: a proof that derives the claim covers its failure side and edge cases, a refuted one covers none",
        "",
        "Claims (1/2 proved, 0 attested, 0 tested, 0 unresolved)",
        "  c1 tested (modeled) blocked by TEST-1",
        "    TEST-1 rule: derived (code): ok",
        "    not proved: the certificate derives the claim, but a claim is proved only once the requirement is tested end to end, and it is not (proofStatus untested): happy_path_only: no scenario exercises the failure side; uncovered_case: an edge case of the claim has no scenario",
        "  c2 not applicable (nonlogical)",
        "",
        "Scenarios",
        "  (none)",
        "",
        "Failure side: missing",
        "  waiver awaiting approval (set failure_side_waiver_approved_by to the person who accepts it, in this pull request): accepted risk",
        "  SCEN-neg expects rejection or error",
        '  c1 (FACT-1): assume {"limit":9} and expect rejection',
        "",
        "Quantified claims: missing",
        '  c1 (FACT-1): "for all" is grounded on a boolean: every user can log in',
        "    ground it on an integer property with the bound (lte, gte or eq); or custom rewrite",
        "    waiver awaiting approval (set dimension_waiver_approved_by to the person who accepts it, in this pull request): pending",
        '  c3 (): "some" is grounded on a boolean: x',
        "  c4 waived by alice: fine",
        "  c5 waived by : ",
        "",
        "Edge cases: missing (1 covered, 1 uncovered, 0 unspecified, 0 waived)",
        "  CASE-1 FACT-1 limit <= 5 -> rejection: uncovered",
        '    add a scenario that assumes {"limit":6} and expects rejection',
        "    waiver awaiting approval (set case_waiver_approved_by to the person who accepts it, in this pull request): later",
        "  CASE-2 FACT-1 limit <= 5 -> acceptance: covered by SCEN-1, SCEN-2",
        "  (some facts have more cases than the per-fact limit of 12)",
        "",
        "Production symbols",
        "  (none)",
        "",
      ].join("\n"),
    );
  });

  test("renders an approved failure-side waiver and leaves out empty stages", () => {
    const view = projectRequirementExplain({
      id: "REQ-b",
      proofStages: {
        negativePath: {
          status: "waived",
          waiver: { reason: "ok", approvedBy: "carol" },
        },
        dimension: { status: "not_required", claims: "none" },
        cases: { status: "missing", cases: "none" },
      },
    });
    expect(view.dimension).toStrictEqual({
      status: "not_required",
      claims: [],
      waivedClaims: [],
    });
    expect(view.cases?.cases).toStrictEqual([]);
    expect(view.negativePath?.suggestedNegatives).toStrictEqual([]);
    const text = renderProofExplain(view);
    expect(text).toContain("Failure side: waived\n  waived by carol: ok\n");
    expect(text).not.toContain("Quantified claims");
    expect(text).not.toContain("Edge cases");
  });

  test("renders edge cases without a limit note", () => {
    const text = renderProofExplain(
      projectRequirementExplain({
        id: "REQ-c",
        proofStages: {
          cases: {
            status: "covered",
            cases: [
              {
                caseId: "CASE-1",
                factId: "F",
                constraint: "c",
                predicted: "rejection",
                coverage: "covered",
                scenarios: ["S"],
              },
            ],
          },
        },
      }),
    );
    expect(text).toContain(
      "Edge cases: covered (0 covered, 0 uncovered, 0 unspecified, 0 waived)\n  CASE-1 F c -> rejection: covered by S\n\n",
    );
  });
});

describe("executeProofExplain", () => {
  const context = (answers: Record<string, unknown>) =>
    ({
      workspaceRoot: "/nonexistent-kibi-workspace",
      signal: new AbortController().signal,
      clock: () => new Date("2026-10-09T00:00:00Z"),
      prolog: {
        oneShotMode: true,
        query: async (goal: string) => {
          if (goal.startsWith("once(kb_entity("))
            return { success: true, bindings: {} };
          const key = goal.includes("requirement_proof_json")
            ? "requirement"
            : "symbol";
          return {
            success: true,
            bindings: { JsonString: JSON.stringify(answers[key]) },
          };
        },
      },
    }) as unknown as OperationContext;

  test("runs the requirement and symbol proof queries", async () => {
    process.env.KIBI_PROOF_BINDING_MODE = "strict-snapshot";
    const ctx = context({
      requirement: { proofStatus: "tested" },
      symbol: { symbolId: "SYM-a", role: "production", proofs: [{ id: "REQ-a" }] },
    });
    const requirement = await executeProofExplain(
      { kind: "requirement", id: "REQ-a" },
      ctx,
    );
    expect(requirement.payload).toStrictEqual({ id: "REQ-a", proofStatus: "tested" });
    expect(requirement.view.kind).toBe("requirement");
    const symbol = await executeProofExplain({ kind: "symbol", id: "SYM-a" }, ctx);
    expect(symbol.view).toStrictEqual(
      projectSymbolExplain({
        symbolId: "SYM-a",
        role: "production",
        proofs: [{ id: "REQ-a" }],
      }),
    );
    expect(symbol.view.kind).toBe("symbol");
  });
});

describe("classifyExplainTarget", () => {
  test("names an id of another kind and a missing id", () => {
    expect(() => classifyExplainTarget("ADR-1", {})).toThrow(
      "proof explain: ADR-1 is not a REQ-* or SYM-* id; pass --requirement <id> or --symbol <id> to explain an entity with another id",
    );
    expect(() => classifyExplainTarget(undefined, {})).toThrow(
      "proof explain: pass a requirement or symbol id, for example kibi proof explain REQ-login (or --requirement <id> / --symbol <id>)",
    );
  });
});
