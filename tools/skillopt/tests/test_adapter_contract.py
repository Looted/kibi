from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from skillopt.envs.base import EnvAdapter as SkillOptEnvAdapter
from tools.skillopt.kibi_skillopt.adapter import EnvAdapter
from tools.skillopt.kibi_skillopt.bridge import BridgeError
from tools.skillopt.kibi_skillopt.bridge_runner import run_bridge
from tools.skillopt.kibi_skillopt.common import (
    JsonValue,
    contract_hash,
    parse_json_value,
)
from tools.skillopt.kibi_skillopt.models import BridgeRequest
from tools.skillopt.kibi_skillopt.trainer import build_training_config

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


def adapter(root: Path) -> EnvAdapter:
    return EnvAdapter(
        bridge_command=(sys.executable, "scripts/skillopt-eval/bridge-cli.ts", "--fake"),
        bridge_cwd=Path.cwd(),
        run_root=root / "run",
        skill="kibi-usage",
        source_lock_hash=HASH,
        corpus_roots=CORPUS_ROOTS,
        train_items=(
            {"id": "predicate-train-1", "family": "predicate", "split": "train"},
            {"id": "policy-train-1", "semanticClass": "policy", "split": "train"},
        ),
        development_items=(
            {"id": "predicate-development-1", "family": "predicate", "split": "development"},
        ),
    )


def require_text(value: JsonValue) -> str:
    if not isinstance(value, str):
        raise AssertionError("expected string")
    return value


