from abc import ABC, abstractmethod
from collections.abc import Mapping, Sequence
from typing import TypeAlias

from skillopt.datasets.base import BaseDataLoader

JsonValue: TypeAlias = str | int | float | bool | None | list[JsonValue] | dict[str, JsonValue]
Task: TypeAlias = Mapping[str, JsonValue]

class EnvAdapter(ABC):
    analyst_workers: int
    failure_only: bool
    minibatch_size: int
    edit_budget: int

    def setup(self, cfg: dict[str, JsonValue]) -> None: ...
    def get_dataloader(self) -> BaseDataLoader | None: ...
    def requires_ray(self) -> bool: ...
    @abstractmethod
    def build_train_env(self, batch_size: int, seed: int, **kwargs: JsonValue) -> object: ...
    @abstractmethod
    def build_eval_env(
        self,
        env_num: int,
        split: str,
        seed: int,
        **kwargs: JsonValue,
    ) -> object: ...
    @abstractmethod
    def rollout(
        self,
        env_manager: Sequence[Task],
        skill_content: str,
        out_dir: str,
        **kwargs: JsonValue,
    ) -> list[dict[str, JsonValue]]: ...
    def reflect(
        self,
        results: list[dict[str, JsonValue]],
        skill_content: str,
        out_dir: str,
        **kwargs: JsonValue,
    ) -> list[dict[str, JsonValue] | None]: ...
    @abstractmethod
    def get_task_types(self) -> list[str]: ...
