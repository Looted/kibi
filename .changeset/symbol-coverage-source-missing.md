---
"kibi-core": patch
"kibi-cli": patch
"kibi-mcp": patch
---

Symbol coverage now reports a production symbol whose `sourceFile` no longer exists in the workspace as `uncovered` with the `source_missing` gap. Before, `kb_coverage` and `kibi coverage --by symbol` counted such a symbol as fully covered when its requirement and test links were complete, so a deleted or moved file went unnoticed until the next sync.
