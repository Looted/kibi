---
"kibi-cursor": patch
---

Cursor now starts the bundled Kibi MCP server reliably when it launches plugin processes from a home directory or another unrelated working directory. Consumer workspaces with spaces continue to resolve their project-local `kibi-mcp` installation, while the portable Agent Plugin keeps its separate `npx --no-install` configuration.

- Fix `kibi-cursor` MCP launcher arguments to use Cursor's `${CURSOR_PLUGIN_ROOT}` expansion.
- Add source-install manifest regression coverage for consumer-local resolution from unrelated host directories.
