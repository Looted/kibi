from __future__ import annotations

import unittest

from pydantic import ValidationError
from tools.skillopt.kibi_skillopt.models import BridgeCheckpoint, BridgeRequest, BridgeResult

HASH = "a" * 64


class ModelValidationErrorTests(unittest.TestCase):
    def test_bridge_request_rejects_held_out_task_id(self) -> None:
        # Given
        message = "held-out task ids are not bridge inputs"

        # When
        with self.assertRaises(ValidationError) as context:
            _ = BridgeRequest.model_validate(
                {
                    "schemaVersion": "1.0.0",
                    "artifactType": "skillopt-bridge-request",
                    "runId": "00000000-0000-4000-8000-000000000081",
                    "batchId": "batch-001",
                    "skill": "kibi-usage",
                    "phase": "train",
                    "candidateBody": "Use Kibi through MCP.",
                    "taskIds": ["held-out-1"],
                    "publicClaim": {
                        "taskId": "held-out-1",
                        "text": "Preserve the structured public claim.",
                        "publicManifestHash": HASH,
                        "workspaceHash": HASH,
                    },
                    "sourceLockHash": HASH,
                }
            )

        # Then
        errors = context.exception.errors()
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["type"], "value_error")
        self.assertEqual(errors[0]["msg"], f"Value error, {message}")

    def test_bridge_checkpoint_rejects_next_step_not_after_completed_steps(self) -> None:
        # Given
        message = "checkpoint nextStep must follow completedSteps"

        # When
        with self.assertRaises(ValidationError) as context:
            _ = BridgeCheckpoint.model_validate({"maxSteps": 2, "completedSteps": 1, "nextStep": 1})

        # Then
        errors = context.exception.errors()
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["type"], "value_error")
        self.assertEqual(errors[0]["msg"], f"Value error, {message}")

    def test_bridge_checkpoint_rejects_completed_steps_over_max(self) -> None:
        # Given
        message = "checkpoint completedSteps exceeds maxSteps"

        # When
        with self.assertRaises(ValidationError) as context:
            _ = BridgeCheckpoint.model_validate({"maxSteps": 1, "completedSteps": 2, "nextStep": 3})

        # Then
        errors = context.exception.errors()
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["type"], "value_error")
        self.assertEqual(errors[0]["msg"], f"Value error, {message}")

    def test_bridge_result_rejects_duplicate_row_ids(self) -> None:
        # Given
        message = "bridge result task ids must be unique"

        # When
        with self.assertRaises(ValidationError) as context:
            _ = BridgeResult.model_validate(
                {
                    "schemaVersion": "1.0.0",
                    "artifactType": "skillopt-bridge-result",
                    "runId": "00000000-0000-4000-8000-000000000081",
                    "batchId": "batch-001",
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
                        },
                        {
                            "id": "train-1",
                            "hard": 1,
                            "soft": 0.75,
                            "status": "completed",
                            "failureCategory": None,
                            "conversationPath": "predictions/train-1/conversation.json",
                            "evidenceRefs": ["episode/train-1/receipt.json"],
                        },
                    ],
                    "checkpoint": {"maxSteps": 2, "completedSteps": 1, "nextStep": 2},
                }
            )

        # Then
        errors = context.exception.errors()
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["type"], "value_error")
        self.assertEqual(errors[0]["msg"], f"Value error, {message}")


if __name__ == "__main__":
    _ = unittest.main()
