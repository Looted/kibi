---
title: The kibi-codex MCP launcher starts the project-local kibi-mcp
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: mcp_server_target
operator: eq
value_type: string
value_string: project_local_kibi_mcp
claim_text: The kibi-codex MCP launcher must start the project-local kibi-mcp binary
claim_key: CLAIM-91829B71E8D267BD
text_ref: REQ-codex-kibi-plugin-v1
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:09.920Z'
id: FACT-codex-mcp-launches-project-kibi-mcp
type: fact
---
The launcher resolves kibi-mcp from the workspace and never installs it.