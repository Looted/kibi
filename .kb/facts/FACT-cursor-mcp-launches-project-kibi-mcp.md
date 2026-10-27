---
title: The kibi-cursor MCP launcher starts the project-local kibi-mcp
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: mcp_server_target
operator: eq
value_type: string
value_string: project_local_kibi_mcp
claim_text: The kibi-cursor MCP launcher must start the project-local kibi-mcp binary
claim_key: CLAIM-DBFE455AFAFC2F35
text_ref: REQ-cursor-kibi-plugin-v1
origin:
  kind: agent
  recorded_at: '2026-10-27T07:51:46.145Z'
id: FACT-cursor-mcp-launches-project-kibi-mcp
type: fact
---
The launcher resolves kibi-mcp from the workspace and never installs it.