---
"kibi-mcp": patch
---

MCP tools now delegate to shared operation executors in kibi-cli, ensuring semantic parity with CLI routes. Existing MCP clients keep the same public contract while gaining a single implementation path shared with the CLI.

- Preserve all tool names, schemas, and wire formats without breaking changes.
- Require the kibi-cli minor release that provides the shared operations catalog.
