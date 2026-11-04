import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  IMPACT_EVALUATOR_VERSION,
  IMPACT_POLICY_PATH,
  IMPACT_POLICY_VERSION,
  IMPACT_REVIEW_PATH,
  IMPACT_REVIEW_VERSION,
  assertSha256,
  canonicalJson,
  fingerprint,
  fingerprintBytes,
  isGitObjectId,
  parseImpactPolicy,
  parseImpactReviewRecord,
} from "../../src/traceability/impact-review.js";

// biome-ignore lint/suspicious/noExplicitAny: fixtures are edited field by field.
type Row = any;

const H = (digit: string) => `sha256:${digit.repeat(64)}`;

function failure(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }
  return "accepted";
}

describe("constants", () => {
  test("name the contract paths and versions", () => {
    expect([
      IMPACT_POLICY_PATH,
      IMPACT_REVIEW_PATH,
      IMPACT_POLICY_VERSION,
      IMPACT_REVIEW_VERSION,
      IMPACT_EVALUATOR_VERSION,
    ]).toStrictEqual([
      ".kibi/impact-policy.json",
      ".kibi/impact-review.json",
      "kibi.impact-policy.v1",
      "kibi.impact-review.v1",
      "kibi.impact-evaluator.v1",
    ]);
  });
});

describe("canonicalJson", () => {
  test("encodes scalars, arrays and sorted records", () => {
    const shared = [1];
    const record = { z: 1 };
    expect(
      canonicalJson({
        b: [null, "s", true, false, 1.5, shared, shared],
        a: { y: record, x: record },
      }),
    ).toBe(
      '{"a":{"x":{"z":1},"y":{"z":1}},"b":[null,"s",true,false,1.5,[1],[1]]}',
    );
  });

  test("rejects cycles, non-finite numbers and non-JSON values", () => {
    const list: unknown[] = [];
    list.push(list);
    const record: Record<string, unknown> = {};
    record.self = record;
    expect(failure(() => canonicalJson([list]))).toBe(
      "Impact evidence contains a cycle",
    );
    expect(failure(() => canonicalJson({ a: record }))).toBe(
      "Impact evidence contains a cycle",
    );
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY])
      expect(failure(() => canonicalJson([value]))).toBe(
        "Impact evidence contains a non-finite number",
      );
    for (const value of [undefined, () => 1, 1n, Symbol("s")])
      expect(failure(() => canonicalJson({ value }))).toBe(
        "Impact evidence is not JSON-safe",
      );
  });

  test("fingerprints canonical JSON and raw bytes", () => {
    const sha = (value: Buffer): string =>
      `sha256:${createHash("sha256").update(value).digest("hex")}`;
    expect<string>(fingerprint({ b: 1, a: "é" })).toBe(
      sha(Buffer.from('{"a":"é","b":1}', "utf8")),
    );
    expect<string>(fingerprintBytes(Uint8Array.from([0, 255]))).toBe(
      sha(Buffer.from([0, 255])),
    );
  });

  test("checks sha256 fingerprints and Git object ids", () => {
    expect(failure(() => assertSha256(H("a"), "Value"))).toBe("accepted");
    for (const value of [
      `sha256:${"A".repeat(64)}`,
      `sha256:${"a".repeat(63)}`,
      `xsha256:${"a".repeat(64)}`,
      `${H("a")}0`,
    ])
      expect(failure(() => assertSha256(value, "Value"))).toBe(
        "Value must be a sha256 fingerprint",
      );
    expect(
      ["a".repeat(40), "f".repeat(64), "a".repeat(39), "a".repeat(65)].map(
        isGitObjectId,
      ),
    ).toStrictEqual([true, true, false, false]);
    expect(
      [`x${"a".repeat(40)}`, `${"a".repeat(40)}x`, "A".repeat(40)].map(
        isGitObjectId,
      ),
    ).toStrictEqual([false, false, false]);
  });
});

function policy(): Row {
  return {
    notApplicablePaths: ["docs/a.md", "b"],
    allowedPartial: [
      {
        providerId: "p",
        providerFingerprint: H("a"),
        diagnosticCode: "c1",
        limitationClass: "l",
      },
      {
        providerId: "p",
        providerFingerprint: H("a"),
        diagnosticCode: "c2",
        limitationClass: "l",
      },
    ],
    allowUnsupportedReview: false,
    version: "1",
    id: "policy",
    contractVersion: "kibi.impact-policy.v1",
  };
}

function policyError(edit: (value: Row) => void): string {
  const value = policy();
  edit(value);
  return failure(() => parseImpactPolicy(value));
}

