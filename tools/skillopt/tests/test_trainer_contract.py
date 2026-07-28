from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from tools.skillopt.kibi_skillopt.adapter import EnvAdapter
from tools.skillopt.kibi_skillopt.common import contract_hash, parse_json_value
from tools.skillopt.kibi_skillopt.models import OptimizerResult, TrainTrajectory
from tools.skillopt.kibi_skillopt.trainer import run_training

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


class TrainerContractTests(unittest.TestCase):
    def test_training_submits_reflection_trajectories_to_the_codex_optimizer(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            subject = EnvAdapter(
                bridge_command=(sys.executable, "scripts/skillopt-eval/bridge-cli.ts", "--fake"),
                bridge_cwd=Path.cwd(),
                run_root=root / "run",
                skill="kibi-usage",
                source_lock_hash=HASH,
                corpus_roots=CORPUS_ROOTS,
                train_items=({"id": "predicate-train-1", "family": "predicate"},),
                development_items=({"id": "predicate-development-1", "family": "predicate"},),
            )
            subject.record_train_trajectory(
                TrainTrajectory.model_validate(
                    {"taskId": "predicate-train-1", "family": "predicate", "reflection": "missing"}
                )
            )

            class FakeTrainer:
                def __init__(self, config: dict[str, object], _adapter: EnvAdapter) -> None:
                    self._config: dict[str, object] = config

                def train(self) -> dict[str, float]:
                    out_root = Path(str(self._config["out_root"]))
                    out_root.mkdir(parents=True, exist_ok=True)
                    _ = (out_root / "best_skill.md").write_text(
                        "Use Kibi through MCP.", encoding="utf-8"
                    )
                    return {"best_selection_hard": 0.5}

            optimized = OptimizerResult.model_validate(
                {
                    "schemaVersion": "1.0.0",
                    "artifactType": "skillopt-optimizer-result",
                    "requestHash": HASH,
                    "body": "Use Kibi through MCP.",
                    "development": DEVELOPMENT,
                }
            )

            # When
            with (
                patch(
                    "tools.skillopt.kibi_skillopt.trainer.import_module",
                    return_value=SimpleNamespace(ReflACTTrainer=FakeTrainer),
                ),
                patch.object(subject, "optimize", return_value=optimized) as optimize,
            ):
                result = run_training(subject, root / "training")

            # Then
            self.assertEqual(
                optimize.call_args.kwargs["trajectories"][0]["taskId"],
                "predicate-train-1",
            )
            self.assertEqual(result["codex_candidate_body_hash"], contract_hash(optimized.body))
            self.assertTrue((root / "training" / "codex-optimized-skill.md").is_file())
            frozen = parse_json_value(
                (root / "training" / "frozen-candidate.json").read_text()
            )
            self.assertIsInstance(frozen, dict)
            if not isinstance(frozen, dict):
                self.fail("frozen candidate artifact must be an object")
            self.assertEqual(frozen["candidateBodyHash"], contract_hash(optimized.body))
            self.assertEqual(
                frozen["trainerCheckpointHash"], result["trainer_checkpoint_hash"]
            )
            self.assertEqual(frozen["trajectoryHashes"], result["trajectory_hashes"])

    def test_training_resumes_a_frozen_candidate_without_reinvoking_reflact(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            subject = EnvAdapter(
                bridge_command=(sys.executable, "scripts/skillopt-eval/bridge-cli.ts", "--fake"),
                bridge_cwd=Path.cwd(),
                run_root=root / "run",
                skill="kibi-usage",
                source_lock_hash=HASH,
                corpus_roots=CORPUS_ROOTS,
                train_items=({"id": "predicate-train-1", "family": "predicate"},),
                development_items=(
                    {"id": "predicate-development-1", "family": "predicate"},
                ),
            )
            subject.record_train_trajectory(
                TrainTrajectory.model_validate(
                    {"taskId": "predicate-train-1", "family": "predicate", "reflection": "missing"}
                )
            )
            calls = 0

            class FakeTrainer:
                def __init__(self, config: dict[str, object], _adapter: EnvAdapter) -> None:
                    self._config: dict[str, object] = config

                def train(self) -> dict[str, float]:
                    nonlocal calls
                    calls += 1
                    out_root = Path(str(self._config["out_root"]))
                    out_root.mkdir(parents=True, exist_ok=True)
                    _ = (out_root / "best_skill.md").write_text(
                        "Use Kibi through MCP.", encoding="utf-8"
                    )
                    return {"best_selection_hard": 0.5}

            optimized = OptimizerResult.model_validate(
                {
                    "schemaVersion": "1.0.0",
                    "artifactType": "skillopt-optimizer-result",
                    "requestHash": HASH,
                    "body": "Use Kibi through MCP.",
                    "development": DEVELOPMENT,
                }
            )

            # When
            with (
                patch(
                    "tools.skillopt.kibi_skillopt.trainer.import_module",
                    return_value=SimpleNamespace(ReflACTTrainer=FakeTrainer),
                ),
                patch.object(subject, "optimize", return_value=optimized),
            ):
                first = run_training(subject, root / "training")
                second = run_training(subject, root / "training")

            # Then
            self.assertEqual(calls, 1)
            self.assertEqual(first, second)


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
                    {"id": "predicate-train-1", "family": "predicate", "split": "train"}
                ],
                "developmentDescriptors": [
                    {
                        "id": "predicate-development-1",
                        "family": "predicate",
                        "split": "development",
                    }
                ],
                "bridgeCommand": [sys.executable, "scripts/skillopt-eval/bridge-cli.ts", "--fake"],
                "optimizerBridgeCommand": [
                    sys.executable,
                    "scripts/skillopt-eval/optimizer-bridge-cli.ts",
                    "--fake",
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
                json.loads(result_path.read_text(encoding="utf-8"))["codex_candidate_body_hash"],
                HASH,
            )


if __name__ == "__main__":
    _ = unittest.main()
