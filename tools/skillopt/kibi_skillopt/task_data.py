from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Literal

from .bridge import BridgeError
from .common import JsonValue

Task = Mapping[str, JsonValue]


def task_text(value: JsonValue, field: str) -> str:
    if not isinstance(value, str) or not value:
        raise BridgeError(f"task_missing_{field}")
    return value


def task_family(task: Task) -> str:
    for field in ("family", "semanticClass", "task_type", "subtype"):
        value = task.get(field)
        if isinstance(value, str) and value:
            return value
    raise BridgeError("task_missing_family")


def is_held_out(task_id: str) -> bool:
    normalized = task_id.lower()
    return "held-out" in normalized or "heldout" in normalized


def public_items(items: Sequence[Task], split: Literal["train", "development"]) -> tuple[Task, ...]:
    public = tuple(dict(item) for item in items)
    for item in public:
        task_id = task_text(item.get("id"), "id")
        if is_held_out(task_id):
            raise BridgeError("held-out task ids are not adapter inputs")
        declared_split = item.get("split")
        if declared_split is not None and declared_split != split:
            raise BridgeError("task_split_mismatch")
        _ = task_family(item)
    return public
