from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from pathlib import Path

from .bridge import (
    FileBridge,
    OptimizerBridgeContext,
    OptimizerInput,
    build_optimizer_request,
    read_optimizer_result,
    write_optimizer_request,
)
from .common import JsonValue
from .lineage import AdapterLineage, compute_lineage, parse_trajectories
from .models import AdapterCheckpoint, CorpusRoots, OptimizerRequest, OptimizerResult

TrajectoryInput = Mapping[str, JsonValue]
DevelopmentInput = Mapping[str, JsonValue]


class OptimizerAdapterMixin:
    def __init__(
        self,
        *,
        run_root: Path,
        corpus_roots: CorpusRoots,
        optimizer_context: OptimizerBridgeContext,
    ) -> None:
        self.run_root: Path = run_root
        self.corpus_roots: CorpusRoots = corpus_roots
        self._optimizer_context: OptimizerBridgeContext = optimizer_context

    def _invoke_optimizer_bridge(self, request_path: Path, result_path: Path) -> None:
        _ = (request_path, result_path)
        raise NotImplementedError

    def compute_lineage(
        self,
        candidate_body: str,
        trajectories: Sequence[TrajectoryInput],
    ) -> AdapterLineage:
        return compute_lineage(candidate_body, parse_trajectories(trajectories), self.corpus_roots)

    def build_optimizer_request(
        self,
        *,
        current_body: str,
        trajectories: Sequence[TrajectoryInput],
        previous_development: DevelopmentInput,
        step: int,
        max_steps: int,
        public_evidence_summary: Mapping[str, JsonValue] | None = None,
    ) -> OptimizerRequest:
        return build_optimizer_request(
            self._optimizer_context,
            OptimizerInput(
                current_body=current_body,
                trajectories=trajectories,
                previous_development=previous_development,
                step=step,
                max_steps=max_steps,
                public_evidence_summary=(
                    public_evidence_summary
                    if public_evidence_summary is not None
                    else {
                        "attempts": len(trajectories),
                        "hardPasses": 0,
                        "families": [
                            {
                                "family": "unclassified",
                                "attempts": len(trajectories),
                                "hardPasses": 0,
                                "meanSoft": 0,
                                "failureCounts": [],
                            }
                        ],
                    }
                ),
            ),
        )

    def optimize(
        self,
        *,
        current_body: str,
        trajectories: Sequence[TrajectoryInput],
        previous_development: DevelopmentInput,
        step: int,
        max_steps: int,
        public_evidence_summary: Mapping[str, JsonValue] | None = None,
    ) -> OptimizerResult:
        request = self.build_optimizer_request(
            current_body=current_body,
            trajectories=trajectories,
            previous_development=previous_development,
            step=step,
            max_steps=max_steps,
            public_evidence_summary=public_evidence_summary,
        )
        output_root = self.run_root / "optimizer" / f"step-{step:04d}"
        bridge = FileBridge(output_root / "requests", output_root / "results")
        request_name = "optimizer-request.json"
        result_name = "optimizer-result.json"
        _ = write_optimizer_request(bridge, request_name, request)
        request_path = bridge.resolve(request_name, "public")
        result_path = bridge.resolve(result_name, "public")
        self._invoke_optimizer_bridge(request_path, result_path)
        return read_optimizer_result(bridge, result_name, request)

    def save_checkpoint(
        self,
        completed_steps: int,
        candidate_body: str,
        completed_task_ids: Sequence[str],
        max_steps: int = 4,
        trajectories: Sequence[TrajectoryInput] = (),
    ) -> AdapterCheckpoint:
        lineage = self.compute_lineage(candidate_body, trajectories)
        checkpoint = AdapterCheckpoint.model_validate(
            {
                "schemaVersion": "1.0.0",
                "artifactType": "skillopt-adapter-checkpoint",
                "maxSteps": max_steps,
                "completedSteps": completed_steps,
                "nextStep": completed_steps + 1,
                "candidateBodyHash": lineage.candidate_body_hash,
                "trajectoryHashes": list(lineage.trajectory_hashes),
                "trainerCheckpointHash": lineage.trainer_checkpoint_hash,
                "corpusRoots": self.corpus_roots.model_dump(by_alias=True, mode="json"),
                "completedTaskIds": list(completed_task_ids),
                "interrupted": False,
            }
        )
        self.run_root.mkdir(parents=True, exist_ok=True)
        _ = (self.run_root / "adapter-checkpoint.json").write_text(
            json.dumps(checkpoint.model_dump(by_alias=True, mode="json"), sort_keys=True) + "\n",
            encoding="utf-8",
        )
        return checkpoint

    def load_checkpoint(self) -> AdapterCheckpoint:
        path = self.run_root / "adapter-checkpoint.json"
        return AdapterCheckpoint.model_validate_json(path.read_text(encoding="utf-8"))
