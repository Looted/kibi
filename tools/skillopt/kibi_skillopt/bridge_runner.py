from __future__ import annotations

import os
import signal
import subprocess
import threading
import time
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from types import FrameType
from typing import Literal

from typing_extensions import override

from .bridge import BridgeError

BridgeProcessFailureKind = Literal[
    "group_unavailable", "startup", "timeout", "interrupted", "output_overflow"
]
MAX_BRIDGE_OUTPUT_BYTES = 1_000_000
BRIDGE_SOURCE_WORKTREE_ENV = "KIBI_SKILLOPT_SOURCE_WORKTREE"
BRIDGE_ARTIFACT_ROOT_ENV = "KIBI_SKILLOPT_ARTIFACT_ROOT"
BRIDGE_FIXTURE_RUN_ROOT_ENV = "KIBI_SKILLOPT_FIXTURE_RUN_ROOT"
BRIDGE_CODEX_EXECUTABLE_ENV = "KIBI_SKILLOPT_CODEX_EXECUTABLE"
BRIDGE_BWRAP_EXECUTABLE_ENV = "KIBI_SKILLOPT_BWRAP_EXECUTABLE"


@dataclass(frozen=True, slots=True)
class BridgeProcessError(BridgeError):
    kind: BridgeProcessFailureKind

    @override
    def __str__(self) -> str:
        return f"bridge_{self.kind}"


class _BridgeInterruptedError(Exception):
    pass


def bridge_source_root() -> Path:
    root = Path(__file__).resolve().parents[3]
    if not (root / "scripts" / "skillopt-eval" / "bridge-cli.ts").is_file():
        raise BridgeError("bridge_entrypoint_missing")
    return root


def bridge_command() -> tuple[str, ...]:
    entrypoint = bridge_source_root() / "scripts" / "skillopt-eval" / "bridge-cli.ts"
    command = ["bun", "run", str(entrypoint), "--pipe"]
    source_worktree = os.environ.get(BRIDGE_SOURCE_WORKTREE_ENV) or None
    artifact_root = os.environ.get(BRIDGE_ARTIFACT_ROOT_ENV) or None
    fixture_run_root = os.environ.get(BRIDGE_FIXTURE_RUN_ROOT_ENV) or None
    codex_executable = os.environ.get(BRIDGE_CODEX_EXECUTABLE_ENV) or None
    bwrap_executable = os.environ.get(BRIDGE_BWRAP_EXECUTABLE_ENV) or None
    configured = (
        source_worktree,
        artifact_root,
        fixture_run_root,
        codex_executable,
        bwrap_executable,
    )
    if any(configured) and not all(configured):
        raise BridgeError("incomplete_bridge_execution_roots")
    if all(configured):
        assert source_worktree is not None
        assert artifact_root is not None
        assert fixture_run_root is not None
        assert codex_executable is not None
        assert bwrap_executable is not None
        command.extend(
            (
                "--source-worktree",
                source_worktree,
                "--artifact-root",
                artifact_root,
                "--fixture-run-root",
                fixture_run_root,
                "--codex-executable",
                codex_executable,
                "--bwrap-executable",
                bwrap_executable,
            )
        )
    return tuple(command)


def run_optimizer_bridge(request_path: Path, result_path: Path) -> None:
    entrypoint = bridge_source_root() / "scripts" / "skillopt-eval" / "optimizer-bridge-cli.ts"
    try:
        _ = subprocess.run(
            (
                "bun",
                "run",
                str(entrypoint),
                "--request",
                str(request_path.resolve()),
                "--result",
                str(result_path.resolve()),
            ),
            cwd=bridge_source_root(),
            env=sanitized_bridge_environment(os.environ),
            check=True,
        )
    except OSError as error:
        raise BridgeProcessError("startup") from error
    except subprocess.CalledProcessError as error:
        raise BridgeError(f"bridge_exit:{error.returncode}") from error


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


def _signal_process_group(process: subprocess.Popen[bytes], signal_number: int) -> None:
    try:
        os.killpg(process.pid, signal_number)
    except ProcessLookupError:
        return


