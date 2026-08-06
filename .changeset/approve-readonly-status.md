---
"kibi-mcp": patch
---

Non-interactive MCP clients can now inspect Kibi branch status without an unnecessary approval prompt. The status operation is explicitly advertised as read-only, non-destructive, idempotent, and closed-world, matching its existing behavior.

- Add MCP tool annotations for `kb_status`.
- Extend registration and frozen tool-contract coverage.