describe("parseImpactPolicy", () => {
  test("returns the policy in canonical field order", () => {
    const value = policy();
    const parsed = parseImpactPolicy(value);
    expect(parsed).toStrictEqual({
      contractVersion: "kibi.impact-policy.v1",
      id: "policy",
      version: "1",
      allowUnsupportedReview: false,
      allowedPartial: value.allowedPartial,
      notApplicablePaths: ["docs/a.md", "b"],
    });
    expect(Object.keys(parsed)).toStrictEqual([
      "contractVersion",
      "id",
      "version",
      "allowUnsupportedReview",
      "allowedPartial",
      "notApplicablePaths",
    ]);
  });

  test("rejects a value that is not a record", () => {
    for (const value of [null, [], "policy", 1])
      expect(failure(() => parseImpactPolicy(value))).toBe(
        "Impact policy must be an object",
      );
  });

  test("rejects each malformed top-level field", () => {
    const cases: [(value: Row) => void, string][] = [
      [
        (v) => {
          Reflect.deleteProperty(v, "id");
        },
        "Impact policy has unknown or missing fields",
      ],
      [
        (v) => {
          v.extra = 1;
        },
        "Impact policy has unknown or missing fields",
      ],
      [
        (v) => {
          v.contractVersion = "v0";
        },
        "Unknown impact policy version",
      ],
      [
        (v) => {
          v.id = 1;
        },
        "Impact policy id and version are required",
      ],
      [
        (v) => {
          v.id = " ";
        },
        "Impact policy id and version are required",
      ],
      [
        (v) => {
          v.version = 1;
        },
        "Impact policy id and version are required",
      ],
      [
        (v) => {
          v.version = "\t";
        },
        "Impact policy id and version are required",
      ],
      [
        (v) => {
          v.allowUnsupportedReview = "true";
        },
        "Impact policy allowUnsupportedReview must be boolean",
      ],
      [
        (v) => {
          v.allowedPartial = {};
        },
        "Impact policy lists are required",
      ],
      [
        (v) => {
          v.notApplicablePaths = "a";
        },
        "Impact policy lists are required",
      ],
    ];
    for (const [edit, message] of cases)
      expect(policyError(edit)).toBe(message);
  });

  test("rejects malformed partial allowances by index", () => {
    const cases: [(row: Row) => void, string][] = [
      [
        (row) => {
          row.extra = 1;
        },
        "allowedPartial[1] has unknown or missing fields",
      ],
      [
        (row) => {
          row.providerId = 1;
        },
        "allowedPartial[1] is invalid",
      ],
      [
        (row) => {
          row.providerId = " ";
        },
        "allowedPartial[1] is invalid",
      ],
      [
        (row) => {
          row.diagnosticCode = 1;
        },
        "allowedPartial[1] is invalid",
      ],
      [
        (row) => {
          row.diagnosticCode = " ";
        },
        "allowedPartial[1] is invalid",
      ],
      [
        (row) => {
          row.limitationClass = 1;
        },
        "allowedPartial[1] is invalid",
      ],
      [
        (row) => {
          row.limitationClass = " ";
        },
        "allowedPartial[1] is invalid",
      ],
      [
        (row) => {
          row.providerFingerprint = [H("a")];
        },
        "allowedPartial[1] is invalid",
      ],
      [
        (row) => {
          row.providerFingerprint = "sha256:x";
        },
        "allowedPartial[1] is invalid",
      ],
      [
        (row) => {
          row.diagnosticCode = "c1";
        },
        "Impact policy contains conflicting or duplicate partial allowance selectors",
      ],
    ];
    for (const [edit, message] of cases)
      expect(policyError((value) => edit(value.allowedPartial[1]))).toBe(
        message,
      );
    expect(
      policyError((value) => {
        value.allowedPartial[1] = "row";
      }),
    ).toBe("allowedPartial[1] must be an object");
    expect(
      policyError((value) => {
        value.allowedPartial[1].diagnosticCode = "c1";
        value.allowedPartial[1].limitationClass = "other";
      }),
    ).toBe(
      "Impact policy contains conflicting or duplicate partial allowance selectors",
    );
    for (const field of ["providerId", "providerFingerprint"] as const)
      expect(
        policyError((value) => {
          value.allowedPartial[1].diagnosticCode = "c1";
          value.allowedPartial[1][field] =
            field === "providerId" ? "q" : H("b");
        }),
      ).toBe("accepted");
  });

  test("rejects malformed or repeated not-applicable paths", () => {
    for (const path of [1, " ", "/a", "a\\b", "a//b", "a/", "./a", "a/../b"])
      expect(
        policyError((value) => {
          value.notApplicablePaths = [path];
        }),
      ).toBe("Impact policy has an invalid notApplicablePaths entry");
    expect(
      policyError((value) => {
        value.notApplicablePaths = ["b", "a", "b"];
      }),
    ).toBe("Impact policy duplicates not-applicable path: b");
    expect(
      policyError((value) => {
        value.notApplicablePaths = ["a.b/.c/..d"];
      }),
    ).toBe("accepted");
  });
});

function side(overrides: Row = {}): Row {
  return {
    mode: "100644",
    objectId: "a".repeat(40),
    byteFingerprint: H("1"),
    kind: "regular",
    analysis: null,
    ...overrides,
  };
}

