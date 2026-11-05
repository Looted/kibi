import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { SourceChangeAnalysis } from "../../src/plugins/source-change-analysis.js";
import entitySchema from "../../src/schemas/entity.schema.json" with {
  type: "json",
};
import type { GitChangeSnapshot } from "../../src/traceability/git-change-snapshot.js";
import type { StagedPath } from "../../src/traceability/git-staged.js";
import {
  type ImpactPreparationOptions,
  type PreparedImpactReview,
  createImpactReviewRecord,
  evaluateImpactReview,
  fingerprintImpactEvaluator,
  impactReviewInventory,
  prepareImpactReview,
} from "../../src/traceability/impact-evaluator.js";
import * as knowledge from "../../src/traceability/impact-knowledge.js";
import type { EntityRow } from "../../src/traceability/impact-knowledge.js";
import * as impactPolicy from "../../src/traceability/impact-policy.js";
import impactPolicySchema from "../../src/traceability/impact-policy.v1.schema.json" with {
  type: "json",
};
import * as recordValidation from "../../src/traceability/impact-record-validation.js";
import * as impactReview from "../../src/traceability/impact-review.js";
import {
  type Fingerprint,
  IMPACT_REVIEW_PATH,
  type ImpactDecision,
  type ImpactPolicy,
  type ImpactReviewRecord,
  type SideEvidence,
  fingerprint,
} from "../../src/traceability/impact-review.js";
import impactReviewSchema from "../../src/traceability/impact-review.schema.json" with {
  type: "json",
};
import * as sideEvidenceModule from "../../src/traceability/impact-side-evidence.js";

afterEach(() => {
  mock.restore();
});

const providerSet = `sha256:${"b".repeat(64)}` as Fingerprint;
const evaluator = `sha256:${"c".repeat(64)}` as Fingerprint;
const providerFingerprint = `sha256:${"d".repeat(64)}` as Fingerprint;

function policy(overrides: Partial<ImpactPolicy> = {}): ImpactPolicy {
  return {
    contractVersion: "kibi.impact-policy.v1",
    id: "fixture-policy",
    version: "1",
    allowUnsupportedReview: false,
    allowedPartial: [],
    notApplicablePaths: [],
    ...overrides,
  };
}

type Analysis = NonNullable<SideEvidence["analysis"]>;

function analysis(
  status: Analysis["status"],
  overrides: Partial<Analysis> = {},
): Analysis {
  return {
    contractVersion: "kibi.symbol-extractor.v2",
    status,
    language: "typescript",
    sourceFile: "src/a.ts",
    providerId: "fixture-provider",
    providerStamp: null,
    providerFingerprint,
    inputFingerprint: `sha256:${"e".repeat(64)}`,
    resultFingerprint: `sha256:${"f".repeat(64)}`,
    diagnosticCodes: [],
    uncoveredRanges: [],
    ...overrides,
  };
}

function change(
  path: string,
  before: Analysis | null,
  after: Analysis | null,
): SourceChangeAnalysis {
  return { path, before, after } as unknown as SourceChangeAnalysis;
}

function staged(path: string, overrides: Partial<StagedPath> = {}) {
  return {
    path,
    status: "M",
    hunks: [],
    hunkRanges: [{ start: 1, end: 2 }],
    analysisDepth: "file",
    disposition: "advisory",
    ...overrides,
  } as StagedPath;
}

type Fixture = {
  snapshot: GitChangeSnapshot;
  assertUnchanged: ReturnType<typeof mock>;
  sideCalls: unknown[][];
  scopeCalls: unknown[][];
  missingSides: Set<string>;
  receiptOnly: Set<string>;
  scopes: Map<string, string[]>;
  policy: ImpactPolicy;
};

function entities(tree: string): Map<string, EntityRow> {
  return new Map([
    [
      `REQ-${tree}`,
      {
        id: `REQ-${tree}`,
        type: "req",
        fingerprint: `sha256:${"1".repeat(64)}`,
        artifactPath: `.kb/${tree}.md`,
      },
    ],
  ]);
}

