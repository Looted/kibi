from __future__ import annotations

import os
import shutil
import subprocess
from collections.abc import Mapping, Sequence
from pathlib import Path

from .bridge import BridgeError


def resolve_bridge_command(command: Sequence[str], cwd: Path) -> tuple[str, ...]:
    if not command:
        raise BridgeError("bridge_command_missing")
    resolved: list[str] = []
    for index, part in enumerate(command):
        path = Path(part)
        if path.is_absolute():
            resolved.append(str(path.resolve()))
            continue
        if index == 0:
            executable = shutil.which(part)
            resolved.append(executable if executable is not None else part)
            continue
        if path.suffix in {".ts", ".js", ".mjs", ".cjs"} or "/" in part:
            resolved.append(str((cwd / path).resolve()))
            continue
        resolved.append(part)
    return tuple(resolved)


def sanitized_bridge_environment(environment: Mapping[str, str]) -> dict[str, str]:
    sanitized = {
        "PATH": environment.get("PATH", "/usr/bin:/bin"),
        "LANG": "C",
        "LC_ALL": "C",
    }
    for key in ("HOME", "CODEX_HOME"):
        value = environment.get(key)
        if value:
            sanitized[key] = value
    return sanitized


def run_bridge(
    bridge_command: Sequence[str],
    cwd: Path,
    request_path: Path,
    result_path: Path,
) -> None:
    command = [
        *bridge_command,
        "--request",
        str(request_path.resolve()),
        "--result",
        str(result_path.resolve()),
    ]
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            check=False,
            capture_output=True,
            text=True,
            timeout=15 * 60,
            env=sanitized_bridge_environment(os.environ),
        )
    except subprocess.TimeoutExpired as error:
        raise BridgeError("bridge_timeout") from error
    if completed.returncode != 0:
        raise BridgeError(f"bridge_exit:{completed.returncode}")
