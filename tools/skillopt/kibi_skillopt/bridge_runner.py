from __future__ import annotations

import os
import shutil
import signal
import subprocess
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from types import FrameType
from typing import Literal

from typing_extensions import override

from .bridge import BridgeError

BridgeProcessFailureKind = Literal["group_unavailable", "startup", "timeout", "interrupted"]


@dataclass(frozen=True, slots=True)
class BridgeProcessError(BridgeError):
    kind: BridgeProcessFailureKind

    @override
    def __str__(self) -> str:
        return f"bridge_{self.kind}"


class _BridgeInterruptedError(Exception):
    pass


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
        "KIBI_SKILLOPT_PROCESS_GROUP": "python_bridge",
    }
    for key in ("HOME", "CODEX_HOME"):
        value = environment.get(key)
        if value:
            sanitized[key] = value
    return sanitized


def _interrupt_bridge(_signal_number: int, _frame: FrameType | None) -> None:
    raise _BridgeInterruptedError


def _signal_process_group(process: subprocess.Popen[str], signal_number: int) -> None:
    try:
        os.killpg(process.pid, signal_number)
    except ProcessLookupError:
        return


def _reap_process_group(process: subprocess.Popen[str], grace_seconds: float) -> None:
    _signal_process_group(process, signal.SIGTERM)
    try:
        _ = process.communicate(timeout=grace_seconds)
    except subprocess.TimeoutExpired:
        pass
    _signal_process_group(process, signal.SIGKILL)
    if process.poll() is None:
        _ = process.communicate()


def run_bridge(
    bridge_command: Sequence[str],
    cwd: Path,
    request_path: Path,
    result_path: Path,
    *,
    timeout_seconds: float = 15 * 60,
    kill_grace_seconds: float = 2,
) -> None:
    if os.name != "posix":
        raise BridgeProcessError("group_unavailable")
    command = [
        *bridge_command,
        "--request",
        str(request_path.resolve()),
        "--result",
        str(result_path.resolve()),
    ]
    previous_sigint = signal.getsignal(signal.SIGINT)
    previous_sigterm = signal.getsignal(signal.SIGTERM)
    process: subprocess.Popen[str] | None = None
    try:
        _ = signal.signal(signal.SIGINT, _interrupt_bridge)
        _ = signal.signal(signal.SIGTERM, _interrupt_bridge)
        try:
            process = subprocess.Popen(
                command,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=sanitized_bridge_environment(os.environ),
                start_new_session=True,
            )
        except OSError as error:
            raise BridgeProcessError("startup") from error
        try:
            _ = process.communicate(timeout=timeout_seconds)
        except subprocess.TimeoutExpired as error:
            _reap_process_group(process, kill_grace_seconds)
            raise BridgeProcessError("timeout") from error
        except (KeyboardInterrupt, _BridgeInterruptedError) as error:
            _reap_process_group(process, kill_grace_seconds)
            raise BridgeProcessError("interrupted") from error
    except (KeyboardInterrupt, _BridgeInterruptedError) as error:
        if process is not None:
            _reap_process_group(process, kill_grace_seconds)
        raise BridgeProcessError("interrupted") from error
    finally:
        _ = signal.signal(signal.SIGINT, previous_sigint)
        _ = signal.signal(signal.SIGTERM, previous_sigterm)
    if process.returncode != 0:
        _reap_process_group(process, kill_grace_seconds)
        raise BridgeError(f"bridge_exit:{process.returncode}")
