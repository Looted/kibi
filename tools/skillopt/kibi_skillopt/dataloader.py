from __future__ import annotations

from collections.abc import Mapping, Sequence

from skillopt.datasets.base import BaseDataLoader, BatchSpec

from .bridge import BridgeError

Task = Mapping[str, object]


def _task_id(task: Task) -> str:
    value = task.get("id")
    if not isinstance(value, str) or not value:
        raise BridgeError("task_missing_id")
    return value


class SplitDataLoader(BaseDataLoader):
    def __init__(
        self,
        train_items: Sequence[Task],
        development_items: Sequence[Task],
    ) -> None:
        self._train = tuple(dict(item) for item in train_items)
        self._development = tuple(dict(item) for item in development_items)
        self._state: dict[str, int] = {"train_batches": 0, "development_batches": 0}

    def get_train_size(self) -> int:
        return len(self._train)

    def state_dict(self) -> dict[str, int]:
        return dict(self._state)

    def load_state_dict(self, state: Mapping[str, object]) -> None:
        for key in self._state:
            value = state.get(key, 0)
            if not isinstance(value, int) or value < 0:
                raise BridgeError("invalid_dataloader_state")
            self._state[key] = value

    def build_train_batch(self, batch_size: int, seed: int, **_: object) -> BatchSpec:
        if batch_size < 1:
            raise BridgeError("invalid_batch_size")
        self._state["train_batches"] += 1
        offset = (seed - 1) % max(len(self._train), 1)
        items = tuple(
            self._train[(offset + index) % len(self._train)]
            for index in range(batch_size)
        )
        return BatchSpec(
            phase="train",
            split="train",
            seed=seed,
            batch_size=batch_size,
            payload=items,
            metadata={"taskIds": tuple(_task_id(item) for item in items)},
        )

    def build_eval_batch(
        self, env_num: int, split: str, seed: int, **_: object
    ) -> BatchSpec:
        if split not in {"development", "valid_seen", "selection", "val"}:
            raise BridgeError("held-out-split-requested")
        if env_num < 1:
            raise BridgeError("invalid_batch_size")
        self._state["development_batches"] += 1
        items = tuple(self._development[index % len(self._development)] for index in range(env_num))
        return BatchSpec(
            phase="eval",
            split="development",
            seed=seed,
            batch_size=env_num,
            payload=items,
            metadata={"taskIds": tuple(_task_id(item) for item in items)},
        )
