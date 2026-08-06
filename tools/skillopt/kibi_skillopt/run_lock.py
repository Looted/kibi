from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, model_validator
from typing_extensions import Self

from .common import (
    ArtifactId,
    ContractModel,
    ContractValidationError,
    JsonInteger,
    JsonNumber,
    JsonValue,
    NonEmptyString,
    Sha256,
    contract_hash,
    parse_json_value,
)


class CleanState(ContractModel):
    is_dirty: Annotated[Literal[False], Field(alias="isDirty")]
    diff_hash: Annotated[None, Field(alias="diffHash")]


class DirtyState(ContractModel):
    is_dirty: Annotated[Literal[True], Field(alias="isDirty")]
    diff_hash: Annotated[Sha256, Field(alias="diffHash")]


class ModelPricing(ContractModel):
    input_per_million_tokens: Annotated[JsonNumber, Field(alias="inputPerMillionTokens", ge=0)]
    cached_input_per_million_tokens: Annotated[
        JsonNumber, Field(alias="cachedInputPerMillionTokens", ge=0)
    ]
    output_per_million_tokens: Annotated[JsonNumber, Field(alias="outputPerMillionTokens", ge=0)]


class PricingModels(ContractModel):
    target: Annotated[ModelPricing, Field(alias="gpt-5.4-mini")]
    optimizer: Annotated[ModelPricing, Field(alias="gpt-5.6-sol")]


class PricingTable(ContractModel):
    name: Literal["price-equivalent-estimates"]
    effective_from: Annotated[date, Field(alias="effectiveFrom")]
    currency: Literal["USD"]
    source: NonEmptyString
    models: PricingModels


class SkillOptPin(ContractModel):
    package: Literal["skillopt"]
    version: NonEmptyString
    commit: Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
    repository: NonEmptyString
    license: NonEmptyString
    retrieved_at: Annotated[date, Field(alias="retrievedAt")]
    python: NonEmptyString
    package_hash: Annotated[Sha256, Field(alias="packageHash")]
    source_hash: Annotated[Sha256, Field(alias="sourceHash")]
    uv_lock_hash: Annotated[Sha256, Field(alias="uvLockHash")]


class SkillSurfaceHashes(ContractModel):
    body_hash: Annotated[Sha256, Field(alias="bodyHash")]
    frontmatter_hash: Annotated[Sha256, Field(alias="frontmatterHash")]
    resources_hash: Annotated[Sha256, Field(alias="resourcesHash")]


class BaselineSkillHashes(ContractModel):
    usage: Annotated[SkillSurfaceHashes, Field(alias="kibi-usage")]
    freshness: Annotated[SkillSurfaceHashes, Field(alias="kibi-freshness")]
    traceability: Annotated[SkillSurfaceHashes, Field(alias="kibi-traceability")]
    init: Annotated[SkillSurfaceHashes, Field(alias="init-kibi")]


class ExecutableIdentity(ContractModel):
    path: NonEmptyString
    version: NonEmptyString
    sha256: Sha256


class SourceLock(ContractModel):
    package: Literal["skillopt"]
    version: NonEmptyString
    commit: Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
    repository: NonEmptyString
    license: NonEmptyString
    retrieved_at: Annotated[date, Field(alias="retrievedAt")]
    python: NonEmptyString


DEFAULT_SOURCE_LOCK_PATH = Path(__file__).resolve().parents[1] / "source-lock.json"


def load_skillopt_source_lock(path: Path = DEFAULT_SOURCE_LOCK_PATH) -> SourceLock:
    return SourceLock.model_validate_json(path.read_text(encoding="utf-8"))


SKILLOPT_SOURCE_LOCK = load_skillopt_source_lock()


class CandidateMeanDelta(ContractModel):
    baseline: Literal[8]
    one_shot: Annotated[Literal[5], Field(alias="oneShot")]


class CandidateHardPassDelta(ContractModel):
    baseline: Literal[2]
    one_shot: Annotated[Literal[1], Field(alias="oneShot")]


class CandidateGates(ContractModel):
    mean_minimum: Annotated[Literal[85], Field(alias="meanMinimum")]
    hard_passes_minimum: Annotated[Literal[13], Field(alias="hardPassesMinimum")]
    hard_passes_total: Annotated[Literal[16], Field(alias="hardPassesTotal")]
    mean_delta_minimum: Annotated[CandidateMeanDelta, Field(alias="meanDeltaMinimum")]
    hard_pass_delta_minimum: Annotated[CandidateHardPassDelta, Field(alias="hardPassDeltaMinimum")]


class BootstrapGates(ContractModel):
    resamples: Literal[10000]
    seed: Literal[5417]
    confidence_level: Annotated[JsonNumber, Field(alias="confidenceLevel", ge=0.95, le=0.95)]
    sidedness: Literal["one-sided"]
    lower_bound_exclusive_minimum: Annotated[Literal[0], Field(alias="lowerBoundExclusiveMinimum")]
    cluster_unit: Annotated[Literal["task"], Field(alias="clusterUnit")]


class FamilyGuard(ContractModel):
    max_mean_regression: Annotated[Literal[3], Field(alias="maxMeanRegression")]
    max_hard_pass_regression: Annotated[Literal[1], Field(alias="maxHardPassRegression")]


class BundleMeanDelta(ContractModel):
    baseline: Literal[3]
    one_shot: Annotated[Literal[3], Field(alias="oneShot")]


