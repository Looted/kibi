from __future__ import annotations

from typing import Annotated, Literal

from pydantic import Field, model_validator
from typing_extensions import Self

from .common import ContractModel, JsonBoolean, JsonInteger, JsonNumber, NonEmptyString, Sha256

BridgePhase = Literal["train", "development"]
BridgeSkill = Literal["kibi-usage", "kibi-freshness", "kibi-traceability", "init-kibi"]


class BridgeRequest(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["skillopt-bridge-request"], Field(alias="artifactType")]
    run_id: Annotated[NonEmptyString, Field(alias="runId")]
    batch_id: Annotated[NonEmptyString, Field(alias="batchId")]
    skill: BridgeSkill
    phase: BridgePhase
    candidate_body: Annotated[
        str, Field(alias="candidateBody", min_length=1, max_length=100_000)
    ]
    task_ids: Annotated[
        tuple[NonEmptyString, ...], Field(alias="taskIds", min_length=1, max_length=8)
    ]
    source_lock_hash: Annotated[Sha256, Field(alias="sourceLockHash")]

    @model_validator(mode="after")
    def reject_held_out_ids(self) -> Self:
        if any("held-out" in task_id or "heldout" in task_id for task_id in self.task_ids):
            raise ValueError("held-out task ids are not bridge inputs")
        return self


class BridgeRow(ContractModel):
    id: NonEmptyString
    hard: Annotated[JsonInteger, Field(ge=0, le=1)]
    soft: Annotated[JsonNumber, Field(ge=0, le=1)]
    status: Literal["completed", "behavioral-failure", "infrastructure-failure"]
    failure_category: Annotated[NonEmptyString | None, Field(alias="failureCategory")]
    conversation_path: Annotated[NonEmptyString, Field(alias="conversationPath")]
    evidence_refs: Annotated[tuple[NonEmptyString, ...], Field(alias="evidenceRefs", min_length=1)]


class BridgeCheckpoint(ContractModel):
    max_steps: Annotated[JsonInteger, Field(alias="maxSteps", ge=0)]
    completed_steps: Annotated[JsonInteger, Field(alias="completedSteps", ge=0)]
    next_step: Annotated[JsonInteger, Field(alias="nextStep", ge=1)]

    @model_validator(mode="after")
    def verify_next_step(self) -> Self:
        if self.next_step != self.completed_steps + 1:
            raise ValueError("checkpoint nextStep must follow completedSteps")
        if self.completed_steps > self.max_steps:
            raise ValueError("checkpoint completedSteps exceeds maxSteps")
        return self


class BridgeResult(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["skillopt-bridge-result"], Field(alias="artifactType")]
    run_id: Annotated[NonEmptyString, Field(alias="runId")]
    batch_id: Annotated[NonEmptyString, Field(alias="batchId")]
    request_hash: Annotated[Sha256, Field(alias="requestHash")]
    rows: Annotated[tuple[BridgeRow, ...], Field(min_length=1, max_length=8)]
    checkpoint: BridgeCheckpoint

    @model_validator(mode="after")
    def verify_unique_rows(self) -> Self:
        ids = tuple(row.id for row in self.rows)
        if len(set(ids)) != len(ids):
            raise ValueError("bridge result task ids must be unique")
        return self


class AdapterCheckpoint(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["skillopt-adapter-checkpoint"], Field(alias="artifactType")]
    max_steps: Annotated[JsonInteger, Field(alias="maxSteps", ge=0)]
    completed_steps: Annotated[JsonInteger, Field(alias="completedSteps", ge=0)]
    next_step: Annotated[JsonInteger, Field(alias="nextStep", ge=1)]
    candidate_body_hash: Annotated[Sha256, Field(alias="candidateBodyHash")]
    completed_task_ids: Annotated[tuple[NonEmptyString, ...], Field(alias="completedTaskIds")]
    interrupted: JsonBoolean