function analysis(overrides: Row = {}): Row {
  return {
    contractVersion: "kibi.symbol-extractor.v2",
    status: "ok",
    language: "typescript",
    sourceFile: "src/a.ts",
    providerId: "provider",
    providerStamp: { plugin: "p" },
    providerFingerprint: H("2"),
    inputFingerprint: H("3"),
    resultFingerprint: H("4"),
    diagnosticCodes: ["CODE"],
    uncoveredRanges: [],
    ...overrides,
  };
}

function range(overrides: Row = {}): Row {
  return {
    startLine: 1,
    startColumn: 0,
    endLine: 1,
    endColumn: 0,
    reason: "macro",
    ...overrides,
  };
}

function file(overrides: Row = {}): Row {
  return {
    path: "src/a.ts",
    status: "M",
    analysisDepth: "symbol",
    disposition: "checked",
    oldHunkRanges: [{ start: 0, end: 0 }],
    newHunkRanges: [{ start: 1, end: 2 }],
    before: side(),
    after: side({ analysis: analysis() }),
    analysisReviews: [],
    decision: { kind: "no_impact", reason: "r", rationale: "why" },
    ...overrides,
  };
}

function record(): Row {
  return {
    files: [file(), file({ path: "src/b.ts" })],
    reviewedAt: "2026-01-02T03:04:05Z",
    reviewer: { id: "me", source: "self-claimed-local" },
    scope: {
      fingerprint: H("7"),
      knowledgeFingerprint: H("8"),
      providerSetFingerprint: H("9"),
    },
    evaluator: {
      contractVersion: "kibi.impact-evaluator.v1",
      fingerprint: H("6"),
    },
    policy: { id: "policy", version: "1", fingerprint: H("5") },
    contractVersion: "kibi.impact-review.v1",
  };
}

function recordError(edit: (value: Row) => void): string {
  const value = record();
  edit(value);
  return failure(() => parseImpactReviewRecord(value));
}

/** Edits the second file row so the index appears in messages. */
function fileError(edit: (row: Row) => void): string {
  return recordError((value) => edit(value.files[1]));
}