function fixture(
  inventory: StagedPath[],
  options: { policy?: ImpactPolicy } = {},
): Fixture {
  const assertUnchanged = mock(() => {});
  const f: Fixture = {
    snapshot: {
      baseTree: "BASE",
      headTree: "HEAD",
      headCommit: null,
      readGit: () => {
        throw new Error("unexpected git read");
      },
      readBlobs: () => {
        throw new Error("unexpected blob read");
      },
      assertUnchanged,
      inventory,
    },
    assertUnchanged,
    sideCalls: [],
    scopeCalls: [],
    missingSides: new Set(),
    receiptOnly: new Set(),
    scopes: new Map(),
    policy: options.policy ?? policy(),
  };
  spyOn(impactPolicy, "loadBaseImpactPolicy").mockImplementation((snapshot) => {
    expect(snapshot).toBe(f.snapshot);
    return f.policy;
  });
  spyOn(knowledge, "entityRowsWithRelationships").mockImplementation(
    (snapshot, tree) => {
      expect(snapshot).toBe(f.snapshot);
      return entities(tree);
    },
  );
  spyOn(knowledge, "rawKnowledgeFingerprint").mockImplementation(
    (snapshot, tree) => {
      expect(snapshot).toBe(f.snapshot);
      return fingerprint(`raw:${tree}`);
    },
  );
  spyOn(knowledge, "semanticKnowledgeFingerprint").mockImplementation((rows) =>
    fingerprint(`semantic:${[...rows.keys()].join(",")}`),
  );
  spyOn(knowledge, "requirementScope").mockImplementation((rows, paths) => {
    const tree = [...rows.keys()][0] as string;
    f.scopeCalls.push([tree, paths]);
    return f.scopes.get(`${tree}:${paths.join(",")}`) ?? [];
  });
  spyOn(sideEvidenceModule, "isReceiptOnlyChange").mockImplementation((file) =>
    f.receiptOnly.has(file.path),
  );
  spyOn(sideEvidenceModule, "sideEvidence").mockImplementation(
    (snapshot, tree, path, result, content) => {
      expect(snapshot).toBe(f.snapshot);
      f.sideCalls.push([tree, path, result, content]);
      if (f.missingSides.has(`${tree}:${path}`)) return null;
      return side(tree, path, result as unknown as Analysis | null);
    },
  );
  return f;
}

function side(
  tree: string,
  path: string,
  result: Analysis | null,
): SideEvidence {
  return {
    mode: "100644",
    objectId: `${tree}:${path}`,
    byteFingerprint: fingerprint(`${tree}:${path}`),
    kind: "regular",
    analysis: result,
  };
}

function options(
  analyses: ReadonlyMap<string, SourceChangeAnalysis> = new Map(),
): ImpactPreparationOptions {
  return {
    providerSetFingerprint: providerSet,
    evaluatorFingerprint: evaluator,
    analyses,
  };
}

const knowledgeFingerprint = fingerprint({
  baseRaw: fingerprint("raw:BASE"),
  headRaw: fingerprint("raw:HEAD"),
  baseSemantic: fingerprint("semantic:REQ-BASE"),
  headSemantic: fingerprint("semantic:REQ-HEAD"),
});

describe("fingerprintImpactEvaluator", () => {
  test("binds the contract, evaluator version and consumed schemas", () => {
    expect(fingerprintImpactEvaluator()).toBe(
      fingerprint({
        contractVersion: "kibi.impact-evaluator-identity.v2",
        evaluatorVersion: "kibi.impact-evaluator.v1",
        schemas: {
          entity: fingerprint(entitySchema),
          impactPolicy: fingerprint(impactPolicySchema),
          impactReview: fingerprint(impactReviewSchema),
        },
      }),
    );
  });
});

