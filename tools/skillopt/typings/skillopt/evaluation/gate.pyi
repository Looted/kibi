from typing import Literal

GateMetric = Literal["hard", "soft", "mixed"]

class GateResult:
    action: Literal["accept_new_best", "accept", "reject"]
    current_skill: str
    current_score: float
    best_skill: str
    best_score: float
    best_step: int

def select_gate_score(
    hard: float,
    soft: float,
    metric: GateMetric | str = ...,
    mixed_weight: float = ...,
    *,
    skill_content: str = ...,
    use_semantic_density: bool = ...,
    semantic_density_weight: float = ...,
    leading_words: list[str] | None = ...,
) -> float: ...

def evaluate_gate(
    candidate_skill: str,
    cand_hard: float,
    current_skill: str,
    current_score: float,
    best_skill: str,
    best_score: float,
    best_step: int,
    global_step: int,
    *,
    cand_soft: float = ...,
    metric: GateMetric | str = ...,
    mixed_weight: float = ...,
    use_semantic_density: bool = ...,
    semantic_density_weight: float = ...,
    leading_words: list[str] | None = ...,
) -> GateResult: ...