describe("parseImpactReviewRecord", () => {
  test("returns the validated value itself", () => {
    const value = record();
    expect(parseImpactReviewRecord(value)).toBe(value);
  });

  test("rejects a value that is not a record", () => {
    for (const value of [null, [], "record"])
      expect(failure(() => parseImpactReviewRecord(value))).toBe(
        "Impact review record must be an object",
      );
  });

  test("rejects malformed envelope fields", () => {
    const cases: [(value: Row) => void, string][] = [
      [
        (v) => {
          v.contractVersion = "v0";
        },
        "Unknown impact review version",
      ],
      [
        (v) => {
          v.extra = 1;
        },
        "Impact review record has unknown or missing fields",
      ],
      [
        (v) => {
          Reflect.deleteProperty(v, "files");
        },
        "Impact review record has unknown or missing fields",
      ],
      [
        (v) => {
          v.policy = [];
        },
        "Impact review record has invalid fields",
      ],
      [
        (v) => {
          v.evaluator = null;
        },
        "Impact review record has invalid fields",
      ],
      [
        (v) => {
          v.scope = "s";
        },
        "Impact review record has invalid fields",
      ],
      [
        (v) => {
          v.reviewer = 1;
        },
        "Impact review record has invalid fields",
      ],
      [
        (v) => {
          v.files = {};
        },
        "Impact review record has invalid fields",
      ],
      [
        (v) => {
          v.policy.extra = 1;
        },
        "Record policy has unknown or missing fields",
      ],
      [
        (v) => {
          Reflect.deleteProperty(v.evaluator, "fingerprint");
        },
        "Record evaluator has unknown or missing fields",
      ],
      [
        (v) => {
          v.scope.extra = 1;
        },
        "Record scope has unknown or missing fields",
      ],
      [
        (v) => {
          Reflect.deleteProperty(v.reviewer, "id");
        },
        "Record reviewer has unknown or missing fields",
      ],
    ];
    for (const [edit, message] of cases)
      expect(recordError(edit)).toBe(message);
  });

  test("rejects each malformed fingerprint", () => {
    for (const edit of [
      (v: Row) => {
        v.policy.fingerprint = [H("a")];
      },
      (v: Row) => {
        v.evaluator.fingerprint = "sha256:x";
      },
      (v: Row) => {
        v.scope.fingerprint = H("Z");
      },
      (v: Row) => {
        v.scope.knowledgeFingerprint = null;
      },
      (v: Row) => {
        v.scope.providerSetFingerprint = "x";
      },
    ])
      expect(recordError(edit)).toBe(
        "Impact review record has an invalid fingerprint",
      );
  });

  test("rejects an invalid identity", () => {
    for (const edit of [
      (v: Row) => {
        v.policy.id = 1;
      },
      (v: Row) => {
        v.policy.version = 1;
      },
      (v: Row) => {
        v.evaluator.contractVersion = "kibi.impact-evaluator.v0";
      },
      (v: Row) => {
        v.reviewer.id = 1;
      },
      (v: Row) => {
        v.reviewer.id = " ";
      },
      (v: Row) => {
        v.reviewer.source = "ci";
      },
    ])
      expect(recordError(edit)).toBe("Impact review identity is invalid");
    expect(
      recordError((v) => {
        v.policy.id = "";
        v.policy.version = "";
      }),
    ).toBe("accepted");
  });

  test("accepts only RFC 3339 timestamps that name a real instant", () => {
    for (const reviewedAt of [
      "2026-01-02T03:04:05Z",
      "2026-01-02T03:04:05.123Z",
      "2026-01-02T03:04:05.1+02:00",
      "2026-01-02T03:04:05-05:30",
    ])
      expect(
        recordError((v) => {
          v.reviewedAt = reviewedAt;
        }),
      ).toBe("accepted");
    for (const reviewedAt of [
      ["2026-01-02T03:04:05Z"],
      "+002026-01-02T03:04:05Z",
      "2026-01-02T03:04:05Z\u0000",
      "2026-01-02",
      "x2026-01-02T03:04:05Z",
      "2026-01-02T03:04:05Zx",
      "2026-01-02 03:04:05Z",
      "2026-01-02T03:04:05",
      "2026-01-02T03:04:05.Z",
      "2026-01-02T03:04:05+0200",
      "2026-01-02T03:04:05*02:00",
      "026-01-02T03:04:05Z",
      "2026-1-02T03:04:05Z",
      "2026-01-2T03:04:05Z",
      "2026-01-02T3:04:05Z",
      "2026-01-02T03:4:05Z",
      "2026-01-02T03:04:5Z",
      "2026-01-02T03:04:05+2:00",
      "2026-01-02T03:04:05+02:0",
      "2026-13-02T03:04:05Z",
      "2026-01-02T25:04:05Z",
    ])
      expect(
        recordError((v) => {
          v.reviewedAt = reviewedAt;
        }),
      ).toBe("Impact review timestamp is invalid");
  });

  test("rejects malformed file rows", () => {
    expect(fileError(() => {})).toBe("accepted");
    expect(
      recordError((v) => {
        v.files[1] = [];
      }),
    ).toBe("files[1] must be an object");
    const cases: [(row: Row) => void, string][] = [
      [
        (r) => {
          r.extra = 1;
        },
        "files[1] has unknown or missing fields",
      ],
      [
        (r) => {
          Reflect.deleteProperty(r, "decision");
        },
        "files[1] has unknown or missing fields",
      ],
      [
        (r) => {
          r.path = 1;
        },
        "files[1] has an invalid path",
      ],
      [
        (r) => {
          r.path = "";
        },
        "files[1] has an invalid path",
      ],
      [
        (r) => {
          r.path = IMPACT_REVIEW_PATH;
        },
        "files[1] has an invalid path",
      ],
      [
        (r) => {
          r.path = "/a";
        },
        "files[1] has an invalid path",
      ],
      [
        (r) => {
          r.path = "a\\b";
        },
        "files[1] has an invalid path",
      ],
      [
        (r) => {
          r.path = "a//b";
        },
        "files[1] has an invalid path",
      ],
      [
        (r) => {
          r.path = "./a";
        },
        "files[1] has an invalid path",
      ],
      [
        (r) => {
          r.path = "a/..";
        },
        "files[1] has an invalid path",
      ],
      [
        (r) => {
          r.path = "src/a.ts";
        },
        "Duplicate impact review path: src/a.ts",
      ],
      [
        (r) => {
          r.status = "X";
        },
        "files[1] has an invalid status",
      ],
      [
        (r) => {
          r.status = 1;
        },
        "files[1] has an invalid status",
      ],
      [
        (r) => {
          r.oldPath = "";
        },
        "files[1] has an invalid oldPath",
      ],
      [
        (r) => {
          r.oldPath = 1;
        },
        "files[1] has an invalid oldPath",
      ],
      [
        (r) => {
          r.copyFromPath = "";
        },
        "files[1] has an invalid copyFromPath",
      ],
      [
        (r) => {
          r.copyFromPath = 1;
        },
        "files[1] has an invalid copyFromPath",
      ],
      [
        (r) => {
          r.analysisDepth = "deep";
        },
        "files[1] has invalid analysis disposition",
      ],
      [
        (r) => {
          r.disposition = "x";
        },
        "files[1] has invalid analysis disposition",
      ],
      [
        (r) => {
          r.skipReason = "x";
        },
        "files[1] has invalid skipReason",
      ],
      [
        (r) => {
          r.gitMode = 1;
        },
        "files[1] has invalid mode metadata",
      ],
      [
        (r) => {
          r.previousMode = 1;
        },
        "files[1] has invalid mode metadata",
      ],
      [
        (r) => {
          r.oldHunkRanges = {};
        },
        "files[1] is malformed",
      ],
      [
        (r) => {
          r.newHunkRanges = {};
        },
        "files[1] is malformed",
      ],
      [
        (r) => {
          r.analysisReviews = {};
        },
        "files[1] is malformed",
      ],
      [
        (r) => {
          r.decision = [];
        },
        "files[1] is malformed",
      ],
    ];
    for (const [edit, message] of cases) expect(fileError(edit)).toBe(message);
  });

  test("accepts every known status, depth, disposition, skip reason and mode", () => {
    const accepted: ((row: Row) => void)[] = [
      ...["A", "M", "R", "C", "T", "D"].map((status) => (r: Row) => {
        r.status = status;
      }),
      ...["symbol", "metadata", "file", "none"].map((depth) => (r: Row) => {
        r.analysisDepth = depth;
      }),
      ...["checked", "advisory", "skipped"].map((disposition) => (r: Row) => {
        r.disposition = disposition;
      }),
      ...["binary", "unsupported_encoding", "symlink", "submodule"].map(
        (reason) => (r: Row) => {
          r.skipReason = reason;
        },
      ),
      (r) => {
        r.oldPath = "src/old.ts";
        r.copyFromPath = "src/c.ts";
        r.gitMode = "100755";
        r.previousMode = "100644";
      },
    ];
    for (const edit of accepted) expect(fileError(edit)).toBe("accepted");
  });

  test("rejects malformed hunk ranges", () => {
    for (const hunk of [
      "h",
      { start: 1 },
      { start: 1, end: 1, extra: 1 },
      { start: 1.5, end: 2 },
      { start: 1, end: 2.5 },
      { start: -1, end: 2 },
      { start: 3, end: 2 },
    ]) {
      expect(
        fileError((r) => {
          r.newHunkRanges = [hunk];
        }),
      ).toBe("files[1] has an invalid hunk range");
      expect(
        fileError((r) => {
          r.oldHunkRanges = [hunk];
        }),
      ).toBe("files[1] has an invalid hunk range");
    }
    expect(
      fileError((r) => {
        r.newHunkRanges = [{ end: 4, start: 4 }];
      }),
    ).toBe("accepted");
  });

  test("requires a captured side and KB paths for projections", () => {
    expect(
      fileError((r) => {
        r.before = null;
        r.after = null;
      }),
    ).toBe("files[1] has no Git side");
    expect(
      fileError((r) => {
        r.before = null;
      }),
    ).toBe("accepted");
    expect(
      fileError((r) => {
        r.after = null;
      }),
    ).toBe("accepted");
    const projected = side({
      objectId: null,
      contentProjection: "proof_receipts_stripped",
    });
    for (const path of [".kb/a.md", ".kb/x/y.md"])
      expect(
        fileError((r) => {
          r.path = path;
          r.before = projected;
          r.after = projected;
        }),
      ).toBe("accepted");
    for (const [path, which] of [
      ["src/a.md", "before"],
      [".kb/a.txt", "after"],
      ["docs/.kb/a.md", "before"],
    ] as const)
      expect(
        fileError((r) => {
          r.path = path;
          r[which] = projected;
        }),
      ).toBe(
        "files[1] uses a KB markdown projection outside a KB markdown path",
      );
  });
});