describe("impactReviewInventory", () => {
  test("drops the receipt and receipt-only paths", () => {
    const f = fixture([
      staged("src/a.ts"),
      staged(IMPACT_REVIEW_PATH, { status: "A" }),
      staged(".kb/req.md"),
    ]);
    f.receiptOnly.add(".kb/req.md");
    expect(impactReviewInventory(f.snapshot)).toStrictEqual([
      staged("src/a.ts"),
    ]);
  });

  test("accepts a modified receipt", () => {
    const f = fixture([staged(IMPACT_REVIEW_PATH)]);
    expect(impactReviewInventory(f.snapshot)).toStrictEqual([]);
  });

  test("rejects a duplicated receipt path", () => {
    const f = fixture([staged(IMPACT_REVIEW_PATH), staged(IMPACT_REVIEW_PATH)]);
    expect(() => impactReviewInventory(f.snapshot)).toThrow(
      "Duplicate impact review transport path",
    );
  });

  const moved =
    "Impact review receipt may only be added or modified at its exact path; rename/copy cannot hide another changed path";
  for (const [label, overrides] of [
    ["deleted", { status: "D" }],
    ["type-changed", { status: "T" }],
    ["renamed", { status: "R", oldPath: "src/b.ts" }],
    ["added with an old path", { status: "A", oldPath: "src/b.ts" }],
    ["modified from a copy", { status: "M", copyFromPath: "src/b.ts" }],
  ] as const)
    test(`rejects a ${label} receipt`, () => {
      const f = fixture([staged(IMPACT_REVIEW_PATH, overrides)]);
      expect(() => impactReviewInventory(f.snapshot)).toThrow(moved);
    });
});

