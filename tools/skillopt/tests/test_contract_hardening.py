from __future__ import annotations

import copy
import tempfile
import unittest
from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, ValidationError
from tools.skillopt.kibi_skillopt import (
    Approval,
    EpisodeRequest,
    EpisodeResult,
    EvidenceIndex,
    LedgerEntry,
    Proposal,
    ReportV1,
    RunLock,
    RunState,
    assert_approval_matches_proposal,
    assert_run_lock_matches,
)
from tools.skillopt.kibi_skillopt.common import (
    MAX_CONTRACT_BYTES,
    ContractModel,
    JsonNode,
    JsonValue,
    canonical_json,
    contract_hash,
    json_node_value,
)
from typing_extensions import assert_never

REPO_ROOT = Path(__file__).resolve().parents[3]
CORPUS_PATH = REPO_ROOT / "scripts/skillopt-eval/tests/fixtures/contract-corpus.json"
RUN_LOCK_PATH = REPO_ROOT / "scripts/skillopt-eval/tests/fixtures/valid-run-lock.json"
VECTOR_PATH = REPO_ROOT / "scripts/skillopt-eval/tests/fixtures/canonical-json-vectors.json"
SOURCE_LOCK_PATH = REPO_ROOT / "tools/skillopt/source-lock.json"
HASH = "b" * 64
RUN_ID = "00000000-0000-4000-8000-000000000001"
PROPOSAL_ID = "00000000-0000-4000-8000-000000000003"

SchemaName = Literal[
    "approval.schema.json",
    "episode-request.schema.json",
    "episode-result.schema.json",
    "evidence-index.schema.json",
    "ledger-entry.schema.json",
    "proposal.schema.json",
    "report.schema.json",
    "run-lock.schema.json",
    "run-state.schema.json",
]


class Patch(ContractModel):
    path: tuple[str, ...]
    value: JsonNode


class CorpusCase(ContractModel):
    name: str
    schema_name: Annotated[SchemaName, Field(alias="schema")]
    fixture: str
    accepted: bool
    patch: Patch | None = None
    patches: tuple[Patch, ...] = ()


class ContractCorpus(ContractModel):
    fixtures: dict[str, JsonNode]
    cases: tuple[CorpusCase, ...]


class CanonicalVector(ContractModel):
    name: str
    value: JsonNode
    canonical: str
    sha256: str


def load_json_object(path: Path) -> dict[str, JsonValue]:
    node = JsonNode.model_validate_json(path.read_text(encoding="utf-8"))
    if not isinstance(node.root, dict):
        raise AssertionError(f"{path} must contain an object")
    return {key: json_node_value(value) for key, value in node.root.items()}


def apply_patch(target: dict[str, JsonValue], patch: Patch) -> None:
    current = target
    for key in patch.path[:-1]:
        child = current.get(key)
        if not isinstance(child, dict):
            raise AssertionError(f"patch path {'.'.join(patch.path)} is not an object")
        current = child
    current[patch.path[-1]] = json_node_value(patch.value)


def materialize(corpus: ContractCorpus, item: CorpusCase) -> dict[str, JsonValue]:
    if item.fixture == "run-lock":
        artifact = load_json_object(RUN_LOCK_PATH)
    else:
        node = corpus.fixtures[item.fixture]
        value = json_node_value(node)
        if not isinstance(value, dict):
            raise AssertionError(f"fixture {item.fixture} must be an object")
        artifact = copy.deepcopy(value)
    for patch in (() if item.patch is None else (item.patch,)) + item.patches:
        apply_patch(artifact, patch)
    return artifact


def parse_artifact(schema_name: SchemaName, artifact: dict[str, JsonValue]) -> ContractModel:
    match schema_name:
        case "approval.schema.json":
            return Approval.model_validate(artifact)
        case "episode-request.schema.json":
            return EpisodeRequest.model_validate(artifact)
        case "episode-result.schema.json":
            return EpisodeResult.model_validate(artifact)
        case "evidence-index.schema.json":
            return EvidenceIndex.model_validate(artifact)
        case "ledger-entry.schema.json":
            return LedgerEntry.model_validate(artifact)
        case "proposal.schema.json":
            return Proposal.model_validate(artifact)
        case "report.schema.json":
            return ReportV1.model_validate(artifact)
        case "run-lock.schema.json":
            return RunLock.model_validate(artifact)
        case "run-state.schema.json":
            return RunState.model_validate(artifact)
    assert_never(schema_name)


