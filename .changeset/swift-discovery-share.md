---
"kibi-cli": minor
"kibi-mcp": patch
---

Operators now get the same query, search, and status results whether they use familiar CLI flags, JSON input, or MCP. Existing table output, discovery flags, ranking, pagination, relationship display, and status freshness behavior remain available while the execution paths can no longer drift independently.

- Move query, search, and status business logic into shared `kibi-cli` operation executors.
- Replace MCP discovery implementations with thin shared-executor adapters.
- Route human CLI commands and JSON protocol input through runtime-backed shared operations.
