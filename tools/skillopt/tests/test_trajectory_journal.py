from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from typing import cast

from tools.skillopt.kibi_skillopt.adapter import EnvAdapter
from tools.skillopt.kibi_skillopt.common import JsonValue
from tools.skillopt.kibi_skillopt.models import TrainTrajectory
from tools.skillopt.kibi_skillopt.task_data import Task

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


def public_claim(task_id: str) -> JsonValue:
    return {
        "taskId": task_id,
        "text": "Preserve the structured public claim.",
        "publicManifestHash": HASH,
        "workspaceHash": HASH,
    }


def build_adapter(root: Path) -> EnvAdapter:
    train_items: tuple[Task, ...] = cast(
        tuple[Task, ...],
        (
            {
                "id": "predicate-train-1",
                "family": "predicate",
                "split": "train",
                "publicClaim": public_claim("predicate-train-1"),
            },
            {
                "id": "policy-train-1",
                "family": "policy",
                "split": "train",
                "publicClaim": public_claim("policy-train-1"),
            },
        ),
    )
    development_items: tuple[Task, ...] = cast(
        tuple[Task, ...],
        (
            {
                "id": "predicate-development-1",
                "family": "predicate",
                "split": "development",
                "publicClaim": public_claim("predicate-development-1"),
            },
        ),
    )
    return EnvAdapter(
        run_root=root / "run",
        skill="kibi-usage",
        source_lock_hash=HASH,
        corpus_roots=CORPUS_ROOTS,
        train_items=train_items,
        development_items=development_items,
    )


def trajectory(task_id: str, soft: float, hard: int) -> TrainTrajectory:
    return TrainTrajectory.model_validate(
        {
            "taskId": task_id,
            "family": "predicate" if task_id.startswith("predicate") else "policy",
            "reflection": json.dumps({"status": "completed"}, sort_keys=True),
            "status": "completed",
            "soft": soft,
            "hard": hard,
            "failureCategories": [],
            "toolSequence": ["kb_search"],
            "finalStateSummary": json.dumps({"taskId": task_id}, sort_keys=True),
        }
    )


class TrajectoryJournalTests(unittest.TestCase):
    def test_replayed_adapter_restores_trajectories_gates_and_steps(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given: epoch one records rollouts, a development gate, and two
            # optimizer steps before the trainer process exits.
            root = Path(directory)
            first = build_adapter(root)
            for entry in (
                trajectory("predicate-train-1", 0.9, 1),
                trajectory("policy-train-1", 0.4, 0),
            ):
                first.record_train_trajectory(entry)
            body = "## epoch-one candidate\n"
            first.record_development_gate(body, [{"soft": 0.8, "hard": 1}])
            _ = first.advance_optimizer_step()
            _ = first.advance_optimizer_step()

            # When: a restarted trainer process builds a fresh adapter.
            second = build_adapter(root)

            # Then: nothing recorded in earlier epochs is lost.
            self.assertEqual(
                [item.task_id for item in second.train_trajectories],
                ["predicate-train-1", "policy-train-1"],
            )
            self.assertEqual(second.development_gate_for(body), DEVELOPMENT_GATE)
            self.assertEqual(second.optimizer_step, 2)

    def test_duplicate_trajectory_is_not_double_counted_after_replay(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = build_adapter(root)
            entry = trajectory("predicate-train-1", 0.9, 1)
            first.record_train_trajectory(entry)

            second = build_adapter(root)
            second.record_train_trajectory(trajectory("predicate-train-1", 0.9, 1))
            second.record_train_trajectory(trajectory("predicate-train-1", 0.7, 0))

            self.assertEqual(len(second.train_trajectories), 2)
            self.assertEqual(
                [item.soft for item in second.train_trajectories],
                [0.9, 0.7],
            )

    def test_torn_tail_line_replays_the_durable_prefix(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = build_adapter(root)
            first.record_train_trajectory(trajectory("predicate-train-1", 0.9, 1))

            journal = root / "run" / "trajectory-journal.jsonl"
            raw = journal.read_text(encoding="utf-8")
            _ = journal.write_text(raw + '{"type":"trajectory","trajec', encoding="utf-8")

            resumed = build_adapter(root)

            self.assertEqual(len(resumed.train_trajectories), 1)

    def test_new_records_continue_appending_after_replay(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = build_adapter(root)
            first.record_train_trajectory(trajectory("predicate-train-1", 0.9, 1))

            second = build_adapter(root)
            second.record_train_trajectory(trajectory("policy-train-1", 0.5, 0))

            third = build_adapter(root)
            self.assertEqual(
                [item.task_id for item in third.train_trajectories],
                ["predicate-train-1", "policy-train-1"],
            )


DEVELOPMENT_GATE = {"mean": 0.8, "hardPasses": 1, "worstFamilyMean": 0.8}


if __name__ == "__main__":
    _ = unittest.main()
