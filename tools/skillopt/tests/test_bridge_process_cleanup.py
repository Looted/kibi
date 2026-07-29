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

from tools.skillopt.kibi_skillopt import bridge_runner
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

    def test_reap_escalates_after_term_acknowledgement(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            # Given
            root = Path(directory)
            term_path = root / "term"
            ready_path = root / "ready"
            source = "\n".join(
                (
                    "import signal",
                    "import sys",
                    "from pathlib import Path",
                    "term_path = Path(sys.argv[1])",
                    "ready_path = Path(sys.argv[2])",
                    "def acknowledge_term(_signal, _frame):",
                    "    term_path.write_text('SIGTERM', encoding='utf-8')",
                    "signal.signal(signal.SIGTERM, acknowledge_term)",
                    "ready_path.write_text('ready', encoding='utf-8')",
                    "while True:",
                    "    signal.pause()",
                )
            )
            process = subprocess.Popen(
                (sys.executable, "-c", source, str(term_path), str(ready_path)),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                start_new_session=True,
            )
            try:
                deadline = time.monotonic() + 2
                while not ready_path.exists():
                    if time.monotonic() >= deadline:
                        self.fail("term-acknowledging process did not become ready")
                    time.sleep(0.01)

                # When
                getattr(bridge_runner, "_reap_process_group")(process, grace_seconds=0.05)

                # Then
                self.assertEqual(term_path.read_text(encoding="utf-8"), "SIGTERM")
                self.assertEqual(process.returncode, -signal.SIGKILL)
                self.assertIsNotNone(process.poll())
            finally:
                if process.poll() is None:
                    process.kill()
                    _ = process.communicate()

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
