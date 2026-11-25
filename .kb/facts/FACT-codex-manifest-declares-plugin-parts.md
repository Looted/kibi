---
title: The kibi-codex manifest declares its hooks, interface and MCP servers
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: manifest_fields
operator: includes
value_type: set
value_set:
  - hooks
  - interface
  - mcpServers
claim_text: The kibi-codex plugin manifest must declare the hooks, interface and mcpServers fields under extensions["com.openai"]
claim_key: CLAIM-FE9E314873A11112
text_ref: REQ-codex-plugin-package
origin:
  kind: human
  ref: Maintainer approval, 2026-11-25, migrating kibi-codex to root plugin.json with extensions["com.openai"]
  recorded_at: '2026-11-25T11:40:02.664Z'
id: FACT-codex-manifest-declares-plugin-parts
type: fact
---
The manifest fields point Codex at the bundled skills, hooks and MCP configuration.