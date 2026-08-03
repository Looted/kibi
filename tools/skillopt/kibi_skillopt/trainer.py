from __future__ import annotations

import json
from pathlib import Path

from skillopt.engine.trainer import ReflACTTrainer

from .adapter import EnvAdapter
from .common import JsonValue, contract_hash, parse_json_value
from .run_lock import load_skillopt_source_lock


class TrainingConfigError(ValueError):
    max_steps: int

    def __init__(self, max_steps: int) -> None:
        self.max_steps = max_steps
        super().__init__(f"max_steps must be between 1 and 4; received {max_steps}")


class TrainingArtifactError(TypeError):
    detail: str

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def build_training_config(out_root: Path, *, max_steps: int = 4) -> dict[str, JsonValue]:
    if max_steps < 1 or max_steps > 4:
        raise TrainingConfigError(max_steps)
    lock = load_skillopt_source_lock()
    return {
        "out_root": str(out_root),
        "skillopt_commit": lock.commit,
        "skill_init": str(out_root / "initial-skill.md"),
        "train_size": 0,
        "sel_env_num": 4,
        "test_env_num": 0,
        "num_epochs": max_steps,
        "batch_size": 8,
        "accumulation": 1,
        "seed": 5417,
        "max_steps": max_steps,
        "edit_budget": 4,
        "min_edit_budget": 2,
        "lr_scheduler": "constant",
        "use_gate": True,
        "gate_metric": "soft",
        "use_slow_update": False,
        "use_meta_skill": False,
        "minibatch_size": 4,
        "merge_batch_size": 4,
        "analyst_workers": 2,
        "max_api_workers": 2,
        "failure_only": False,
        "skill_update_mode": "full_rewrite_minibatch",
        "eval_test": False,
        "model_backend": "codex_exec",
        "optimizer_backend": "codex_exec",
        "target_backend": "codex_exec",
        "optimizer_model": "codex",
        "target_model": "codex",
    }


def _trajectory_payloads(adapter: EnvAdapter) -> tuple[dict[str, JsonValue], ...]:
    payloads: list[dict[str, JsonValue]] = []
    for trajectory in adapter.train_trajectories:
        payload = parse_json_value(trajectory.model_dump_json(by_alias=True))
        if not isinstance(payload, dict):
            raise TrainingArtifactError("SkillOpt trajectory payload must be a mapping")
        payloads.append(payload)
    return tuple(payloads)


def _frozen_candidate_path(out_root: Path) -> Path:
    return out_root / "frozen-candidate.json"


def _resume_frozen_candidate(out_root: Path) -> dict[str, JsonValue] | None:
    frozen_path = _frozen_candidate_path(out_root)
    if not frozen_path.is_file():
        return None
    payload = parse_json_value(frozen_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise TrainingArtifactError("frozen candidate artifact must be a mapping")
    result = payload.get("result")
    if not isinstance(result, dict):
        raise TrainingArtifactError("frozen candidate artifact missing result")
    return {str(key): value for key, value in result.items()}


def _write_frozen_candidate(
    out_root: Path,
    *,
    candidate_body: str,
    candidate_body_hash: str,
    trainer_checkpoint_hash: str,
    trajectory_hashes: tuple[str, ...],
    corpus_roots: dict[str, JsonValue],
    result: dict[str, JsonValue],
) -> None:
    payload = {
        "schemaVersion": "1.0.0",
        "artifactType": "skillopt-frozen-candidate",
        "candidateBody": candidate_body,
        "candidateBodyHash": candidate_body_hash,
        "trainerCheckpointHash": trainer_checkpoint_hash,
        "trajectoryHashes": list(trajectory_hashes),
        "corpusRoots": corpus_roots,
        "result": result,
    }
    _ = _frozen_candidate_path(out_root).write_text(
        json.dumps(payload, sort_keys=True) + "\n", encoding="utf-8"
    )


def run_training(
    adapter: EnvAdapter, out_root: Path, *, max_steps: int = 4
) -> dict[str, JsonValue]:
    resumed = _resume_frozen_candidate(out_root)
    if resumed is not None:
        return resumed
    config = build_training_config(out_root, max_steps=max_steps)
    trainer = ReflACTTrainer(config, adapter)
    result = trainer.train()
    normalized_result = {str(key): value for key, value in result.items()}
    trajectories = _trajectory_payloads(adapter)
    if not trajectories:
        raise TrainingArtifactError("SkillOpt completed without public trajectories")
    current_body = (out_root / "best_skill.md").read_text(encoding="utf-8")
    development = adapter.development_gate_for(current_body)
    if development is None:
        raise TrainingArtifactError(
            "SkillOpt best candidate is missing its scored development gate"
        )
    _ = (out_root / "codex-optimized-skill.md").write_text(current_body, encoding="utf-8")
    completed_task_ids = tuple(trajectory.task_id for trajectory in adapter.train_trajectories)
    completed_steps_value = normalized_result.get("total_steps", max_steps)
    completed_steps = (
        completed_steps_value
        if isinstance(completed_steps_value, int) and not isinstance(completed_steps_value, bool)
        else max_steps
    )
    checkpoint = adapter.save_checkpoint(
        min(max_steps, completed_steps),
        current_body,
        completed_task_ids,
        max_steps=max_steps,
        trajectories=trajectories,
    )
    normalized_result["codex_candidate_body_hash"] = contract_hash(current_body)
    normalized_result["codex_candidate_body"] = current_body
    normalized_result["candidate_development"] = development
    normalized_result["trainer_checkpoint_hash"] = checkpoint.trainer_checkpoint_hash
    normalized_result["trajectory_hashes"] = list(checkpoint.trajectory_hashes)
    normalized_result["corpus_roots"] = checkpoint.corpus_roots.model_dump(
        by_alias=True, mode="json"
    )
    _write_frozen_candidate(
        out_root,
        candidate_body=current_body,
        candidate_body_hash=checkpoint.candidate_body_hash,
        trainer_checkpoint_hash=checkpoint.trainer_checkpoint_hash,
        trajectory_hashes=checkpoint.trajectory_hashes,
        corpus_roots=checkpoint.corpus_roots.model_dump(by_alias=True, mode="json"),
        result=normalized_result,
    )
    return normalized_result
