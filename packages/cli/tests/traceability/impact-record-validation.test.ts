import { describe, expect, test } from "bun:test";
import type { GitChangeSnapshot } from "../../src/traceability/git-change-snapshot.js";
import type { PreparedImpactReview } from "../../src/traceability/impact-evaluator.js";
import type { EntityRow } from "../../src/traceability/impact-knowledge.js";
import {
  recordFromCapturedTree,
  same,
  validateAnalysisReviews,
  validateDecisionAgainstSnapshot,
} from "../../src/traceability/impact-record-validation.js";
import type {
  ImpactDecision,
  ImpactFileRecord,
  ImpactPolicy,
  SideEvidence,
} from "../../src/traceability/impact-review.js";

// implements REQ-impact-policy-stage-e-content-bound-review

const FP = (n: number) =>
  `sha256:${String(n).repeat(64).slice(0, 64)}` as const;
const OID = "d".repeat(40);

const RECORD = {
  contractVersion: "kibi.impact-review.v1",
  policy: { id: "p", version: "1", fingerprint: FP(1) },
  evaluator: {
    contractVersion: "kibi.impact-evaluator.v1",
    fingerprint: FP(2),
  },
  scope: {
    fingerprint: FP(3),
    knowledgeFingerprint: FP(4),
    providerSetFingerprint: FP(5),
  },
  reviewer: { id: "me", source: "self-claimed-local" },
  reviewedAt: "2026-01-01T00:00:00Z",
  files: [],
};

function snapshot(listing: string, blob?: Buffer) {
  const calls: (readonly string[])[] = [];
  const value: GitChangeSnapshot = {
    baseTree: "BASE",
    headTree: "HEAD",
    headCommit: null,
    inventory: [],
    readGit(args) {
      calls.push(args);
      return Buffer.from(listing);
    },
    readBlobs: (oids) =>
      new Map(blob ? oids.map((o) => [o, blob] as const) : []),
    assertUnchanged() {},
  };
  return { value, calls };
}

const row = (mode: string, type: string) =>
  `${mode} ${type} ${OID}\t.kibi/impact-review.json\0`;

