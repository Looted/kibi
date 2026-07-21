---
"kibi-cli": minor
"kibi-mcp": patch
---

Operators can use `find-gaps`, `coverage`, and `graph` through either CLI flags or JSON input with the same results exposed by MCP. The existing `gaps` command remains available as an alias, while reporting defaults and traversal bounds stay unchanged.

- Move find-gaps, coverage, and graph execution into shared `kibi-cli` operation specs.
- Replace MCP reporting business logic with thin shared-executor adapters.
- Route legacy reporting commands and JSON input through the shared operation protocol.
