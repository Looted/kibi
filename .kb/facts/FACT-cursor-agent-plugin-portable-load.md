---
title: Agent Plugins clients can load the kibi-cursor portable artifact
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: loadable_by_agent_plugin_clients
operator: eq
value_type: bool
value_bool: true
claim_text: Any client that supports the open Agent Plugins standard must be able to load Kibi Agent Skills and the MCP server from the kibi-cursor portable Agent Plugin artifact
claim_key: CLAIM-3CB809860540987C
text_ref: REQ-cursor-agent-plugin-standard-v1
origin:
  kind: agent
  recorded_at: '2026-10-27T07:56:22.294Z'
id: FACT-cursor-agent-plugin-portable-load
type: fact
---
A client that implements the Agent Plugins standard loads the Kibi skills and the MCP server from the artifact without Cursor-specific files.