describe("same", () => {
  test("compares canonical JSON", () => {
    expect(same({ a: 1, b: [2] }, { b: [2], a: 1 })).toBe(true);
    expect(same({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe("recordFromCapturedTree", () => {
  test("parses the record blob of the head tree", () => {
    for (const mode of ["100644", "100755"]) {
      const s = snapshot(
        row(mode, "blob"),
        Buffer.from(JSON.stringify(RECORD)),
      );
      expect(recordFromCapturedTree(s.value)).toStrictEqual(RECORD);
      expect(s.calls).toStrictEqual([
        ["ls-tree", "-z", "HEAD", "--", ":(literal).kibi/impact-review.json"],
      ]);
    }
  });

  test("refuses a missing or irregular record", () => {
    for (const listing of [
      "",
      row("120000", "blob"),
      row("100644", "tree"),
      row("160000", "commit"),
    ]) {
      expect(() =>
        recordFromCapturedTree(
          snapshot(listing, Buffer.from(JSON.stringify(RECORD))).value,
        ),
      ).toThrow(
        new Error(
          "Captured impact review record missing: .kibi/impact-review.json",
        ),
      );
    }
  });

  test("refuses invalid UTF-8 and unparsable records", () => {
    expect(() =>
      recordFromCapturedTree(
        snapshot(row("100644", "blob"), Buffer.from([0x7b, 0xff])).value,
      ),
    ).toThrow(TypeError);
    expect(() =>
      recordFromCapturedTree(
        snapshot(row("100644", "blob"), Buffer.from("[]")).value,
      ),
    ).toThrow(new Error("Impact review record must be an object"));
  });
});

const POLICY: ImpactPolicy = {
  contractVersion: "kibi.impact-policy.v1",
  id: "p",
  version: "1",
  allowUnsupportedReview: true,
  allowedPartial: [
    {
      providerId: "prov",
      providerFingerprint: FP(6),
      diagnosticCode: "MACRO",
      limitationClass: "macro",
    },
  ],
  notApplicablePaths: ["docs/na.md"],
};

const entityRow = (
  id: string,
  type: string,
  fp: number,
  artifact = `.kb/${id}.md`,
): EntityRow => ({
  id,
  type,
  fingerprint: FP(fp),
  artifactPath: artifact,
});

function prepared(
  scoped: Record<string, string[]>,
  base: EntityRow[],
  head: EntityRow[],
  policy: ImpactPolicy = POLICY,
): PreparedImpactReview {
  return {
    policy,
    scopedRequirementIdsByPath: new Map(Object.entries(scoped)),
    baseEntities: new Map(base.map((e) => [e.id, e])),
    headEntities: new Map(head.map((e) => [e.id, e])),
  } as unknown as PreparedImpactReview;
}

const updated = (
  requirementIds: string[],
  entities: {
    entityId: string;
    artifactPath?: string;
    before: number | null;
    after: number;
  }[],
  stillCurrent?: string[],
): ImpactDecision => ({
  kind: "impact",
  requirementIds,
  knowledge: {
    state: "updated",
    ...(stillCurrent
      ? {
          stillCurrent: stillCurrent.map((requirementId) => ({
            requirementId,
            rationale: "r",
          })),
        }
      : {}),
    entities: entities.map((e) => ({
      entityId: e.entityId,
      artifactPath: e.artifactPath ?? `.kb/${e.entityId}.md`,
      beforeFingerprint: e.before === null ? null : FP(e.before),
      afterFingerprint: FP(e.after),
    })),
  },
});

function validate(
  decision: ImpactDecision,
  prep: PreparedImpactReview,
  changed: string[] = [".kb/REQ-a.md", ".kb/REQ-b.md", ".kb/TEST-t.md"],
  path = "src/a.ts",
) {
  return () =>
    validateDecisionAgainstSnapshot(path, decision, prep, new Set(changed));
}

const SCOPED = prepared(
  { "src/a.ts": ["REQ-b", "REQ-a"] },
  [
    entityRow("REQ-a", "req", 1),
    entityRow("REQ-b", "req", 3),
    entityRow("TEST-t", "test", 5),
  ],
  [
    entityRow("REQ-a", "req", 2),
    entityRow("REQ-b", "req", 4),
    entityRow("TEST-t", "test", 6),
  ],
);

describe("validateDecisionAgainstSnapshot", () => {
  test("not_applicable needs a policy-listed path", () => {
    const na: ImpactDecision = {
      kind: "not_applicable",
      policyReason: "x",
      rationale: "r",
    };
    expect(validate(na, SCOPED, [], "docs/na.md")).not.toThrow();
    expect(validate(na, SCOPED, [], "src/a.ts")).toThrow(
      new Error("Policy does not permit not_applicable for src/a.ts"),
    );
  });

  test("no_impact needs an empty scope", () => {
    const none: ImpactDecision = {
      kind: "no_impact",
      reason: "x",
      rationale: "r",
    };
    expect(validate(none, SCOPED, [], "src/other.ts")).not.toThrow();
    expect(
      validate(none, prepared({ "src/z.ts": [] }, [], []), [], "src/z.ts"),
    ).not.toThrow();
    expect(validate(none, SCOPED)).toThrow(
      new Error(
        "no_impact cannot omit scoped requirements for src/a.ts: REQ-b, REQ-a",
      ),
    );
  });

  test("impact must name exactly the scoped requirements", () => {
    const current = (requirementIds: string[]): ImpactDecision => ({
      kind: "impact",
      requirementIds,
      knowledge: { state: "still_current", rationale: "r" },
    });
    expect(validate(current(["REQ-a", "REQ-b"]), SCOPED)).not.toThrow();
    expect(validate(current(["REQ-b", "REQ-a"]), SCOPED)).not.toThrow();
    const message = new Error(
      "Impact requirements do not equal the complete scoped set for src/a.ts",
    );
    for (const ids of [
      ["REQ-a"],
      ["REQ-a", "REQ-a", "REQ-b"],
      ["REQ-a", "REQ-c"],
      ["REQ-a", "REQ-b", "REQ-c"],
    ])
      expect(validate(current(ids), SCOPED)).toThrow(message);
    expect(validate(current([]), SCOPED, [], "src/unscoped.ts")).not.toThrow();
    expect(validate(current(["REQ-a"]), SCOPED, [], "src/unscoped.ts")).toThrow(
      new Error(
        "Impact requirements do not equal the complete scoped set for src/unscoped.ts",
      ),
    );
  });

  test("updated knowledge accepts changed scoped requirements", () => {
    expect(
      validate(
        updated(
          ["REQ-a", "REQ-b"],
          [
            { entityId: "REQ-a", before: 1, after: 2 },
            { entityId: "REQ-b", before: 3, after: 4 },
            { entityId: "TEST-t", before: 5, after: 6 },
          ],
        ),
        SCOPED,
      ),
    ).not.toThrow();
    expect(
      validate(
        updated(
          ["REQ-a", "REQ-b"],
          [{ entityId: "REQ-a", before: 1, after: 2 }],
          ["REQ-b"],
        ),
        SCOPED,
      ),
    ).not.toThrow();
  });

  test("an updated entity must resolve to a changed artifact", () => {
    const err = (id: string) =>
      new Error(
        `Updated entity does not resolve to a changed scoped artifact: ${id}`,
      );
    const decision = (entityId: string, artifactPath?: string) =>
      updated(
        ["REQ-a", "REQ-b"],
        [
          {
            entityId,
            before: 1,
            after: 2,
            ...(artifactPath ? { artifactPath } : {}),
          },
        ],
      );
    expect(validate(decision("REQ-gone"), SCOPED)).toThrow(err("REQ-gone"));
    expect(validate(decision("REQ-a", ".kb/elsewhere.md"), SCOPED)).toThrow(
      err("REQ-a"),
    );
    expect(validate(decision("REQ-a"), SCOPED, [".kb/REQ-b.md"])).toThrow(
      err("REQ-a"),
    );
    expect(validate(decision("REQ-a", ".kb/REQ-b.md"), SCOPED)).toThrow(
      err("REQ-a"),
    );
    expect(validate(decision("REQ-gone", ".kb/REQ-a.md"), SCOPED)).toThrow(
      err("REQ-gone"),
    );
  });

  test("fingerprints must be current and changed", () => {
    const err = new Error(
      "Updated entity fingerprints are stale or semantically unchanged: REQ-a",
    );
    const one = (before: number | null, after: number) =>
      updated(
        ["REQ-a", "REQ-b"],
        [{ entityId: "REQ-a", before, after }],
        ["REQ-b"],
      );
    expect(validate(one(9, 2), SCOPED)).toThrow(err);
    expect(validate(one(1, 9), SCOPED)).toThrow(err);
    expect(validate(one(null, 2), SCOPED)).toThrow(err);
    const newReq = prepared(
      { "src/a.ts": ["REQ-a"] },
      [],
      [entityRow("REQ-a", "req", 2)],
    );
    expect(
      validate(
        updated(["REQ-a"], [{ entityId: "REQ-a", before: null, after: 2 }]),
        newReq,
      ),
    ).not.toThrow();
    const unchanged = prepared(
      { "src/a.ts": ["REQ-a"] },
      [entityRow("REQ-a", "req", 2)],
      [entityRow("REQ-a", "req", 2)],
    );
    expect(
      validate(
        updated(["REQ-a"], [{ entityId: "REQ-a", before: 2, after: 2 }]),
        unchanged,
      ),
    ).toThrow(err);
  });

  test("an updated requirement must be scoped", () => {
    const prep = prepared(
      { "src/a.ts": ["REQ-a"] },
      [entityRow("REQ-a", "req", 1), entityRow("REQ-b", "req", 3)],
      [entityRow("REQ-a", "req", 2), entityRow("REQ-b", "req", 4)],
    );
    expect(
      validate(
        updated(
          ["REQ-a"],
          [
            { entityId: "REQ-a", before: 1, after: 2 },
            { entityId: "REQ-b", before: 3, after: 4 },
          ],
        ),
        prep,
      ),
    ).toThrow(
      new Error(
        "Updated requirement is outside the complete scoped set: REQ-b",
      ),
    );
  });

  test("updated evidence must change a scoped requirement", () => {
    expect(
      validate(
        updated(
          ["REQ-a", "REQ-b"],
          [{ entityId: "TEST-t", before: 5, after: 6 }],
          ["REQ-a", "REQ-b"],
        ),
        SCOPED,
      ),
    ).toThrow(
      new Error(
        "Updated evidence for src/a.ts must include a semantically changed scoped requirement",
      ),
    );
  });

  test("still-current requirements must be scoped, distinct and complete", () => {
    const change = [{ entityId: "REQ-a", before: 1, after: 2 }];
    expect(
      validate(updated(["REQ-a", "REQ-b"], change, ["REQ-c"]), SCOPED),
    ).toThrow(
      new Error(
        "stillCurrent requirement is outside the complete scoped set: REQ-c",
      ),
    );
    expect(
      validate(updated(["REQ-a", "REQ-b"], change, ["REQ-a"]), SCOPED),
    ).toThrow(
      new Error("Requirement is both updated and still_current: REQ-a"),
    );
    const incomplete = new Error(
      "Updated evidence must account for every scoped requirement on src/a.ts",
    );
    expect(
      validate(updated(["REQ-a", "REQ-b"], change, ["REQ-b", "REQ-b"]), SCOPED),
    ).toThrow(incomplete);
    expect(validate(updated(["REQ-a", "REQ-b"], change), SCOPED)).toThrow(
      incomplete,
    );
    expect(validate(updated(["REQ-a", "REQ-b"], change, []), SCOPED)).toThrow(
      incomplete,
    );
  });
});

const R = (startLine: number, endLine: number, reason = "macro") => ({
  startLine,
  startColumn: 0,
  endLine,
  endColumn: 1,
  reason,
});

function side(
  status: "ok" | "partial" | "unsupported" | "failed",
  ranges = [R(1, 3)],
  codes = ["MACRO"],
): SideEvidence {
  return {
    mode: "100644",
    objectId: OID,
    byteFingerprint: FP(7),
    kind: "regular",
    analysis: {
      contractVersion: "c",
      status,
      language: "ts",
      sourceFile: "src/a.ts",
      providerId: "prov",
      providerStamp: null,
      providerFingerprint: FP(6),
      inputFingerprint: FP(8),
      resultFingerprint: FP(9),
      diagnosticCodes: codes,
      uncoveredRanges: ranges,
    },
  };
}

function fileRecord(
  before: SideEvidence | null,
  after: SideEvidence | null,
  analysisReviews: ImpactFileRecord["analysisReviews"] = [],
): ImpactFileRecord {
  return {
    path: "src/a.ts",
    status: "M",
    analysisDepth: "symbol",
    disposition: "checked",
    oldHunkRanges: [],
    newHunkRanges: [{ start: 2, end: 2 }],
    before,
    after,
    analysisReviews,
    decision: { kind: "no_impact", reason: "x", rationale: "r" },
  } as ImpactFileRecord;
}

const partialReview = (
  ranges = [R(1, 3)],
  limitationClass = "macro",
  reviewSide: "before" | "after" = "after",
) => ({
  kind: "partial_review" as const,
  side: reviewSide,
  limitationClass,
  ranges,
  rationale: "r",
});
const unsupportedReview = (reviewSide: "before" | "after" = "after") => ({
  kind: "unsupported_review" as const,
  side: reviewSide,
  wholeFile: true as const,
  rationale: "r",
});

describe("validateAnalysisReviews", () => {
  test("ok, missing and before-side analysis need no review", () => {
    expect(() =>
      validateAnalysisReviews(fileRecord(side("ok"), side("ok")), POLICY),
    ).not.toThrow();
    expect(() =>
      validateAnalysisReviews(fileRecord(null, null), POLICY),
    ).not.toThrow();
    expect(() =>
      validateAnalysisReviews(fileRecord(side("partial"), side("ok")), POLICY),
    ).not.toThrow();
  });

  test("an unnecessary review is refused on either side", () => {
    expect(() =>
      validateAnalysisReviews(
        fileRecord(side("ok"), side("ok"), [
          partialReview(undefined, undefined, "before"),
        ]),
        POLICY,
      ),
    ).toThrow(
      new Error(
        "Unnecessary analysis review on src/a.ts (before); only after-side gaps that overlap changed lines need review",
      ),
    );
    expect(() =>
      validateAnalysisReviews(
        fileRecord(null, side("ok"), [unsupportedReview()]),
        POLICY,
      ),
    ).toThrow(
      new Error(
        "Unnecessary analysis review on src/a.ts (after); only after-side gaps that overlap changed lines need review",
      ),
    );
  });

  test("failed analysis cannot be waived", () => {
    expect(() =>
      validateAnalysisReviews(fileRecord(null, side("failed")), POLICY),
    ).toThrow(
      new Error(
        "Source analysis cannot be waived for src/a.ts (after): source analysis failed",
      ),
    );
  });

  test("unsupported analysis needs exactly one whole-file review the policy allows", () => {
    const record = (reviews: ImpactFileRecord["analysisReviews"]) =>
      fileRecord(null, side("unsupported", [], ["X"]), reviews);
    expect(() =>
      validateAnalysisReviews(record([unsupportedReview()]), POLICY),
    ).not.toThrow();
    const err = new Error(
      "Unsupported side lacks one explicit whole-file review: src/a.ts (after)",
    );
    expect(() =>
      validateAnalysisReviews(record([unsupportedReview()]), {
        ...POLICY,
        allowUnsupportedReview: false,
      }),
    ).toThrow(err);
    expect(() => validateAnalysisReviews(record([]), POLICY)).toThrow(err);
    expect(() =>
      validateAnalysisReviews(
        record([unsupportedReview(), unsupportedReview()]),
        POLICY,
      ),
    ).toThrow(err);
    expect(() =>
      validateAnalysisReviews(record([partialReview()]), POLICY),
    ).toThrow(err);
    expect(() =>
      validateAnalysisReviews(record([unsupportedReview("before")]), POLICY),
    ).toThrow(
      new Error(
        "Unnecessary analysis review on src/a.ts (before); only after-side gaps that overlap changed lines need review",
      ),
    );
  });

  test("partial analysis needs one approved review of the touched ranges", () => {
    const record = (
      reviews: ImpactFileRecord["analysisReviews"],
      analysis = side("partial", [R(1, 3), R(9, 9)]),
    ) => fileRecord(null, analysis, reviews);
    expect(() =>
      validateAnalysisReviews(record([partialReview()]), POLICY),
    ).not.toThrow();
    const err = new Error(
      "Partial review must cover every uncovered range that overlaps changed lines: src/a.ts (after)",
    );
    expect(() => validateAnalysisReviews(record([]), POLICY)).toThrow(err);
    expect(() =>
      validateAnalysisReviews(
        record([partialReview(), partialReview()]),
        POLICY,
      ),
    ).toThrow(err);
    expect(() =>
      validateAnalysisReviews(record([unsupportedReview()]), POLICY),
    ).toThrow(err);
    expect(() =>
      validateAnalysisReviews(
        record([partialReview(undefined, "dynamic")]),
        POLICY,
      ),
    ).toThrow(err);
    expect(() =>
      validateAnalysisReviews(
        record([partialReview([R(1, 3), R(9, 9)])]),
        POLICY,
      ),
    ).toThrow(err);
    expect(() =>
      validateAnalysisReviews(
        record([partialReview()], side("partial", [R(1, 3)], ["OTHER"])),
        POLICY,
      ),
    ).toThrow(
      new Error("Partial side is not approved by policy: src/a.ts (after)"),
    );
  });
});
