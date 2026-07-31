from __future__ import annotations

import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

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


@unittest.skipUnless(os.name == "posix", "requires POSIX process groups")
class BridgeProcessCleanupTests(unittest.TestCase):
    def test_timeout_reaps_process_group_while_stderr_is_drained(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            pid_path = Path(directory) / "pid"
            source = "\n".join((
                "import os, sys, time",
                "from pathlib import Path",
                f"Path({str(pid_path)!r}).write_text(str(os.getpid()))",
                "sys.stderr.write('diagnostic\\n' * 1000); sys.stderr.flush()",
                "time.sleep(30)",
            ))
            with patch(
                "tools.skillopt.kibi_skillopt.bridge_runner.bridge_command",
                return_value=(sys.executable, "-c", source),
            ):
                with self.assertRaises(BridgeProcessError) as raised:
                    _ = run_bridge("{}", timeout_seconds=0.1, kill_grace_seconds=0.05)
            self.assertEqual(raised.exception.kind, "timeout")
            wait_for_process_exit(int(pid_path.read_text(encoding="utf-8")))

    def test_output_overflow_reaps_process_group(self) -> None:
        source = (
            "import sys, time\n"
            "while True:\n"
            "    sys.stdout.write('x' * 65536)\n"
            "    sys.stdout.flush()\n"
            "    time.sleep(0.001)\n"
        )
        with patch(
            "tools.skillopt.kibi_skillopt.bridge_runner.bridge_command",
            return_value=(sys.executable, "-c", source),
        ):
            with self.assertRaises(BridgeProcessError) as raised:
                _ = run_bridge("{}", timeout_seconds=5, kill_grace_seconds=0.05)
        self.assertEqual(raised.exception.kind, "output_overflow")


if __name__ == "__main__":
    _ = unittest.main()
