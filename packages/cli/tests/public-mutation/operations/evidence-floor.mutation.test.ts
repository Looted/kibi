import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { join } from "node:path";
import {
  AGENT_REQUIREMENT_UNAPPROVED_IMPLEMENTED_RULE,
  EVIDENCE_FLOOR_RULE,
  EVIDENCE_FLOOR_SCHEMA_VERSION,
  type EvidenceFloorRow,
  UNAPPROVED_IMPLEMENTED_GRACE_DAYS,
  type UnapprovedImplementedRow,
  approvalClock,
  authoredCreatedAtReader,
  collectEvidenceFloorViolations,
  evidenceFloorViolations,
  gapDetailLines,
  pastApprovalGrace,
  readEvidenceFloorRows,
  refutationText,
  unapprovedImplementedViolations,
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

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-approval-clock-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  return root;
}

function requirement(id: string, frontmatter = ""): string {
  return `---\nid: ${id}\ntitle: ${id} title\ntype: req\nstatus: open\n${frontmatter}---\n\nThe system must keep ${id} true.\n`;
}

describe("agent-requirement-unapproved-implemented", () => {
  test("grace period is fourteen days", () => {
    expect(UNAPPROVED_IMPLEMENTED_GRACE_DAYS).toBe(14);
    expect(AGENT_REQUIREMENT_UNAPPROVED_IMPLEMENTED_RULE).toBe(
      "agent-requirement-unapproved-implemented",
    );
  });

  test("an approval floor finding names the approval", () => {
    expect(
      evidenceFloorViolations([row({ requiredEvidenceSource: "approval" })])[0]
        ?.description,
    ).toBe(
      "REQ-A is asserted but needs tested (the floor of an approved requirement)",
    );
  });

  const payload = (unapprovedImplemented?: unknown): Answer => ({
    success: true,
    bindings: {
      JsonString: JSON.stringify({
        rows: [
          { ...base, id: "REQ-APPROVED", requiredEvidenceSource: "approval" },
          { ...base, id: "REQ-FIRM" },
        ],
        ...(unapprovedImplemented === undefined
          ? {}
          : { unapprovedImplemented }),
      }),
    },
  });
  const OLD_ROW = {
    id: "REQ-OLD",
    recordedAt: "2025-01-01T00:00:00Z",
    source: "",
    symbols: ["SYM-A"],
  };
  const judge = async (
    version: number,
    rules: string[],
    answer: Answer = payload([OLD_ROW]),
    freshEvidence = false,
  ) => {
    bindings(null);
    spies.push(
      spyOn(manifest, "readKbManifest").mockReturnValue({
        schemaVersion: version,
      } as never),
    );
    const found = await collectEvidenceFloorViolations(
      context({ prolog: fakeProlog(answer) }),
      new Set(rules),
      { snapshotEvidence: CLEAN, freshEvidence },
    );
    for (const spy of spies.splice(0)) spy.mockRestore();
    return found.map((finding) => `${finding.rule}:${finding.entityId}`);
  };
  const BOTH = [
    EVIDENCE_FLOOR_RULE,
    AGENT_REQUIREMENT_UNAPPROVED_IMPLEMENTED_RULE,
  ];

  test("from schema 15 the approval floor and the rule apply; before it neither does", async () => {
    expect(await judge(15, BOTH)).toStrictEqual([
      "evidence-floor:REQ-APPROVED",
      "evidence-floor:REQ-FIRM",
      "agent-requirement-unapproved-implemented:REQ-OLD",
    ]);
    expect(await judge(16, BOTH)).toHaveLength(3);
    expect(await judge(14, BOTH)).toStrictEqual(["evidence-floor:REQ-FIRM"]);
  });

  test("each rule runs only when selected", async () => {
    expect(
      await judge(15, [AGENT_REQUIREMENT_UNAPPROVED_IMPLEMENTED_RULE]),
    ).toStrictEqual(["agent-requirement-unapproved-implemented:REQ-OLD"]);
    expect(await judge(15, [EVIDENCE_FLOOR_RULE])).toStrictEqual([
      "evidence-floor:REQ-APPROVED",
      "evidence-floor:REQ-FIRM",
    ]);
  });

  test("a payload without rows or review rows judges nothing", async () => {
    expect(
      await judge(
        15,
        BOTH,
        {
          success: true,
          bindings: { JsonString: JSON.stringify({ evaluated: 0 }) },
        },
        true,
      ),
    ).toStrictEqual([]);
    expect(await judge(15, BOTH, payload())).toStrictEqual([
      "evidence-floor:REQ-APPROVED",
      "evidence-floor:REQ-FIRM",
    ]);
  });

  test("the rule reads the created_at of the requirement's own document", async () => {
    bindings(null);
    spies.push(
      spyOn(manifest, "readKbManifest").mockReturnValue({
        schemaVersion: 15,
      } as never),
    );
    const ctx = context({
      prolog: fakeProlog(
        payload([
          { ...OLD_ROW, id: "REQ-DOC", recordedAt: "", source: "r.md" },
        ]),
      ),
    });
    writeFileSync(
      join(ctx.workspaceRoot, "r.md"),
      requirement("REQ-DOC", "created_at: 2026-01-01T00:00:00Z\n"),
    );
    expect(
      (
        await collectEvidenceFloorViolations(
          ctx,
          new Set([AGENT_REQUIREMENT_UNAPPROVED_IMPLEMENTED_RULE]),
          { snapshotEvidence: CLEAN },
        )
      ).map((finding) => finding.entityId),
    ).toStrictEqual([]);
  });

  test("the approval grace period counts from its start, and no date counts as past it", () => {
    expect(
      pastApprovalGrace("2026-01-01T00:00:00Z", "2026-01-15T00:00:01Z"),
    ).toBe(true);
    expect(
      pastApprovalGrace("2026-01-01T00:00:00Z", "2026-01-15T00:00:00Z"),
    ).toBe(false);
    expect(pastApprovalGrace("", "2026-01-14T00:00:00Z")).toBe(true);
    expect(pastApprovalGrace("2026-01-01T00:00:00Z", "")).toBe(true);
  });

  const unapproved = (
    overrides: Partial<UnapprovedImplementedRow>,
  ): UnapprovedImplementedRow => ({
    id: "REQ-X",
    recordedAt: "",
    source: ".kb/requirements/REQ-X.md",
    symbols: ["SYM-A"],
    ...overrides,
  });

  test("the approval clock reads origin.recorded_at, else the document's created_at, else nothing", () => {
    const read: string[] = [];
    const createdAtOf = (source: string) => {
      read.push(source);
      return "2026-01-05T00:00:00.000Z";
    };
    expect(
      approvalClock(
        unapproved({ recordedAt: "2026-01-02T00:00:00Z" }),
        createdAtOf,
      ),
    ).toEqual({ since: "2026-01-02T00:00:00Z", field: "origin.recorded_at" });
    expect(read).toEqual([]);
    expect(approvalClock(unapproved({}), createdAtOf)).toEqual({
      since: "2026-01-05T00:00:00.000Z",
      field: "created_at",
    });
    expect(read).toEqual([".kb/requirements/REQ-X.md"]);
    expect(approvalClock(unapproved({}), () => undefined)).toEqual({
      since: "",
      field: "none",
    });
  });

  test("each finding names where its clock started", () => {
    const at = "2026-03-01T00:00:00Z";
    const [recorded] = unapprovedImplementedViolations(
      [unapproved({ recordedAt: "2026-01-02T00:00:00Z" })],
      at,
    );
    expect(recorded?.description).toContain(
      "since it was recorded at 2026-01-02T00:00:00Z;",
    );
    expect(recorded?.evidence).toEqual({
      since: "2026-01-02T00:00:00Z",
      sinceField: "origin.recorded_at",
      symbols: ["SYM-A"],
      graceDays: 14,
    });
    const [created] = unapprovedImplementedViolations(
      [unapproved({})],
      at,
      () => "2026-01-03T00:00:00Z",
    );
    expect(created?.description).toContain(
      "since its created_at 2026-01-03T00:00:00Z;",
    );
    expect(created?.evidence).toMatchObject({ sinceField: "created_at" });
    const [undated] = unapprovedImplementedViolations([unapproved({})], at);
    expect(undated?.description).toContain(
      "no person has approved it and it records neither origin.recorded_at nor created_at, so it counts as older than 14 days;",
    );
    expect(undated?.suggestion).toContain("origin.approved_by");
    expect(undated?.evidence).toMatchObject({ since: "", sinceField: "none" });
    expect(
      unapprovedImplementedViolations(
        [unapproved({ recordedAt: "2026-02-20T00:00:00Z" })],
        at,
      ),
    ).toEqual([]);
  });

  test("a finding lists eight symbols whole and counts the rest", () => {
    const listed = (count: number) =>
      unapprovedImplementedViolations(
        [
          unapproved({
            symbols: Array.from({ length: count }, (_, i) => `S${i}`),
          }),
        ],
        "2026-03-01T00:00:00Z",
      )[0]?.description;
    expect(listed(1)).toContain("implements it (S0), but");
    expect(listed(8)).toContain(
      "implements it (S0, S1, S2, S3, S4, S5, S6, S7), but",
    );
  });

  test("a finding lists at most eight symbols", () => {
    const symbols = Array.from({ length: 10 }, (_, i) => `SYM-${i}`);
    const [finding] = unapprovedImplementedViolations(
      [unapproved({ symbols })],
      "2026-03-01T00:00:00Z",
    );
    expect(finding?.description).toContain(
      "(SYM-0, SYM-1, SYM-2, SYM-3, SYM-4, SYM-5, SYM-6, SYM-7 (+2 more))",
    );
  });

  test("the created_at reader reads the requirement's own document once, inside the workspace", () => {
    const root = workspace({
      ".kb/requirements/REQ-A.md": requirement(
        "REQ-A",
        "created_at: 2026-01-05T00:00:00Z\n",
      ),
      ".kb/requirements/REQ-Q.md": requirement(
        "REQ-Q",
        'created_at: "2026-01-06"\n',
      ),
      ".kb/requirements/REQ-E.md": requirement("REQ-E", 'created_at: ""\n'),
      ".kb/requirements/REQ-N.md": requirement("REQ-N"),
      ".kb/requirements/REQ-P.md": "created_at: 2026-01-09T00:00:00Z\n",
    });
    const outside = workspace({
      "REQ-O.md": requirement("REQ-O", "created_at: 2026-01-07T00:00:00Z\n"),
    });
    const read = authoredCreatedAtReader(root);
    expect(read(".kb/requirements/REQ-A.md")).toBe("2026-01-05T00:00:00.000Z");
    expect(read(".kb/requirements/REQ-Q.md")).toBe("2026-01-06");
    expect(read(".kb/requirements/REQ-E.md")).toBeUndefined();
    expect(read(".kb/requirements/REQ-N.md")).toBeUndefined();
    // No front matter states nothing.
    expect(read(".kb/requirements/REQ-P.md")).toBeUndefined();
    expect(read(".kb/requirements/REQ-missing.md")).toBeUndefined();
    expect(read("")).toBeUndefined();
    expect(read(path.join(outside, "REQ-O.md"))).toBeUndefined();
    expect(
      read(path.relative(root, path.join(outside, "REQ-O.md"))),
    ).toBeUndefined();
    // Cached: a later edit to the same document is not read again.
    writeFileSync(
      path.join(root, ".kb/requirements/REQ-N.md"),
      requirement("REQ-N", "created_at: 2026-01-08T00:00:00Z\n"),
    );
    expect(read(".kb/requirements/REQ-N.md")).toBeUndefined();
    expect(authoredCreatedAtReader(root)(".kb/requirements/REQ-N.md")).toBe(
      "2026-01-08T00:00:00.000Z",
    );
  });
});
