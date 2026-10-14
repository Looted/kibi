---
"kibi-mcp": patch
---

kibi-mcp no longer writes progress text into its JSON-RPC stream. Applying a migration plan with `kb_apply_plan` (compiling a branch store, upgrading the KB schema, ensuring a branch) printed the same progress lines as `kibi sync` and `kibi migrate` to stdout, which an MCP client reads as protocol and reports as parse errors; strict clients could drop the connection. Those lines now go to stderr.

- `startServer` routes `console.log`, `console.info` and `console.debug` to stderr before the stdio transport connects; the transport keeps writing JSON-RPC to stdout.
