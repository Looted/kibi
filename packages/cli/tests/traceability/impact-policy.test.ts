import { describe, expect, test } from "bun:test";
import type { GitChangeSnapshot } from "../../src/traceability/git-change-snapshot.js";
import {
  approvedPartialClass,
  hasValidBaseImpactPolicy,
  impactPolicyFingerprint,
  loadBaseImpactPolicy,
} from "../../src/traceability/impact-policy.js";
import {
  type ImpactPolicy,
  type SideEvidence,
  fingerprint,
} from "../../src/traceability/impact-review.js";

// implements REQ-impact-policy-stage-e-content-bound-review

const FP = `sha256:${"1".repeat(64)}` as const;
const FP2 = `sha256:${"2".repeat(64)}` as const;
const OID = "c".repeat(40);

const POLICY: ImpactPolicy = {
  contractVersion: "kibi.impact-policy.v1",
  id: "policy",
  version: "1",
  allowUnsupportedReview: false,
  allowedPartial: [
    {
      providerId: "p",
      providerFingerprint: FP,
      diagnosticCode: "d1",
      limitationClass: "macro",
    },
    {
      providerId: "p",
      providerFingerprint: FP,
      diagnosticCode: "d2",
      limitationClass: "macro",
    },
    {
      providerId: "p",
      providerFingerprint: FP,
      diagnosticCode: "d3",
      limitationClass: "dynamic",
    },
  ],
  notApplicablePaths: [],
};

type Analysis = NonNullable<SideEvidence["analysis"]>;

function analysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    contractVersion: "c",
    status: "partial",
    language: "ts",
    sourceFile: "a.ts",
    providerId: "p",
    providerStamp: null,
    providerFingerprint: FP,
    inputFingerprint: FP,
    resultFingerprint: FP,
    diagnosticCodes: ["d1"],
    uncoveredRanges: [],
    ...overrides,
  } as Analysis;
}

describe("approvedPartialClass", () => {
  test("returns the one limitation class every code maps to", () => {
    expect(approvedPartialClass(POLICY, analysis())).toBe("macro");
    expect(
      approvedPartialClass(POLICY, analysis({ diagnosticCodes: ["d1", "d2"] })),
    ).toBe("macro");
    expect(
      approvedPartialClass(POLICY, analysis({ diagnosticCodes: ["d3"] })),
    ).toBe("dynamic");
  });

  test("refuses codes spanning several classes", () => {
    expect(
      approvedPartialClass(POLICY, analysis({ diagnosticCodes: ["d1", "d3"] })),
    ).toBeNull();
  });

  test("refuses an unapproved code even next to approved ones", () => {
    expect(
      approvedPartialClass(POLICY, analysis({ diagnosticCodes: ["d1", "zz"] })),
    ).toBeNull();
    expect(
      approvedPartialClass(POLICY, analysis({ diagnosticCodes: ["zz", "d1"] })),
    ).toBeNull();
  });

  test("needs the exact provider and fingerprint", () => {
    expect(
      approvedPartialClass(POLICY, analysis({ providerId: "q" })),
    ).toBeNull();
    expect(
      approvedPartialClass(POLICY, analysis({ providerFingerprint: FP2 })),
    ).toBeNull();
    expect(
      approvedPartialClass(POLICY, analysis({ providerId: null })),
    ).toBeNull();
    expect(
      approvedPartialClass(POLICY, analysis({ providerFingerprint: null })),
    ).toBeNull();
  });

  test("needs a partial analysis with diagnostic codes", () => {
    expect(approvedPartialClass(POLICY, analysis({ status: "ok" }))).toBeNull();
    expect(
      approvedPartialClass(POLICY, analysis({ diagnosticCodes: [] })),
    ).toBeNull();
  });
});

function snapshot(
  listing: string,
  blob?: Buffer,
): GitChangeSnapshot & { calls: (readonly string[])[] } {
  const calls: (readonly string[])[] = [];
  return {
    baseTree: "basetree",
    headTree: "head",
    headCommit: null,
    inventory: [],
    calls,
    readGit(args) {
      calls.push(args);
      return Buffer.from(listing);
    },
    readBlobs: (oids) =>
      new Map(blob ? oids.map((oid) => [oid, blob] as const) : []),
    assertUnchanged() {},
  };
}

const row = (mode: string, type: string) =>
  `${mode} ${type} ${OID}\t.kibi/impact-policy.json\0`;
const policyBytes = Buffer.from(JSON.stringify(POLICY));

describe("loadBaseImpactPolicy", () => {
  test("parses the policy blob of the base tree", () => {
    for (const mode of ["100644", "100755"]) {
      const snap = snapshot(row(mode, "blob"), policyBytes);
      expect(loadBaseImpactPolicy(snap)).toStrictEqual(POLICY);
      expect(snap.calls).toStrictEqual([
        [
          "ls-tree",
          "-z",
          "basetree",
          "--",
          ":(literal).kibi/impact-policy.json",
        ],
      ]);
    }
  });

  test("refuses a missing or non-regular policy", () => {
    const message =
      "Trusted base policy missing or not a regular file: .kibi/impact-policy.json";
    for (const listing of [
      "",
      row("120000", "blob"),
      row("160000", "commit"),
      row("100644", "tree"),
    ]) {
      expect(() =>
        loadBaseImpactPolicy(snapshot(listing, policyBytes)),
      ).toThrow(new Error(message));
    }
  });

  test("refuses a policy blob that is not UTF-8", () => {
    expect(() =>
      loadBaseImpactPolicy(
        snapshot(row("100644", "blob"), Buffer.from([0x7b, 0xff, 0x7d])),
      ),
    ).toThrow(TypeError);
  });

  test("refuses a policy blob the snapshot cannot read", () => {
    expect(() => loadBaseImpactPolicy(snapshot(row("100644", "blob")))).toThrow(
      new Error(
        "Snapshot did not return blob bytes for .kibi/impact-policy.json",
      ),
    );
  });
});

describe("hasValidBaseImpactPolicy", () => {
  test("is false without a base policy", () => {
    expect(hasValidBaseImpactPolicy(snapshot(""))).toBe(false);
  });

  test("is true for a valid base policy and throws for an invalid one", () => {
    expect(
      hasValidBaseImpactPolicy(snapshot(row("100644", "blob"), policyBytes)),
    ).toBe(true);
    expect(() =>
      hasValidBaseImpactPolicy(
        snapshot(row("100644", "blob"), Buffer.from("{}")),
      ),
    ).toThrow(new Error("Impact policy has unknown or missing fields"));
  });
});

describe("impactPolicyFingerprint", () => {
  test("fingerprints the validated policy", () => {
    expect(impactPolicyFingerprint(POLICY)).toBe(fingerprint(POLICY));
    expect(() =>
      impactPolicyFingerprint({ ...POLICY, id: " " } as ImpactPolicy),
    ).toThrow(new Error("Impact policy id and version are required"));
  });
});
