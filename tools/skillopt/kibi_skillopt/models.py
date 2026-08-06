from __future__ import annotations

from typing import Annotated, Final, Literal

from pydantic import Field, model_validator
from typing_extensions import Self

from .common import (
    ContractModel,
    ContractValidationError,
    JsonBoolean,
    JsonInteger,
    JsonNumber,
    NonEmptyString,
    Sha256,
)

BridgePhase = Literal["train", "development"]
BridgeSkill = Literal["kibi-usage", "kibi-freshness", "kibi-traceability", "init-kibi"]
TASK_ID_PATTERN: Final = r"^[a-z0-9][a-z0-9-]{0,127}$"


class PublicTaskClaim(ContractModel):
    task_id: Annotated[str, Field(alias="taskId", pattern=TASK_ID_PATTERN)]
    text: Annotated[str, Field(min_length=1, max_length=100_000)]
    public_manifest_hash: Annotated[Sha256, Field(alias="publicManifestHash")]
    workspace_hash: Annotated[Sha256, Field(alias="workspaceHash")]


class BridgeRequest(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["skillopt-bridge-request"], Field(alias="artifactType")]
    run_id: Annotated[NonEmptyString, Field(alias="runId")]
    batch_id: Annotated[NonEmptyString, Field(alias="batchId")]
    skill: BridgeSkill
    phase: BridgePhase
    candidate_body: Annotated[str, Field(alias="candidateBody", min_length=1, max_length=100_000)]
    task_ids: Annotated[
        tuple[NonEmptyString, ...], Field(alias="taskIds", min_length=1, max_length=8)
    ]
    source_lock_hash: Annotated[Sha256, Field(alias="sourceLockHash")]
    public_claim: PublicTaskClaim = Field(alias="publicClaim")

    @model_validator(mode="after")
    def reject_held_out_ids(self) -> Self:
        if any("held-out" in task_id or "heldout" in task_id for task_id in self.task_ids):
            raise ContractValidationError("held-out task ids are not bridge inputs")
        if self.public_claim.task_id != self.task_ids[0]:
            raise ContractValidationError("public claim task identity must match the bridge task")
        return self


class BridgeRow(ContractModel):
    id: NonEmptyString
    hard: Annotated[JsonInteger, Field(ge=0, le=1)]
    soft: Annotated[JsonNumber, Field(ge=0, le=1)]
    status: Literal["completed", "behavioral-failure", "infrastructure-failure"]
    failure_category: Annotated[NonEmptyString | None, Field(alias="failureCategory")]
    failure_categories: Annotated[
        tuple[NonEmptyString, ...], Field(alias="failureCategories", max_length=100)
    ] = ()
    tool_sequence: Annotated[
        tuple[NonEmptyString, ...], Field(alias="toolSequence", max_length=100)
    ] = ()
    final_state_summary: Annotated[str, Field(alias="finalStateSummary", max_length=20_000)] = "{}"
    conversation_path: Annotated[NonEmptyString, Field(alias="conversationPath")]
    evidence_refs: Annotated[tuple[NonEmptyString, ...], Field(alias="evidenceRefs", min_length=1)]


class BridgeCheckpoint(ContractModel):
    max_steps: Annotated[JsonInteger, Field(alias="maxSteps", ge=0)]
    completed_steps: Annotated[JsonInteger, Field(alias="completedSteps", ge=0)]
    next_step: Annotated[JsonInteger, Field(alias="nextStep", ge=1)]

    @model_validator(mode="after")
    def verify_next_step(self) -> Self:
        if self.next_step != self.completed_steps + 1:
            raise ContractValidationError("checkpoint nextStep must follow completedSteps")
        if self.completed_steps > self.max_steps:
            raise ContractValidationError("checkpoint completedSteps exceeds maxSteps")
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
            raise ContractValidationError("bridge result task ids must be unique")
        return self


class CorpusRoots(ContractModel):
    corpus: Sha256
    evaluator: Sha256
    query_set: Annotated[Sha256, Field(alias="querySet")]
    baseline: Sha256
    catalog: Sha256
    verifier: Sha256
    public_root: Annotated[Sha256, Field(alias="publicRoot")]
    private_root: Annotated[Sha256, Field(alias="privateRoot")]
    artifact_schema: Annotated[Sha256, Field(alias="artifactSchema")]


