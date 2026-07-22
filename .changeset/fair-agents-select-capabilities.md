---
"kibi-cursor": patch
"kibi-opencode": patch
"kibi-mcp": patch
---

Agents can now keep using Kibi when MCP tools are unavailable but a trusted project-local CLI is ready. Guidance across Cursor, OpenCode, and MCP documentation now selects the interface by capability and stops for operator action only when neither safe surface is available.

- Replace MCP-exclusive guidance with the visible-MCP, trusted-CLI JSON route, and blocked state machine.
- Preserve direct `.kb/` access prohibitions, discovery-before-mutation, sequential writes, and completion validation gates.