class AdapterContractTests(unittest.TestCase):
    def test_training_config_uses_official_reflact_keys(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            out_root = Path(directory) / "training"

            # When
            config = build_training_config(out_root)

            # Then
            self.assertEqual(config["out_root"], str(out_root))
            self.assertEqual(config["num_epochs"], 1)
            self.assertEqual(config["batch_size"], 4)
            self.assertEqual(config["accumulation"], 1)
            self.assertEqual(config["seed"], 5417)

    def test_adapter_subclasses_skillopt_and_derives_task_types_from_families(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            subject = adapter(Path(directory))

            # When
            task_types = subject.get_task_types()

            # Then
            self.assertIn(SkillOptEnvAdapter, EnvAdapter.__mro__)
            self.assertEqual(task_types, ["predicate", "policy"])

    def test_rollout_returns_task_family_and_bridge_extras(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            subject = adapter(root)

            def write_result(request_path: Path, result_path: Path) -> None:
                request = BridgeRequest.model_validate_json(
                    request_path.read_text(encoding="utf-8")
                )
                _ = result_path.write_text(
                    json.dumps(
                        {
                            "schemaVersion": "1.0.0",
                            "artifactType": "skillopt-bridge-result",
                            "runId": request.run_id,
                            "batchId": request.batch_id,
                            "requestHash": contract_hash(
                                request.model_dump(by_alias=True, mode="json")
                            ),
                            "rows": [
                                {
                                    "id": "predicate-train-1",
                                    "hard": 0,
                                    "soft": 0.25,
                                    "status": "behavioral-failure",
                                    "failureCategory": "predicate_missing",
                                    "conversationPath": (
                                        "predictions/predicate-train-1/conversation.json"
                                    ),
                                    "evidenceRefs": ["episode/predicate-train-1/receipt.json"],
                                }
                            ],
                            "checkpoint": {"maxSteps": 1, "completedSteps": 1, "nextStep": 2},
                        }
                    ),
                    encoding="utf-8",
                )

            # When
            with patch.object(subject, "_invoke_bridge", side_effect=write_result):
                rows = subject.rollout(
                    ({"id": "predicate-train-1", "family": "predicate", "split": "train"},),
                    "Use Kibi through MCP.",
                    str(root / "rollout"),
                )

            # Then
            self.assertEqual(rows[0]["task_type"], "predicate")
            self.assertEqual(rows[0]["failure_category"], "predicate_missing")
            self.assertEqual(
                rows[0]["conversation_path"],
                "predictions/predicate-train-1/conversation.json",
            )
            self.assertEqual(rows[0]["evidence_refs"], ["episode/predicate-train-1/receipt.json"])
            self.assertEqual(rows[0]["trajectory_hash"], contract_hash(rows[0]["trajectory"]))

    def test_failed_rollout_uses_skillopt_default_reflection(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            subject = adapter(Path(directory))
            rollout: dict[str, JsonValue] = {
                "id": "predicate-train-1",
                "hard": 0,
                "soft": 0.25,
                "task_type": "predicate",
                "failure_category": "predicate_missing",
                "conversation_path": "predictions/predicate-train-1/conversation.json",
                "evidence_refs": ["episode/predicate-train-1/receipt.json"],
                "trajectory": {
                    "taskId": "predicate-train-1",
                    "family": "predicate",
                    "reflection": "predicate_missing",
                },
                "trajectory_hash": HASH,
            }
            expected: list[dict[str, JsonValue] | None] = [
                {"source_type": "failure", "patch": {"edits": []}}
            ]

            # When
            with patch(
                "skillopt.gradient.reflect.run_minibatch_reflect", return_value=expected
            ) as reflect:
                patches = subject.reflect([rollout], "body", directory)

            # Then
            self.assertIs(EnvAdapter.reflect, SkillOptEnvAdapter.reflect)
            self.assertEqual(patches, expected)
            self.assertEqual(reflect.call_args.kwargs["results"], [rollout])

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

    def test_held_out_ids_never_enter_optimizer_input(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            subject = adapter(Path(directory))
            held_out = ({"taskId": "held-out-1", "family": "predicate", "reflection": "secret"},)

            # When / Then
            with self.assertRaisesRegex(BridgeError, "held-out"):
                _ = subject.build_optimizer_request(
                    current_body="candidate body",
                    trajectories=held_out,
                    previous_development=DEVELOPMENT,
                    step=1,
                    max_steps=4,
                )

    def test_optimizer_bridge_submits_public_trajectories_and_returns_codex_result(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            subject = EnvAdapter(
                bridge_command=(sys.executable, "scripts/skillopt-eval/bridge-cli.ts", "--fake"),
                optimizer_bridge_command=(
                    "/home/looted/.bun/bin/bun",
                    "run",
                    "scripts/skillopt-eval/optimizer-bridge-cli.ts",
                    "--fake",
                ),
                bridge_cwd=Path.cwd(),
                run_root=root / "run",
                skill="kibi-usage",
                source_lock_hash=HASH,
                corpus_roots=CORPUS_ROOTS,
                train_items=({"id": "predicate-train-1", "family": "predicate"},),
                development_items=({"id": "predicate-development-1", "family": "predicate"},),
            )
            trajectories = (
                {"taskId": "predicate-train-1", "family": "predicate", "reflection": "missing"},
            )

            # When
            result = subject.optimize(
                current_body="Use Kibi through MCP.",
                trajectories=trajectories,
                previous_development=DEVELOPMENT,
                step=1,
                max_steps=4,
            )

            # Then
            self.assertEqual(result.body, "Use Kibi through MCP.")
            self.assertEqual(result.development.model_dump(by_alias=True), DEVELOPMENT)

    def test_bridge_invocation_uses_absolute_paths_and_minimal_environment(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            runner = root / "runner.py"
            runner_source = "".join(
                (
                    "import json\n",
                    "import os\n",
                    "import sys\n",
                    "from pathlib import Path\n",
                    "result = Path(sys.argv[sys.argv.index('--result') + 1])\n",
                    "record = {'command': sys.argv, 'environment': dict(os.environ)}\n",
                    "result.write_text(json.dumps(record))\n",
                )
            )
            _ = runner.write_text(
                runner_source,
                encoding="utf-8",
            )
            subject = EnvAdapter(
                bridge_command=(sys.executable, str(runner)),
                bridge_cwd=root,
                run_root=root / "run",
                skill="kibi-usage",
                source_lock_hash=HASH,
                corpus_roots=CORPUS_ROOTS,
                train_items=(
                    {"id": "predicate-train-1", "family": "predicate", "split": "train"},
                ),
                development_items=(
                    {
                        "id": "predicate-development-1",
                        "family": "predicate",
                        "split": "development",
                    },
                ),
            )
            request_path = root / "request.json"
            result_path = root / "result.json"
            environment = {
                "PATH": "/usr/bin:/bin",
                "HOME": "/home/tester",
                "CODEX_HOME": "/home/tester/.codex",
                "UNRELATED_SECRET": "must-not-leak",
            }

            # When
            with patch.dict(os.environ, environment, clear=True):
                run_bridge(subject.bridge_command, subject.bridge_cwd, request_path, result_path)

            # Then
            payload = parse_json_value(result_path.read_text(encoding="utf-8"))
            self.assertIsInstance(payload, dict)
            if not isinstance(payload, dict):
                self.fail("bridge runner returned a non-object payload")
            command = payload["command"]
            environment_payload = payload["environment"]
            self.assertIsInstance(command, list)
            self.assertIsInstance(environment_payload, dict)
            if not isinstance(command, list) or not isinstance(environment_payload, dict):
                self.fail("bridge runner returned malformed invocation data")
            command_parts = [require_text(part) for part in command]
            self.assertTrue(Path(subject.bridge_command[0]).is_absolute())
            self.assertTrue(Path(command_parts[0]).is_absolute())
            self.assertTrue(Path(command_parts[2]).is_absolute())
            self.assertTrue(Path(command_parts[-1]).is_absolute())
            self.assertTrue(subject.bridge_cwd.is_absolute())
            self.assertEqual(
                environment_payload,
                {
                    "PATH": "/usr/bin:/bin",
                    "HOME": "/home/tester",
                    "CODEX_HOME": "/home/tester/.codex",
                    "LANG": "C",
                    "LC_ALL": "C",
                    "KIBI_SKILLOPT_PROCESS_GROUP": "python_bridge",
                },
            )


if __name__ == "__main__":
    _ = unittest.main()
