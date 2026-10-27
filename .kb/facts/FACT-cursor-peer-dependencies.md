---
title: kibi-cursor depends on kibi-cli and kibi-mcp as peers
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: peer_dependencies
operator: eq
value_type: set
value_set:
  - kibi-cli
  - kibi-mcp
claim_text: The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies
claim_key: CLAIM-69509950E9E93838
text_ref: REQ-cursor-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:52:14.841Z'
id: FACT-cursor-peer-dependencies
type: fact
---
The project installs kibi-cli and kibi-mcp itself; kibi-cli brings kibi-core.