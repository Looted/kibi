from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pydantic import ValidationError
from skillopt.envs.base import EnvAdapter as SkillOptEnvAdapter
from tools.skillopt.kibi_skillopt.adapter import EnvAdapter
from tools.skillopt.kibi_skillopt.bridge import BridgeError
from tools.skillopt.kibi_skillopt.common import JsonValue, contract_hash, parse_json_value
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


def public_claim(task_id: str) -> JsonValue:
    return {
        "taskId": task_id,
        "text": "Preserve the structured public claim.",
        "publicManifestHash": HASH,
        "workspaceHash": HASH,
    }


def adapter(root: Path) -> EnvAdapter:
    return EnvAdapter(
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
            {
                "id": "policy-train-1",
                "semanticClass": "policy",
                "split": "train",
                "publicClaim": public_claim("policy-train-1"),
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


class AdapterContractTests(unittest.TestCase):
    def test_training_config_uses_official_reflact_keys(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            out_root = Path(directory) / "training"

            # When
            config = build_training_config(out_root)

            # Then
            self.assertEqual(config["out_root"], str(out_root))
            self.assertEqual(config["num_epochs"], 4)
            self.assertEqual(config["batch_size"], 8)
            self.assertEqual(config["accumulation"], 1)
            self.assertEqual(config["gate_metric"], "soft")
            self.assertFalse(config["use_meta_skill"])
            self.assertEqual(config["skill_update_mode"], "full_rewrite_minibatch")
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

    def test_build_request_rejects_missing_public_claim(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            subject = adapter(Path(directory))

            # When / Then
            with self.assertRaises(ValidationError):
                _ = subject.build_request(
                    {"id": "predicate-train-1", "family": "predicate", "split": "train"},
                    "Use Kibi through MCP.",
                )

    def test_build_request_rejects_public_claim_for_other_task(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            subject = adapter(Path(directory))

            # When / Then
            with self.assertRaises(ValidationError):
                _ = subject.build_request(
                    {
                        "id": "predicate-train-1",
                        "family": "predicate",
                        "split": "train",
                        "publicClaim": public_claim("policy-train-1"),
                    },
                    "Use Kibi through MCP.",
                )

    def test_rollout_returns_task_family_and_bridge_extras(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            subject = adapter(root)

            def write_result(request_json: str) -> str:
                request = BridgeRequest.model_validate_json(request_json)
                self.assertEqual(
                    request.model_dump(by_alias=True, mode="json")["publicClaim"],
                    public_claim("predicate-train-1"),
                )
                return json.dumps(
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
                                "failureCategories": [
                                    "predicate_missing",
                                    "wrong_relationship",
                                ],
                                "toolSequence": ['{"tool":"kb_search","outcome":"success"}'],
                                "finalStateSummary": '{"entities":[]}',
                                "conversationPath": (
                                    "predictions/predicate-train-1/conversation.json"
                                ),
                                "evidenceRefs": ["episode/predicate-train-1/receipt.json"],
                            }
                        ],
                        "checkpoint": {"maxSteps": 1, "completedSteps": 1, "nextStep": 2},
                    }
                )

            # When
            with patch.object(subject, "_invoke_bridge", side_effect=write_result):
                rows = subject.rollout(
                    (
                        {
                            "id": "predicate-train-1",
                            "family": "predicate",
                            "split": "train",
                            "publicClaim": public_claim("predicate-train-1"),
                        },
                    ),
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
            trajectory = rows[0]["trajectory"]
            if not isinstance(trajectory, dict):
                self.fail("rollout trajectory must be an object")
            self.assertEqual(
                trajectory["failureCategories"],
                ["predicate_missing", "wrong_relationship"],
            )
            self.assertEqual(
                trajectory["toolSequence"],
                ['{"tool":"kb_search","outcome":"success"}'],
            )
            self.assertEqual(trajectory["finalStateSummary"], '{"entities":[]}')

    def test_failed_rollout_uses_kibi_specific_structured_reflection(self) -> None:
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
                    "status": "behavioral-failure",
                    "soft": 0.25,
                    "hard": 0,
                    "failureCategories": ["predicate_missing"],
                    "toolSequence": ['{"tool":"kb_search","outcome":"success"}'],
                    "finalStateSummary": '{"entities":[]}',
                },
                "trajectory_hash": HASH,
            }
            subject.record_development_gate(
                "body",
                [
                    {
                        "soft": 0.5,
                        "hard": 0,
                        "task_type": "predicate",
                    }
                ],
            )
            optimized = {
                "body": "Use exact Kibi decision rules.",
                "development": DEVELOPMENT,
            }

            # When
            with patch.object(subject, "optimize") as optimize:
                optimize.return_value = type("Result", (), optimized)()
                patches = subject.reflect([rollout], "body", directory)

            # Then
            self.assertIsNot(EnvAdapter.reflect, SkillOptEnvAdapter.reflect)
            patch_payload = patches[0]
            if not isinstance(patch_payload, dict):
                self.fail("reflection patch must be an object")
            patch_entry = patch_payload["patch"]
            if not isinstance(patch_entry, dict):
                self.fail("reflection patch body must be an object")
            candidates = patch_entry["skill_candidates"]
            if not isinstance(candidates, list):
                self.fail("reflection skill candidates must be a list")
            candidate = candidates[0]
            if not isinstance(candidate, dict):
                self.fail("reflection skill candidate must be an object")
            self.assertEqual(candidate["new_skill"], "Use exact Kibi decision rules.")
            self.assertEqual(optimize.call_args.kwargs["step"], 1)
            self.assertEqual(
                optimize.call_args.kwargs["trajectories"][0]["failureCategories"],
                ["predicate_missing"],
            )
            self.assertEqual(
                optimize.call_args.kwargs["trajectories"][0]["toolSequence"],
                ['{"tool":"kb_search","outcome":"success"}'],
            )
            self.assertEqual(
                optimize.call_args.kwargs["trajectories"][0]["finalStateSummary"],
                '{"entities":[]}',
            )
            self.assertEqual(
                optimize.call_args.kwargs["public_evidence_summary"],
                {
                    "attempts": 1,
                    "hardPasses": 0,
                    "families": [
                        {
                            "family": "predicate",
                            "attempts": 1,
                            "hardPasses": 0,
                            "meanSoft": 0.25,
                            "failureCounts": [
                                {"category": "predicate_missing", "count": 1}
                            ],
                        }
                    ],
                },
            )

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
            trajectories = (
                {"taskId": "predicate-train-1", "family": "predicate", "reflection": "missing"},
            )

            def fake_invoke(request_path: Path, result_path: Path) -> None:
                payload = parse_json_value(request_path.read_text(encoding="utf-8"))
                if not isinstance(payload, dict):
                    raise AssertionError("optimizer request must be an object")
                _ = result_path.write_text(
                    json.dumps(
                        {
                            "schemaVersion": "1.0.0",
                            "artifactType": "skillopt-optimizer-result",
                            "requestHash": contract_hash(payload),
                            "body": "Use Kibi through MCP.",
                            "development": DEVELOPMENT,
                        }
                    ),
                    encoding="utf-8",
                )

            # When
            with patch.object(subject, "_invoke_optimizer_bridge", side_effect=fake_invoke):
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


if __name__ == "__main__":
    _ = unittest.main()
