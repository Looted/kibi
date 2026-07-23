from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Literal

from .common import JsonValue, canonical_json, contract_hash, parse_json_value
from .models import BridgeRequest, BridgeResult


class BridgeError(ValueError):
    pass

Visibility = Literal["public", "private"]


def _json_text(value: JsonValue) -> str:
    return f"{canonical_json(value)}\n"


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            _ = os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


class FileBridge:
    def __init__(self, public_root: Path, private_root: Path) -> None:
        self.public_root: Path = public_root.resolve()
        self.private_root: Path = private_root.resolve()

    def resolve(self, name: str, visibility: Visibility) -> Path:
        candidate = Path(name)
        if candidate.is_absolute():
            raise BridgeError("absolute_bridge_path")
        root = self.public_root if visibility == "public" else self.private_root
        path = (root / candidate).resolve()
        try:
            path.relative_to(root)
        except ValueError as error:
            raise BridgeError("bridge_path_escape") from error
        return path

    def write_public(self, name: str, content: str) -> None:
        _atomic_write(self.resolve(name, "public"), content)

    def write_private(self, name: str, content: str) -> None:
        _atomic_write(self.resolve(name, "private"), content)

    def read_public(self, name: str) -> str:
        return self.resolve(name, "public").read_text(encoding="utf-8")

    def read_private(self, name: str) -> str:
        return self.resolve(name, "private").read_text(encoding="utf-8")

    def write_request(self, name: str, request: BridgeRequest) -> str:
        payload = request.model_dump(by_alias=True, mode="json")
        text = _json_text(payload)
        self.write_public(name, text)
        return contract_hash(payload)

    def read_result(self, name: str, request: BridgeRequest) -> BridgeResult:
        payload = parse_json_value(self.read_public(name))
        if not isinstance(payload, dict):
            raise BridgeError("bridge_result_not_object")
        result = BridgeResult.model_validate(payload)
        expected_hash = contract_hash(request.model_dump(by_alias=True, mode="json"))
        if result.run_id != request.run_id or result.batch_id != request.batch_id:
            raise BridgeError("bridge_request_identity_mismatch")
        if result.request_hash != expected_hash:
            raise BridgeError("bridge_request_hash_mismatch")
        return result
