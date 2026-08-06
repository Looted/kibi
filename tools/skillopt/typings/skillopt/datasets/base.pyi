from collections.abc import Mapping
from typing import TypeAlias

JsonValue: TypeAlias = str | int | float | bool | None | list[JsonValue] | dict[str, JsonValue]
Task: TypeAlias = Mapping[str, JsonValue]
BatchPayload: TypeAlias = tuple[Task, ...]

class BatchSpec:
    phase: str
    split: str
    seed: int
    batch_size: int
    payload: BatchPayload | None
    metadata: Mapping[str, JsonValue]

    def __init__(
        self,
        phase: str,
        split: str,
        seed: int,
        batch_size: int,
        payload: BatchPayload | None = None,
        metadata: Mapping[str, JsonValue] = ...,
    ) -> None: ...

class BaseDataLoader:
    def get_train_size(self) -> int | None: ...
    def state_dict(self) -> dict[str, int]: ...
    def load_state_dict(self, state: Mapping[str, JsonValue]) -> None: ...
    def build_train_batch(self, batch_size: int, seed: int, **kwargs: JsonValue) -> BatchSpec: ...
    def build_eval_batch(
        self, env_num: int, split: str, seed: int, **kwargs: JsonValue
    ) -> BatchSpec: ...
