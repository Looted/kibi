from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.skillopt.kibi_skillopt.adapter import EnvAdapter
from tools.skillopt.kibi_skillopt.bridge import BridgeError, FileBridge
from tools.skillopt.kibi_skillopt.models import BridgeRequest, BridgeResult

HASH = "a" * 64


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
            "sourceLockHash": HASH,
        }
    )


class BridgeTests(unittest.TestCase):
    def test_file_bridge_round_trip_and_hash_binding(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            bridge = FileBridge(root / "public", root / "private")
            bridge.write_public(
                "request.json",
                json.dumps(request().model_dump(by_alias=True, mode="json")),
            )
            payload = json.loads(bridge.read_public("request.json"))
            self.assertEqual(payload["batchId"], "batch-001")
            with self.assertRaises(BridgeError):
                bridge.read_public("../private/secret.json")

    def test_adapter_rejects_held_out_ids_and_resumes_checkpoint(self) -> None:
        adapter = EnvAdapter(
            bridge_command=("python", "-c", "pass"),
            run_root=Path(tempfile.mkdtemp()),
            skill="kibi-usage",
            source_lock_hash=HASH,
            train_items=({"id": "train-1", "prompt": "p"},),
            development_items=({"id": "dev-1", "prompt": "p"},),
        )
        with self.assertRaises(BridgeError):
            adapter.build_request("held-out-1", "body", "held-out")
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
                bridge_command=(
                    "/home/looted/.bun/bin/bun",
                    "run",
                    "scripts/skillopt-eval/bridge-cli.ts",
                    "--fake",
                ),
                bridge_cwd=Path.cwd(),
                run_root=root / "run",
                skill="kibi-usage",
                source_lock_hash=HASH,
                train_items=({"id": "train-1", "split": "train", "prompt": "p"},),
                development_items=({"id": "dev-1", "split": "development", "prompt": "p"},),
            )
            rows = adapter.rollout(
                ({"id": "train-1", "split": "train"},),
                "Use Kibi through MCP.",
                str(root / "bridge"),
            )
            self.assertEqual(rows[0]["hard"], 1)


if __name__ == "__main__":
    unittest.main()
