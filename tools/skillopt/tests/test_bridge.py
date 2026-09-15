from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from pydantic import TypeAdapter, ValidationError
from tools.skillopt.kibi_skillopt.adapter import EnvAdapter
from tools.skillopt.kibi_skillopt.bridge import (
    BridgeError,
    FileBridge,
    read_optimizer_result,
)
from tools.skillopt.kibi_skillopt.bridge_runner import sanitized_bridge_environment
from tools.skillopt.kibi_skillopt.common import JsonValue, contract_hash
from tools.skillopt.kibi_skillopt.models import BridgeRequest, BridgeResult, OptimizerResult

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


def request() -> BridgeRequest:
    return BridgeRequest.model_validate(
        {
            "schemaVersion": "1.0.0",
            "artifactType": "skillopt-bridge-request",
            "runId": "00000000-0000-4000-8000-000000000081",
            "batchId": "batch-001",
            "skill": "kibi-usage",
            "phase": "train",
            "candidateBody": "Use Kibi through MCP.",
            "taskIds": ["usage-train-1"],
            "publicClaim": public_claim("usage-train-1"),
            "sourceLockHash": HASH,
        }
    )


class BridgeTests(unittest.TestCase):
    def test_sanitized_bridge_environment_preserves_target_budget_binding(self) -> None:
        environment = sanitized_bridge_environment(
            {
                "PATH": "/usr/bin",
                "KIBI_SKILLOPT_TARGET_BUDGET_ROOT": "/tmp/budget",
                "KIBI_SKILLOPT_MAX_TARGET_EPISODES": "64",
                "UNTRUSTED_HOST_VALUE": "drop-me",
            }
        )

        self.assertEqual(environment["KIBI_SKILLOPT_TARGET_BUDGET_ROOT"], "/tmp/budget")
        self.assertEqual(environment["KIBI_SKILLOPT_MAX_TARGET_EPISODES"], "64")
        self.assertNotIn("UNTRUSTED_HOST_VALUE", environment)

    def test_file_bridge_round_trip_and_hash_binding(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            bridge = FileBridge(root / "public", root / "private")
            bridge.write_public(
                "request.json",
                json.dumps(request().model_dump(by_alias=True, mode="json")),
            )
            payload = BridgeRequest.model_validate_json(bridge.read_public("request.json"))
            self.assertEqual(payload.batch_id, "batch-001")
            with self.assertRaises(BridgeError):
                _ = bridge.read_public("../private/secret.json")

    def test_optimizer_rejection_is_hash_bound_and_reason_is_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            adapter = EnvAdapter(
                run_root=root / "run",
                skill="kibi-usage",
                source_lock_hash=HASH,
                corpus_roots=CORPUS_ROOTS,
                train_items=(
                    {
                        "id": "train-1",
                        "family": "contract",
                        "publicClaim": public_claim("train-1"),
                    },
                ),
                development_items=(
                    {
                        "id": "dev-1",
                        "family": "contract",
                        "publicClaim": public_claim("dev-1"),
                    },
                ),
            )
            request = adapter.build_optimizer_request(
                current_body="Use Kibi through MCP.",
                trajectories=(
                    {"taskId": "train-1", "family": "contract", "reflection": "missing"},
                ),
                previous_development={
                    "mean": 0.5,
                    "hardPasses": 1,
                    "worstFamilyMean": 0.5,
                },
                step=1,
                max_steps=4,
            )
            request_hash = contract_hash(request.model_dump(by_alias=True, mode="json"))
            bridge = FileBridge(root / "public", root / "private")
            rejection = {
                "schemaVersion": "1.0.0",
                "artifactType": "skillopt-optimizer-result",
                "status": "rejected",
                "requestHash": request_hash,
                "reason": "candidate_direct_kb_guidance",
            }
            bridge.write_public("optimizer-result.json", json.dumps(rejection))

            # A valid rejection is readable only when it is bound to this request.
            parsed = read_optimizer_result(bridge, "optimizer-result.json", request)
            if parsed.status != "rejected":
                self.fail("expected a rejected optimizer result")
            self.assertEqual(parsed.reason, "candidate_direct_kb_guidance")

            mismatched = dict(rejection, requestHash="0" * 64)
            bridge.write_public("optimizer-result.json", json.dumps(mismatched))
            with self.assertRaises(BridgeError):
                _ = read_optimizer_result(bridge, "optimizer-result.json", request)

            invalid_reason = dict(rejection, reason="candidate_unknown")
            result_adapter: TypeAdapter[OptimizerResult] = TypeAdapter(OptimizerResult)
            with self.assertRaises(ValidationError):
                _ = result_adapter.validate_python(invalid_reason)

    def test_adapter_rejects_held_out_ids_and_resumes_checkpoint(self) -> None:
        adapter = EnvAdapter(
            run_root=Path(tempfile.mkdtemp()),
            skill="kibi-usage",
            source_lock_hash=HASH,
            corpus_roots=CORPUS_ROOTS,
            train_items=(
                {
                    "id": "train-1",
                    "family": "contract",
                    "prompt": "p",
                    "publicClaim": public_claim("train-1"),
                },
            ),
            development_items=(
                {
                    "id": "dev-1",
                    "family": "contract",
                    "prompt": "p",
                    "publicClaim": public_claim("dev-1"),
                },
            ),
        )
        with self.assertRaises(BridgeError):
            _ = adapter.build_request(
                {"id": "held-out-1", "family": "contract", "split": "held-out"}, "body"
            )
        checkpoint = adapter.save_checkpoint(1, "body", ("train-1",))
        self.assertEqual(checkpoint.next_step, 2)
        self.assertEqual(adapter.load_checkpoint().completed_steps, 1)

    def test_result_requires_typed_rows(self) -> None:
        result = BridgeResult.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "skillopt-bridge-result",
                "runId": request().run_id,
                "batchId": request().batch_id,
                "requestHash": HASH,
                "rows": [
                    {
                        "id": "train-1",
                        "hard": 1,
                        "soft": 0.75,
                        "status": "completed",
                        "failureCategory": None,
                        "conversationPath": "predictions/train-1/conversation.json",
                        "evidenceRefs": ["episode/train-1/receipt.json"],
                    }
                ],
                "checkpoint": {"maxSteps": 1, "completedSteps": 1, "nextStep": 2},
            }
        )
        self.assertEqual(result.rows[0].hard, 1)

    def test_adapter_drives_bun_bridge_with_canonical_hashes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            adapter = EnvAdapter(
                run_root=root / "run",
                skill="kibi-usage",
                source_lock_hash=HASH,
                corpus_roots=CORPUS_ROOTS,
                train_items=(
                    {
                        "id": "train-1",
                        "family": "contract",
                        "split": "train",
                        "prompt": "p",
                        "publicClaim": public_claim("train-1"),
                    },
                ),
                development_items=(
                    {
                        "id": "dev-1",
                        "family": "contract",
                        "split": "development",
                        "prompt": "p",
                        "publicClaim": public_claim("dev-1"),
                    },
                ),
            )

            def fake_bridge(request_json: str) -> str:
                payload = BridgeRequest.model_validate_json(request_json)
                return json.dumps(
                    {
                        "schemaVersion": "1.0.0",
                        "artifactType": "skillopt-bridge-result",
                        "runId": payload.run_id,
                        "batchId": payload.batch_id,
                        "requestHash": contract_hash(
                            payload.model_dump(by_alias=True, mode="json")
                        ),
                        "rows": [
                            {
                                "id": "train-1",
                                "hard": 1,
                                "soft": 1,
                                "status": "completed",
                                "failureCategory": None,
                                "conversationPath": "predictions/train-1/conversation.json",
                                "evidenceRefs": ["episode/train-1/receipt.json"],
                            }
                        ],
                        "checkpoint": {"maxSteps": 1, "completedSteps": 1, "nextStep": 2},
                    }
                )

            adapter._invoke_bridge = fake_bridge  # pyright: ignore[reportPrivateUsage]
            rows = adapter.rollout(
                (
                    {
                        "id": "train-1",
                        "family": "contract",
                        "split": "train",
                        "publicClaim": public_claim("train-1"),
                    },
                ),
                "Use Kibi through MCP.",
                str(root / "bridge"),
            )
            self.assertEqual(rows[0]["hard"], 1)


if __name__ == "__main__":
    _ = unittest.main()
