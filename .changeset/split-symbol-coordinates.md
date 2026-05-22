---
"kibi-cli": minor
"kibi-mcp": patch
"kibi-opencode": patch
"kibi-vscode": patch
---

This update introduces a split symbol coordinate workflow that separates logical symbol definitions from their physical source locations. Symbol coordinates are now managed in `documentation/symbol-coordinates.yaml`, which improves git diff readability and reduces merge conflicts when only line numbers change. The `kibi sync` command now supports a `--refresh-symbol-coordinates` flag to explicitly update these locations.

- **kibi-cli**: Added `--refresh-symbol-coordinates` flag to `kibi sync` and updated pre-commit hooks to enforce coordinate staging.
- **kibi-mcp**: Updated symbol resolution logic to read from the new split coordinate manifest.
- **kibi-opencode**: Updated background sync behavior and documentation to support the split manifest workflow.
- **kibi-vscode**: Updated the symbol resolver to consume the split `symbol-coordinates.yaml` file for navigation and hover features.
