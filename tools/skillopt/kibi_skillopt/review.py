from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, model_validator
from typing_extensions import Self

from .common import (
    ContractModel,
    ContractValidationError,
    NonEmptyString,
    Sha256,
    contract_hash,
    parse_json_value,
)
from .episode import Skill


class Proposal(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["proposal"], Field(alias="artifactType")]
    proposal_id: Annotated[UUID, Field(alias="proposalId")]
    run_id: Annotated[UUID, Field(alias="runId")]
    run_lock_hash: Annotated[Sha256, Field(alias="runLockHash")]
    skill: Skill
    candidate_body_hash: Annotated[Sha256, Field(alias="candidateBodyHash")]
    baseline_frontmatter_hash: Annotated[Sha256, Field(alias="baselineFrontmatterHash")]
    candidate_frontmatter_hash: Annotated[Sha256, Field(alias="candidateFrontmatterHash")]
    baseline_resources_hash: Annotated[Sha256, Field(alias="baselineResourcesHash")]
    candidate_resources_hash: Annotated[Sha256, Field(alias="candidateResourcesHash")]
    report_hash: Annotated[Sha256, Field(alias="reportHash")]
    created_at: Annotated[AwareDatetime, Field(alias="createdAt")]
    status: Literal["eligible", "accepted", "rejected"]

    @model_validator(mode="after")
    def verify_immutable_surfaces(self) -> Self:
        if self.baseline_frontmatter_hash != self.candidate_frontmatter_hash:
            raise ContractValidationError("frontmatter hash changed")
        if self.baseline_resources_hash != self.candidate_resources_hash:
            raise ContractValidationError("resources hash changed")
        return self


class Approval(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["approval"], Field(alias="artifactType")]
    approval_id: Annotated[UUID, Field(alias="approvalId")]
    proposal_id: Annotated[UUID, Field(alias="proposalId")]
    proposal_hash: Annotated[Sha256, Field(alias="proposalHash")]
    run_id: Annotated[UUID, Field(alias="runId")]
    run_lock_hash: Annotated[Sha256, Field(alias="runLockHash")]
    report_hash: Annotated[Sha256, Field(alias="reportHash")]
    candidate_body_hash: Annotated[Sha256, Field(alias="candidateBodyHash")]
    reviewer: NonEmptyString
    decision: Literal["approved"]
    decided_at: Annotated[AwareDatetime, Field(alias="decidedAt")]


def assert_approval_matches_proposal(proposal: Proposal, approval: Approval) -> None:
    if proposal.status not in ("eligible", "accepted"):
        raise ContractValidationError("proposal is not approval-eligible")
    matches = (
        approval.proposal_id == proposal.proposal_id
        and approval.run_id == proposal.run_id
        and approval.run_lock_hash == proposal.run_lock_hash
        and approval.report_hash == proposal.report_hash
        and approval.candidate_body_hash == proposal.candidate_body_hash
        and approval.proposal_hash
        == contract_hash(parse_json_value(proposal.model_dump_json(by_alias=True)))
    )
    if not matches:
        raise ContractValidationError("approval does not match proposal")
