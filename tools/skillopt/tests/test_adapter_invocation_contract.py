from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools.skillopt.kibi_skillopt.adapter import EnvAdapter
from tools.skillopt.kibi_skillopt.bridge_runner import (
    bridge_command,
    bridge_source_root,
    sanitized_bridge_environment,
)
from tools.skillopt.tests.test_adapter_contract import CORPUS_ROOTS, HASH, public_claim


class BridgeInvocationContractTests(unittest.TestCase):
    def test_bridge_entrypoint_is_fixed_from_module_root(self) -> None:
        with patch.dict(
            "os.environ",
            {
                "KIBI_SKILLOPT_SOURCE_WORKTREE": "",
                "KIBI_SKILLOPT_ARTIFACT_ROOT": "",
                "KIBI_SKILLOPT_FIXTURE_RUN_ROOT": "",
            },
        ):
            command = bridge_command()
        root = bridge_source_root()
        self.assertEqual(command[0], "bun")
        self.assertEqual(command[1], "run")
        self.assertTrue(Path(command[2]).is_absolute())
        self.assertEqual(
            Path(command[2]),
            root / "scripts" / "skillopt-eval" / "bridge-cli.ts",
        )
        self.assertEqual(command[3], "--pipe")
        self.assertEqual(len(command), 4)

    def test_bridge_command_includes_execution_roots_from_environment(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source"
            artifacts = root / "artifacts"
            fixtures = root / "fixtures"
            source.mkdir()
            artifacts.mkdir()
            fixtures.mkdir()
            with patch.dict(
                "os.environ",
                {
                    "KIBI_SKILLOPT_SOURCE_WORKTREE": str(source),
                    "KIBI_SKILLOPT_ARTIFACT_ROOT": str(artifacts),
                    "KIBI_SKILLOPT_FIXTURE_RUN_ROOT": str(fixtures),
                },
            ):
                command = bridge_command()
            self.assertEqual(command[3], "--pipe")
            self.assertEqual(
                command[4:],
                (
                    "--source-worktree",
                    str(source),
                    "--artifact-root",
                    str(artifacts),
                    "--fixture-run-root",
                    str(fixtures),
                ),
            )

    def test_bridge_environment_is_minimal(self) -> None:
        environment = {
            "PATH": "/usr/bin:/bin",
            "HOME": "/home/tester",
            "CODEX_HOME": "/home/tester/.codex",
            "UNRELATED_SECRET": "must-not-leak",
        }
        sanitized = sanitized_bridge_environment(environment)
        self.assertEqual(sanitized["PATH"], "/usr/bin:/bin")
        self.assertEqual(sanitized["HOME"], "/home/tester")
        self.assertEqual(sanitized["CODEX_HOME"], "/home/tester/.codex")
        self.assertNotIn("UNRELATED_SECRET", sanitized)

    def test_adapter_uses_fixed_bridge_without_mutable_command(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
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
                        "split": "train",
                        "publicClaim": public_claim("predicate-train-1"),
                    },
                ),
                development_items=(
                    {
                        "id": "predicate-development-1",
                        "family": "predicate",
                        "split": "development",
                        "publicClaim": public_claim("predicate-development-1"),
                    },
                ),
            )
            self.assertFalse(hasattr(subject, "bridge_command"))
            with patch(
                "tools.skillopt.kibi_skillopt.adapter.run_bridge",
                return_value='{"schemaVersion":"1.0.0","artifactType":"skillopt-bridge-result","runId":"00000000-0000-4000-8000-000000000080","batchId":"batch","requestHash":"'
                + "0" * 64
                + '","rows":[]}',
            ) as mocked:
                with self.assertRaises(Exception):
                    _ = subject.rollout(
                        (
                            {
                                "id": "predicate-train-1",
                                "family": "predicate",
                                "split": "train",
                                "publicClaim": public_claim("predicate-train-1"),
                            },
                        ),
                        "body",
                        str(root / "out"),
                    )
                self.assertTrue(mocked.called)


if __name__ == "__main__":
    _ = unittest.main()
