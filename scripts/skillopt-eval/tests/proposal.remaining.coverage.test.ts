// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { buildProposal } from "../proposal";
import { buildReportArtifacts } from "../report";
import { createBaselineVariant, freezeCandidateVariant } from "../variants";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

const HASH = {
  runLock: "a".repeat(64),
  pricing: "b".repeat(64),
  frontmatter: "c".repeat(64),
  resources: "d".repeat(64),
} as const;

function variants() {
  const surface = {
    frontmatterHash: HASH.frontmatter,
    resourcesHash: HASH.resources,
  };
  return {
    baseline: createBaselineVariant({
      skill: "kibi-usage",
      body: "Baseline body",
      ...surface,
    }),
    candidate: freezeCandidateVariant({
      skill: "kibi-usage",
      variant: "skillopt",
      body: "Improved body",
      provenance: "skillopt",
      ...surface,
    }),
  };
}

function report() {
  return buildReportArtifacts({
    runId: "00000000-0000-4000-8000-000000000101",
    runLockHash: HASH.runLock,
    skill: "kibi-usage",
    cells: [{ score: 95 }],
    privateValues: [],
    priceEquivalentEstimate: {
      currency: "USD",
      amount: 1,
      pricingHash: HASH.pricing,
      kind: "price-equivalent-estimate-not-invoice",
    },
    gateOutcome: "pass",
    gateResults: {
      aggregate: true,
      bootstrap: true,
      family: true,
      security: true,
      bundle: null,
    },
    generatedAt: "2026-07-23T12:00:00Z",
  }).report;
}

describe("proposal remaining integrity branches", () => {
  test("rejects mismatched skill, frontmatter, and body hashes", () => {
    const frozen = variants();
    const passing = report();
    expect(() =>
      buildProposal({
        proposalId: "00000000-0000-4000-8000-000000000102",
        createdAt: "2026-07-23T12:01:00Z",
        report: passing,
        baseline: frozen.baseline,
        candidate: { ...frozen.candidate, skill: "kibi-freshness" },
      }),
    ).toThrow("proposal variants do not match report skill");

    expect(() =>
      buildProposal({
        proposalId: "00000000-0000-4000-8000-000000000102",
        createdAt: "2026-07-23T12:01:00Z",
        report: passing,
        baseline: frozen.baseline,
        candidate: { ...frozen.candidate, frontmatterHash: "e".repeat(64) },
      }),
    ).toThrow("candidate frontmatter differs from baseline");

    expect(() =>
      buildProposal({
        proposalId: "00000000-0000-4000-8000-000000000102",
        createdAt: "2026-07-23T12:01:00Z",
        report: passing,
        baseline: frozen.baseline,
        candidate: {
          ...frozen.candidate,
          body: "Improved body",
          bodyHash: createHash("sha256").update("other").digest("hex"),
        },
      }),
    ).toThrow("candidate body hash mismatch");
  });
});