describe("prepareImpactReview", () => {
  test("rejects malformed bound fingerprints", () => {
    const f = fixture([]);
    expect(() =>
      prepareImpactReview(f.snapshot, {
        ...options(),
        providerSetFingerprint: "sha256:x" as Fingerprint,
      }),
    ).toThrow("Provider-set fingerprint must be a sha256 fingerprint");
    expect(() =>
      prepareImpactReview(f.snapshot, {
        ...options(),
        evaluatorFingerprint: "sha256:x" as Fingerprint,
      }),
    ).toThrow("Evaluator fingerprint must be a sha256 fingerprint");
  });

  test("projects every changed path with sides, scope and fingerprints", () => {
    const okAfter = analysis("ok");
    const okBefore = analysis("ok", { language: "before" });
    const inventory = [
      staged("src/a.ts", { gitMode: "100644", previousMode: "100755" }),
      staged("src/new.ts", {
        status: "R",
        oldPath: "src/old.ts",
        oldHunkRanges: [{ start: 3, end: 4 }],
      }),
      staged("src/copy.ts", { status: "C", copyFromPath: "src/a.ts" }),
      staged("src/added.ts", { status: "A" }),
      staged("src/gone.ts", { status: "D" }),
      staged("src/meta.ts", { analysisDepth: "metadata" }),
      staged("bin/blob", { skipReason: "binary", disposition: "skipped" }),
      staged(IMPACT_REVIEW_PATH),
      staged(".kb/receipt.md"),
    ];
    const f = fixture(inventory);
    f.receiptOnly.add(".kb/receipt.md");
    f.scopes.set("REQ-BASE:src/old.ts", ["REQ-z", "REQ-b"]);
    f.scopes.set("REQ-HEAD:src/new.ts", ["REQ-a", "REQ-b"]);
    f.scopes.set("REQ-HEAD:src/a.ts", ["REQ-a"]);
    const analyses = new Map([
      ["src/a.ts", change("src/a.ts", okBefore, okAfter)],
      ["src/meta.ts", change("src/meta.ts", okBefore, okAfter)],
      ["bin/blob", change("bin/blob", okBefore, okAfter)],
      [IMPACT_REVIEW_PATH, change(IMPACT_REVIEW_PATH, null, null)],
      [".kb/receipt.md", change(".kb/receipt.md", null, null)],
    ]);

    const prepared = prepareImpactReview(f.snapshot, options(analyses));

    const sides = {
      a: [
        side("BASE", "src/a.ts", okBefore),
        side("HEAD", "src/a.ts", okAfter),
      ],
      renamed: [
        side("BASE", "src/old.ts", null),
        side("HEAD", "src/new.ts", null),
      ],
      copy: [side("BASE", "src/a.ts", null), side("HEAD", "src/copy.ts", null)],
      added: [null, side("HEAD", "src/added.ts", null)],
      gone: [side("BASE", "src/gone.ts", null), null],
      meta: [
        side("BASE", "src/meta.ts", null),
        side("HEAD", "src/meta.ts", null),
      ],
      blob: [side("BASE", "bin/blob", null), side("HEAD", "bin/blob", null)],
    };
    const files: PreparedImpactReview["files"] = [
      {
        path: "src/a.ts",
        status: "M",
        analysisDepth: "symbol",
        disposition: "checked",
        gitMode: "100644",
        previousMode: "100755",
        oldHunkRanges: [],
        newHunkRanges: [{ start: 1, end: 2 }],
        before: sides.a[0],
        after: sides.a[1],
        analysisReviews: [],
      },
      {
        path: "src/new.ts",
        status: "R",
        oldPath: "src/old.ts",
        analysisDepth: "file",
        disposition: "advisory",
        oldHunkRanges: [{ start: 3, end: 4 }],
        newHunkRanges: [{ start: 1, end: 2 }],
        before: sides.renamed[0],
        after: sides.renamed[1],
        analysisReviews: [],
      },
      {
        path: "src/copy.ts",
        status: "C",
        copyFromPath: "src/a.ts",
        analysisDepth: "file",
        disposition: "advisory",
        oldHunkRanges: [],
        newHunkRanges: [{ start: 1, end: 2 }],
        before: sides.copy[0],
        after: sides.copy[1],
        analysisReviews: [],
      },
      {
        path: "src/added.ts",
        status: "A",
        analysisDepth: "file",
        disposition: "advisory",
        oldHunkRanges: [],
        newHunkRanges: [{ start: 1, end: 2 }],
        before: null,
        after: sides.added[1],
        analysisReviews: [],
      },
      {
        path: "src/gone.ts",
        status: "D",
        analysisDepth: "file",
        disposition: "advisory",
        oldHunkRanges: [],
        newHunkRanges: [{ start: 1, end: 2 }],
        before: sides.gone[0],
        after: null,
        analysisReviews: [],
      },
      {
        path: "src/meta.ts",
        status: "M",
        analysisDepth: "symbol",
        disposition: "checked",
        oldHunkRanges: [],
        newHunkRanges: [{ start: 1, end: 2 }],
        before: sides.meta[0],
        after: sides.meta[1],
        analysisReviews: [],
      },
      {
        path: "bin/blob",
        status: "M",
        analysisDepth: "symbol",
        disposition: "checked",
        skipReason: "binary",
        oldHunkRanges: [],
        newHunkRanges: [{ start: 1, end: 2 }],
        before: sides.blob[0],
        after: sides.blob[1],
        analysisReviews: [],
      },
    ];
    const scopeFiles = files.map(
      ({ analysisReviews: _reviews, ...rest }) => rest,
    );
    const scopePayload = {
      contractVersion: "kibi.impact-evaluator.v1",
      policyFingerprint: fingerprint(f.policy),
      evaluatorFingerprint: evaluator,
      providerSetFingerprint: providerSet,
      knowledgeFingerprint,
      files: scopeFiles,
    };
    expect(prepared).toStrictEqual({
      policy: f.policy,
      policyFingerprint: fingerprint(f.policy),
      evaluatorFingerprint: evaluator,
      providerSetFingerprint: providerSet,
      knowledgeFingerprint,
      scopeFingerprint: fingerprint(scopePayload),
      files,
      scopedRequirementIdsByPath: new Map([
        ["src/a.ts", ["REQ-a"]],
        ["src/new.ts", ["REQ-a", "REQ-b", "REQ-z"]],
        ["src/copy.ts", ["REQ-a"]],
        ["src/added.ts", []],
        ["src/gone.ts", []],
        ["src/meta.ts", []],
        ["bin/blob", []],
      ]),
      baseEntities: entities("BASE"),
      headEntities: entities("HEAD"),
      scopePayload,
    });
    expect(f.sideCalls).toStrictEqual([
      ["BASE", "src/a.ts", okBefore, undefined],
      ["HEAD", "src/a.ts", okAfter, undefined],
      ["BASE", "src/old.ts", null, undefined],
      ["HEAD", "src/new.ts", null, undefined],
      ["BASE", "src/a.ts", null, undefined],
      ["HEAD", "src/copy.ts", null, undefined],
      ["HEAD", "src/added.ts", null, undefined],
      ["BASE", "src/gone.ts", null, undefined],
      ["BASE", "src/meta.ts", null, undefined],
      ["HEAD", "src/meta.ts", null, undefined],
      ["BASE", "bin/blob", null, undefined],
      ["HEAD", "bin/blob", null, undefined],
    ]);
    expect(f.scopeCalls.slice(0, 8)).toStrictEqual([
      ["REQ-BASE", ["src/a.ts"]],
      ["REQ-HEAD", ["src/a.ts"]],
      ["REQ-BASE", ["src/a.ts"]],
      ["REQ-HEAD", ["src/a.ts"]],
      ["REQ-BASE", ["src/old.ts"]],
      ["REQ-HEAD", ["src/old.ts"]],
      ["REQ-BASE", ["src/new.ts"]],
      ["REQ-HEAD", ["src/new.ts"]],
    ]);
  });

  test("passes captured contents to each side", () => {
    const f = fixture([
      staged("src/a.ts", { previousContent: "old", content: "new" }),
    ]);
    const before = analysis("ok", { language: "b" });
    const after = analysis("ok");
    prepareImpactReview(
      f.snapshot,
      options(new Map([["src/a.ts", change("src/a.ts", before, after)]])),
    );
    expect(f.sideCalls).toStrictEqual([
      ["BASE", "src/a.ts", before, "old"],
      ["HEAD", "src/a.ts", after, "new"],
    ]);
  });

  test("keeps the inventory depth when the after side is not ok", () => {
    const f = fixture([
      staged("src/a.ts"),
      staged("src/d.ts", { status: "D" }),
    ]);
    const prepared = prepareImpactReview(
      f.snapshot,
      options(
        new Map([
          ["src/d.ts", change("src/d.ts", analysis("ok"), null)],
          [
            "src/a.ts",
            change(
              "src/a.ts",
              null,
              analysis("partial", {
                uncoveredRanges: [
                  {
                    startLine: 9,
                    startColumn: 0,
                    endLine: 9,
                    endColumn: 1,
                    reason: "macro",
                  },
                ],
              }),
            ),
          ],
        ]),
      ),
    );
    expect(
      prepared.files.map((file) => [file.analysisDepth, file.disposition]),
    ).toStrictEqual([
      ["file", "advisory"],
      ["file", "advisory"],
    ]);
  });

  test("rejects an analysis for a path outside the inventory", () => {
    const f = fixture([staged("src/a.ts")]);
    expect(() =>
      prepareImpactReview(
        f.snapshot,
        options(new Map([["src/b.ts", change("src/b.ts", null, null)]])),
      ),
    ).toThrow("Analysis contains an extraneous changed path: src/b.ts");
    expect(
      prepareImpactReview(
        f.snapshot,
        options(
          new Map([
            [IMPACT_REVIEW_PATH, change(IMPACT_REVIEW_PATH, null, null)],
          ]),
        ),
      ).files.map((file) => file.path),
    ).toStrictEqual(["src/a.ts"]);
  });

  test("rejects a changed path with neither captured side", () => {
    const f = fixture([staged("src/a.ts")]);
    f.missingSides.add("BASE:src/a.ts");
    f.missingSides.add("HEAD:src/a.ts");
    expect(() => prepareImpactReview(f.snapshot, options())).toThrow(
      "Changed path has no captured Git side: src/a.ts",
    );
  });

  test("keeps a path with only one captured side", () => {
    const f = fixture([staged("src/a.ts")]);
    f.missingSides.add("BASE:src/a.ts");
    expect(
      prepareImpactReview(f.snapshot, options()).files.map((file) => [
        file.before,
        file.after,
      ]),
    ).toStrictEqual([[null, side("HEAD", "src/a.ts", null)]]);
  });

  test("rejects a missing analysis side for a checked path", () => {
    const f = fixture([staged("src/a.ts", { content: "new" })]);
    expect(() => prepareImpactReview(f.snapshot, options())).toThrow(
      "Missing after-side source analysis for src/a.ts",
    );
  });

  const gap = {
    startLine: 1,
    startColumn: 0,
    endLine: 1,
    endColumn: 4,
    reason: "macro",
  };

  test("blocks a failed after side", () => {
    const f = fixture([staged("src/a.ts")]);
    expect(() =>
      prepareImpactReview(
        f.snapshot,
        options(
          new Map([["src/a.ts", change("src/a.ts", null, analysis("failed"))]]),
        ),
      ),
    ).toThrow(
      "Required source analysis cannot pass for src/a.ts (after): source analysis failed",
    );
  });

  test("an unsupported after side needs policy approval", () => {
    const unsupported = new Map([
      ["src/a.ts", change("src/a.ts", null, analysis("unsupported"))],
    ]);
    expect(() =>
      prepareImpactReview(
        fixture([staged("src/a.ts")]).snapshot,
        options(unsupported),
      ),
    ).toThrow(
      "Unsupported source analysis is not reviewable by policy for src/a.ts (after)",
    );
    mock.restore();
    const allowed = fixture([staged("src/a.ts")], {
      policy: policy({ allowUnsupportedReview: true }),
    });
    expect(
      prepareImpactReview(allowed.snapshot, options(unsupported)).files.length,
    ).toBe(1);
  });

  test("a partial after side needs an approved limitation class", () => {
    const partial = new Map([
      [
        "src/a.ts",
        change(
          "src/a.ts",
          null,
          analysis("partial", {
            diagnosticCodes: ["dynamic_decorator"],
            uncoveredRanges: [gap],
          }),
        ),
      ],
    ]);
    expect(() =>
      prepareImpactReview(
        fixture([staged("src/a.ts")]).snapshot,
        options(partial),
      ),
    ).toThrow(
      "Partial source analysis is not allowed by trusted policy for src/a.ts (after)",
    );
    mock.restore();
    const allowed = fixture([staged("src/a.ts")], {
      policy: policy({
        allowedPartial: [
          {
            providerId: "fixture-provider",
            providerFingerprint,
            diagnosticCode: "dynamic_decorator",
            limitationClass: "dynamic-decorator",
          },
        ],
      }),
    });
    expect(
      prepareImpactReview(allowed.snapshot, options(partial)).files.length,
    ).toBe(1);
  });
});

