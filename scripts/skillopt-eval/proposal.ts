import { createHash } from "node:crypto";
import type { z } from "zod";
import {
  CONTRACT_SCHEMA_VERSION,
  ContractIntegrityError,
  JsonValueSchema,
  contractHash,
} from "./contracts/common";
import { type Proposal, ProposalSchema } from "./contracts/review";
import { ReportV1Schema } from "./contracts/workflow";
import type { FrozenVariant } from "./variants";

type ReportV1 = Readonly<z.infer<typeof ReportV1Schema>>;

// implements REQ-skillopt-codex-optimization
export type BuildProposalInput = Readonly<{
  proposalId: string;
  createdAt: string;
  report: ReportV1;
  baseline: FrozenVariant;
  candidate: FrozenVariant;
}>;

function assertPassingReport(report: ReportV1): void {
  const gates = report.gateResults;
  if (
    report.verdict !== "pass" ||
    !gates.aggregate ||
    !gates.bootstrap ||
    !gates.family ||
    !gates.security ||
    gates.bundle === false
  ) {
    throw new ContractIntegrityError(
      "only passing reports can produce proposals",
      "report.verdict",
    );
  }
}

function assertCandidateIntegrity(input: BuildProposalInput): void {
  if (
    input.baseline.variant !== "baseline" ||
    input.candidate.variant !== "skillopt" ||
    input.baseline.skill !== input.report.skill ||
    input.candidate.skill !== input.report.skill
  ) {
    throw new ContractIntegrityError(
      "proposal variants do not match report skill",
      "candidate.skill",
    );
  }
  if (input.baseline.frontmatterHash !== input.candidate.frontmatterHash) {
    throw new ContractIntegrityError(
      "candidate frontmatter differs from baseline",
      "candidate.frontmatterHash",
    );
  }
  if (input.baseline.resourcesHash !== input.candidate.resourcesHash) {
    throw new ContractIntegrityError(
      "candidate resources differ from baseline",
      "candidate.resourcesHash",
    );
  }
  const bodyHash = createHash("sha256")
    .update(input.candidate.body, "utf8")
    .digest("hex");
  if (bodyHash !== input.candidate.bodyHash) {
    throw new ContractIntegrityError(
      "candidate body hash mismatch",
      "candidate.bodyHash",
    );
  }
}

// implements REQ-skillopt-codex-optimization
export function buildProposal(input: BuildProposalInput): Proposal {
  const report = ReportV1Schema.parse(input.report);
  assertPassingReport(report);
  assertCandidateIntegrity(input);
  return ProposalSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    artifactType: "proposal",
    proposalId: input.proposalId,
    runId: report.runId,
    runLockHash: report.runLockHash,
    skill: report.skill,
    candidateBodyHash: input.candidate.bodyHash,
    baselineFrontmatterHash: input.baseline.frontmatterHash,
    candidateFrontmatterHash: input.candidate.frontmatterHash,
    baselineResourcesHash: input.baseline.resourcesHash,
    candidateResourcesHash: input.candidate.resourcesHash,
    reportHash: contractHash(JsonValueSchema.parse(report)),
    createdAt: input.createdAt,
    status: "eligible",
  });
}
