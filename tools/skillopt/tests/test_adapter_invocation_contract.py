from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools.skillopt.kibi_skillopt.adapter import EnvAdapter
from tools.skillopt.kibi_skillopt.bridge_runner import run_bridge
from tools.skillopt.kibi_skillopt.common import JsonValue, parse_json_value
from tools.skillopt.tests.test_adapter_contract import CORPUS_ROOTS, HASH


def require_text(value: JsonValue) -> str:
    if not isinstance(value, str):
        raise AssertionError("expected string")
    return value


class BridgeInvocationContractTests(unittest.TestCase):
    def test_bridge_invocation_uses_absolute_paths_and_minimal_environment(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            runner = root / "runner.py"
            runner_source = "".join(
                (
                    "import json\n",
                    "import os\n",
                    "import sys\n",
                    "from pathlib import Path\n",
                    "result = Path(sys.argv[sys.argv.index('--result') + 1])\n",
                    "record = {'command': sys.argv, 'environment': dict(os.environ)}\n",
                    "result.write_text(json.dumps(record))\n",
                )
            )
            _ = runner.write_text(runner_source, encoding="utf-8")
            subject = EnvAdapter(
                bridge_command=(sys.executable, str(runner)),
                bridge_cwd=root,
                run_root=root / "run",
                skill="kibi-usage",
                source_lock_hash=HASH,
                corpus_roots=CORPUS_ROOTS,
                train_items=({"id": "predicate-train-1", "family": "predicate", "split": "train"},),
                development_items=(
                    {
                        "id": "predicate-development-1",
                        "family": "predicate",
                        "split": "development",
                    },
                ),
            )
            request_path = root / "request.json"
            result_path = root / "result.json"
            environment = {
                "PATH": "/usr/bin:/bin",
                "HOME": "/home/tester",
                "CODEX_HOME": "/home/tester/.codex",
                "UNRELATED_SECRET": "must-not-leak",
            }
            with patch.dict(os.environ, environment, clear=True):
                run_bridge(subject.bridge_command, subject.bridge_cwd, request_path, result_path)
            payload = parse_json_value(result_path.read_text(encoding="utf-8"))
            self.assertIsInstance(payload, dict)
            if not isinstance(payload, dict):
                self.fail("bridge runner returned a non-object payload")
            command = payload["command"]
            environment_payload = payload["environment"]
            self.assertIsInstance(command, list)
            self.assertIsInstance(environment_payload, dict)
            if not isinstance(command, list) or not isinstance(environment_payload, dict):
                self.fail("bridge runner returned malformed invocation data")
            command_parts = [require_text(part) for part in command]
            self.assertTrue(Path(subject.bridge_command[0]).is_absolute())
            self.assertTrue(Path(command_parts[0]).is_absolute())
            self.assertTrue(Path(command_parts[2]).is_absolute())
            self.assertTrue(Path(command_parts[-1]).is_absolute())
            self.assertTrue(subject.bridge_cwd.is_absolute())
            self.assertEqual(
                environment_payload,
                {
                    "PATH": "/usr/bin:/bin",
                    "HOME": "/home/tester",
                    "CODEX_HOME": "/home/tester/.codex",
                    "LANG": "C",
                    "LC_ALL": "C",
                    "KIBI_SKILLOPT_PROCESS_GROUP": "python_bridge",
                },
            )
