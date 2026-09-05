from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from skillopt.evaluation.gate import evaluate_gate, select_gate_score
from tools.skillopt.kibi_skillopt.gate import (
    patched_hard_primary_gate,
    select_gate_score_hard_primary,
)
from tools.skillopt.kibi_skillopt.trainer import build_training_config


class HardPrimaryGateTests(unittest.TestCase):
    def test_training_config_keeps_hard_gate_metric(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            config = build_training_config(Path(directory) / "training")

        self.assertEqual(config["gate_metric"], "hard")
        self.assertNotIn("gate_mixed_weight", config)

    def test_tied_hard_better_soft_is_strictly_better(self) -> None:
        baseline = select_gate_score_hard_primary(0.5, 0.5, "hard")
        improved = select_gate_score_hard_primary(0.5, 0.7875, "hard")

        self.assertGreater(improved, baseline)
        self.assertEqual(select_gate_score(0.5, 0.7875, "hard"), 0.5)

    def test_hard_regression_beats_any_soft_gain(self) -> None:
        baseline = select_gate_score_hard_primary(0.5, 0.0, "hard")
        lost_one_of_four = select_gate_score_hard_primary(0.25, 1.0, "hard")
        lost_one_of_sixteen = select_gate_score_hard_primary(15.0 / 16.0, 1.0, "hard")
        kept_all_sixteen = select_gate_score_hard_primary(1.0, 0.0, "hard")

        self.assertLess(lost_one_of_four, baseline)
        self.assertLess(lost_one_of_sixteen, kept_all_sixteen)

    def test_mixed_metric_is_unchanged(self) -> None:
        ours = select_gate_score_hard_primary(0.5, 0.8, "mixed", 0.5)
        upstream = select_gate_score(0.5, 0.8, "mixed", 0.5)

        self.assertEqual(ours, upstream)

    def test_evaluate_gate_accepts_tied_hard_when_soft_improves(self) -> None:
        current_score = select_gate_score_hard_primary(0.5, 0.5, "hard")

        with patched_hard_primary_gate():
            result = evaluate_gate(
                candidate_skill="improved-soft",
                cand_hard=0.5,
                current_skill="baseline",
                current_score=current_score,
                best_skill="baseline",
                best_score=current_score,
                best_step=0,
                global_step=3,
                cand_soft=0.7875,
                metric="hard",
            )

        self.assertEqual(result.action, "accept_new_best")
        self.assertEqual(result.current_skill, "improved-soft")

    def test_evaluate_gate_rejects_hard_regression_with_better_soft(self) -> None:
        current_score = select_gate_score_hard_primary(0.5, 0.5, "hard")

        with patched_hard_primary_gate():
            result = evaluate_gate(
                candidate_skill="hard-regression",
                cand_hard=0.25,
                current_skill="baseline",
                current_score=current_score,
                best_skill="baseline",
                best_score=current_score,
                best_step=0,
                global_step=3,
                cand_soft=1.0,
                metric="hard",
            )

        self.assertEqual(result.action, "reject")
        self.assertEqual(result.current_skill, "baseline")

    def test_patch_replaces_trainer_select_gate_score_and_restores(self) -> None:
        import skillopt.engine.trainer as trainer_mod
        import skillopt.evaluation.gate as gate_mod

        original_trainer = trainer_mod.select_gate_score
        original_gate = gate_mod.select_gate_score

        with patched_hard_primary_gate():
            self.assertIs(trainer_mod.select_gate_score, select_gate_score_hard_primary)
            self.assertIs(gate_mod.select_gate_score, select_gate_score_hard_primary)

        self.assertIs(trainer_mod.select_gate_score, original_trainer)
        self.assertIs(gate_mod.select_gate_score, original_gate)


if __name__ == "__main__":
    _ = unittest.main()
