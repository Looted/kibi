import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EVIDENCE_FLOOR_RULE,
  EVIDENCE_FLOOR_SCHEMA_VERSION,
  type EvidenceFloorRow,
  collectEvidenceFloorViolations,
  evidenceFloorViolations,
  gapDetailLines,
  readEvidenceFloorRows,
  refutationText,
} from "../../../src/public/operations/evidence-floor.js";
import type {
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import * as reporting from "../../../src/public/operations/specs/reporting.js";
import * as manifest from "../../../src/utils/kb-manifest.js";

const spies: Array<{ mockRestore: () => void }> = [];
const roots: string[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const base: EvidenceFloorRow = {
  id: "REQ-A",
  evidenceLevel: "asserted",
  requiredEvidence: "tested",
  requiredEvidenceSource: "firmness",
  status: "below",
  proofStatus: "missing",
  proofGaps: [],
};
const row = (overrides: Partial<EvidenceFloorRow>): EvidenceFloorRow => ({
  ...base,
  ...overrides,
});

const PROVED_TAIL =
  ": model each as a set fact (prove it with exhaustive or typecheck), a numeric fact (arithmetic or smt), a rule, predicate or set fact about a predicate (rule or state_machine) or a string fact (regex), name it in a certificate test's proof_contract.proves, and run kibi prove; kibi proof explain REQ-A shows each claim's bindings. A claim with no such fact can only be attested, so lower required_evidence to tested with the reason in the requirement if that is enough.";

describe("constants", () => {
  test("rule name and schema version", () => {
    expect(EVIDENCE_FLOOR_RULE).toBe("evidence-floor");
    expect(EVIDENCE_FLOOR_SCHEMA_VERSION).toBe(11);
  });
});

describe("gapDetailLines", () => {
  test("labels every known gap list", () => {
    expect(
      gapDetailLines(
        row({
          gapDetails: {
            failedReceiptTests: ["a"],
            missingReceiptTests: ["b"],
            staleReceiptTests: ["c"],
            invalidReceiptTests: ["d"],
            contractMismatchReceiptTests: ["e"],
            uncoveredSymbols: ["f"],
            missingCoordinateSymbols: ["g"],
            unprovedClaims: ["h"],
            other: ["i"],
            empty: [],
          },
        }),
      ),
    ).toStrictEqual([
      "failing receipts: a",
      "no receipt: b",
      "stale receipts: c",
      "invalid receipts: d",
      "receipts for an older contract: e",
      "production symbols without qualifying coverage: f",
      "symbols without source coordinates: g",
      "claims no certificate derives: h",
      "other: i",
    ]);
  });

  test("shows eight ids and counts the rest", () => {
    const ids = (count: number) =>
      Array.from({ length: count }, (_, index) => `T${index}`);
    expect(
      gapDetailLines(row({ gapDetails: { a: ids(8), b: ids(9) } })),
    ).toStrictEqual([
      "a: T0, T1, T2, T3, T4, T5, T6, T7",
      "b: T0, T1, T2, T3, T4, T5, T6, T7 (+1 more)",
    ]);
    expect(gapDetailLines(base)).toStrictEqual([]);
  });
});

describe("refutationText", () => {
  test("joins every refutation", () => {
    expect(refutationText(base)).toBeUndefined();
    expect(refutationText(row({ refutations: [] }))).toBeUndefined();
    expect(
      refutationText(
        row({
          refutations: [
            { test: "T1", claimKey: "c1", reason: "r1" },
            { test: "T2", claimKey: "c2", reason: "r2" },
          ],
        }),
      ),
    ).toBe("T1 refutes c1: r1; T2 refutes c2: r2");
  });
});

describe("evidenceFloorViolations", () => {
  test("builds the whole finding for each floor source", () => {
    expect(
      evidenceFloorViolations([
        row({ requiredEvidenceSource: "explicit", proofGaps: ["g1", "g2"] }),
        row({ id: "REQ-B", requiredEvidence: "approved" }),
      ]),
    ).toStrictEqual([
      {
        rule: "evidence-floor",
        entityId: "REQ-A",
        description:
          "REQ-A is asserted but needs tested (its required_evidence)",
        suggestion:
          "Link REQ-A to a scenario with an end-to-end test that has a proof contract, run kibi prove, and fix its proof gaps (g1, g2); kibi proof explain REQ-A shows each one. Or lower required_evidence if a person decides it does not need tests.",
        evidence: {
          evidenceLevel: "asserted",
          requiredEvidence: "tested",
          requiredEvidenceSource: "explicit",
          status: "below",
          proofStatus: "missing",
          proofGaps: ["g1", "g2"],
        },
      },
      {
        rule: "evidence-floor",
        entityId: "REQ-B",
        description: "REQ-B is asserted but needs approved (its floor)",
        suggestion:
          "Have a person approve REQ-B (origin.approved_by) or state it as firm with origin.ref to their words, or lower required_evidence.",
        evidence: {
          evidenceLevel: "asserted",
          requiredEvidence: "approved",
          requiredEvidenceSource: "firmness",
          status: "below",
          proofStatus: "missing",
          proofGaps: [],
        },
      },
    ]);
  });

  test("names a firm requirement's floor, gap details and no listed gaps", () => {
    const [finding] = evidenceFloorViolations([
      row({
        gapDetails: { missingReceiptTests: ["T1"], unprovedClaims: ["c"] },
      }),
    ]);
    expect(finding?.description).toBe(
      "REQ-A is asserted but needs tested (the floor of a firm requirement)",
    );
    expect(finding?.suggestion).toBe(
      "Link REQ-A to a scenario with an end-to-end test that has a proof contract, run kibi prove, and fix its proof gaps (none listed; no receipt: T1; claims no certificate derives: c); kibi proof explain REQ-A shows each one. Or lower required_evidence if a person decides it does not need tests.",
    );
    expect(finding?.evidence).toStrictEqual({
      evidenceLevel: "asserted",
      requiredEvidence: "tested",
      requiredEvidenceSource: "firmness",
      status: "below",
      proofStatus: "missing",
      proofGaps: [],
      gapDetails: { missingReceiptTests: ["T1"], unprovedClaims: ["c"] },
    });
    expect(
      evidenceFloorViolations([row({ gapDetails: { a: [] } })])[0]?.suggestion,
    ).toBe(
      "Link REQ-A to a scenario with an end-to-end test that has a proof contract, run kibi prove, and fix its proof gaps (none listed); kibi proof explain REQ-A shows each one. Or lower required_evidence if a person decides it does not need tests.",
    );
  });

  test("asks for proofs of unproved claims", () => {
    const proved = (gapDetails?: Record<string, string[]>) =>
      evidenceFloorViolations([
        row({
          requiredEvidence: "proved",
          ...(gapDetails ? { gapDetails } : {}),
        }),
      ])[0];
    expect(proved()?.description).toBe(
      "REQ-A is asserted but needs proved (its floor)",
    );
    expect(proved()?.suggestion).toBe(
      `Prove every applicable claim of REQ-A${PROVED_TAIL}`,
    );
    expect(proved({ other: ["x"] })?.suggestion).toBe(
      `Prove every applicable claim of REQ-A${PROVED_TAIL}`,
    );
    expect(proved({ unprovedClaims: ["c1", "c2"] })?.suggestion).toBe(
      `Prove every applicable claim of REQ-A (unproved: c1, c2)${PROVED_TAIL}`,
    );
  });

  test("names refuted claims and the gaps they leave", () => {
    const refutations = [{ test: "T1", claimKey: "c1", reason: "r1" }];
    const refuted = (proofGaps: string[]) =>
      evidenceFloorViolations([row({ proofGaps, refutations })])[0];
    const lead =
      "The code breaks a claim of REQ-A (T1 refutes c1: r1). Fix the code so it keeps the claim, or, with the person who owns the rule, change the requirement, then run kibi prove";
    const tail = ". kibi proof explain REQ-A shows each claim's bindings.";
    expect(refuted(["other"])?.suggestion).toBe(`${lead}${tail}`);
    expect(refuted(["other", "uncovered_case"])?.suggestion).toBe(
      `${lead}; uncovered_case clears once the proof derives the claim${tail}`,
    );
    expect(refuted(["happy_path_only", "uncovered_case"])?.suggestion).toBe(
      `${lead}; happy_path_only and uncovered_case clear once the proof derives the claim${tail}`,
    );
    expect(refuted([])?.description).toBe(
      "REQ-A is asserted but needs tested (the floor of a firm requirement); its proof refutes a claim: T1 refutes c1: r1",
    );
    expect(refuted([])?.evidence).toStrictEqual({
      evidenceLevel: "asserted",
      requiredEvidence: "tested",
      requiredEvidenceSource: "firmness",
      status: "below",
      proofStatus: "missing",
      proofGaps: [],
      refutations,
    });
    expect(
      evidenceFloorViolations([row({ refutations: [] })])[0]?.evidence,
    ).toStrictEqual({
      evidenceLevel: "asserted",
      requiredEvidence: "tested",
      requiredEvidenceSource: "firmness",
      status: "below",
      proofStatus: "missing",
      proofGaps: [],
    });
  });

  test("pending re-proof counts only with fresh evidence", () => {
    const pending = row({ status: "pending_reproof" });
    expect(evidenceFloorViolations([pending])).toStrictEqual([]);
    expect(
      evidenceFloorViolations([pending], { freshEvidence: false }),
    ).toStrictEqual([]);
    const [finding] = evidenceFloorViolations([pending], {
      freshEvidence: true,
    });
    expect(finding?.description).toBe(
      "REQ-A is asserted but needs tested (the floor of a firm requirement); its receipts are older than the code",
    );
    expect(finding?.suggestion).toBe(
      "Run kibi prove for the tests behind REQ-A so its receipts match the current code, then rerun kibi check --fresh-evidence.",
    );
  });
});

type Answer = {
  success: boolean;
  bindings: Record<string, unknown>;
  error?: string;
};

function fakeProlog(answer: Answer): PrologPort & { goals: string[] } {
  const goals: string[] = [];
  return {
    goals,
    oneShotMode: true,
    query: async (goal: string) => {
      goals.push(goal);
      return answer;
    },
  } as unknown as PrologPort & { goals: string[] };
}

const rowsAnswer = (rows?: unknown): Answer => ({
  success: true,
  bindings: {
    JsonString: JSON.stringify(
      rows === undefined ? { evaluated: 0 } : { rows },
    ),
  },
});

function context(extra: Partial<OperationContext>): OperationContext {
  const root = mkdtempSync(join(tmpdir(), "kibi-evidence-floor-mut-"));
  roots.push(root);
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-01-02T03:04:05.000Z"),
    ...extra,
  } as OperationContext;
}

const CLEAN = {
  available: true,
  snapshot: { hash: "abc", dirty: false },
} as never;

function bindings(value: string | null) {
  spies.push(
    spyOn(reporting, "perContractTestBindings").mockResolvedValue(value),
  );
}

const goalFor = (mode: string, snapshot: string, at: string) =>
  `discovery:evidence_floor_json(${mode}, '${snapshot}', '${at}', 604800, JsonString)`;

describe("readEvidenceFloorRows", () => {
  test("returns nothing without an engine", async () => {
    expect(await readEvidenceFloorRows(context({}), CLEAN)).toStrictEqual([]);
    expect(
      await readEvidenceFloorRows(
        context({ ensureProlog: async () => undefined } as never),
        CLEAN,
      ),
    ).toStrictEqual([]);
  });

  test("asks discovery.pl with the snapshot, instant and bindings", async () => {
    bindings(null);
    const prolog = fakeProlog(rowsAnswer([base]));
    expect(
      await readEvidenceFloorRows(context({ prolog }), CLEAN),
    ).toStrictEqual([base]);
    const [goal] = prolog.goals;
    expect(goal).toEndWith(
      `discovery.pl'), ${goalFor("strict_snapshot, _{}", "abc", "2026-01-02T03:04:05.000Z")})`,
    );
    expect(goal).toStartWith("(use_module('");
  });

  test("opens the engine on demand and passes per-contract bindings", async () => {
    bindings("_{t: h}");
    const prolog = fakeProlog(rowsAnswer());
    const opened = context({ ensureProlog: async () => prolog } as never);
    expect(
      await readEvidenceFloorRows(
        opened,
        { available: false, error: "x" } as never,
        "then",
      ),
    ).toStrictEqual([]);
    expect(prolog.goals[0]).toEndWith(
      `discovery.pl'), ${goalFor("per_contract, _{t: h}", "unknown", "then")})`,
    );
    const [[seen]] = (
      reporting.perContractTestBindings as unknown as {
        mock: { calls: [OperationContext][] };
      }
    ).mock.calls as [[OperationContext]];
    expect(seen.prolog).toBe(prolog);
    expect(seen.workspaceRoot).toBe(opened.workspaceRoot);
  });

  test("names the evaluation when the engine fails", async () => {
    bindings(null);
    await expect(
      readEvidenceFloorRows(
        context({
          prolog: fakeProlog({ success: false, bindings: {}, error: "boom" }),
        }),
        CLEAN,
      ),
    ).rejects.toThrow(/^Evidence floor evaluation query failed: boom$/);
  });

  test("reads the workspace snapshot when none is given", async () => {
    bindings(null);
    const prolog = fakeProlog(rowsAnswer([]));
    await readEvidenceFloorRows(context({ prolog }));
    expect(prolog.goals[0]).toContain(
      goalFor("strict_snapshot, _{}", "unknown", "2026-01-02T03:04:05.000Z"),
    );
  });
});

describe("collectEvidenceFloorViolations", () => {
  const RULES = new Set(["evidence-floor"]);
  const schema = (version: number | null) =>
    spies.push(
      spyOn(manifest, "readKbManifest").mockReturnValue(
        (version === null ? null : { schemaVersion: version }) as never,
      ),
    );

  test("needs the rule, an attached engine and schema 11", async () => {
    bindings(null);
    const prolog = fakeProlog(rowsAnswer([base]));
    schema(11);
    expect(
      await collectEvidenceFloorViolations(context({ prolog }), new Set(), {
        snapshotEvidence: CLEAN,
      }),
    ).toStrictEqual([]);
    expect(
      await collectEvidenceFloorViolations(
        context({ ensureProlog: async () => prolog } as never),
        RULES,
        { snapshotEvidence: CLEAN },
      ),
    ).toStrictEqual([]);
    expect(prolog.goals).toStrictEqual([]);
    expect(
      (
        await collectEvidenceFloorViolations(context({ prolog }), RULES, {
          snapshotEvidence: CLEAN,
        })
      ).map((finding) => finding.entityId),
    ).toStrictEqual(["REQ-A"]);
  });

  test("an older or missing schema is not judged", async () => {
    bindings(null);
    const prolog = fakeProlog(rowsAnswer([base]));
    for (const version of [10, null]) {
      for (const spy of spies.splice(1)) spy.mockRestore();
      schema(version);
      expect(
        await collectEvidenceFloorViolations(context({ prolog }), RULES, {
          snapshotEvidence: CLEAN,
        }),
      ).toStrictEqual([]);
    }
    expect(prolog.goals).toStrictEqual([]);
  });

  test("reads a real manifest-less workspace as unjudged", async () => {
    const prolog = fakeProlog(rowsAnswer([base]));
    expect(
      await collectEvidenceFloorViolations(context({ prolog }), RULES, {
        snapshotEvidence: CLEAN,
      }),
    ).toStrictEqual([]);
  });

  test("a dirty snapshot matters only with fresh evidence", async () => {
    bindings(null);
    schema(12);
    const prolog = fakeProlog(rowsAnswer([]));
    const dirty = {
      available: true,
      snapshot: { hash: "abc", dirty: true },
    } as never;
    expect(
      await collectEvidenceFloorViolations(context({ prolog }), RULES, {
        snapshotEvidence: dirty,
        checkedAt: "at",
      }),
    ).toStrictEqual([]);
    expect(prolog.goals[0]).toContain(
      goalFor("strict_snapshot, _{}", "abc", "at"),
    );
    expect(
      (
        await collectEvidenceFloorViolations(context({ prolog }), RULES, {
          snapshotEvidence: dirty,
          freshEvidence: true,
        })
      ).map((finding) => finding.entityId),
    ).toStrictEqual(["proof-snapshot"]);
  });

  test("reads the workspace snapshot when none is given", async () => {
    bindings(null);
    schema(11);
    const prolog = fakeProlog(rowsAnswer([]));
    expect(
      (
        await collectEvidenceFloorViolations(context({ prolog }), RULES, {
          freshEvidence: true,
        })
      )[0]?.description,
    ).toStartWith(
      "--fresh-evidence needs a proof snapshot, but none is available: ",
    );
  });
});
