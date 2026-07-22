from __future__ import annotations

import copy
import unittest
from pathlib import Path

from tools.skillopt.kibi_skillopt import (
    Approval,
    Proposal,
    RunLock,
    assert_approval_matches_proposal,
    contract_hash,
)
from tools.skillopt.kibi_skillopt.common import JsonNode, JsonValue, json_node_value

REPO_ROOT = Path(__file__).resolve().parents[3]
RUN_LOCK_PATH = REPO_ROOT / "scripts/skillopt-eval/tests/fixtures/valid-run-lock.json"
SOURCE_LOCK_PATH = REPO_ROOT / "tools/skillopt/source-lock.json"
HASH = "b" * 64
RUN_ID = "00000000-0000-4000-8000-000000000001"
PROPOSAL_ID = "00000000-0000-4000-8000-000000000003"


def load_json_object(path: Path) -> dict[str, JsonValue]:
    node = JsonNode.model_validate_json(path.read_text(encoding="utf-8"))
    if not isinstance(node.root, dict):
        raise AssertionError(f"{path} must contain an object")
    return {key: json_node_value(value) for key, value in node.root.items()}


def accepted_proposal() -> Proposal:
    return Proposal.model_validate(
        {
            "schemaVersion": "1.0.0",
            "artifactType": "proposal",
            "proposalId": PROPOSAL_ID,
            "runId": RUN_ID,
            "runLockHash": HASH,
            "skill": "kibi-usage",
            "candidateBodyHash": HASH,
            "baselineFrontmatterHash": HASH,
            "candidateFrontmatterHash": HASH,
            "baselineResourcesHash": HASH,
            "candidateResourcesHash": HASH,
            "reportHash": HASH,
            "createdAt": "2026-07-21T12:00:00Z",
            "status": "accepted",
        }
    )


def matching_approval(proposal: Proposal) -> Approval:
    proposal_value = json_node_value(
        JsonNode.model_validate(proposal.model_dump(by_alias=True, mode="json"))
    )
    return Approval.model_validate(
        {
            "schemaVersion": "1.0.0",
            "artifactType": "approval",
            "approvalId": "00000000-0000-4000-8000-000000000004",
            "proposalId": proposal.proposal_id,
            "proposalHash": contract_hash(proposal_value),
            "runId": proposal.run_id,
            "runLockHash": proposal.run_lock_hash,
            "reportHash": proposal.report_hash,
            "candidateBodyHash": proposal.candidate_body_hash,
            "reviewer": "reviewer@example.test",
            "decision": "approved",
            "decidedAt": "2026-07-21T12:00:00Z",
        }
    )


class ContractParityRegressionTests(unittest.TestCase):
    def test_run_lock_structure_is_separate_from_pricing_hash_semantics(self) -> None:
        tampered = load_json_object(RUN_LOCK_PATH)
        tampered["pricingHash"] = HASH

        _ = RunLock.model_validate(tampered)
        with self.assertRaisesRegex(ValueError, "pricing hash mismatch"):
            _ = RunLock.model_validate_with_source_lock(tampered, SOURCE_LOCK_PATH)

    def test_run_lock_structure_is_separate_from_source_lock_hash_semantics(self) -> None:
        tampered = load_json_object(RUN_LOCK_PATH)
        tampered["sourceLockHash"] = HASH

        _ = RunLock.model_validate(tampered)
        with self.assertRaisesRegex(ValueError, "source lock hash mismatch"):
            _ = RunLock.model_validate_with_source_lock(tampered, SOURCE_LOCK_PATH)

    def test_run_lock_structure_is_separate_from_source_pin_semantics(self) -> None:
        tampered = load_json_object(RUN_LOCK_PATH)
        skillopt = tampered["skillopt"]
        if not isinstance(skillopt, dict):
            raise AssertionError("run-lock skillopt pin must contain an object")
        skillopt["version"] = "9.9.9"

        _ = RunLock.model_validate(tampered)
        with self.assertRaisesRegex(ValueError, "source lock mismatch"):
            _ = RunLock.model_validate_with_source_lock(tampered, SOURCE_LOCK_PATH)

    def test_every_tampered_approval_hash_binding_is_rejected(self) -> None:
        proposal = accepted_proposal()
        approval = matching_approval(proposal)
        cases = (
            approval.model_copy(update={"proposal_hash": HASH}),
            approval.model_copy(update={"run_lock_hash": "c" * 64}),
            approval.model_copy(update={"report_hash": "c" * 64}),
            approval.model_copy(update={"candidate_body_hash": "c" * 64}),
        )

        for tampered in cases:
            with self.subTest(field=next(iter(tampered.model_fields_set))):
                with self.assertRaisesRegex(ValueError, "approval does not match proposal"):
                    assert_approval_matches_proposal(proposal, copy.deepcopy(tampered))


if __name__ == "__main__":
    _ = unittest.main()