describe("side evidence", () => {
  function sideError(which: "before" | "after", edit: (side: Row) => void) {
    return fileError((r) => {
      r.path = ".kb/a.md";
      edit(r[which]);
    });
  }

  test("checks the Git entry of each side", () => {
    expect(
      fileError((r) => {
        r.after = "side";
      }),
    ).toBe("files[1].after must be an object");
    expect(
      fileError((r) => {
        r.before = [];
      }),
    ).toBe("files[1].before must be an object");
    const invalid = "files[1].before has invalid Git-side evidence";
    const cases: [(side: Row) => void, string][] = [
      [
        (s) => {
          s.extra = 1;
        },
        "files[1].before has unknown or missing fields",
      ],
      [
        (s) => {
          Reflect.deleteProperty(s, "kind");
        },
        "files[1].before has unknown or missing fields",
      ],
      [
        (s) => {
          s.mode = 100644;
        },
        invalid,
      ],
      [
        (s) => {
          s.mode = "100600";
        },
        invalid,
      ],
      [
        (s) => {
          s.kind = "symlink";
        },
        invalid,
      ],
      [
        (s) => {
          s.objectId = null;
        },
        invalid,
      ],
      [
        (s) => {
          s.objectId = ["a".repeat(40)];
        },
        invalid,
      ],
      [
        (s) => {
          s.objectId = "A".repeat(40);
        },
        invalid,
      ],
      [
        (s) => {
          s.objectId = "a".repeat(39);
        },
        invalid,
      ],
      [
        (s) => {
          s.byteFingerprint = [H("a")];
        },
        invalid,
      ],
      [
        (s) => {
          s.byteFingerprint = "sha256:x";
        },
        invalid,
      ],
      [
        (s) => {
          s.analysis = [];
        },
        invalid,
      ],
      [
        (s) => {
          s.analysis = "a";
        },
        invalid,
      ],
      [
        (s) => {
          s.contentProjection = "other";
        },
        invalid,
      ],
      [
        (s) => {
          s.contentProjection = undefined;
        },
        invalid,
      ],
      [
        (s) => {
          s.contentProjection = "proof_receipts_stripped";
        },
        invalid,
      ],
    ];
    for (const [edit, message] of cases)
      expect(sideError("before", edit)).toBe(message);
    for (const [mode, kind] of [
      ["100644", "regular"],
      ["100755", "regular"],
      ["120000", "symlink"],
      ["160000", "gitlink"],
    ])
      expect(
        sideError("before", (s) => {
          s.mode = mode;
          s.kind = kind;
          s.objectId = "f".repeat(64);
        }),
      ).toBe("accepted");
    expect(
      sideError("before", (s) => {
        s.contentProjection = "proof_receipts_stripped";
        s.objectId = null;
      }),
    ).toBe("accepted");
  });

  test("checks the analysis fields of each side", () => {
    const fields = "files[1].after.analysis has invalid source analysis fields";
    const cases: [(a: Row) => void, string][] = [
      [
        (a) => {
          a.extra = 1;
        },
        "files[1].after.analysis has unknown or missing fields",
      ],
      [
        (a) => {
          a.contractVersion = "v1";
        },
        fields,
      ],
      [
        (a) => {
          a.status = "done";
        },
        fields,
      ],
      [
        (a) => {
          a.language = 1;
        },
        fields,
      ],
      [
        (a) => {
          a.language = " ";
        },
        fields,
      ],
      [
        (a) => {
          a.sourceFile = 1;
        },
        fields,
      ],
      [
        (a) => {
          a.sourceFile = " ";
        },
        fields,
      ],
      [
        (a) => {
          a.providerId = 1;
        },
        fields,
      ],
      [
        (a) => {
          a.providerId = " ";
        },
        fields,
      ],
      [
        (a) => {
          a.diagnosticCodes = "CODE";
        },
        fields,
      ],
      [
        (a) => {
          a.diagnosticCodes = [1];
        },
        fields,
      ],
      [
        (a) => {
          a.diagnosticCodes = ["A", " "];
        },
        fields,
      ],
      [
        (a) => {
          a.uncoveredRanges = {};
        },
        fields,
      ],
      [
        (a) => {
          a.providerStamp = { at: undefined };
        },
        "files[1].after.analysis.providerStamp is not JSON-safe",
      ],
      [
        (a) => {
          a.providerFingerprint = [H("a")];
        },
        "files[1].after.analysis has invalid fingerprints",
      ],
      [
        (a) => {
          a.providerFingerprint = "sha256:x";
        },
        "files[1].after.analysis has invalid fingerprints",
      ],
      [
        (a) => {
          a.inputFingerprint = [H("a")];
        },
        "files[1].after.analysis has invalid fingerprints",
      ],
      [
        (a) => {
          a.inputFingerprint = "sha256:x";
        },
        "files[1].after.analysis has invalid fingerprints",
      ],
      [
        (a) => {
          a.resultFingerprint = [H("a")];
        },
        "files[1].after.analysis has invalid fingerprints",
      ],
      [
        (a) => {
          a.resultFingerprint = "sha256:x";
        },
        "files[1].after.analysis has invalid fingerprints",
      ],
      [
        (a) => {
          a.status = "partial";
        },
        "files[1].after.analysis status/range mismatch",
      ],
      [
        (a) => {
          a.uncoveredRanges = [range()];
        },
        "files[1].after.analysis status/range mismatch",
      ],
    ];
    for (const [edit, message] of cases)
      expect(fileError((r) => edit(r.after.analysis))).toBe(message);
    for (const edit of [
      (a: Row) => {
        a.providerId = null;
      },
      (a: Row) => {
        a.providerFingerprint = null;
      },
      (a: Row) => {
        a.diagnosticCodes = [];
      },
      (a: Row) => {
        a.status = "partial";
        a.uncoveredRanges = [range()];
      },
      (a: Row) => {
        a.status = "unsupported";
        a.uncoveredRanges = [range()];
      },
      (a: Row) => {
        a.status = "failed";
      },
      (a: Row) => {
        a.status = "unsupported";
      },
    ])
      expect(fileError((r) => edit(r.after.analysis))).toBe("accepted");
  });

  test("checks every uncovered range", () => {
    const at = "files[1].after.analysis.uncoveredRanges[1]";
    const cases: [Row, string][] = [
      ["r", `${at} is invalid`],
      [range({ extra: 1 }), `${at} has unknown or missing fields`],
      [range({ startLine: 0, endLine: 1 }), `${at} is invalid`],
      [range({ startLine: 1.5 }), `${at} is invalid`],
      [range({ startColumn: -1 }), `${at} is invalid`],
      [range({ startColumn: 0.5 }), `${at} is invalid`],
      [range({ startLine: 3, endLine: 2 }), `${at} is invalid`],
      [range({ endLine: 1.5 }), `${at} is invalid`],
      [range({ endColumn: -1 }), `${at} is invalid`],
      [range({ endLine: 2, endColumn: -1 }), `${at} is invalid`],
      [range({ endColumn: 0.5 }), `${at} is invalid`],
      [range({ reason: 1 }), `${at} is invalid`],
      [range({ reason: " " }), `${at} is invalid`],
      [range({ startColumn: 4, endColumn: 3 }), `${at} is invalid`],
    ];
    const edit = (second: Row) =>
      fileError((r) => {
        r.after.analysis.status = "partial";
        r.after.analysis.uncoveredRanges = [range(), second];
      });
    for (const [second, message] of cases) expect(edit(second)).toBe(message);
    for (const second of [
      range({ startColumn: 4, endColumn: 4 }),
      range({ startColumn: 4, endLine: 2, endColumn: 3 }),
    ])
      expect(edit(second)).toBe("accepted");
  });
});

