from __future__ import annotations

import os
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path

from tools.skillopt.kibi_skillopt.bridge_runner import BridgeProcessError, run_bridge


def process_exists(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    return True


def wait_for_process_exit(pid: int) -> None:
    deadline = time.monotonic() + 2
    while process_exists(pid):
        if time.monotonic() >= deadline:
            raise AssertionError(f"process {pid} survived cleanup")
        time.sleep(0.01)


def exiting_bun_tree_harness() -> str:
    return "\n".join(
        (
            'import { appendFileSync, writeFileSync } from "node:fs";',
            'const pidPath = process.argv[process.argv.indexOf("--request") + 1];',
            'const authMarker = process.argv[process.argv.indexOf("--result") + 1];',
            'writeFileSync(pidPath, `${process.pid} `, "utf8");',
            'writeFileSync(authMarker, "private-auth", "utf8");',
            "const childCommand =",
            "  `trap '' TERM; (trap '' TERM; sleep 30) & echo \"$$ $!\" >> \"$1\"; wait`;",
            "const child = Bun.spawn(",
            '  ["bash", "-c", childCommand, "bridge-child", pidPath],',
            '  { stdout: "ignore", stderr: "ignore" },',
            ");",
            "await child.exited;",
        )
    )


@unittest.skipUnless(os.name == "posix", "requires POSIX process groups")
class BridgeProcessCleanupTests(unittest.TestCase):
    def test_timeout_kills_descendants_after_bun_exits_on_term(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            runner = root / "tree.ts"
            pid_path = root / "pids"
            auth_marker = root / "auth-marker"
            _ = runner.write_text(exiting_bun_tree_harness(), encoding="utf-8")

            # When
            with self.assertRaises(BridgeProcessError) as raised:
                run_bridge(
                    ("bun", str(runner)),
                    root,
                    pid_path,
                    auth_marker,
                    timeout_seconds=1,
                    kill_grace_seconds=0.05,
                )

            # Then
            self.assertEqual(raised.exception.kind, "timeout")
            self.assertIsInstance(raised.exception.__cause__, subprocess.TimeoutExpired)
            parent_pid, child_pid, grandchild_pid = (
                int(part) for part in pid_path.read_text(encoding="utf-8").split()
            )
            try:
                wait_for_process_exit(parent_pid)
                wait_for_process_exit(child_pid)
                wait_for_process_exit(grandchild_pid)
            finally:
                for pid in (parent_pid, child_pid, grandchild_pid):
                    if process_exists(pid):
                        os.kill(pid, signal.SIGKILL)

    def test_run_bridge_escalates_after_term_acknowledgement(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            pid_path = root / "pid"
            term_path = root / "term"
            source = "\n".join(
                (
                    "import os",
                    "import signal",
                    "import sys",
                    "from pathlib import Path",
                    'request_path = Path(sys.argv[sys.argv.index("--request") + 1])',
                    'result_path = Path(sys.argv[sys.argv.index("--result") + 1])',
                    "def acknowledge_term(_signal, _frame):",
                    "    result_path.write_text('SIGTERM', encoding='utf-8')",
                    "signal.signal(signal.SIGTERM, acknowledge_term)",
                    "request_path.write_text(f'{os.getpid()} ready', encoding='utf-8')",
                    "while True:",
                    "    signal.pause()",
                )
            )
            pid: int | None = None
            try:
                # When
                with self.assertRaises(BridgeProcessError) as raised:
                    run_bridge(
                        (sys.executable, "-c", source),
                        root,
                        pid_path,
                        term_path,
                        timeout_seconds=1,
                        kill_grace_seconds=0.05,
                    )

                deadline = time.monotonic() + 2
                while not pid_path.exists():
                    if time.monotonic() >= deadline:
                        self.fail("term-acknowledging bridge runner did not become ready")
                    time.sleep(0.01)
                pid_text, readiness = pid_path.read_text(encoding="utf-8").split()
                pid = int(pid_text)

                # Then
                self.assertEqual(raised.exception.kind, "timeout")
                self.assertIsInstance(raised.exception.__cause__, subprocess.TimeoutExpired)
                self.assertEqual(readiness, "ready")
                self.assertEqual(term_path.read_text(encoding="utf-8"), "SIGTERM")
                wait_for_process_exit(pid)
            finally:
                if pid is None and pid_path.exists():
                    pid = int(pid_path.read_text(encoding="utf-8").split()[0])
                if pid is not None and process_exists(pid):
                    os.kill(pid, signal.SIGKILL)

    def test_sigterm_kills_descendants_after_bun_exits_on_term(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            runner = root / "tree.ts"
            pid_path = root / "pids"
            auth_marker = root / "auth-marker"
            _ = runner.write_text(exiting_bun_tree_harness(), encoding="utf-8")
            interrupt = threading.Timer(1, os.kill, args=(os.getpid(), signal.SIGTERM))
            interrupt.start()

            # When
            try:
                with self.assertRaises(BridgeProcessError) as raised:
                    run_bridge(
                        ("bun", str(runner)),
                        root,
                        pid_path,
                        auth_marker,
                        timeout_seconds=5,
                        kill_grace_seconds=0.05,
                    )
            finally:
                interrupt.cancel()

            # Then
            self.assertEqual(raised.exception.kind, "interrupted")
            parent_pid, child_pid, grandchild_pid = (
                int(part) for part in pid_path.read_text(encoding="utf-8").split()
            )
            try:
                wait_for_process_exit(parent_pid)
                wait_for_process_exit(child_pid)
                wait_for_process_exit(grandchild_pid)
            finally:
                for pid in (parent_pid, child_pid, grandchild_pid):
                    if process_exists(pid):
                        os.kill(pid, signal.SIGKILL)

    def test_sigint_kills_descendants_after_bun_exits_on_term(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            runner = root / "tree.ts"
            pid_path = root / "pids"
            auth_marker = root / "auth-marker"
            _ = runner.write_text(exiting_bun_tree_harness(), encoding="utf-8")
            interrupt = threading.Timer(1, os.kill, args=(os.getpid(), signal.SIGINT))
            interrupt.start()

            # When
            try:
                with self.assertRaises(BridgeProcessError) as raised:
                    run_bridge(
                        ("bun", str(runner)),
                        root,
                        pid_path,
                        auth_marker,
                        timeout_seconds=5,
                        kill_grace_seconds=0.05,
                    )
            finally:
                interrupt.cancel()

            # Then
            self.assertEqual(raised.exception.kind, "interrupted")
            parent_pid, child_pid, grandchild_pid = (
                int(part) for part in pid_path.read_text(encoding="utf-8").split()
            )
            try:
                wait_for_process_exit(parent_pid)
                wait_for_process_exit(child_pid)
                wait_for_process_exit(grandchild_pid)
            finally:
                for pid in (parent_pid, child_pid, grandchild_pid):
                    if process_exists(pid):
                        os.kill(pid, signal.SIGKILL)
