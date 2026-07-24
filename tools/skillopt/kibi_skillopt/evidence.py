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
    JsonNode,
    Sha256,
    Timestamp,
)


class EvidenceEnvelope(ContractModel):
    sequence: Annotated[JsonInteger, Field(ge=0)]
    received_at: Annotated[Timestamp, Field(alias="receivedAt")]
    event: dict[str, JsonNode]


class EvidenceIndex(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["evidence-index"], Field(alias="artifactType")]
    run_id: Annotated[ArtifactId, Field(alias="runId")]
    episode_id: Annotated[ArtifactId, Field(alias="episodeId")]
    run_lock_hash: Annotated[Sha256, Field(alias="runLockHash")]
    events: Annotated[tuple[EvidenceEnvelope, ...], Field(max_length=100_000)]
    broker_trace_hash: Annotated[Sha256, Field(alias="brokerTraceHash")]
    diagnostic_receipt_hash: Annotated[Sha256, Field(alias="diagnosticReceiptHash")]
    final_state_hash: Annotated[Sha256, Field(alias="finalStateHash")]
    truncated: JsonBoolean

    @model_validator(mode="after")
    def verify_unique_sequences(self) -> Self:
        sequences = tuple(event.sequence for event in self.events)
        if len(set(sequences)) != len(sequences):
            raise ContractValidationError("evidence sequences must be unique")
        return self
