// implements REQ-skillopt-predicate-first-requirements
import { describe, expect, test } from "bun:test";
import { DETERMINISTIC_CANDIDATES } from "../fixtures/predicate-corpus";
import { freezeMaterialization } from "../fixtures/predicate-materialization";

const DIGEST = "a".repeat(64);

describe("freezeMaterialization remaining adaptive-candidate branch", () => {
  test("withAdaptiveCandidate freezes an ineligible copy with a distinct skillopt hash", () => {
    const roots = {
      corpus: DIGEST,
      evaluator: DIGEST,
      querySet: DIGEST,
      baseline: DIGEST,
      catalog: DIGEST,
      verifier: DIGEST,
      publicRoot: DIGEST,
      privateRoot: DIGEST,
      artifactSchema: DIGEST,
    };
    const frozen = freezeMaterialization({
      roots,
      candidateRootManifest: {
        schemaVersion: "predicate-candidate-root-manifest-1.0.0",
        artifactType: "predicate-candidate-root-manifest",
        roots,
        signedByRootAuthority: true,
        unsignedRationale: "unsigned",
      },
      trainCaseIds: ["train-1"],
      developmentCaseId: "dev-1",
      heldOutCaseIds: ["held-1"],
      privateCaseMap: new Map(),
      publicRootDir: "/tmp/predicate-public",
      privateRootDir: "/tmp/predicate-private",
    });

    const adaptive = frozen.withAdaptiveCandidate();
    expect(adaptive.eligibility()).toEqual({ eligible: false });
    expect(adaptive.frozenCandidateHashes.baseline).toBe(
      DETERMINISTIC_CANDIDATES.baseline,
    );
    expect(adaptive.frozenCandidateHashes.skillopt).not.toBe(
      DETERMINISTIC_CANDIDATES.skillopt,
    );
    expect(adaptive.candidateRootManifest.unsignedRationale).toContain(
      "permanently ineligible",
    );
    expect(() => adaptive.assertAuthorized()).toThrow(
      /adaptive candidate after held-out is ineligible/,
    );
  });
});
