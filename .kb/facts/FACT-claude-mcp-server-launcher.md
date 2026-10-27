---
title: The kibi-claude kibi MCP server runs the bundled launcher
status: active
fact_kind: property_value
subject_key: claude.kibi_plugin
property_key: kibi_mcp_server_args
operator: eq
value_type: set
value_set:
  - ${CLAUDE_PLUGIN_ROOT}/bin/mcp-launcher.cjs
claim_text: The kibi MCP server in the kibi-claude MCP configuration must run only the bundled MCP launcher
text_ref: REQ-claude-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:43:10.150Z'
claim_key: CLAIM-4E46CD7CA044ACA0
id: FACT-claude-mcp-server-launcher
type: fact
---
The MCP configuration starts the kibi server with the launcher the plugin bundles and no other argument.