const stillCurrent: ImpactDecision = {
  kind: "impact",
  requirementIds: ["REQ-a"],
  knowledge: { state: "still_current", rationale: "Still accurate." },
};

function preparedFor(f: Fixture): PreparedImpactReview {
  return prepareImpactReview(f.snapshot, options());
}

function identityParse() {
  return spyOn(impactReview, "parseImpactReviewRecord").mockImplementation(
    (value) => value as ImpactReviewRecord,
  );
}

describe("createImpactReviewRecord", () => {
  test("binds the prepared scope, reviewer and decisions", () => {
    const f = fixture([staged("src/a.ts"), staged("src/b.ts")]);
    const prepared = preparedFor(f);
    identityParse();
    const validated: unknown[][] = [];
    spyOn(recordValidation, "validateAnalysisReviews").mockImplementation(
      (file, trusted) => {
        validated.push([file.path, trusted]);
      },
    );
    const review = {
      kind: "unsupported_review",
      side: "after",
      wholeFile: true,
      rationale: "Reviewed.",
    } as const;
    const record = createImpactReviewRecord(
      prepared,
      new Map([
        ["src/b.ts", { decision: stillCurrent, analysisReviews: [review] }],
        ["src/a.ts", { decision: stillCurrent }],
      ]),
      "reviewer",
      "2026-09-26T10:00:00Z",
    );
    expect(record).toStrictEqual({
      contractVersion: "kibi.impact-review.v1",
      policy: {
        id: "fixture-policy",
        version: "1",
        fingerprint: fingerprint(f.policy),
      },
      evaluator: {
        contractVersion: "kibi.impact-evaluator.v1",
        fingerprint: evaluator,
      },
      scope: {
        fingerprint: prepared.scopeFingerprint,
        knowledgeFingerprint,
        providerSetFingerprint: providerSet,
      },
      reviewer: { id: "reviewer", source: "self-claimed-local" },
      reviewedAt: "2026-09-26T10:00:00Z",
      files: [
        { ...prepared.files[0], analysisReviews: [], decision: stillCurrent },
        {
          ...prepared.files[1],
          analysisReviews: [review],
          decision: stillCurrent,
        },
      ],
    });
    expect(validated).toStrictEqual([
      ["src/a.ts", f.policy],
      ["src/b.ts", f.policy],
    ]);
  });

  test("stamps the current time by default", () => {
    const prepared = preparedFor(fixture([]));
    identityParse();
    const before = Date.now();
    const record = createImpactReviewRecord(prepared, new Map(), "reviewer");
    const stamped = Date.parse(record.reviewedAt);
    expect(record.reviewedAt).toBe(new Date(stamped).toISOString());
    expect(stamped >= before && stamped <= Date.now()).toBe(true);
  });

  test("requires a reviewer id", () => {
    const prepared = preparedFor(fixture([]));
    expect(() => createImpactReviewRecord(prepared, new Map(), " \t")).toThrow(
      "Reviewer id is required",
    );
  });

  test("decisions must match the inventory exactly", () => {
    const prepared = preparedFor(fixture([staged("src/a.ts")]));
    const message =
      "Decisions must cover exactly the complete non-receipt inventory";
    expect(() => createImpactReviewRecord(prepared, new Map(), "r")).toThrow(
      message,
    );
    expect(() =>
      createImpactReviewRecord(
        prepared,
        new Map([["src/b.ts", { decision: stillCurrent }]]),
        "r",
      ),
    ).toThrow(message);
    expect(() =>
      createImpactReviewRecord(
        prepared,
        new Map([
          ["src/a.ts", { decision: stillCurrent }],
          ["src/b.ts", { decision: stillCurrent }],
        ]),
        "r",
      ),
    ).toThrow(message);
  });
});