def _reap_process_group(process: subprocess.Popen[bytes], grace_seconds: float) -> None:
    _signal_process_group(process, signal.SIGTERM)
    try:
        _ = process.wait(timeout=grace_seconds)
    except subprocess.TimeoutExpired:
        _signal_process_group(process, signal.SIGKILL)
    else:
        _signal_process_group(process, signal.SIGKILL)
    if process.poll() is None:
        _ = process.wait()


def _drain(stream: object, output: bytearray, overflow: threading.Event) -> None:
    read_attr = getattr(stream, "read", None)
    if not callable(read_attr):
        raise TypeError("bridge stream is not readable")
    while True:
        raw = read_attr(8192)
        if not raw:
            return
        if not isinstance(raw, (bytes, bytearray)):
            raise TypeError("bridge stream produced non-bytes")
        chunk = bytes(raw)
        if len(output) + len(chunk) > MAX_BRIDGE_OUTPUT_BYTES:
            overflow.set()
            continue
        output.extend(chunk)


def run_bridge(
    request_json: str,
    *,
    timeout_seconds: float = 15 * 60,
    kill_grace_seconds: float = 2,
) -> str:
    if os.name != "posix":
        raise BridgeProcessError("group_unavailable")
    previous_sigint = signal.getsignal(signal.SIGINT)
    previous_sigterm = signal.getsignal(signal.SIGTERM)
    process: subprocess.Popen[bytes] | None = None
    stdout = bytearray()
    stderr = bytearray()
    overflow = threading.Event()
    try:
        _ = signal.signal(signal.SIGINT, _interrupt_bridge)
        _ = signal.signal(signal.SIGTERM, _interrupt_bridge)
        try:
            process = subprocess.Popen(
                bridge_command(),
                cwd=bridge_source_root(),
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=sanitized_bridge_environment(os.environ),
                start_new_session=True,
            )
        except OSError as error:
            raise BridgeProcessError("startup") from error
        if process.stdin is None or process.stdout is None or process.stderr is None:
            raise BridgeProcessError("startup")
        stdin = process.stdin
        def write_request() -> None:
            try:
                _ = stdin.write(request_json.encode("utf-8"))
            except BrokenPipeError:
                pass
            finally:
                stdin.close()
        writer = threading.Thread(target=write_request, daemon=True)
        stdout_reader = threading.Thread(target=_drain, args=(process.stdout, stdout, overflow))
        stderr_reader = threading.Thread(target=_drain, args=(process.stderr, stderr, overflow))
        writer.start()
        stdout_reader.start()
        stderr_reader.start()
        deadline = time.monotonic() + timeout_seconds
        while process.poll() is None:
            if overflow.is_set():
                _reap_process_group(process, kill_grace_seconds)
                raise BridgeProcessError("output_overflow")
            if time.monotonic() >= deadline:
                _reap_process_group(process, kill_grace_seconds)
                raise BridgeProcessError("timeout")
            time.sleep(0.01)
        writer.join()
        stdout_reader.join()
        stderr_reader.join()
        if overflow.is_set():
            _reap_process_group(process, kill_grace_seconds)
            raise BridgeProcessError("output_overflow")
    except (KeyboardInterrupt, _BridgeInterruptedError) as error:
        if process is not None:
            _reap_process_group(process, kill_grace_seconds)
        raise BridgeProcessError("interrupted") from error
    finally:
        _ = signal.signal(signal.SIGINT, previous_sigint)
        _ = signal.signal(signal.SIGTERM, previous_sigterm)
    if process.returncode != 0:
        _reap_process_group(process, kill_grace_seconds)
        detail = stderr.decode("utf-8", errors="replace").strip().replace("\n", " ")
        if len(detail) > 500:
            detail = detail[:500]
        raise BridgeError(
            f"bridge_exit:{process.returncode}:{detail or 'no_stderr'}"
        )
    return stdout.decode("utf-8")
