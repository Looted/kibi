#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# ///
"""Verify the committed SkillOpt source and package version receipt."""

from __future__ import annotations

import importlib.metadata
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, ValidationError

EXPECTED_COMMIT = "b860a5cf88ce75e2bd02ca981ac21fb28cffba83"
EXPECTED_PACKAGE = "skillopt"
EXPECTED_VERSION = "0.2.0"


class SourceLock(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    package: str
    version: str
    commit: str
    license: str


class PinVerificationError(RuntimeError):
    """Raised when the committed source receipt does not match the pin."""


def parse_source_lock(text: str) -> SourceLock:
    """Parse the small JSON source receipt at the process boundary."""
    return SourceLock.model_validate_json(text)


def verify_lock(lock: SourceLock, installed_version: str | None) -> None:
    """Verify the immutable source receipt and optional installed package."""
    if lock.package != EXPECTED_PACKAGE:
        raise PinVerificationError(f"package mismatch: {lock.package}")
    if lock.version != EXPECTED_VERSION:
        raise PinVerificationError(f"version mismatch: {lock.version}")
    if lock.commit != EXPECTED_COMMIT:
        raise PinVerificationError(f"commit mismatch: {lock.commit}")
    if lock.license != "MIT":
        raise PinVerificationError(f"license mismatch: {lock.license}")
    if installed_version is not None and installed_version != EXPECTED_VERSION:
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
            installed_version = importlib.metadata.version(EXPECTED_PACKAGE)
        except importlib.metadata.PackageNotFoundError:
            installed_version = None
        verify_lock(lock, installed_version)
    except (OSError, PinVerificationError, ValidationError) as error:
        _ = sys.stderr.write(f"skillopt pin verification failed: {error}\n")
        return 1
    _ = sys.stdout.write(
        f"skillopt pin verified: {EXPECTED_PACKAGE} {EXPECTED_VERSION} @ {EXPECTED_COMMIT}\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
