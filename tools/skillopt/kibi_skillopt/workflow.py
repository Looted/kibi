from __future__ import annotations

from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator
from typing_extensions import Self

from .common import (
    ArtifactId,
    ContractModel,
    ContractValidationError,
    JsonBoolean,
    JsonInteger,
    JsonNode,
    JsonNumber,
    JsonValue,
    NonEmptyString,
    PriceEquivalentEstimate,
    Sha256,
    Timestamp,
    Usage,
)
from .episode import Skill


class LedgerEntry(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["ledger-entry"], Field(alias="artifactType")]
    run_id: Annotated[ArtifactId, Field(alias="runId")]
    sequence: Annotated[JsonInteger, Field(ge=0)]
    previous_entry_hash: Annotated[Sha256 | None, Field(alias="previousEntryHash")]
    entry_hash: Annotated[Sha256, Field(alias="entryHash")]
    occurred_at: Annotated[Timestamp, Field(alias="occurredAt")]
    episode_id: Annotated[ArtifactId | None, Field(alias="episodeId")] = None
    category: Literal[
        "preflight", "development", "optimization", "held-out", "bundle", "infrastructure"
    ]
    model: Literal["gpt-5.4-mini", "gpt-5.5", "none"]
    usage: Usage
    price_equivalent_estimate: Annotated[
        PriceEquivalentEstimate, Field(alias="priceEquivalentEstimate")
    ]

    @field_validator("episode_id", mode="before")
    @classmethod
    def reject_explicit_null_episode_id(cls, value: JsonValue) -> JsonValue:
        if value is None:
            raise ContractValidationError("episodeId cannot be null")
        return value

    @model_validator(mode="after")
    def verify_chain_link(self) -> Self:
        valid_link = (
            self.previous_entry_hash is None
            if self.sequence == 0
            else self.previous_entry_hash is not None
        )
        if not valid_link:
            raise ContractValidationError("ledger sequence/link mismatch")
        return self


class RunState(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["run-state"], Field(alias="artifactType")]
    run_id: Annotated[ArtifactId, Field(alias="runId")]
    run_lock_hash: Annotated[Sha256, Field(alias="runLockHash")]
    phase: Literal[
        "preflight",
        "development",
        "optimization",
        "held-out",
        "bundle",
        "review",
        "complete",
        "no-go",
    ]
    completed_episode_ids: Annotated[tuple[ArtifactId, ...], Field(alias="completedEpisodeIds")]
    ledger_head_hash: Annotated[Sha256 | None, Field(alias="ledgerHeadHash")]
    updated_at: Annotated[Timestamp, Field(alias="updatedAt")]
    interrupted: JsonBoolean

    @model_validator(mode="after")
    def verify_unique_completed_episodes(self) -> Self:
        if len(set(self.completed_episode_ids)) != len(self.completed_episode_ids):
            raise ContractValidationError("completed episode ids must be unique")
        if self.phase == "complete" and self.interrupted:
            raise ContractValidationError("complete run state cannot be interrupted")
        return self


class LegacyReport(ContractModel):
    run_id: Annotated[NonEmptyString, Field(alias="runId")]
    skill: NonEmptyString
    variants: tuple[Literal["baseline"], Literal["one-shot"], Literal["skillopt"]]
    cells: tuple[JsonNode, ...]
    cost_usd: Annotated[JsonNumber, Field(alias="costUsd", ge=0, le=400)]
    verdict: Literal["pass", "fail", "no-go"]


class GateResults(ContractModel):
    aggregate: JsonBoolean
    bootstrap: JsonBoolean
    family: JsonBoolean
    security: JsonBoolean
    bundle: JsonBoolean | None


class ReportV1(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["report"], Field(alias="artifactType")]
    run_id: Annotated[ArtifactId, Field(alias="runId")]
    run_lock_hash: Annotated[Sha256, Field(alias="runLockHash")]
    skill: Skill
    variants: tuple[Literal["baseline"], Literal["one-shot"], Literal["skillopt"]]
    cells: Annotated[tuple[Sha256, ...], Field(min_length=1)]
    price_equivalent_estimate: Annotated[
        PriceEquivalentEstimate, Field(alias="priceEquivalentEstimate")
    ]
    verdict: Literal["pass", "fail", "no-go"]
    generated_at: Annotated[Timestamp, Field(alias="generatedAt")]
    gate_results: Annotated[GateResults, Field(alias="gateResults")]

    @model_validator(mode="after")
    def verify_unique_cells(self) -> Self:
        if len(set(self.cells)) != len(self.cells):
            raise ContractValidationError("cells must be unique")
        return self