class BundleGates(ContractModel):
    mean_minimum: Annotated[Literal[85], Field(alias="meanMinimum")]
    hard_passes_minimum: Annotated[Literal[7], Field(alias="hardPassesMinimum")]
    hard_passes_total: Annotated[Literal[8], Field(alias="hardPassesTotal")]
    mean_delta_minimum: Annotated[BundleMeanDelta, Field(alias="meanDeltaMinimum")]
    allow_hard_pass_loss: Annotated[Literal[False], Field(alias="allowHardPassLoss")]
    max_critical_failures: Annotated[Literal[0], Field(alias="maxCriticalFailures")]


class CodexGates(ContractModel):
    held_out_tasks_per_variant: Annotated[Literal[16], Field(alias="heldOutTasksPerVariant")]
    family_slices: Annotated[Literal[4], Field(alias="familySlices")]
    bundle_tasks: Annotated[Literal[8], Field(alias="bundleTasks")]
    candidate: CandidateGates
    bootstrap: BootstrapGates
    family_guard: Annotated[FamilyGuard, Field(alias="familyGuard")]
    bundle: BundleGates


class RunLock(ContractModel):
    schema_version: Annotated[Literal["1.0.0"], Field(alias="schemaVersion")]
    artifact_type: Annotated[Literal["run-lock"], Field(alias="artifactType")]
    run_id: Annotated[ArtifactId, Field(alias="runId")]
    repository_hash_algorithm: Annotated[
        Literal["sha1", "sha256"], Field(alias="repositoryHashAlgorithm")
    ]
    repository_commit: Annotated[
        str, Field(alias="repositoryCommit", pattern=r"^(?:[a-f0-9]{40}|[a-f0-9]{64})$")
    ]
    dirty_state: Annotated[
        Annotated[CleanState | DirtyState, Field(discriminator="is_dirty")],
        Field(alias="dirtyState"),
    ]
    codex_cli_version: Annotated[NonEmptyString, Field(alias="codexCliVersion")]
    codex_executable: Annotated[ExecutableIdentity, Field(alias="codexExecutable")]
    cli_args: Annotated[list[NonEmptyString], Field(alias="cliArgs", min_length=1)]
    artifact_root: Annotated[NonEmptyString, Field(alias="artifactRoot")]
    target_model: Annotated[Literal["gpt-5.4-mini"], Field(alias="targetModel")]
    optimizer_model: Annotated[Literal["gpt-5.6-sol"], Field(alias="optimizerModel")]
    skillopt: SkillOptPin
    source_lock_hash: Annotated[Sha256, Field(alias="sourceLockHash")]
    catalog_hash: Annotated[Sha256, Field(alias="catalogHash")]
    fixture_hash: Annotated[Sha256, Field(alias="fixtureHash")]
    fixture_generator_hash: Annotated[Sha256, Field(alias="fixtureGeneratorHash")]
    pricing: PricingTable
    pricing_hash: Annotated[Sha256, Field(alias="pricingHash")]
    baseline_skill_hashes: Annotated[BaselineSkillHashes, Field(alias="baselineSkillHashes")]
    seed: Annotated[JsonInteger, Field(ge=0)]
    auth_mode: Annotated[Literal["existing-login"], Field(alias="authMode")]
    hosts: tuple[Literal["codex"]]
    gates: CodexGates

    @model_validator(mode="after")
    def verify_repository_object_id(self) -> Self:
        expected_length = 40 if self.repository_hash_algorithm == "sha1" else 64
        if len(self.repository_commit) != expected_length:
            raise ContractValidationError(
                f"{self.repository_hash_algorithm} object ID must be {expected_length} characters"
            )
        return self

    def verify_integrity(self, source_lock_path: Path) -> None:
        pricing = parse_json_value(self.pricing.model_dump_json(by_alias=True))
        if contract_hash(pricing) != self.pricing_hash:
            raise ContractValidationError("pricing hash mismatch")
        self.assert_source_lock(source_lock_path)

    def assert_source_lock(self, source_lock_path: Path) -> None:
        source_lock = load_skillopt_source_lock(source_lock_path)
        expected_pin = source_lock.model_dump(mode="json", by_alias=True)
        actual_pin = self.skillopt.model_dump(
            mode="json",
            by_alias=True,
            exclude={"package_hash", "source_hash", "uv_lock_hash"},
        )
        if actual_pin != expected_pin:
            raise ContractValidationError("SkillOpt source lock mismatch")
        source_lock_value = parse_json_value(source_lock.model_dump_json(by_alias=True))
        if contract_hash(source_lock_value) != self.source_lock_hash:
            raise ContractValidationError("SkillOpt source lock hash mismatch")

    @classmethod
    def model_validate_with_source_lock(cls, value: JsonValue, source_lock_path: Path) -> Self:
        lock = cls.model_validate(value)
        lock.verify_integrity(source_lock_path)
        return lock


def run_lock_hash(lock: RunLock) -> str:
    value = parse_json_value(lock.model_dump_json(by_alias=True))
    return contract_hash(value)


def assert_run_lock_matches(expected: RunLock, actual: RunLock) -> None:
    if expected.dirty_state.is_dirty or actual.dirty_state.is_dirty:
        raise ContractValidationError("dirty run lock")
    if run_lock_hash(expected) != run_lock_hash(actual):
        raise ContractValidationError("immutable run lock mismatch")
