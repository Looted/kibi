from __future__ import annotations

import copy
import unittest

from pydantic import ValidationError
from tools.skillopt.kibi_skillopt import (
    Approval,
    EpisodeRequest,
    EpisodeResult,
    LedgerEntry,
    LegacyReport,
    Proposal,
    ReportV1,
    RunState,
    assert_approval_matches_proposal,
)
from tools.skillopt.kibi_skillopt.common import contract_hash, parse_json_value

HASH = "b" * 64
TIMESTAMP = "2026-07-21T12:00:00Z"
RUN_ID = "00000000-0000-4000-8000-000000000001"
EPISODE_ID = "00000000-0000-4000-8000-000000000002"
PROPOSAL_ID = "00000000-0000-4000-8000-000000000003"
APPROVAL_ID = "00000000-0000-4000-8000-000000000004"
ESTIMATE = {
    "currency": "USD",
    "amount": 1.25,
    "pricingHash": HASH,
    "kind": "price-equivalent-estimate-not-invoice",
}
USAGE = {"inputTokens": 10, "cachedInputTokens": 2, "outputTokens": 3}


class WorkflowContractTests(unittest.TestCase):
    def test_workflow_artifacts_share_the_versioned_json_contract(self) -> None:
        request = EpisodeRequest.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "episode-request",
                "episodeId": EPISODE_ID,
                "runId": RUN_ID,
                "runLockHash": HASH,
                "variant": "baseline",
                "skill": "kibi-usage",
                "taskId": "task-1",
                "attempt": 1,
                "prompt": "Use the public MCP workflow.",
                "workspaceFixtureHash": HASH,
            }
        )
        result = EpisodeResult.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "episode-result",
                "episodeId": EPISODE_ID,
                "runId": RUN_ID,
                "runLockHash": HASH,
                "status": "completed",
                "startedAt": TIMESTAMP,
                "finishedAt": TIMESTAMP,
                "exitCode": 0,
                "score": 90,
                "hardPass": True,
                "criticalFailures": [],
                "evidenceIndexHash": HASH,
                "reconciliation": {
                    "brokerTrace": True,
                    "diagnosticReceipt": True,
                    "finalStateQuery": True,
                },
                "usage": USAGE,
                "priceEquivalentEstimate": ESTIMATE,
            }
        )
        ledger = LedgerEntry.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "ledger-entry",
                "runId": RUN_ID,
                "sequence": 0,
                "previousEntryHash": None,
                "entryHash": HASH,
                "occurredAt": TIMESTAMP,
                "category": "preflight",
                "model": "none",
                "usage": USAGE,
                "priceEquivalentEstimate": ESTIMATE,
            }
        )
        state = RunState.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "run-state",
                "runId": RUN_ID,
                "runLockHash": HASH,
                "phase": "review",
                "completedEpisodeIds": [EPISODE_ID],
                "ledgerHeadHash": HASH,
                "updatedAt": TIMESTAMP,
                "interrupted": False,
            }
        )

        self.assertEqual(request.schema_version, result.schema_version)
        self.assertEqual(ledger.schema_version, state.schema_version)

    def test_reports_proposals_and_exact_approvals_are_typed(self) -> None:
        _ = LegacyReport.model_validate(
            {
                "runId": "historical-no-go",
                "skill": "kibi-usage",
                "variants": ["baseline", "one-shot", "skillopt"],
                "cells": [{}],
                "costUsd": 0,
                "verdict": "no-go",
            }
        )
        _ = ReportV1.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "report",
                "runId": RUN_ID,
                "runLockHash": HASH,
                "skill": "kibi-usage",
                "variants": ["baseline", "one-shot", "skillopt"],
                "cells": [HASH],
                "priceEquivalentEstimate": ESTIMATE,
                "verdict": "pass",
                "generatedAt": TIMESTAMP,
                "gateResults": {
                    "aggregate": True,
                    "bootstrap": True,
                    "family": True,
                    "security": True,
                    "bundle": None,
                },
            }
        )
        proposal_payload = {
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
            "createdAt": TIMESTAMP,
            "status": "accepted",
        }
        proposal = Proposal.model_validate(proposal_payload)
        approval = Approval.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "approval",
                "approvalId": APPROVAL_ID,
                "proposalId": PROPOSAL_ID,
                "proposalHash": contract_hash(
                    parse_json_value(proposal.model_dump_json(by_alias=True))
                ),
                "runId": RUN_ID,
                "runLockHash": HASH,
                "reportHash": HASH,
                "candidateBodyHash": HASH,
                "reviewer": "reviewer@example.test",
                "decision": "approved",
                "decidedAt": TIMESTAMP,
            }
        )

        assert_approval_matches_proposal(proposal, approval)
        changed = copy.deepcopy(proposal_payload)
        changed["candidateFrontmatterHash"] = "c" * 64
        with self.assertRaises(ValidationError):
            _ = Proposal.model_validate(changed)

    def test_rejected_approval_and_interrupted_ledger_link_are_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            _ = Approval.model_validate(
                {
                    "schemaVersion": "1.0.0",
                    "artifactType": "approval",
                    "approvalId": APPROVAL_ID,
                    "proposalId": PROPOSAL_ID,
                    "proposalHash": HASH,
                    "runId": RUN_ID,
                    "runLockHash": HASH,
                    "candidateBodyHash": HASH,
                    "reviewer": "reviewer@example.test",
                    "decision": "rejected",
                    "decidedAt": TIMESTAMP,
                }
            )
        with self.assertRaisesRegex(ValueError, "ledger sequence/link mismatch"):
            _ = LedgerEntry.model_validate(
                {
                    "schemaVersion": "1.0.0",
                    "artifactType": "ledger-entry",
                    "runId": RUN_ID,
                    "sequence": 1,
                    "previousEntryHash": None,
                    "entryHash": HASH,
                    "occurredAt": TIMESTAMP,
                    "category": "infrastructure",
                    "model": "none",
                    "usage": USAGE,
                    "priceEquivalentEstimate": ESTIMATE,
                }
            )


if __name__ == "__main__":
    _ = unittest.main()
