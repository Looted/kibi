import { z } from "zod";
import {
  CONTRACT_SCHEMA_VERSION,
  ContractIntegrityError,
  JsonValueSchema,
  NonEmptyStringSchema,
  Sha256Schema,
  TimestampSchema,
  boundedContractSchema,
  contractHash,
} from "./common";
import { SkillSchema } from "./episode";

// implements REQ-skillopt-codex-optimization
export const ProposalSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("proposal"),
      proposalId: z.uuid(),
      runId: z.uuid(),
      runLockHash: Sha256Schema,
      skill: SkillSchema,
      candidateBodyHash: Sha256Schema,
      baselineFrontmatterHash: Sha256Schema,
      candidateFrontmatterHash: Sha256Schema,
      baselineResourcesHash: Sha256Schema,
      candidateResourcesHash: Sha256Schema,
      reportHash: Sha256Schema,
      createdAt: TimestampSchema,
      status: z.enum(["eligible", "accepted", "rejected"]),
    })
    .strict()
    .superRefine((proposal, context) => {
      if (
        proposal.baselineFrontmatterHash !== proposal.candidateFrontmatterHash
      ) {
        context.addIssue({
          code: "custom",
          message: "frontmatter hash changed",
        });
      }
      if (proposal.baselineResourcesHash !== proposal.candidateResourcesHash) {
        context.addIssue({ code: "custom", message: "resources hash changed" });
      }
    }),
);

// implements REQ-skillopt-codex-optimization
export const ApprovalSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("approval"),
      approvalId: z.uuid(),
      proposalId: z.uuid(),
      proposalHash: Sha256Schema,
      runId: z.uuid(),
      runLockHash: Sha256Schema,
      reportHash: Sha256Schema,
      candidateBodyHash: Sha256Schema,
      reviewer: NonEmptyStringSchema,
      decision: z.literal("approved"),
      decidedAt: TimestampSchema,
    })
    .strict(),
);

// implements REQ-skillopt-codex-optimization
export type Proposal = Readonly<z.infer<typeof ProposalSchema>>;
// implements REQ-skillopt-codex-optimization
export type Approval = Readonly<z.infer<typeof ApprovalSchema>>;

// implements REQ-skillopt-codex-optimization
export function assertApprovalMatchesProposal(
  proposal: Proposal,
  approval: Approval,
): void {
  if (proposal.status !== "eligible" && proposal.status !== "accepted") {
    throw new ContractIntegrityError(
      "proposal is not approval-eligible",
      "proposal.status",
    );
  }
  const proposalHash = contractHash(JsonValueSchema.parse(proposal));
  if (
    approval.proposalId !== proposal.proposalId ||
    approval.runId !== proposal.runId ||
    approval.runLockHash !== proposal.runLockHash ||
    approval.reportHash !== proposal.reportHash ||
    approval.candidateBodyHash !== proposal.candidateBodyHash ||
    approval.proposalHash !== proposalHash
  ) {
    throw new ContractIntegrityError(
      "approval does not match proposal",
      "approval",
    );
  }
}
