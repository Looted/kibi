from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from .common import JsonValue, contract_hash
from .models import CorpusRoots, TrainTrajectory


@dataclass(frozen=True, slots=True)
class AdapterLineage:
    candidate_body_hash: str
    trajectory_hashes: tuple[str, ...]
    trainer_checkpoint_hash: str


def parse_trajectories(
    trajectories: Sequence[Mapping[str, JsonValue]],
) -> tuple[TrainTrajectory, ...]:
    return tuple(TrainTrajectory.model_validate(trajectory) for trajectory in trajectories)


def compute_lineage(
    candidate_body: str,
    trajectories: Sequence[TrainTrajectory],
    corpus_roots: CorpusRoots,
) -> AdapterLineage:
    trajectory_hashes = tuple(
        contract_hash(trajectory.model_dump(by_alias=True, mode="json"))
        for trajectory in trajectories
    )
    candidate_body_hash = contract_hash(candidate_body)
    trainer_checkpoint_hash = contract_hash(
        {
            "candidateBodyHash": candidate_body_hash,
            "corpusRoots": corpus_roots.model_dump(by_alias=True, mode="json"),
            "trajectoryHashes": list(trajectory_hashes),
        }
    )
    return AdapterLineage(
        candidate_body_hash=candidate_body_hash,
        trajectory_hashes=trajectory_hashes,
        trainer_checkpoint_hash=trainer_checkpoint_hash,
    )
