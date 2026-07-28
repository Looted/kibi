from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from tools.skillopt.kibi_skillopt.adapter import EnvAdapter
from tools.skillopt.kibi_skillopt.common import contract_hash
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


if __name__ == "__main__":
    _ = unittest.main()
