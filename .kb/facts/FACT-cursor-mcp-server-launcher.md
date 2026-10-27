---
title: The kibi-cursor kibi MCP server runs the bundled launcher
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: kibi_mcp_server_args
operator: eq
value_type: set
value_set:
  - ${CURSOR_PLUGIN_ROOT}/bin/launch-kibi-mcp.mjs
  - ${workspaceFolder}
claim_text: The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder
claim_key: CLAIM-EC9C4089EB04AF7B
text_ref: REQ-cursor-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:52:12.124Z'
id: FACT-cursor-mcp-server-launcher
type: fact
---
The MCP configuration starts the kibi server with the bundled launcher and the workspace folder, and no other argument.