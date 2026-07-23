from __future__ import annotations

import argparse
import json
from pathlib import Path

from .models import BridgeRequest


def main() -> int:
    parser = argparse.ArgumentParser(prog="kibi-skillopt")
    parser.add_argument("command", choices=("validate-request",))
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    command = str(args.command)
    path = Path(str(args.path))
    if command == "validate-request":
        request = BridgeRequest.model_validate_json(path.read_text(encoding="utf-8"))
        print(json.dumps(request.model_dump(by_alias=True, mode="json"), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