describe("decisions", () => {
  const decisionError = (decision: Row) =>
    fileError((r) => {
      r.decision = decision;
    });
  const entity = (overrides: Row = {}): Row => ({
    entityId: "REQ-1",
    artifactPath: ".kb/req.md",
    beforeFingerprint: H("a"),
    afterFingerprint: H("b"),
    ...overrides,
  });
  const updated = (knowledge: Row = {}): Row => ({
    kind: "impact",
    requirementIds: ["REQ-1"],
    knowledge: { state: "updated", entities: [entity()], ...knowledge },
  });

  test("accepts each well-formed decision", () => {
    for (const decision of [
      { kind: "no_impact", reason: "r", rationale: "why" },
      { kind: "not_applicable", policyReason: "p", rationale: "why" },
      {
        kind: "impact",
        requirementIds: ["REQ-1", "REQ-2"],
        knowledge: { state: "still_current", rationale: "why" },
      },
      updated(),
      updated({
        stillCurrent: [
          { requirementId: "REQ-2", rationale: "a" },
          { requirementId: "REQ-2", rationale: "b" },
        ],
      }),
      updated({
        entities: [
          entity(),
          entity({ entityId: "REQ-2", beforeFingerprint: null }),
        ],
      }),
    ])
      expect(decisionError(decision)).toBe("accepted");
  });

  test("rejects malformed impact decisions", () => {
    const required =
      "Impact decision requires requirement IDs and knowledge evidence";
    const cases: [Row, string][] = [
      [{ kind: "other" }, "Unknown impact decision kind"],
      [
        { ...updated(), extra: 1 },
        "Impact decision has unknown or missing fields",
      ],
      [{ ...updated(), requirementIds: "REQ-1" }, required],
      [{ ...updated(), requirementIds: [] }, required],
      [{ ...updated(), requirementIds: ["REQ-1", 2] }, required],
      [{ ...updated(), requirementIds: ["REQ-1", " "] }, required],
      [{ ...updated(), knowledge: [] }, required],
      [
        { ...updated(), knowledge: { state: "stale" } },
        "Unknown impact knowledge state",
      ],
      [
        {
          ...updated(),
          knowledge: { state: "still_current", rationale: "r", extra: 1 },
        },
        "still_current evidence has unknown or missing fields",
      ],
      [
        { ...updated(), knowledge: { state: "still_current", rationale: 1 } },
        "still_current requires rationale",
      ],
      [
        { ...updated(), knowledge: { state: "still_current", rationale: " " } },
        "still_current requires rationale",
      ],
      [updated({ extra: 1 }), "updated evidence has unknown or missing fields"],
      [
        { ...updated(), knowledge: { state: "updated" } },
        "updated evidence has unknown or missing fields",
      ],
      [
        updated({ entities: "e" }),
        "updated evidence requires entity fingerprints",
      ],
      [
        updated({ entities: [] }),
        "updated evidence requires entity fingerprints",
      ],
      [updated({ stillCurrent: {} }), "stillCurrent must be an array"],
      [
        updated({ stillCurrent: ["REQ-2"] }),
        "stillCurrent requirement acknowledgment is invalid",
      ],
      [
        updated({
          stillCurrent: [{ requirementId: "REQ-2", rationale: "r", x: 1 }],
        }),
        "stillCurrent requirement acknowledgment has unknown or missing fields",
      ],
      ...[
        { requirementId: 1, rationale: "r" },
        { requirementId: " ", rationale: "r" },
        { requirementId: "REQ-2", rationale: 1 },
        { requirementId: "REQ-2", rationale: " " },
      ].map((item): [Row, string] => [
        updated({ stillCurrent: [item] }),
        "stillCurrent requirement acknowledgment requires an ID and rationale",
      ]),
      [
        updated({
          stillCurrent: [
            { requirementId: "REQ-2", rationale: "r" },
            { rationale: "r", requirementId: "REQ-2" },
          ],
        }),
        "stillCurrent duplicates acknowledgment REQ-2",
      ],
      [updated({ entities: ["e"] }), "updated entity evidence is invalid"],
      [
        updated({ entities: [entity({ extra: 1 })] }),
        "updated entity evidence has unknown or missing fields",
      ],
      ...[
        { entityId: 1 },
        { artifactPath: 1 },
        { artifactPath: "/abs.md" },
        { artifactPath: ".kb\\a.md" },
        { artifactPath: ".kb//a.md" },
        { artifactPath: "./a.md" },
        { artifactPath: "../a.md" },
        { beforeFingerprint: [H("a")] },
        { beforeFingerprint: "sha256:x" },
        { afterFingerprint: null },
        { afterFingerprint: [H("a")] },
        { afterFingerprint: "sha256:x" },
      ].map((overrides): [Row, string] => [
        updated({ entities: [entity(overrides)] }),
        "updated entity fingerprint is invalid",
      ]),
      [
        updated({ entities: [entity(), entity()] }),
        "updated evidence duplicates entity REQ-1",
      ],
    ];
    for (const [decision, message] of cases)
      expect(decisionError(decision)).toBe(message);
  });

  test("rejects malformed no-impact and not-applicable decisions", () => {
    const cases: [Row, string][] = [
      [
        { kind: "no_impact", reason: "r", rationale: "w", x: 1 },
        "no_impact decision has unknown or missing fields",
      ],
      ...[
        { reason: 1, rationale: "w" },
        { reason: " ", rationale: "w" },
        { reason: "r", rationale: 1 },
        { reason: "r", rationale: " " },
      ].map((fields): [Row, string] => [
        { kind: "no_impact", ...fields },
        "no_impact requires a reason and rationale",
      ]),
      [
        { kind: "not_applicable", policyReason: "p", rationale: "w", x: 1 },
        "not_applicable decision has unknown or missing fields",
      ],
      ...[
        { policyReason: 1, rationale: "w" },
        { policyReason: " ", rationale: "w" },
        { policyReason: "p", rationale: 1 },
        { policyReason: "p", rationale: " " },
      ].map((fields): [Row, string] => [
        { kind: "not_applicable", ...fields },
        "not_applicable requires policy reason and rationale",
      ]),
    ];
    for (const [decision, message] of cases)
      expect(decisionError(decision)).toBe(message);
  });
});

