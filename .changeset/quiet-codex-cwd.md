---
"kibi-codex": patch
---

Codex users can now install the Kibi plugin and have its MCP server resolve from the active project automatically. The plugin keeps the consumer's local dependency boundary, so it does not accidentally run a cached plugin copy or download a package at startup.

- Use Codex's `mcpServers` configuration wrapper and inherit the host-provided task cwd.
- Keep `npx --no-install kibi-mcp` and the existing approval and timeout policies.
