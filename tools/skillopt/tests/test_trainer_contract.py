from __future__ import annotations

import json
import sys
import tempfile
import unittest
from collections.abc import Sequence
from pathlib import Path
from typing import final
from unittest.mock import patch

from skillopt.datasets.base import BatchSpec
from skillopt.engine import trainer as reflact_trainer
from tools.skillopt.kibi_skillopt.adapter import EnvAdapter
from tools.skillopt.kibi_skillopt.common import JsonValue, contract_hash, parse_json_value
from tools.skillopt.kibi_skillopt.models import OptimizerAcceptedResult, TrainTrajectory
from tools.skillopt.kibi_skillopt.trainer import build_training_config, run_training

HASH = "a" * 64
CORPUS_ROOTS = {
    "corpus": "b" * 64,
    "evaluator": "c" * 64,
    "querySet": "d" * 64,
    "baseline": "e" * 64,
    "catalog": "f" * 64,
    "verifier": "1" * 64,
    "publicRoot": "2" * 64,
    "privateRoot": "3" * 64,
    "artifactSchema": "4" * 64,
}
DEVELOPMENT = {"mean": 0.5, "hardPasses": 1, "worstFamilyMean": 0.5}


def public_claim(task_id: str) -> JsonValue:
    return {
        "taskId": task_id,
        "text": "Preserve the structured public claim.",
        "publicManifestHash": HASH,
        "workspaceHash": HASH,
    }


