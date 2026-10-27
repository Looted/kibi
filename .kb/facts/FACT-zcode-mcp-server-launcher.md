---
title: The kibi-zcode kibi MCP server runs the bundled launcher
status: active
fact_kind: property_value
subject_key: zcode.kibi_adapter
property_key: kibi_mcp_server_args
operator: eq
value_type: set
value_set:
  - ${ZCODE_PLUGIN_ROOT}/bin/mcp-launcher.cjs
claim_text: The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher
text_ref: REQ-zcode-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:26:44.802Z'
claim_key: CLAIM-DA997A6FCF6F4FF1
id: FACT-zcode-mcp-server-launcher
type: fact
---
The manifest starts the kibi MCP server through the launcher the plugin bundles, which resolves the project-local kibi-mcp.