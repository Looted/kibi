from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.skillopt.tests.test_adapter_contract import CORPUS_ROOTS, adapter


class AdapterLineageContractTests(unittest.TestCase):
    def test_checkpoint_lineage_recomputes_from_ordered_trajectories_and_corpus_roots(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            subject = adapter(Path(directory))
            trajectories = (
                {"taskId": "predicate-train-1", "family": "predicate", "reflection": "missing"},
                {"taskId": "policy-train-1", "family": "policy", "reflection": "conflict"},
            )

            # When
            lineage = subject.compute_lineage("candidate body", trajectories)
            checkpoint = subject.save_checkpoint(
                1,
                "candidate body",
                ("predicate-train-1", "policy-train-1"),
                trajectories=trajectories,
            )

            # Then
            self.assertEqual(checkpoint.trajectory_hashes, lineage.trajectory_hashes)
            self.assertEqual(checkpoint.trainer_checkpoint_hash, lineage.trainer_checkpoint_hash)
            self.assertEqual(checkpoint.candidate_body_hash, lineage.candidate_body_hash)
            self.assertEqual(checkpoint.corpus_roots.model_dump(by_alias=True), CORPUS_ROOTS)
            self.assertEqual(subject.compute_lineage("candidate body", trajectories), lineage)
