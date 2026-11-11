"""Python half of the SkillOpt optimizer toolchain end-to-end test.

Run from the repository root through `uv run --project tools/skillopt python
documentation/tests/e2e/skillopt_optimizer_toolchain_driver.py STAGE INPUT`.
Each stage reads one JSON input file written by
skillopt-optimizer-toolchain.e2e.ts and prints one JSON object. Nothing here
calls a model: the only replaced piece is the upstream ReflACT trainer, the
step that would ask an optimizer model for a new skill body.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.skillopt.kibi_skillopt import (  # noqa: E402  # noqa: E402
    Approval,
    BridgeError,
    BridgeResult,
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
    bridge_runner,
    contract_hash,
    run_lock_hash,
    trainer,
)
from tools.skillopt.kibi_skillopt import __main__ as cli  # noqa: E402
from tools.skillopt.kibi_skillopt.common import parse_json_value  # noqa: E402
from tools.skillopt.kibi_skillopt.models import PublicEvidenceSummary  # noqa: E402
from tools.skillopt.kibi_skillopt.run_lock import load_skillopt_source_lock  # noqa: E402


def _error(action: Any) -> str | None:
    try:
        action()
    except (BridgeError, ValueError) as error:
        return str(error)
    return None


def contracts(data: dict[str, Any]) -> dict[str, Any]:
    lock = RunLock.model_validate_json(Path(data["runLockPath"]).read_text(encoding="utf-8"))
    tampered = RunLock.model_validate_json(
        Path(data["tamperedRunLockPath"]).read_text(encoding="utf-8")
    )
    source_lock = load_skillopt_source_lock()
    proposal = Proposal.model_validate(data["proposal"])
    approval = Approval.model_validate(data["approval"])
    assert_approval_matches_proposal(proposal, approval)
    stale = Approval.model_validate(data["staleApproval"])
    for key in ("report", "ledger", "state", "episodeRequest", "episodeResult", "evidence"):
        model = {
            "report": ReportV1,
            "ledger": LedgerEntry,
            "state": RunState,
            "episodeRequest": EpisodeRequest,
            "episodeResult": EpisodeResult,
            "evidence": EvidenceIndex,
        }[key]
        _ = model.model_validate(data[key])
    return {
        "runLockHash": run_lock_hash(lock),
        "dirtyLockError": _error(lambda: assert_run_lock_matches(lock, tampered)),
        "sourceLockCommit": source_lock.commit,
        "proposalHash": contract_hash(parse_json_value(proposal.model_dump_json(by_alias=True))),
        "staleApprovalError": _error(lambda: assert_approval_matches_proposal(proposal, stale)),
        "changedFrontmatterError": _error(
            lambda: Proposal.model_validate(data["changedFrontmatterProposal"])
        ),
    }


def bridge(data: dict[str, Any]) -> dict[str, Any]:
    request_json = json.dumps(data["request"])
    unstaged = _error(lambda: bridge_runner.run_bridge(request_json, timeout_seconds=120))
    original = bridge_runner.bridge_command
    try:
        # Name only some of the five staged runtime paths.
        import os

        os.environ[bridge_runner.BRIDGE_SOURCE_WORKTREE_ENV] = str(REPO_ROOT)
        partial = _error(lambda: bridge_runner.bridge_command())
        del os.environ[bridge_runner.BRIDGE_SOURCE_WORKTREE_ENV]
        # The bridge's own offline mode: same process, pipe and binding, no cell.
        bridge_runner.bridge_command = lambda: (*original(), "--fake")
        raw = bridge_runner.run_bridge(request_json, timeout_seconds=120)
    finally:
        bridge_runner.bridge_command = original
    result = BridgeResult.model_validate_json(raw)
    return {
        "unstagedError": unstaged,
        "partialRootsError": partial,
        "requestHash": result.request_hash,
        "pythonRequestHash": contract_hash(parse_json_value(request_json)),
        "rowIds": [row.id for row in result.rows],
    }


class _OfflineReflACT:
    """Stands in for the model-calling ReflACT trainer; drives the real adapter."""

    def __init__(self, config: dict[str, Any], adapter: Any) -> None:
        self._config = config
        self._adapter = adapter

    def train(self) -> dict[str, Any]:
        out_root = Path(str(self._config["out_root"]))
        out_root.mkdir(parents=True, exist_ok=True)
        body = "Use Kibi through MCP before editing.\n"
        train_rows = self._adapter.rollout(
            self._adapter._train_items, body, str(out_root / "rollout-train")
        )
        _ = self._adapter.rollout(
            self._adapter._development_items, body, str(out_root / "rollout-development")
        )
        summary = PublicEvidenceSummary.model_validate(
            self._adapter._public_evidence_summary(self._adapter.train_trajectories)
        )
        _ = (out_root / "best_skill.md").write_text(body, encoding="utf-8")
        return {
            "total_steps": 1,
            "train_rows": len(train_rows),
            "summary_attempts": summary.attempts,
        }


def train(data: dict[str, Any]) -> dict[str, Any]:
    original_command = bridge_runner.bridge_command
    original_trainer = trainer.ReflACTTrainer
    bridge_runner.bridge_command = lambda: (*original_command(), "--fake")
    trainer.ReflACTTrainer = _OfflineReflACT  # type: ignore[assignment, misc]
    try:
        _ = cli.main(["train", "--request", data["requestPath"], "--result", data["resultPath"]])
    finally:
        bridge_runner.bridge_command = original_command
        trainer.ReflACTTrainer = original_trainer  # type: ignore[misc]
    result = json.loads(Path(data["resultPath"]).read_text(encoding="utf-8"))
    out_root = Path(data["outRoot"])
    frozen = json.loads((out_root / "frozen-candidate.json").read_text(encoding="utf-8"))
    return {
        "candidateBodyHash": result["codex_candidate_body_hash"],
        "frozenBodyHash": frozen["candidateBodyHash"],
        "trainRows": result["train_rows"],
        "summaryAttempts": result["summary_attempts"],
        "trajectoryCount": len(result["trajectory_hashes"]),
        "development": result["candidate_development"],
        "boundError": _error(lambda: trainer.build_training_config(out_root, max_steps=5)),
        "configCommit": trainer.build_training_config(out_root, max_steps=1)["skillopt_commit"],
    }


STAGES = {"contracts": contracts, "bridge": bridge, "train": train}


def main() -> int:
    stage, input_path = sys.argv[1], sys.argv[2]
    data = json.loads(Path(input_path).read_text(encoding="utf-8"))
    print(json.dumps(STAGES[stage](data), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