class ContractHardeningTests(unittest.TestCase):
    def test_shared_corpus_matches_pydantic_acceptance_and_serialization(self) -> None:
        corpus = ContractCorpus.model_validate_json(CORPUS_PATH.read_text(encoding="utf-8"))
        for item in corpus.cases:
            artifact = materialize(corpus, item)
            with self.subTest(item=item.name):
                parsed: ContractModel | None = None
                try:
                    parsed = parse_artifact(item.schema_name, artifact)
                    accepted = True
                except ValidationError:
                    accepted = False
                self.assertEqual(accepted, item.accepted)
                if accepted and parsed is not None:
                    normalized = JsonNode.model_validate(
                        parsed.model_dump(by_alias=True, mode="json", exclude_unset=True)
                    )
                    self.assertEqual(
                        canonical_json(json_node_value(normalized)), canonical_json(artifact)
                    )

    def test_shared_rfc8785_vectors_cover_unicode_and_small_floats(self) -> None:
        root = JsonNode.model_validate_json(VECTOR_PATH.read_text(encoding="utf-8")).root
        if not isinstance(root, list):
            raise AssertionError("canonical vectors must be an array")
        vectors = tuple(CanonicalVector.model_validate(json_node_value(item)) for item in root)
        for vector in vectors:
            with self.subTest(vector=vector.name):
                value = json_node_value(vector.value)
                self.assertEqual(canonical_json(value), vector.canonical)
                self.assertEqual(contract_hash(value), vector.sha256)

    def test_identical_dirty_run_locks_are_rejected(self) -> None:
        payload = load_json_object(RUN_LOCK_PATH)
        payload["dirtyState"] = {"isDirty": True, "diffHash": HASH}
        dirty = RunLock.model_validate(payload)
        with self.assertRaisesRegex(ValueError, "dirty run lock"):
            assert_run_lock_matches(dirty, dirty)

    def test_changed_source_lock_is_detected_through_validation_context(self) -> None:
        changed = load_json_object(SOURCE_LOCK_PATH)
        changed["version"] = "0.2.1"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source-lock.json"
            _ = path.write_text(canonical_json(changed), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "source lock mismatch"):
                _ = RunLock.model_validate_with_source_lock(load_json_object(RUN_LOCK_PATH), path)

    def test_rejected_proposal_cannot_be_approved_with_recomputed_hash(self) -> None:
        proposal = Proposal.model_validate(
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
                "status": "rejected",
            }
        )
        approval = Approval.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "approval",
                "approvalId": "00000000-0000-4000-8000-000000000004",
                "proposalId": PROPOSAL_ID,
                "proposalHash": contract_hash(
                    json_node_value(
                        JsonNode.model_validate(proposal.model_dump(by_alias=True, mode="json"))
                    )
                ),
                "runId": RUN_ID,
                "runLockHash": HASH,
                "reportHash": HASH,
                "candidateBodyHash": HASH,
                "reviewer": "reviewer@example.test",
                "decision": "approved",
                "decidedAt": "2026-07-21T12:00:00Z",
            }
        )
        with self.assertRaisesRegex(ValueError, "proposal is not approval-eligible"):
            assert_approval_matches_proposal(proposal, approval)

    def test_direct_model_validation_enforces_one_mib_for_every_artifact(self) -> None:
        huge = "x" * (MAX_CONTRACT_BYTES + 1)
        cases: tuple[tuple[str, type[ContractModel], dict[str, JsonValue]], ...] = (
            ("approval", Approval, {"reviewer": huge}),
            ("episode request", EpisodeRequest, {"prompt": huge}),
            ("episode result", EpisodeResult, {"criticalFailures": [huge]}),
            ("evidence", EvidenceIndex, {"events": [{"event": {"payload": huge}}]}),
            ("ledger", LedgerEntry, {"category": huge}),
            ("proposal", Proposal, {"createdAt": huge}),
            ("report", ReportV1, {"cells": [huge]}),
            ("run lock", RunLock, {"artifactRoot": huge}),
            ("run state", RunState, {"updatedAt": huge}),
        )
        for name, model, artifact in cases:
            with (
                self.subTest(artifact=name),
                self.assertRaisesRegex(ValueError, f"contract exceeds {MAX_CONTRACT_BYTES} bytes"),
            ):
                _ = model.model_validate(artifact)


if __name__ == "__main__":
    _ = unittest.main()
