from typing import Protocol

from tools.skillopt.kibi_skillopt.common import JsonValue

class Adapter(Protocol): ...

def select_gate_score(
    hard: float,
    soft: float,
    metric: str = ...,
    mixed_weight: float = ...,
    *,
    skill_content: str = ...,
    use_semantic_density: bool = ...,
    semantic_density_weight: float = ...,
    leading_words: list[str] | None = ...,
) -> float: ...

class ReflACTTrainer:
    def __init__(self, config: dict[str, JsonValue], adapter: Adapter) -> None: ...
    def train(self) -> dict[str, JsonValue]: ...
