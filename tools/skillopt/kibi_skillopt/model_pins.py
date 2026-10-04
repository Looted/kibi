"""Operator-configurable model pins, mirroring scripts/skillopt-eval/runtime/models.ts.

The harness reads the same environment variables as the TypeScript side with the
same defaults and validation, so a run lock or ledger entry recorded with models
other than the active pins is rejected on both sides.
"""

from __future__ import annotations

import os
import re
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Annotated, Final, Literal, cast, get_args

from pydantic import Field

from .common import ContractValidationError

DEFAULT_TARGET_MODEL: Final = "gpt-5.6-luna"
DEFAULT_OPTIMIZER_MODEL: Final = "gpt-5.6-sol"
DEFAULT_TARGET_EFFORT: Final = "medium"
DEFAULT_OPTIMIZER_EFFORT: Final = "xhigh"

TARGET_MODEL_ENV: Final = "KIBI_SKILLOPT_TARGET_MODEL"
TARGET_EFFORT_ENV: Final = "KIBI_SKILLOPT_TARGET_EFFORT"
OPTIMIZER_MODEL_ENV: Final = "KIBI_SKILLOPT_OPTIMIZER_MODEL"
OPTIMIZER_EFFORT_ENV: Final = "KIBI_SKILLOPT_OPTIMIZER_EFFORT"

MODEL_ID_PATTERN: Final = r"^[a-z0-9][a-z0-9._-]{0,63}$"

ModelId = Annotated[str, Field(pattern=MODEL_ID_PATTERN)]
ReasoningEffort = Literal["minimal", "low", "medium", "high", "xhigh"]
REASONING_EFFORTS: Final[tuple[str, ...]] = get_args(ReasoningEffort)


@dataclass(frozen=True)
class ModelConfig:
    target_model: str
    target_reasoning_effort: ReasoningEffort
    optimizer_model: str
    optimizer_reasoning_effort: ReasoningEffort

    def pinned_models(self) -> frozenset[str]:
        return frozenset({self.target_model, self.optimizer_model})


def _value(env: Mapping[str, str], name: str, fallback: str) -> str:
    value = env.get(name)
    return fallback if value is None or value == "" else value


def _model(env: Mapping[str, str], name: str, fallback: str) -> str:
    value = _value(env, name, fallback)
    if re.fullmatch(MODEL_ID_PATTERN, value) is None:
        raise ContractValidationError(f"{name} must match {MODEL_ID_PATTERN}")
    return value


def _effort(env: Mapping[str, str], name: str, fallback: str) -> ReasoningEffort:
    value = _value(env, name, fallback)
    if value not in REASONING_EFFORTS:
        raise ContractValidationError(f"{name} must be one of {'|'.join(REASONING_EFFORTS)}")
    return cast(ReasoningEffort, value)


def resolve_model_config(env: Mapping[str, str] | None = None) -> ModelConfig:
    source = os.environ if env is None else env
    return ModelConfig(
        target_model=_model(source, TARGET_MODEL_ENV, DEFAULT_TARGET_MODEL),
        target_reasoning_effort=_effort(source, TARGET_EFFORT_ENV, DEFAULT_TARGET_EFFORT),
        optimizer_model=_model(source, OPTIMIZER_MODEL_ENV, DEFAULT_OPTIMIZER_MODEL),
        optimizer_reasoning_effort=_effort(source, OPTIMIZER_EFFORT_ENV, DEFAULT_OPTIMIZER_EFFORT),
    )