class TrainerContractTests(unittest.TestCase):
    def test_training_freezes_candidate_without_second_optimizer_call(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            subject = EnvAdapter(
                run_root=root / "run",
                skill="kibi-usage",
                source_lock_hash=HASH,
                corpus_roots=CORPUS_ROOTS,
                train_items=(
                    {
                        "id": "predicate-train-1",
                        "family": "predicate",
                        "publicClaim": public_claim("predicate-train-1"),
                    },
                ),
                development_items=(
                    {
                        "id": "predicate-development-1",
                        "family": "predicate",
                        "publicClaim": public_claim("predicate-development-1"),
                    },
                ),
            )
            subject.record_train_trajectory(
                TrainTrajectory.model_validate(
                    {"taskId": "predicate-train-1", "family": "predicate", "reflection": "missing"}
                )
            )

            class FakeTrainer:
                def __init__(
                    self, config: dict[str, JsonValue], trainer_adapter: EnvAdapter
                ) -> None:
                    self._config: dict[str, JsonValue] = config
                    self._adapter: EnvAdapter = trainer_adapter

                def train(self) -> dict[str, JsonValue]:
                    out_root = Path(str(self._config["out_root"]))
                    out_root.mkdir(parents=True, exist_ok=True)
                    _ = (out_root / "best_skill.md").write_text(
                        "Use Kibi through MCP.", encoding="utf-8"
                    )
                    self._adapter.record_development_gate(
                        "Use Kibi through MCP.",
                        [{"soft": 0.5, "hard": 1, "task_type": "predicate"}],
                    )
                    return {"best_selection_hard": 0.5, "total_steps": 4}

            optimized = OptimizerAcceptedResult.model_validate(
                {
                    "schemaVersion": "1.0.0",
                    "artifactType": "skillopt-optimizer-result",
                    "status": "accepted",
                    "requestHash": HASH,
                    "body": "Use Kibi through MCP.",
                    "development": DEVELOPMENT,
                }
            )

            # When
            with (
                patch(
                    "tools.skillopt.kibi_skillopt.trainer.ReflACTTrainer",
                    FakeTrainer,
                ),
                patch.object(subject, "optimize", return_value=optimized) as optimize,
            ):
                result = run_training(subject, root / "training")

            # Then
            self.assertIsNone(optimize.call_args)
            self.assertEqual(result["codex_candidate_body_hash"], contract_hash(optimized.body))
            candidate_development = result["candidate_development"]
            if not isinstance(candidate_development, dict):
                self.fail("candidate development must be an object")
            self.assertEqual(candidate_development["mean"], 0.5)
            self.assertTrue((root / "training" / "codex-optimized-skill.md").is_file())
            frozen = parse_json_value((root / "training" / "frozen-candidate.json").read_text())
            self.assertIsInstance(frozen, dict)
            if not isinstance(frozen, dict):
                self.fail("frozen candidate artifact must be an object")
            self.assertEqual(frozen["candidateBodyHash"], contract_hash(optimized.body))
            self.assertEqual(frozen["trainerCheckpointHash"], result["trainer_checkpoint_hash"])
            self.assertEqual(frozen["trajectoryHashes"], result["trajectory_hashes"])

    def test_training_resumes_a_frozen_candidate_without_reinvoking_reflact(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            subject = EnvAdapter(
                run_root=root / "run",
                skill="kibi-usage",
                source_lock_hash=HASH,
                corpus_roots=CORPUS_ROOTS,
                train_items=(
                    {
                        "id": "predicate-train-1",
                        "family": "predicate",
                        "publicClaim": public_claim("predicate-train-1"),
                    },
                ),
                development_items=(
                    {
                        "id": "predicate-development-1",
                        "family": "predicate",
                        "publicClaim": public_claim("predicate-development-1"),
                    },
                ),
            )
            subject.record_train_trajectory(
                TrainTrajectory.model_validate(
                    {"taskId": "predicate-train-1", "family": "predicate", "reflection": "missing"}
                )
            )
            calls = 0

            class FakeTrainer:
                def __init__(
                    self, config: dict[str, JsonValue], trainer_adapter: EnvAdapter
                ) -> None:
                    self._config: dict[str, JsonValue] = config
                    self._adapter: EnvAdapter = trainer_adapter

                def train(self) -> dict[str, JsonValue]:
                    nonlocal calls
                    calls += 1
                    out_root = Path(str(self._config["out_root"]))
                    out_root.mkdir(parents=True, exist_ok=True)
                    _ = (out_root / "best_skill.md").write_text(
                        "Use Kibi through MCP.", encoding="utf-8"
                    )
                    self._adapter.record_development_gate(
                        "Use Kibi through MCP.",
                        [{"soft": 0.5, "hard": 1, "task_type": "predicate"}],
                    )
                    return {"best_selection_hard": 0.5}

            optimized = OptimizerAcceptedResult.model_validate(
                {
                    "schemaVersion": "1.0.0",
                    "artifactType": "skillopt-optimizer-result",
                    "status": "accepted",
                    "requestHash": HASH,
                    "body": "Use Kibi through MCP.",
                    "development": DEVELOPMENT,
                }
            )

            # When
            with (
                patch(
                    "tools.skillopt.kibi_skillopt.trainer.ReflACTTrainer",
                    FakeTrainer,
                ),
                patch.object(subject, "optimize", return_value=optimized),
            ):
                first = run_training(subject, root / "training")
                second = run_training(subject, root / "training")

            # Then
            self.assertEqual(calls, 1)
            self.assertEqual(first, second)

    def test_rejected_optimizer_proposal_is_a_bounded_no_patch_step(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            out_root = root / "training"
            initial_body = "canonical body\n"
            initial_path = root / "initial-skill.md"
            _ = initial_path.write_text(initial_body, encoding="utf-8")

            @final
            class FakeAdapter:
                def __init__(self) -> None:
                    self.reflect_calls: int = 0
                    self.rollout_skills: list[str] = []

                def setup(self, config: dict[str, JsonValue]) -> None:
                    del config

                def get_dataloader(self) -> None:
                    return None

                def requires_ray(self) -> bool:
                    return False

                def build_env_from_batch(
                    self, batch: BatchSpec, **kwargs: JsonValue
                ) -> list[dict[str, JsonValue]]:
                    del kwargs
                    if batch.phase == "train":
                        return self.build_train_env(batch.batch_size, batch.seed)
                    return self.build_eval_env(batch.batch_size, batch.split, batch.seed)

                def build_train_env(
                    self, batch_size: int, seed: int, **kwargs: JsonValue
                ) -> list[dict[str, JsonValue]]:
                    del kwargs
                    return [{"id": f"train-{seed}"} for _ in range(batch_size)]

                def build_eval_env(
                    self, env_num: int, split: str, seed: int, **kwargs: JsonValue
                ) -> list[dict[str, JsonValue]]:
                    del kwargs
                    return [{"id": f"{split}-{seed}"} for _ in range(env_num)]

                def rollout(
                    self,
                    env_manager: Sequence[object],
                    skill_content: str,
                    out_dir: str,
                    **kwargs: JsonValue,
                ) -> list[dict[str, JsonValue]]:
                    del out_dir, kwargs
                    self.rollout_skills.append(skill_content)
                    return [
                        {
                            "id": f"task-{index}",
                            "hard": 1,
                            "soft": 1.0,
                            "task_type": "contract",
                        }
                        for index, _item in enumerate(env_manager)
                    ]

                def reflect(
                    self,
                    results: list[dict[str, JsonValue]],
                    skill_content: str,
                    out_dir: str,
                    **kwargs: JsonValue,
                ) -> list[dict[str, JsonValue] | None]:
                    del results, skill_content, out_dir, kwargs
                    self.reflect_calls += 1
                    if self.reflect_calls == 1:
                        # This represents the rejected direct-.kb proposal. It
                        # must not reach the trainer's candidate evaluation.
                        return []
                    return [
                        {
                            "source_type": "failure",
                            "patch": {
                                "skill_candidates": [
                                    {
                                        "title": "valid proposal",
                                        "new_skill": "valid body\n",
                                        "change_summary": ["repair"],
                                    }
                                ]
                            },
                        }
                    ]

                def get_task_types(self) -> list[str]:
                    return ["contract"]

            adapter = FakeAdapter()
            config = build_training_config(out_root, max_steps=2)
            config.update(
                {
                    "skill_init": str(initial_path),
                    "train_size": 2,
                    "batch_size": 1,
                    "num_epochs": 1,
                    "eval_test": False,
                }
            )
            merged_patch = {
                "reasoning": "stub optimizer",
                "skill_candidates": [
                    {
                        "title": "valid proposal",
                        "new_skill": "valid body\n",
                        "change_summary": ["repair"],
                    }
                ],
            }

            with patch.object(reflact_trainer, "merge_patches", return_value=merged_patch):
                result = reflact_trainer.ReflACTTrainer(  # type: ignore[arg-type]
                    config, adapter
                ).train()

            self.assertEqual(adapter.reflect_calls, 2)
            self.assertNotIn("rejected direct-.kb proposal\n", adapter.rollout_skills)
            self.assertEqual(result["total_steps"], 2)
            self.assertEqual((out_root / "best_skill.md").read_text(encoding="utf-8"), initial_body)


class TrainEntrypointTests(unittest.TestCase):
    def test_train_entrypoint_constructs_an_adapter_from_public_descriptors_only(self) -> None:
        from tools.skillopt.kibi_skillopt import __main__ as cli

        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            request = {
                "runId": "00000000-0000-4000-8000-000000000011",
                "skill": "kibi-usage",
                "runRoot": str(root / "run"),
                "outRoot": str(root / "out"),
                "maxSteps": 1,
                "sourceLockHash": HASH,
                "corpusRoots": CORPUS_ROOTS,
                "trainDescriptors": [
                    {
                        "id": "predicate-train-1",
                        "family": "predicate",
                        "split": "train",
                        "publicClaim": public_claim("predicate-train-1"),
                    }
                ],
                "developmentDescriptors": [
                    {
                        "id": "predicate-development-1",
                        "family": "predicate",
                        "split": "development",
                        "publicClaim": public_claim("predicate-development-1"),
                    }
                ],
            }
            request_path = root / "request.json"
            result_path = root / "result.json"
            _ = request_path.write_text(json.dumps(request), encoding="utf-8")

            # When
            captured: list[EnvAdapter] = []

            def fake_train(
                adapter: EnvAdapter, _out_root: Path, *, max_steps: int
            ) -> dict[str, str]:
                self.assertEqual(max_steps, 1)
                captured.append(adapter)
                return {"codex_candidate_body_hash": HASH}

            with (
                patch.object(
                    cli,
                    "run_training",
                    side_effect=fake_train,
                    create=True,
                ),
                patch.object(
                    sys,
                    "argv",
                    [
                        "kibi-skillopt",
                        "train",
                        "--request",
                        str(request_path),
                        "--result",
                        str(result_path),
                    ],
                ),
            ):
                exit_code = cli.main()

            # Then
            self.assertEqual(exit_code, 0)
            adapter = captured[0]
            self.assertEqual(adapter.get_task_types(), ["predicate"])
            self.assertEqual(
                tuple(item["id"] for item in adapter.build_train_env(1, 5417)),
                ("predicate-train-1",),
            )
            self.assertEqual(
                adapter.build_train_env(1, 5417)[0]["publicClaim"],
                public_claim("predicate-train-1"),
            )
            self.assertEqual(
                json.loads(result_path.read_text(encoding="utf-8"))["codex_candidate_body_hash"],
                HASH,
            )


if __name__ == "__main__":
    _ = unittest.main()
