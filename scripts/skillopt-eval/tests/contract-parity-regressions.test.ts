import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  ApprovalSchema,
  JsonValueSchema,
  ProposalSchema,
  RunLockSchema,
  assertApprovalMatchesProposal,
  contractHash,
  parseRunLockText,
} from "../contracts";

const fixturePath = join(import.meta.dir, "fixtures/valid-run-lock.json");
const HASH = "b".repeat(64);
const RUN_ID = "00000000-0000-4000-8000-000000000001";
const PROPOSAL_ID = "00000000-0000-4000-8000-000000000003";

function runLockFixture(): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));
  return z.record(z.string(), z.unknown()).parse(parsed);
}

function acceptedProposal() {
  return ProposalSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "proposal",
    proposalId: PROPOSAL_ID,
    runId: RUN_ID,
    runLockHash: HASH,
    skill: "kibi-usage",
    candidateBodyHash: HASH,
    baselineFrontmatterHash: HASH,
    candidateFrontmatterHash: HASH,
    baselineResourcesHash: HASH,
    candidateResourcesHash: HASH,
    reportHash: HASH,
    createdAt: "2026-07-21T12:00:00Z",
    status: "accepted",
  });
}

function matchingApproval(proposal: ReturnType<typeof acceptedProposal>) {
  return ApprovalSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "approval",
    approvalId: "00000000-0000-4000-8000-000000000004",
    proposalId: proposal.proposalId,
    proposalHash: contractHash(JsonValueSchema.parse(proposal)),
    runId: proposal.runId,
    runLockHash: proposal.runLockHash,
    reportHash: proposal.reportHash,
    candidateBodyHash: proposal.candidateBodyHash,
    reviewer: "reviewer@example.test",
    decision: "approved",
    decidedAt: "2026-07-21T12:00:00Z",
  });
}

describe("SkillOpt cross-runtime parity regressions", () => {
  test("keeps run-lock structure separate from pricing hash semantics", () => {
    const tampered = { ...runLockFixture(), pricingHash: HASH };

    expect(RunLockSchema.safeParse(tampered).success).toBe(true);
    expect(() => parseRunLockText(JSON.stringify(tampered))).toThrow(
      "pricing hash mismatch",
    );
  });

  test("keeps run-lock structure separate from source-lock hash semantics", () => {
    const tampered = { ...runLockFixture(), sourceLockHash: HASH };

    expect(RunLockSchema.safeParse(tampered).success).toBe(true);
    expect(() => parseRunLockText(JSON.stringify(tampered))).toThrow(
      "source lock hash mismatch",
    );
  });

  test("keeps run-lock structure separate from source pin semantics", () => {
    const fixture = runLockFixture();
    const skillopt = z.record(z.string(), z.unknown()).parse(fixture.skillopt);
    const tampered = {
      ...fixture,
      skillopt: { ...skillopt, version: "9.9.9" },
    };

    expect(RunLockSchema.safeParse(tampered).success).toBe(true);
    expect(() => parseRunLockText(JSON.stringify(tampered))).toThrow(
      "source lock mismatch",
    );
  });

  test("rejects every tampered approval hash binding", () => {
    const proposal = acceptedProposal();
    const approval = matchingApproval(proposal);
    const cases = [
      { ...approval, proposalHash: HASH },
      { ...approval, runLockHash: "c".repeat(64) },
      { ...approval, reportHash: "c".repeat(64) },
      { ...approval, candidateBodyHash: "c".repeat(64) },
    ];

    for (const tampered of cases) {
      expect(() =>
        assertApprovalMatchesProposal(proposal, ApprovalSchema.parse(tampered)),
      ).toThrow("approval does not match proposal");
    }
  });
});
