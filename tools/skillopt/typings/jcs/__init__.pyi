from typing import TypeAlias

JsonValue: TypeAlias = str | int | float | bool | None | list[JsonValue] | dict[str, JsonValue]

def canonicalize(value: JsonValue) -> bytes: ...
