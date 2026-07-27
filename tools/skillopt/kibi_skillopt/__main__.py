from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import final

from .models import BridgeRequest


@final
class Arguments(argparse.Namespace):
    def __init__(self) -> None:
        super().__init__()
        self.command: str = ""
        self.path: Path = Path()


def main() -> int:
    parser = argparse.ArgumentParser(prog="kibi-skillopt")
    _ = parser.add_argument("command", choices=("validate-request",))
    _ = parser.add_argument("path", type=Path)
    arguments = Arguments()
    _ = parser.parse_args(namespace=arguments)
    if arguments.command == "validate-request":
        request = BridgeRequest.model_validate_json(arguments.path.read_text(encoding="utf-8"))
        print(json.dumps(request.model_dump(by_alias=True, mode="json"), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
