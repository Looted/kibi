from __future__ import annotations

import hashlib
import json
import subprocess
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import final

from .bridge import BridgeError, FileBridge
from .common import contract_hash
from .dataloader import SplitDataLoader
from .models import AdapterCheckpoint, BridgeRequest

Task = Mapping[str, object]


def _text(value: object, field: str) -> str:
    if not isinstance(value, str) or not value:
        raise BridgeError(f"task_missing_{field}")
    return value


def _batch_items(payload: object) -> tuple[Task, ...]:
    if not isinstance(payload, tuple) or not all(isinstance(item, Mapping) for item in payload):
        raise BridgeError("invalid_batch_payload")
    return tuple(item for item in payload)


@final
class EnvAdapter:
    def __init__(
        self,
        *,
        bridge_command: Sequence[str],
        run_root: Path,
        skill: str,
        source_lock_hash: str,
        train_items: Sequence[Task],
        development_items: Sequence[Task],
        run_id: str = "00000000-0000-4000-8000-000000000080",
        bridge_cwd: Path | None = None,
    ) -> None:
        if not bridge_command:
            raise BridgeError("bridge_command_missing")
        self.bridge_command = tuple(bridge_command)
        self.run_root = run_root.resolve()
        self.skill = skill
        self.source_lock_hash = source_lock_hash
        self.run_id = run_id
        self.bridge_cwd = bridge_cwd
        self._loader = SplitDataLoader(train_items, development_items)

    def get_dataloader(self) -> SplitDataLoader:
        return self._loader

    def build_train_env(self, batch_size: int, seed: int, **kwargs: object) -> tuple[Task, ...]:
        batch = self._loader.build_train_batch(batch_size, seed, **kwargs)
        return _batch_items(batch.payload)

    def build_eval_env(
        self, env_num: int, split: str, seed: int, **kwargs: object
    ) -> tuple[Task, ...]:
        batch = self._loader.build_eval_batch(env_num, split, seed, **kwargs)
        return _batch_items(batch.payload)

    def get_task_types(self) -> list[str]:
        return ["kibi-mcp", "kibi-state", "kibi-approval"]

    def build_request(
        self, task_id: str, skill_content: str, split: str
    ) -> BridgeRequest:
        if split not in {"train", "development"} or "held-out" in task_id or "heldout" in task_id:
            raise BridgeError("held-out task ids are not bridge inputs")
        return BridgeRequest.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "skillopt-bridge-request",
                "runId": self.run_id,
                "batchId": f"batch-{hashlib.sha256(task_id.encode()).hexdigest()[:16]}",
                "skill": self.skill,
                "phase": split,
                "candidateBody": skill_content,
                "taskIds": [task_id],
                "sourceLockHash": self.source_lock_hash,
            }
        )

    def rollout(
        self,
        env_manager: object,
        skill_content: str,
        out_dir: str,
        **_: object,
    ) -> list[dict[str, object]]:
        items = tuple(env_manager) if isinstance(env_manager, (list, tuple)) else ()
        if not items or not all(isinstance(item, Mapping) for item in items):
            raise BridgeError("rollout_requires_public_task_items")
        output_root = Path(out_dir).resolve()
        bridge = FileBridge(output_root / "requests", output_root / "results")
        rows: list[dict[str, object]] = []
        for item in items:
            task = item if isinstance(item, Mapping) else {}
            task_id = _text(task.get("id"), "id")
            split = str(task.get("split", "train"))
            request = self.build_request(task_id, skill_content, split)
            request_name = f"{request.batch_id}.json"
            result_name = f"{request.batch_id}.json"
            bridge.write_request(request_name, request)
            self._invoke_bridge(
                bridge.resolve(request_name, "public"),
                bridge.resolve(result_name, "public"),
            )
            result = bridge.read_result(result_name, request)
            row = next((candidate for candidate in result.rows if candidate.id == task_id), None)
            if row is None:
                raise BridgeError("bridge_result_missing_task")
            rows.append(
                {
                    "id": row.id,
                    "hard": row.hard,
                    "soft": row.soft,
                    "failure_category": row.failure_category,
                    "conversation_path": row.conversation_path,
                    "evidence_refs": tuple(row.evidence_refs),
                }
            )
        return rows

    def reflect(
        self,
        _results: list[dict[str, object]],
        _skill_content: str,
        _out_dir: str,
        **_: object,
    ) -> list[dict[str, object] | None]:
        return []

    def save_checkpoint(
        self,
        completed_steps: int,
        candidate_body: str,
        completed_task_ids: Sequence[str],
        max_steps: int = 4,
    ) -> AdapterCheckpoint:
        checkpoint = AdapterCheckpoint.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "skillopt-adapter-checkpoint",
                "maxSteps": max_steps,
                "completedSteps": completed_steps,
                "nextStep": completed_steps + 1,
                "candidateBodyHash": contract_hash(candidate_body),
                "completedTaskIds": list(completed_task_ids),
                "interrupted": False,
            }
        )
        self.run_root.mkdir(parents=True, exist_ok=True)
        (self.run_root / "adapter-checkpoint.json").write_text(
            json.dumps(checkpoint.model_dump(by_alias=True, mode="json"), sort_keys=True) + "\n",
            encoding="utf-8",
        )
        return checkpoint

    def load_checkpoint(self) -> AdapterCheckpoint:
        path = self.run_root / "adapter-checkpoint.json"
        return AdapterCheckpoint.model_validate_json(path.read_text(encoding="utf-8"))

    def _invoke_bridge(self, request_path: Path, result_path: Path) -> None:
        command = [
            *self.bridge_command,
            "--request",
            str(request_path),
            "--result",
            str(result_path),
        ]
        try:
            completed = subprocess.run(
                command,
                cwd=self.bridge_cwd,
                check=False,
                capture_output=True,
                text=True,
                timeout=120,
                env={"PATH": str(Path("/usr/bin")), "LANG": "C", "LC_ALL": "C"},
            )
        except subprocess.TimeoutExpired as error:
            raise BridgeError("bridge_timeout") from error
        if completed.returncode != 0:
            raise BridgeError(f"bridge_exit:{completed.returncode}")
