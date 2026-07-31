from __future__ import annotations

import json
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated, Final, Literal, TypeAlias

from pydantic import Field

from .adapter import EnvAdapter
from .common import ContractModel, JsonValue, NonEmptyString, Sha256
from .models import BridgeRequest, CorpusRoots, PublicTaskClaim
from .trainer import run_training

USAGE: Final = " | ".join(
    (
        "usage: kibi-skillopt validate-request PATH",
        "kibi-skillopt train --request PATH --result PATH",
    )
)


class TrainDescriptor(ContractModel):
    id: NonEmptyString
    family: NonEmptyString
    split: Literal["train", "development"]
    public_claim: PublicTaskClaim = Field(alias="publicClaim")

    def to_task(self) -> dict[str, JsonValue]:
        return {
            "id": self.id,
            "family": self.family,
            "split": self.split,
            "publicClaim": self.public_claim.model_dump(by_alias=True, mode="json"),
        }


class TrainRequest(ContractModel):
    run_id: Annotated[NonEmptyString, Field(alias="runId")]
    skill: NonEmptyString
    run_root: Path = Field(alias="runRoot")
    out_root: Path = Field(alias="outRoot")
    max_steps: Annotated[int, Field(alias="maxSteps", ge=1, le=4)]
    source_lock_hash: Annotated[Sha256, Field(alias="sourceLockHash")]
    corpus_roots: CorpusRoots = Field(alias="corpusRoots")
    train_descriptors: tuple[TrainDescriptor, ...] = Field(alias="trainDescriptors", min_length=1)
    development_descriptors: tuple[TrainDescriptor, ...] = Field(
        alias="developmentDescriptors", min_length=1
    )


@dataclass(frozen=True, slots=True)
class ValidateRequestCommand:
    path: Path


@dataclass(frozen=True, slots=True)
class TrainCommand:
    request_path: Path
    result_path: Path


Command: TypeAlias = ValidateRequestCommand | TrainCommand


def parse_command(argv: Sequence[str]) -> Command:
    arguments = tuple(argv)
    match arguments:
        case ("validate-request", path):
            return ValidateRequestCommand(Path(path))
        case ("train", "--request", request_path, "--result", result_path):
            return TrainCommand(Path(request_path), Path(result_path))
        case ("train", "--result", result_path, "--request", request_path):
            return TrainCommand(Path(request_path), Path(result_path))
        case _:
            raise ValueError(USAGE)


def _train(request_path: Path, result_path: Path) -> None:
    request = TrainRequest.model_validate_json(request_path.read_text(encoding="utf-8"))
    adapter = EnvAdapter(
        run_root=request.run_root,
        skill=request.skill,
        source_lock_hash=request.source_lock_hash,
        corpus_roots=request.corpus_roots.model_dump(by_alias=True, mode="json"),
        train_items=tuple(descriptor.to_task() for descriptor in request.train_descriptors),
        development_items=tuple(
            descriptor.to_task() for descriptor in request.development_descriptors
        ),
        run_id=request.run_id,
    )
    result = run_training(adapter, request.out_root, max_steps=request.max_steps)
    result_path.parent.mkdir(parents=True, exist_ok=True)
    _ = result_path.write_text(json.dumps(result, sort_keys=True) + "\n", encoding="utf-8")


def main(argv: Sequence[str] | None = None) -> int:
    command = parse_command(sys.argv[1:] if argv is None else argv)
    match command:
        case ValidateRequestCommand(path=path):
            request = BridgeRequest.model_validate_json(path.read_text(encoding="utf-8"))
            print(json.dumps(request.model_dump(by_alias=True, mode="json"), sort_keys=True))
        case TrainCommand(request_path=request_path, result_path=result_path):
            _train(request_path, result_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
