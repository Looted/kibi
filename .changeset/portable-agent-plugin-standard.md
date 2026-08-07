---
"kibi-cursor": patch
---

Kibi now ships as a portable Agent Plugin alongside the existing Cursor Plugin. The open Agent Plugins standard (agent-plugins.org) packages Kibi's Agent Skills and MCP server so any compatible client — Cursor, Copilot, OpenCode, and others — loads Kibi's capabilities without client-specific adaptation. The Cursor Plugin keeps Cursor-only components (rules, commands, hooks), and both formats are listed in the same marketplace.

- Add a committed portable Agent Plugin artifact at `agent-plugin/` with a conformant `plugin.json` manifest (plugin.schema.json 1.0.0).
- Generate the artifact's `mcp.json` with the required `$schema` and `stdio` server type.
- List the Agent Plugin (`plugins/kibi-agent-plugin`) in the repo marketplace alongside `kibi-cursor`.
- Add `scripts/build-agent-plugin.ts` to regenerate the artifact and keep its skills in sync with the canonical bundle.
