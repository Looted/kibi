---
title: The portable mcp.json uses only Agent Plugins MCP schema fields
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: mcp_manifest_fields
operator: subset_of
value_type: set
value_set:
  - $schema
  - mcpServers
claim_text: The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields
claim_key: CLAIM-55DF8815B6C4466A
text_ref: REQ-cursor-agent-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:56:52.356Z'
id: FACT-agent-plugin-mcp-fields
type: fact
---
The MCP manifest has only the $schema and mcpServers fields.