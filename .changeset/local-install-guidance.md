---
"kibi-opencode": patch
---

Clarify that the OpenCode plugin is optional and does not replace the base Kibi CLI or MCP server packages. Users should install and configure `kibi-cli`, `kibi-mcp`, and `kibi-core` in their project first, then add `kibi-opencode` only when they want OpenCode-specific guidance and background maintenance.

- Document project-local package-manager execution separately from plugin loading.
- Clarify that the plugin expects the project-local `kibi` CLI to be resolvable for internal maintenance.
