---
"kibi-mcp": patch
---

MCP session tests can now replace the live Prolog process after a reset without
rewriting the session module. That lets unit coverage exercise terminate and
save-failure paths that previously required a real engine.

- Add `_setPrologProcessForTests` as a test-only seam on the session process slot.
