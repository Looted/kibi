---
title: kibi-codex depends on kibi-cli and kibi-mcp as peers
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: peer_dependencies
operator: eq
value_type: set
value_set:
  - kibi-cli
  - kibi-mcp
claim_text: The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies
claim_key: CLAIM-2F06E07396A59AF2
text_ref: REQ-codex-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:31.998Z'
id: FACT-codex-peer-dependencies
type: fact
---
The project installs kibi-cli and kibi-mcp itself; kibi-cli brings kibi-core.