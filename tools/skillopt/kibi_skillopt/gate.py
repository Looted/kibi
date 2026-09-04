from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from typing import Literal

from skillopt.evaluation.gate import select_gate_score as upstream_select_gate_score

GateMetric = Literal["hard", "soft", "mixed"]

# Smaller than one miss on the selection splits we use (4 development / 16
# held-out). A perfect soft bonus cannot offset a 1/16 hard regression.
HARD_PRIMARY_SOFT_TIEBREAK = 1e-6


def select_gate_score_hard_primary(
    hard: float,
    soft: float,
    metric: GateMetric | str = "hard",
    mixed_weight: float = 0.5,
    *,
    skill_content: str = "",
    use_semantic_density: bool = False,
    semantic_density_weight: float = 0.05,
    leading_words: list[str] | None = None,
) -> float:
    """Keep `gate_metric=hard` honest, but break exact hard ties with soft.

    Upstream `evaluate_gate` uses strict `>` on a single scalar, so a tied
    hard score is rejected even when selection_soft improved. Fold a
    lexicographic soft term into the hard metric that cannot outweigh a
    single-task hard miss.
    """
    if metric == "hard":
        base = upstream_select_gate_score(
            hard,
            0.0,
            "hard",
            mixed_weight,
            skill_content=skill_content,
            use_semantic_density=use_semantic_density,
            semantic_density_weight=semantic_density_weight,
            leading_words=leading_words,
        )
        return float(base) + HARD_PRIMARY_SOFT_TIEBREAK * float(soft)
    if metric == "soft":
        resolved: GateMetric = "soft"
    elif metric == "mixed":
        resolved = "mixed"
    else:
        raise ValueError(
            f"unknown gate metric {metric!r}; expected 'hard', 'soft', or 'mixed'"
        )
    return float(
        upstream_select_gate_score(
            hard,
            soft,
            resolved,
            mixed_weight,
            skill_content=skill_content,
            use_semantic_density=use_semantic_density,
            semantic_density_weight=semantic_density_weight,
            leading_words=leading_words,
        )
    )


@contextmanager
def patched_hard_primary_gate() -> Generator[None, None, None]:
    """Patch both SkillOpt bindings; trainer imports select_gate_score by name."""
    import skillopt.engine.trainer as trainer_mod
    import skillopt.evaluation.gate as gate_mod

    original_gate = gate_mod.select_gate_score
    original_trainer = trainer_mod.select_gate_score
    gate_mod.select_gate_score = select_gate_score_hard_primary
    trainer_mod.select_gate_score = select_gate_score_hard_primary
    try:
        yield
    finally:
        gate_mod.select_gate_score = original_gate
        trainer_mod.select_gate_score = original_trainer