class TrainTrajectory(ContractModel):
    task_id: Annotated[NonEmptyString, Field(alias="taskId")]
    family: NonEmptyString
    reflection: NonEmptyString
    status: Literal["completed", "behavioral-failure"] = "behavioral-failure"
    soft: Annotated[JsonNumber, Field(ge=0, le=1)] = 0
    hard: Annotated[JsonInteger, Field(ge=0, le=1)] = 0
    failure_categories: Annotated[
        tuple[NonEmptyString, ...], Field(alias="failureCategories", max_length=100)
    ] = ()
    tool_sequence: Annotated[
        tuple[NonEmptyString, ...], Field(alias="toolSequence", max_length=100)
    ] = ()
    final_state_summary: Annotated[str, Field(alias="finalStateSummary", max_length=20_000)] = "{}"


class DevelopmentGate(ContractModel):
    mean: Annotated[JsonNumber, Field(ge=0, le=1)]
    hard_passes: Annotated[JsonInteger, Field(alias="hardPasses", ge=0)]
    worst_family_mean: Annotated[JsonNumber, Field(alias="worstFamilyMean", ge=0, le=1)]


class FailureCount(ContractModel):
    category: NonEmptyString
    count: Annotated[JsonInteger, Field(ge=1)]


class FamilyEvidenceSummary(ContractModel):
    family: NonEmptyString
    attempts: Annotated[JsonInteger, Field(ge=1)]
    hard_passes: Annotated[JsonInteger, Field(alias="hardPasses", ge=0)]
    mean_soft: Annotated[JsonNumber, Field(alias="meanSoft", ge=0, le=1)]
    failure_counts: Annotated[
        tuple[FailureCount, ...], Field(alias="failureCounts", max_length=100)
    ] = ()


class PublicEvidenceSummary(ContractModel):
    attempts: Annotated[JsonInteger, Field(ge=1)]
    hard_passes: Annotated[JsonInteger, Field(alias="hardPasses", ge=0)]
    families: Annotated[tuple[FamilyEvidenceSummary, ...], Field(min_length=1)]


class OptimizerRequest(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["skillopt-optimizer-request"], Field(alias="artifactType")]
    run_id: Annotated[NonEmptyString, Field(alias="runId")]
    skill: BridgeSkill
    step: Annotated[JsonInteger, Field(ge=1)]
    max_steps: Annotated[JsonInteger, Field(alias="maxSteps", ge=1, le=4)]
    current_body: Annotated[str, Field(alias="currentBody", min_length=1, max_length=100_000)]
    train_trajectories: Annotated[
        tuple[TrainTrajectory, ...], Field(alias="trainTrajectories", min_length=1, max_length=8)
    ]
    public_evidence_summary: Annotated[
        PublicEvidenceSummary, Field(alias="publicEvidenceSummary")
    ]
    previous_development: Annotated[DevelopmentGate, Field(alias="previousDevelopment")]
    source_lock_hash: Annotated[Sha256, Field(alias="sourceLockHash")]
    corpus_roots: Annotated[CorpusRoots, Field(alias="corpusRoots")]


class OptimizerResult(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["skillopt-optimizer-result"], Field(alias="artifactType")]
    request_hash: Annotated[Sha256, Field(alias="requestHash")]
    body: Annotated[str, Field(min_length=1, max_length=100_000)]
    development: DevelopmentGate


class AdapterCheckpoint(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["skillopt-adapter-checkpoint"], Field(alias="artifactType")]
    max_steps: Annotated[JsonInteger, Field(alias="maxSteps", ge=0, le=4)]
    completed_steps: Annotated[JsonInteger, Field(alias="completedSteps", ge=0)]
    next_step: Annotated[JsonInteger, Field(alias="nextStep", ge=1)]
    candidate_body_hash: Annotated[Sha256, Field(alias="candidateBodyHash")]
    trajectory_hashes: Annotated[tuple[Sha256, ...], Field(alias="trajectoryHashes")]
    trainer_checkpoint_hash: Annotated[Sha256, Field(alias="trainerCheckpointHash")]
    corpus_roots: Annotated[CorpusRoots, Field(alias="corpusRoots")]
    completed_task_ids: Annotated[tuple[NonEmptyString, ...], Field(alias="completedTaskIds")]
    interrupted: JsonBoolean
