---
"kibi-cli": minor
"kibi-mcp": patch
---

CLI users can now validate and apply one MCP-shaped upsert payload through `validate-upsert --input` and `upsert --input`, including stdin input. Both transports now enforce the same relationship, contradiction, strict-fact, audit, symbol-granularity, durability, and rollback behavior.

- Move validated upsert execution behind shared Prolog, filesystem, save, and symbol-refresh ports.
- Keep MCP handlers as thin compatibility adapters and verify CLI/MCP graph-state parity.
- Ensure a failed relationship prevents save and leaves no partial entity or edge state.
