---
"kibi-cli": minor
"kibi-mcp": patch
---

CLI and MCP operations now run through explicit, transport-neutral contexts while each transport keeps ownership of its own lifecycle. This makes one-shot CLI execution and persistent MCP sessions predictable without changing MCP tool behavior.

- Add public operation runtime, capability-port, and lifecycle types to `kibi-cli`.
- Add separate CLI and MCP runtime adapters with write-only MCP stamp refresh.
- Route MCP registrations through runtime-backed operation specs while preserving timeout, diagnostics, and in-flight request handling.
