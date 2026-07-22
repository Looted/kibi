#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# ///
"""Verify the committed SkillOpt source and package version receipt."""

from __future__ import annotations

import importlib.metadata
import sys
from collections.abc import Sequence
from datetime import date
from pathlib import Path
from typing import Annotated, ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class SourceLock(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="forbid", frozen=True)

    package: Literal["skillopt"]
    version: Annotated[str, Field(min_length=1)]
    commit: Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
    repository: Annotated[str, Field(min_length=1)]
    license: Annotated[str, Field(min_length=1)]
    retrieved_at: Annotated[date, Field(alias="retrievedAt")]
    python: Annotated[str, Field(min_length=1)]


class PinVerificationError(RuntimeError):
    """Raised when the committed source receipt does not match the pin."""


def parse_source_lock(text: str) -> SourceLock:
    """Parse the small JSON source receipt at the process boundary."""
    return SourceLock.model_validate_json(text)


def verify_lock(lock: SourceLock, installed_version: str | None) -> None:
    """Verify the immutable source receipt and optional installed package."""
    if installed_version is not None and installed_version != lock.version:
        raise PinVerificationError(f"installed version mismatch: {installed_version}")


def parse_lock_path(argv: Sequence[str]) -> Path:
    """Parse the optional lock path without passing untyped CLI data inward."""
    if not argv:
        return Path(__file__).with_name("source-lock.json")
    if len(argv) == 2 and argv[0] == "--lock":
        return Path(argv[1])
    raise PinVerificationError("usage: verify_pin.py [--lock PATH]")


def main(argv: list[str]) -> int:
    """Verify a source lock, returning a shell-friendly status code."""
    try:
        lock_path = parse_lock_path(argv)
        lock = parse_source_lock(lock_path.read_text(encoding="utf-8"))
        try:
            installed_version = importlib.metadata.version(lock.package)
        except importlib.metadata.PackageNotFoundError:
            installed_version = None
        verify_lock(lock, installed_version)
    except (OSError, PinVerificationError, ValidationError) as error:
        _ = sys.stderr.write(f"skillopt pin verification failed: {error}\n")
        return 1
    _ = sys.stdout.write(f"skillopt pin verified: {lock.package} {lock.version} @ {lock.commit}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
