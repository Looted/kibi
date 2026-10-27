---
title: The kibi-cursor manifest declares its plugin parts
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: manifest_fields
operator: includes
value_type: set
value_set:
  - commands
  - hooks
  - mcpServers
  - rules
  - skills
claim_text: The kibi-cursor plugin manifest must declare the skills, rules, commands, hooks and mcpServers fields
claim_key: CLAIM-F7A928E9B3D62DB3
text_ref: REQ-cursor-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:52:06.673Z'
id: FACT-cursor-manifest-declares-plugin-parts
type: fact
---
The manifest fields point Cursor at the bundled skills, rules, commands, hooks and MCP configuration.