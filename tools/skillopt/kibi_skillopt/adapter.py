from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import final

from skillopt.envs.base import EnvAdapter as SkillOptEnvAdapter
from typing_extensions import override

from .bridge import BridgeError, OptimizerBridgeContext
from .bridge_runner import run_bridge, run_optimizer_bridge
from .common import JsonValue, contract_hash
from .dataloader import SplitDataLoader
from .models import BridgeRequest, BridgeResult, CorpusRoots, PublicTaskClaim, TrainTrajectory
from .optimizer_adapter import OptimizerAdapterMixin
from .task_data import Task, is_held_out, public_items, task_family, task_text


@final
class EnvAdapter(OptimizerAdapterMixin, SkillOptEnvAdapter):
    def __init__(
        self,
        *,
        run_root: Path,
        skill: str,
        source_lock_hash: str,
        corpus_roots: Mapping[str, JsonValue],
        train_items: Sequence[Task],
        development_items: Sequence[Task],
        run_id: str = "00000000-0000-4000-8000-000000000080",
    ) -> None:
        self.skill = skill
        self.source_lock_hash = source_lock_hash
        resolved_run_root = run_root.resolve()
        resolved_corpus_roots = CorpusRoots.model_validate(corpus_roots)
        self.run_id = run_id
        self._train_items = public_items(train_items, "train")
        self._development_items = public_items(development_items, "development")
        self._train_ids = frozenset(task_text(item.get("id"), "id") for item in self._train_items)
        optimizer_context = OptimizerBridgeContext(
            run_id=self.run_id,
            skill=self.skill,
            source_lock_hash=self.source_lock_hash,
            corpus_roots=resolved_corpus_roots,
            train_ids=self._train_ids,
        )
        OptimizerAdapterMixin.__init__(
            self,
            run_root=resolved_run_root,
            corpus_roots=resolved_corpus_roots,
            optimizer_context=optimizer_context,
        )
        self._loader = SplitDataLoader(self._train_items, self._development_items)
        self._recorded_train_trajectories: list[TrainTrajectory] = []
        self._development_by_body_hash: dict[str, dict[str, JsonValue]] = {}
        self._optimizer_step = max(
            (
                int(path.name.removeprefix("step-"))
                for path in (resolved_run_root / "optimizer").glob("step-*")
                if path.name.removeprefix("step-").isdigit()
            ),
            default=0,
        )
        self._max_steps = 4
        self.analyst_workers = 2
        self.failure_only = False
        self.minibatch_size = 4
        self.edit_budget = 4

    @override
    def setup(self, cfg: dict[str, JsonValue]) -> None:
        super().setup(cfg)
        configured = cfg.get("max_steps", 4)
        if not isinstance(configured, int) or isinstance(configured, bool):
            raise BridgeError("invalid_max_steps")
        self._max_steps = configured

    @override
    def get_dataloader(self) -> SplitDataLoader:
        return self._loader

    @override
    def build_train_env(self, batch_size: int, seed: int, **kwargs: JsonValue) -> tuple[Task, ...]:
        batch = self._loader.build_train_batch(batch_size, seed, **kwargs)
        if batch.payload is None:
            raise BridgeError("invalid_batch_payload")
        return batch.payload

    @override
    def build_eval_env(
        self, env_num: int, split: str, seed: int, **kwargs: JsonValue
    ) -> tuple[Task, ...]:
        batch = self._loader.build_eval_batch(env_num, split, seed, **kwargs)
        if batch.payload is None:
            raise BridgeError("invalid_batch_payload")
        return batch.payload

    @override
    def get_task_types(self) -> list[str]:
        task_types: list[str] = []
        for item in (*self._train_items, *self._development_items):
            family = task_family(item)
            if family not in task_types:
                task_types.append(family)
        return task_types

    @property
    def train_trajectories(self) -> tuple[TrainTrajectory, ...]:
        return tuple(self._recorded_train_trajectories)

    def record_train_trajectory(self, trajectory: TrainTrajectory) -> None:
        if trajectory.task_id not in self._train_ids:
            raise BridgeError("optimizer requires public train task ids")
        self._recorded_train_trajectories.append(trajectory)

    @staticmethod
    def _public_evidence_summary(
        trajectories: Sequence[TrainTrajectory],
    ) -> dict[str, JsonValue]:
        if not trajectories:
            raise BridgeError("public evidence summary requires trajectories")
        by_family: dict[str, list[TrainTrajectory]] = {}
        for trajectory in trajectories:
            by_family.setdefault(trajectory.family, []).append(trajectory)
        families: list[JsonValue] = []
        for family, entries in sorted(by_family.items()):
            failure_counts: dict[str, int] = {}
            for entry in entries:
                for category in entry.failure_categories:
                    failure_counts[category] = failure_counts.get(category, 0) + 1
            families.append(
                {
                    "family": family,
                    "attempts": len(entries),
                    "hardPasses": sum(entry.hard for entry in entries),
                    "meanSoft": sum(float(entry.soft) for entry in entries) / len(entries),
                    "failureCounts": [
                        {"category": category, "count": count}
                        for category, count in sorted(failure_counts.items())
                    ],
                }
            )
        return {
            "attempts": len(trajectories),
            "hardPasses": sum(entry.hard for entry in trajectories),
            "families": families,
        }

    def development_gate_for(self, skill_content: str) -> dict[str, JsonValue] | None:
        gate = self._development_by_body_hash.get(contract_hash(skill_content))
        return None if gate is None else dict(gate)

    def record_development_gate(
        self, skill_content: str, rows: Sequence[dict[str, JsonValue]]
    ) -> None:
        if not rows:
            raise BridgeError("development_requires_rows")
        by_family: dict[str, list[float]] = {}
        soft_scores: list[float] = []
        hard_passes = 0
        for row in rows:
            soft_value = row.get("soft")
            if not isinstance(soft_value, (int, float)) or isinstance(soft_value, bool):
                raise BridgeError("development_requires_numeric_soft")
            hard_value = row.get("hard")
            if not isinstance(hard_value, (int, float)) or isinstance(hard_value, bool):
                raise BridgeError("development_requires_numeric_hard")
            soft = float(soft_value)
            family = str(row.get("task_type", "unknown"))
            soft_scores.append(soft)
            by_family.setdefault(family, []).append(soft)
            hard_passes += int(hard_value)
        family_means = [sum(scores) / len(scores) for scores in by_family.values()]
        self._development_by_body_hash[contract_hash(skill_content)] = {
            "mean": sum(soft_scores) / len(soft_scores),
            "hardPasses": hard_passes,
            "worstFamilyMean": min(family_means),
        }

    @staticmethod
    def _write_conversation(
        out_dir: str,
        task_id: str,
        public_claim: PublicTaskClaim,
        trajectory: TrainTrajectory,
    ) -> None:
        prediction_root = Path(out_dir) / "predictions" / task_id
        prediction_root.mkdir(parents=True, mode=0o700, exist_ok=True)
        conversation: list[dict[str, JsonValue]] = []
        for tool_call in trajectory.tool_sequence:
            conversation.append(
                {"type": "tool_call", "cmd": tool_call, "obs": "brokered tool call completed"}
            )
        conversation.append(
            {
                "role": "system",
                "content": trajectory.reflection,
            }
        )
        _ = (prediction_root / "conversation.json").write_text(
            json.dumps(conversation, sort_keys=True) + "\n", encoding="utf-8"
        )
        _ = (prediction_root / "target_user_prompt.txt").write_text(
            public_claim.text, encoding="utf-8"
        )

    def build_request(self, task: Task, skill_content: str) -> BridgeRequest:
        task_id = task_text(task.get("id"), "id")
        split = task_text(task.get("split", "train"), "split")
        if split not in {"train", "development"} or is_held_out(task_id):
            raise BridgeError("held-out task ids are not bridge inputs")
        public_claim = PublicTaskClaim.model_validate(task.get("publicClaim"))
        return BridgeRequest.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "skillopt-bridge-request",
                "runId": self.run_id,
                "batchId": f"batch-{contract_hash(task_id)[:16]}",
                "skill": self.skill,
                "phase": split,
                "candidateBody": skill_content,
                "taskIds": [task_id],
                "sourceLockHash": self.source_lock_hash,
                "publicClaim": public_claim.model_dump(by_alias=True, mode="json"),
            }
        )

    @override
    def rollout(
        self,
        env_manager: Sequence[Task],
        skill_content: str,
        out_dir: str,
        **_kwargs: JsonValue,
    ) -> list[dict[str, JsonValue]]:
        items = tuple(env_manager)
        if not items:
            raise BridgeError("rollout_requires_public_task_items")
        rows: list[dict[str, JsonValue]] = []
        for item in items:
            task_id = task_text(item.get("id"), "id")
            split = task_text(item.get("split", "train"), "split")
            family = task_family(item)
            request = self.build_request(item, skill_content)
            result = BridgeResult.model_validate_json(
                self._invoke_bridge(request.model_dump_json(by_alias=True))
            )
            expected_hash = contract_hash(request.model_dump(by_alias=True, mode="json"))
            if result.run_id != request.run_id or result.batch_id != request.batch_id:
                raise BridgeError("bridge_request_identity_mismatch")
            if result.request_hash != expected_hash:
                raise BridgeError("bridge_request_hash_mismatch")
            row = next((candidate for candidate in result.rows if candidate.id == task_id), None)
            if row is None:
                raise BridgeError("bridge_result_missing_task")
            failure_categories = row.failure_categories or (
                (row.failure_category,) if row.failure_category is not None else ()
            )
            reflection = json.dumps(
                {
                    "status": row.status,
                    "score": row.soft,
                    "hardPass": bool(row.hard),
                    "failureCategories": list(failure_categories),
                    "toolSequence": list(row.tool_sequence),
                    "finalStateSummary": row.final_state_summary,
                },
                sort_keys=True,
                separators=(",", ":"),
            )
            trajectory = TrainTrajectory.model_validate(
                {
                    "taskId": row.id,
                    "family": family,
                    "reflection": reflection,
                    "status": row.status,
                    "soft": row.soft,
                    "hard": row.hard,
                    "failureCategories": list(failure_categories),
                    "toolSequence": list(row.tool_sequence),
                    "finalStateSummary": row.final_state_summary,
                }
            )
            trajectory_payload = trajectory.model_dump(by_alias=True, mode="json")
            if split == "train":
                self.record_train_trajectory(trajectory)
            self._write_conversation(out_dir, row.id, request.public_claim, trajectory)
            rollout_row: dict[str, JsonValue] = {
                "id": row.id,
                "hard": row.hard,
                "soft": row.soft,
                "status": row.status,
                "task_type": family,
                "failure_category": row.failure_category,
                "conversation_path": row.conversation_path,
                "evidence_refs": list(row.evidence_refs),
                "trajectory": trajectory_payload,
                "trajectory_hash": contract_hash(trajectory_payload),
            }
            rows.append(rollout_row)
        if all(task_text(item.get("split", "train"), "split") == "development" for item in items):
            self.record_development_gate(skill_content, rows)
        return rows

    @override
    def reflect(
        self,
        results: list[dict[str, JsonValue]],
        skill_content: str,
        out_dir: str,
        **_kwargs: JsonValue,
    ) -> list[dict[str, JsonValue] | None]:
        del out_dir
        trajectories = tuple(
            TrainTrajectory.model_validate(result.get("trajectory")) for result in results
        )
        if not trajectories:
            raise BridgeError("reflection_requires_trajectories")
        previous = self.development_gate_for(skill_content)
        if previous is None:
            raise BridgeError("reflection_requires_development_baseline")
        self._optimizer_step += 1
        cumulative = self.train_trajectories or trajectories
        optimized = self.optimize(
            current_body=skill_content,
            trajectories=tuple(
                trajectory.model_dump(by_alias=True, mode="json") for trajectory in trajectories
            ),
            previous_development=previous,
            step=self._optimizer_step,
            max_steps=self._max_steps,
            public_evidence_summary=self._public_evidence_summary(cumulative),
        )
        return [
            {
                "source_type": "failure",
                "batch_size": len(trajectories),
                "patch": {
                    "reasoning": "Kibi-specific reflection from scored public trajectories",
                    "skill_candidates": [
                        {
                            "title": f"Kibi SkillOpt proposal {self._optimizer_step}",
                            "new_skill": optimized.body,
                            "change_summary": [
                                "Translated scored public failures into procedural guidance"
                            ],
                        }
                    ],
                },
            }
        ]

    def _invoke_bridge(self, request_json: str) -> str:
        return run_bridge(request_json)

    @override
    def _invoke_optimizer_bridge(self, request_path: Path, result_path: Path) -> None:
        run_optimizer_bridge(request_path, result_path)