describe("evaluateImpactReview", () => {
  function setup(inventory = [staged("src/a.ts"), staged("src/b.ts")]) {
    const f = fixture([...inventory, staged(IMPACT_REVIEW_PATH)]);
    const prepared = preparedFor(f);
    const parse = identityParse();
    spyOn(recordValidation, "validateAnalysisReviews").mockImplementation(
      () => {},
    );
    const record = createImpactReviewRecord(
      prepared,
      new Map(
        prepared.files.map((file) => [file.path, { decision: stillCurrent }]),
      ),
      "reviewer",
      "2026-09-26T10:00:00Z",
    );
    parse.mockRestore();
    const decisions: unknown[][] = [];
    spyOn(
      recordValidation,
      "validateDecisionAgainstSnapshot",
    ).mockImplementation((path, decision, trusted, changed) => {
      decisions.push([path, decision, trusted, changed]);
    });
    let current: unknown = record;
    spyOn(recordValidation, "recordFromCapturedTree").mockImplementation(
      (snapshot) => {
        expect(snapshot).toBe(f.snapshot);
        return current as ImpactReviewRecord;
      },
    );
    const run = (next: unknown = record) => {
      current = next;
      return evaluateImpactReview(f.snapshot, options());
    };
    return { f, prepared, record, decisions, run };
  }

  function failure(message: string) {
    return {
      passed: false,
      diagnostics: [{ code: "impact_review_invalid", message }],
      reviewerAuthority: "none" as const,
    };
  }

  test("accepts a record bound to the prepared snapshot", () => {
    const { f, prepared, record, decisions, run } = setup();
    expect(run()).toStrictEqual({
      passed: true,
      scopeFingerprint: prepared.scopeFingerprint,
      diagnostics: [],
      reviewerAuthority: "self-claimed-local",
    });
    const changed = new Set(["src/a.ts", "src/b.ts", IMPACT_REVIEW_PATH]);
    expect(decisions).toStrictEqual([
      ["src/a.ts", stillCurrent, prepared, changed],
      ["src/b.ts", stillCurrent, prepared, changed],
    ]);
    expect(f.assertUnchanged).toHaveBeenCalledTimes(1);
    expect(record.files.length).toBe(2);
  });

  test("validates analysis reviews of every reviewed file", () => {
    const { f, record, run } = setup();
    const checked: unknown[][] = [];
    spyOn(recordValidation, "validateAnalysisReviews").mockImplementation(
      (file, trusted) => {
        checked.push([file.path, trusted]);
        if (file.path === "src/b.ts") throw new Error("bad review");
      },
    );
    expect(run(record)).toStrictEqual(failure("bad review"));
    expect(checked).toStrictEqual([
      ["src/a.ts", f.policy],
      ["src/b.ts", f.policy],
    ]);
  });

  test("reports a changed snapshot", () => {
    const { f, run } = setup();
    f.assertUnchanged.mockImplementation(() => {
      throw new Error("index moved");
    });
    expect(run()).toStrictEqual(failure("index moved"));
  });

  test("reports a non-Error failure as text", () => {
    const { run } = setup();
    spyOn(recordValidation, "recordFromCapturedTree").mockImplementation(() => {
      throw "no record";
    });
    expect(run()).toStrictEqual(failure("no record"));
  });

  test("rejects stale policy, evaluator, provider and knowledge bindings", () => {
    const { record, run } = setup();
    const other = `sha256:${"9".repeat(64)}`;
    const policyMismatch =
      "Review policy binding does not match trusted base policy";
    for (const policyBinding of [
      { ...record.policy, id: "other" },
      { ...record.policy, version: "2" },
      { ...record.policy, fingerprint: other },
    ])
      expect(run({ ...record, policy: policyBinding })).toStrictEqual(
        failure(policyMismatch),
      );
    for (const evaluatorBinding of [
      { ...record.evaluator, contractVersion: "kibi.impact-evaluator.v0" },
      { ...record.evaluator, fingerprint: other },
    ])
      expect(run({ ...record, evaluator: evaluatorBinding })).toStrictEqual(
        failure("Review evaluator binding is stale"),
      );
    expect(
      run({
        ...record,
        scope: { ...record.scope, providerSetFingerprint: other },
      }),
    ).toStrictEqual(failure("Review provider-set binding is stale"));
    expect(
      run({
        ...record,
        scope: { ...record.scope, knowledgeFingerprint: other },
      }),
    ).toStrictEqual(failure("Review captured-knowledge binding is stale"));
    expect(
      run({ ...record, scope: { ...record.scope, fingerprint: other } }),
    ).toStrictEqual(
      failure(
        `Review scope fingerprint is stale (record ${other}; prepared ${record.scope.fingerprint})`,
      ),
    );
  });

  test("rejects omitted, duplicated and extraneous files", () => {
    const { record, run } = setup();
    const [a, b] = record.files as [
      ImpactReviewRecord["files"][number],
      ImpactReviewRecord["files"][number],
    ];
    expect(run({ ...record, files: [a] })).toStrictEqual(
      failure("Review omits or adds changed paths"),
    );
    expect(run({ ...record, files: [a, a] })).toStrictEqual(
      failure("Duplicate review path: src/a.ts"),
    );
    expect(
      run({ ...record, files: [a, { ...b, path: "src/c.ts" }] }),
    ).toStrictEqual(failure("Review contains extraneous path: src/c.ts"));
  });

  test("names the stale per-file fields in order", () => {
    const { record, run } = setup();
    const [a, b] = record.files as [
      ImpactReviewRecord["files"][number],
      ImpactReviewRecord["files"][number],
    ];
    const { analysisDepth: _depth, ...withoutDepth } = b;
    expect(
      run({
        ...record,
        files: [
          a,
          {
            ...withoutDepth,
            status: "A",
            oldPath: "src/z.ts",
            analysisReviews: [{ kind: "x" }],
            decision: { kind: "y" },
          },
        ],
      }),
    ).toStrictEqual(
      failure(
        "Per-file Git or analysis fingerprint is stale: src/b.ts (analysisDepth, oldPath, status)",
      ),
    );
  });
});
