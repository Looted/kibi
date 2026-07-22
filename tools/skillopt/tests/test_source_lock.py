from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from tools.skillopt.verify_pin import SourceLock, verify_lock

ROOT = Path(__file__).parents[1]


class SourceLockTests(unittest.TestCase):
    def test_source_lock_records_the_pinned_skillopt_release(self) -> None:
        lock_path = ROOT / "source-lock.json"
        self.assertTrue(lock_path.is_file())
        lock = SourceLock.model_validate_json(lock_path.read_text(encoding="utf-8"))
        self.assertEqual(lock.package, "skillopt")
        self.assertTrue(lock.version)
        self.assertEqual(len(lock.commit), 40)
        self.assertTrue(lock.license)

    def test_verifier_uses_source_lock_version_as_authority(self) -> None:
        lock_path = ROOT / "source-lock.json"
        lock = SourceLock.model_validate_json(lock_path.read_text(encoding="utf-8"))
        changed = lock.model_copy(update={"version": "9.9.9"})

        verify_lock(changed, "9.9.9")

    def test_verifier_rejects_a_tampered_expected_commit(self) -> None:
        verifier = ROOT / "verify_pin.py"
        self.assertTrue(verifier.is_file())
        with tempfile.TemporaryDirectory() as temporary_dir:
            temporary_root = Path(temporary_dir)
            lock_path = temporary_root / "source-lock.json"
            _ = lock_path.write_text(
                json.dumps(
                    {
                        "package": "skillopt",
                        "version": "0.2.0",
                        "commit": "tampered",
                        "license": "MIT",
                    }
                ),
                encoding="utf-8",
            )
            result = subprocess.run(
                [sys.executable, str(verifier), "--lock", str(lock_path)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("commit", result.stderr)


if __name__ == "__main__":
    _ = unittest.main()
