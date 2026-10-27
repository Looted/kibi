---
title: The kibi-zcode manifest declares skills, commands, hooks and mcpServers
status: active
fact_kind: property_value
subject_key: zcode.kibi_adapter
property_key: manifest_fields
operator: includes
value_type: set
value_set:
  - commands
  - hooks
  - mcpServers
  - skills
claim_text: The kibi-zcode plugin manifest must declare the skills, commands, hooks and mcpServers fields
text_ref: REQ-zcode-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:26:41.095Z'
claim_key: CLAIM-2C1636E502EB6164
id: FACT-zcode-manifest-declares-plugin-parts
type: fact
---
The ZCode plugin manifest names the skills, commands and hooks directories and the MCP servers the plugin exposes.