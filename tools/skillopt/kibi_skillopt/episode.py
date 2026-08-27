from __future__ import annotations

from typing import Annotated, Literal

from pydantic import Field, model_validator
from typing_extensions import Self

from .common import (
    ArtifactId,
    ContractModel,
    ContractValidationError,
    JsonBoolean,
    JsonInteger,
    JsonNumber,
    NonEmptyString,
    PriceEquivalentEstimate,
    Sha256,
    Timestamp,
    Usage,
)

Variant = Literal["baseline", "one-shot", "skillopt"]
Skill = Literal["kibi-usage", "kibi-freshness", "kibi-traceability", "kibi-bootstrap", "bundle"]


class EpisodeRequest(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["episode-request"], Field(alias="artifactType")]
    episode_id: Annotated[ArtifactId, Field(alias="episodeId")]
    run_id: Annotated[ArtifactId, Field(alias="runId")]
    run_lock_hash: Annotated[Sha256, Field(alias="runLockHash")]
    variant: Variant
    skill: Skill
    task_id: Annotated[NonEmptyString, Field(alias="taskId")]
    attempt: Annotated[JsonInteger, Field(ge=1, le=2)]
    prompt: Annotated[str, Field(min_length=1, max_length=100_000)]
    workspace_fixture_hash: Annotated[Sha256, Field(alias="workspaceFixtureHash")]


class Reconciliation(ContractModel):
    broker_trace: Annotated[JsonBoolean, Field(alias="brokerTrace")]
    diagnostic_receipt: Annotated[JsonBoolean, Field(alias="diagnosticReceipt")]
    final_state_query: Annotated[JsonBoolean, Field(alias="finalStateQuery")]


class EpisodeResult(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["episode-result"], Field(alias="artifactType")]
    episode_id: Annotated[ArtifactId, Field(alias="episodeId")]
    run_id: Annotated[ArtifactId, Field(alias="runId")]
    run_lock_hash: Annotated[Sha256, Field(alias="runLockHash")]
    status: Literal[
        "completed",
        "behavioral-failure",
        "infrastructure-failure",
        "interrupted",
        "budget-exhausted",
        "evidence-conflict",
    ]
    started_at: Annotated[Timestamp, Field(alias="startedAt")]
    finished_at: Annotated[Timestamp, Field(alias="finishedAt")]
    exit_code: Annotated[JsonInteger | None, Field(alias="exitCode")]
    score: Annotated[JsonNumber, Field(ge=0, le=100)]
    hard_pass: Annotated[JsonBoolean, Field(alias="hardPass")]
    critical_failures: Annotated[tuple[NonEmptyString, ...], Field(alias="criticalFailures")]
    evidence_index_hash: Annotated[Sha256, Field(alias="evidenceIndexHash")]
    reconciliation: Reconciliation
    usage: Usage
    price_equivalent_estimate: Annotated[
        PriceEquivalentEstimate, Field(alias="priceEquivalentEstimate")
    ]

    @model_validator(mode="after")
    def verify_result_claims(self) -> Self:
        reconciled = all(
            (
                self.reconciliation.broker_trace,
                self.reconciliation.diagnostic_receipt,
                self.reconciliation.final_state_query,
            )
        )
        if self.status == "completed" and (not reconciled or self.exit_code != 0):
            raise ContractValidationError(
                "completed result requires exit zero and reconciled evidence"
            )
        if self.finished_at < self.started_at:
            raise ContractValidationError("finished timestamp precedes started timestamp")
        if self.hard_pass and (self.score < 85 or self.critical_failures):
            raise ContractValidationError("hard pass requires score >= 85 and no critical failures")
        if self.status != "completed" and (self.hard_pass or self.score >= 85):
            raise ContractValidationError("non-completed result cannot claim passing outcome")
        return self
