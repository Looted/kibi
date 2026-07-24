import { describe, expect, test } from "bun:test";
import { JsonValueSchema, contractHash } from "../contracts/common";
import { buildProposal } from "../proposal";
import { buildReportArtifacts } from "../report";
import { createBaselineVariant, freezeCandidateVariant } from "../variants";

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

function report(gateOutcome: "pass" | "fail" = "pass") {
  return buildReportArtifacts({
    runId: "00000000-0000-4000-8000-000000000101",
    runLockHash: HASH.runLock,
    skill: "kibi-usage",
    cells: [{ score: gateOutcome === "pass" ? 95 : 40 }],
    privateValues: [],
    priceEquivalentEstimate: {
      currency: "USD",
      amount: 1,
      pricingHash: HASH.pricing,
      kind: "price-equivalent-estimate-not-invoice",
    },
    gateOutcome,
    gateResults: {
      aggregate: gateOutcome === "pass",
      bootstrap: true,
      family: true,
      security: true,
      bundle: null,
    },
    generatedAt: "2026-07-23T12:00:00Z",
  }).report;
}

describe("SkillOpt proposal generation", () => {
  test("generates an eligible proposal only from a passing report", () => {
    // Given
    const frozen = variants();
    const passingReport = report();

    // When
    const proposal = buildProposal({
      proposalId: "00000000-0000-4000-8000-000000000102",
      createdAt: "2026-07-23T12:01:00Z",
      report: passingReport,
      ...frozen,
    });

    // Then
    expect(proposal.status).toBe("eligible");
    expect(proposal.candidateBodyHash).toBe(frozen.candidate.bodyHash);
    expect(proposal.reportHash).toBe(
      contractHash(JsonValueSchema.parse(passingReport)),
    );
    expect(proposal.runLockHash).toBe(HASH.runLock);
  });

  test("rejects proposal generation from a failing report", () => {
    // Given
    const frozen = variants();
    const failingReport = report("fail");

    // When
    const build = () =>
      buildProposal({
        proposalId: "00000000-0000-4000-8000-000000000102",
        createdAt: "2026-07-23T12:01:00Z",
        report: failingReport,
        ...frozen,
      });

    // Then
    expect(build).toThrow("only passing reports can produce proposals");
  });

  test("rejects candidates whose immutable skill surfaces differ", () => {
    // Given
    const frozen = variants();
    const candidate = {
      ...frozen.candidate,
      resourcesHash: "e".repeat(64),
    };

    // When
    const build = () =>
      buildProposal({
        proposalId: "00000000-0000-4000-8000-000000000102",
        createdAt: "2026-07-23T12:01:00Z",
        report: report(),
        baseline: frozen.baseline,
        candidate,
      });

    // Then
    expect(build).toThrow("candidate resources differ from baseline");
  });
});