describe("analysis reviews", () => {
  const reviewError = (...reviews: Row[]) =>
    fileError((r) => {
      r.analysisReviews = reviews;
    });
  const unsupported = (overrides: Row = {}): Row => ({
    kind: "unsupported_review",
    side: "after",
    wholeFile: true,
    rationale: "why",
    ...overrides,
  });
  const partial = (overrides: Row = {}): Row => ({
    kind: "partial_review",
    side: "before",
    limitationClass: "macro",
    ranges: [range({ startLine: 2, endLine: 3 })],
    rationale: "why",
    ...overrides,
  });

  test("accepts well-formed reviews on either side", () => {
    expect(
      reviewError(
        unsupported(),
        unsupported({ side: "before" }),
        partial(),
        partial({ side: "after" }),
      ),
    ).toBe("accepted");
    expect(
      reviewError(
        partial({
          ranges: [
            range({ startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 }),
          ],
        }),
      ),
    ).toBe("accepted");
  });

  test("rejects malformed reviews", () => {
    const cases: [Row, string][] = [
      ["review", "Analysis review must be an object"],
      [{ kind: "other" }, "Unknown analysis review kind"],
      [
        unsupported({ x: 1 }),
        "unsupported review has unknown or missing fields",
      ],
      [unsupported({ side: "both" }), "Unsupported review is invalid"],
      [unsupported({ wholeFile: "true" }), "Unsupported review is invalid"],
      [unsupported({ rationale: 1 }), "Unsupported review is invalid"],
      [unsupported({ rationale: " " }), "Unsupported review is invalid"],
      [partial({ x: 1 }), "partial review has unknown or missing fields"],
      [partial({ side: "both" }), "Partial review is invalid"],
      [partial({ limitationClass: 1 }), "Partial review is invalid"],
      [partial({ limitationClass: " " }), "Partial review is invalid"],
      [partial({ ranges: "r" }), "Partial review is invalid"],
      [partial({ ranges: [] }), "Partial review is invalid"],
      [partial({ rationale: 1 }), "Partial review is invalid"],
      [partial({ rationale: " " }), "Partial review is invalid"],
      [partial({ ranges: [range(), "r"] }), "Partial review range is invalid"],
      [
        partial({ ranges: [range({ x: 1 })] }),
        "partial review range has unknown or missing fields",
      ],
      ...[
        { startLine: 0 },
        { startLine: 1.5 },
        { startColumn: -1 },
        { startColumn: 0.5 },
        { endLine: 0 },
        { endLine: 1.5 },
        { endColumn: -1 },
        { endColumn: 0.5 },
        { reason: 1 },
        { reason: " " },
      ].map((overrides): [Row, string] => [
        partial({ ranges: [range(overrides)] }),
        "Partial review range is invalid",
      ]),
    ];
    for (const [review, message] of cases)
      expect(reviewError(unsupported(), review)).toBe(message);
  });
});
