from __future__ import annotations

from importlib import import_module
from pathlib import Path
from typing import Protocol, cast

from .adapter import EnvAdapter
from .run_lock import load_skillopt_source_lock


class _TrainerProtocol:
    def train(self) -> dict[object, object]:
        raise NotImplementedError


class _TrainerFactory(Protocol):
    def __call__(self, config: dict[str, object], adapter: EnvAdapter) -> _TrainerProtocol: ...


def build_training_config(out_root: Path, *, max_steps: int = 4) -> dict[str, object]:
    if max_steps < 1 or max_steps > 4:
        raise ValueError("max_steps must be between 1 and 4")
    lock = load_skillopt_source_lock()
    return {
        "out_root": str(out_root),
        "skillopt_commit": lock.commit,
        "train_size": 8,
        "sel_env_num": 4,
        "test_env_num": 0,
        "epochs": 1,
        "steps_per_epoch": 1,
        "max_steps": max_steps,
        "edit_budget": 4,
        "edit_budget_min": 2,
        "edit_budget_max": 4,
        "edit_budget_schedule": "fixed_cosine",
        "use_gate": True,
        "gate_metric": "hard",
        "use_slow_update": False,
        "use_meta_skill": True,
        "minibatch_size": 4,
        "merge_batch_size": 4,
        "analyst_workers": 2,
        "max_api_workers": 2,
        "failure_only": False,
        "skill_update_mode": "patch",
        "eval_test": False,
        "base_seeds": [5417],
    }


def run_training(adapter: EnvAdapter, out_root: Path, *, max_steps: int = 4) -> dict[str, object]:
    config = build_training_config(out_root, max_steps=max_steps)
    module = import_module("skillopt.engine.trainer")
    factory = cast(_TrainerFactory, getattr(module, "ReflACTTrainer"))
    trainer = factory(config, adapter)
    result = cast(object, trainer.train())
    if not isinstance(result, dict):
        raise TypeError("SkillOpt trainer returned a non-object result")
    typed_result = cast(dict[object, object], result)
    return {str(key): value for key, value in typed_result.items()}
