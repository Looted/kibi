import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateApproval } from "../approval";
import { JsonValueSchema, contractHash } from "../contracts/common";
import { ApprovalSchema } from "../contracts/review";
import { parseRunLockText, runLockHash } from "../contracts/run-lock";
import { buildProposal } from "../proposal";
import { buildReportArtifacts } from "../report";
import { createBaselineVariant, freezeCandidateVariant } from "../variants";

const RUN_LOCK_FIXTURE = join(import.meta.dir, "fixtures/valid-run-lock.json");
const SURFACE = {
  frontmatterHash: "c".repeat(64),
  resourcesHash: "d".repeat(64),
} as const;

function approvalArtifacts() {
  const runLock = parseRunLockText(readFileSync(RUN_LOCK_FIXTURE, "utf8"));
  const baseline = createBaselineVariant({
    skill: "kibi-usage",
    body: "Canonical skill body",
    ...SURFACE,
  });
  const candidate = freezeCandidateVariant({
    skill: "kibi-usage",
    variant: "skillopt",
    body: "Approved candidate body",
    provenance: "skillopt",
    ...SURFACE,
  });
  const report = buildReportArtifacts({
    runId: runLock.runId,
    runLockHash: runLockHash(runLock),
    skill: "kibi-usage",
    cells: [{ score: 96 }],
    privateValues: [],
    priceEquivalentEstimate: {
      currency: "USD",
      amount: 1,
      pricingHash: runLock.pricingHash,
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
  const proposal = buildProposal({
    proposalId: "00000000-0000-4000-8000-000000000102",
    createdAt: "2026-07-23T12:01:00Z",
    report,
    baseline,
    candidate,
  });
  const approval = ApprovalSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "approval",
    approvalId: "00000000-0000-4000-8000-000000000103",
    proposalId: proposal.proposalId,
    proposalHash: contractHash(JsonValueSchema.parse(proposal)),
    runId: runLock.runId,
    runLockHash: runLockHash(runLock),
    reportHash: contractHash(JsonValueSchema.parse(report)),
    candidateBodyHash: candidate.bodyHash,
    reviewer: "offline-reviewer@example.test",
    decision: "approved",
    decidedAt: "2026-07-23T12:02:00Z",
  });
  return { approval, proposal, candidate, runLock, report };
}

describe("SkillOpt approval validation", () => {
  test("accepts exact candidate, run-lock, report, and proposal hashes", () => {
    // Given
    const artifacts = approvalArtifacts();

    // When
    const approval = validateApproval(artifacts);

    // Then
    expect(approval).toEqual(artifacts.approval);
  });

  test("rejects every mismatched approval hash", () => {
    // Given
    const artifacts = approvalArtifacts();
    const mismatch = "e".repeat(64);
    const approvals = [
      { ...artifacts.approval, candidateBodyHash: mismatch },
      { ...artifacts.approval, runLockHash: mismatch },
      { ...artifacts.approval, reportHash: mismatch },
      { ...artifacts.approval, proposalHash: mismatch },
    ];

    // When / Then
    for (const approval of approvals) {
      expect(() => validateApproval({ ...artifacts, approval })).toThrow(
        "approval artifact hash mismatch",
      );
    }
  });

  test("does not mutate canonical skill source while validating approval", () => {
    // Given
    const artifacts = approvalArtifacts();
    const root = mkdtempSync(join(tmpdir(), "skillopt-approval-"));
    const skillPath = join(root, "SKILL.md");
    writeFileSync(skillPath, "canonical-source", "utf8");

    try {
      // When
      validateApproval(artifacts);

      // Then
      expect(readFileSync(skillPath, "utf8")).toBe("canonical-source");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
