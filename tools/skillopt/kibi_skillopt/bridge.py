from __future__ import annotations

import os
import tempfile
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from .common import JsonValue, canonical_json, contract_hash, parse_json_value
from .lineage import parse_trajectories
from .models import (
    BridgeRequest,
    BridgeResult,
    CorpusRoots,
    OptimizerRequest,
    OptimizerResult,
)


class BridgeError(ValueError):
    pass

Visibility = Literal["public", "private"]


@dataclass(frozen=True, slots=True)
class OptimizerBridgeContext:
    run_id: str
    skill: str
    source_lock_hash: str
    corpus_roots: CorpusRoots
    train_ids: frozenset[str]


@dataclass(frozen=True, slots=True)
class OptimizerInput:
    current_body: str
    trajectories: Sequence[Mapping[str, JsonValue]]
    previous_development: Mapping[str, JsonValue]
    step: int
    max_steps: int


def _json_text(value: JsonValue) -> str:
    return f"{canonical_json(value)}\n"


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            _ = handle.write(text)
            handle.flush()
            _ = os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


class FileBridge:
    def __init__(self, public_root: Path, private_root: Path) -> None:
        self.public_root: Path = public_root.resolve()
        self.private_root: Path = private_root.resolve()

    def resolve(self, name: str, visibility: Visibility) -> Path:
        candidate = Path(name)
        if candidate.is_absolute():
            raise BridgeError("absolute_bridge_path")
        root = self.public_root if visibility == "public" else self.private_root
        path = (root / candidate).resolve()
        try:
            _ = path.relative_to(root)
        except ValueError as error:
            raise BridgeError("bridge_path_escape") from error
        return path

    def write_public(self, name: str, content: str) -> None:
        _atomic_write(self.resolve(name, "public"), content)

    def write_private(self, name: str, content: str) -> None:
        _atomic_write(self.resolve(name, "private"), content)

    def read_public(self, name: str) -> str:
        return self.resolve(name, "public").read_text(encoding="utf-8")

    def read_private(self, name: str) -> str:
        return self.resolve(name, "private").read_text(encoding="utf-8")

    def write_request(self, name: str, request: BridgeRequest) -> str:
        payload = request.model_dump(by_alias=True, mode="json")
        text = _json_text(payload)
        self.write_public(name, text)
        return contract_hash(payload)

    def read_result(self, name: str, request: BridgeRequest) -> BridgeResult:
        payload = parse_json_value(self.read_public(name))
        if not isinstance(payload, dict):
            raise BridgeError("bridge_result_not_object")
        result = BridgeResult.model_validate(payload)
        expected_hash = contract_hash(request.model_dump(by_alias=True, mode="json"))
        if result.run_id != request.run_id or result.batch_id != request.batch_id:
            raise BridgeError("bridge_request_identity_mismatch")
        if result.request_hash != expected_hash:
            raise BridgeError("bridge_request_hash_mismatch")
        return result


def build_optimizer_request(
    context: OptimizerBridgeContext,
    optimization: OptimizerInput,
) -> OptimizerRequest:
    trajectories = parse_trajectories(optimization.trajectories)
    for trajectory in trajectories:
        normalized = trajectory.task_id.lower()
        if "held-out" in normalized or "heldout" in normalized:
            raise BridgeError("held-out task ids are not optimizer inputs")
        if trajectory.task_id not in context.train_ids:
            raise BridgeError("optimizer requires public train task ids")
    return OptimizerRequest.model_validate(
        {
            "schemaVersion": "1.0.0",
            "artifactType": "skillopt-optimizer-request",
            "runId": context.run_id,
            "skill": context.skill,
            "step": optimization.step,
            "maxSteps": optimization.max_steps,
            "currentBody": optimization.current_body,
            "trainTrajectories": [
                trajectory.model_dump(by_alias=True, mode="json") for trajectory in trajectories
            ],
            "previousDevelopment": optimization.previous_development,
            "sourceLockHash": context.source_lock_hash,
            "corpusRoots": context.corpus_roots.model_dump(by_alias=True, mode="json"),
        }
    )


def write_optimizer_request(bridge: FileBridge, name: str, request: OptimizerRequest) -> str:
    payload = request.model_dump(by_alias=True, mode="json")
    bridge.write_public(name, _json_text(payload))
    return contract_hash(payload)


def read_optimizer_result(
    bridge: FileBridge,
    name: str,
    request: OptimizerRequest,
) -> OptimizerResult:
    payload = parse_json_value(bridge.read_public(name))
    if not isinstance(payload, dict):
        raise BridgeError("optimizer_result_not_object")
    result = OptimizerResult.model_validate(payload)
    request_hash = contract_hash(request.model_dump(by_alias=True, mode="json"))
    if result.request_hash != request_hash:
        raise BridgeError("optimizer_request_hash_mismatch")
    return result
