---
title: The kibi-codex manifest declares its skills, hooks and MCP servers
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: manifest_fields
operator: includes
value_type: set
value_set:
  - hooks
  - mcpServers
  - skills
claim_text: The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields
claim_key: CLAIM-AEF7587DBC190FD1
text_ref: REQ-codex-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:28.176Z'
id: FACT-codex-manifest-declares-plugin-parts
type: fact
---
The manifest fields point Codex at the bundled skills, hooks and MCP configuration.