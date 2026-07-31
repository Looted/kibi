from __future__ import annotations

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
        self.analyst_workers = 2
        self.failure_only = False
        self.minibatch_size = 4
        self.edit_budget = 4

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
            reflection = row.failure_category or row.conversation_path
            trajectory = TrainTrajectory.model_validate(
                {"taskId": row.id, "family": family, "reflection": reflection}
            )
            trajectory_payload = trajectory.model_dump(by_alias=True, mode="json")
            if split == "train":
                self.record_train_trajectory(trajectory)
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
        return rows

    def _invoke_bridge(self, request_json: str) -> str:
        return run_bridge(request_json)

    @override
    def _invoke_optimizer_bridge(self, request_path: Path, result_path: Path) -> None:
        run_optimizer_bridge(request_path, result_path)
