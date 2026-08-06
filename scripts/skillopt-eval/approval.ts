import { createHash } from "node:crypto";
import type { z } from "zod";
import {
  ContractIntegrityError,
  JsonValueSchema,
  contractHash,
} from "./contracts/common";
import {
  type Approval,
  ApprovalSchema,
  type Proposal,
  ProposalSchema,
  assertApprovalMatchesProposal,
} from "./contracts/review";
import { type RunLock, RunLockSchema, runLockHash } from "./contracts/run-lock";
import { ReportV1Schema } from "./contracts/workflow";
import type { FrozenVariant } from "./variants";

type ReportV1 = Readonly<z.infer<typeof ReportV1Schema>>;

// implements REQ-skillopt-codex-optimization
export type ValidateApprovalInput = Readonly<{
  approval: Approval;
  proposal: Proposal;
  candidate: FrozenVariant;
  runLock: RunLock;
  report: ReportV1;
}>;

// implements REQ-skillopt-codex-optimization
export function validateApproval(input: ValidateApprovalInput): Approval {
  const approval = ApprovalSchema.parse(input.approval);
  const proposal = ProposalSchema.parse(input.proposal);
  const runLock = RunLockSchema.parse(input.runLock);
  const report = ReportV1Schema.parse(input.report);
  const candidateBodyHash = createHash("sha256")
    .update(input.candidate.body, "utf8")
    .digest("hex");
  const actualRunLockHash = runLockHash(runLock);
  const actualReportHash = contractHash(JsonValueSchema.parse(report));
  const actualProposalHash = contractHash(JsonValueSchema.parse(proposal));

  if (
    runLock.dirtyState.isDirty ||
    input.candidate.variant !== "skillopt" ||
    candidateBodyHash !== input.candidate.bodyHash ||
    approval.candidateBodyHash !== candidateBodyHash ||
    approval.runLockHash !== actualRunLockHash ||
    approval.reportHash !== actualReportHash ||
    approval.proposalHash !== actualProposalHash ||
    proposal.candidateBodyHash !== candidateBodyHash ||
    proposal.runLockHash !== actualRunLockHash ||
    proposal.reportHash !== actualReportHash ||
    report.runId !== runLock.runId ||
    report.runLockHash !== actualRunLockHash ||
    proposal.skill !== input.candidate.skill ||
    report.skill !== input.candidate.skill
  ) {
    throw new ContractIntegrityError(
      "approval artifact hash mismatch",
      "approval",
    );
  }
  assertApprovalMatchesProposal(proposal, approval);
  return approval;
}
